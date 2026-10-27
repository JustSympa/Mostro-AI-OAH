from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class QuizQuestion(BaseModel):
    kind: Literal["mcq", "open_ended"]
    question: str
    options: list[str] | None = None
    answer: str | None = None