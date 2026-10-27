from __future__ import annotations

import importlib.util
import os
import uuid
from pathlib import Path

import pytest
import pytest_asyncio
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine

pytestmark = pytest.mark.skipif(
    not os.environ.get("ZETARIS_TEST_DATABASE_URL"),
    reason="Set ZETARIS_TEST_DATABASE_URL to an isolated disposable PostgreSQL database.",
)


def migration(name: str):
    path = Path(__file__).parents[2] / "alembic" / "versions" / name
    spec = importlib.util.spec_from_file_location(name.removesuffix(".py"), path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest_asyncio.fixture(loop_scope="function")
async def database():
    url = os.environ["ZETARIS_TEST_DATABASE_URL"]
    schema = f"zetaris_test_{uuid.uuid4().hex}"
    bootstrap = create_async_engine(url)
    async with bootstrap.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_async_engine(
        url, connect_args={"server_settings": {"search_path": f"{schema},public"}}
    )
    # Minimal source tables isolate the view contract from unrelated migrations.
    # Text vectors exercise the same view ::text cast without requiring pgvector.
    tables = [
        "CREATE TABLE ipos (id uuid PRIMARY KEY, company_name text)",
        "CREATE TABLE documents (id uuid PRIMARY KEY, ipo_id uuid, status text)",
        """CREATE TABLE chunks (id uuid PRIMARY KEY, document_id uuid, ipo_id uuid,
           content text, embedding text, page_number integer, section_path text)""",
        "CREATE TABLE users (id uuid PRIMARY KEY, preferred_language text, password_hash text)",
        """CREATE TABLE risk_profiles (user_id uuid, version integer, risk_level integer,
           risk_label text, applied_constraints jsonb)""",
        "CREATE TABLE glossary_terms (id uuid PRIMARY KEY, term text, simple_explanation text)",
        "CREATE TABLE user_knowledge_states (user_id uuid, glossary_term_id uuid, mastery_level text)",
        "CREATE TABLE chat_sessions (id uuid PRIMARY KEY, user_id uuid, ipo_id uuid)",
        """CREATE TABLE messages (id uuid PRIMARY KEY, chat_session_id uuid, sender text,
           content text, created_at timestamptz DEFAULT now())""",
        """CREATE TABLE key_facts (id uuid PRIMARY KEY, ipo_id uuid, fact_type text,
           value text, source_page integer, review_status text)""",
        "CREATE TABLE calendar_proposals (key_fact_id uuid, chat_session_id uuid, status text)",
    ]
    model_migration = migration("20261027_0007_embedding_model.py")
    views = migration("20261027_0008_zetaris_views.py")

    def upgrade(connection):
        with Operations.context(MigrationContext.configure(connection)):
            model_migration.upgrade()
            views.upgrade()

    try:
        async with engine.begin() as connection:
            for statement in tables:
                await connection.execute(text(statement))
            await connection.run_sync(upgrade)
        yield engine, schema, views
    finally:
        await engine.dispose()
        async with bootstrap.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await bootstrap.dispose()


async def test_view_migration_upgrade_downgrade_and_jdbc_columns(database) -> None:
    engine, schema, views = database

    def check(connection):
        inspector = inspect(connection)
        assert set(inspector.get_view_names(schema=schema)) == set(views.VIEWS)
        chunk_columns = {item["name"]: item for item in inspector.get_columns("agent_chunks", schema=schema)}
        assert str(chunk_columns["id"]["type"]) == "TEXT"
        assert str(chunk_columns["embedding"]["type"]) == "TEXT"
        assert str(chunk_columns["embedding_model"]["type"]) == "VARCHAR(100)"
        profile_columns = {item["name"] for item in inspector.get_columns("agent_profiles", schema=schema)}
        assert profile_columns == {
            "user_id", "preferred_language", "risk_level", "risk_label", "applied_constraints"
        }
        with Operations.context(MigrationContext.configure(connection)):
            views.downgrade()
            assert inspect(connection).get_view_names(schema=schema) == []
            assert "users" in inspect(connection).get_table_names(schema=schema)
            views.upgrade()

    async with engine.begin() as connection:
        await connection.run_sync(check)


async def test_views_filter_evidence_and_expose_latest_learning_state(database) -> None:
    engine, _schema, _views = database
    ids = {key: uuid.uuid4() for key in (
        "ipo", "other_ipo", "indexed", "pending", "user", "other_user", "term",
        "chat", "other_chat", "fact", "rejected_fact", "pending_fact",
    )}
    async with engine.begin() as connection:
        for key in ("ipo", "other_ipo"):
            await connection.execute(text("INSERT INTO ipos VALUES (:id, 'Example')"), {"id": ids[key]})
        for key, status in (("indexed", "indexed"), ("pending", "pending")):
            await connection.execute(
                text("INSERT INTO documents VALUES (:id, :ipo, :status)"),
                {"id": ids[key], "ipo": ids["ipo"], "status": status},
            )
        for document, ipo, embedding in (
            ("indexed", "ipo", "[1,0]"), ("pending", "ipo", "[1,0]"),
            ("indexed", "other_ipo", "[1,0]"), ("indexed", "ipo", None),
        ):
            await connection.execute(
                text("""INSERT INTO chunks (id, document_id, ipo_id, content, embedding, page_number,
                     embedding_model) VALUES (:id, :document, :ipo, 'Evidence', :embedding, 1, 'voyage-3.5')"""),
                {"id": uuid.uuid4(), "document": ids[document], "ipo": ids[ipo], "embedding": embedding},
            )
        chunks = (await connection.execute(text("SELECT * FROM agent_chunks"))).mappings().all()
        assert len(chunks) == 1
        assert chunks[0]["ipo_id"] == str(ids["ipo"])
        assert chunks[0]["embedding"] == "[1,0]"
        for key, language in (("user", "fr"), ("other_user", "en")):
            await connection.execute(
                text("INSERT INTO users VALUES (:id, :language, 'must-not-be-exposed')"),
                {"id": ids[key], "language": language},
            )
        for version in (1, 2):
            await connection.execute(
                text("""INSERT INTO risk_profiles VALUES (
                    :user, :version, :level, :label, '["education only"]'::jsonb)"""),
                {"user": ids["user"], "version": version, "level": version, "label": f"Level {version}"},
            )
        profile = (await connection.execute(
            text("SELECT * FROM agent_profiles WHERE user_id = :user"), {"user": str(ids["user"])}
        )).mappings().one()
        assert profile["preferred_language"] == "fr"
        assert profile["risk_level"] == 2
        assert profile["risk_label"] == "Level 2"
        assert profile["applied_constraints"] == '["education only"]'
        other = (await connection.execute(
            text("SELECT * FROM agent_profiles WHERE user_id = :user"), {"user": str(ids["other_user"])}
        )).mappings().one()
        assert other["risk_level"] is None
        await connection.execute(
            text("INSERT INTO glossary_terms VALUES (:term, 'IPO', 'Initial public offering')"),
            {"term": ids["term"]},
        )
        await connection.execute(
            text("INSERT INTO user_knowledge_states VALUES (:user, :term, 'reviewing')"),
            {"user": ids["user"], "term": ids["term"]},
        )
        knowledge = (await connection.execute(text("SELECT * FROM agent_knowledge"))).mappings().one()
        assert knowledge["user_id"] == str(ids["user"])
        assert knowledge["mastery_level"] == "reviewing"
        assert knowledge["definition"] == "Initial public offering"
        for chat, user in (("chat", "user"), ("other_chat", "other_user")):
            await connection.execute(
                text("INSERT INTO chat_sessions VALUES (:chat, :user, :ipo)"),
                {"chat": ids[chat], "user": ids[user], "ipo": ids["ipo"]},
            )
            await connection.execute(
                text("""INSERT INTO messages (id, chat_session_id, sender, content)
                     VALUES (:id, :chat, 'user', :content)"""),
                {"id": uuid.uuid4(), "chat": ids[chat], "content": user},
            )
        history = (await connection.execute(
            text("SELECT * FROM agent_history WHERE user_id = :user"), {"user": str(ids["user"])}
        )).mappings().one()
        assert history["content"] == "user"
        assert history["chat_session_id"] == str(ids["chat"])
        for fact, status in (("fact", "verified"), ("rejected_fact", "rejected"), ("pending_fact", "pending")):
            await connection.execute(
                text("""INSERT INTO key_facts VALUES (
                    :id, :ipo, 'closing_date', '2026-11-15', 1, :status)"""),
                {"id": ids[fact], "ipo": ids["ipo"], "status": status},
            )
        facts = (await connection.execute(text("SELECT * FROM agent_facts"))).mappings().all()
        assert [row["id"] for row in facts] == [str(ids["fact"])]
        for chat, status in (("chat", "confirmed"), ("other_chat", "rejected")):
            await connection.execute(
                text("INSERT INTO calendar_proposals VALUES (:fact, :chat, :status)"),
                {"fact": ids["fact"], "chat": ids[chat], "status": status},
            )
        proposals = (await connection.execute(text("SELECT * FROM agent_proposals"))).mappings().all()
        assert len(proposals) == 1
        assert proposals[0]["user_id"] == str(ids["user"])
