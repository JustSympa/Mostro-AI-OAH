from __future__ import annotations

from httpx import AsyncClient
from sqlalchemy import select

from app.db.session import get_session_factory
from app.models import AuditLog, RiskProfile, RiskProfileAnswer
from app.services.risk_questionnaire import ACTIVE_QUESTIONNAIRE
from tests.conftest import unique_email
from tests.helpers import auth_header, register_and_login
from tests.test_risk_scoring import AGGRESSIVE, CAUTIOUS


def _payload(answers: dict[str, str]) -> dict[str, object]:
    return {"questionnaire_version": ACTIVE_QUESTIONNAIRE.version, "answers": answers}


async def test_questionnaire_hides_scores(client: AsyncClient) -> None:
    token = await register_and_login(client, unique_email("risk-q"))
    resp = await client.get("/profile/questionnaire", headers=auth_header(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["version"] == ACTIVE_QUESTIONNAIRE.version
    assert len(body["questions"]) == 8
    for question in body["questions"]:
        assert "weight" not in question
        for option in question["options"]:
            assert set(option) == {"id", "label"}


async def test_profile_endpoints_require_auth(client: AsyncClient) -> None:
    assert (await client.get("/profile/questionnaire")).status_code == 401
    assert (await client.get("/profile/me")).status_code == 401
    assert (await client.post("/profile/submit", json=_payload(AGGRESSIVE))).status_code == 401


async def test_submit_persists_auditable_result(client: AsyncClient) -> None:
    token = await register_and_login(client, unique_email("risk-submit"))
    assert (await client.get("/profile/me", headers=auth_header(token))).status_code == 404

    resp = await client.post("/profile/submit", headers=auth_header(token), json=_payload(AGGRESSIVE))
    assert resp.status_code == 201
    body = resp.json()
    assert (body["version"], body["risk_level"], body["risk_label"]) == (1, 5, "Aggressive")
    assert body["weighted_score"] == 34

    me = await client.get("/profile/me", headers=auth_header(token))
    assert me.status_code == 200
    assert me.json()["risk_level"] == 5
    assert me.json()["completed_at"]

    async with get_session_factory()() as session:
        profile = (await session.execute(select(RiskProfile))).scalar_one()
        assert profile.answers == AGGRESSIVE
        rows = (
            await session.execute(
                select(RiskProfileAnswer).where(RiskProfileAnswer.risk_profile_id == profile.id)
            )
        ).scalars().all()
        assert {r.question_id: r.option_id for r in rows} == AGGRESSIVE
        assert sum(r.contribution for r in rows) == profile.weighted_score
        events = (await session.execute(select(AuditLog.event))).scalars().all()
        assert "risk_profile_submitted" in events


async def test_submit_twice_rejected_and_reassess_keeps_history(client: AsyncClient) -> None:
    token = await register_and_login(client, unique_email("risk-reassess"))
    headers = auth_header(token)
    assert (await client.post("/profile/submit", headers=headers, json=_payload(AGGRESSIVE))).status_code == 201
    assert (await client.post("/profile/submit", headers=headers, json=_payload(CAUTIOUS))).status_code == 409

    again = await client.post("/profile/reassess", headers=headers, json=_payload(CAUTIOUS))
    assert again.status_code == 201
    assert (again.json()["version"], again.json()["risk_level"]) == (2, 1)

    me = await client.get("/profile/me", headers=headers)
    assert (me.json()["version"], me.json()["risk_level"]) == (2, 1)

    async with get_session_factory()() as session:
        versions = (
            await session.execute(select(RiskProfile.version).order_by(RiskProfile.version))
        ).scalars().all()
    assert versions == [1, 2]


async def test_reassess_without_profile_rejected(client: AsyncClient) -> None:
    token = await register_and_login(client, unique_email("risk-noprofile"))
    resp = await client.post("/profile/reassess", headers=auth_header(token), json=_payload(AGGRESSIVE))
    assert resp.status_code == 409


async def test_constraint_applied_through_api(client: AsyncClient) -> None:
    token = await register_and_login(client, unique_email("risk-cap"))
    answers = AGGRESSIVE | {"investment_horizon": "lt_1y"}
    resp = await client.post("/profile/submit", headers=auth_header(token), json=_payload(answers))
    assert resp.status_code == 201
    assert resp.json()["risk_level"] == 2
    assert resp.json()["applied_constraints"] == ["short_horizon_cap"]


async def test_invalid_answers_and_stale_version_rejected(client: AsyncClient) -> None:
    token = await register_and_login(client, unique_email("risk-invalid"))
    headers = auth_header(token)
    bad_option = await client.post(
        "/profile/submit", headers=headers, json=_payload(AGGRESSIVE | {"return_tradeoff": "c"})
    )
    assert bad_option.status_code == 422

    stale = await client.post(
        "/profile/submit",
        headers=headers,
        json={"questionnaire_version": "1999-01-v0", "answers": AGGRESSIVE},
    )
    assert stale.status_code == 409
    assert (await client.get("/profile/me", headers=headers)).status_code == 404
