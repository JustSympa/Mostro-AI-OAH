"use client";

import { apiFetch } from "./auth";

// =========================================================================
//  IPO NEWS DATA MODEL
//  Google-News-style clustered coverage, re-focused on the IPO lifecycle.
//  Stories are served by `GET /news`; only presentation metadata lives here.
// =========================================================================

export type IpoNewsCategory =
  | "upcoming"
  | "priced"
  | "filing"
  | "valuation"
  | "underwriters"
  | "lockup"
  | "macro";

export type NewsSentiment = "Bullish" | "Bearish" | "Neutral";

export interface NewsSource {
  name: string;
  domain: string;
  timeAgo: string;
}

export interface NewsStory {
  id: string;
  category: IpoNewsCategory;
  headline: string;
  deck: string;
  /** 30-second AI digest — scannable bullets. */
  digest: string[];
  sentiment: NewsSentiment;
  /** Educational concept callout surfaced with every story. */
  concept: { term: string; explanation: string };
  company: string;
  ticker: string;
  emoji: string;
  /** Clustered coverage — the first entry is the lead publisher. */
  sources: NewsSource[];
  publishedAgo: string;
  readingTime: string;
  topics: string[];
}

export interface CategoryMeta {
  id: IpoNewsCategory;
  label: string;
  /** Tailwind classes for the story's category chip. */
  chip: string;
  /** Accent token used for rails and medallions. */
  accent: string;
}

export interface WatchlistEntry {
  company: string;
  ticker: string;
  date: string;
  status: string;
  emoji: string;
}

export interface MostReadEntry {
  id: string;
  reads: string;
}

/** Everything the News tab renders, returned by a single `GET /news` call. */
export interface NewsFeed {
  stories: NewsStory[];
  mostRead: MostReadEntry[];
  trendingTopics: string[];
  watchlist: WatchlistEntry[];
}

/** Wire shape of `GET /news` — wrapper keys are snake_case on the server. */
interface NewsFeedResponse {
  stories: NewsStory[];
  most_read: MostReadEntry[];
  trending_topics: string[];
  watchlist: WatchlistEntry[];
}

export const CATEGORY_META: Record<IpoNewsCategory, CategoryMeta> = {
  upcoming: {
    id: "upcoming",
    label: "Upcoming Debut",
    chip: "bg-[#FAF6ED] text-[#8A6A00] border-[#D4AF37]/40",
    accent: "#D4AF37",
  },
  priced: {
    id: "priced",
    label: "Priced & Trading",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accent: "#059669",
  },
  filing: {
    id: "filing",
    label: "S-1 Filing",
    chip: "bg-[#EEF0FA] text-[#1E2568] border-[#1E2568]/20",
    accent: "#1E2568",
  },
  valuation: {
    id: "valuation",
    label: "Valuation",
    chip: "bg-purple-50 text-purple-700 border-purple-200",
    accent: "#7E22CE",
  },
  underwriters: {
    id: "underwriters",
    label: "Underwriting",
    chip: "bg-slate-100 text-slate-700 border-slate-200",
    accent: "#475569",
  },
  lockup: {
    id: "lockup",
    label: "Lockup Expiry",
    chip: "bg-orange-50 text-orange-700 border-orange-200",
    accent: "#C2410C",
  },
  macro: {
    id: "macro",
    label: "Macro & Rates",
    chip: "bg-neutral-100 text-neutral-600 border-neutral-200",
    accent: "#525252",
  },
};

export const SENTIMENT_STYLES: Record<NewsSentiment, string> = {
  Bullish: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Bearish: "bg-rose-50 text-rose-700 border-rose-200",
  Neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

/**
 * Topic rail shown above the feed. `all` is the default lens; `for-you`
 * re-ranks by the reader's calibrated risk interests.
 */
export const TOPIC_TABS: { id: string; label: string }[] = [
  { id: "all", label: "Top Stories" },
  { id: "for-you", label: "For You" },
  { id: "upcoming", label: "Upcoming Debuts" },
  { id: "priced", label: "Priced & Trading" },
  { id: "filing", label: "S-1 Filings" },
  { id: "valuation", label: "Valuation" },
  { id: "underwriters", label: "Underwriting" },
  { id: "lockup", label: "Lockup Expiry" },
  { id: "macro", label: "Macro & Rates" },
];

/** Maps a calibrated risk archetype to the topics the reader cares about. */
export function interestsFor(riskLabel?: string | null): string[] {
  const label = (riskLabel || "").toLowerCase();
  if (label.includes("conserv")) {
    return ["Macro", "Blue Chip", "Dividend", "Rates"];
  }
  if (label.includes("aggress")) {
    return ["AI", "Semiconductors", "Fintech", "High Growth", "Venture"];
  }
  if (label.includes("speculat")) {
    return ["AI", "Semiconductors", "Venture", "Crypto"];
  }
  return ["Fintech", "Payments", "Enterprise Software", "AI"];
}

/** Load the clustered IPO feed backing the dashboard News tab. */
export async function fetchNews(): Promise<NewsFeed> {
  const res = await apiFetch("/news");
  if (!res.ok) {
    throw new Error(`Could not load the IPO news feed (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as NewsFeedResponse;
  return {
    stories: data.stories,
    mostRead: data.most_read,
    trendingTopics: data.trending_topics,
    watchlist: data.watchlist,
  };
}
