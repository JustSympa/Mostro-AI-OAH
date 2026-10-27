from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

NEWS_CATEGORIES = (
    "upcoming",
    "priced",
    "filing",
    "valuation",
    "underwriters",
    "lockup",
    "macro",
)

NEWS_SENTIMENTS = ("Bullish", "Bearish", "Neutral")


class NewsStory(Base):
    """One clustered news story backing the dashboard News tab.

    Field names mirror the frontend `NewsStory` interface so the API can serve
    the feed without a translation layer; nested lists live in JSONB because
    they are always read as a whole.
    """

    __tablename__ = "news_stories"
    __table_args__ = (
        CheckConstraint(
            "category IN ("
            + ", ".join(f"'{value}'" for value in NEWS_CATEGORIES)
            + ")",
            name="news_story_category",
        ),
        CheckConstraint(
            "sentiment IN (" + ", ".join(f"'{value}'" for value in NEWS_SENTIMENTS) + ")",
            name="news_story_sentiment",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    headline: Mapped[str] = mapped_column(String(500), nullable=False)
    deck: Mapped[str] = mapped_column(Text, nullable=False)
    digest: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    sentiment: Mapped[str] = mapped_column(String(16), nullable=False)
    concept_term: Mapped[str] = mapped_column(String(120), nullable=False)
    concept_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    ticker: Mapped[str] = mapped_column(String(64), nullable=False)
    emoji: Mapped[str] = mapped_column(String(16), nullable=False)
    sources: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    published_ago: Mapped[str] = mapped_column(String(32), nullable=False)
    reading_time: Mapped[str] = mapped_column(String(32), nullable=False)
    topics: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    # Feed position; smaller sorts first.
    rank: Mapped[int] = mapped_column(Integer, nullable=False)

    # Populated only for stories that appear in the "Most Read" rail.
    most_read_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reads_label: Mapped[str | None] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class NewsWatchlistEntry(Base):
    """An issuer on the News tab's IPO watchlist rail."""

    __tablename__ = "news_watchlist"

    ticker: Mapped[str] = mapped_column(String(32), primary_key=True)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    listing_date: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    emoji: Mapped[str] = mapped_column(String(16), nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)


class NewsTopic(Base):
    """A trending tag surfaced on the News tab, ordered by engagement."""

    __tablename__ = "news_topics"

    label: Mapped[str] = mapped_column(String(80), primary_key=True)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
