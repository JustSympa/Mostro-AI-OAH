"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpRightIcon,
  BarChart3Icon,
  CalendarIcon,
  ChevronRightIcon,
  FlameIcon,
  LightbulbIcon,
  NewspaperIcon,
  SearchIcon,
  SparklesIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  XIcon,
  ZapIcon,
} from "./Icons";
import {
  CATEGORY_META,
  MOST_READ,
  SENTIMENT_STYLES,
  STORIES,
  TOPIC_TABS,
  TRENDING_TOPICS,
  WATCHLIST,
  interestsFor,
  type NewsStory,
} from "../lib/ipoNews";

interface IpoNewsHubProps {
  /** Calibrated risk archetype — powers the "For You" lens. */
  riskLabel?: string | null;
}

function monogram(domain: string): string {
  return domain.replace(/^www\./, "").charAt(0).toUpperCase();
}

function sentimentIcon(sentiment: NewsStory["sentiment"]) {
  if (sentiment === "Bullish") return <TrendingUpIcon size={13} />;
  if (sentiment === "Bearish") return <TrendingDownIcon size={13} />;
  return <BarChart3Icon size={13} />;
}

/** Compact publisher cluster — favicon monograms + "Full coverage" affordance. */
function SourceCluster({
  story,
  onExpand,
  max = 3,
}: {
  story: NewsStory;
  onExpand: () => void;
  max?: number;
}) {
  const extra = story.sources.length - max;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center -space-x-2">
        {story.sources.slice(0, max).map((source) => (
          <span
            key={source.domain}
            title={source.name}
            className="w-6 h-6 rounded-full bg-[#F8F7F4] border-2 border-white text-[10px] font-bold text-[#5F6470] flex items-center justify-center shadow-xs"
          >
            {monogram(source.domain)}
          </span>
        ))}
        {extra > 0 && (
          <span className="w-6 h-6 rounded-full bg-[#191C24] border-2 border-white text-[9px] font-bold text-white flex items-center justify-center shadow-xs">
            +{extra}
          </span>
        )}
      </div>
      <span className="text-[11px] text-[#858995] font-medium truncate">
        {story.sources[0].name}
        {story.sources.length > 1 && ` · ${story.sources.length} sources`}
      </span>
      <button
        onClick={onExpand}
        className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-[#8A6A00] hover:text-[#191C24] transition-colors cursor-pointer"
      >
        Full coverage
        <ChevronRightIcon size={12} />
      </button>
    </div>
  );
}

