from __future__ import annotations

import json
import uuid
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from typing import Any
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.errors import RefusalError, RetrievalError
from app.config import Settings
from app.models import Chunk, Document, IPO
from app.router.prospectus import ProspectusRetriever
from app.services.embeddings import Embedder, VoyageEmbedder
from app.services.agent_data import ZetarisAgentData
from app.services.indexing import embed_document


def settings(**overrides: Any) -> Settings:
    return Settings(
        _env_file=None, embedding_api_key="test-key", embedding_model="voyage-3.5",
        **overrides,
    )


def vector(value: float = 0.1) -> list[float]:
    return [value] * 1024


def body(*values: float, model: str = "voyage-3.5") -> dict[str, Any]:
    return {
        "model": model,
        "data": [
            {"index": index, "embedding": vector(value)}
            for index, value in enumerate(values)
        ],
    }


@pytest.fixture
def voyage_http(
    monkeypatch: pytest.MonkeyPatch,
) -> Iterator[tuple[list[httpx.Response | Exception], list[httpx.Request], AsyncMock]]:
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

    sleep = AsyncMock()
    monkeypatch.setattr("app.services.embeddings.httpx.AsyncClient", client)
    monkeypatch.setattr("app.services.embeddings.asyncio.sleep", sleep)
    yield responses, requests, sleep
    assert not responses
    assert all(client.is_closed for client in clients)


@pytest.mark.parametrize(
    "endpoint",
    [None, "", "https://api.voyageai.com", "https://api.voyageai.com/v1/",
     "https://api.voyageai.com/v1/embeddings/"],
)
async def test_query_contract(voyage_http, endpoint) -> None:
    responses, requests, _ = voyage_http
    responses.append(httpx.Response(200, json=body(0.1)))
    assert await VoyageEmbedder(settings(embedding_api_url=endpoint)).embed("Question") == vector()
    request = requests[0]
    assert str(request.url) == "https://api.voyageai.com/v1/embeddings"
    assert request.headers["Authorization"] == "Bearer test-key"
    assert json.loads(request.content) == {
        "input": ["Question"], "model": "voyage-3.5", "input_type": "query",
        "output_dimension": 1024, "output_dtype": "float", "truncation": False,
    }


async def test_document_batches_preserve_input_order(voyage_http) -> None:
    responses, requests, _ = voyage_http
    first = body(0.1, 0.2)
    first["data"].reverse()
    responses.extend([
        httpx.Response(200, json=first),
        httpx.Response(200, json=body(0.3)),
    ])
    result = await VoyageEmbedder(settings(embedding_batch_size=2)).embed_documents(["A", "B", "C"])
    assert result == [vector(0.1), vector(0.2), vector(0.3)]
    assert [json.loads(request.content)["input"] for request in requests] == [["A", "B"], ["C"]]
    assert all(json.loads(request.content)["input_type"] == "document" for request in requests)


async def test_fixed_dimension_finance_model_omits_output_dimension(voyage_http) -> None:
    responses, requests, _ = voyage_http
    responses.append(httpx.Response(200, json=body(0.1, model="voyage-finance-2")))
    config = Settings(_env_file=None, embedding_api_key="test", embedding_model="voyage-finance-2")
    assert await VoyageEmbedder(config).embed("Question") == vector()
    assert "output_dimension" not in json.loads(requests[0].content)


@pytest.mark.parametrize("text", ["", "  \n", None, 42])
async def test_invalid_input_never_calls_provider(voyage_http, text) -> None:
    with pytest.raises(RetrievalError, match="non-empty"):
        await VoyageEmbedder(settings()).embed(text)
    assert not voyage_http[1]


async def test_empty_document_batch_does_not_call_provider(voyage_http) -> None:
    assert await VoyageEmbedder(settings()).embed_documents([]) == []
    assert not voyage_http[1]


async def test_unconfigured_key_is_explicit_error(voyage_http) -> None:
    with pytest.raises(RetrievalError, match="not configured"):
        await VoyageEmbedder(Settings(_env_file=None, embedding_api_key=None)).embed("Query")
    assert not voyage_http[1]


