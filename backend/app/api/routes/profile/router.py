from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limiter import limiter
from app.db.session import get_db
from app.deps.auth import get_current_user
from app.models import User
from app.schemas.risk_profile import QuestionnaireOut, RiskProfileOut, RiskSubmitIn
from app.services import risk_profile as risk_service
from app.services.risk_questionnaire import ACTIVE_QUESTIONNAIRE

router = APIRouter(prefix="/profile", tags=["risk-profile"])


@router.get("/questionnaire", response_model=QuestionnaireOut)
async def get_questionnaire(_user: User = Depends(get_current_user)) -> QuestionnaireOut:
    return QuestionnaireOut.from_definition(ACTIVE_QUESTIONNAIRE)


@router.post("/submit", response_model=RiskProfileOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def submit(
    request: Request,
    response: Response,
    payload: RiskSubmitIn,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RiskProfileOut:
    profile = await risk_service.record_assessment(
        session,
        user=user,
        questionnaire_version=payload.questionnaire_version,
        answers=payload.answers,
        reassess=False,
        request=request,
    )
    return RiskProfileOut.from_model(profile)


@router.post("/reassess", response_model=RiskProfileOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def reassess(
    request: Request,
    response: Response,
    payload: RiskSubmitIn,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RiskProfileOut:
    profile = await risk_service.record_assessment(
        session,
        user=user,
        questionnaire_version=payload.questionnaire_version,
        answers=payload.answers,
        reassess=True,
        request=request,
    )
    return RiskProfileOut.from_model(profile)


@router.get("/me", response_model=RiskProfileOut)
async def me(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RiskProfileOut:
    profile = await risk_service.latest_profile(session, user.id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No risk profile yet.")
    return RiskProfileOut.from_model(profile)
