from __future__ import annotations

import uuid
from typing import Any

from app.services.agent_data import ZetarisAgentData


async def build_education_context(
    data: ZetarisAgentData, user_id: uuid.UUID
) -> tuple[str, dict[str, Any]]:
    profile = await data.learning_profile(user_id)
    knowledge_rows = await data.knowledge(user_id)

    profile_data: dict[str, Any] = {
        "preferred_language": profile.preferred_language,
        "risk_profile": None,
        "knowledge": [
            {
                "term": item.term,
                "mastery_level": item.mastery_level,
                "definition": item.definition,
            }
            for item in knowledge_rows
        ],
    }
    if profile.risk_level is not None:
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