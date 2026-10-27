// ============================================================================
// Mostro AI — Financial Learning Hub content model
// Static curriculum, scenario simulations, mental models, badges and the
// XP / level system consumed by <FinancialLearningHub />.
// ============================================================================

export type IconName =
  | "compass"
  | "book"
  | "chart"
  | "target"
  | "star"
  | "award"
  | "zap"
  | "shield"
  | "brain"
  | "flame"
  | "lightbulb"
  | "trending";

export type LessonLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface QuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonSection {
  heading: string;
  body: string;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  xp: number;
  sections: LessonSection[];
  takeaways: string[];
  quiz: QuizQuestion;
}

export interface Stage {
  id: string;
  label: string;
  title: string;
  level: LessonLevel;
  summary: string;
  icon: IconName;
  lessons: Lesson[];
}

export interface ScenarioMetric {
  label: string;
  value: string;
  tone?: "up" | "down" | "flat";
}

export interface ScenarioOption {
  text: string;
  /** 2 = optimal, 1 = acceptable, 0 = poor */
  score: number;
  outcome: string;
}

export interface Scenario {
  id: string;
  title: string;
  timeframe: string;
  setup: string;
  metrics: ScenarioMetric[];
  question: string;
  options: ScenarioOption[];
  debrief: string;
  xp: number;
}

export interface MentalModel {
  id: string;
  name: string;
  origin: string;
  tagline: string;
  principle: string;
  inPractice: string;
  pitfall: string;
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  tier: "bronze" | "silver" | "gold";
}

// ─────────────────────────── Curriculum ───────────────────────────

