from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps.auth import get_current_user
from app.models import NewsStory, NewsTopic, NewsWatchlistEntry, User
from app.schemas.news import (
    MostReadOut,
    NewsConceptOut,
    NewsFeedOut,
    NewsSourceOut,
    NewsStoryOut,
    WatchlistEntryOut,
)

router = APIRouter(prefix="/news", tags=["news"])


@router.get("", response_model=NewsFeedOut)
async def news_feed(
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> NewsFeedOut:
    """Serve the clustered IPO news feed that backs the dashboard News tab."""
    stories = (
        (await session.execute(select(NewsStory).order_by(NewsStory.rank)))
        .scalars()
        .all()
    )
    watchlist = (
        (
            await session.execute(
                select(NewsWatchlistEntry).order_by(NewsWatchlistEntry.rank)
            )
        )
        .scalars()
        .all()
    )
    topics = (
        (await session.execute(select(NewsTopic).order_by(NewsTopic.rank)))
        .scalars()
        .all()
    )

    most_read = sorted(
        (story for story in stories if story.most_read_rank is not None),
        key=lambda story: story.most_read_rank or 0,
    )

    return NewsFeedOut(
        stories=[
            NewsStoryOut(
                id=story.id,
                category=story.category,
                headline=story.headline,
                deck=story.deck,
                digest=story.digest,
                sentiment=story.sentiment,
                concept=NewsConceptOut(
                    term=story.concept_term, explanation=story.concept_explanation
                ),
                company=story.company,
                ticker=story.ticker,
                emoji=story.emoji,
                sources=story.sources,
                publishedAgo=story.published_ago,
                readingTime=story.reading_time,
                topics=story.topics,
            )
            for story in stories
        ],
        most_read=[
            MostReadOut(id=story.id, reads=story.reads_label or "")
            for story in most_read
        ],
        trending_topics=[topic.label for topic in topics],
        watchlist=[
            WatchlistEntryOut(
                company=entry.company,
                ticker=entry.ticker,
                date=entry.listing_date,
                status=entry.status,
                emoji=entry.emoji,
            )
            for entry in watchlist
        ],
    )
