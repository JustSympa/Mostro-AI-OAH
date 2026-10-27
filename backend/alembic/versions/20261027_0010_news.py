"""add the IPO news tables and seed the dashboard feed

The dashboard News tab renders clustered IPO coverage. The content previously
lived as static mock data in the frontend; it now ships from Postgres so the
feed can evolve without a frontend rebuild.

Revision ID: 20261027_0010
Revises: 20261027_0009
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261027_0010"
down_revision = "20261027_0009"
branch_labels = None
depends_on = None


def _story(
    story_id: str,
    category: str,
    headline: str,
    deck: str,
    digest: list[str],
    sentiment: str,
    concept: tuple[str, str],
    company: str,
    ticker: str,
    emoji: str,
    sources: list[tuple[str, str, str]],
    published_ago: str,
    reading_time: str,
    topics: list[str],
    rank: int,
    most_read: tuple[int, str] | None = None,
) -> dict[str, object]:
    """Build one seed row; `most_read` is the (rank, reads) rail position."""
    return {
        "id": story_id,
        "category": category,
        "headline": headline,
        "deck": deck,
        "digest": digest,
        "sentiment": sentiment,
        "concept_term": concept[0],
        "concept_explanation": concept[1],
        "company": company,
        "ticker": ticker,
        "emoji": emoji,
        "sources": [
            {"name": name, "domain": domain, "timeAgo": time_ago}
            for name, domain, time_ago in sources
        ],
        "published_ago": published_ago,
        "reading_time": reading_time,
        "topics": topics,
        "rank": rank,
        "most_read_rank": most_read[0] if most_read else None,
        "reads_label": most_read[1] if most_read else None,
    }


STORIES = [
    _story(
        "stripe-pricing",
        "priced",
        "Stripe prices IPO at $40 per share, valuing the payments giant near $68B",
        "The gateway's debut lands at the top of its revised band as institutional demand outstrips the 168M shares on offer.",
        [
            "Priced at $40.00 — the high end of the $38–$42 range reaffirmed on Nov 6.",
            "Implied valuation of roughly $68B, up from the $65B low estimate at launch.",
            "168M shares on offer, led by a 14-bank syndicate under Goldman Sachs.",
            "First-day trading begins on NASDAQ under the ticker STRP on Nov 17.",
        ],
        "Bullish",
        (
            "Price Band",
            "The filing range is a marketing anchor, not a valuation. Books that "
            "oversubscribe let underwriters price at the top or 'up-size' the deal — a "
            "signal of genuine demand rather than promoted hype.",
        ),
        "Stripe, Inc.",
        "NASDAQ: STRP",
        "💳",
        [
            ("Bloomberg", "bloomberg.com", "2h ago"),
            ("Reuters", "reuters.com", "2h ago"),
            ("Wall Street Journal", "wsj.com", "3h ago"),
            ("Financial Times", "ft.com", "4h ago"),
            ("CNBC", "cnbc.com", "5h ago"),
        ],
        "2h ago",
        "4 min read",
        ["Fintech", "Payments", "Mega-Cap IPO", "Blue Chip"],
        1,
        most_read=(1, "48.2K"),
    ),
    _story(
        "databricks-s1-amend",
        "filing",
        "Databricks files amended S-1, lifting revenue guidance to $2.6B ARR",
        "An updated registration statement adds a fourth quarter of audited results and a faster path to GAAP profitability.",
        [
            "Amended S-1 discloses $2.6B ARR, +41% year over year.",
            "Non-GAAP operating margin improved to 14% from 6% a quarter earlier.",
            "Existing holders registered 42M secondary shares alongside the primary float.",
            "Pricing expected in the first half of December on the NYSE.",
        ],
        "Bullish",
        (
            "Amended S-1",
            "A company can refile its S-1 multiple times before approval. Each "
            "amendment adds fresh financials, so the final version is the one that "
            "reflects the true pricing story — always read the newest filing.",
        ),
        "Databricks Inc.",
        "NYSE: DBRK",
        "🧱",
        [
            ("SEC EDGAR", "sec.gov", "4h ago"),
            ("Reuters", "reuters.com", "5h ago"),
            ("The Information", "theinformation.com", "7h ago"),
            ("Barron's", "barrons.com", "9h ago"),
        ],
        "4h ago",
        "5 min read",
        ["Enterprise Software", "AI", "Data Infrastructure", "High Growth"],
        2,
    ),
    _story(
        "cerebras-g42-risk",
        "filing",
        "Cerebras discloses G42 concentration risk in updated S-1 — 87% of 2025 revenue from one client",
        "The AI silicon maker flags customer concentration alongside new export-control language requested by regulators.",
        [
            "A single customer, G42, accounted for 87% of trailing revenue.",
            "New risk factors cite export controls and geopolitical licensing exposure.",
            "The company added a second named customer, but only at 4% of revenue.",
            "Underwriters keep the $7.5B–$8.2B valuation guidance unchanged.",
        ],
        "Bearish",
        (
            "Customer Concentration",
            "When a single buyer drives most revenue, the business is only as durable "
            "as that relationship. Analysts discount the multiple accordingly, since "
            "losing the client can erase the entire growth story overnight.",
        ),
        "Cerebras Systems",
        "NASDAQ: CBRS",
        "🔷",
        [
            ("Wall Street Journal", "wsj.com", "6h ago"),
            ("Bloomberg", "bloomberg.com", "7h ago"),
            ("The Register", "theregister.com", "8h ago"),
        ],
        "6h ago",
        "3 min read",
        ["Semiconductors", "AI", "Risk Factors", "Venture"],
        3,
        most_read=(4, "19.8K"),
    ),
    _story(
        "klarna-syndicate",
        "underwriters",
        "Klarna finalizes 10-bank syndicate for $18B offering — Goldman, JPM and Deutsche Bank lead",
        "The buy-now-pay-later lender locks in its bookrunners ahead of a roadshow expected to open next week.",
        [
            "Bookrunners: Goldman Sachs, J.P. Morgan and Deutsche Bank.",
            "Target size of roughly $18B at a $15B–$18B valuation.",
            "Retail allocation of 8% reserved for the app's own customer base.",
            "Roadshow scheduled to start within seven days of the filing date.",
        ],
        "Neutral",
        (
            "Bookrunner",
            "Lead underwriters build the order book and ultimately set the offer "
            "price. A deep, high-quality syndicate widens distribution to long-only "
            "funds, which tends to reduce first-day volatility.",
        ),
        "Klarna Group plc",
        "NYSE: KLAR",
        "🛍️",
        [
            ("Financial Times", "ft.com", "8h ago"),
            ("Reuters", "reuters.com", "9h ago"),
            ("Bloomberg", "bloomberg.com", "10h ago"),
        ],
        "8h ago",
        "3 min read",
        ["Fintech", "Consumer Credit", "BNPL", "Europe"],
        4,
    ),
    _story(
        "reddit-lockup-expiry",
        "lockup",
        "Reddit's 180-day lockup expires, unlocking 41M shares for insiders and early backers",
        "Historically the single most volatile day in a newly public company's lifecycle as supply hits the float.",
        [
            "41M shares become eligible for sale at the open.",
            "Lockup expiries have historically increased intraday volatility by 2–3x.",
            "Founders and directors filed no immediate 10b5-1 sale notices.",
            "Options desks priced elevated implied volatility into next week's expiry.",
        ],
        "Bearish",
        (
            "Lockup Expiry",
            "Pre-IPO holders are contractually barred from selling for a set period — "
            "usually 180 days. When that window opens, newly available supply can "
            "pressure the share price even if the business has not changed at all.",
        ),
        "Reddit, Inc.",
        "NYSE: RDDT",
        "👽",
        [
            ("Barron's", "barrons.com", "12h ago"),
            ("MarketWatch", "marketwatch.com", "13h ago"),
            ("Investor's Business Daily", "investors.com", "15h ago"),
        ],
        "12h ago",
        "4 min read",
        ["Social Media", "Lockup", "Volatility"],
        5,
        most_read=(3, "24.5K"),
    ),
    _story(
        "discord-direct-listing",
        "upcoming",
        "Discord explores direct listing instead of a traditional IPO, sources say",
        "A direct listing would let existing shareholders sell into the open market without raising new primary capital.",
        [
            "No new shares would be issued, and no underwriters would price the deal.",
            "Valuation would be set purely by opening auction demand.",
            "Company targeting an NYSE listing as early as Q1 2027.",
            "Bankers retained only as advisors, not as bookrunners.",
        ],
        "Neutral",
        (
            "Direct Listing",
            "Unlike an IPO, a direct listing skips the underwriting process and offers "
            "no price support. It works when a company needs liquidity for insiders but "
            "does not need to raise fresh cash — bringing higher early volatility.",
        ),
        "Discord Inc.",
        "NYSE: DSCD",
        "🎮",
        [
            ("The Information", "theinformation.com", "1d ago"),
            ("Bloomberg", "bloomberg.com", "1d ago"),
            ("TechCrunch", "techcrunch.com", "1d ago"),
        ],
        "1d ago",
        "3 min read",
        ["Social", "Gaming", "Venture", "High Growth"],
        6,
    ),
    _story(
        "shein-london-listing",
        "upcoming",
        "Shein confirms London listing, citing US de-minimis rule changes as a key driver",
        "The fast-fashion platform pivots to the London Stock Exchange as American tariff exemptions tighten.",
        [
            "London Stock Exchange selected over New York for the primary listing.",
            "Company cites closing of the US de-minimis import loophole as the reason.",
            "Target raise reported at roughly $5B with a dual-tranche structure.",
            "Governance and supply-chain disclosures remain the central regulatory hurdle.",
        ],
        "Neutral",
        (
            "Listing Venue Arbitrage",
            "Companies choose an exchange based on valuation multiples, investor base "
            "and regulatory burden. A shift from New York to London often signals lower "
            "disclosure demands — which investors should price as added opacity risk.",
        ),
        "Shein",
        "LSE: SHEN",
        "🧵",
        [
            ("The Guardian", "theguardian.com", "1d ago"),
            ("Financial Times", "ft.com", "2d ago"),
            ("Reuters", "reuters.com", "2d ago"),
        ],
        "1d ago",
        "4 min read",
        ["E-Commerce", "Europe", "Regulation", "Consumer"],
        7,
    ),
    _story(
        "fed-ipo-window",
        "macro",
        "Fed holds rates but signals two 2027 cuts — bankers see the IPO window reopening",
        "Lower expected discount rates compress the cost of capital, which historically revives late-stage listings.",
        [
            "Target range held; median dot plot points to two cuts in H1 2027.",
            "Ten-year Treasury yield eased 14bps on the announcement.",
            "Roughly 30 companies are reported to be waiting on the sidelines.",
            "Rate-sensitive growth names rallied most on the news.",
        ],
        "Bullish",
        (
            "Discount Rate",
            "Every future cash flow is worth less today the higher rates go. When "
            "central banks signal cuts, long-duration growth companies see their present "
            "value rise — which is exactly why IPO activity clusters around easing cycles.",
        ),
        "Macro & Rates",
        "MACRO",
        "🏦",
        [
            ("Reuters", "reuters.com", "6h ago"),
            ("Bloomberg", "bloomberg.com", "6h ago"),
            ("Associated Press", "apnews.com", "7h ago"),
            ("CNBC", "cnbc.com", "8h ago"),
        ],
        "6h ago",
        "5 min read",
        ["Macro", "Rates", "Monetary Policy", "Blue Chip"],
        8,
        most_read=(5, "16.1K"),
    ),
    _story(
        "ai-multiple-compression",
        "valuation",
        "AI IPO multiples are compressing — new deals now price at 12x forward revenue, down from 28x",
        "Investors are underwriting cash flow rather than narrative as the first AI cohort reports post-lockup results.",
        [
            "Median AI forward revenue multiple fell from 28x to 12x in four quarters.",
            "Deals with credible gross margins are still clearing above 18x.",
            "Several pre-IPO names trimmed targets to avoid a broken deal.",
            "Free cash flow, not ARR growth, is now the swing factor in books.",
        ],
        "Bearish",
        (
            "Multiple Compression",
            "A multiple is a price paid per dollar of revenue or earnings. When "
            "sentiment cools, the same company is valued at a lower multiple — so the "
            "stock can fall even while the business keeps growing.",
        ),
        "Sector Analysis",
        "SECTOR",
        "📉",
        [
            ("Bloomberg", "bloomberg.com", "10h ago"),
            ("Wall Street Journal", "wsj.com", "11h ago"),
            ("PitchBook", "pitchbook.com", "1d ago"),
        ],
        "10h ago",
        "6 min read",
        ["Valuation", "AI", "Enterprise Software", "Venture"],
        9,
        most_read=(2, "31.7K"),
    ),
    _story(
        "cerebras-debut-pop",
        "priced",
        "Cerebras surges 34% in debut, but analysts warn the pop masks thin float",
        "A small free float can amplify opening gains without reflecting long-term institutional conviction.",
        [
            "Shares closed the first session up 34% from the $185 offer price.",
            "Only 9% of shares outstanding were available to trade.",
            "Retail order flow dominated the first 30 minutes of price discovery.",
            "Underwriters retain a 30-day greenshoe option of 1.2M shares.",
        ],
        "Neutral",
        (
            "Free Float",
            "The slice of total shares actually available to trade. A tiny float makes "
            "a stock easy to bid up on debut, but that first-day pop often fades once "
            "more supply and institutional research arrive.",
        ),
        "Cerebras Systems",
        "NASDAQ: CBRS",
        "🔷",
        [
            ("Barron's", "barrons.com", "3h ago"),
            ("MarketWatch", "marketwatch.com", "4h ago"),
            ("Investor's Business Daily", "investors.com", "5h ago"),
        ],
        "3h ago",
        "4 min read",
        ["Semiconductors", "AI", "Trading Debut", "Venture"],
        10,
    ),
    _story(
        "fintech-ipo-revival",
        "macro",
        "Fintech IPO revival gathers pace as three payment processors file in one week",
        "Public-market appetite for payments infrastructure is returning after two quiet years of shelved deals.",
        [
            "Three payments and lending platforms filed initial registration statements.",
            "Combined target proceeds reported above $9B.",
            "Investors cite stable take rates and improving credit performance.",
            "All three target first-half 2027 listings across NYSE and NASDAQ.",
        ],
        "Bullish",
        (
            "IPO Window",
            "Primary markets open and close in cycles. When a few peer deals price "
            "well, others rush to file while investors are receptive — which can "
            "oversupply the market and eventually close the window again.",
        ),
        "Sector Analysis",
        "SECTOR",
        "🏛️",
        [
            ("Reuters", "reuters.com", "1d ago"),
            ("Financial Times", "ft.com", "1d ago"),
            ("Axios", "axios.com", "2d ago"),
        ],
        "1d ago",
        "5 min read",
        ["Fintech", "Payments", "Macro", "Europe"],
        11,
    ),
    _story(
        "starlink-spinoff-rumor",
        "filing",
        "Starlink spin-off chatter resurfaces as internal filings point to separate reporting",
        "Segment-level disclosure changes often precede a formal carve-out or standalone listing.",
        [
            "Updated internal reporting now separates the satellite broadband unit.",
            "No registration statement has been filed with any regulator.",
            "Analysts estimate a standalone valuation between $120B and $180B.",
            "Company declined to comment on listing speculation.",
        ],
        "Neutral",
        (
            "Carve-Out",
            "When a parent separates a business unit into its own legal and reporting "
            "entity, it is often the first step toward a spin-off or direct listing — "
            "giving investors a cleaner way to value the division.",
        ),
        "Starlink",
        "RUMOR",
        "🛰️",
        [
            ("Bloomberg", "bloomberg.com", "14h ago"),
            ("The Wall Street Journal", "wsj.com", "15h ago"),
            ("Ars Technica", "arstechnica.com", "1d ago"),
        ],
        "14h ago",
        "3 min read",
        ["Telecom", "Aerospace", "Venture", "High Growth"],
        12,
    ),
    _story(
        "greenshoe-mechanics",
        "underwriters",
        "Why the greenshoe matters: the 15% over-allotment quietly stabilizes new listings",
        "A deep dive into the stabilization mechanism that cushions the first 30 days of trading.",
        [
            "Underwriters may sell up to 15% more shares than the base deal size.",
            "If the stock weakens, they buy back shares to support the price.",
            "Exercising the option also signals confident end-investor demand.",
            "The window lasts exactly 30 calendar days from the debut.",
        ],
        "Neutral",
        (
            "Greenshoe Option",
            "Also called an over-allotment option, it lets underwriters buy extra "
            "shares at the offer price to cover short positions. It is the single "
            "biggest reason new listings rarely collapse on day one.",
        ),
        "Explainer",
        "GUIDE",
        "👟",
        [
            ("Investopedia", "investopedia.com", "2d ago"),
            ("Investor's Business Daily", "investors.com", "2d ago"),
        ],
        "2d ago",
        "6 min read",
        ["Education", "Underwriting", "Mechanics"],
        13,
    ),
]

WATCHLIST = [
    {"ticker": "STRP", "company": "Stripe", "listing_date": "Nov 17", "status": "Confirmed", "emoji": "💳", "rank": 1},
    {"ticker": "DBRK", "company": "Databricks", "listing_date": "Dec 08", "status": "S-1 Filed", "emoji": "🧱", "rank": 2},
    {"ticker": "KLAR", "company": "Klarna", "listing_date": "Dec 15", "status": "Pending Pricing", "emoji": "🛍️", "rank": 3},
    {"ticker": "SHEN", "company": "Shein", "listing_date": "Q1 '27", "status": "Filed", "emoji": "🧵", "rank": 4},
    {"ticker": "DSCD", "company": "Discord", "listing_date": "Q1 '27", "status": "Rumored", "emoji": "🎮", "rank": 5},
]

TOPICS = [
    {"label": "Stripe IPO", "rank": 1},
    {"label": "Lockup Expiry", "rank": 2},
    {"label": "AI Multiples", "rank": 3},
    {"label": "Greenshoe", "rank": 4},
    {"label": "Direct Listing", "rank": 5},
    {"label": "G42 Concentration", "rank": 6},
    {"label": "Fed Cuts", "rank": 7},
    {"label": "Free Float", "rank": 8},
]


def upgrade() -> None:
    op.create_table(
        "news_stories",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("headline", sa.String(500), nullable=False),
        sa.Column("deck", sa.Text(), nullable=False),
        sa.Column("digest", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("sentiment", sa.String(16), nullable=False),
        sa.Column("concept_term", sa.String(120), nullable=False),
        sa.Column("concept_explanation", sa.Text(), nullable=False),
        sa.Column("company", sa.String(255), nullable=False),
        sa.Column("ticker", sa.String(64), nullable=False),
        sa.Column("emoji", sa.String(16), nullable=False),
        sa.Column("sources", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("published_ago", sa.String(32), nullable=False),
        sa.Column("reading_time", sa.String(32), nullable=False),
        sa.Column("topics", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("most_read_rank", sa.Integer(), nullable=True),
        sa.Column("reads_label", sa.String(32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint(
            "category IN ('upcoming', 'priced', 'filing', 'valuation', "
            "'underwriters', 'lockup', 'macro')",
            name="news_story_category",
        ),
        sa.CheckConstraint(
            "sentiment IN ('Bullish', 'Bearish', 'Neutral')",
            name="news_story_sentiment",
        ),
    )
    op.create_table(
        "news_watchlist",
        sa.Column("ticker", sa.String(32), primary_key=True),
        sa.Column("company", sa.String(255), nullable=False),
        sa.Column("listing_date", sa.String(32), nullable=False),
        sa.Column("status", sa.String(64), nullable=False),
        sa.Column("emoji", sa.String(16), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
    )
    op.create_table(
        "news_topics",
        sa.Column("label", sa.String(80), primary_key=True),
        sa.Column("rank", sa.Integer(), nullable=False),
    )

    stories = sa.table(
        "news_stories",
        sa.column("id", sa.String),
        sa.column("category", sa.String),
        sa.column("headline", sa.String),
        sa.column("deck", sa.Text),
        sa.column("digest", postgresql.JSONB),
        sa.column("sentiment", sa.String),
        sa.column("concept_term", sa.String),
        sa.column("concept_explanation", sa.Text),
        sa.column("company", sa.String),
        sa.column("ticker", sa.String),
        sa.column("emoji", sa.String),
        sa.column("sources", postgresql.JSONB),
        sa.column("published_ago", sa.String),
        sa.column("reading_time", sa.String),
        sa.column("topics", postgresql.JSONB),
        sa.column("rank", sa.Integer),
        sa.column("most_read_rank", sa.Integer),
        sa.column("reads_label", sa.String),
    )
    op.bulk_insert(stories, STORIES)

    watchlist = sa.table(
        "news_watchlist",
        sa.column("ticker", sa.String),
        sa.column("company", sa.String),
        sa.column("listing_date", sa.String),
        sa.column("status", sa.String),
        sa.column("emoji", sa.String),
        sa.column("rank", sa.Integer),
    )
    op.bulk_insert(watchlist, WATCHLIST)

    topics = sa.table(
        "news_topics",
        sa.column("label", sa.String),
        sa.column("rank", sa.Integer),
    )
    op.bulk_insert(topics, TOPICS)


def downgrade() -> None:
    op.drop_table("news_topics")
    op.drop_table("news_watchlist")
    op.drop_table("news_stories")
