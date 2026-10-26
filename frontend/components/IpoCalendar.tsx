import React from "react";
import {
  CalendarIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  SparklesIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  FlameIcon,
} from "./Icons";

export function IpoCalendar() {
  const ipoFeatures = [
    {
      icon: <CalendarIcon size={22} className="text-[#8A6A00]" />,
      title: "Real-Time Debut Tracking",
      description:
        "Monitor the entire IPO lifecycle from confidential draft submissions and formal S-1 registrations to pricing and opening bell trading.",
    },
    {
      icon: <SparklesIcon size={22} className="text-[#8A6A00]" />,
      title: "AI-Powered S-1 Digests",
      description:
        "Skip 300-page prospectus filings. Mostro AI distills business models, customer concentration, unit economics, and competitive moats into clear executive briefs.",
    },
    {
      icon: <FlameIcon size={22} className="text-[#8A6A00]" />,
      title: "Hype & Sentiment Analytics",
      description:
        "Gauge retail and institutional market excitement with proprietary AI-driven sentiment tracking and social buzz monitoring.",
    },
    {
      icon: <ShieldCheckIcon size={22} className="text-[#8A6A00]" />,
      title: "Independent Risk Scoring",
      description:
        "Identify balance sheet weaknesses, governance red flags, heavy dual-class share structures, and debt obligations before public trading begins.",
    },
    {
      icon: <BarChart3Icon size={22} className="text-[#8A6A00]" />,
      title: "Price Bands & Valuation Metrics",
      description:
        "Track preliminary price ranges, implied market valuations, revenue multiples, and post-listing dilution parameters in real time.",
    },
    {
      icon: <TrendingUpIcon size={22} className="text-[#8A6A00]" />,
      title: "Lockup Expiration Alerts",
      description:
        "Never get caught off guard by insider selling. Receive automated alerts ahead of 90-day and 180-day employee and venture lockup expirations.",
    },
  ];

  const trackingStages = [
    {
      title: "Rumored & Pipeline",
      desc: "Companies in late-stage private rounds preparing investment banks for initial filings.",
    },
    {
      title: "S-1 Filed & Review",
      desc: "Formal public filings under SEC review with initial financial disclosures and business breakdowns.",
    },
    {
      title: "Priced & Roadshow",
      desc: "Final price bands established and institutional book-building underway before debut.",
    },
    {
      title: "Newly Listed & Post-IPO",
      desc: "Day-one trading performance, volume velocity, and subsequent earnings reporting.",
    },
  ];

  return (
    <section id="ipo-calendar" className="py-20 sm:py-28 relative scroll-mt-20 bg-white border-t border-[#E8E5DE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FAF6ED] border border-[#E8D8B0] text-[#8A6A00] text-xs font-semibold uppercase tracking-wider">
            <CalendarIcon size={14} />
            <span>Pillar 2 • IPO Calendar & Discovery</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#191C24] tracking-tight">
            Never Miss a Market Debut with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#191C24] via-[#8A6A00] to-[#D4AF37]">
              Institutional IPO Intelligence
            </span>
          </h2>
          <p className="text-[#5F6470] text-base sm:text-lg">
            Stay informed on every upcoming listing. Mostro AI provides comprehensive tracking,
            regulatory S-1 filing analysis, expected valuation ranges, and data-backed risk ratings.
          </p>
        </div>

        {/* Tracking Stages Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {trackingStages.map((stage, idx) => (
            <div
              key={idx}
              className="glass-panel-light p-5 rounded-2xl border border-[#E8E5DE] space-y-2 bg-[#F8F7F4]"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                <h4 className="text-sm font-bold text-[#191C24]">{stage.title}</h4>
              </div>
              <p className="text-xs text-[#5F6470] leading-relaxed">{stage.desc}</p>
            </div>
          ))}
        </div>

        {/* Core Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ipoFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="glass-panel-light p-6 sm:p-7 rounded-3xl border border-[#E8E5DE] space-y-3 bg-white hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-[#F8F7F4] border border-[#E8E5DE] w-fit">
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold text-[#191C24]">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-[#5F6470] leading-relaxed font-normal">
                  {feat.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E8E5DE] flex items-center gap-2 text-xs font-semibold text-[#8A6A00]">
                <CheckCircle2Icon size={14} />
                <span>Continuous AI analysis</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
