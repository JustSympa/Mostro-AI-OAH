import React from "react";
import Link from "next/link";
import { ArrowUpRightIcon, SparklesIcon, CheckCircle2Icon } from "./Icons";

export function CtaBanner() {
  return (
    <section className="py-20 relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl p-8 sm:p-14 overflow-hidden border border-[#D4AF37]/30 bg-gradient-to-br from-[#191C24] via-[#202530] to-[#12141A] shadow-2xl shadow-[#191C24]/15 text-white">
          {/* Luminous Warm Champagne & Gold Spheres (Inspired by Reference 2) */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-[#E8D8B0]/20 via-[#D4AF37]/15 to-transparent blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-10 left-10 w-48 h-48 rounded-full sphere-champagne opacity-30 blur-[2px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-[#E8D8B0]/30 text-[#E8D8B0] text-xs font-semibold uppercase tracking-wider">
              <SparklesIcon size={14} className="text-[#D4AF37]" />
              <span>Begin Your Financial Journey</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Turn Market Anxiety into{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFFFFF] via-[#E8D8B0] to-[#D4AF37]">
                Decisive Knowledge
              </span>
            </h2>

            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Join thousands of learners building lasting financial literacy. Start with Stage 01
              today for free—no credit card required, no aggressive sales pitches.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-[#191C24] bg-gradient-to-r from-[#FAF6ED] via-[#E8D8B0] to-[#D4AF37] hover:brightness-105 shadow-xl transition-all text-base"
              >
                <span>Get Started Free</span>
                <ArrowUpRightIcon size={18} className="text-[#191C24]" />
              </Link>
              <a
                href="#learning-path"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/20 transition-colors text-base"
              >
                <span>Explore Curriculum</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2Icon size={15} className="text-[#D4AF37]" /> No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2Icon size={15} className="text-[#D4AF37]" /> Free starter curriculum
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2Icon size={15} className="text-[#D4AF37]" /> Instant access to quests
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
