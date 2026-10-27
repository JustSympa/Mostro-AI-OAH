from __future__ import annotations

import base64
import json
import uuid
from collections.abc import Iterator
from typing import Any
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from fastapi import FastAPI
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.errors import DataHarnessError
from app.api.routes.agent.router import get_agent_service, router
from app.config import Settings
from app.models import ChatSession, Chunk, IPO, KeyFact, Message, User
from app.router.calendar import find_unsaved_calendar_facts
from app.router.education import build_education_context
from app.schemas.agent_request import AgentRequest
from app.services.agent import AgentService
from app.services.agent_data import ZetarisAgentData
from app.services.model import ModelChunk
from app.services.zetaris import ZetarisClient


def settings(**overrides: Any) -> Settings:
    return Settings(
        _env_file=None, zetaris_rest_url="http://zetaris-api:8888/api/v1.0",
        zetaris_org_id="7", zetaris_api_key="test-key", jev_endpoint=None,
        hmem_enabled=False, **overrides,
    )


def page(
    records: list[dict[str, object]], *, number: int = 1, count: int | None = None,
    pages: int = 1, token: str = "query-token",
) -> dict[str, object]:
    return {
        "queryToken": token, "records": records, "pageNumber": number,
        "totalCount": len(records) if count is None else count, "totalPages": pages,
    }


