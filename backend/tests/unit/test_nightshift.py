from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator, Iterator
from typing import Any
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from fastapi import FastAPI
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.errors import ModelError
from app.api.routes.agent.router import get_agent_service, router
from app.config import Settings
from app.models import ChatSession, IPO, Message, User
from app.schemas.agent_request import AgentRequest
from app.services.agent import AgentService
from app.services.agent_data import ZetarisAgentData
from app.services.model import ModelChunk, NightshiftClient
from app.utils.token_tracker import TokenTracker, Usage


def settings(**overrides: Any) -> Settings:
    return Settings(
        _env_file=None, meterless_proxy_url="http://nightshift:8088/v1",
        meterless_api_key="real-runtime-token", jev_endpoint=None, hmem_enabled=False,
        **overrides,
    )


def model_list(*ids: str) -> httpx.Response:
    return httpx.Response(
        200, json={"object": "list", "data": [{"id": name, "object": "model"} for name in ids]}
    )


def event(
    content: str | None = None, *, reason: str | None = None,
    usage: dict[str, object] | None = None, choices: bool = True,
    model: str | None = "nvidia/nemotron",
) -> dict[str, object]:
    return {
        "model": model,
        "choices": [{"index": 0, "delta": {"content": content}, "finish_reason": reason}]
        if choices else [],
        "usage": usage,
    }


def encode(*events: object) -> bytes:
    return "".join(
        f"data: {item if isinstance(item, str) else json.dumps(item)}\n\n"
        for item in events
    ).encode()


class FragmentedStream(httpx.AsyncByteStream):
    def __init__(self, content: bytes, *, failure: Exception | None = None) -> None:
        self.content = content
        self.failure = failure
        self.closed = False

    async def __aiter__(self) -> AsyncIterator[bytes]:
        for index in range(0, len(self.content), 7):
            yield self.content[index : index + 7]
        if self.failure:
            raise self.failure

    async def aclose(self) -> None:
        self.closed = True


def stream_response(*events: object, failure: Exception | None = None) -> httpx.Response:
    return httpx.Response(
        200, headers={"content-type": "text/event-stream; charset=utf-8"},
        stream=FragmentedStream(encode(*events), failure=failure),
    )


@pytest.fixture
def nightshift_http(
    monkeypatch: pytest.MonkeyPatch,
) -> Iterator[tuple[list[httpx.Response | Exception], list[httpx.Request]]]:
    responses: list[httpx.Response | Exception] = []
    requests: list[httpx.Request] = []
    clients: list[httpx.AsyncClient] = []
    original_client = httpx.AsyncClient

    async def handle(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        response = responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    def client(**kwargs: Any) -> httpx.AsyncClient:
        instance = original_client(transport=httpx.MockTransport(handle), **kwargs)
        clients.append(instance)
        return instance

    monkeypatch.setattr("app.services.model.httpx.AsyncClient", client)
    yield responses, requests
    assert not responses
    assert all(client.is_closed for client in clients)


def ready(responses: list[httpx.Response | Exception], response: httpx.Response) -> None:
    responses.extend([model_list("meterless/auto", "meterless/text.fast"), response])


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost:8088", "localhost:8088/", "http://localhost:8088/v1/",
        "http://localhost:8088/v1/chat/completions",
        "http://localhost:8088/v1/models", "http://localhost:8088/healthz/",
    ],
)
def test_normalizes_documented_runtime_urls(url: str) -> None:
    config = Settings(_env_file=None, meterless_proxy_url=url)
    assert config.meterless_proxy_url == "http://localhost:8088/v1"
    assert config.model_url == "http://localhost:8088/v1/chat/completions"


def test_ipv6_and_https_urls_are_preserved() -> None:
    config = Settings(_env_file=None, meterless_proxy_url="https://[::1]:8090/v1/models")
    assert config.meterless_proxy_url == "https://[::1]:8090/v1"


