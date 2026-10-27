from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CalendarProposal, KeyFact


@dataclass(frozen=True)
class CalendarFact:
    fact: KeyFact
    event_date: datetime


def parse_fact_date(value: str) -> datetime | None:
    candidate = value.strip()
    try:
        parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
        return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed
    except ValueError:
        pass
    for date_format in ("%Y-%m-%d", "%d/%m/%Y", "%B %d, %Y"):
        try:
            parsed = datetime.strptime(candidate, date_format)
            return parsed.replace(tzinfo=UTC)
        except ValueError:
            continue
    return None


async def find_unsaved_calendar_facts(
    session: AsyncSession, ipo_id: uuid.UUID, chat_session_id: uuid.UUID
) -> list[CalendarFact]:
    facts = (
        await session.execute(
            select(KeyFact).where(
                KeyFact.ipo_id == ipo_id,
                KeyFact.review_status == "verified",
            )
        )
    ).scalars().all()
    proposals = (
        await session.execute(
            select(CalendarProposal.key_fact_id).where(
                CalendarProposal.chat_session_id == chat_session_id,
                CalendarProposal.key_fact_id.is_not(None),
                CalendarProposal.status != "rejected",
            )
        )
    ).scalars().all()
    saved_ids = set(proposals)

    results: list[CalendarFact] = []
    for fact in facts:
        event_date = parse_fact_date(fact.value)
        if event_date is not None and fact.id not in saved_ids:
            results.append(CalendarFact(fact=fact, event_date=event_date))
    return results