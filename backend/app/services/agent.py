from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.errors import ModelError, RefusalError
from app.config import Settings
from app.models import (
    ChatSession,
    IPO,
    Message,
    MessageCitation,
    User,
)
from app.router.calendar import find_unsaved_calendar_facts
from app.router.education import build_education_context
from app.router.intent import IntentRouter, Pipeline
from app.router.prospectus import (
    ProspectusRetriever,
    RetrievedChunk,
    build_prospectus_context,
)
from app.schemas.agent_request import AgentRequest
from app.schemas.agent_response import AgentEvent
from app.services.embeddings import Embedder
from app.services.model import CompletionClient, ModelChunk
from app.services.postprocess import (
    CalendarProposalBuilder,
    PostProcessingEvaluator,
    QuizRouter,
)
from app.utils.token_tracker import TokenTracker, Usage


class AgentService:
    def __init__(
        self,
        session: AsyncSession,
        user: User,
        settings: Settings,
        embedder: Embedder,
        model: CompletionClient,
        tracker: TokenTracker,
    ) -> None:
        self._session = session
        self._user = user
        self._settings = settings
        self._embedder = embedder
        self._model = model
        self._tracker = tracker
        self._intent = IntentRouter()
        self._postprocess = PostProcessingEvaluator()
        self._quiz_router = QuizRouter()
        self._calendar_builder = CalendarProposalBuilder()

    async def stream(self, payload: AgentRequest, request_id: str) -> AsyncIterator[AgentEvent]:
        ipo = await self._session.get(IPO, payload.ipo_id)
        if ipo is None:
            raise RefusalError("The requested IPO is not available.")

        chat_session = await self._get_or_create_session(payload, ipo.id)
        yield AgentEvent(type="session", session_id=str(chat_session.id))
        history = (
            await self._session.execute(
                select(Message)
                .where(Message.chat_session_id == chat_session.id)
                .order_by(Message.created_at.desc())
                .limit(10)
            )
        ).scalars().all()
        chat_session.turn_count += 1
        user_message = Message(
            chat_session_id=chat_session.id,
            sender="user",
            content=payload.message,
        )
        self._session.add(user_message)
        await self._session.flush()

        pipeline = await self._intent.route(payload.message)
        retrieved: list[RetrievedChunk] = []
        if pipeline.pipeline is Pipeline.PROSPECTUS:
            retriever = ProspectusRetriever(
                self._session, self._embedder, self._settings
            )
            retrieved = await retriever.retrieve(payload.message, ipo.id)
            context = build_prospectus_context(retrieved)
        elif pipeline.pipeline is Pipeline.EDUCATION:
            context, _profile = await build_education_context(
                self._session, self._user.id
            )
        else:
            facts = await find_unsaved_calendar_facts(
                self._session, ipo.id, chat_session.id
            )
            if not facts:
                raise RefusalError("There are no verified, unsaved event dates for this IPO.")
            context = "Verified key dates:\n" + "\n".join(
                f"{item.fact.fact_type}: {item.event_date.isoformat()} "
                f"(prospectus page {item.fact.source_page})"
                for item in facts
            )

        prompt = self._build_prompt(payload.message, context, pipeline.pipeline, list(reversed(history)))
        full_answer: list[str] = []
        usage = Usage()
        try:
            async for chunk in self._model.stream(prompt):
                self._record_usage(usage, chunk)
                if chunk.content:
                    full_answer.append(chunk.content)
                    yield AgentEvent(type="token", content=chunk.content)
        finally:
            await self._tracker.report(
                usage,
                session_id=str(chat_session.id),
                request_id=request_id,
            )

        answer = "".join(full_answer).strip()
        if not answer:
            raise ModelError("The model returned an empty response.")

        assistant_message = Message(
            chat_session_id=chat_session.id,
            sender="assistant",
            content=answer,
            intent=pipeline.pipeline.value,
        )
        self._session.add(assistant_message)
        await self._session.flush()
        for item in retrieved:
            self._session.add(
                MessageCitation(
                    message_id=assistant_message.id,
                    chunk_id=item.chunk.id,
                    quote_text=item.chunk.content[:1000],
                    page_number=item.chunk.page_number,
                )
            )

        citations = [
            {
                "chunk_id": str(item.chunk.id),
                "page_number": item.chunk.page_number,
                "section_path": item.chunk.section_path,
                "score": round(item.score, 4),
            }
            for item in retrieved
        ]
        yield AgentEvent(type="answer", content=answer, citations=citations)

        facts = await find_unsaved_calendar_facts(self._session, ipo.id, chat_session.id)
        if pipeline.pipeline is Pipeline.CALENDAR and facts:
            card = await self._calendar_builder.create(
                self._session, chat_session.id, facts[0]
            )
            yield AgentEvent(type="calendar", calendar=card)
        elif self._postprocess.should_offer_quiz(
            chat_session.turn_count, payload.consent_quiz
        ):
            question = self._quiz_router.create_question(pipeline.pipeline, answer)
            yield AgentEvent(type="quiz", question=question)

    async def _get_or_create_session(
        self, payload: AgentRequest, ipo_id: uuid.UUID
    ) -> ChatSession:
        if payload.session_id is not None:
            chat_session = (
                await self._session.execute(
                    select(ChatSession).where(
                        ChatSession.id == payload.session_id,
                        ChatSession.user_id == self._user.id,
                        ChatSession.ipo_id == ipo_id,
                    )
                )
            ).scalar_one_or_none()
            if chat_session is None:
                raise RefusalError("The requested chat session is unavailable.")
            return chat_session

        chat_session = ChatSession(user_id=self._user.id, ipo_id=ipo_id)
        self._session.add(chat_session)
        await self._session.flush()
        return chat_session

    @staticmethod
    def _record_usage(usage: Usage, chunk: ModelChunk) -> None:
        usage.prompt_tokens = max(usage.prompt_tokens, chunk.prompt_tokens)
        usage.completion_tokens = max(
            usage.completion_tokens, chunk.completion_tokens
        )

    @staticmethod
    def _build_prompt(
        message: str, context: str, pipeline: Pipeline, history: list[Message]
    ) -> str:
        prior_messages = "\n".join(
            f"{item.sender}: {item.content}" for item in history
        )
        return (
            "You are Mostro, an educational IPO assistant. Use the supplied context as evidence. "
            "Do not invent facts, dates, or investment recommendations. State when information is "
            "missing. Distinguish general education from individualized financial advice.\n"
            f"Pipeline: {pipeline.value}\n"
            f"Context:\n<context>\n{context}\n</context>\n"
            f"Recent conversation:\n{prior_messages}\n"
            f"User message:\n{message}"
        )