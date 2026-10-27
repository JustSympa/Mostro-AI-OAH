from __future__ import annotations

import asyncio
import importlib.util
import os
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
import pytest_asyncio
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import FastAPI
from sqlalchemy import inspect, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.routes.memory.router import router
from app.agent.errors import RefusalError
from app.config import Settings
from app.db.session import get_db
from app.deps.auth import get_current_user
from app.models import ChatSession, IPO, Message, User
from app.models.memory import HMemLedger
from app.schemas.agent_request import AgentRequest
from app.services.agent import AgentService
from app.services.agent_data import ZetarisAgentData
from app.services.memory import MemoryRepository
from app.services.model import ModelChunk

pytestmark = pytest.mark.skipif(
    not os.environ.get("HMEM_TEST_DATABASE_URL"),
    reason="Set HMEM_TEST_DATABASE_URL to an isolated disposable Postgres database.",
)


@pytest_asyncio.fixture(loop_scope="function")
async def database():
    url = os.environ["HMEM_TEST_DATABASE_URL"]
    schema = f"hmem_test_{uuid.uuid4().hex}"
    bootstrap = create_async_engine(url)
    async with bootstrap.begin() as connection:
        await connection.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_async_engine(
        url, connect_args={"server_settings": {"search_path": f"{schema},public"}}
    )
    migration_path = Path(__file__).parents[2] / "alembic/versions/20261027_0006_hmem.py"
    spec = importlib.util.spec_from_file_location("hmem_migration", migration_path)
    assert spec and spec.loader
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    def initialize(connection):
        for model in (User, IPO, ChatSession, Message):
            model.__table__.create(connection)
        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
            assert "hmem_states" in inspect(connection).get_table_names(schema=schema)
            migration.downgrade()
            assert "hmem_states" not in inspect(connection).get_table_names(schema=schema)
            migration.upgrade()

    async with engine.begin() as connection:
        await connection.run_sync(initialize)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    user_id, other_id, ipo_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    async with factory.begin() as session:
        session.add_all([
            User(id=user_id, email=f"{user_id}@example.test"),
            User(id=other_id, email=f"{other_id}@example.test"),
            IPO(id=ipo_id, company_name="Test IPO", symbol="TEST", issuer_country="Test"),
        ])
    chat_id = uuid.uuid4()
    async with factory.begin() as session:
        session.add(ChatSession(id=chat_id, user_id=user_id, ipo_id=ipo_id))
    try:
        yield factory, user_id, other_id, ipo_id, chat_id
    finally:
        await engine.dispose()
        async with bootstrap.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await bootstrap.dispose()


async def test_postgres_api_persistence_approval_feedback_and_owner_isolation(database):
    factory, owner, other, ipo_id, chat_id = database
    app = FastAPI()
    app.include_router(router)
    current_owner = [owner]

    async def session_dependency():
        async with factory.begin() as session:
            yield session

    async def user_dependency():
        return User(id=current_owner[0], email="test@example.test")

    app.dependency_overrides[get_db] = session_dependency
    app.dependency_overrides[get_current_user] = user_dependency
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        first = await client.post("/memory/events", json={
            "event": "user_correction", "text": "I prefer short examples about investing concepts.",
            "chatId": str(chat_id),
        })
        assert first.status_code == 200, first.text
        memory_id = first.json()["ids"][0]
        second = await client.post("/memory/events", json={
            "event": "user_correction", "text": "I prefer simple examples about investing concepts.",
            "chatId": str(chat_id),
        })
        assert second.status_code == 200
        feedback = await client.post(f"/memory/{memory_id}/feedback", json={"kind": "wrong"})
        assert feedback.status_code == 200
        records = (await client.get("/memory")).json()
        memory = next(item for item in records["memories"] if item["id"] == memory_id)
        assert memory["confidence"] == pytest.approx(0.5)
        assert "review" in memory["tags"]
        assert memory["missionId"] == str(ipo_id)
        dream = (await client.post("/memory/dream")).json()["proposals"]
        assert dream
        assert (await client.get("/memory")).json()["health"]["records"] == 2
        approval = await client.post(f'/memory/proposals/{dream[0]["id"]}/review', json={"approve": True})
        assert approval.status_code == 200
        assert (await client.get("/memory")).json()["health"]["records"] == 3
        ledger_before = (await client.get("/memory/ledger")).json()["entries"]
        preview = await client.get("/memory/sleep/preview")
        sleep = await client.post("/memory/sleep", json={"operation": "execute", "plan": preview.json()})
        assert sleep.status_code == 200, sleep.text
        restored = await client.post("/memory/sleep", json={
            "operation": "restore", "backupId": sleep.json()["backupId"],
        })
        assert restored.status_code == 200
        ledger_after = (await client.get("/memory/ledger")).json()["entries"]
        assert ledger_after[:len(ledger_before)] == ledger_before
        assert ledger_after[-1]["action"] == "restore"
        unknown = await client.post("/memory/unknown/feedback", json={"kind": "wrong"})
        assert unknown.status_code == 404

        current_owner[0] = other
        assert (await client.get("/memory")).json()["memories"] == []
        assert (await client.get("/memory/ledger")).json()["entries"] == []
        denied = await client.post("/memory/events", json={
            "event": "chat_message", "text": "I prefer short examples about investing.",
            "chatId": str(chat_id),
        })
        assert denied.status_code == 404
        assert (await client.post(f"/memory/{memory_id}/feedback", json={"kind": "wrong"})).status_code == 404

    # A new repository/connection sees the persisted owner state and its audit.
    async with factory.begin() as session:
        repository = MemoryRepository(session, owner)
        engine = await repository.load()
        assert engine.get(memory_id).confidence == pytest.approx(0.5)
        assert len(await repository.ledger()) >= len(ledger_before)