export const STAGES: Stage[] = [
  {
    id: "stage-1",
    label: "Stage 01",
    title: "Foundations of Wealth Architecture",
    level: "Beginner",
    summary:
      "Compounding, real yield, liquidity and asset allocation — the mechanical bedrock every later idea rests on.",
    icon: "compass",
    lessons: [
      {
        id: "s1-l1",
        title: "The Compounding Engine",
        subtitle: "Why time matters more than the amount",
        minutes: 6,
        xp: 40,
        sections: [
          {
            heading: "Time is the exponent",
            body: "Compounding turns a linear series of deposits into an exponential curve because each period's return is earned on prior returns. The base is your capital; the exponent is time. That is why starting early usually beats contributing more later.",
          },
          {
            heading: "The Rule of 72",
            body: "Divide 72 by your annual return to estimate the years needed to double. At 8%, money doubles roughly every 9 years; at 4%, every 18. It is a fast mental approximation for exponential growth.",
          },
          {
            heading: "The cost of delay",
            body: "10,000 invested at 8% grows to about 217,000 in 40 years, but only about 100,000 in 30. The final decade does nearly half of the work — which is precisely the decade a late start forfeits.",
          },
        ],
        takeaways: [
          "Returns earn returns; time, not timing, drives the curve.",
          "Rule of 72: years to double is roughly 72 divided by the annual return.",
          "Late starts forfeit the steepest part of the exponential.",
        ],
        quiz: {
          prompt: "At an 8% annual return, roughly how long does the Rule of 72 say money takes to double?",
          options: ["About 5 years", "About 9 years", "About 14 years"],
          correctIndex: 1,
          explanation: "72 divided by 8 equals 9 years. The Rule of 72 is a fast mental approximation for exponential doubling.",
        },
      },
      {
        id: "s1-l2",
        title: "Inflation & Real Yield",
        subtitle: "The silent tax on idle capital",
        minutes: 5,
        xp: 40,
        sections: [
          {
            heading: "Nominal versus real",
            body: "A 6% nominal return alongside 4% inflation leaves roughly 2% of real purchasing-power growth. What compounds your lifestyle is the real rate, not the headline number on the screen.",
          },
          {
            heading: "The silent tax",
            body: "At 3% inflation, 100 today buys about 74 worth in ten years. Cash held in a deposit is 'safe' in nominal terms but a guaranteed, slow loss in real terms.",
          },
          {
            heading: "Fighting back",
            body: "Equities, inflation-linked bonds and real assets have historically preserved purchasing power better than deposits — at the cost of short-term volatility you must be able to sit through.",
          },
        ],
        takeaways: [
          "Real return is approximately nominal return minus inflation.",
          "Cash is safe nominally but risky in real terms.",
          "Match the asset to the horizon you can actually hold.",
        ],
        quiz: {
          prompt: "Nominal return is 6% and inflation is 4%. What is the approximate real return?",
          options: ["10%", "6%", "2%"],
          correctIndex: 2,
          explanation: "Real return is approximately nominal minus inflation: 6% minus 4% is about 2%.",
        },
      },
      {
        id: "s1-l3",
        title: "Liquidity & Asset Allocation",
        subtitle: "The only free lunch in finance",
        minutes: 7,
        xp: 40,
        sections: [
          {
            heading: "Liquidity is a price, not a label",
            body: "A liquid asset can be sold quickly at a fair price. Liquidity is not binary — it depends on the size you trade and the market conditions at that moment.",
          },
          {
            heading: "The emergency buffer",
            body: "Holding three to six months of expenses in cash equivalents prevents forced selling of long-term assets during a shock. The buffer's job is to protect the portfolio, not to earn a return.",
          },
          {
            heading: "Diversification is the only free lunch",
            body: "Combining assets with low correlation reduces portfolio volatility without proportionally sacrificing expected return — Markowitz's core insight. Allocation, not stock-picking, explains most of the variation in long-run results.",
          },
        ],
        takeaways: [
          "Illiquid assets must offer a premium to compensate for the lock-up.",
          "Cash reserves stop you selling at the worst possible time.",
          "Low correlation, not more holdings, is what actually diversifies.",
        ],
        quiz: {
          prompt: "Which asset is the least liquid for a retail investor?",
          options: ["A large-cap index ETF", "A private equity fund interest", "A US Treasury bill"],
          correctIndex: 1,
          explanation:
            "Private equity interests are locked up for years and cannot be sold quickly at fair value, unlike an ETF or a Treasury bill.",
        },
      },
    ],
  },
  {
    id: "stage-2",
    label: "Stage 02",
    title: "Financial Statement Decryption",
    level: "Intermediate",
    summary:
      "Read the three statements as one system, judge cash conversion, and spot the accounting that flatters a headline number.",
    icon: "book",
    lessons: [
      {
        id: "s2-l1",
        title: "The Three Statements Are One",
        subtitle: "One flow, three views",
        minutes: 7,
        xp: 55,
        sections: [
          {
            heading: "A single flow, three views",
            body: "Net income feeds retained earnings on the balance sheet and is the starting point of the operating section of the cash flow statement. Change one assumption and all three statements move.",
          },
          {
            heading: "Why the cash flow statement exists",
            body: "Non-cash charges such as depreciation reduce net income but are added back, because no cash actually left the business. That is why cash flow can diverge sharply from reported profit.",
          },
          {
            heading: "Working capital is the bridge",
            body: "Growth consumes cash through receivables and inventory. A fast-growing, profitable company can still run out of cash if working capital balloons faster than collections.",
          },
        ],
        takeaways: [
          "The statements are articulated: one decision moves all three.",
          "Depreciation lowers profit but is added back in operating cash flow.",
          "Growth in working capital is a real cash outflow.",
        ],
        quiz: {
          prompt:
            "Depreciation reduces net income but is added back in which section of the cash flow statement?",
          options: ["Investing", "Operating", "Financing"],
          correctIndex: 1,
          explanation:
            "Under the indirect method, depreciation is a non-cash add-back inside operating activities.",
        },
      },
      {
        id: "s2-l2",
        title: "Free Cash Flow Conversion",
        subtitle: "Cash, not accrual profit, is the truth",
        minutes: 7,
        xp: 55,
        sections: [
          {
            heading: "Free cash flow is what is left",
            body: "Free cash flow equals operating cash flow minus capital expenditure. It is the cash available to repay debt, pay dividends or reinvest — the money that actually funds shareholder returns.",
          },
          {
            heading: "Conversion is the quality test",
            body: "Compare free cash flow to net income over several years. Persistent FCF below net income means reported profits are tied up in working capital or capex rather than landing in the bank.",
          },
          {
            heading: "Capex reveals the business model",
            body: "Asset-light firms convert most of their profit into cash. Capital-intensive firms must re-invest constantly just to stand still, which structurally lowers cash conversion.",
          },
        ],
        takeaways: [
          "Free cash flow equals operating cash flow minus capex.",
          "Cash, not accrual profit, funds buybacks and dividends over time.",
          "High capex intensity lowers cash conversion.",
        ],
        quiz: {
          prompt:
            "A company reports rising net income but negative operating cash flow for three straight years. The most likely explanation is…",
          options: [
            "Aggressive revenue recognition or a working-capital build-up",
            "A rising share price",
            "Higher dividend payments",
          ],
          correctIndex: 0,
          explanation:
            "When profit grows but cash does not, revenue is often being booked faster than it is collected — a classic earnings-quality flag.",
        },
      },
      {
        id: "s2-l3",
        title: "Operating Leverage & Earnings Quality",
        subtitle: "How fixed costs amplify everything",
        minutes: 7,
        xp: 55,
        sections: [
          {
            heading: "Fixed costs amplify",
            body: "Operating leverage measures the share of fixed versus variable costs. High fixed costs mean a small change in revenue produces a large swing in operating profit — in both directions.",
          },
          {
            heading: "Margin expansion is earned",
            body: "Margins rise when revenue grows faster than fixed costs. But the same structure punishes you when sales fall, which makes high-leverage businesses structurally more cyclical.",
          },
          {
            heading: "Reading the red flags",
            body: "Watch for days-sales-outstanding creeping above revenue growth, frequent 'one-time' charges, and profits outpacing cash. Quality of earnings matters more than the headline number.",
          },
        ],
        takeaways: [
          "High operating leverage cuts both ways.",
          "Margins expand when a small sales gain covers fixed costs.",
          "Compare profit growth to cash growth to spot accounting games.",
        ],
        quiz: {
          prompt: "Which of these is a classic earnings-quality red flag?",
          options: [
            "Receivables growing much faster than revenue",
            "A rising gross margin",
            "A falling share count",
          ],
          correctIndex: 0,
          explanation:
            "Receivables outrunning revenue suggests sales are being booked but not collected, or demand is being pulled forward.",
        },
      },
    ],
  },
  {
    id: "stage-3",
    label: "Stage 03",
    title: "Valuation Multiples & DCF",
    level: "Advanced",
    summary:
      "Enterprise value, discount rates and terminal value — what a multiple really says, and where every DCF quietly hides its biggest assumption.",
    icon: "chart",
    lessons: [
      {
        id: "s3-l1",
        title: "EV/EBITDA & Comparable Analysis",
        subtitle: "A yardstick, not a verdict",
        minutes: 8,
        xp: 70,
        sections: [
          {
            heading: "Enterprise value",
            body: "Enterprise value equals market capitalisation plus net debt. It is the price of the whole business rather than just the equity, which is why it pairs naturally with EBITDA — a pre-financing profit measure.",
          },
          {
            heading: "Why it travels well",
            body: "EV/EBITDA is capital-structure neutral, so it compares companies with different debt loads more fairly than a P/E. Use it as a quick relative-value yardstick, never as a valuation in itself.",
          },
          {
            heading: "Where the multiple lies",
            body: "EBITDA ignores capital expenditure, working capital and stock-based compensation. For capital-intensive or SBC-heavy businesses it can flatter profitability badly.",
          },
        ],
        takeaways: [
          "Enterprise value equals equity value plus net debt.",
          "EV/EBITDA neutralises capital structure.",
          "Multiples are relative; a discounted cash flow is absolute.",
        ],
        quiz: {
          prompt: "EV/EBITDA is often preferred over P/E for comparing companies because it…",
          options: [
            "Reflects capital structure differences more neutrally",
            "Removes the effect of taxes only",
            "Guarantees a fair value",
          ],
          correctIndex: 0,
          explanation:
            "By pairing enterprise value with a pre-interest profit measure, EV/EBITDA is less distorted by differing debt levels.",
        },
      },
      {
        id: "s3-l2",
        title: "Discount Rates & WACC",
        subtitle: "Small inputs, enormous outputs",
        minutes: 8,
        xp: 70,
        sections: [
          {
            heading: "Every future is discounted",
            body: "A discount rate converts future cash flows into today's value. Higher perceived risk demands a higher rate, which mechanically lowers present value.",
          },
          {
            heading: "The WACC formula",
            body: "The weighted average cost of capital blends the after-tax cost of debt and the cost of equity in proportion to their target weights. The cost of equity is usually estimated with the capital asset pricing model.",
          },
          {
            heading: "Sensitivity dominates",
            body: "Because discounting compounds, a one percentage point change in WACC can move a valuation by 15–20%. Small modelling errors dominate the final answer.",
          },
        ],
        takeaways: [
          "Value falls as the discount rate rises.",
          "WACC blends after-tax cost of debt and cost of equity by weight.",
          "Valuations are extremely sensitive to the discount rate.",
        ],
        quiz: {
          prompt:
            "If a company's WACC rises while its projected cash flows stay the same, its intrinsic value will…",
          options: ["Rise", "Fall", "Stay the same"],
          correctIndex: 1,
          explanation: "A higher discount rate shrinks the present value of every future cash flow.",
        },
      },
      {
        id: "s3-l3",
        title: "Terminal Value & Multiple Expansion",
        subtitle: "The elephant in the DCF",
        minutes: 9,
        xp: 70,
        sections: [
          {
            heading: "The elephant in the DCF",
            body: "In most models the terminal value is 60–80% of total value. It assumes the business grows at a perpetual rate, usually no higher than long-run nominal economic growth.",
          },
          {
            heading: "Two ways to estimate it",
            body: "The Gordon growth model applies a perpetual growth rate; the exit-multiple method applies a future EV/EBITDA. Both are assumptions wearing a formula.",
          },
          {
            heading: "Growth versus re-rating",
            body: "Total return is roughly earnings growth plus dividend yield plus the change in multiple. Multiple expansion is sentiment; when it reverses, strong earnings growth can still produce a loss.",
          },
        ],
        takeaways: [
          "Terminal value often dominates the discounted cash flow.",
          "Perpetual growth cannot exceed long-run economic growth.",
          "A de-rating can erase very real earnings growth.",
        ],
        quiz: {
          prompt: "A terminal growth rate set above long-run nominal GDP growth is best described as…",
          options: ["Conservative and safe", "A valuation red flag", "Evidence of a moat"],
          correctIndex: 1,
          explanation:
            "If a company grows faster than the whole economy forever, it eventually becomes the economy — mathematically convenient but economically implausible.",
        },
      },
    ],
  },
  {
    id: "stage-4",
    label: "Stage 04",
    title: "Portfolio Optimization & Convexity",
    level: "Expert",
    summary:
      "Risk-adjusted performance, the asymmetry of drawdowns, tail hedging and the discipline of systematic rebalancing.",
    icon: "target",
    lessons: [
      {
        id: "s4-l1",
        title: "Sharpe, Sortino & What Risk Really Means",
        subtitle: "Return per unit of pain",
        minutes: 7,
        xp: 90,
        sections: [
          {
            heading: "Risk-adjusted, not just return",
            body: "The Sharpe ratio divides excess return by volatility. It answers a single question: how much return did you earn for each unit of total risk taken?",
          },
          {
            heading: "Not all volatility is equal",
            body: "Investors fear losses, not upside. Sortino uses only downside deviation, so a strategy with large positive outliers is rewarded rather than penalised.",
          },
          {
            heading: "Choose the right lens",
            body: "Use Sharpe to compare similar strategies; use Sortino when the return distribution is skewed. No single ratio captures everything, and none of them predict the future.",
          },
        ],
        takeaways: [
          "Sharpe equals excess return divided by standard deviation.",
          "Sortino penalises only downside volatility.",
          "Risk ratios describe; they do not predict.",
        ],
        quiz: {
          prompt: "The Sortino ratio differs from the Sharpe ratio because it…",
          options: [
            "Only penalises downside volatility",
            "Ignores the risk-free rate",
            "Uses total return instead of excess return",
          ],
          correctIndex: 0,
          explanation:
            "Sortino divides excess return by downside deviation, so upside volatility is not treated as risk.",
        },
      },
      {
        id: "s4-l2",
        title: "Drawdown Math & Recovery",
        subtitle: "Why losses are asymmetric",
        minutes: 6,
        xp: 90,
        sections: [
          {
            heading: "Losses are asymmetric",
            body: "A 50% loss requires a 100% gain just to break even. Percentage losses and gains are not symmetric, which is why avoiding deep drawdowns matters more than chasing large wins.",
          },
          {
            heading: "The recovery ladder",
            body: "Down 20% you need 25%; down 33% you need 50%; down 50% you need 100%. The deeper the hole, the steeper the climb back to level.",
          },
          {
            heading: "Time is the other cost",
            body: "Drawdowns also cost years. A portfolio that stalls for a decade risks failing the goal even if it eventually recovers in price.",
          },
        ],
        takeaways: [
          "Loss and recovery percentages are asymmetric.",
          "Avoiding the big drawdown protects compounding.",
          "Drawdowns cost time as well as money.",
        ],
        quiz: {
          prompt: "After a 50% loss, what gain is required to get back to breakeven?",
          options: ["50%", "75%", "100%"],
          correctIndex: 2,
          explanation: "From 100 to 50 you must double: 50 multiplied by 2 is 100, so you need a 100% gain.",
        },
      },
      {
        id: "s4-l3",
        title: "Tail Risk & The Barbell",
        subtitle: "Survive the rare disaster",
        minutes: 8,
        xp: 90,
        sections: [
          {
            heading: "Markets have fat tails",
            body: "Returns are not normally distributed. Extreme moves happen far more often than a bell curve implies, so volatility alone understates true risk.",
          },
          {
            heading: "The barbell",
            body: "Hold very safe assets on one side and a small allocation of high-convexity bets on the other, leaving little in the fragile middle. You cap ruin while keeping the upside open.",
          },
          {
            heading: "Insurance, not prediction",
            body: "Tail hedges such as puts or convexity are meant to pay off in the rare disaster, not to generate steady income. Their cost is the premium you pay for survival.",
          },
        ],
        takeaways: [
          "Fat tails mean extremes are more likely than models suggest.",
          "The barbell pairs safe assets with small, convex bets.",
          "Hedging is bought for the tail, not for the average.",
        ],
        quiz: {
          prompt: "A 'barbell' portfolio is characterised by…",
          options: [
            "Equal weights across all assets",
            "Very safe assets plus a small allocation of high-convexity bets",
            "Concentration in one high-growth stock",
          ],
          correctIndex: 1,
          explanation:
            "The barbell avoids the fragile middle: extreme safety on one end and small, convex, asymmetric bets on the other.",
        },
      },
    ],
  },
];