@pytest.mark.parametrize(
    "overrides",
    [
        {"meterless_proxy_url": ""}, {"meterless_proxy_url": "file:///tmp/proxy"},
        {"meterless_proxy_url": "http://user:password@localhost:8088"},
        {"meterless_proxy_url": "http://localhost:8088/v1?token=secret"},
        {"meterless_proxy_url": "http://localhost:8088/api/v1/completions"},
        {"meterless_proxy_url": "http://localhost:8088/v1/v1"},
        {"meterless_proxy_url": "http://localhost:bad/v1"},
        {"meterless_model": "nvidia/nemotron"}, {"meterless_model": ""},
        {"meterless_app_id": "Mostro AI"}, {"meterless_timeout_seconds": 0},
        {"meterless_max_tokens": 0}, {"input_cost_per_million_tokens": -1},
        {"output_cost_per_million_tokens": float("inf")},
        {"nemetron_bolt_url": "https://direct-nvidia.example/v1/chat/completions"},
        {"nemetron_bolt_model": "nemetron-bolt"},
        {"meterless_usage_url": "https://undocumented.example/usage"},
    ],
)
def test_invalid_or_obsolete_config_is_explicit(overrides) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **overrides)


def test_defaults_and_blank_optional_legacy_config() -> None:
    config = Settings(_env_file=None, nemetron_bolt_url="", nemetron_bolt_model="", meterless_usage_url="")
    assert config.meterless_proxy_url == "http://127.0.0.1:8088/v1"
    assert config.meterless_model == "meterless/auto"
    assert config.meterless_timeout_seconds == 180
    assert config.input_cost_per_million_tokens is None


def test_environment_dimension_is_parsed_without_relaxing_schema(monkeypatch) -> None:
    monkeypatch.setenv("EMBEDDING_DIMENSION", "1024")
    assert Settings(_env_file=None).embedding_dimension == 1024
    monkeypatch.setenv("EMBEDDING_DIMENSION", "512")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_config_errors_and_repr_do_not_expose_runtime_token() -> None:
    assert "real-runtime-token" not in repr(settings())
    with pytest.raises(ValidationError) as error:
        settings(nemetron_bolt_url="https://direct-provider.example")
    assert "real-runtime-token" not in str(error.value)


async def test_chat_contract_stream_and_final_usage(nightshift_http) -> None:
    responses, requests = nightshift_http
    response = stream_response(
        event("An IPO "), event("offers shares."),
        event(reason="stop"),
        event(choices=False, usage={"prompt_tokens": 42, "completion_tokens": 9}),
        "[DONE]",
    )
    ready(responses, response)
    chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Explain IPOs.")]
    assert "".join(chunk.content for chunk in chunks) == "An IPO offers shares."
    assert chunks[-1].prompt_tokens == 42
    assert chunks[-1].completion_tokens == 9
    assert chunks[-1].model == "nvidia/nemotron"
    discovery, chat = requests
    assert discovery.method == "GET"
    assert str(discovery.url) == "http://nightshift:8088/v1/models"
    assert discovery.headers["meterless-app"] == "mostro-ai-oah"
    assert chat.method == "POST"
    assert str(chat.url) == "http://nightshift:8088/v1/chat/completions"
    assert chat.headers["meterless-scope"] == "user"
    assert chat.headers["meterless-app"] == "mostro-ai-oah"
    assert all(request.headers["Authorization"] == "Bearer real-runtime-token" for request in requests)
    assert chat.extensions["timeout"]["read"] == 180
    assert json.loads(chat.content) == {
        "model": "meterless/auto",
        "messages": [{"role": "user", "content": "Explain IPOs."}],
        "stream": True, "stream_options": {"include_usage": True}, "max_tokens": 2048,
    }
    assert response.is_closed


async def test_discovery_keeps_unknown_meterless_routes(nightshift_http) -> None:
    responses, requests = nightshift_http
    responses.append(model_list("nvidia/nemotron", "meterless/auto", "meterless/future.new-mode"))
    assert await NightshiftClient(settings()).models() == ["meterless/auto", "meterless/future.new-mode"]
    assert len(requests) == 1


