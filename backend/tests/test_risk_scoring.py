from __future__ import annotations

import pytest

from app.services.risk_questionnaire import QUESTIONNAIRE_V1, QUESTIONNAIRES, Section
from app.services.risk_scoring import InvalidAnswers, level_for_score, score_answers

AGGRESSIVE = {
    "age_bracket": "25_34",
    "investment_horizon": "10y_plus",
    "savings_share": "lt_10",
    "drawdown_reaction": "buy_more",
    "return_tradeoff": "b",
    "loss_tolerance": "over_30",
    "emergency_fund": "yes",
    "near_term_withdrawal": "no",
}
CAUTIOUS = {
    "age_bracket": "65_plus",
    "investment_horizon": "3_5y",
    "savings_share": "lt_10",
    "drawdown_reaction": "sell_all",
    "return_tradeoff": "a",
    "loss_tolerance": "none",
    "emergency_fund": "no",
    "near_term_withdrawal": "no",
}


def test_most_aggressive_answers_reach_level_5() -> None:
    result = score_answers(QUESTIONNAIRE_V1, AGGRESSIVE)
    assert result.raw_score == 16
    assert result.weighted_score == 34
    assert (result.risk_level, result.risk_label) == (5, "Aggressive")
    assert result.applied_constraints == ()


def test_most_cautious_answers_are_level_1() -> None:
    result = score_answers(QUESTIONNAIRE_V1, CAUTIOUS)
    assert result.weighted_score == 10
    assert result.risk_level == 1


def test_contributions_are_auditable_and_weighted() -> None:
    by_question = {c.question_id: c for c in score_answers(QUESTIONNAIRE_V1, AGGRESSIVE).contributions}
    assert len(by_question) == len(QUESTIONNAIRE_V1.questions)
    assert by_question["return_tradeoff"].weight == 2 * by_question["drawdown_reaction"].weight
    assert by_question["return_tradeoff"].contribution == 12
    assert by_question["emergency_fund"].contribution == 2
    assert by_question["age_bracket"].option_score is None
    assert by_question["age_bracket"].contribution == 0


def test_tolerance_outweighs_capacity() -> None:
    weights = {q.section: q.weight for q in QUESTIONNAIRE_V1.questions if q.id != "return_tradeoff"}
    assert weights[Section.TOLERANCE] > weights[Section.CAPACITY] > weights[Section.GENERAL]


@pytest.mark.parametrize(
    ("score", "level"),
    [(8, 1), (12, 1), (14, 2), (18, 2), (20, 3), (24, 3), (26, 4), (28, 4), (30, 5), (34, 5)],
)
def test_level_thresholds(score: float, level: int) -> None:
    assert level_for_score(QUESTIONNAIRE_V1, score) == level


def test_short_horizon_caps_level_at_2() -> None:
    result = score_answers(QUESTIONNAIRE_V1, AGGRESSIVE | {"investment_horizon": "lt_1y"})
    assert result.base_level == 5
    assert result.risk_level == 2
    assert result.applied_constraints == ("short_horizon_cap",)


def test_near_term_withdrawal_caps_level_at_2() -> None:
    result = score_answers(QUESTIONNAIRE_V1, AGGRESSIVE | {"near_term_withdrawal": "yes"})
    assert result.base_level == 5
    assert result.risk_level == 2
    assert result.applied_constraints == ("near_term_withdrawal_cap",)


def test_savings_concentration_reduces_level_by_one() -> None:
    result = score_answers(QUESTIONNAIRE_V1, AGGRESSIVE | {"savings_share": "gt_50"})
    assert result.risk_level == 4
    assert result.applied_constraints == ("savings_concentration_reduction",)


def test_reduction_floors_at_level_1() -> None:
    result = score_answers(QUESTIONNAIRE_V1, CAUTIOUS | {"savings_share": "gt_50"})
    assert result.risk_level == 1


def test_cap_then_reduction_combine() -> None:
    answers = AGGRESSIVE | {"investment_horizon": "lt_1y", "savings_share": "gt_50"}
    result = score_answers(QUESTIONNAIRE_V1, answers)
    assert result.risk_level == 1
    assert result.applied_constraints == ("short_horizon_cap", "savings_concentration_reduction")


@pytest.mark.parametrize(
    ("answers", "expected_error"),
    [
        ({k: v for k, v in AGGRESSIVE.items() if k != "loss_tolerance"}, "missing answer: loss_tolerance"),
        (AGGRESSIVE | {"bogus": "x"}, "unknown question: bogus"),
        (AGGRESSIVE | {"return_tradeoff": "c"}, "invalid option for return_tradeoff"),
    ],
)
def test_invalid_answers_rejected(answers: dict[str, str], expected_error: str) -> None:
    with pytest.raises(InvalidAnswers) as exc:
        score_answers(QUESTIONNAIRE_V1, answers)
    assert expected_error in exc.value.errors


@pytest.mark.parametrize("questionnaire", list(QUESTIONNAIRES.values()))
def test_definitions_are_consistent(questionnaire) -> None:  # noqa: ANN001
    ids = [q.id for q in questionnaire.questions]
    assert len(ids) == len(set(ids))
    for question in questionnaire.questions:
        option_ids = [o.id for o in question.options]
        assert len(option_ids) == len(set(option_ids))
        scored = [o.score is not None for o in question.options]
        assert all(scored) or not any(scored)
    for rule in questionnaire.constraints:
        question = questionnaire.question(rule.question_id)
        assert question is not None
        assert rule.option_ids <= {o.id for o in question.options}
    bounds = [bound for bound, _ in questionnaire.level_thresholds]
    assert bounds == sorted(bounds, reverse=True)
    assert {level for _, level in questionnaire.level_thresholds} == {1, 2, 3, 4, 5}
