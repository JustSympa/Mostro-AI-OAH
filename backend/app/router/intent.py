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


from app.services.jev import JEVClassifierImpl
from app.config import Settings

class RuleBasedJEVClassifier:
    """Simple keyword‑based fallback classifier used when no JEV endpoint is configured."""

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
    def __init__(self, settings: Settings | None = None, classifier: JEVClassifier | None = None) -> None:
        # If a JEV endpoint is configured, use the real classifier; otherwise fall back to rule‑based.
        self._classifier = classifier
        if self._classifier is None:
            if settings and settings.jev_endpoint:
                self._classifier = JEVClassifierImpl(settings.jev_endpoint, settings.jev_api_key)
            else:
                self._classifier = RuleBasedJEVClassifier()

    async def route(self, message: str) -> PipelineContext:
        result = await self._classifier.classify(message)
        # JEV service may return a plain dict; convert to PipelineContext if necessary
        if isinstance(result, dict):
            from app.router.intent import Pipeline, PipelineContext
            pipeline = Pipeline(result.get("pipeline", "prospectus"))
            rationale = result.get("rationale", "")
            return PipelineContext(pipeline=pipeline, rationale=rationale)
        return result


# Duplicate IntentRouter implementation removed – only the settings-aware version is used