async def test_custom_advertised_route_is_used_without_fallback(nightshift_http) -> None:
    responses, requests = nightshift_http
    responses.extend([
        model_list("meterless/future.new-mode"),
        stream_response(event("Answer", reason="stop"), "[DONE]"),
    ])
    config = settings(meterless_model="meterless/future.new-mode", meterless_max_tokens=100)
    chunks = [chunk async for chunk in NightshiftClient(config).stream("Question")]
    assert chunks[0].content == "Answer"
    assert json.loads(requests[1].content)["model"] == "meterless/future.new-mode"
    assert json.loads(requests[1].content)["max_tokens"] == 100


async def test_consumer_cancellation_closes_proxy_stream(nightshift_http) -> None:
    response = stream_response(event("First token"), event("More"), event(reason="stop"), "[DONE]")
    ready(nightshift_http[0], response)
    stream = NightshiftClient(settings()).stream("Question")
    assert (await anext(stream)).content == "First token"
    await stream.aclose()
    assert response.is_closed


@pytest.mark.parametrize("token", [None, "", "rt-local", "  rt-local  "])
async def test_requires_real_runtime_token_without_sending_request(nightshift_http, token) -> None:
    client = NightshiftClient(Settings(_env_file=None, meterless_api_key=token))
    with pytest.raises(ModelError, match="real runtime token"):
        _chunks = [chunk async for chunk in client.stream("Question")]
    assert not nightshift_http[1]


@pytest.mark.parametrize("prompt", ["", "  \n", None, 123])
async def test_rejects_empty_or_nontext_prompts(nightshift_http, prompt) -> None:
    with pytest.raises(ModelError, match="non-empty text"):
        _chunks = [chunk async for chunk in NightshiftClient(settings()).stream(prompt)]
    assert not nightshift_http[1]


@pytest.mark.parametrize("status", [401, 403, 429, 500, 503])
@pytest.mark.parametrize("operation", ["discovery", "generation"])
async def test_http_failures_do_not_fallback_or_replay(nightshift_http, status, operation) -> None:
    responses, requests = nightshift_http
    if operation == "generation":
        responses.append(model_list("meterless/auto"))
    responses.append(httpx.Response(status, json={"error": {"message": "Do not expose upstream details"}}))
    expected = "unauthorized" if status in {401, 403} else f"HTTP {status}"
    with pytest.raises(ModelError, match=expected) as error:
        if operation == "discovery":
            await NightshiftClient(settings()).models()
        else:
            _chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Question")]
    assert "upstream details" not in str(error.value)
    assert len(requests) == (2 if operation == "generation" else 1)


@pytest.mark.parametrize("operation", ["discovery", "generation"])
async def test_transport_timeout_is_explicit(nightshift_http, operation) -> None:
    responses, requests = nightshift_http
    if operation == "generation":
        responses.append(model_list("meterless/auto"))
    responses.append(httpx.ReadTimeout("timeout"))
    with pytest.raises(ModelError, match="timed out"):
        if operation == "discovery":
            await NightshiftClient(settings()).models()
        else:
            _chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Question")]
    assert len(requests) == (2 if operation == "generation" else 1)


@pytest.mark.parametrize(
    "body",
    [None, [], {}, {"data": None}, {"data": [None]}, {"data": [{"id": 5}]},
     {"data": []}, {"data": [{"id": "nvidia/nemotron"}]}],
)
async def test_non_runtime_discovery_response_is_not_online(nightshift_http, body) -> None:
    nightshift_http[0].append(httpx.Response(200, json=body))
    with pytest.raises(ModelError):
        await NightshiftClient(settings()).models()


async def test_malformed_model_discovery_json(nightshift_http) -> None:
    nightshift_http[0].append(httpx.Response(200, content="not JSON"))
    with pytest.raises(ModelError, match="malformed model discovery"):
        await NightshiftClient(settings()).models()


async def test_missing_route_never_generates(nightshift_http) -> None:
    responses, requests = nightshift_http
    responses.append(model_list("meterless/local"))
    with pytest.raises(ModelError, match="not advertised"):
        _chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Question")]
    assert len(requests) == 1


