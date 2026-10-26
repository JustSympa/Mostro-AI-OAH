from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RiskProfile, RiskProfileAnswer, User
from app.services.audit import write_audit
from app.services.risk_questionnaire import ACTIVE_QUESTIONNAIRE
from app.services.risk_scoring import InvalidAnswers, score_answers


async def latest_profile(session: AsyncSession, user_id: uuid.UUID) -> RiskProfile | None:
    return (
        await session.execute(
            select(RiskProfile)
            .where(RiskProfile.user_id == user_id)
            .order_by(RiskProfile.version.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


async def record_assessment(
    session: AsyncSession,
    *,
    user: User,
    questionnaire_version: str,
    answers: dict[str, str],
    reassess: bool,
    request: Request,
) -> RiskProfile:
    if questionnaire_version != ACTIVE_QUESTIONNAIRE.version:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Questionnaire version is outdated. Fetch /profile/questionnaire again.",
        )
    try:
        result = score_answers(ACTIVE_QUESTIONNAIRE, answers)
    except InvalidAnswers as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors) from None

    previous = await latest_profile(session, user.id)
    if reassess and previous is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="No risk profile yet. Use /profile/submit."
        )
    if not reassess and previous is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Risk profile already exists. Use /profile/reassess.",
        )

    profile = RiskProfile(
        user_id=user.id,
        version=1 if previous is None else previous.version + 1,
        questionnaire_version=ACTIVE_QUESTIONNAIRE.version,
        risk_level=result.risk_level,
        risk_label=result.risk_label,
        raw_score=result.raw_score,
        weighted_score=result.weighted_score,
        answers=dict(answers),
        applied_constraints=list(result.applied_constraints),
        created_at=datetime.now(UTC),
        contributions=[
            RiskProfileAnswer(
                question_id=c.question_id,
                option_id=c.option_id,
                option_label=c.option_label,
                option_score=c.option_score,
                weight=c.weight,
                contribution=c.contribution,
            )
            for c in result.contributions
        ],
    )
    session.add(profile)
    try:
        await session.flush()
    except IntegrityError:
        # Concurrent submission claimed the same (user_id, version).
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Concurrent assessment detected. Retry."
        ) from None

    await write_audit(
        session,
        event="risk_profile_reassessed" if reassess else "risk_profile_submitted",
        request=request,
        user_id=user.id,
        metadata={
            "risk_profile_id": str(profile.id),
            "version": profile.version,
            "questionnaire_version": profile.questionnaire_version,
            "base_level": result.base_level,
            "risk_level": result.risk_level,
            "applied_constraints": list(result.applied_constraints),
        },
    )
    return profile
