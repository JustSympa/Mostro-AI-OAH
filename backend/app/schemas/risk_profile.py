from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.models import RiskProfile
from app.services.risk_questionnaire import Questionnaire

ShortId = Annotated[str, StringConstraints(min_length=1, max_length=64)]


class OptionOut(BaseModel):
    id: str
    label: str


class QuestionOut(BaseModel):
    id: str
    section: str
    prompt: str
    options: list[OptionOut]


class QuestionnaireOut(BaseModel):
    version: str
    questions: list[QuestionOut]

    @classmethod
    def from_definition(cls, questionnaire: Questionnaire) -> QuestionnaireOut:
        return cls(
            version=questionnaire.version,
            questions=[
                QuestionOut(
                    id=q.id,
                    section=q.section.value,
                    prompt=q.prompt,
                    options=[OptionOut(id=o.id, label=o.label) for o in q.options],
                )
                for q in questionnaire.questions
            ],
        )


class RiskSubmitIn(BaseModel):
    questionnaire_version: ShortId
    answers: dict[ShortId, ShortId] = Field(min_length=1, max_length=32)


class RiskProfileOut(BaseModel):
    version: int
    questionnaire_version: str
    risk_level: int
    risk_label: str
    raw_score: float
    weighted_score: float
    applied_constraints: list[str]
    completed_at: datetime

    @classmethod
    def from_model(cls, profile: RiskProfile) -> RiskProfileOut:
        return cls(
            version=profile.version,
            questionnaire_version=profile.questionnaire_version,
            risk_level=profile.risk_level,
            risk_label=profile.risk_label,
            raw_score=profile.raw_score,
            weighted_score=profile.weighted_score,
            applied_constraints=list(profile.applied_constraints),
            completed_at=profile.created_at,
        )