async def test_usage_is_unknown_not_zero_when_proxy_omits_it(nightshift_http) -> None:
    ready(nightshift_http[0], stream_response(event("Answer", reason="stop"), "[DONE]"))
    chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Question")]
    assert chunks[0].prompt_tokens is None
    assert chunks[0].completion_tokens is None


@pytest.mark.parametrize(
    "payload",
    [
        None, [], {}, {"error": {"message": "secret upstream error"}},
        {"choices": None}, {"choices": [None]},
        {"choices": [{"index": 0, "text": "Legacy completions are not chat"}]},
        {"choices": [{"index": True, "delta": {"content": "Wrong index"}}]},
        {"choices": [{"index": 1, "delta": {"content": "Wrong index"}}]},
        {"choices": [{"index": 0, "delta": {"content": 123}}]},
        {"choices": [{"index": 0, "delta": {"content": ["not a string"]}}]},
        *[
            event(choices=False, usage={"prompt_tokens": value, "completion_tokens": 2})
            for value in [True, -1, "3", None, float("nan")]
        ],
        event(choices=False, usage={"prompt_tokens": 3}),
    ],
)
async def test_invalid_chat_events_fail_not_coerce_or_skip(nightshift_http, payload) -> None:
    ready(nightshift_http[0], stream_response(payload))
    with pytest.raises(ModelError):
        _chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Question")]


@pytest.mark.parametrize("reason", ["length", "content_filter", "tool_calls", "function_call", "unknown"])
async def test_non_stop_finishes_are_failures(nightshift_http, reason) -> None:
    ready(nightshift_http[0], stream_response(event("Partial answer"), event(reason=reason), "[DONE]"))
    chunks = []
    with pytest.raises(ModelError):
        async for chunk in NightshiftClient(settings()).stream("Question"):
            chunks.append(chunk)
    assert chunks[0].content == "Partial answer"


@pytest.mark.parametrize(
    "delta",
    [{"refusal": "Cannot answer"}, {"tool_calls": [{"id": "tool"}]},
     {"function_call": {"name": "tool"}}],
)
async def test_tool_calls_and_refusals_are_not_answers(nightshift_http, delta) -> None:
    ready(nightshift_http[0], stream_response({
        "choices": [{"index": 0, "delta": delta, "finish_reason": None}],
    }))
    with pytest.raises(ModelError, match="refusal or unsupported tool"):
        _chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Question")]


async def test_reasoning_is_not_exposed_and_heartbeats_are_supported(nightshift_http) -> None:
    raw = (
        ": keepalive\r\n\r\n"
        'data: {"choices":[{"index":0,"delta":{"reasoning_content":"private reasoning"}}]}\r\n\r\n'
        'data: {"choices":[{"index":0,\r\n'
        'data: "delta":{"content":"Final text"},"finish_reason":"stop"}]}\r\n\r\n'
        "data: [DONE]\r\n\r\n"
    )
    ready(nightshift_http[0], httpx.Response(
        200, headers={"Content-Type": "text/event-stream"},
        stream=FragmentedStream(raw.encode()),
    ))
    chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Question")]
    assert "".join(chunk.content for chunk in chunks) == "Final text"


@pytest.mark.parametrize(
    "events",
    [
        (), (event("Partial"),), (event("Partial"), "[DONE]"),
        (event("Answer", reason="stop"),), (event(reason="stop"), "[DONE]"),
        (event("Answer", reason="stop"), event("Extra"), "[DONE]"),
    ],
)
async def test_incomplete_or_inconsistent_stream_is_never_success(nightshift_http, events) -> None:
    ready(nightshift_http[0], stream_response(*events))
    with pytest.raises(ModelError):
        _chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Question")]


@pytest.mark.parametrize(
    ("raw", "message"),
    [
        (b"data: {bad json}\n\n", "malformed streaming"),
        (b"event: error\ndata: upstream failed\n\n", "streaming error"),
        (b'data: {"choices":', "incomplete event"),
        (b"data: " + b"x" * 1_048_577 + b"\n\n", "oversized"),
    ],
)
async def test_invalid_sse_frames_are_explicit(nightshift_http, raw, message) -> None:
    ready(nightshift_http[0], httpx.Response(
        200, headers={"content-type": "text/event-stream"}, content=raw
    ))
    with pytest.raises(ModelError, match=message):
        _chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Question")]


