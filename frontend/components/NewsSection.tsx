import React from "react";
import {
  NewspaperIcon,
  SparklesIcon,
  TrendingUpIcon,
  LightbulbIcon,
  CheckCircle2Icon,
  ZapIcon,
  BarChart3Icon,
} from "./Icons";

export function NewsSection() {
  const newsCapabilities = [
    {
      icon: <SparklesIcon size={22} className="text-[#8A6A00]" />,
      title: "30-Second AI Digests",
      description:
        "Long-form financial reporting distilled into quick, scannable bullet points. Read in 30 seconds what would otherwise take 15 minutes of reading.",
    },
    {
      icon: <TrendingUpIcon size={22} className="text-[#8A6A00]" />,
      title: "Automated Market Sentiment",
      description:
        "Every market development is evaluated by AI algorithms to determine its net directional bias: Bullish, Bearish, or Neutral for relevant sectors.",
    },
    {
      icon: <LightbulbIcon size={22} className="text-[#8A6A00]" />,
      title: "Educational Concept Callouts",
      description:
        "Never get lost in economic terms. Each story highlights the foundational financial principle at play—such as discount rates, yield curves, or liquidity cycles.",
    },
    {
      icon: <ZapIcon size={22} className="text-[#8A6A00]" />,
      title: "Zero Clickbait & Noise Filtering",
      description:
        "Proprietary AI filters deduplicate repetitive news wires and eliminate sensationalist headlines to focus purely on verifiable data and regulatory disclosures.",
    },
    {
      icon: <BarChart3Icon size={22} className="text-[#8A6A00]" />,
      title: "Cross-Sector Multi-Asset Scope",
      description:
        "Unified coverage across equities, macro monetary policy, commodities, credit markets, and digital assets in one clean stream.",
    },
    {
      icon: <NewspaperIcon size={22} className="text-[#8A6A00]" />,
      title: "Real-Time Trend Correlation",
      description:
        "Understand how a central bank rate announcement impacts currency valuations, tech multiples, and mortgage rates simultaneously.",
    },
  ];

  const coveredSectors = [
    {
      name: "Macro & Central Banks",
      details: "Interest rate trajectories, inflation metrics (CPI, PCE), GDP revisions, and fiscal debt policy.",
    },
    {
      name: "Technology & AI",
      details: "Hyperscaler Capex, semiconductor supply chains, cloud earnings, and enterprise software.",
    },
    {
      name: "Equities & Earnings",
      details: "Quarterly 10-Q/10-K releases, guidance revisions, profit margins, and corporate governance.",
    },
    {
      name: "Crypto & Digital Assets",
      details: "Institutional spot flows, protocol economics, regulatory sandboxes, and settlement infrastructure.",
    },
  ];

  return (
    <section id="news" className="py-20 sm:py-28 relative scroll-mt-20 bg-[#F8F7F4] border-t border-[#E8E5DE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#E8D8B0] text-[#8A6A00] text-xs font-semibold uppercase tracking-wider">
            <NewspaperIcon size={14} />
            <span>Pillar 3 • Curated Financial News</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#191C24] tracking-tight">
            Cut Through Noise with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#191C24] via-[#8A6A00] to-[#D4AF37]">
              30-Second AI News Intelligence
            </span>
          </h2>
          <p className="text-[#5F6470] text-base sm:text-lg">
            Stop drowning in hundreds of fragmented financial articles. Mostro AI monitors global
            markets, strips away fluff, and delivers concise summaries paired with educational takeaways.
          </p>
        </div>

        {/* Sectors Covered Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {coveredSectors.map((sector, idx) => (
            <div
              key={idx}
              className="glass-panel-light p-5 rounded-2xl border border-[#E8E5DE] space-y-2 bg-white shadow-xs"
            >
              <h4 className="text-sm font-bold text-[#191C24] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                {sector.name}
              </h4>
              <p className="text-xs text-[#5F6470] leading-relaxed">{sector.details}</p>
            </div>
          ))}
        </div>

        {/* Core Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsCapabilities.map((cap, idx) => (
            <div
              key={idx}
              className="glass-panel-light p-6 sm:p-7 rounded-3xl border border-[#E8E5DE] space-y-3 bg-white hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-[#F8F7F4] border border-[#E8E5DE] w-fit">
                  {cap.icon}
                </div>
                <h3 className="text-base font-bold text-[#191C24]">{cap.title}</h3>
                <p className="text-xs sm:text-sm text-[#5F6470] leading-relaxed font-normal">
                  {cap.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E8E5DE] flex items-center gap-2 text-xs font-semibold text-[#8A6A00]">
                <CheckCircle2Icon size={14} />
                <span>Continuous 24/7 sector monitoring</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