@pytest.fixture
def zetaris_http(
    monkeypatch: pytest.MonkeyPatch,
) -> Iterator[tuple[list[httpx.Response | Exception], list[httpx.Request]]]:
    responses: list[httpx.Response | Exception] = []
    requests: list[httpx.Request] = []
    clients: list[httpx.AsyncClient] = []
    original_client = httpx.AsyncClient

    def handle(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        response = responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    def client(**kwargs: Any) -> httpx.AsyncClient:
        instance = original_client(transport=httpx.MockTransport(handle), **kwargs)
        clients.append(instance)
        return instance

    monkeypatch.setattr("app.services.zetaris.httpx.AsyncClient", client)
    yield responses, requests
    assert not responses
    assert all(client.is_closed for client in clients)


@pytest.mark.parametrize("base", ["http://zetaris-api:8888", "http://zetaris-api:8888/api/v1.0/"])
async def test_rest_sql_contract_and_cursor_cleanup(zetaris_http, base) -> None:
    responses, requests = zetaris_http
    responses.extend([httpx.Response(200, json=page([{"value": 1}])), httpx.Response(200)])
    config = Settings(
        _env_file=None, zetaris_rest_url=base, zetaris_org_id="7", zetaris_api_key="test-key"
    )
    assert await ZetarisClient(config).query("SELECT 1 AS value") == [{"value": 1}]
    start, close = requests
    assert start.method == "POST"
    assert str(start.url) == "http://zetaris-api:8888/api/v1.0/query/sql/start"
    assert json.loads(start.content) == {"select": "SELECT 1 AS value", "pageLimit": 100}
    assert close.method == "DELETE"
    assert close.url.path == "/api/v1.0/query/sql/close/query-token"
    for request in requests:
        assert request.headers["Authorization"] == "Bearer test-key"
        assert request.headers["X-Org-ID"] == "7"
        uuid.UUID(request.headers["X-Request-ID"])
    assert start.headers["X-Request-ID"] != close.headers["X-Request-ID"]


@pytest.mark.parametrize("first_page", [0, 1])
async def test_pagination_fetches_every_row(zetaris_http, first_page) -> None:
    responses, requests = zetaris_http
    responses.extend([
        httpx.Response(200, json=page([{"id": 1}, {"id": 2}], count=3, pages=2, number=first_page)),
        httpx.Response(200, json=page([{"id": 3}], count=3, pages=2, number=first_page + 1)),
        httpx.Response(200),
    ])
    rows = await ZetarisClient(settings(zetaris_page_size=2)).query("SELECT id FROM example")
    assert rows == [{"id": 1}, {"id": 2}, {"id": 3}]
    assert requests[1].method == "GET"
    assert requests[1].url.path == "/api/v1.0/query/sql/page"
    assert dict(requests[1].url.params) == {
        "queryToken": "query-token", "pageLimit": "2", "pageNumber": str(first_page + 1)
    }


@pytest.mark.parametrize("pages", [0, 1])
async def test_empty_result_is_valid_and_closed(zetaris_http, pages) -> None:
    responses, _ = zetaris_http
    responses.extend([httpx.Response(200, json=page([], pages=pages)), httpx.Response(200)])
    assert await ZetarisClient(settings()).query("SELECT * FROM empty") == []


@pytest.mark.parametrize(
    "payload",
    [None, [], {}, {"msg": "SQL parser error"}, {"queryToken": "", "records": []}],
)
async def test_non_page_responses_fail_explicitly(zetaris_http, payload) -> None:
    zetaris_http[0].append(httpx.Response(200, json=payload))
    with pytest.raises(DataHarnessError, match="invalid SQL result"):
        await ZetarisClient(settings()).query("SELECT 1")
    assert len(zetaris_http[1]) == 1


@pytest.mark.parametrize(
    "overrides",
    [
        {"totalCount": "1"}, {"totalCount": True}, {"records": [["not", "an", "object"]]},
        {"records": None}, {"records": []}, {"totalPages": 5}, {"pageNumber": 3},
    ],
)
async def test_invalid_page_still_closes_cursor(zetaris_http, overrides) -> None:
    payload = page([{"id": 1}])
    payload.update(overrides)
    responses, requests = zetaris_http
    responses.extend([httpx.Response(200, json=payload), httpx.Response(200)])
    with pytest.raises(DataHarnessError, match="invalid SQL result"):
        await ZetarisClient(settings()).query("SELECT 1")
    assert requests[-1].method == "DELETE"


@pytest.mark.parametrize(
    "overrides",
    [{"queryToken": "wrong"}, {"pageNumber": 1}, {"totalCount": 4}, {"records": []}],
)
async def test_inconsistent_second_page_is_not_partial_success(zetaris_http, overrides) -> None:
    second = page([{"id": 2}], count=2, pages=2, number=2)
    second.update(overrides)
    responses, requests = zetaris_http
    responses.extend([
        httpx.Response(200, json=page([{"id": 1}], count=2, pages=2)),
        httpx.Response(200, json=second), httpx.Response(200),
    ])
    with pytest.raises(DataHarnessError, match="invalid SQL result"):
        await ZetarisClient(settings(zetaris_page_size=1)).query("SELECT id FROM example")
    assert requests[-1].url.path.endswith("/close/query-token")


async def test_result_safety_limit_fails_instead_of_truncating(zetaris_http) -> None:
    responses, requests = zetaris_http
    responses.extend([
        httpx.Response(200, json=page([{"id": 1}], count=200, pages=2)),
        httpx.Response(200),
    ])
    with pytest.raises(DataHarnessError, match="refusing partial context"):
        await ZetarisClient(settings(zetaris_max_rows=100)).query("SELECT id FROM example")
    assert requests[-1].method == "DELETE"


@pytest.mark.parametrize("status", [400, 401, 403, 429, 500, 503])
async def test_http_failure_is_explicit_and_never_replayed(zetaris_http, status) -> None:
    responses, requests = zetaris_http
    responses.append(httpx.Response(status, json={"msg": "Do not expose provider details"}))
    with pytest.raises(DataHarnessError, match=f"HTTP {status}") as error:
        await ZetarisClient(settings()).query("SELECT 1")
    assert "provider details" not in str(error.value)
    assert len(requests) == 1


async def test_transport_failure_has_no_fallback(zetaris_http) -> None:
    zetaris_http[0].append(httpx.ReadTimeout("timeout"))
    with pytest.raises(DataHarnessError, match="unreachable"):
        await ZetarisClient(settings()).query("SELECT 1")
    assert len(zetaris_http[1]) == 1


async def test_page_failure_closes_original_cursor(zetaris_http) -> None:
    responses, requests = zetaris_http
    responses.extend([
        httpx.Response(200, json=page([{"id": 1}], count=2, pages=2)),
        httpx.Response(503), httpx.Response(200),
    ])
    with pytest.raises(DataHarnessError, match="HTTP 503"):
        await ZetarisClient(settings(zetaris_page_size=1)).query("SELECT 1")
    assert requests[-1].method == "DELETE"


async def test_close_failure_is_not_silently_successful(zetaris_http) -> None:
    zetaris_http[0].extend([
        httpx.Response(200, json=page([{"id": 1}])), httpx.Response(503)
    ])
    with pytest.raises(DataHarnessError, match="HTTP 503"):
        await ZetarisClient(settings()).query("SELECT 1")


async def test_cleanup_error_preserves_primary_error_and_logs(zetaris_http, caplog) -> None:
    zetaris_http[0].extend([
        httpx.Response(200, json={**page([{"id": 1}]), "records": None}), httpx.Response(503)
    ])
    with pytest.raises(DataHarnessError, match="invalid SQL result"):
        await ZetarisClient(settings()).query("SELECT 1")
    assert "Could not close Zetaris cursor" in caplog.text


async def test_malformed_json_is_explicit_failure(zetaris_http) -> None:
    zetaris_http[0].append(httpx.Response(200, content="not JSON"))
    with pytest.raises(DataHarnessError, match="invalid SQL result"):
        await ZetarisClient(settings()).query("SELECT 1")


async def test_basic_login_is_separate_from_api_key_auth(zetaris_http) -> None:
    responses, requests = zetaris_http
    responses.append(httpx.Response(200, json={"idToken": "private-token", "refreshToken": "refresh"}))
    config = settings(zetaris_username="admin@example.test", zetaris_password="test-password")
    await ZetarisClient(config).check_login()
    request = requests[0]
    assert request.method == "GET"
    assert request.url.path == "/api/v1.0/auth/login"
    assert request.headers["Authorization"] == (
        "Basic " + base64.b64encode(b"admin@example.test:test-password").decode()
    )
    assert request.headers["X-Org-ID"] == "7"
    assert not request.content


@pytest.mark.parametrize("response", [httpx.Response(401), httpx.Response(200, json={})])
async def test_login_failure_is_explicit(zetaris_http, response) -> None:
    zetaris_http[0].append(response)
    with pytest.raises(DataHarnessError, match="login failed"):
        await ZetarisClient(settings(zetaris_username="user", zetaris_password="password")).check_login()


@pytest.mark.parametrize(
    "overrides",
    [
        {"zetaris_rest_url": "http://localhost:3000/api/proxy"},
        {"zetaris_rest_url": "file:///tmp/zetaris"}, {"zetaris_rest_url": "http://user:pass@host"},
        {"zetaris_rest_url": "https://host?key=secret"}, {"zetaris_org_id": "org"},
        {"zetaris_datasource": "source; DROP TABLE users"}, {"zetaris_datasource": "bad`name"},
        {"zetaris_page_size": 101}, {"zetaris_timeout_seconds": 0},
    ],
)
def test_invalid_configuration_is_rejected(overrides) -> None:
    values = {"zetaris_rest_url": "http://localhost:8888", "zetaris_org_id": "1", **overrides}
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **values)


