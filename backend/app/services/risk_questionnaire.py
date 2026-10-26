"""Versioned investor risk questionnaire definitions.

Stored as code constants rather than DB rows: every change to wording, scores,
weights, or thresholds goes through code review and the test suite, each stored
profile records the version it was scored against, and retired versions stay in
QUESTIONNAIRES so any historical result can be recomputed exactly.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class Section(StrEnum):
    GENERAL = "general"
    TOLERANCE = "risk_tolerance"
    CAPACITY = "risk_capacity"


RISK_LABELS: dict[int, str] = {
    1: "Conservative",
    2: "Moderately Conservative",
    3: "Moderate",
    4: "Moderately Aggressive",
    5: "Aggressive",
}
MIN_LEVEL = 1
MAX_LEVEL = 5


@dataclass(frozen=True)
class Option:
    id: str
    label: str
    score: float | None = None


@dataclass(frozen=True)
class Question:
    id: str
    section: Section
    prompt: str
    options: tuple[Option, ...]
    weight: float = 0.0

    def option(self, option_id: str) -> Option | None:
        return next((o for o in self.options if o.id == option_id), None)


@dataclass(frozen=True)
class CapLevel:
    id: str
    question_id: str
    option_ids: frozenset[str]
    max_level: int


@dataclass(frozen=True)
class ReduceLevel:
    id: str
    question_id: str
    option_ids: frozenset[str]
    by: int


ConstraintRule = CapLevel | ReduceLevel


@dataclass(frozen=True)
class Questionnaire:
    version: str
    questions: tuple[Question, ...]
    # Applied in order, after the score has been mapped to a level.
    constraints: tuple[ConstraintRule, ...]
    # (inclusive lower bound on weighted score, level), highest bound first.
    level_thresholds: tuple[tuple[float, int], ...]

    def question(self, question_id: str) -> Question | None:
        return next((q for q in self.questions if q.id == question_id), None)


TOLERANCE_WEIGHT = 2.0
CAPACITY_WEIGHT = 1.0

# Weighted score range for V1 is 8 (most cautious) to 34 (most aggressive), and
# every achievable score is even. The 14 possible values are split into five bands:
#   Level 1 Conservative             8-12
#   Level 2 Moderately Conservative 14-18
#   Level 3 Moderate                20-24
#   Level 4 Moderately Aggressive   26-28
#   Level 5 Aggressive              30-34
V1_LEVEL_THRESHOLDS: tuple[tuple[float, int], ...] = (
    (29.0, 5),
    (25.0, 4),
    (19.0, 3),
    (14.0, 2),
    (float("-inf"), 1),
)

QUESTIONNAIRE_V1 = Questionnaire(
    version="2026-10-v1",
    questions=(
        Question(
            id="age_bracket",
            section=Section.GENERAL,
            prompt="What is your age bracket?",
            options=(
                Option("lt_25", "<25"),
                Option("25_34", "25–34"),
                Option("35_44", "35–44"),
                Option("45_54", "45–54"),
                Option("55_64", "55–64"),
                Option("65_plus", "65+"),
            ),
        ),
        Question(
            id="investment_horizon",
            section=Section.GENERAL,
            prompt="What is your investment horizon?",
            options=(
                Option("lt_1y", "<1 year"),
                Option("1_3y", "1–3 years"),
                Option("3_5y", "3–5 years"),
                Option("5_10y", "5–10 years"),
                Option("10y_plus", "10+ years"),
            ),
        ),
        Question(
            id="savings_share",
            section=Section.GENERAL,
            prompt="What share of your total savings is this investment?",
            options=(
                Option("lt_10", "<10%"),
                Option("10_25", "10–25%"),
                Option("25_50", "25–50%"),
                Option("gt_50", ">50%"),
            ),
        ),
        Question(
            id="drawdown_reaction",
            section=Section.TOLERANCE,
            prompt=(
                "The stock market falls 31% in three months. You hold an investment "
                "that lost 31%. What do you do?"
            ),
            options=(
                Option("sell_all", "Sell all", 1),
                Option("sell_some", "Sell some", 2),
                Option("hold", "Hold", 3),
                Option("buy_more", "Buy more", 4),
            ),
            weight=TOLERANCE_WEIGHT,
        ),
        Question(
            id="return_tradeoff",
            section=Section.TOLERANCE,
            prompt=(
                "Choose between: (A) 20% expected return with 5% loss risk, or "
                "(B) 50% expected return with 15% loss risk."
            ),
            options=(
                Option("a", "A", 1),
                Option("b", "B", 3),
            ),
            weight=TOLERANCE_WEIGHT * 2,
        ),
        Question(
            id="loss_tolerance",
            section=Section.TOLERANCE,
            prompt="How much loss can you tolerate in a year?",
            options=(
                Option("none", "None", 1),
                Option("up_to_5", "Up to 5%", 2),
                Option("up_to_15", "Up to 15%", 3),
                Option("up_to_30", "Up to 30%", 4),
                Option("over_30", "More than 30%", 5),
            ),
            weight=TOLERANCE_WEIGHT,
        ),
        Question(
            id="emergency_fund",
            section=Section.CAPACITY,
            prompt="Do you have an emergency fund covering 6+ months of expenses?",
            options=(
                Option("yes", "Yes", 2),
                Option("no", "No", 0),
            ),
            weight=CAPACITY_WEIGHT,
        ),
        Question(
            id="near_term_withdrawal",
            section=Section.CAPACITY,
            prompt="Will you need to withdraw this money within 2 years?",
            options=(
                Option("yes", "Yes", 0),
                Option("no", "No", 2),
            ),
            weight=CAPACITY_WEIGHT,
        ),
    ),
    constraints=(
        CapLevel("short_horizon_cap", "investment_horizon", frozenset({"lt_1y"}), max_level=2),
        CapLevel("near_term_withdrawal_cap", "near_term_withdrawal", frozenset({"yes"}), max_level=2),
        ReduceLevel("savings_concentration_reduction", "savings_share", frozenset({"gt_50"}), by=1),
    ),
    level_thresholds=V1_LEVEL_THRESHOLDS,
)

QUESTIONNAIRES: dict[str, Questionnaire] = {QUESTIONNAIRE_V1.version: QUESTIONNAIRE_V1}
ACTIVE_QUESTIONNAIRE = QUESTIONNAIRE_V1
