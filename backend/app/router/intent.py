from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol


class Pipeline(StrEnum):
    PROSPECTUS = "prospectus"
    EDUCATION = "education"
    CALENDAR = "calendar"


@dataclass(frozen=True)
class PipelineContext:
    pipeline: Pipeline
    rationale: str


class JEVClassifier(Protocol):
    async def classify(self, message: str) -> PipelineContext: ...


class RuleBasedJEVClassifier:
    """Replaceable local classifier used until a JEV endpoint is configured."""

    async def classify(self, message: str) -> PipelineContext:
        normalized = message.casefold()
        if any(term in normalized for term in ("calendar", "remind me", "add to", "event date")):
            return PipelineContext(Pipeline.CALENDAR, "calendar intent keyword")
        if any(
            term in normalized
            for term in ("explain", "what is", "teach me", "learn", "risk profile", "investing basics")
        ):
            return PipelineContext(Pipeline.EDUCATION, "education intent keyword")
        return PipelineContext(Pipeline.PROSPECTUS, "prospectus is the default pipeline")


class IntentRouter:
    def __init__(self, classifier: JEVClassifier | None = None) -> None:
        self._classifier = classifier or RuleBasedJEVClassifier()

    async def route(self, message: str) -> PipelineContext:
        return await self._classifier.classify(message)