@pytest.mark.parametrize(
    "overrides",
    [
        {}, {"zetaris_rest_url": "http://localhost:8888"},
        {"zetaris_rest_url": "http://localhost:8888", "zetaris_org_id": "1",
         "zetaris_username": "user", "zetaris_password": "password"},
    ],
)
async def test_missing_config_never_uses_direct_db_or_login_fallback(zetaris_http, overrides) -> None:
    with pytest.raises(DataHarnessError):
        await ZetarisClient(Settings(_env_file=None, **overrides)).query("SELECT 1")
    assert not zetaris_http[1]


def data_client() -> tuple[ZetarisAgentData, AsyncMock]:
    client = AsyncMock(spec=ZetarisClient)
    return ZetarisAgentData(settings(), client), client


def chunk_record(ipo_id: uuid.UUID, score: float = 0.8) -> dict[str, object]:
    return {
        "id": str(uuid.uuid4()), "ipo_id": str(ipo_id), "document_id": str(uuid.uuid4()),
        "content": "Verified prospectus evidence.", "page_number": 12,
        "section_path": "Offer > Dates", "score": score,
    }


async def test_chunks_are_engine_ranked_and_model_scoped() -> None:
    data, client = data_client()
    ipo_id = uuid.uuid4()
    record = chunk_record(ipo_id)
    client.query.return_value = [record]
    matches = await data.chunks(ipo_id, [1.0] * 1024, limit=8)
    assert matches[0][0].id == uuid.UUID(str(record["id"]))
    assert matches[0][0].page_number == 12
    assert matches[0][1] == 0.8
    sql = client.query.call_args.args[0]
    assert "`mostro`.`agent_chunks`" in sql
    assert f"ipo_id = '{ipo_id}'" in sql
    assert "embedding_model = decode(unhex('766f796167652d332e35')" in sql
    assert "zip_with" in sql and "sqrt(aggregate" in sql
    assert "ORDER BY score DESC, id LIMIT 8" in sql
    assert "<=>" not in sql
    assert "embedding" not in sql.split("SELECT id, document_id, ipo_id, content, page_number, section_path, score")[-1]


