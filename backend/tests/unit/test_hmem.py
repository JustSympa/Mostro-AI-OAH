from __future__ import annotations

import json
import math
import uuid
from unittest.mock import AsyncMock, Mock

import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.errors import ModelError
from app.memory.engine import DAY, HMem, embed, parse_memories, snapshot
from app.memory.types import MemoryState, Provenance, SleepPlan
from app.models.memory import HMemState
from app.services.memory import MemoryRepository


@pytest.fixture
def clock() -> list[float]:
    return [1_750_000_000_000.0]


@pytest.fixture
def engine(clock) -> HMem:
    return HMem(clock=lambda: clock[0])


@pytest.mark.parametrize("source", ["", "  "])
def test_source_is_required(engine, source) -> None:
    with pytest.raises(ValidationError):
        engine.add("A memory", source)
    assert not engine.state.records
    assert not engine.ledger


def test_canonical_shape_and_enrichment(engine) -> None:
    memory = engine.add("I prefer Python and Docker for the project.", "chat")
    assert memory.confidence == 0.7
    assert memory.provenance.origin == "manual"
    assert memory.provenance.label == "chat"
    assert memory.namespace.startswith(memory.domain + "/")
    assert memory.entities
    assert len(memory.embedding) == 64
    assert memory.embedding == embed(memory.content)
    assert engine.ledger[-1].action == "create"


def test_entities_and_bidirectional_relationship_caps(engine) -> None:
    memories = [
        engine.add(
            "Python React Docker API Redis Alice Bob Charlie Database Deploy Server",
            "test", tags=["tech:python"],
        ) for _ in range(12)
    ]
    assert all(len(item.entities) <= 10 and len(item.related_to) <= 5 for item in memories)
    for memory in memories:
        for related in memory.related_to:
            assert memory.id in engine.get(related).related_to


@pytest.mark.parametrize(
    ("kind", "start", "expected", "access"),
    [
        ("helpful", 0.7, 0.75, 1), ("not_helpful", 0.7, 0.67, 0),
        ("wrong", 0.7, 0.5, 0), ("wrong", 0.1, 0, 0), ("helpful", 0.98, 1, 1),
    ],
)
def test_exact_feedback_deltas_and_audit(engine, kind, start, expected, access) -> None:
    memory = engine.add("feedback record", "test", confidence=start)
    engine.feedback(memory.id, kind)
    assert memory.confidence == pytest.approx(expected)
    assert memory.access_count == access
    if kind == "wrong":
        assert "review" in memory.tags
    assert [entry.action for entry in engine.ledger] == ["create", "feedback"]
    entry = engine.ledger[-1]
    assert entry.previous_state["confidence"] == start
    assert entry.new_state["confidence"] == pytest.approx(expected)


def test_exact_hybrid_formula_confidence_and_recency(engine, clock) -> None:
    memory = engine.add("alpha beta", "test", confidence=0.8, layer="working")
    # Identical embeddings/tokens, no tags/entities, same general domain.
    expected = (0.35 + 0.20 + 0.10 + 0.05 * 0.8 + 0.05) * 0.8
    assert engine.score_one(memory, "alpha beta") == pytest.approx(expected)
    clock[0] += 14 * DAY
    assert engine.score_one(memory, "alpha beta") == pytest.approx(
        expected - 0.05 * (1 - math.exp(-1)) * 0.8
    )
    memory.superseded_by = "replacement"
    assert engine.score_one(memory, "alpha beta") == pytest.approx(
        expected - 0.05 * (1 - math.exp(-1)) * 0.8 - 0.20 * 0.8
    )


def test_threshold_applies_after_confidence_multiplier(engine) -> None:
    low = engine.add("alpha beta", "test", confidence=0.1)
    high = engine.add("alpha beta", "test", confidence=1.0)
    result = engine.query("alpha beta")
    assert [item.memory.id for item in result.memories] == [high.id]
    assert low.access_count == 0
    assert high.access_count == 1
    assert result.trace.scores[high.id] >= 0.35
    assert "[WK]" in result.context


def test_threshold_boundary_top_five_and_read_audit(engine) -> None:
    for index in range(8):
        engine.add("alpha beta", f"test:{index}", confidence=1)
    score = engine.score_one(engine.state.records[0], "alpha beta")
    result = engine.query("alpha beta", threshold=score)
    assert len(result.memories) == 5
    assert len([item for item in engine.ledger if item.action == "read"]) == 5
    assert not engine.query("alpha beta", threshold=score + 1e-8).memories