function StoryCard({ story, onOpen }: { story: NewsStory; onOpen: () => void }) {
  const meta = CATEGORY_META[story.category];
  return (
    <article
      onClick={onOpen}
      className="group p-5 rounded-3xl bg-white border border-[#E8E5DE] shadow-xs hover:border-[#D4AF37]/50 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${meta.chip}`}>
              {meta.label}
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${SENTIMENT_STYLES[story.sentiment]}`}>
              {sentimentIcon(story.sentiment)}
              {story.sentiment}
            </span>
          </div>
          <h3 className="text-sm sm:text-[15px] font-bold text-[#191C24] leading-snug group-hover:text-[#1E2568] transition-colors">
            {story.headline}
          </h3>
          <p className="text-xs text-[#5F6470] leading-relaxed line-clamp-2">{story.deck}</p>
        </div>
        <div
          className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border"
          style={{ backgroundColor: `${meta.accent}14`, borderColor: `${meta.accent}33` }}
        >
          {story.emoji}
        </div>
      </div>

      <div className="pt-3 border-t border-[#F0EDE6]">
        <SourceCluster story={story} max={3} onExpand={onOpen} />
      </div>
    </article>
  );
}

export function IpoNewsHub({ riskLabel }: IpoNewsHubProps) {
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState("all");
  const [openStoryId, setOpenStoryId] = useState<string | null>(null);

  const interests = useMemo(() => interestsFor(riskLabel), [riskLabel]);

  const filtered = useMemo(() => {
    let list = STORIES;
    if (activeTopic === "for-you") {
      const personalised = list.filter((story) =>
        story.topics.some((topic) => interests.includes(topic))
      );
      list = personalised.length ? personalised : list;
    } else if (activeTopic !== "all") {
      list = list.filter((story) => story.category === activeTopic);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (story) =>
          story.headline.toLowerCase().includes(q) ||
          story.company.toLowerCase().includes(q) ||
          story.ticker.toLowerCase().includes(q) ||
          story.deck.toLowerCase().includes(q) ||
          story.topics.some((topic) => topic.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeTopic, query, interests]);

  const openStory = openStoryId
    ? STORIES.find((story) => story.id === openStoryId) ?? null
    : null;

  const related = openStory
    ? STORIES.filter(
        (story) =>
          story.id !== openStory.id &&
          (story.category === openStory.category ||
            story.topics.some((topic) => openStory.topics.includes(topic)))
      ).slice(0, 3)
    : [];

  const lead = filtered[0] ?? null;
  const rest = filtered.slice(1);
  const mostRead = MOST_READ.map((entry) => ({
    ...entry,
    story: STORIES.find((story) => story.id === entry.id),
  })).filter((entry) => entry.story);

  return (
    <div className="space-y-6">
      {/* ════════════════ SEARCH & PERSONALIZATION BAR ════════════════ */}
      <div className="rounded-3xl bg-gradient-to-br from-[#191C24] via-[#20242D] to-[#191C24] border border-[#D4AF37]/30 shadow-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]">
              <NewspaperIcon size={18} />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-white leading-tight">IPO News</h2>
              <p className="text-[11px] text-[#C5CAD6]">
                Clustered coverage across every stage of the listing lifecycle
              </p>
            </div>
          </div>

          <div className="relative sm:w-80">
            <SearchIcon
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858995]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tickers, companies or topics"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <XIcon size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Topic rail */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TOPIC_TABS.map((tab) => {
            const isActive = tab.id === activeTopic;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTopic(tab.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#D4AF37] text-[#191C24] border-[#D4AF37]"
                    : "bg-white/5 text-[#C5CAD6] border-white/10 hover:border-[#D4AF37]/50 hover:text-white"
                }`}
              >
                {tab.id === "for-you" && <SparklesIcon size={11} className="inline mr-1 -mt-0.5" />}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ════════════════ MAIN FEED ════════════════ */}
        <div className="lg:col-span-2 space-y-5">
          {lead ? (
            <>
              {/* Lead story */}
              <article
                onClick={() => setOpenStoryId(lead.id)}
                className="group rounded-3xl bg-white border border-[#E8E5DE] shadow-xs hover:border-[#D4AF37]/50 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
              >
                <div
                  className="h-32 sm:h-40 flex items-center justify-center text-6xl relative"
                  style={{
                    background: `linear-gradient(135deg, ${CATEGORY_META[lead.category].accent}22, ${CATEGORY_META[lead.category].accent}08)`,
                  }}
                >
                  {lead.emoji}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border bg-white ${CATEGORY_META[lead.category].chip}`}>
                      {CATEGORY_META[lead.category].label}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border bg-white ${SENTIMENT_STYLES[lead.sentiment]}`}>
                      {sentimentIcon(lead.sentiment)}
                      {lead.sentiment}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-3">
                  <h3 className="text-lg sm:text-2xl font-extrabold text-[#191C24] leading-tight group-hover:text-[#1E2568] transition-colors">
                    {lead.headline}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5F6470] leading-relaxed">{lead.deck}</p>
                  <div className="flex items-center gap-3 text-[11px] text-[#858995] font-medium">
                    <span className="font-mono font-bold text-[#8A6A00]">{lead.ticker}</span>
                    <span>·</span>
                    <span>{lead.publishedAgo}</span>
                    <span>·</span>
                    <span>{lead.readingTime}</span>
                  </div>
                  <div className="pt-3 border-t border-[#F0EDE6]">
                    <SourceCluster story={lead} max={4} onExpand={() => setOpenStoryId(lead.id)} />
                  </div>
                </div>
              </article>

              {/* Remaining clustered stories */}
              <div className="grid grid-cols-1 gap-4">
                {rest.map((story) => (
                  <StoryCard key={story.id} story={story} onOpen={() => setOpenStoryId(story.id)} />
                ))}
              </div>
            </>
          ) : (
            <div className="p-10 rounded-3xl bg-white border border-[#E8E5DE] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F8F7F4] border border-[#E8E5DE] flex items-center justify-center mx-auto text-[#858995]">
                <SearchIcon size={20} />
              </div>
              <h3 className="text-sm font-bold text-[#191C24]">No stories match your filters</h3>
              <p className="text-xs text-[#5F6470]">
                Try a different topic or broaden your search term.
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setActiveTopic("all");
                }}
                className="text-xs font-bold text-[#8A6A00] hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>

        {/* ════════════════ RIGHT RAIL ════════════════ */}
        <aside className="space-y-5 lg:sticky lg:top-4">
          {/* IPO Watchlist */}
          <div className="rounded-3xl bg-white border border-[#E8E5DE] shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F0EDE6] flex items-center gap-2">
              <CalendarIcon size={15} className="text-[#8A6A00]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#191C24]">
                IPO Watchlist
              </h3>
            </div>
            <div className="divide-y divide-[#F0EDE6]">
              {WATCHLIST.map((entry) => (
                <div key={entry.ticker} className="px-5 py-3 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-[#F8F7F4] border border-[#E8E5DE] flex items-center justify-center text-base shrink-0">
                    {entry.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#191C24] truncate">
                        {entry.company}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-[#858995]">
                        {entry.ticker}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#858995]">{entry.status}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#8A6A00] bg-[#FAF6ED] border border-[#D4AF37]/30 px-2 py-0.5 rounded-full shrink-0">
                    {entry.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Most Read */}
          <div className="rounded-3xl bg-white border border-[#E8E5DE] shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F0EDE6] flex items-center gap-2">
              <FlameIcon size={15} className="text-[#C2410C]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#191C24]">
                Most Read
              </h3>
            </div>
            <div className="divide-y divide-[#F0EDE6]">
              {mostRead.map((entry, index) => (
                <button
                  key={entry.id}
                  onClick={() => entry.story && setOpenStoryId(entry.story.id)}
                  className="w-full text-left px-5 py-3 flex items-start gap-3 hover:bg-[#F8F7F4] transition-colors cursor-pointer"
                >
                  <span className="text-base font-extrabold text-[#E8D8B0] leading-none w-5 shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-semibold text-[#191C24] leading-snug line-clamp-2">
                      {entry.story?.headline}
                    </p>
                    <span className="text-[10px] text-[#858995]">{entry.reads} reads</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Trending Topics */}
          <div className="rounded-3xl bg-white border border-[#E8E5DE] shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F0EDE6] flex items-center gap-2">
              <ZapIcon size={15} className="text-[#8A6A00]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#191C24]">
                Trending Topics
              </h3>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {TRENDING_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => {
                    setQuery(topic);
                    setActiveTopic("all");
                  }}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#F8F7F4] border border-[#E8E5DE] text-[#5F6470] hover:border-[#D4AF37] hover:text-[#191C24] transition-all cursor-pointer"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ════════════════ FULL COVERAGE MODAL ════════════════ */}
      {openStory && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-[#191C24]/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
          onClick={() => setOpenStoryId(null)}
        >
          <div
            className="w-full max-w-3xl bg-[#F8F7F4] rounded-3xl border border-[#E8E5DE] shadow-2xl my-4 overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 sm:px-7 py-5 bg-white border-b border-[#E8E5DE] flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border"
                  style={{
                    backgroundColor: `${CATEGORY_META[openStory.category].accent}14`,
                    borderColor: `${CATEGORY_META[openStory.category].accent}33`,
                  }}
                >
                  {openStory.emoji}
                </span>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${CATEGORY_META[openStory.category].chip}`}>
                      {CATEGORY_META[openStory.category].label}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${SENTIMENT_STYLES[openStory.sentiment]}`}>
                      {sentimentIcon(openStory.sentiment)}
                      {openStory.sentiment}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#858995]">
                      {openStory.ticker}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-xl font-extrabold text-[#191C24] leading-tight">
                    {openStory.headline}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setOpenStoryId(null)}
                className="p-2 rounded-xl text-[#5F6470] hover:text-[#191C24] hover:bg-[#F8F7F4] border border-[#E8E5DE] shrink-0 cursor-pointer"
                aria-label="Close full coverage"
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-7 space-y-5 max-h-[65vh] overflow-y-auto">
              <p className="text-sm text-[#5F6470] leading-relaxed">{openStory.deck}</p>

              <div className="flex items-center gap-3 text-[11px] text-[#858995] font-medium">
                <span>{openStory.publishedAgo}</span>
                <span>·</span>
                <span>{openStory.readingTime}</span>
                <span>·</span>
                <span>{openStory.company}</span>
              </div>

              {/* 30-second AI digest */}
              <div className="p-5 rounded-2xl bg-white border border-[#D4AF37]/40 space-y-3">
                <div className="flex items-center gap-2">
                  <SparklesIcon size={15} className="text-[#8A6A00]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A6A00]">
                    30-Second AI Digest
                  </h3>
                </div>
                <ul className="space-y-2">
                  {openStory.digest.map((point, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-xs text-[#191C24] leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Educational concept callout */}
              <div className="p-5 rounded-2xl bg-[#FAF6ED] border border-[#E8D8B0] space-y-2">
                <div className="flex items-center gap-2">
                  <LightbulbIcon size={15} className="text-[#8A6A00]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A6A00]">
                    Concept: {openStory.concept.term}
                  </h3>
                </div>
                <p className="text-xs text-[#5F6470] leading-relaxed">
                  {openStory.concept.explanation}
                </p>
              </div>

              {/* Clustered sources */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <NewspaperIcon size={15} className="text-[#8A6A00]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#191C24]">
                    All Coverage ({openStory.sources.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {openStory.sources.map((source, index) => (
                    <div
                      key={source.domain}
                      className="p-3.5 rounded-2xl bg-white border border-[#E8E5DE] flex items-center gap-3 hover:border-[#D4AF37]/50 transition-all"
                    >
                      <span className="w-9 h-9 rounded-xl bg-[#F8F7F4] border border-[#E8E5DE] text-sm font-bold text-[#5F6470] flex items-center justify-center shrink-0">
                        {monogram(source.domain)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#191C24] truncate">
                            {source.name}
                          </span>
                          {index === 0 && (
                            <span className="text-[9px] font-bold text-[#8A6A00] bg-[#FAF6ED] border border-[#D4AF37]/30 px-1.5 rounded-full shrink-0">
                              LEAD
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#858995]">
                          {source.domain} · {source.timeAgo}
                        </span>
                      </div>
                      <ArrowUpRightIcon size={14} className="text-[#858995] shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Related stories */}
              {related.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#191C24]">
                    Related Stories
                  </h3>
                  <div className="space-y-2">
                    {related.map((story) => (
                      <button
                        key={story.id}
                        onClick={() => setOpenStoryId(story.id)}
                        className="w-full text-left p-3.5 rounded-2xl bg-white border border-[#E8E5DE] hover:border-[#D4AF37]/50 transition-all flex items-center gap-3 cursor-pointer"
                      >
                        <span className="text-xl shrink-0">{story.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#191C24] leading-snug line-clamp-2">
                            {story.headline}
                          </p>
                          <span className="text-[10px] text-[#858995]">
                            {story.sources[0].name} · {story.publishedAgo}
                          </span>
                        </div>
                        <ChevronRightIcon size={14} className="text-[#858995] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
