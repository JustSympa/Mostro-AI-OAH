from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SourceRegistry


@dataclass(frozen=True)
class SourceDefinition:
    name: str
    domain: str
    url_prefix: str
    source_type: str
    evidence_role: str
    sector_tags: tuple[str, ...]
    claim_type_tags: tuple[str, ...]
    priority: int


SOURCE_CATALOG = (
    SourceDefinition(
        name="Nigerian Exchange",
        domain="ngxgroup.com",
        url_prefix="https://ngxgroup.com/",
        source_type="exchange",
        evidence_role="primary",
        sector_tags=("*",),
        claim_type_tags=("issuer_disclosures", "financial_results", "corporate_actions"),
        priority=100,
    ),
    SourceDefinition(
        name="Securities and Exchange Commission Nigeria",
        domain="sec.gov.ng",
        url_prefix="https://sec.gov.ng/",
        source_type="regulator",
        evidence_role="primary",
        sector_tags=("*",),
        claim_type_tags=("issuer_disclosures", "ownership", "corporate_actions"),
        priority=95,
    ),
    SourceDefinition(
        name="National Bureau of Statistics Nigeria",
        domain="nigerianstat.gov.ng",
        url_prefix="https://www.nigerianstat.gov.ng/",
        source_type="statistics",
        evidence_role="primary",
        sector_tags=("*",),
        claim_type_tags=("macro_indicators", "inflation", "gdp", "trade", "employment"),
        priority=90,
    ),
    SourceDefinition(
        name="Central Bank of Nigeria",
        domain="cbn.gov.ng",
        url_prefix="https://www.cbn.gov.ng/",
        source_type="regulator",
        evidence_role="primary",
        sector_tags=("*",),
        claim_type_tags=("monetary_policy", "exchange_rates", "interest_rates", "reserves", "credit"),
        priority=90,
    ),
    SourceDefinition(
        name="Nigerian Communications Commission",
        domain="ncc.gov.ng",
        url_prefix="https://www.ncc.gov.ng/",
        source_type="regulator",
        evidence_role="primary",
        sector_tags=("telecommunications", "technology"),
        claim_type_tags=("subscriber_growth", "market_share", "licensing", "service_quality"),
        priority=85,
    ),
    SourceDefinition(
        name="Nigerian Upstream Petroleum Regulatory Commission",
        domain="nuprc.gov.ng",
        url_prefix="https://www.nuprc.gov.ng/",
        source_type="regulator",
        evidence_role="primary",
        sector_tags=("oil_and_gas",),
        claim_type_tags=("upstream_production", "reserves", "licensing"),
        priority=85,
    ),
    SourceDefinition(
        name="Nigerian Midstream and Downstream Petroleum Regulatory Authority",
        domain="nmdpra.gov.ng",
        url_prefix="https://www.nmdpra.gov.ng/",
        source_type="regulator",
        evidence_role="primary",
        sector_tags=("oil_and_gas",),
        claim_type_tags=("refinery_capacity", "fuel_supply", "petroleum_products"),
        priority=85,
    ),
)


def build_source_record(definition: SourceDefinition) -> SourceRegistry:
    return SourceRegistry(
        name=definition.name,
        domain=definition.domain,
        url_prefix=definition.url_prefix,
        source_type=definition.source_type,
        evidence_role=definition.evidence_role,
        sector_tags=list(definition.sector_tags),
        claim_type_tags=list(definition.claim_type_tags),
        access_mode="manual",
        is_active=False,
        priority=definition.priority,
        review_notes="Verify URL, terms, and collection permissions before activation.",
    )


async def seed_source_catalog(session: AsyncSession) -> int:
    """Insert missing catalog entries without activating or overwriting reviewed sources."""
    inserted = 0
    for definition in SOURCE_CATALOG:
        existing = await session.scalar(
            select(SourceRegistry.id).where(SourceRegistry.url_prefix == definition.url_prefix)
        )
        if existing is not None:
            continue
        session.add(build_source_record(definition))
        inserted += 1
    await session.flush()
    return inserted


async def select_sources(
    session: AsyncSession, *, sector: str, claim_type: str
) -> list[SourceRegistry]:
    """Return active, reviewed sources tagged for this issuer sector and claim."""
    entries = (
        await session.execute(
            select(SourceRegistry)
            .where(SourceRegistry.is_active.is_(True))
            .order_by(SourceRegistry.priority.desc(), SourceRegistry.name)
        )
    ).scalars().all()
    return [entry for entry in entries if entry.matches(sector=sector, claim_type=claim_type)]