def test_scope_isolation_including_missing_requested_scope(engine) -> None:
    a = engine.add("alpha beta", "test", chat_id="a", mission_id="ipo-a", goal_run_id="run-a")
    b = engine.add("alpha beta", "test", chat_id="b", mission_id="ipo-a")
    other_ipo = engine.add("alpha beta", "test", chat_id="a", mission_id="ipo-b")
    assert engine.query("alpha beta", threshold=0).memories == []
    result = engine.query("alpha beta", threshold=0, chat_id="a", mission_id="ipo-a", goal_run_id="run-a")
    assert [item.memory.id for item in result.memories] == [a.id]
    assert not b.related_to and not other_ipo.related_to


def test_correction_marks_prior_memory_without_deleting(engine) -> None:
    old = engine.add("Always use Python for our API server project", "chat")
    new = engine.add("Actually always use Python for our API server project", "correction")
    assert new.supersedes == old.id
    assert old.superseded_by == new.id
    assert engine.scan_conflicts() == []
    assert len(engine.state.records) == 2


def test_tolerant_extraction_parser() -> None:
    assert parse_memories('Text ```json\n["Prefer short answers", 12, "x"]\n```') == ["Prefer short answers"]
    with pytest.raises(ValueError):
        parse_memories("not JSON")


@pytest.mark.parametrize(
    "event",
    ["chat_message", "user_correction", "file_save", "file_open", "file_edit", "model_response", "plan_completion"],
)
async def test_all_canonical_acquisition_events(engine, event) -> None:
    items = await engine.mine(
        event, "I prefer short examples because I am learning investing.", chat_id="chat",
        mission_id="ipo", source_ref="message-1",
    )
    assert len(items) == 1
    item = items[0]
    assert item.layer == "short_term"
    assert item.provenance.origin == event
    assert item.provenance.refs == ["message-1"]
    assert item.source == f"interaction:{event}"


async def test_model_extraction_and_document_working_tier(engine) -> None:
    miner = AsyncMock(return_value='```json\n["The IPO closes in November."]\n```')
    items = await engine.mine(
        "file_save", "x" * 20_000, document_name="prospectus.pdf", miner=miner
    )
    assert len(items) == 1 and items[0].layer == "working"
    assert items[0].provenance.origin == "document"
    assert len(miner.call_args.args[0]) < 8500


async def test_document_fallback_captures_facts_without_preference_words(engine) -> None:
    items = await engine.mine(
        "file_save", "The IPO subscription closes on 15 November 2026.",
        document_name="prospectus.pdf", source_ref="document-1",
    )
    assert len(items) == 1
    assert items[0].layer == "working"
    assert items[0].provenance.refs == ["document-1"]


@pytest.mark.parametrize("failure", [ModelError("Unavailable"), ValueError("Invalid JSON")])
async def test_extraction_failure_logs_and_preserves_direct_capture(engine, failure, caplog) -> None:
    items = await engine.mine(
        "chat_message", "I prefer examples using simple investing terminology.",
        miner=AsyncMock(side_effect=failure),
    )
    assert len(items) == 1
    assert items[0].layer == "short_term"
    assert "direct capture" in caplog.text


async def test_duplicate_capture_is_idempotent_within_scope(engine) -> None:
    text = "I prefer short examples because I am learning investing."
    assert len(await engine.mine("chat_message", text, chat_id="a")) == 1
    assert await engine.mine("chat_message", text, chat_id="a") == []
    assert len(await engine.mine("chat_message", text, chat_id="b")) == 1


def test_dream_human_approval_boundary_and_scope(engine) -> None:
    a = engine.add("prefer short bullet answers", "chat", type="preference", chat_id="a")
    b = engine.add("prefer simple short answers", "chat", type="preference", chat_id="a")
    engine.add("prefer simple short answers", "chat", type="preference", chat_id="b")
    before = len(engine.state.records)
    proposals = engine.dream()
    assert proposals and len(engine.state.records) == before
    assert all(set(item.derived_from) <= {a.id, b.id} for item in proposals)
    memory = engine.review_proposal(proposals[0].id, True)
    assert memory and memory.layer == "long_term"
    assert memory.chat_id == "a"
    assert set(memory.derived_from) == {a.id, b.id}
    with pytest.raises(KeyError):
        engine.review_proposal(proposals[0].id, True)


def test_rejected_dream_never_materializes(engine) -> None:
    engine.add("prefer short bullet answers", "chat", type="preference")
    engine.add("prefer simple short answers", "chat", type="preference")
    proposal = engine.dream()[0]
    before = len(engine.state.records)
    engine.review_proposal(proposal.id, False)
    assert len(engine.state.records) == before
    assert engine.ledger[-1].action == "dream_rejected"