async def test_midstream_transport_failure_does_not_restart(nightshift_http) -> None:
    responses, requests = nightshift_http
    response = stream_response(event("Partial"), failure=httpx.ReadError("connection lost"))
    ready(responses, response)
    with pytest.raises(ModelError, match="unreachable"):
        _chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Question")]
    assert [request.method for request in requests] == ["GET", "POST"]
    assert response.is_closed


async def test_non_sse_response_is_not_accepted_as_stream(nightshift_http) -> None:
    ready(nightshift_http[0], httpx.Response(200, json={"choices": [{"message": {"content": "Answer"}}]}))
    with pytest.raises(ModelError, match="text/event-stream"):
        _chunks = [chunk async for chunk in NightshiftClient(settings()).stream("Question")]


def test_usage_counts_are_cumulative_not_added_and_missing_is_preserved() -> None:
    usage = Usage()
    AgentService._record_usage(usage, ModelChunk(content="text"))
    assert usage.prompt_tokens is None and usage.completion_tokens is None
    for chunk in [
        ModelChunk(prompt_tokens=10, completion_tokens=2, model="nvidia/nemotron"),
        ModelChunk(prompt_tokens=10, completion_tokens=5),
        ModelChunk(content="more"), ModelChunk(prompt_tokens=9, completion_tokens=4),
    ]:
        AgentService._record_usage(usage, chunk)
    assert usage == Usage(prompt_tokens=10, completion_tokens=5, model="nvidia/nemotron")


@pytest.mark.parametrize(
    ("usage", "prices", "expected_cost"),
    [
        (Usage(), {}, None),
        (Usage(100, 25), {}, None),
        (Usage(100, None), {"input_cost_per_million_tokens": 2, "output_cost_per_million_tokens": 4}, None),
        (Usage(100, 25), {"input_cost_per_million_tokens": 2, "output_cost_per_million_tokens": 4}, 0.0003),
        (Usage(0, 0), {"input_cost_per_million_tokens": 0, "output_cost_per_million_tokens": 0}, 0.0),
    ],
)
async def test_usage_is_logged_locally_without_invented_api(nightshift_http, monkeypatch, usage, prices, expected_cost) -> None:
    logger = Mock()
    monkeypatch.setattr("app.utils.token_tracker.logger", logger)
    await TokenTracker(settings(**prices)).report(usage, session_id="session", request_id="request")
    assert not nightshift_http[1]
    assert logger.info.call_args.args == ("agent_usage",)
    fields = logger.info.call_args.kwargs
    assert fields["provider"] == "meterless"
    assert fields["route"] == "meterless/auto"
    assert fields["estimated_cost"] == expected_cost
    assert fields["usage_reported"] == (usage.prompt_tokens is not None and usage.completion_tokens is not None)
    assert "real-runtime-token" not in str(fields)


async def test_smoke_check_is_discovery_only_without_opt_in(nightshift_http, capsys, monkeypatch) -> None:
    from scripts.check_nightshift import check

    responses, requests = nightshift_http
    monkeypatch.setattr("scripts.check_nightshift.get_settings", settings)
    responses.append(model_list("meterless/auto"))
    await check()
    assert [request.method for request in requests] == ["GET"]
    output = capsys.readouterr().out
    assert "No generation requested" in output
    assert "real-runtime-token" not in output


async def test_smoke_check_opt_in_validates_generation(nightshift_http, capsys, monkeypatch) -> None:
    from scripts.check_nightshift import check

    responses, requests = nightshift_http
    monkeypatch.setattr("scripts.check_nightshift.get_settings", settings)
    responses.append(model_list("meterless/auto"))
    ready(responses, stream_response(
        event("An IPO offers shares.", reason="stop"),
        event(choices=False, usage={"prompt_tokens": 20, "completion_tokens": 5}), "[DONE]",
    ))
    await check(generate=True)
    assert [request.method for request in requests] == ["GET", "GET", "POST"]
    output = capsys.readouterr().out
    assert "streamed text completion: OK" in output
    assert "nvidia/nemotron" in output
    assert "input=20, output=5" in output
    assert "real-runtime-token" not in output


