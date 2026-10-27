// =========================================================================
//  IPO NEWS DATA MODEL
//  Google-News-style clustered coverage, re-focused on the IPO lifecycle.
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

export const STORIES: NewsStory[] = [
  {
    id: "stripe-pricing",
    category: "priced",
    headline:
      "Stripe prices IPO at $40 per share, valuing the payments giant near $68B",
    deck:
      "The gateway's debut lands at the top of its revised band as institutional demand outstrips the 168M shares on offer.",
    digest: [
      "Priced at $40.00 — the high end of the $38–$42 range reaffirmed on Nov 6.",
      "Implied valuation of roughly $68B, up from the $65B low estimate at launch.",
      "168M shares on offer, led by a 14-bank syndicate under Goldman Sachs.",
      "First-day trading begins on NASDAQ under the ticker STRP on Nov 17.",
    ],
    sentiment: "Bullish",
    concept: {
      term: "Price Band",
      explanation:
        "The filing range is a marketing anchor, not a valuation. Books that oversubscribe let underwriters price at the top or 'up-size' the deal — a signal of genuine demand rather than promoted hype.",
    },
    company: "Stripe, Inc.",
    ticker: "NASDAQ: STRP",
    emoji: "💳",
    sources: [
      { name: "Bloomberg", domain: "bloomberg.com", timeAgo: "2h ago" },
      { name: "Reuters", domain: "reuters.com", timeAgo: "2h ago" },
      { name: "Wall Street Journal", domain: "wsj.com", timeAgo: "3h ago" },
      { name: "Financial Times", domain: "ft.com", timeAgo: "4h ago" },
      { name: "CNBC", domain: "cnbc.com", timeAgo: "5h ago" },
    ],
    publishedAgo: "2h ago",
    readingTime: "4 min read",
    topics: ["Fintech", "Payments", "Mega-Cap IPO", "Blue Chip"],
  },
  {
    id: "databricks-s1-amend",
    category: "filing",
    headline:
      "Databricks files amended S-1, lifting revenue guidance to $2.6B ARR",
    deck:
      "An updated registration statement adds a fourth quarter of audited results and a faster path to GAAP profitability.",
    digest: [
      "Amended S-1 discloses $2.6B ARR, +41% year over year.",
      "Non-GAAP operating margin improved to 14% from 6% a quarter earlier.",
      "Existing holders registered 42M secondary shares alongside the primary float.",
      "Pricing expected in the first half of December on the NYSE.",
    ],
    sentiment: "Bullish",
    concept: {
      term: "Amended S-1",
      explanation:
        "A company can refile its S-1 multiple times before approval. Each amendment adds fresh financials, so the final version is the one that reflects the true pricing story — always read the newest filing.",
    },
    company: "Databricks Inc.",
    ticker: "NYSE: DBRK",
    emoji: "🧱",
    sources: [
      { name: "SEC EDGAR", domain: "sec.gov", timeAgo: "4h ago" },
      { name: "Reuters", domain: "reuters.com", timeAgo: "5h ago" },
      { name: "The Information", domain: "theinformation.com", timeAgo: "7h ago" },
      { name: "Barron's", domain: "barrons.com", timeAgo: "9h ago" },
    ],
    publishedAgo: "4h ago",
    readingTime: "5 min read",
    topics: ["Enterprise Software", "AI", "Data Infrastructure", "High Growth"],
  },
  {
    id: "cerebras-g42-risk",
    category: "filing",
    headline:
      "Cerebras discloses G42 concentration risk in updated S-1 — 87% of 2025 revenue from one client",
    deck:
      "The AI silicon maker flags customer concentration alongside new export-control language requested by regulators.",
    digest: [
      "A single customer, G42, accounted for 87% of trailing revenue.",
      "New risk factors cite export controls and geopolitical licensing exposure.",
      "The company added a second named customer, but only at 4% of revenue.",
      "Underwriters keep the $7.5B–$8.2B valuation guidance unchanged.",
    ],
    sentiment: "Bearish",
    concept: {
      term: "Customer Concentration",
      explanation:
        "When a single buyer drives most revenue, the business is only as durable as that relationship. Analysts discount the multiple accordingly, since losing the client can erase the entire growth story overnight.",
    },
    company: "Cerebras Systems",
    ticker: "NASDAQ: CBRS",
    emoji: "🔷",
    sources: [
      { name: "Wall Street Journal", domain: "wsj.com", timeAgo: "6h ago" },
      { name: "Bloomberg", domain: "bloomberg.com", timeAgo: "7h ago" },
      { name: "The Register", domain: "theregister.com", timeAgo: "8h ago" },
    ],
    publishedAgo: "6h ago",
    readingTime: "3 min read",
    topics: ["Semiconductors", "AI", "Risk Factors", "Venture"],
  },
  {
    id: "klarna-syndicate",
    category: "underwriters",
    headline:
      "Klarna finalizes 10-bank syndicate for $18B offering — Goldman, JPM and Deutsche Bank lead",
    deck:
      "The buy-now-pay-later lender locks in its bookrunners ahead of a roadshow expected to open next week.",
    digest: [
      "Bookrunners: Goldman Sachs, J.P. Morgan and Deutsche Bank.",
      "Target size of roughly $18B at a $15B–$18B valuation.",
      "Retail allocation of 8% reserved for the app's own customer base.",
      "Roadshow scheduled to start within seven days of the filing date.",
    ],
    sentiment: "Neutral",
    concept: {
      term: "Bookrunner",
      explanation:
        "Lead underwriters build the order book and ultimately set the offer price. A deep, high-quality syndicate widens distribution to long-only funds, which tends to reduce first-day volatility.",
    },
    company: "Klarna Group plc",
    ticker: "NYSE: KLAR",
    emoji: "🛍️",
    sources: [
      { name: "Financial Times", domain: "ft.com", timeAgo: "8h ago" },
      { name: "Reuters", domain: "reuters.com", timeAgo: "9h ago" },
      { name: "Bloomberg", domain: "bloomberg.com", timeAgo: "10h ago" },
    ],
    publishedAgo: "8h ago",
    readingTime: "3 min read",
    topics: ["Fintech", "Consumer Credit", "BNPL", "Europe"],
  },
  {
    id: "reddit-lockup-expiry",
    category: "lockup",
    headline:
      "Reddit's 180-day lockup expires, unlocking 41M shares for insiders and early backers",
    deck:
      "Historically the single most volatile day in a newly public company's lifecycle as supply hits the float.",
    digest: [
      "41M shares become eligible for sale at the open.",
      "Lockup expiries have historically increased intraday volatility by 2–3x.",
      "Founders and directors filed no immediate 10b5-1 sale notices.",
      "Options desks priced elevated implied volatility into next week's expiry.",
    ],
    sentiment: "Bearish",
    concept: {
      term: "Lockup Expiry",
      explanation:
        "Pre-IPO holders are contractually barred from selling for a set period — usually 180 days. When that window opens, newly available supply can pressure the share price even if the business has not changed at all.",
    },
    company: "Reddit, Inc.",
    ticker: "NYSE: RDDT",
    emoji: "👽",
    sources: [
      { name: "Barron's", domain: "barrons.com", timeAgo: "12h ago" },
      { name: "MarketWatch", domain: "marketwatch.com", timeAgo: "13h ago" },
      { name: "Investor's Business Daily", domain: "investors.com", timeAgo: "15h ago" },
    ],
    publishedAgo: "12h ago",
    readingTime: "4 min read",
    topics: ["Social Media", "Lockup", "Volatility"],
  },
  {
    id: "discord-direct-listing",
    category: "upcoming",
    headline:
      "Discord explores direct listing instead of a traditional IPO, sources say",
    deck:
      "A direct listing would let existing shareholders sell into the open market without raising new primary capital.",
    digest: [
      "No new shares would be issued, and no underwriters would price the deal.",
      "Valuation would be set purely by opening auction demand.",
      "Company targeting an NYSE listing as early as Q1 2027.",
      "Bankers retained only as advisors, not as bookrunners.",
    ],
    sentiment: "Neutral",
    concept: {
      term: "Direct Listing",
      explanation:
        "Unlike an IPO, a direct listing skips the underwriting process and offers no price support. It works when a company needs liquidity for insiders but does not need to raise fresh cash — bringing higher early volatility.",
    },
    company: "Discord Inc.",
    ticker: "NYSE: DSCD",
    emoji: "🎮",
    sources: [
      { name: "The Information", domain: "theinformation.com", timeAgo: "1d ago" },
      { name: "Bloomberg", domain: "bloomberg.com", timeAgo: "1d ago" },
      { name: "TechCrunch", domain: "techcrunch.com", timeAgo: "1d ago" },
    ],
    publishedAgo: "1d ago",
    readingTime: "3 min read",
    topics: ["Social", "Gaming", "Venture", "High Growth"],
  },
  {
    id: "shein-london-listing",
    category: "upcoming",
    headline:
      "Shein confirms London listing, citing US de-minimis rule changes as a key driver",
    deck:
      "The fast-fashion platform pivots to the London Stock Exchange as American tariff exemptions tighten.",
    digest: [
      "London Stock Exchange selected over New York for the primary listing.",
      "Company cites closing of the US de-minimis import loophole as the reason.",
      "Target raise reported at roughly $5B with a dual-tranche structure.",
      "Governance and supply-chain disclosures remain the central regulatory hurdle.",
    ],
    sentiment: "Neutral",
    concept: {
      term: "Listing Venue Arbitrage",
      explanation:
        "Companies choose an exchange based on valuation multiples, investor base and regulatory burden. A shift from New York to London often signals lower disclosure demands — which investors should price as added opacity risk.",
    },
    company: "Shein",
    ticker: "LSE: SHEN",
    emoji: "🧵",
    sources: [
      { name: "The Guardian", domain: "theguardian.com", timeAgo: "1d ago" },
      { name: "Financial Times", domain: "ft.com", timeAgo: "2d ago" },
      { name: "Reuters", domain: "reuters.com", timeAgo: "2d ago" },
    ],
    publishedAgo: "1d ago",
    readingTime: "4 min read",
    topics: ["E-Commerce", "Europe", "Regulation", "Consumer"],
  },
  {
    id: "fed-ipo-window",
    category: "macro",
    headline:
      "Fed holds rates but signals two 2027 cuts — bankers see the IPO window reopening",
    deck:
      "Lower expected discount rates compress the cost of capital, which historically revives late-stage listings.",
    digest: [
      "Target range held; median dot plot points to two cuts in H1 2027.",
      "Ten-year Treasury yield eased 14bps on the announcement.",
      "Roughly 30 companies are reported to be waiting on the sidelines.",
      "Rate-sensitive growth names rallied most on the news.",
    ],
    sentiment: "Bullish",
    concept: {
      term: "Discount Rate",
      explanation:
        "Every future cash flow is worth less today the higher rates go. When central banks signal cuts, long-duration growth companies see their present value rise — which is exactly why IPO activity clusters around easing cycles.",
    },
    company: "Macro & Rates",
    ticker: "MACRO",
    emoji: "🏦",
    sources: [
      { name: "Reuters", domain: "reuters.com", timeAgo: "6h ago" },
      { name: "Bloomberg", domain: "bloomberg.com", timeAgo: "6h ago" },
      { name: "Associated Press", domain: "apnews.com", timeAgo: "7h ago" },
      { name: "CNBC", domain: "cnbc.com", timeAgo: "8h ago" },
    ],
    publishedAgo: "6h ago",
    readingTime: "5 min read",
    topics: ["Macro", "Rates", "Monetary Policy", "Blue Chip"],
  },
  {
    id: "ai-multiple-compression",
    category: "valuation",
    headline:
      "AI IPO multiples are compressing — new deals now price at 12x forward revenue, down from 28x",
    deck:
      "Investors are underwriting cash flow rather than narrative as the first AI cohort reports post-lockup results.",
    digest: [
      "Median AI forward revenue multiple fell from 28x to 12x in four quarters.",
      "Deals with credible gross margins are still clearing above 18x.",
      "Several pre-IPO names trimmed targets to avoid a broken deal.",
      "Free cash flow, not ARR growth, is now the swing factor in books.",
    ],
    sentiment: "Bearish",
    concept: {
      term: "Multiple Compression",
      explanation:
        "A multiple is a price paid per dollar of revenue or earnings. When sentiment cools, the same company is valued at a lower multiple — so the stock can fall even while the business keeps growing.",
    },
    company: "Sector Analysis",
    ticker: "SECTOR",
    emoji: "📉",
    sources: [
      { name: "Bloomberg", domain: "bloomberg.com", timeAgo: "10h ago" },
      { name: "Wall Street Journal", domain: "wsj.com", timeAgo: "11h ago" },
      { name: "PitchBook", domain: "pitchbook.com", timeAgo: "1d ago" },
    ],
    publishedAgo: "10h ago",
    readingTime: "6 min read",
    topics: ["Valuation", "AI", "Enterprise Software", "Venture"],
  },
  {
    id: "cerebras-debut-pop",
    category: "priced",
    headline:
      "Cerebras surges 34% in debut, but analysts warn the pop masks thin float",
    deck:
      "A small free float can amplify opening gains without reflecting long-term institutional conviction.",
    digest: [
      "Shares closed the first session up 34% from the $185 offer price.",
      "Only 9% of shares outstanding were available to trade.",
      "Retail order flow dominated the first 30 minutes of price discovery.",
      "Underwriters retain a 30-day greenshoe option of 1.2M shares.",
    ],
    sentiment: "Neutral",
    concept: {
      term: "Free Float",
      explanation:
        "The slice of total shares actually available to trade. A tiny float makes a stock easy to bid up on debut, but that first-day pop often fades once more supply and institutional research arrive.",
    },
    company: "Cerebras Systems",
    ticker: "NASDAQ: CBRS",
    emoji: "🔷",
    sources: [
      { name: "Barron's", domain: "barrons.com", timeAgo: "3h ago" },
      { name: "MarketWatch", domain: "marketwatch.com", timeAgo: "4h ago" },
      { name: "Investor's Business Daily", domain: "investors.com", timeAgo: "5h ago" },
    ],
    publishedAgo: "3h ago",
    readingTime: "4 min read",
    topics: ["Semiconductors", "AI", "Trading Debut", "Venture"],
  },
  {
    id: "fintech-ipo-revival",
    category: "macro",
    headline:
      "Fintech IPO revival gathers pace as three payment processors file in one week",
    deck:
      "Public-market appetite for payments infrastructure is returning after two quiet years of shelved deals.",
    digest: [
      "Three payments and lending platforms filed initial registration statements.",
      "Combined target proceeds reported above $9B.",
      "Investors cite stable take rates and improving credit performance.",
      "All three target first-half 2027 listings across NYSE and NASDAQ.",
    ],
    sentiment: "Bullish",
    concept: {
      term: "IPO Window",
      explanation:
        "Primary markets open and close in cycles. When a few peer deals price well, others rush to file while investors are receptive — which can oversupply the market and eventually close the window again.",
    },
    company: "Sector Analysis",
    ticker: "SECTOR",
    emoji: "🏛️",
    sources: [
      { name: "Reuters", domain: "reuters.com", timeAgo: "1d ago" },
      { name: "Financial Times", domain: "ft.com", timeAgo: "1d ago" },
      { name: "Axios", domain: "axios.com", timeAgo: "2d ago" },
    ],
    publishedAgo: "1d ago",
    readingTime: "5 min read",
    topics: ["Fintech", "Payments", "Macro", "Europe"],
  },
  {
    id: "starlink-spinoff-rumor",
    category: "filing",
    headline:
      "Starlink spin-off chatter resurfaces as internal filings point to separate reporting",
    deck:
      "Segment-level disclosure changes often precede a formal carve-out or standalone listing.",
    digest: [
      "Updated internal reporting now separates the satellite broadband unit.",
      "No registration statement has been filed with any regulator.",
      "Analysts estimate a standalone valuation between $120B and $180B.",
      "Company declined to comment on listing speculation.",
    ],
    sentiment: "Neutral",
    concept: {
      term: "Carve-Out",
      explanation:
        "When a parent separates a business unit into its own legal and reporting entity, it is often the first step toward a spin-off or direct listing — giving investors a cleaner way to value the division.",
    },
    company: "Starlink",
    ticker: "RUMOR",
    emoji: "🛰️",
    sources: [
      { name: "Bloomberg", domain: "bloomberg.com", timeAgo: "14h ago" },
      { name: "The Wall Street Journal", domain: "wsj.com", timeAgo: "15h ago" },
      { name: "Ars Technica", domain: "arstechnica.com", timeAgo: "1d ago" },
    ],
    publishedAgo: "14h ago",
    readingTime: "3 min read",
    topics: ["Telecom", "Aerospace", "Venture", "High Growth"],
  },
  {
    id: "greenshoe-mechanics",
    category: "underwriters",
    headline:
      "Why the greenshoe matters: the 15% over-allotment quietly stabilizes new listings",
    deck:
      "A deep dive into the stabilization mechanism that cushions the first 30 days of trading.",
    digest: [
      "Underwriters may sell up to 15% more shares than the base deal size.",
      "If the stock weakens, they buy back shares to support the price.",
      "Exercising the option also signals confident end-investor demand.",
      "The window lasts exactly 30 calendar days from the debut.",
    ],
    sentiment: "Neutral",
    concept: {
      term: "Greenshoe Option",
      explanation:
        "Also called an over-allotment option, it lets underwriters buy extra shares at the offer price to cover short positions. It is the single biggest reason new listings rarely collapse on day one.",
    },
    company: "Explainer",
    ticker: "GUIDE",
    emoji: "👟",
    sources: [
      { name: "Investopedia", domain: "investopedia.com", timeAgo: "2d ago" },
      { name: "Investor's Business Daily", domain: "investors.com", timeAgo: "2d ago" },
    ],
    publishedAgo: "2d ago",
    readingTime: "6 min read",
    topics: ["Education", "Underwriting", "Mechanics"],
  },
];