@pytest.mark.parametrize("vector", [[], [0.0] * 1024, [1.0], [float("nan")] * 1024, [True] * 1024])
async def test_invalid_query_vectors_never_reach_zetaris(vector) -> None:
    data, client = data_client()
    with pytest.raises(DataHarnessError, match="Query embedding"):
        await data.chunks(uuid.uuid4(), vector)
    client.query.assert_not_awaited()


@pytest.mark.parametrize("limit", [0, 101, True])
async def test_invalid_chunk_limits_are_explicit(limit) -> None:
    data, client = data_client()
    with pytest.raises(DataHarnessError, match="retrieval limit"):
        await data.chunks(uuid.uuid4(), [1.0] * 1024, limit=limit)
    client.query.assert_not_awaited()


@pytest.mark.parametrize(
    "overrides",
    [{"score": float("nan")}, {"score": 1.1}, {"score": True}, {"score": "not-a-number"},
     {"id": "invalid"}, {"page_number": 0},
     {"content": None}, {"ipo_id": str(uuid.uuid4())}],
)
async def test_invalid_chunk_records_never_become_evidence(overrides) -> None:
    data, client = data_client()
    ipo_id = uuid.uuid4()
    client.query.return_value = [{**chunk_record(ipo_id), **overrides}]
    with pytest.raises(DataHarnessError):
        await data.chunks(ipo_id, [1.0] * 1024)


async def test_zetaris_stringified_scalars_are_unwrapped() -> None:
    """The engine serializes every scalar as a string, including numbers."""
    data, client = data_client()
    ipo_id = uuid.uuid4()
    client.query.return_value = [
        {key: str(value) for key, value in chunk_record(ipo_id, score=0.8).items()}
    ]
    matches = await data.chunks(ipo_id, [1.0] * 1024)
    assert matches[0][0].page_number == 12
    assert matches[0][1] == 0.8