// ─────────────────────────── Scenario simulations ───────────────────────────

export const SCENARIOS: Scenario[] = [
  {
    id: "scn-rate-shock",
    title: "The Rate Shock",
    timeframe: "Macro • 1 trading day",
    setup:
      "The central bank surprises markets with a 75bp hike and signals 'higher for longer'. Your portfolio is heavy in long-duration growth equities and 30-year government bonds.",
    metrics: [
      { label: "10Y yield", value: "+38bp", tone: "up" },
      { label: "Growth index", value: "−2.4%", tone: "down" },
      { label: "30Y bond ETF", value: "−3.1%", tone: "down" },
      { label: "Cash yield", value: "5.2%", tone: "flat" },
    ],
    question: "What is the most defensible response?",
    options: [
      {
        text: "Rotate toward short-duration quality, value, and cash-like assets",
        score: 2,
        outcome:
          "Duration and discounted cash flows are the epicentre of a rate shock. Reducing duration and favouring near-term cash flows aligns you with the new regime rather than fighting it.",
      },
      {
        text: "Hold everything — time in the market beats timing the market",
        score: 1,
        outcome:
          "Discipline is admirable, but 'do nothing' ignores that your portfolio's risk profile just changed. A regime shift warrants a risk review, not inertia.",
      },
      {
        text: "Double down on the most beaten-down growth names",
        score: 0,
        outcome:
          "Averaging down into the source of the shock compounds your exposure to the exact factor being repriced. That is conviction, not analysis.",
      },
    ],
    debrief:
      "When the risk-free rate jumps, every long-duration cash flow is repriced lower. The question is never simply up or down — it is which assets are most sensitive to the new discount rate.",
    xp: 60,
  },
  {
    id: "scn-value-trap",
    title: "The Value Trap",
    timeframe: "Equity • Due diligence",
    setup:
      "A legacy retailer trades at 5x earnings, a third of its sector. Revenue has declined four years running, debt is 4x EBITDA, and the 9% dividend is being funded from borrowings.",
    metrics: [
      { label: "P/E", value: "5.0x", tone: "flat" },
      { label: "Revenue trend", value: "−6% / yr", tone: "down" },
      { label: "Net debt / EBITDA", value: "4.2x", tone: "down" },
      { label: "Dividend cover", value: "<0.6x FCF", tone: "down" },
    ],
    question: "How should you treat this 'cheap' stock?",
    options: [
      {
        text: "Treat it as a value trap until the balance sheet and cash flow prove otherwise",
        score: 2,
        outcome:
          "A low multiple on shrinking fundamentals is a decaying asset, not a bargain. With debt-funded dividends and real leverage, the equity is fragile and the cheapness is the market pricing in genuine risk.",
      },
      {
        text: "Buy it — a 5x multiple is a margin of safety by itself",
        score: 0,
        outcome:
          "A low multiple is only a margin of safety if the earnings are durable. Here they are shrinking and financed by debt — you are buying a melting ice cube at a discount.",
      },
      {
        text: "Wait for the dividend yield to rise to 12% before buying",
        score: 0,
        outcome:
          "Anchoring on a higher yield ignores that a rising yield here signals rising default risk, not a larger discount.",
      },
    ],
    debrief:
      "Cheap is not the same as safe. Before buying a low multiple, ask why it is low: declining demand, leverage and an unsustainable payout are all reasons the market may simply be right.",
    xp: 60,
  },
  {
    id: "scn-runaway-winner",
    title: "The Runaway Winner",
    timeframe: "Portfolio • Rebalance day",
    setup:
      "One holding has tripled and now accounts for 45% of your equity portfolio. Your written investment plan targets a maximum single-position weight of 10%.",
    metrics: [
      { label: "Position weight", value: "45%", tone: "up" },
      { label: "Total gain", value: "+300%", tone: "up" },
      { label: "Plan max weight", value: "10%", tone: "flat" },
      { label: "Portfolio beta", value: "1.6", tone: "up" },
    ],
    question: "What does disciplined portfolio management call for?",
    options: [
      {
        text: "Trim back toward the target weight and redeploy the proceeds",
        score: 2,
        outcome:
          "Your process, not your emotions, should set weights. Trimming restores your intended risk level and locks in gains without abandoning the position.",
      },
      {
        text: "Let it ride — you never cut your winners",
        score: 1,
        outcome:
          "Momentum is real, but a 45% weight means a single company now dominates your outcomes. Letting it ride is concentration dressed up as conviction.",
      },
      {
        text: "Sell the entire position immediately",
        score: 0,
        outcome:
          "An all-or-nothing reaction turns a risk-management decision into a market-timing bet. The plan says reduce to target, not to zero.",
      },
    ],
    debrief:
      "Position sizing is a decision, and drift is a silent decision. Rebalancing forces you to sell what has grown and buy what has shrunk — the opposite of what feels intuitive.",
    xp: 60,
  },
  {
    id: "scn-liquidity-squeeze",
    title: "The Liquidity Squeeze",
    timeframe: "Planning • 6-month horizon",
    setup:
      "You will need 120,000 in six months for a property purchase, but 80% of your portfolio sits in private credit and real-estate funds with multi-year lock-ups.",
    metrics: [
      { label: "Liquid assets", value: "30k", tone: "down" },
      { label: "Illiquid funds", value: "450k", tone: "flat" },
      { label: "Redemption window", value: "3–5 yrs", tone: "down" },
      { label: "Secondary discount", value: "−12%", tone: "down" },
    ],
    question: "What is the core mistake to correct here?",
    options: [
      {
        text: "Horizon mismatch — near-term needs must be funded by liquid, stable assets",
        score: 2,
        outcome:
          "Money you need soon should never depend on assets you cannot sell soon. Ladder known liabilities against liquid holdings and reserve illiquidity for distant goals.",
      },
      {
        text: "Borrow against the illiquid funds to cover the shortfall",
        score: 1,
        outcome:
          "Leverage can bridge a gap, but it adds cost and a new failure mode — a margin call — to a position that is already illiquid.",
      },
      {
        text: "Nothing — the funds have performed well",
        score: 0,
        outcome:
          "Performance is irrelevant if you are forced to sell at a 12% discount. Liquidity risk shows up exactly when you can least afford it.",
      },
    ],
    debrief:
      "Liquidity is a property of your whole balance sheet, not of a single asset. Match the liquidity of your assets to the timing of your liabilities, or the market will do it for you.",
    xp: 60,
  },
];

