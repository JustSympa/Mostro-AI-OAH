from __future__ import annotations

from app.models import Document, IPO, SourceRegistry
from app.services.source_registry import SOURCE_CATALOG, build_source_record


def test_ipo_supports_sector_classification() -> None:
    assert {"sector", "industry"} <= set(IPO.__table__.columns.keys())
    assert IPO.__table__.columns["sector"].nullable
    assert IPO.__table__.columns["industry"].nullable


def test_documents_keep_source_provenance() -> None:
    columns = Document.__table__.columns
    assert {"source_url", "publisher", "source_type", "published_at", "retrieved_at"} <= set(
        columns.keys()
    )
    assert columns["source_type"].nullable is False
    assert columns["source_type"].server_default is not None
    assert columns["source_url"].nullable
    assert columns["published_at"].nullable
    assert columns["retrieved_at"].nullable


def test_source_registry_matches_sector_and_claim_type() -> None:
    source = SourceRegistry(
        name="Nigerian communications regulator",
        domain="ncc.gov.ng",
        url_prefix="https://www.ncc.gov.ng/reports/",
        source_type="regulator",
        evidence_role="primary",
        sector_tags=["telecommunications"],
        claim_type_tags=["subscriber_growth", "market_share"],
        is_active=True,
    )

    assert source.matches(sector="Telecommunications", claim_type="market_share")
    assert not source.matches(sector="banking", claim_type="market_share")
    assert not source.matches(sector="telecommunications", claim_type="earnings")


def test_inactive_source_never_matches() -> None:
    source = SourceRegistry(
        name="Unreviewed source",
        domain="example.ng",
        url_prefix="https://example.ng/",
        source_type="other",
        evidence_role="context",
        sector_tags=["*"],
        claim_type_tags=["*"],
        is_active=False,
    )
    assert not source.matches(sector="banking", claim_type="revenue")


def test_catalog_is_manual_and_inactive_until_reviewed() -> None:
    assert SOURCE_CATALOG
    for definition in SOURCE_CATALOG:
        source = build_source_record(definition)
        assert source.access_mode == "manual"
        assert source.is_active is False
        assert source.reviewed_at is None


def test_catalog_scopes_petroleum_and_telecom_sources_by_sector() -> None:
    definitions = {definition.name: definition for definition in SOURCE_CATALOG}
    ncc = build_source_record(definitions["Nigerian Communications Commission"])
    nuprc = build_source_record(
        definitions["Nigerian Upstream Petroleum Regulatory Commission"]
    )
    ncc.is_active = True
    nuprc.is_active = True

    assert ncc.matches(sector="telecommunications", claim_type="market_share")
    assert not ncc.matches(sector="oil_and_gas", claim_type="market_share")
    assert nuprc.matches(sector="oil_and_gas", claim_type="reserves")
    assert not nuprc.matches(sector="technology", claim_type="reserves")


def test_catalog_core_sources_apply_across_sectors() -> None:
    definitions = {definition.name: definition for definition in SOURCE_CATALOG}
    ngx = build_source_record(definitions["Nigerian Exchange"])
    ngx.is_active = True

    assert ngx.matches(sector="banking", claim_type="financial_results")
    assert ngx.matches(sector="telecommunications", claim_type="corporate_actions")