@pytest.mark.parametrize(
    "payload",
    [
        None, [], {}, {"model": "wrong", "data": []},
        {"model": "voyage-3.5", "data": []},
        {"model": "voyage-3.5", "data": [None]},
        *[
            {"model": "voyage-3.5", "data": [{"index": index, "embedding": vector()}]}
            for index in [None, -1, 1, True, "0"]
        ],
        *[
            {"model": "voyage-3.5", "data": [{"index": 0, "embedding": value}]}
            for value in [None, "x" * 1024, [0.1], [True] * 1024, ["0.1"] * 1024,
                          vector(0), vector(float("nan")), vector(float("inf")),
                          vector(1e100), vector(1e-100)]
        ],
    ],
)
async def test_invalid_vectors_are_retrieval_errors(voyage_http, payload) -> None:
    responses, requests, _ = voyage_http
    responses.append(httpx.Response(200, content=json.dumps(payload)))
    with pytest.raises(RetrievalError, match="invalid response"):
        await VoyageEmbedder(settings()).embed("Query")
    assert len(requests) == 1


async def test_duplicate_batch_indices_are_rejected(voyage_http) -> None:
    payload = body(0.1, 0.2)
    payload["data"][1]["index"] = 0
    voyage_http[0].append(httpx.Response(200, json=payload))
    with pytest.raises(RetrievalError, match="invalid response"):
        await VoyageEmbedder(settings()).embed_documents(["A", "B"])


async def test_malformed_json_is_retrieval_error(voyage_http) -> None:
    voyage_http[0].append(httpx.Response(200, content="not json"))
    with pytest.raises(RetrievalError, match="invalid response"):
        await VoyageEmbedder(settings()).embed("Query")


@pytest.mark.parametrize("status", [400, 401, 403, 422])
async def test_permanent_errors_are_not_retried(voyage_http, status) -> None:
    responses, requests, sleep = voyage_http
    responses.append(httpx.Response(status))
    with pytest.raises(RetrievalError, match=f"HTTP {status}"):
        await VoyageEmbedder(settings()).embed("Query")
    assert len(requests) == 1
    sleep.assert_not_awaited()


@pytest.mark.parametrize("failure", [httpx.ReadTimeout("timeout"), 429, 500, 503])
async def test_transient_errors_retry_then_succeed(voyage_http, failure) -> None:
    responses, requests, sleep = voyage_http
    responses.extend([
        httpx.Response(failure, headers={"Retry-After": "4"})
        if isinstance(failure, int) else failure,
        httpx.Response(200, json=body(0.1)),
    ])
    assert await VoyageEmbedder(settings()).embed("Query") == vector()
    assert len(requests) == 2
    sleep.assert_awaited_once_with(4.0 if isinstance(failure, int) else 1.0)


async def test_exhausted_retries_surface_error(voyage_http) -> None:
    responses, requests, sleep = voyage_http
    responses.extend(httpx.Response(503) for _ in range(3))
    with pytest.raises(RetrievalError, match="HTTP 503"):
        await VoyageEmbedder(settings()).embed("Query")
    assert len(requests) == 3
    assert [call.args[0] for call in sleep.await_args_list] == [1, 2]


async def test_long_retry_after_fails_without_retrying_early(voyage_http) -> None:
    responses, requests, sleep = voyage_http
    responses.append(httpx.Response(429, headers={"Retry-After": "120"}))
    with pytest.raises(RetrievalError, match="retry later"):
        await VoyageEmbedder(settings()).embed("Query")
    assert len(requests) == 1
    sleep.assert_not_awaited()


def test_http_date_retry_after() -> None:
    future = datetime.now(timezone.utc) + timedelta(seconds=30)
    delay = VoyageEmbedder._retry_delay(
        httpx.Response(429, headers={"Retry-After": format_datetime(future, usegmt=True)}), 0
    )
    assert 28 <= delay <= 30


@pytest.mark.parametrize("header", ["invalid", "nan", "-1"])
def test_invalid_retry_after_uses_backoff(header) -> None:
    assert VoyageEmbedder._retry_delay(
        httpx.Response(429, headers={"Retry-After": header}), 1
    ) == 2