// ─────────────────────────── Wall Street mental models ───────────────────────────

export const MENTAL_MODELS: MentalModel[] = [
  {
    id: "mm-circle",
    name: "Circle of Competence",
    origin: "Warren Buffett",
    tagline: "Know the edge of what you actually understand.",
    principle:
      "Returns come from understanding a business better than the market does. Outside your circle, your edge is negative because you cannot distinguish a bargain from a trap.",
    inPractice:
      "Before sizing a position, write one paragraph explaining why the market is wrong. If you cannot, the position belongs in the 'too hard' pile.",
    pitfall:
      "Confusing familiarity with competence — owning an iPhone is not the same as understanding Apple's supply chain and capital allocation.",
  },
  {
    id: "mm-margin",
    name: "Margin of Safety",
    origin: "Benjamin Graham",
    tagline: "Buy at a discount to a conservative estimate of value.",
    principle:
      "Valuation is imprecise, so the gap between price and your estimate of intrinsic value is the buffer that absorbs your errors and bad luck.",
    inPractice:
      "Demand a 30–50% discount to a deliberately conservative valuation, and shrink the required discount only as conviction and predictability rise.",
    pitfall:
      "Treating a precise DCF as truth. A margin of safety built on garbage inputs is garbage multiplied by 0.7.",
  },
  {
    id: "mm-second-order",
    name: "Second-Order Thinking",
    origin: "Howard Marks",
    tagline: "And then what happens?",
    principle:
      "First-order thinking stops at the obvious consequence. Markets are priced on consensus first-order views, so excess returns live in the second and third consequences.",
    inPractice:
      "For every forecast, ask 'and then what?' three times. The interesting insight is usually at step three, where consensus has not yet travelled.",
    pitfall:
      "Infinite regress — chasing consequences so far out that the chain becomes unfalsifiable and you never act.",
  },
  {
    id: "mm-reflexivity",
    name: "Reflexivity",
    origin: "George Soros",
    tagline: "Prices do not just reflect fundamentals — they shape them.",
    principle:
      "Perception and reality feed back into each other. A rising price can improve a company's real access to capital, which validates the rise, until the loop breaks.",
    inPractice:
      "In credit-driven or narrative-driven markets, watch the feedback loop itself: which prices are now financing the fundamentals they claim to describe?",
    pitfall:
      "Assuming you can time the turn. Reflexive loops overshoot in both directions, and being early is indistinguishable from being wrong.",
  },
  {
    id: "mm-inversion",
    name: "Inversion",
    origin: "Charlie Munger",
    tagline: "Ask how this fails, not just how it works.",
    principle:
      "It is often easier to identify what guarantees failure than what guarantees success. Avoiding ruin compounds better than chasing brilliance.",
    inPractice:
      "Before investing, list the three ways you could permanently lose money. If any is plausible and unhedged, resize or pass.",
    pitfall:
      "Downside-only paralysis — if every risk must be eliminated, nothing is ever owned and the portfolio never compounds.",
  },
  {
    id: "mm-base-rates",
    name: "Base Rates & Probabilistic Thinking",
    origin: "Kahneman & Tversky",
    tagline: "Start from the outside view, not the story.",
    principle:
      "The vivid story in front of you is a single data point. The reference class — how similar situations usually resolve — is the prior you should update from.",
    inPractice:
      "Ask what percentage of companies with this profile historically succeeded, then adjust for the specific edge you believe you have.",
    pitfall:
      "Trusting a normal distribution. Real return distributions are fat-tailed, so rare outcomes are far more likely than the base rate suggests.",
  },
  {
    id: "mm-asymmetry",
    name: "Asymmetric Payoffs",
    origin: "Nassim Taleb",
    tagline: "Cap the downside; keep the upside open.",
    principle:
      "A barbell structure — extreme safety plus a small allocation of convex bets — lets you survive the tail while preserving unlimited upside if it arrives.",
    inPractice:
      "Ask of every position: what is my maximum loss, and is my gain truly open-ended? Prefer many small bets with finite downside.",
    pitfall:
      "Overpaying for optionality. Insurance priced too expensively is a guaranteed slow loss dressed up as protection.",
  },
  {
    id: "mm-opportunity-cost",
    name: "Opportunity Cost & Cost of Capital",
    origin: "Capital Allocation",
    tagline: "Every dollar competes with its best alternative use.",
    principle:
      "A return is only good relative to the next best use of the same capital. Judging an investment in isolation hides the true cost of holding it.",
    inPractice:
      "Compare each position against your best current idea and against the risk-free rate. If it cannot beat them, it is a candidate for the exit.",
    pitfall:
      "Sunk-cost anchoring — holding a loser because of what you paid, when the next best use of that dollar is objectively better.",
  },
];

