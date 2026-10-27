"""JSON bridge used only by the upstream TypeScript conformance runner."""

from __future__ import annotations

import asyncio
import json
import sys
from typing import Any

from app.memory.engine import HMem
from app.memory.types import MemoryState, Provenance, Shape, SleepPlan


def encode(value: Any) -> Any:
    if isinstance(value, Shape):
        return value.model_dump(mode="json", by_alias=True)
    if isinstance(value, list):
        return [encode(item) for item in value]
    return value


def invoke(engine: HMem, method: str, args: list[Any]) -> Any:
    if method == "add":
        data = args[0]
        fields = {
            "chatId": "chat_id", "missionId": "mission_id", "goalRunId": "goal_run_id",
            "derivedFrom": "derived_from",
        }
        data = {fields.get(key, key): value for key, value in data.items() if value is not None}
        if "provenance" in data:
            data["provenance"] = Provenance.model_validate(data["provenance"])
        return engine.add(**data)
    if method == "query":
        options = args[1] if len(args) > 1 and args[1] else {}
        fields = {"topN": "top_n", "chatId": "chat_id"}
        return engine.query(args[0], **{fields.get(key, key): value for key, value in options.items()})
    if method == "feedback":
        return engine.feedback(*args)
    if method == "mine":
        options = args[2] if len(args) > 2 and args[2] else {}
        return asyncio.run(engine.mine(args[0], args[1], chat_id=options.get("chatId")))
    if method == "scan":
        return engine.scan_conflicts()
    if method == "autoResolve":
        return engine.auto_resolve(args[0]["id"])
    if method == "dream":
        return engine.dream()
    if method == "approve":
        return engine.review_proposal(args[0], True)
    if method == "reject":
        return engine.review_proposal(args[0], False)
    if method == "preview":
        return engine.sleep_preview()
    if method == "execute":
        return engine.sleep_execute(SleepPlan.model_validate(args[0]) if args and args[0] else None)
    if method == "restore":
        return engine.restore(args[0])
    raise ValueError(f"Unknown conformance operation: {method}")


def main() -> None:
    request = json.load(sys.stdin)
    engine = HMem(
        MemoryState.model_validate(request.get("state") or {}), clock=lambda: request["now"]
    )
    result = invoke(engine, request["method"], request["args"])
    json.dump({
        "result": encode(result), "state": encode(engine.state),
        "ledger": request.get("ledger", []) + encode(engine.ledger),
    }, sys.stdout, allow_nan=False)


if __name__ == "__main__":
    main()
