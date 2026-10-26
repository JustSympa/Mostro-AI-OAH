"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CompassIcon,
  CalendarIcon,
  NewspaperIcon,
  BotIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
} from "./Icons";

export function Hero() {
  const [activeTab, setActiveTab] = useState(0);

  const pillars = [
    {
      id: 0,
      title: "Financial Learning",
      subtitle: "Step-by-step mastery",
      icon: <CompassIcon size={20} className="text-[#8A6A00]" />,
      headline: "Learn Markets Step by Step, Without the Intimidation",
      description:
        "Structured quest-based roadmaps that take you from compounding foundations to financial statement analysis and risk management. Complete interactive lessons, earn achievements, and retain knowledge through practical market heuristics.",
      points: [
        "Progressive stages from beginner to advanced",
        "Interactive knowledge checks and instant feedback",
        "Battle-tested Wall Street rules of thumb",
      ],
      actionLabel: "Explore Learning Quests",
      actionHref: "#learning-path",
    },
    {
      id: 1,
      title: "IPO Calendar",
      subtitle: "Debut & filing radar",
      icon: <CalendarIcon size={20} className="text-[#8A6A00]" />,
      headline: "Transparent Discovery for Public Market Debuts",
      description:
        "Stay informed on upcoming and recent market debuts. Track filing stages from initial S-1 registration through price band revisions, lockup expirations, and listing day debuts—with objective AI-generated prospectus summaries.",
      points: [
        "Track rumored, filed, and confirmed IPO listings",
        "Clear S-1 prospectus summaries highlighting moats and risks",
        "Expected price bands, valuation targets, and lockup dates",
      ],
      actionLabel: "View IPO Calendar",
      actionHref: "#ipo-calendar",
    },
    {
      id: 2,
      title: "Curated News",
      subtitle: "30-second AI digests",
      icon: <NewspaperIcon size={20} className="text-[#8A6A00]" />,
      headline: "Cut Through Noise with Concise Market Intelligence",
      description:
        "Skip sensational headlines and repetitive wire reports. Mostro AI distills breaking macro events, central bank decisions, and corporate earnings into 30-second digests paired with foundational educational takeaways.",
      points: [
        "Key takeaways extracted in 30 seconds of reading",
        "Automated sentiment bias indicators (bullish / neutral / bearish)",
        "Educational callouts explaining the economic principles behind news",
      ],
      actionLabel: "Browse Market News",
      actionHref: "#news",
    },
    {
      id: 3,
      title: "AI Learning Assistant",
      subtitle: "24/7 concept clarity",
      icon: <BotIcon size={20} className="text-[#8A6A00]" />,
      headline: "Your Dedicated 24/7 Financial Learning Companion",
      description:
        "Ask questions about balance sheets, derivative mechanics, economic terminology, or regulatory disclosures in plain English. Get calm, unbiased, and objective explanations tailored to your level of experience.",
      points: [
        "Zero-jargon translations of complex financial concepts",
        "Plain-English breakdowns of SEC reports and ratios",
        "100% educational guidance with zero product upselling",
      ],
      actionLabel: "Discover AI Assistant",
      actionHref: "#ai-assistant",
    },
  ];

  const currentPillar = pillars[activeTab];

  return (
    <section className="relative pt-12 pb-24 md:pt-18 md:pb-32 overflow-hidden bg-gradient-to-b from-[#FFFFFF] via-[#FAF9F5] to-[#FFFFFF]">
      {/* 3D Dimensional Studio Spheres (Carefully Positioned Behind & Diffusing Through Glass) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[650px] pointer-events-none -z-10 overflow-hidden">
        {/* Large Luminous Champagne Sphere (Top-Right) */}
        <div className="absolute top-8 right-6 sm:right-16 w-64 h-64 sm:w-80 sm:h-80 rounded-full sphere-champagne opacity-80" />

        {/* Studio Matte Charcoal Sphere (Top-Left) */}
        <div className="absolute top-24 left-2 sm:left-14 w-52 h-52 sm:w-64 sm:h-64 rounded-full sphere-charcoal opacity-85" />

        {/* Warm Golden Sphere (Mid-Right Edge) */}
        <div className="absolute top-80 -right-12 w-44 h-44 sm:w-56 sm:h-56 rounded-full sphere-gold opacity-60 blur-[1px]" />

        {/* Subtle Small Charcoal Sphere (Bottom-Left) */}
        <div className="absolute bottom-12 left-1/4 w-32 h-32 sm:w-40 sm:h-40 rounded-full sphere-charcoal opacity-60" />

        {/* Diffuse Warm Champagne Light Stream */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[350px] bg-gradient-to-b from-[#E8D8B0]/30 to-transparent blur-[110px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial Text Header */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          {/* Tag Pill with Refined Monogram */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-[#E8D8B0] text-[#8A6A00] text-xs font-semibold shadow-xs backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span>IPO-Centered Financial Education</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#191C24] leading-[1.12]">
            Financial Knowledge,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#191C24] via-[#8A6A00] to-[#D4AF37]">
              Built for financial clarity.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#5F6470] max-w-2xl mx-auto leading-relaxed font-normal">
            Master money and financial markets with calm confidence. An intelligent platform
            offering progressive learning quests, transparent IPO discovery, curated news, and
            24/7 AI clarity—designed to explain, never to intimidate.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-white bg-[#191C24] hover:bg-[#252A36] border border-[#D4AF37]/50 hover:border-[#D4AF37] shadow-xl shadow-[#191C24]/15 transition-all text-sm sm:text-base group"
            >
              <span>Start Learning Free</span>
              <ArrowUpRightIcon size={18} className="text-[#D4AF37] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
            <a
              href="#ipo-calendar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-[#191C24] bg-white/80 hover:bg-white border border-[#E8E5DE] transition-all text-sm sm:text-base shadow-xs backdrop-blur-md"
            >
              <span>Explore IPO Calendar</span>
            </a>
          </div>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-[#858995]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2Icon size={15} className="text-[#8A6A00]" /> 100% Free Starter Access
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2Icon size={15} className="text-[#8A6A00]" /> Pure Education, Zero Product Sales
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon size={15} className="text-[#8A6A00]" /> Enterprise-Grade Privacy
            </span>
          </div>
        </div>

        {/* Visual Centerpiece: Floating Tactile Frosted Glass Panel (Reference 1 & 2 inspired) */}
        <div className="mt-14 max-w-5xl mx-auto relative">
          {/* Subtle Outer Glowing Rim */}
          <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-b from-[#E8D8B0]/60 via-[#E8E5DE]/40 to-transparent blur-md -z-10 pointer-events-none" />

          {/* The Translucent Frosted Glass Card */}
          <div className="glass-panel-light rounded-[24px] p-6 sm:p-10 border border-white/90 overflow-hidden relative shadow-2xl">
            {/* Specular Refractive Edge Highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

            {/* Top Navigation Tabs for 4 Pillars */}
            <div className="flex items-center justify-between pb-6 border-b border-[#E8E5DE]/70 gap-2 overflow-x-auto">
              <div className="flex items-center gap-2 sm:gap-3 w-full justify-between sm:justify-start">
                {pillars.map((pillar) => {
                  const isSelected = activeTab === pillar.id;
                  return (
                    <button
                      key={pillar.id}
                      onClick={() => setActiveTab(pillar.id)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${isSelected
                          ? "bg-[#191C24] text-white shadow-md border border-[#D4AF37]/50"
                          : "text-[#5F6470] hover:text-[#191C24] hover:bg-white/80"
                        }`}
                    >
                      <span className={isSelected ? "text-[#D4AF37]" : "text-[#858995]"}>
                        {pillar.icon}
                      </span>
                      <span>{pillar.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content Display */}
            <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 text-[#8A6A00] text-[11px] font-bold uppercase tracking-wider border border-[#E8D8B0] shadow-xs">
                  <span>{currentPillar.subtitle}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#191C24] leading-snug">
                  {currentPillar.headline}
                </h3>
                <p className="text-sm text-[#5F6470] leading-relaxed">
                  {currentPillar.description}
                </p>

                <ul className="space-y-2.5 pt-2">
                  {currentPillar.points.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#191C24] font-medium">
                      <CheckCircle2Icon size={16} className="text-[#8A6A00] shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-3">
                  <a
                    href={currentPillar.actionHref}
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#8A6A00] hover:text-[#D4AF37] transition-colors"
                  >
                    <span>{currentPillar.actionLabel}</span>
                    <ArrowUpRightIcon size={16} />
                  </a>
                </div>
              </div>

              {/* Right Feature Panel: Frosted Dark Card (Reference 2 Tribute) */}
              <div className="lg:col-span-5 glass-panel-dark rounded-2xl p-6 sm:p-7 text-white shadow-2xl border border-white/10 space-y-4 relative overflow-hidden">
                {/* Luminous Warm Champagne Sphere Diffusing from Behind */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full sphere-champagne opacity-30 blur-[2px] pointer-events-none" />

                <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
                  <div className="flex items-center gap-2">
                    <img
                      src="/logo-icon.png"
                      alt="Mostro Icon"
                      className="w-6 h-6 rounded-md object-contain"
                    />
                    <span className="text-xs font-serif text-[#D4AF37] italic">
                      Mostro Experience
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-white/10 text-white">
                    Pillar 0{activeTab + 1}
                  </span>
                </div>

                <div className="space-y-2 relative z-10">
                  <div className="text-lg font-bold text-white">
                    {currentPillar.title}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    Built for clarity and self-directed mastery. Every feature gives you
                    meaningful insights without relying on jargon or blind speculation.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs relative z-10">
                  <span className="text-slate-400">Available on all devices</span>
                  <Link
                    href="/register"
                    className="text-[#D4AF37] font-semibold hover:underline flex items-center gap-1"
                  >
                    Join Free →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