// ─────────────────────────── Badges ───────────────────────────

export const BADGES: BadgeDef[] = [
  {
    id: "first-steps",
    name: "First Steps",
    description: "Complete your first lesson.",
    icon: "zap",
    tier: "bronze",
  },
  {
    id: "perfect-recall",
    name: "Perfect Recall",
    description: "Answer a lesson quiz correctly on your first attempt.",
    icon: "star",
    tier: "bronze",
  },
  {
    id: "statement-sleuth",
    name: "Statement Sleuth",
    description: "Complete every lesson in Financial Statement Decryption.",
    icon: "book",
    tier: "silver",
  },
  {
    id: "scenario-strategist",
    name: "Scenario Strategist",
    description: "Work through three scenario simulations.",
    icon: "target",
    tier: "silver",
  },
  {
    id: "mental-modeler",
    name: "Mental Modeler",
    description: "Expand five Wall Street mental models.",
    icon: "brain",
    tier: "silver",
  },
  {
    id: "risk-architect",
    name: "Risk Architect",
    description: "Complete the Portfolio Optimization & Convexity stage.",
    icon: "shield",
    tier: "gold",
  },
  {
    id: "financial-mastery",
    name: "Financial Mastery",
    description: "Complete all twelve lessons across the four stages.",
    icon: "award",
    tier: "gold",
  },
  {
    id: "streak-keeper",
    name: "Streak Keeper",
    description: "Maintain a seven-day learning streak.",
    icon: "flame",
    tier: "gold",
  },
];