async def test_all_context_queries_are_user_and_session_scoped() -> None:
    data, client = data_client()
    user_id, ipo_id, chat_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    client.query.return_value = [{"sender": "assistant", "content": "Previous explanation."}]
    history = await data.history(user_id, ipo_id, chat_id)
    assert history[0].content == "Previous explanation."
    sql = client.query.call_args.args[0]
    for value in (user_id, ipo_id, chat_id):
        assert str(value) in sql
    assert "LIMIT 10" in sql
    client.query.return_value = []
    assert await data.knowledge(user_id) == []
    assert str(user_id) in client.query.call_args.args[0]
    assert await data.calendar_facts(user_id, ipo_id, chat_id) == []
    sql = client.query.call_args.args[0]
    assert "NOT EXISTS" in sql and "`mostro`.`agent_proposals`" in sql
    for value in (user_id, ipo_id, chat_id):
        assert str(value) in sql


@pytest.mark.parametrize("risk_level", [None, 3])
async def test_education_uses_zetaris_profile_and_progression(risk_level) -> None:
    data, client = data_client()
    user_id = uuid.uuid4()
    client.query.side_effect = [
        [{"preferred_language": "fr", "risk_level": risk_level,
          "risk_label": "Moderate" if risk_level else None,
          "applied_constraints": '["education only"]' if risk_level else None}],
        [{"term": "IPO", "mastery_level": "reviewing", "definition": "Initial public offering."}],
    ]
    context, profile = await build_education_context(data, user_id)
    assert profile["preferred_language"] == "fr"
    assert profile["knowledge"][0]["mastery_level"] == "reviewing"
    assert "Initial public offering." in context
    assert (profile["risk_profile"] is None) is (risk_level is None)
    assert all(str(user_id) in call.args[0] for call in client.query.await_args_list)


async def test_missing_profile_does_not_silently_default_language() -> None:
    data, client = data_client()
    client.query.return_value = []
    with pytest.raises(DataHarnessError, match="learning profile"):
        await build_education_context(data, uuid.uuid4())


async def test_calendar_uses_only_valid_dates_from_harness() -> None:
    data, client = data_client()
    ipo_id = uuid.uuid4()
    fact = {"id": str(uuid.uuid4()), "ipo_id": str(ipo_id), "fact_type": "closing_date",
            "value": "2026-11-15", "source_page": 10}
    client.query.return_value = [fact, {**fact, "id": str(uuid.uuid4()), "value": "not a date"}]
    facts = await find_unsaved_calendar_facts(data, uuid.uuid4(), ipo_id, uuid.uuid4())
    assert len(facts) == 1
    assert facts[0].event_date.year == 2026
    assert facts[0].fact.review_status == "verified"


def agent_fixture(data: ZetarisAgentData) -> tuple[AgentService, AsyncMock, Mock, uuid.UUID, uuid.UUID]:
    session = AsyncMock(spec=AsyncSession)
    user_id, ipo_id, chat_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    chat = ChatSession(id=chat_id, user_id=user_id, ipo_id=ipo_id, turn_count=0)
    session.execute.return_value = Mock(scalar_one_or_none=Mock(return_value=chat))

    def add(row):
        if getattr(row, "id", None) is None:
            row.id = uuid.uuid4()

    session.add.side_effect = add
    model = Mock()

    async def stream(_prompt):
        yield ModelChunk(content="A supported explanation.")

    model.stream.side_effect = stream
    service = AgentService(
        session, User(id=user_id), settings(), Mock(), model,
        Mock(report=AsyncMock()), data=data,
    )
    return service, session, model, ipo_id, chat_id


