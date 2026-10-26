import React from "react";
import { ShieldCheckIcon, AwardIcon, BarChart3Icon, ZapIcon, StarIcon } from "./Icons";

export function StatsSection() {
  const stats = [
    {
      value: "48,000+",
      label: "Active Financial Questers",
      sub: "Mastering markets daily",
      icon: <AwardIcon size={22} className="text-emerald-400" />,
    },
    {
      value: "1,250+",
      label: "Debuts & IPOs Tracked",
      sub: "AI S-1 breakdowns generated",
      icon: <BarChart3Icon size={22} className="text-cyan-400" />,
    },
    {
      value: "98.7%",
      label: "Concept Clarity Score",
      sub: "Surveyed post-quest learners",
      icon: <ZapIcon size={22} className="text-amber-400" />,
    },
    {
      value: "3.8M+",
      label: "AI Queries Answered",
      sub: "Zero financial jargon",
      icon: <StarIcon size={22} className="text-violet-400" />,
    },
  ];

  return (
    <section className="py-16 sm:py-24 border-y border-white/5 relative bg-[#090c14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="glass-panel p-6 rounded-2xl border border-white/5 space-y-2 text-center flex flex-col items-center justify-center hover:border-emerald-500/30 transition-colors"
            >
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 mb-1">
                {stat.icon}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-200">{stat.label}</div>
              <div className="text-[11px] text-slate-400">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-400 border-t border-white/5 pt-8">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon size={16} className="text-emerald-400" />
            <span>Enterprise-Grade Encryption & 2FA Auth</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>100% Unbiased & Independent Education</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Built for Modern Self-Directed Investors</span>
          </div>
        </div>
      </div>
    </section>
  );
}
