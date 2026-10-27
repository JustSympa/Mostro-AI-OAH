from __future__ import annotations

import logging
import time
import uuid
from urllib.parse import quote

import httpx
from pydantic import BaseModel, ConfigDict, Field, StrictInt, ValidationError

from app.agent.errors import DataHarnessError
from app.config import Settings

logger = logging.getLogger("mostro.zetaris")


class _Page(BaseModel):
    model_config = ConfigDict(strict=True)

    queryToken: str = Field(min_length=1)
    pageNumber: StrictInt = Field(ge=0)
    totalCount: StrictInt = Field(ge=0)
    totalPages: StrictInt = Field(ge=0)
    records: list[dict[str, object]] = Field(default_factory=list)


class ZetarisClient:
    """Documented REST API, not the web UI proxy. Never falls back to PostgreSQL."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def _base_url(self) -> str:
        if not self._settings.zetaris_rest_url or not self._settings.zetaris_org_id:
            raise DataHarnessError("Zetaris requires ZETARIS_REST_URL and ZETARIS_ORG_ID.")
        base = self._settings.zetaris_rest_url.rstrip("/")
        return base if base.endswith("/api/v1.0") else f"{base}/api/v1.0"

    def _headers(self) -> dict[str, str]:
        if not self._settings.zetaris_org_id:
            raise DataHarnessError("Zetaris organization is not configured.")
        return {
            "X-Org-ID": self._settings.zetaris_org_id,
            "X-Request-ID": str(uuid.uuid4()),
        }

    async def _request(
        self, client: httpx.AsyncClient, method: str, path: str,
        *, body: dict[str, object] | None = None,
        params: dict[str, str | int] | None = None,
    ) -> httpx.Response:
        key = self._settings.zetaris_api_key
        if not key:
            raise DataHarnessError("Zetaris SQL queries require ZETARIS_API_KEY.")
        try:
            response = await client.request(
                method, f"{self._base_url()}{path}",
                headers={**self._headers(), "Authorization": f"Bearer {key}"},
                json=body, params=params,
            )
            response.raise_for_status()
            return response
        except httpx.HTTPStatusError as exc:
            raise DataHarnessError(
                f"Zetaris request failed (HTTP {exc.response.status_code})."
            ) from exc
        except httpx.HTTPError as exc:
            raise DataHarnessError("Zetaris is unreachable or the request timed out.") from exc

    async def check_login(self) -> None:
        """Optional Basic-auth diagnostic; SQL uses an API token, not this idToken."""
        base = self._base_url()
        username, password = self._settings.zetaris_username, self._settings.zetaris_password
        if not username or not password:
            raise DataHarnessError("Zetaris login requires ZETARIS_USERNAME and ZETARIS_PASSWORD.")
        try:
            async with httpx.AsyncClient(timeout=self._settings.zetaris_timeout_seconds) as client:
                response = await client.get(
                    f"{base}/auth/login", headers=self._headers(),
                    auth=httpx.BasicAuth(username, password),
                )
                response.raise_for_status()
                body = response.json()
            if not isinstance(body, dict) or not isinstance(body.get("idToken"), str) or not body["idToken"]:
                raise ValueError("Missing idToken.")
        except (httpx.HTTPError, ValueError) as exc:
            raise DataHarnessError("Zetaris login failed or returned an invalid response.") from exc

    async def query(self, sql: str) -> list[dict[str, object]]:
        self._base_url()
        page_size = self._settings.zetaris_page_size
        token: str | None = None
        failed = True
        started = time.monotonic()
        async with httpx.AsyncClient(timeout=self._settings.zetaris_timeout_seconds) as client:
            try:
                response = await self._request(
                    client, "POST", "/query/sql/start",
                    body={"select": sql, "pageLimit": page_size},
                )
                raw = response.json()
                # Retain the cursor for cleanup even when other response fields are invalid.
                if isinstance(raw, dict) and isinstance(raw.get("queryToken"), str) and raw["queryToken"]:
                    token = raw["queryToken"]
                page = _Page.model_validate(raw)
                expected_pages = (page.totalCount + page_size - 1) // page_size
                if page.totalCount > self._settings.zetaris_max_rows:
                    raise DataHarnessError("Zetaris result exceeds ZETARIS_MAX_ROWS; refusing partial context.")
                if page.totalPages not in ({0, 1} if not page.totalCount else {expected_pages}):
                    raise ValueError("Inconsistent page count.")
                if page.pageNumber not in {0, 1}:
                    raise ValueError("Unexpected first page number.")
                count, pages, first_page = page.totalCount, page.totalPages, page.pageNumber
                rows = list(page.records)
                if len(rows) != min(count, page_size):
                    raise ValueError("Incomplete first page.")
                for offset in range(1, pages):
                    response = await self._request(
                        client, "GET", "/query/sql/page",
                        params={
                            "queryToken": page.queryToken, "pageLimit": page_size,
                            "pageNumber": first_page + offset,
                        },
                    )
                    page = _Page.model_validate(response.json())
                    if (
                        page.queryToken != token or page.pageNumber != first_page + offset
                        or page.totalCount != count or page.totalPages != pages
                        or len(page.records) != min(page_size, count - len(rows))
                    ):
                        raise ValueError("Inconsistent query page.")
                    rows.extend(page.records)
                if len(rows) != count:
                    raise ValueError("Incomplete result.")
                logger.info(
                    "Zetaris context query completed: rows=%s pages=%s elapsed_seconds=%.3f",
                    len(rows), pages, time.monotonic() - started,
                )
                failed = False
                return rows
            except (ValueError, ValidationError, TypeError) as exc:
                raise DataHarnessError("Zetaris returned an invalid SQL result.") from exc
            finally:
                if token is not None:
                    try:
                        await self._request(client, "DELETE", f"/query/sql/close/{quote(token, safe='')}")
                    except DataHarnessError:
                        if not failed:
                            raise
                        logger.exception("Could not close Zetaris cursor after query failure.")
