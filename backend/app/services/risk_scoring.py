from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

from app.services.risk_questionnaire import (
    MAX_LEVEL,
    MIN_LEVEL,
    RISK_LABELS,
    CapLevel,
    Questionnaire,
    ReduceLevel,
)


class InvalidAnswers(ValueError):
    def __init__(self, errors: list[str]) -> None:
        super().__init__("; ".join(errors))
        self.errors = errors


@dataclass(frozen=True)
class AnswerContribution:
    question_id: str
    option_id: str
    option_label: str
    option_score: float | None
    weight: float
    contribution: float


@dataclass(frozen=True)
class ScoreResult:
    raw_score: float
    weighted_score: float
    base_level: int
    risk_level: int
    risk_label: str
    contributions: tuple[AnswerContribution, ...]
    applied_constraints: tuple[str, ...]


def level_for_score(questionnaire: Questionnaire, weighted_score: float) -> int:
    for lower_bound, level in questionnaire.level_thresholds:
        if weighted_score >= lower_bound:
            return level
    return MIN_LEVEL


def score_answers(questionnaire: Questionnaire, answers: Mapping[str, str]) -> ScoreResult:
    expected = {q.id for q in questionnaire.questions}
    errors = [f"unknown question: {qid}" for qid in sorted(set(answers) - expected)]
    errors += [f"missing answer: {qid}" for qid in sorted(expected - set(answers))]

    contributions: list[AnswerContribution] = []
    for question in questionnaire.questions:
        if question.id not in answers:
            continue
        option = question.option(answers[question.id])
        if option is None:
            errors.append(f"invalid option for {question.id}")
            continue
        contribution = (option.score or 0.0) * question.weight
        contributions.append(
            AnswerContribution(
                question_id=question.id,
                option_id=option.id,
                option_label=option.label,
                option_score=option.score,
                weight=question.weight,
                contribution=contribution,
            )
        )
    if errors:
        raise InvalidAnswers(errors)

    raw_score = sum(c.option_score or 0.0 for c in contributions)
    weighted_score = sum(c.contribution for c in contributions)
    base_level = level_for_score(questionnaire, weighted_score)

    level = base_level
    applied: list[str] = []
    for rule in questionnaire.constraints:
        if answers[rule.question_id] not in rule.option_ids:
            continue
        if isinstance(rule, CapLevel):
            level = min(level, rule.max_level)
        elif isinstance(rule, ReduceLevel):
            level = level - rule.by
        level = max(MIN_LEVEL, min(MAX_LEVEL, level))
        applied.append(rule.id)

    return ScoreResult(
        raw_score=raw_score,
        weighted_score=weighted_score,
        base_level=base_level,
        risk_level=level,
        risk_label=RISK_LABELS[level],
        contributions=tuple(contributions),
        applied_constraints=tuple(applied),
    )
