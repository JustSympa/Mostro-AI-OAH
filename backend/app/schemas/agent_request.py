from __future__ import annotations

import uuid

from pydantic import BaseModel, Field, field_validator


class AgentRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    ipo_id: uuid.UUID
    session_id: uuid.UUID | None = None
    consent_quiz: bool = False

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("message must not be blank")
        return cleaned