// ─────────────────────────── Progress, XP & levels ───────────────────────────

export interface LearningProgress {
  /** Completed lesson ids. */
  lessons: string[];
  /** Completed scenario ids. */
  scenarios: string[];
  /** Number of lesson quizzes answered correctly on the first attempt. */
  perfectFirstTry: number;
  /** Mental model ids the learner has expanded. */
  modelsViewed: string[];
}

export const EMPTY_PROGRESS: LearningProgress = {
  lessons: [],
  scenarios: [],
  perfectFirstTry: 0,
  modelsViewed: [],
};

/** XP every account starts with (matches the dashboard header baseline). */
export const BASE_XP = 450;

export const LEVELS: { level: number; title: string; threshold: number }[] = [
  { level: 1, title: "Apprentice Investor", threshold: 0 },
  { level: 2, title: "Market Analyst", threshold: 500 },
  { level: 3, title: "Portfolio Strategist", threshold: 1200 },
  { level: 4, title: "Risk Manager", threshold: 2200 },
  { level: 5, title: "Wall Street Operator", threshold: 3500 },
];

export interface LevelInfo {
  level: number;
  title: string;
  nextTitle: string | null;
  xpIntoLevel: number;
  xpForLevel: number;
  progressPct: number;
  isMax: boolean;
}