/** Ranked by reader engagement — resolved against STORIES at render time. */
export const MOST_READ: { id: string; reads: string }[] = [
  { id: "stripe-pricing", reads: "48.2K" },
  { id: "ai-multiple-compression", reads: "31.7K" },
  { id: "reddit-lockup-expiry", reads: "24.5K" },
  { id: "cerebras-g42-risk", reads: "19.8K" },
  { id: "fed-ipo-window", reads: "16.1K" },
];

export const TRENDING_TOPICS: string[] = [
  "Stripe IPO",
  "Lockup Expiry",
  "AI Multiples",
  "Greenshoe",
  "Direct Listing",
  "G42 Concentration",
  "Fed Cuts",
  "Free Float",
];

export const WATCHLIST: {
  company: string;
  ticker: string;
  date: string;
  status: string;
  emoji: string;
}[] = [
  { company: "Stripe", ticker: "STRP", date: "Nov 17", status: "Confirmed", emoji: "💳" },
  { company: "Databricks", ticker: "DBRK", date: "Dec 08", status: "S-1 Filed", emoji: "🧱" },
  { company: "Klarna", ticker: "KLAR", date: "Dec 15", status: "Pending Pricing", emoji: "🛍️" },
  { company: "Shein", ticker: "SHEN", date: "Q1 '27", status: "Filed", emoji: "🧵" },
  { company: "Discord", ticker: "DSCD", date: "Q1 '27", status: "Rumored", emoji: "🎮" },
];