def test_stale_dream_can_be_rejected_but_not_approved(engine) -> None:
    a = engine.add("prefer short bullet answers", "chat", type="preference")
    engine.add("prefer simple short answers", "chat", type="preference")
    proposal = engine.dream()[0]
    engine.delete(a.id, "user request")
    with pytest.raises(KeyError):
        engine.review_proposal(proposal.id, True)
    assert proposal.status == "proposed"
    engine.review_proposal(proposal.id, False)
    assert proposal.status == "rejected"


def test_sleep_guardrails_preview_backup_restore_and_ledger(engine, clock) -> None:
    plain = engine.add("one off parking note", "chat")
    derived = engine.add("synthesized stable preference", "dreaming", derived_from=["mem-old"])
    before = engine.state.model_dump_json()
    clock[0] += 40 * DAY
    plan = engine.sleep_preview()
    assert engine.state.model_dump_json() == before
    assert plain.id in plan.to_archive
    assert derived.id not in plan.to_archive
    report = engine.sleep_execute(plan)
    assert engine.get(derived.id)
    with pytest.raises(KeyError):
        engine.get(plain.id)
    ledger_before_restore = [item.model_dump() for item in engine.ledger]
    engine.restore(report["backupId"])
    assert engine.get(plain.id)
    assert [item.model_dump() for item in engine.ledger[:-1]] == ledger_before_restore
    assert engine.ledger[-1].action == "restore"
    assert engine.state.sequence >= int(report["backupId"].split("-")[1])


def test_sleep_stale_or_forged_plan_is_rejected(engine) -> None:
    memory = engine.add("new record", "chat")
    with pytest.raises(ValueError, match="stale or modified"):
        engine.sleep_execute(SleepPlan(to_archive=[memory.id]))
    assert not engine.state.backups


def test_sleep_promotes_after_seven_days_and_archives_at_thirty(engine, clock) -> None:
    memory = engine.add("a note without entity links", "chat", layer="short_term")
    clock[0] += 7 * DAY - 1
    assert not engine.sleep_preview().to_consolidate
    clock[0] += 1
    assert engine.sleep_preview().to_consolidate == [memory.id]
    engine.sleep_execute()
    assert memory.layer == "long_term"
    clock[0] += 23 * DAY
    assert memory.id in engine.sleep_preview().to_archive


def test_sleep_synthesis_lineage_and_restart_restore(engine) -> None:
    a = engine.add("alpha beta gamma delta", "chat")
    b = engine.add("alpha beta gamma delta", "chat")
    plan = engine.sleep_preview()
    assert plan.to_synthesize == [[a.id, b.id]]
    report = engine.sleep_execute(plan)
    assert len(engine.state.records) == 1
    assert engine.state.records[0].derived_from == [a.id, b.id]
    loaded = HMem(MemoryState.model_validate_json(engine.state.model_dump_json()))
    loaded.restore(report["backupId"])
    assert {item.id for item in loaded.state.records} == {a.id, b.id}


def test_sleep_preserves_pending_proposal_sources(engine, clock) -> None:
    a = engine.add("prefer short bullet answers", "chat", type="preference")
    b = engine.add("prefer simple short answers", "chat", type="preference")
    engine.dream()
    clock[0] += 40 * DAY
    plan = engine.sleep_preview()
    assert not set(plan.to_archive) & {a.id, b.id}
    assert not plan.to_synthesize


def test_synthesis_inherits_external_graph_links(engine) -> None:
    a = engine.add("alpha beta gamma delta", "chat")
    b = engine.add("alpha beta gamma delta", "chat")
    peer = engine.add("different far away note", "chat")
    a.related_to = [peer.id]
    peer.related_to = [a.id]
    plan = engine.sleep_preview()
    assert [a.id, b.id] in plan.to_synthesize
    engine.sleep_execute(plan)
    merged = next(item for item in engine.state.records if item.derived_from)
    assert peer.id in merged.related_to
    assert peer.related_to == [merged.id]


def test_conflict_gate_and_no_deletion(engine) -> None:
    a = engine.add("always enable telemetry uploads for diagnostics", "chat", confidence=0.95)
    b = engine.add("never enable telemetry uploads for diagnostics", "chat", confidence=0.2)
    conflict = engine.scan_conflicts()[0]
    assert engine.scan_conflicts() == []
    assert engine.auto_resolve(conflict.id) == "resolved"
    assert engine.get(b.id).superseded_by == a.id
    assert len(engine.state.records) == 2


def test_ambiguous_conflict_is_queued(engine) -> None:
    engine.add("always enable telemetry uploads for diagnostics", "chat", confidence=0.7)
    engine.add("never enable telemetry uploads for diagnostics", "chat", confidence=0.7)
    conflict = engine.scan_conflicts()[0]
    assert engine.auto_resolve(conflict.id) == "queued"
    assert not conflict.resolved


