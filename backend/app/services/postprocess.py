from __future__ import annotations

import uuid
from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CalendarProposal
from app.router.calendar import CalendarFact
from app.router.intent import Pipeline
from app.schemas.calendar import CalendarCard
from app.schemas.quiz import QuizQuestion


class PostProcessingEvaluator:
    def should_offer_quiz(self, turn_count: int, consent: bool) -> bool:
        return consent or (turn_count > 0 and turn_count % 4 == 0)


class QuizRouter:
    def create_question(self, intent: Pipeline, answer: str) -> QuizQuestion:
        if intent is Pipeline.PROSPECTUS:
            return QuizQuestion(
                kind="mcq",
                question="Which source should you consult to verify this IPO detail?",
                options=["The official prospectus", "An unrelated social post", "A price prediction"],
                answer="The official prospectus",
            )
        subject = answer.strip().split(".", maxsplit=1)[0][:160]
        return QuizQuestion(
            kind="open_ended",
            question=f"In your own words, what is the key idea in: {subject}?",
        )


class CalendarProposalBuilder:
    async def create(
        self,
        session: AsyncSession,
        chat_session_id: uuid.UUID,
        fact: CalendarFact,
    ) -> CalendarCard:
        title = fact.fact.fact_type.replace("_", " ").strip().title()
        proposal = CalendarProposal(
            chat_session_id=chat_session_id,
            key_fact_id=fact.fact.id,
            event_title=title or "IPO event",
            event_date=fact.event_date,
            status="proposed",
        )
        session.add(proposal)
        await session.flush()
        return CalendarCard(
            proposal_id=proposal.id,
            title=proposal.event_title,
            start=fact.event_date,
            end=fact.event_date + timedelta(hours=1),
            description=f"Verified from prospectus page {fact.fact.source_page}.",
        )