from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.calendar import CalendarCard
from app.schemas.quiz import QuizQuestion


class AgentEvent(BaseModel):
    type: Literal["session", "token", "answer", "quiz", "calendar", "refusal", "error"]
    content: str | None = None
    session_id: str | None = None
    question: QuizQuestion | None = None
    calendar: CalendarCard | None = None
    citations: list[dict[str, Any]] = Field(default_factory=list)