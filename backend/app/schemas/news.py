from __future__ import annotations

from pydantic import BaseModel


class NewsSourceOut(BaseModel):
    name: str
    domain: str
    timeAgo: str


class NewsConceptOut(BaseModel):
    term: str
    explanation: str


class NewsStoryOut(BaseModel):
    id: str
    category: str
    headline: str
    deck: str
    digest: list[str]
    sentiment: str
    concept: NewsConceptOut
    company: str
    ticker: str
    emoji: str
    sources: list[NewsSourceOut]
    publishedAgo: str
    readingTime: str
    topics: list[str]


class MostReadOut(BaseModel):
    id: str
    reads: str


class WatchlistEntryOut(BaseModel):
    company: str
    ticker: str
    date: str
    status: str
    emoji: str


class NewsFeedOut(BaseModel):
    """Everything the News tab renders, served in one round trip."""

    stories: list[NewsStoryOut]
    most_read: list[MostReadOut]
    trending_topics: list[str]
    watchlist: list[WatchlistEntryOut]
