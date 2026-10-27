from __future__ import annotations

import pytest

from app.router.calendar import parse_fact_date
from app.router.intent import IntentRouter, Pipeline


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("Explain what an IPO is", Pipeline.EDUCATION),
        ("Add the closing date to my calendar", Pipeline.CALENDAR),
        ("What are the risks in this prospectus?", Pipeline.PROSPECTUS),
    ],
)
async def test_intent_router_classifies_common_intents(
    message: str, expected: Pipeline
) -> None:
    result = await IntentRouter().route(message)
    assert result.pipeline is expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("2026-11-15", (2026, 11, 15)),
        ("15/11/2026", (2026, 11, 15)),
        ("November 15, 2026", (2026, 11, 15)),
    ],
)
def test_parse_fact_date(value: str, expected: tuple[int, int, int]) -> None:
    parsed = parse_fact_date(value)
    assert parsed is not None
    assert (parsed.year, parsed.month, parsed.day) == expected


def test_parse_fact_date_rejects_non_date_fact() -> None:
    assert parse_fact_date("minimum subscription 10 shares") is None