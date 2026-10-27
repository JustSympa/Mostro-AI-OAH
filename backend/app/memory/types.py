from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

MemoryType = Literal["personal", "factual", "preference", "general"]
Layer = Literal["short_term", "working", "long_term"]
Event = Literal[
    "chat_message", "user_correction", "file_save", "file_open", "file_edit",
    "model_response", "plan_completion",
]
Origin = Literal[
    "chat_message", "user_correction", "file_save", "file_open", "file_edit",
    "model_response", "plan_completion", "document", "manual", "dream", "sleep_synthesis",
]
Action = Literal[
    "create", "read", "update", "delete", "feedback", "promote", "demote", "merge",
    "conflict_detected", "conflict_resolved", "sleep_consolidate", "sleep_archive",
    "sleep_synthesize", "dream_proposed", "dream_approved", "dream_rejected", "restore",
]
Feedback = Literal["helpful", "not_helpful", "wrong"]
Resolution = Literal["keep_a", "keep_b", "keep_both", "merge", "delete_both"]
Probability = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]


class Shape(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, validate_assignment=True,
        extra="forbid", str_strip_whitespace=True,
    )


class Provenance(Shape):
    origin: Origin
    learned_at: float
    label: str = Field(min_length=1)
    refs: list[str] = Field(default_factory=list)


class Memory(Shape):
    id: str
    content: str = Field(min_length=1, max_length=4000)
    type: MemoryType = "general"
    layer: Layer = "working"
    timestamp: float
    last_accessed: float
    access_count: int = Field(default=0, ge=0)
    tags: list[str] = Field(default_factory=list)
    embedding: list[float] = Field(default_factory=list)
    confidence: Probability = 0.7
    source: str = Field(min_length=1)
    provenance: Provenance
    chat_id: str | None = None
    mission_id: str | None = None
    goal_run_id: str | None = None
    domain: str = "general"
    namespace: str = "general/notes"
    entities: list[str] = Field(default_factory=list, max_length=10)
    related_to: list[str] = Field(default_factory=list, max_length=5)
    supersedes: str | None = None
    superseded_by: str | None = None
    derived_from: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def legacy_provenance(cls, value: Any) -> Any:
        if isinstance(value, dict) and "provenance" not in value:
            source = value.get("source")
            if isinstance(source, str) and source.strip():
                return {
                    **value,
                    "provenance": {
                        "origin": "manual", "learnedAt": value.get("timestamp", 0),
                        "label": f"legacy source: {source.strip()}",
                    },
                }
        return value


class LedgerEntry(Shape):
    memory_id: str
    action: Action
    actor: str
    timestamp: float
    previous_state: dict[str, Any] | None = None
    new_state: dict[str, Any] | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class Proposal(Shape):
    id: str
    type: Literal["insight", "domain", "invariant"]
    content: str
    derived_from: list[str]
    suggested_domain: str | None = None
    status: Literal["proposed", "approved", "rejected"] = "proposed"


class Conflict(Shape):
    id: str
    memory_a: str
    memory_b: str
    reason: str
    confidence: Probability
    resolved: bool = False
    resolution: Resolution | None = None


class SleepPlan(Shape):
    to_consolidate: list[str] = Field(default_factory=list)
    to_archive: list[str] = Field(default_factory=list)
    to_synthesize: list[list[str]] = Field(default_factory=list)


class Backup(Shape):
    records: list[Memory]
    timestamp: float


class MemoryState(Shape):
    version: Literal[1] = 1
    sequence: int = 0
    records: list[Memory] = Field(default_factory=list)
    proposals: list[Proposal] = Field(default_factory=list)
    conflicts: list[Conflict] = Field(default_factory=list)
    backups: dict[str, Backup] = Field(default_factory=dict)
    reports: list[dict[str, Any]] = Field(default_factory=list)


class RecallItem(Shape):
    memory: Memory
    relevance: float


class RecallTrace(Shape):
    retrieval_reason: str
    strategy: Literal["minimal", "personal", "comprehensive"]
    scores: dict[str, float]


class Recall(Shape):
    memories: list[RecallItem]
    context: str
    trace: RecallTrace
