from __future__ import annotations

import json
import math
import uuid
from typing import Annotated, Literal, TypeVar

from pydantic import (
    BaseModel,
    BeforeValidator,
    Field,
    FiniteFloat,
    StrictInt,
    StrictStr,
    ValidationError,
    field_validator,
)

from app.agent.errors import DataHarnessError
from app.config import Settings
from app.models import Chunk, IPO, KeyFact, Message
from app.services.zetaris import ZetarisClient


def _unpack_int(value: object) -> object:
    """Zetaris serializes every scalar as a string; unwrap integers in transit."""
    if isinstance(value, str):
        try:
            return int(value)
        except ValueError:
            return value
    return value


def _unpack_float(value: object) -> object:
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return value
    return value


# The unwrapped value still faces strict validation, so booleans, junk strings
# and non-finite numbers are rejected rather than coerced.
ZetarisInt = Annotated[StrictInt, BeforeValidator(_unpack_int)]
ZetarisFloat = Annotated[FiniteFloat, BeforeValidator(_unpack_float)]


class _IPORecord(BaseModel):
    id: uuid.UUID
    company_name: StrictStr


class _HistoryRecord(BaseModel):
    sender: Literal["user", "assistant"]
    content: StrictStr


class _ChunkRecord(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    ipo_id: uuid.UUID
    content: StrictStr
    page_number: Annotated[ZetarisInt, Field(ge=1)]
    section_path: StrictStr | None
    score: Annotated[ZetarisFloat, Field(strict=True, ge=-1, le=1)]


class LearningProfile(BaseModel):
    preferred_language: StrictStr
    risk_level: Annotated[ZetarisInt, Field(ge=1, le=5)] | None
    risk_label: StrictStr | None
    applied_constraints: list[StrictStr] | None

    @field_validator("applied_constraints", mode="before")
    @classmethod
    def decode_constraints(cls, value: object) -> object:
        return json.loads(value) if isinstance(value, str) else value


class KnowledgeRecord(BaseModel):
    term: StrictStr
    mastery_level: Literal["introduced", "reviewing", "mastered"]
    definition: StrictStr


class _FactRecord(BaseModel):
    id: uuid.UUID
    ipo_id: uuid.UUID
    fact_type: StrictStr
    value: StrictStr
    source_page: Annotated[ZetarisInt, Field(ge=1)]


Record = TypeVar("Record", bound=BaseModel)


class ZetarisAgentData:
    """Scoped context reads over the registered, JDBC-safe agent views."""

    def __init__(self, settings: Settings, client: ZetarisClient | None = None) -> None:
        self._settings = settings
        self._client = client or ZetarisClient(settings)

    def _table(self, name: str) -> str:
        return f"`{self._settings.zetaris_datasource}`.`agent_{name}`"

    @staticmethod
    def _text(value: str) -> str:
        # Spark string literals interpret backslash escapes. Hex avoids both quote
        # injection and differences in Spark's escapedStringLiterals setting.
        return f"decode(unhex('{value.encode('utf-8').hex()}'), 'UTF-8')"

    async def _read(self, sql: str, record_type: type[Record]) -> list[Record]:
        rows = await self._client.query(sql)
        try:
            return [record_type.model_validate(row) for row in rows]
        except (ValidationError, ValueError) as exc:
            raise DataHarnessError("Zetaris context does not match the registered agent view schema.") from exc

    async def ipo(self, ipo_id: uuid.UUID) -> IPO | None:
        rows = await self._read(
            f"SELECT id, company_name FROM {self._table('ipos')} WHERE id = '{ipo_id}'",
            _IPORecord,
        )
        if len(rows) > 1 or (rows and rows[0].id != ipo_id):
            raise DataHarnessError("Zetaris returned duplicate or out-of-scope IPO records.")
        return IPO(id=rows[0].id, company_name=rows[0].company_name) if rows else None

    async def history(
        self, user_id: uuid.UUID, ipo_id: uuid.UUID, chat_session_id: uuid.UUID
    ) -> list[Message]:
        rows = await self._read(
            f"SELECT sender, content FROM {self._table('history')} "
            f"WHERE user_id = '{user_id}' AND ipo_id = '{ipo_id}' "
            f"AND chat_session_id = '{chat_session_id}' ORDER BY created_at DESC, id DESC LIMIT 10",
            _HistoryRecord,
        )
        return [Message(sender=row.sender, content=row.content) for row in rows]

    async def learning_profile(self, user_id: uuid.UUID) -> LearningProfile:
        rows = await self._read(
            f"SELECT preferred_language, risk_level, risk_label, applied_constraints "
            f"FROM {self._table('profiles')} WHERE user_id = '{user_id}'",
            LearningProfile,
        )
        if len(rows) != 1:
            raise DataHarnessError("Zetaris could not resolve the user's learning profile.")
        return rows[0]

    async def knowledge(self, user_id: uuid.UUID) -> list[KnowledgeRecord]:
        return await self._read(
            f"SELECT term, mastery_level, definition FROM {self._table('knowledge')} "
            f"WHERE user_id = '{user_id}' ORDER BY term",
            KnowledgeRecord,
        )

    async def calendar_facts(
        self, user_id: uuid.UUID, ipo_id: uuid.UUID, chat_session_id: uuid.UUID
    ) -> list[KeyFact]:
        rows = await self._read(
            f"SELECT f.id, f.ipo_id, f.fact_type, f.value, f.source_page "
            f"FROM {self._table('facts')} f WHERE f.ipo_id = '{ipo_id}' "
            f"AND NOT EXISTS (SELECT 1 FROM {self._table('proposals')} p "
            f"WHERE p.key_fact_id = f.id AND p.user_id = '{user_id}' "
            f"AND p.chat_session_id = '{chat_session_id}') ORDER BY f.id",
            _FactRecord,
        )
        if any(row.ipo_id != ipo_id for row in rows):
            raise DataHarnessError("Zetaris returned out-of-scope calendar facts.")
        return [KeyFact(**row.model_dump(), review_status="verified") for row in rows]

    async def chunks(
        self, ipo_id: uuid.UUID, vector: list[float], *, limit: int = 8
    ) -> list[tuple[Chunk, float]]:
        if (
            len(vector) != self._settings.embedding_dimension
            or any(type(value) not in (int, float) or not math.isfinite(value) for value in vector)
            or not math.isfinite(norm := math.hypot(*vector)) or norm == 0
        ):
            raise DataHarnessError("Query embedding must be a finite, non-zero 1024-dimensional vector.")
        if type(limit) is not int or not 1 <= limit <= 100:
            raise DataHarnessError("Chunk retrieval limit must be between 1 and 100.")
        query_vector = "array(" + ",".join(f"CAST({value / norm!r} AS DOUBLE)" for value in vector) + ")"
        # pgvector's <=> operator is PostgreSQL-specific. Rank in the Zetaris
        # Spark engine rather than assuming it supports that operator or JDBC type.
        sql = f"""
WITH candidates AS (
    SELECT id, document_id, ipo_id, content, page_number, section_path,
           transform(split(substring(embedding, 2, length(embedding) - 2), ','),
                     x -> CAST(x AS DOUBLE)) AS v
    FROM {self._table('chunks')}
    WHERE ipo_id = '{ipo_id}' AND embedding_model = {self._text(self._settings.embedding_model)}
), scored AS (
    SELECT id, document_id, ipo_id, content, page_number, section_path,
           CASE WHEN size(v) <> {self._settings.embedding_dimension}
                     OR aggregate(v, CAST(0 AS DOUBLE), (s, x) -> s + x*x) <= 0
                THEN raise_error('Invalid stored prospectus embedding')
                ELSE greatest(-1.0, least(1.0,
                     aggregate(zip_with(v, {query_vector}, (x, y) -> x*y),
                               CAST(0 AS DOUBLE), (s, x) -> s + x)
                     / sqrt(aggregate(v, CAST(0 AS DOUBLE), (s, x) -> s + x*x))))
           END AS score
    FROM candidates
)
SELECT id, document_id, ipo_id, content, page_number, section_path, score
FROM scored ORDER BY score DESC, id LIMIT {limit}
"""
        rows = await self._read(sql, _ChunkRecord)
        if len(rows) > limit or any(row.ipo_id != ipo_id for row in rows):
            raise DataHarnessError("Zetaris returned out-of-scope chunk results.")
        return [
            (Chunk(
                id=row.id, document_id=row.document_id, ipo_id=row.ipo_id, content=row.content,
                page_number=row.page_number, section_path=row.section_path,
            ), max(0.0, row.score))
            for row in rows
        ]