@pytest.mark.parametrize(
    "message",
    ["Explain what an IPO is", "What are the prospectus risks?", "Add the closing date to my calendar"],
)
async def test_all_agent_pipelines_use_harness_for_context(message) -> None:
    data = AsyncMock(spec=ZetarisAgentData)
    service, session, model, ipo_id, chat_id = agent_fixture(data)
    data.ipo.return_value = IPO(id=ipo_id, company_name="Test")
    data.history.return_value = [Message(sender="assistant", content="Earlier context from Zetaris.")]
    data.learning_profile.return_value = Mock(
        preferred_language="fr", risk_level=None
    )
    data.knowledge.return_value = []
    data.calendar_facts.return_value = [KeyFact(
        id=uuid.uuid4(), ipo_id=ipo_id, fact_type="closing_date", value="2026-11-15", source_page=1,
    )]
    data.chunks.return_value = [(Chunk(
        id=uuid.uuid4(), content="Evidence through Zetaris.", page_number=1, section_path="Offer"
    ), 0.95)]
    service._embedder.embed = AsyncMock(return_value=[1.0] * 1024)
    events = [event async for event in service.stream(
        AgentRequest(message=message, ipo_id=ipo_id, session_id=chat_id), "test"
    )]
    assert any(event.type == "answer" for event in events)
    data.ipo.assert_awaited_once_with(ipo_id)
    data.history.assert_awaited_once_with(service._user.id, ipo_id, chat_id)
    session.get.assert_not_awaited()
    # The only direct SELECT is the approved transactional chat ownership lookup.
    assert session.execute.await_count == 1
    assert "chat_sessions" in str(session.execute.call_args.args[0])
    assert "Earlier context from Zetaris." in model.stream.call_args.args[0]
    if "Explain" in message:
        data.learning_profile.assert_awaited_once()
        data.knowledge.assert_awaited_once()
        data.calendar_facts.assert_not_awaited()
    elif "risks" in message:
        data.chunks.assert_awaited_once()
        data.calendar_facts.assert_not_awaited()
        assert "Evidence through Zetaris." in model.stream.call_args.args[0]
    else:
        data.calendar_facts.assert_awaited_once()
        assert any(event.type == "calendar" for event in events)


async def test_zetaris_failure_stops_agent_before_any_direct_data_fallback() -> None:
    data = AsyncMock(spec=ZetarisAgentData)
    data.ipo.side_effect = DataHarnessError("Unavailable")
    service, session, model, ipo_id, _ = agent_fixture(data)
    with pytest.raises(DataHarnessError):
        _events = [event async for event in service.stream(
            AgentRequest(message="Explain IPOs", ipo_id=ipo_id), "test"
        )]
    session.get.assert_not_awaited()
    session.execute.assert_not_awaited()
    model.stream.assert_not_called()


@pytest.mark.parametrize(
    ("message", "operation"),
    [("Explain IPOs", "learning_profile"), ("What are the prospectus risks?", "chunks"),
     ("Add the closing date to my calendar", "calendar_facts")],
)
async def test_pipeline_harness_failure_never_uses_direct_context_reads(message, operation) -> None:
    data = AsyncMock(spec=ZetarisAgentData)
    service, session, model, ipo_id, chat_id = agent_fixture(data)
    data.ipo.return_value = IPO(id=ipo_id, company_name="Test")
    data.history.return_value = []
    getattr(data, operation).side_effect = DataHarnessError("Unavailable")
    service._embedder.embed = AsyncMock(return_value=[1.0] * 1024)
    with pytest.raises(DataHarnessError):
        _events = [event async for event in service.stream(
            AgentRequest(message=message, ipo_id=ipo_id, session_id=chat_id), "test"
        )]
    session.get.assert_not_awaited()
    assert session.execute.await_count == 1
    assert "chat_sessions" in str(session.execute.call_args.args[0])
    model.stream.assert_not_called()


async def test_sse_surfaces_harness_failure_as_error_not_refusal() -> None:
    app = FastAPI()
    app.include_router(router)
    service = Mock()

    async def stream(*_args):
        raise DataHarnessError("Secret upstream details")
        yield

    service.stream.side_effect = stream
    app.dependency_overrides[get_agent_service] = lambda: service
    # Preserve the real client: this test does not use the transport-mocking fixture.
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/sse", json={"message": "Explain IPOs", "ipo_id": str(uuid.uuid4())})
    assert response.status_code == 200
    assert '"type":"error"' in response.text.replace(" ", "")
    assert "data harness is temporarily unavailable" in response.text
    assert "Secret upstream details" not in response.text
