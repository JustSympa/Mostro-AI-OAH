from __future__ import annotations

import json
import uuid
from collections.abc import Iterator
from typing import Any
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.errors import ModelError, RefusalError
from app.config import Settings
from app.models import Chunk
from app.router.intent import IntentRouter, Pipeline
from app.router.prospectus import ProspectusRetriever, RetrievedChunk
from app.services.agent import AgentService
from app.services.agent_data import ZetarisAgentData
from app.services.embeddings import Embedder
from app.services.jev import JEVClassifierImpl, JEVJudgeImpl
from app.services.model import CompletionClient
from app.utils.token_tracker import TokenTracker


@pytest.fixture
def jev_http(
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

    monkeypatch.setattr("app.services.jev.httpx.AsyncClient", client)
    yield responses, requests
    assert not responses
    assert all(client.is_closed for client in clients)


def settings(**overrides: Any) -> Settings:
    return Settings(
        _env_file=None,
        jev_endpoint="https://api.typesafe.ai/v1/systemone",
        jev_api_key="test-key",
        jev_model="jev-test",
        **overrides,
    )


def choice_response(pipeline: Pipeline) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "model": "jev-test",
            "answers": {
                "pipeline": {
                    "type": "choice",
                    "choice": pipeline.value,
                    "confidence": 0.9,
                    "probabilities": {
                        item.value: 0.9 if item == pipeline else 0.05
                        for item in Pipeline
                    },
                }
            },
            "usage": {"input_tokens": 30, "output_tokens": 10},
        },
    )


def evidence_response(score: float) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "model": "jev-test",
            "answers": {"sufficient_evidence": {"type": "noul", "noul": score}},
            "usage": {"input_tokens": 100, "output_tokens": 10},
        },
    )


def chunk() -> RetrievedChunk:
    return RetrievedChunk(
        Chunk(id=uuid.uuid4(), content="The offer closes on 15 November 2026."),
        score=0.95,
    )


@pytest.mark.parametrize(
    "endpoint",
    [
        "https://api.typesafe.ai",
        "https://api.typesafe.ai/v1/",
        "https://api.typesafe.ai/v1/systemone/",
    ],
)
@pytest.mark.parametrize("pipeline", list(Pipeline))
async def test_choice_contract(jev_http, endpoint: str, pipeline: Pipeline) -> None:
    responses, requests = jev_http
    responses.append(choice_response(pipeline))
    result = await JEVClassifierImpl(endpoint, "test-key", "jev-test").classify("Request")
    assert result.pipeline is pipeline
    assert result.rationale == "JEV choice confidence: 0.900"
    request = requests[0]
    assert str(request.url) == "https://api.typesafe.ai/v1/systemone"
    assert request.headers["Authorization"] == "Bearer test-key"
    payload = json.loads(request.content)
    assert payload["model"] == "jev-test"
    assert payload["state"] == "Request"
    assert payload["questions"]["pipeline"]["type"] == "choice"
    assert set(payload["questions"]["pipeline"]["criteria"]) == set(Pipeline)


async def test_agent_passes_settings_to_intent_router(jev_http) -> None:
    responses, requests = jev_http
    responses.append(choice_response(Pipeline.CALENDAR))
    service = AgentService(
        session=AsyncMock(spec=AsyncSession),
        user=Mock(),
        settings=settings(),
        embedder=Mock(spec=Embedder),
        model=Mock(spec=CompletionClient),
        tracker=Mock(spec=TokenTracker),
    )
    result = await service._intent.route("Save the closing date")
    assert result.pipeline is Pipeline.CALENDAR
    assert json.loads(requests[0].content)["model"] == "jev-test"


async def test_noul_contract(jev_http) -> None:
    responses, requests = jev_http
    responses.append(evidence_response(0.82))
    item = chunk()
    score = await JEVJudgeImpl(
        "https://api.typesafe.ai/v1/systemone", "test-key"
    ).score("When does the offer close?", [item])
    assert score == 0.82
    assert str(requests[0].url) == "https://api.typesafe.ai/v1/systemone"
    assert requests[0].headers["Authorization"] == "Bearer test-key"
    payload = json.loads(requests[0].content)
    assert payload["model"] == "jev-latest"
    assert payload["state"] == {
        "query": "When does the offer close?",
        "chunks": [{"id": str(item.chunk.id), "content": item.chunk.content}],
    }
    assert payload["questions"]["sufficient_evidence"]["type"] == "noul"


@pytest.mark.parametrize("score", [0.0, 0.7, 1.0])
async def test_noul_preserves_probability_range(jev_http, score: float) -> None:
    responses, _requests = jev_http
    responses.append(evidence_response(score))
    assert await JEVJudgeImpl("https://example.test").score("Query", [chunk()]) == score


async def test_empty_evidence_does_not_call_jev(jev_http) -> None:
    assert await JEVJudgeImpl("https://example.test").score("Query", []) == 0.0
    assert not jev_http[1]