export function getLevelInfo(xp: number): LevelInfo {
  let current = LEVELS[0];
  let next: (typeof LEVELS)[number] | null = null;

  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].threshold) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
    }
  }

  if (!next) {
    return {
      level: current.level,
      title: current.title,
      nextTitle: null,
      xpIntoLevel: xp - current.threshold,
      xpForLevel: 0,
      progressPct: 100,
      isMax: true,
    };
  }

  const xpForLevel = next.threshold - current.threshold;
  const xpIntoLevel = xp - current.threshold;

  return {
    level: current.level,
    title: current.title,
    nextTitle: next.title,
    xpIntoLevel,
    xpForLevel,
    progressPct: Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100)),
    isMax: false,
  };
}

/** Total XP = baseline + every completed lesson + every completed scenario. */
export function computeXp(progress: LearningProgress): number {
  const lessonXp = STAGES.flatMap((stage) => stage.lessons)
    .filter((lesson) => progress.lessons.includes(lesson.id))
    .reduce((sum, lesson) => sum + lesson.xp, 0);

  const scenarioXp = SCENARIOS.filter((scenario) =>
    progress.scenarios.includes(scenario.id)
  ).reduce((sum, scenario) => sum + scenario.xp, 0);

  return BASE_XP + lessonXp + scenarioXp;
}

export const TOTAL_LESSONS = STAGES.reduce((sum, stage) => sum + stage.lessons.length, 0);

/** A badge is unlocked when its rule is satisfied by the current progress. */
export function isBadgeUnlocked(badgeId: string, progress: LearningProgress): boolean {
  switch (badgeId) {
    case "first-steps":
      return progress.lessons.length >= 1;
    case "perfect-recall":
      return progress.perfectFirstTry >= 1;
    case "statement-sleuth":
      return STAGES[1].lessons.every((lesson) => progress.lessons.includes(lesson.id));
    case "scenario-strategist":
      return progress.scenarios.length >= 3;
    case "mental-modeler":
      return progress.modelsViewed.length >= 5;
    case "risk-architect":
      return STAGES[3].lessons.every((lesson) => progress.lessons.includes(lesson.id));
    case "financial-mastery":
      return progress.lessons.length >= TOTAL_LESSONS;
    default:
      return false;
  }
}