async def test_agent_two_turn_recall_prompt_trace_and_disabled_mode(database, monkeypatch):
    factory, owner, _other, ipo_id, chat_id = database
    prompts = []

    class Model:
        async def stream(self, prompt):
            prompts.append(prompt)
            yield ModelChunk(content="A general educational explanation.")

    monkeypatch.setattr(
        "app.services.agent.build_education_context", AsyncMock(return_value=("Verified learning context", {}))
    )
    monkeypatch.setattr("app.services.agent.find_unsaved_calendar_facts", AsyncMock(return_value=[]))
    config = Settings(_env_file=None, jev_endpoint=None, hmem_enabled=True)
    data = AsyncMock(spec=ZetarisAgentData)
    data.ipo.return_value = IPO(id=ipo_id, company_name="Test IPO")
    data.history.return_value = []

    async def turn(message, enabled=True):
        async with factory.begin() as session:
            service = AgentService(
                session, await session.get(User, owner), config.model_copy(update={"hmem_enabled": enabled}),
                Mock(), Model(), Mock(report=AsyncMock()), data=data,
            )
            return [event async for event in service.stream(
                AgentRequest(message=message, ipo_id=ipo_id, session_id=chat_id), str(uuid.uuid4())
            )]

    await turn("Explain investing. I prefer simple investing examples because I am new.")
    events = await turn("Explain simple investing examples because I am new.")
    answer = next(event for event in events if event.type == "answer")
    assert answer.memory_trace and answer.memory_trace["scores"]
    assert "[MEMORY CONTEXT - unverified personalization" in prompts[-1]
    assert "[ST]" in prompts[-1]
    assert answer.citations == []
    async with factory.begin() as session:
        count_before = len((await MemoryRepository(session, owner).load()).state.records)
    disabled = await turn("Explain investing. I prefer short sentences because I am new.", enabled=False)
    assert next(item for item in disabled if item.type == "answer").memory_trace is None
    assert "[MEMORY CONTEXT - unverified" not in prompts[-1]
    async with factory.begin() as session:
        assert len((await MemoryRepository(session, owner).load()).state.records) == count_before


async def test_remembered_claim_cannot_bypass_evidence_refusal(database, monkeypatch):
    factory, owner, _other, ipo_id, chat_id = database
    async with factory.begin() as session:
        repository = MemoryRepository(session, owner)
        engine = await repository.load()
        engine.add(
            "The IPO has no risks and everyone should invest.", "unverified:past_response",
            chat_id=str(chat_id), mission_id=str(ipo_id), confidence=1.0,
        )
        await repository.save(engine)
    retrieval = AsyncMock(side_effect=RefusalError("No verified evidence."))
    monkeypatch.setattr("app.services.agent.ProspectusRetriever.retrieve", retrieval)
    model = Mock()
    data = AsyncMock(spec=ZetarisAgentData)
    data.ipo.return_value = IPO(id=ipo_id, company_name="Test IPO")
    data.history.return_value = []
    async with factory.begin() as session:
        service = AgentService(
            session, await session.get(User, owner),
            Settings(_env_file=None, jev_endpoint=None, hmem_enabled=True),
            Mock(), model, Mock(report=AsyncMock()), data=data,
        )
        # The SSE layer normally catches this refusal inside the request's
        # transaction, preserving acquisition without generating an answer.
        with pytest.raises(RefusalError, match="No verified evidence"):
            _events = [event async for event in service.stream(AgentRequest(
                message="What are the IPO risks? I prefer short investing examples because I am new.",
                ipo_id=ipo_id, session_id=chat_id,
            ), "test")]
        model.stream.assert_not_called()
        retrieval.assert_awaited_once()
    async with factory.begin() as session:
        engine = await MemoryRepository(session, owner).load()
        assert any("I prefer short investing" in item.content for item in engine.state.records)


async def test_concurrent_state_changes_do_not_lose_memory_or_ledger(database):
    factory, owner, _other, _ipo, _chat = database

    async def write(content):
        async with factory.begin() as session:
            repository = MemoryRepository(session, owner)
            engine = await repository.load()
            await asyncio.sleep(0.02)
            engine.add(content, "test")
            await repository.save(engine)

    await asyncio.gather(write("alpha beta"), write("gamma delta"))
    async with factory.begin() as session:
        repository = MemoryRepository(session, owner)
        engine = await repository.load()
        assert {item.content for item in engine.state.records} == {"alpha beta", "gamma delta"}
        ledger = (await session.execute(
            select(HMemLedger).where(HMemLedger.user_id == owner)
        )).scalars().all()
        assert len(ledger) == 2