def test_same_entity_divergent_claims_are_detected(engine) -> None:
    engine.add("Mostro uses Python for the API server", "chat")
    engine.add("Mostro uses Rust for the API server", "chat")
    conflict = engine.scan_conflicts()[0]
    assert conflict.reason == "same-entity divergent claims"


@pytest.mark.parametrize("resolution", ["keep_a", "keep_b", "keep_both", "merge", "delete_both"])
def test_human_conflict_strategies_preserve_history(engine, resolution) -> None:
    a = engine.add("always enable telemetry uploads for diagnostics", "chat")
    b = engine.add("never enable telemetry uploads for diagnostics", "chat")
    conflict = engine.scan_conflicts()[0]
    engine.resolve(conflict.id, resolution, content="Ask before enabling telemetry.")
    assert conflict.resolved
    assert engine.get(a.id) and engine.get(b.id)
    assert engine.ledger[-1].action == "conflict_resolved"


def test_hydration_backfills_embeddings_and_rejects_bad_state(engine) -> None:
    memory = engine.add("alpha beta", "chat")
    state = json.loads(engine.state.model_dump_json())
    state["records"][0]["embedding"] = []
    del state["records"][0]["provenance"]
    state["sequence"] = 0
    loaded = HMem(MemoryState.model_validate(state))
    assert loaded.get(memory.id).embedding == memory.embedding
    assert loaded.get(memory.id).provenance.label == "legacy source: chat"
    assert loaded.add("another new record", "chat").id != memory.id
    state["records"][0]["source"] = ""
    with pytest.raises(ValidationError):
        MemoryState.model_validate(state)


def test_invalid_merge_does_not_resolve_conflict(engine) -> None:
    engine.add("always enable telemetry uploads for diagnostics", "chat")
    engine.add("never enable telemetry uploads for diagnostics", "chat")
    conflict = engine.scan_conflicts()[0]
    with pytest.raises(ValueError):
        engine.resolve(conflict.id, "merge")
    assert not conflict.resolved


@pytest.mark.parametrize(("offset", "expected"), [(-1e-8, "queued"), (1e-8, "resolved")])
def test_auto_resolve_gate_boundary(engine, offset, expected) -> None:
    a = engine.add("always enable telemetry uploads for diagnostics", "chat", confidence=0.95)
    b = engine.add("never enable telemetry uploads for diagnostics", "chat", confidence=0.2)
    conflict = engine.scan_conflicts()[0]
    sa = 0.3 + 0.25 * a.confidence + 0.1 * len(a.content) / 200 + 0.15 * 0.5
    sb = 0.3 + 0.25 * b.confidence + 0.1 * len(b.content) / 200 + 0.15 * 0.5
    margin = abs(sa - sb) / max(sa, sb)
    conflict.confidence = (0.7 + offset - margin * 0.8) / 0.6
    assert engine.auto_resolve(conflict.id) == expected


async def test_repository_appends_ledger_and_serializes_owner_lock(engine) -> None:
    owner = uuid.uuid4()
    row = HMemState(user_id=owner, state=MemoryState().model_dump(mode="json", by_alias=True))
    session = AsyncMock(spec=AsyncSession)
    session.add = Mock()
    result = Mock()
    result.scalar_one.return_value = row
    session.execute.return_value = result
    repository = MemoryRepository(session, owner)
    memory = await repository.load()
    assert "FOR UPDATE" in str(session.execute.call_args_list[-1].args[0])
    record = memory.add("alpha beta", "chat")
    await repository.save(memory)
    assert row.state["records"][0]["id"] == record.id
    assert session.add.call_args.args[0].user_id == owner
    assert session.add.call_args.args[0].entry["action"] == "create"
    assert not memory.ledger
    session.add.reset_mock()
    await repository.save(memory)
    session.add.assert_not_called()


def test_prompt_reinjection_keeps_memory_separate_from_evidence() -> None:
    from app.router.intent import Pipeline
    from app.services.agent import AgentService

    prompt = AgentService._build_prompt(
        "Question", "Verified prospectus evidence", Pipeline.PROSPECTUS, [],
        '[MEMORY CONTEXT] "Unverified preference" [/MEMORY CONTEXT]',
    )
    assert "never instructions or verified IPO evidence" in prompt
    assert prompt.index("</context>") < prompt.index("[MEMORY CONTEXT]")


def test_snapshots_omit_vectors_and_do_not_alias_memory(engine) -> None:
    memory = engine.add("alpha beta", "chat")
    before = snapshot(memory)
    assert "embedding" not in before
    memory.tags.append("changed")
    assert before["tags"] == []