def agent() -> tuple[AgentService, AsyncMock, AsyncMock, AgentRequest]:
    config = settings()
    session = AsyncMock(spec=AsyncSession)
    user_id, ipo_id, chat_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    session.execute.return_value = Mock(scalar_one_or_none=Mock(return_value=ChatSession(
        id=chat_id, user_id=user_id, ipo_id=ipo_id, turn_count=0
    )))

    def add(row):
        row.id = uuid.uuid4()

    session.add.side_effect = add
    data = AsyncMock(spec=ZetarisAgentData)
    data.ipo.return_value = IPO(id=ipo_id, company_name="Test")
    data.history.return_value = []
    data.learning_profile.return_value = Mock(preferred_language="en", risk_level=None)
    data.knowledge.return_value = []
    tracker = AsyncMock(spec=TokenTracker)
    service = AgentService(
        session, User(id=user_id), config, Mock(), NightshiftClient(config), tracker, data=data
    )
    return service, session, tracker, AgentRequest(message="Explain IPOs", ipo_id=ipo_id, session_id=chat_id)


async def test_agent_generation_uses_real_nightshift_client_and_usage(nightshift_http) -> None:
    ready(nightshift_http[0], stream_response(
        event("An IPO offers shares.", reason="stop"),
        event(choices=False, usage={"prompt_tokens": 100, "completion_tokens": 7}), "[DONE]",
    ))
    service, session, tracker, payload = agent()
    events = [event async for event in service.stream(payload, "request")]
    assert [event.content for event in events if event.type == "answer"] == ["An IPO offers shares."]
    tracker.report.assert_awaited_once()
    assert tracker.report.call_args.args[0] == Usage(100, 7, "nvidia/nemotron")
    messages = [call.args[0] for call in session.add.call_args_list if isinstance(call.args[0], Message)]
    assert [message.sender for message in messages] == ["user", "assistant"]
    assert nightshift_http[1][-1].url.host == "nightshift"


async def test_failed_partial_generation_is_not_saved_as_assistant_answer(nightshift_http) -> None:
    ready(nightshift_http[0], stream_response(
        event("Incomplete answer", usage={"prompt_tokens": 100, "completion_tokens": 5})
    ))
    service, session, tracker, payload = agent()
    events = []
    with pytest.raises(ModelError, match="completion marker"):
        async for item in service.stream(payload, "request"):
            events.append(item)
    assert not any(item.type == "answer" for item in events)
    assert any(item.type == "token" for item in events)
    assert not any(
        isinstance(call.args[0], Message) and call.args[0].sender == "assistant"
        for call in session.add.call_args_list
    )
    tracker.report.assert_awaited_once()
    assert tracker.report.call_args.args[0].completion_tokens == 5


def test_route_factory_wires_nightshift(monkeypatch) -> None:
    monkeypatch.setattr("app.api.routes.agent.router.get_settings", settings)
    service = get_agent_service(session=AsyncMock(spec=AsyncSession), user=User(id=uuid.uuid4()))
    assert isinstance(service._model, NightshiftClient)


async def test_stream_failure_becomes_sse_error_without_final_answer(monkeypatch) -> None:
    app = FastAPI()
    app.include_router(router)
    service = Mock()

    async def stream(*_args):
        raise ModelError("private upstream details")
        yield

    service.stream.side_effect = stream
    app.dependency_overrides[get_agent_service] = lambda: service
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/sse", json={"message": "Explain IPOs", "ipo_id": str(uuid.uuid4())})
    assert '"type":"error"' in response.text.replace(" ", "")
    assert '"type":"answer"' not in response.text.replace(" ", "")
    assert "private upstream details" not in response.text
