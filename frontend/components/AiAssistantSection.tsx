import React from "react";
import {
  BotIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CheckCircle2Icon,
  LightbulbIcon,
  TargetIcon,
  CompassIcon,
} from "./Icons";

export function AiAssistantSection() {
  const assistantFeatures = [
    {
      icon: <SparklesIcon size={22} className="text-[#8A6A00]" />,
      title: "24/7 On-Demand Financial Clarity",
      description:
        "Never get stuck on confusing financial terms. Ask any question—from the basics of index funds to intricate derivative pricing—and receive immediate clarity.",
    },
    {
      icon: <ShieldCheckIcon size={22} className="text-[#8A6A00]" />,
      title: "Zero-Jargon Translations",
      description:
        "Trained to deconstruct dense Wall Street vernacular into simple, intuitive mental models without dumbing down the underlying math or economics.",
    },
    {
      icon: <TargetIcon size={22} className="text-[#8A6A00]" />,
      title: "SEC Filing & Report Breakdown",
      description:
        "Ask questions about balance sheet footnotes, auditor statements, revenue recognition changes, and corporate debt structures in plain English.",
    },
    {
      icon: <CompassIcon size={22} className="text-[#8A6A00]" />,
      title: "Integrated Quest Companion",
      description:
        "Acts as your personal tutor alongside the Financial Learning Path, helping you master tricky concepts and deep-dive into topics of interest.",
    },
    {
      icon: <LightbulbIcon size={22} className="text-[#8A6A00]" />,
      title: "Scenario & Risk Exploration",
      description:
        "Explore how different macroeconomic conditions (interest rate hikes, inflation spikes, currency swings) affect various asset classes and investment portfolios.",
    },
    {
      icon: <BotIcon size={22} className="text-[#8A6A00]" />,
      title: "100% Unbiased & Educational",
      description:
        "Built strictly for education and financial literacy. Mostro AI does not sell financial products, take commissions, or push sponsored tickers.",
    },
  ];

  return (
    <section id="ai-assistant" className="py-20 sm:py-28 relative scroll-mt-20 bg-white border-t border-[#E8E5DE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FAF6ED] border border-[#E8D8B0] text-[#8A6A00] text-xs font-semibold uppercase tracking-wider">
            <BotIcon size={14} />
            <span>Pillar 4 • AI Financial Assistant</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#191C24] tracking-tight">
            Clear Every Doubt with Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#191C24] via-[#8A6A00] to-[#D4AF37]">
              Personalized AI Copilot
            </span>
          </h2>
          <p className="text-[#5F6470] text-base sm:text-lg">
            Have questions about market mechanics, regulatory filings, or valuation ratios?
            Mostro AI provides instant, unbiased explanations tailored to your learning pace.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistantFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="glass-panel-light p-6 sm:p-7 rounded-3xl border border-[#E8E5DE] space-y-3 bg-[#F8F7F4] hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-white border border-[#E8E5DE] w-fit shadow-xs">
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold text-[#191C24]">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-[#5F6470] leading-relaxed font-normal">
                  {feat.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E8E5DE] flex items-center gap-2 text-xs font-semibold text-[#8A6A00]">
                <CheckCircle2Icon size={14} />
                <span>On-demand 24/7 intelligence</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
