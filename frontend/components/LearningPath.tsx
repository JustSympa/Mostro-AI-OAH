import React from "react";
import {
  CompassIcon,
  AwardIcon,
  ZapIcon,
  CheckCircle2Icon,
  TargetIcon,
  LightbulbIcon,
  FlameIcon,
  BarChart3Icon,
} from "./Icons";

export function LearningPath() {
  const capabilities = [
    {
      icon: <TargetIcon size={20} className="text-[#8A6A00]" />,
      title: "Step-by-Step Level Roadmaps",
      description:
        "Curated progression taking you from compounding foundations to financial statement analysis and risk management.",
    },
    {
      icon: <AwardIcon size={20} className="text-[#8A6A00]" />,
      title: "XP & Achievement System",
      description:
        "Earn experience points, unlock achievement badges, and level up your investor rank as you master each financial discipline.",
    },
    {
      icon: <FlameIcon size={20} className="text-[#8A6A00]" />,
      title: "Daily Habit Streaks",
      description:
        "Build consistent financial literacy with daily bite-sized micro-lessons and streak tracking designed for busy schedules.",
    },
    {
      icon: <LightbulbIcon size={20} className="text-[#8A6A00]" />,
      title: "Actionable Market Tricks",
      description:
        "Unlock battle-tested Wall Street heuristics, practical mental models, and market rules of thumb that professionals use daily.",
    },
    {
      icon: <ZapIcon size={20} className="text-[#8A6A00]" />,
      title: "Interactive Knowledge Checks",
      description:
        "Reinforce your comprehension with scenario-based challenges and instant feedback to ensure you truly master every concept.",
    },
    {
      icon: <BarChart3Icon size={20} className="text-[#8A6A00]" />,
      title: "Real-World Application",
      description:
        "Bridge the gap between theoretical knowledge and real market decision-making with institutional-grade frameworks.",
    },
  ];

  const roadmapStages = [
    {
      stage: "Stage 01",
      title: "Foundations of Wealth",
      focus: "Compounding, real yield vs inflation, liquidity architecture, and passive asset allocation.",
      badge: "Beginner",
    },
    {
      stage: "Stage 02",
      title: "Market & Order Mechanics",
      focus: "Order book dynamics, limit vs market orders, bid-ask spread friction, and liquidity flow.",
      badge: "Intermediate",
    },
    {
      stage: "Stage 03",
      title: "Financial Statement Analysis",
      focus: "Forensic 10-K reading, Free Cash Flow to Equity, revenue quality, and valuation multiples.",
      badge: "Advanced",
    },
    {
      stage: "Stage 04",
      title: "Options, Hedging & Derivatives",
      focus: "Option Greeks, volatility management, covered calls, risk mitigation, and portfolio defense.",
      badge: "Professional",
    },
  ];

  return (
    <section id="learning-path" className="py-20 sm:py-28 relative scroll-mt-20 bg-[#F8F7F4] border-t border-[#E8E5DE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#E8D8B0] text-[#8A6A00] text-xs font-semibold uppercase tracking-wider">
            <CompassIcon size={14} />
            <span>Pillar 1 • Financial Learning</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#191C24] tracking-tight">
            Financial Education,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#191C24] via-[#8A6A00] to-[#D4AF37]">
              Reimagined as a Quest
            </span>
          </h2>
          <p className="text-[#5F6470] text-base sm:text-lg">
            Say goodbye to dry, intimidating textbooks. Mostro AI turns financial education into an
            engaging, level-based journey that builds genuine investing competence.
          </p>
        </div>

        {/* Structured Curriculum Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {roadmapStages.map((stage, idx) => (
            <div
              key={idx}
              className="glass-panel-light p-6 rounded-3xl border border-[#E8E5DE] space-y-3 bg-white flex flex-col justify-between hover:border-[#D4AF37]/50 transition-all shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#8A6A00] tracking-wider">
                    {stage.stage}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF6ED] text-[#8A6A00] border border-[#E8D8B0]">
                    {stage.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#191C24] leading-snug">
                  {stage.title}
                </h3>
                <p className="text-xs text-[#5F6470] leading-relaxed">
                  {stage.focus}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E8E5DE] flex items-center gap-2 text-xs font-medium text-[#191C24]">
                <CheckCircle2Icon size={14} className="text-[#8A6A00]" />
                <span>Includes milestone tricks & challenges</span>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Capabilities Grid */}
        <div className="glass-panel-light rounded-3xl p-8 sm:p-12 border border-[#E8E5DE] bg-white">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h3 className="text-2xl font-bold text-[#191C24]">How the Learning Quest Works</h3>
            <p className="text-xs sm:text-sm text-[#5F6470]">
              Designed around human-centered psychology to ensure knowledge sticks and transforms into
              real-world market confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#F8F7F4] border border-[#E8E5DE] space-y-2.5 hover:border-[#D4AF37]/40 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-white w-fit border border-[#E8E5DE] shadow-xs">
                  {cap.icon}
                </div>
                <h4 className="text-sm font-bold text-[#191C24]">{cap.title}</h4>
                <p className="text-xs text-[#5F6470] leading-relaxed font-normal">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