@pytest.mark.parametrize(
    "answer",
    [
        {},
        {"score": 0.99},
        {"answers": {"sufficient_evidence": {"type": "score", "score": 0.99}}},
        *[
            {"answers": {"sufficient_evidence": {"type": "noul", "noul": value}}}
            for value in [-0.1, 1.1, "0.9", True, None, float("nan"), float("inf")]
        ],
    ],
)
async def test_invalid_evidence_response_is_not_a_score(jev_http, answer: dict) -> None:
    responses, _requests = jev_http
    # json.dumps permits NaN/Infinity so the validator is also tested against
    # non-standard JSON returned by a misbehaving service.
    responses.append(httpx.Response(200, content=json.dumps(answer)))
    with pytest.raises(ModelError, match="invalid evidence answer"):
        await JEVJudgeImpl("https://example.test").score("Query", [chunk()])


@pytest.mark.parametrize(
    "answer",
    [
        {},
        {"pipeline": {"choice": "calendar"}},
        {"answers": {"pipeline": {"type": "choice", "choice": "unknown"}}},
    ],
)
async def test_invalid_choice_does_not_default_to_prospectus(jev_http, answer: dict) -> None:
    responses, _requests = jev_http
    responses.append(httpx.Response(200, json=answer))
    with pytest.raises(ModelError, match="invalid pipeline answer"):
        await IntentRouter(settings()).route("Query")


@pytest.mark.parametrize("status", [401, 422, 429, 500])
@pytest.mark.parametrize("operation", ["classify", "score"])
async def test_http_errors_surface_as_model_errors(jev_http, status, operation) -> None:
    responses, _requests = jev_http
    responses.append(httpx.Response(status, json={"detail": "Service error"}))
    with pytest.raises(ModelError, match="service request failed"):
        if operation == "classify":
            await JEVClassifierImpl("https://example.test").classify("Query")
        else:
            await JEVJudgeImpl("https://example.test").score("Query", [chunk()])


async def test_timeout_surfaces_as_model_error(jev_http) -> None:
    responses, _requests = jev_http
    responses.append(httpx.ReadTimeout("Timed out"))
    with pytest.raises(ModelError, match="service request failed"):
        await JEVClassifierImpl("https://example.test").classify("Query")


async def test_malformed_json_surfaces_as_model_error(jev_http) -> None:
    responses, _requests = jev_http
    responses.append(httpx.Response(200, content="not JSON"))
    with pytest.raises(ModelError, match="malformed JSON"):
        await JEVClassifierImpl("https://example.test").classify("Query")


@pytest.mark.parametrize(
    ("message", "pipeline"),
    [
        ("Explain an IPO", Pipeline.EDUCATION),
        ("Add the date to my calendar", Pipeline.CALENDAR),
        ("What are this IPO's risks?", Pipeline.PROSPECTUS),
    ],
)
async def test_unconfigured_router_preserves_keyword_fallback(message, pipeline) -> None:
    assert (await IntentRouter().route(message)).pipeline is pipeline


@pytest.mark.parametrize(
    ("scores", "accepted"),
    [([0.7], True), ([0.69, 0.85], True), ([0.1, 0.2, 0.69], False)],
)
async def test_retrieval_threshold_and_retries(jev_http, scores, accepted) -> None:
    responses, requests = jev_http
    responses.extend(evidence_response(score) for score in scores)
    item = chunk()
    data = AsyncMock(spec=ZetarisAgentData)
    data.chunks.return_value = [(item.chunk, 0.95)]
    embedder = AsyncMock(spec=Embedder)
    embedder.embed.return_value = [0.0] * 1024
    retriever = ProspectusRetriever(data, embedder, settings())
    query = "When does the offer close?"
    if accepted:
        assert (await retriever.retrieve(query, uuid.uuid4()))[0].chunk is item.chunk
    else:
        with pytest.raises(RefusalError, match="sufficiently relevant"):
            await retriever.retrieve(query, uuid.uuid4())
    assert embedder.embed.await_count == min(len(scores), 2)
    assert len(requests) == len(scores)
    for request in requests:
        payload = json.loads(request.content)
        assert payload["state"]["query"] == query
        assert payload["model"] == "jev-test"
        assert request.headers["Authorization"] == "Bearer test-key"
    if len(scores) > 1:
        assert embedder.embed.call_args_list[1].args[0] != query


async def test_retrieval_service_failure_does_not_use_similarity(jev_http) -> None:
    responses, requests = jev_http
    responses.append(httpx.Response(503))
    data = AsyncMock(spec=ZetarisAgentData)
    data.chunks.return_value = [(chunk().chunk, 0.99)]
    embedder = AsyncMock(spec=Embedder)
    embedder.embed.return_value = [0.0] * 1024
    with pytest.raises(ModelError):
        await ProspectusRetriever(data, embedder, settings()).retrieve(
            "Query", uuid.uuid4()
        )
    assert len(requests) == 1


def test_blank_jev_settings_disable_integration() -> None:
    config = Settings(_env_file=None, jev_endpoint="", jev_api_key="")
    assert config.jev_endpoint is None
    assert config.jev_api_key is None