@pytest.mark.parametrize(
    "overrides",
    [{"embedding_dimension": 512}, {"embedding_dimension": 2048},
     {"embedding_batch_size": 0}, {"embedding_batch_size": 1001},
     {"embedding_max_attempts": 0}],
)
def test_settings_reject_incompatible_config(overrides) -> None:
    with pytest.raises(ValidationError):
        settings(**overrides)


def test_model_dimension_matches_database() -> None:
    assert Chunk.__table__.c.embedding.type.dim == settings().embedding_dimension


def indexing_session() -> tuple[AsyncMock, list[Chunk]]:
    document = Document(id=uuid.uuid4(), ipo_id=uuid.uuid4())
    chunks = [
        Chunk(id=uuid.uuid4(), document_id=document.id, ipo_id=document.ipo_id,
              content="Offer closes in November.", page_number=1, section_path="Offer > Dates"),
        Chunk(id=uuid.uuid4(), document_id=document.id, ipo_id=document.ipo_id,
              content="Capital may be lost.", page_number=2),
    ]
    session = AsyncMock(spec=AsyncSession)
    session.scalar.return_value = document
    session.get.return_value = IPO(id=document.ipo_id, company_name="Example issuer")
    session.scalars.return_value = chunks
    return session, chunks


async def test_indexing_persists_document_vectors_and_model(voyage_http) -> None:
    responses, requests, _ = voyage_http
    session, chunks = indexing_session()
    responses.append(httpx.Response(200, json=body(0.1, 0.2)))
    assert await embed_document(session, chunks[0].document_id, settings()) == 2
    payload = json.loads(requests[0].content)
    assert payload["input_type"] == "document"
    assert payload["input"] == [
        "Example issuer > Offer > Dates\n\nOffer closes in November.",
        "Example issuer\n\nCapital may be lost.",
    ]
    assert [chunk.embedding for chunk in chunks] == [vector(0.1), vector(0.2)]
    assert all(chunk.embedding_model == "voyage-3.5" for chunk in chunks)
    session.flush.assert_awaited_once()
    session.commit.assert_not_awaited()


async def test_indexing_does_not_partially_replace_vectors_on_failure(voyage_http) -> None:
    responses, _, _ = voyage_http
    session, chunks = indexing_session()
    for chunk in chunks:
        chunk.embedding = vector(0.8)
        chunk.embedding_model = "old-model"
    responses.extend([httpx.Response(200, json=body(0.1)), httpx.Response(400)])
    with pytest.raises(RetrievalError, match="HTTP 400"):
        await embed_document(session, chunks[0].document_id, settings(embedding_batch_size=1))
    assert all(chunk.embedding == vector(0.8) for chunk in chunks)
    assert all(chunk.embedding_model == "old-model" for chunk in chunks)
    session.flush.assert_not_awaited()


@pytest.mark.parametrize("case", ["missing_document", "missing_issuer", "no_chunks", "empty_chunk"])
async def test_indexing_invalid_documents_fail_explicitly(voyage_http, case) -> None:
    session, chunks = indexing_session()
    if case == "missing_document":
        session.scalar.return_value = None
    elif case == "missing_issuer":
        session.get.return_value = None
    elif case == "no_chunks":
        session.scalars.return_value = []
    else:
        chunks[0].content = ""
    with pytest.raises(RetrievalError):
        await embed_document(session, chunks[0].document_id, settings())
    assert not voyage_http[1]
    session.flush.assert_not_awaited()


async def test_retrieval_delegates_to_harness_and_reuses_identical_rewrites() -> None:
    data = AsyncMock(spec=ZetarisAgentData)
    data.chunks.return_value = []
    embedder = AsyncMock(spec=Embedder)
    embedder.embed.return_value = vector()
    judge = AsyncMock()
    judge.score.return_value = 0.0
    config = settings(retrieval_max_attempts=3)
    ipo_id = uuid.uuid4()
    with pytest.raises(RefusalError):
        await ProspectusRetriever(data, embedder, config, judge=judge).retrieve("Query", ipo_id)
    assert embedder.embed.await_count == 2
    assert data.chunks.await_count == 3
    for call in data.chunks.await_args_list:
        assert call.args == (ipo_id, vector())
        assert call.kwargs == {"limit": 8}
