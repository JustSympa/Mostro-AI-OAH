from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import GlossaryTerm, RiskProfile, User, UserKnowledgeState


async def build_education_context(
    session: AsyncSession, user_id: uuid.UUID
) -> tuple[str, dict[str, Any]]:
    user = await session.get(User, user_id)
    profile = (
        await session.execute(
            select(RiskProfile)
            .where(RiskProfile.user_id == user_id)
            .order_by(RiskProfile.version.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    knowledge_rows = (
        await session.execute(
            select(UserKnowledgeState, GlossaryTerm)
            .join(GlossaryTerm, GlossaryTerm.id == UserKnowledgeState.glossary_term_id)
            .where(UserKnowledgeState.user_id == user_id)
        )
    ).all()

    profile_data: dict[str, Any] = {
        "preferred_language": user.preferred_language if user else "en",
        "risk_profile": None,
        "knowledge": [
            {
                "term": term.term,
                "mastery_level": state.mastery_level,
                "definition": term.simple_explanation,
            }
            for state, term in knowledge_rows
        ],
    }
    if profile is not None:
        profile_data["risk_profile"] = {
            "risk_level": profile.risk_level,
            "risk_label": profile.risk_label,
            "applied_constraints": profile.applied_constraints,
        }

    context = (
        "User learning context (use only to tailor explanations; do not infer financial suitability):\n"
        f"{profile_data}"
    )
    return context, profile_data