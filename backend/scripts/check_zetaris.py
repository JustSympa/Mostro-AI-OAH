from __future__ import annotations

import argparse
import asyncio
import uuid

from app.agent.errors import DataHarnessError
from app.config import get_settings
from app.services.agent_data import ZetarisAgentData
from app.services.zetaris import ZetarisClient


async def check(
    *, login: bool = False, ipo_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None, session_id: uuid.UUID | None = None,
) -> None:
    settings = get_settings()
    client = ZetarisClient(settings)
    if login:
        await client.check_login()
        print("Zetaris Basic-auth login: OK (tokens are not printed).")
    # Zetaris serializes every scalar as a string, so "1" arrives as "1", not 1.
    rows = await client.query("SELECT 1 AS connected")
    if len(rows) != 1 or str(rows[0].get("connected")) != "1":
        raise DataHarnessError("Zetaris connectivity query returned an unexpected result.")
    print("Zetaris REST SQL start/page/close: OK.")
    columns = {
        "ipos": "id, company_name",
        "chunks": "id, document_id, ipo_id, content, embedding, embedding_model, page_number, section_path",
        "profiles": "user_id, preferred_language, risk_level, risk_label, applied_constraints",
        "knowledge": "user_id, term, mastery_level, definition",
        "history": "id, user_id, ipo_id, chat_session_id, sender, content, created_at",
        "facts": "id, ipo_id, fact_type, value, source_page",
        "proposals": "key_fact_id, chat_session_id, user_id",
    }
    for view, projection in columns.items():
        await client.query(
            f"SELECT {projection} FROM `{settings.zetaris_datasource}`.`agent_{view}` LIMIT 0"
        )
        print(f"Registered agent_{view} view: OK.")
    # Validate the Spark functions and score arithmetic even on an empty database.
    rows = await client.query("""
        WITH vectors AS (
            SELECT transform(split(substring('[1,0]', 2, length('[1,0]') - 2), ','),
                             x -> CAST(x AS DOUBLE)) AS v
        )
        SELECT CASE WHEN size(v) <> 2 THEN raise_error('Invalid vector')
               ELSE greatest(-1.0, least(1.0,
                    aggregate(zip_with(v, array(1D, 0D), (x, y) -> x*y),
                              CAST(0 AS DOUBLE), (s, x) -> s + x)
                    / sqrt(aggregate(v, CAST(0 AS DOUBLE), (s, x) -> s + x*x))))
               END AS score FROM vectors
    """)
    # The score is stringified too, so coerce before comparing to the expected 1.0.
    try:
        score = float(rows[0]["score"]) if len(rows) == 1 else None
    except (KeyError, IndexError, TypeError, ValueError):
        score = None
    if score is None or abs(score - 1.0) > 1e-9:
        raise DataHarnessError("Zetaris Spark cosine arithmetic did not match the expected value.")
    print("Zetaris Spark cosine arithmetic: OK.")
    data = ZetarisAgentData(settings, client)
    if ipo_id:
        if await data.ipo(ipo_id) is None:
            raise DataHarnessError("Smoke-test IPO was not found through Zetaris.")
        matches = await data.chunks(
            ipo_id, [1.0] + [0.0] * (settings.embedding_dimension - 1)
        )
        if not matches:
            raise DataHarnessError("Smoke-test IPO has no indexed chunks for EMBEDDING_MODEL.")
        print(f"IPO and engine-ranked chunk retrieval: OK ({len(matches)} matches).")
    if user_id:
        await data.learning_profile(user_id)
        knowledge = await data.knowledge(user_id)
        print(f"User learning profile and progression: OK ({len(knowledge)} terms).")
    if session_id:
        if ipo_id is None or user_id is None:
            raise DataHarnessError("--session-id requires --ipo-id and --user-id.")
        await data.history(user_id, ipo_id, session_id)
        await data.calendar_facts(user_id, ipo_id, session_id)
        print("User/session-scoped history and calendar facts: OK.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Check Zetaris without paid model/embedding calls.")
    parser.add_argument("--login", action="store_true", help="Also test Basic-auth login.")
    parser.add_argument("--ipo-id", type=uuid.UUID)
    parser.add_argument("--user-id", type=uuid.UUID)
    parser.add_argument("--session-id", type=uuid.UUID)
    args = parser.parse_args()
    try:
        asyncio.run(check(
            login=args.login, ipo_id=args.ipo_id, user_id=args.user_id, session_id=args.session_id
        ))
    except DataHarnessError as exc:
        parser.exit(1, f"Zetaris check failed: {exc}\n")


if __name__ == "__main__":
    main()
