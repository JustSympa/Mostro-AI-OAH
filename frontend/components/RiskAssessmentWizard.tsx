"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "../lib/auth";
import {
  ShieldCheckIcon,
  SparklesIcon,
  CheckCircle2Icon,
  ArrowUpRightIcon,
  XIcon,
} from "./Icons";

export interface Option {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  section: string;
  prompt: string;
  options: Option[];
}

export interface QuestionnaireData {
  version: string;
  questions: Question[];
}

export interface RiskProfileData {
  version: number;
  questionnaire_version: string;
  risk_level: number;
  risk_label: string;
  raw_score: number;
  weighted_score: number;
  applied_constraints: string[];
  completed_at: string;
}

interface RiskAssessmentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: RiskProfileData) => void;
  isReassessment?: boolean;
}

// Fallback questions matching backend 2026-10-v1 in case network takes a moment
const FALLBACK_QUESTIONNAIRE: QuestionnaireData = {
  version: "2026-10-v1",
  questions: [
    {
      id: "age_bracket",
      section: "general",
      prompt: "What is your age bracket?",
      options: [
        { id: "lt_25", label: "<25" },
        { id: "25_34", label: "25–34" },
        { id: "35_44", label: "35–44" },
        { id: "45_54", label: "45–54" },
        { id: "55_64", label: "55–64" },
        { id: "65_plus", label: "65+" },
      ],
    },
    {
      id: "investment_horizon",
      section: "general",
      prompt: "What is your investment horizon for this capital?",
      options: [
        { id: "lt_1y", label: "< 1 year (Short-term)" },
        { id: "1_3y", label: "1–3 years" },
        { id: "3_5y", label: "3–5 years" },
        { id: "5_10y", label: "5–10 years" },
        { id: "10y_plus", label: "10+ years (Generational)" },
      ],
    },
    {
      id: "savings_share",
      section: "general",
      prompt: "What share of your total savings does this investment represent?",
      options: [
        { id: "lt_10", label: "Less than 10%" },
        { id: "10_25", label: "10% – 25%" },
        { id: "25_50", label: "25% – 50%" },
        { id: "gt_50", label: "More than 50%" },
      ],
    },
    {
      id: "drawdown_reaction",
      section: "tolerance",
      prompt: "The market drops 31% in three months and your portfolio is down 31%. What do you do?",
      options: [
        { id: "sell_all", label: "Sell everything immediately to prevent further loss" },
        { id: "sell_some", label: "Sell a portion to lock in cash and reduce volatility" },
        { id: "hold", label: "Hold steady and wait for market recovery" },
        { id: "buy_more", label: "Opportunistically buy more at discounted valuations" },
      ],
    },
    {
      id: "return_tradeoff",
      section: "tolerance",
      prompt: "Which investment profile appeals to you more?",
      options: [
        { id: "a", label: "Portfolio A: 20% expected return with a max 5% loss risk" },
        { id: "b", label: "Portfolio B: 50% expected return with a max 15% loss risk" },
      ],
    },
    {
      id: "loss_tolerance",
      section: "tolerance",
      prompt: "What is the maximum decline you can comfortably tolerate over a 12-month period?",
      options: [
        { id: "none", label: "None (Capital preservation is paramount)" },
        { id: "up_to_5", label: "Up to 5% loss" },
        { id: "up_to_15", label: "Up to 15% loss" },
        { id: "up_to_30", label: "Up to 30% loss" },
        { id: "over_30", label: "More than 30% loss (High risk tolerance)" },
      ],
    },
    {
      id: "emergency_fund",
      section: "capacity",
      prompt: "Do you have an emergency fund covering at least 6 months of living expenses?",
      options: [
        { id: "yes", label: "Yes, fully funded liquid reserves" },
        { id: "no", label: "No, currently building or insufficient" },
      ],
    },
    {
      id: "near_term_withdrawal",
      section: "capacity",
      prompt: "Will you need to withdraw a significant portion of this money within the next 2 years?",
      options: [
        { id: "yes", label: "Yes (Anticipated liquidity requirement)" },
        { id: "no", label: "No (Capital can remain invested)" },
      ],
    },
  ],
};

const SECTION_LABELS: Record<string, { title: string; subtitle: string; icon: string }> = {
  general: {
    title: "General Profile & Horizon",
    subtitle: "Setting investment timeframe and capital allocation context",
    icon: "🧭",
  },
  tolerance: {
    title: "Psychological Risk Tolerance",
    subtitle: "Assessing your behavioral reaction to drawdowns & volatility",
    icon: "⚖️",
  },
  capacity: {
    title: "Financial Capacity & Reserves",
    subtitle: "Evaluating emergency buffer and near-term liquidity safety",
    icon: "🛡️",
  },
};

export function RiskAssessmentWizard({
  isOpen,
  onClose,
  onSuccess,
  isReassessment = false,
}: RiskAssessmentWizardProps) {
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>(FALLBACK_QUESTIONNAIRE);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RiskProfileData | null>(null);

  // Load questionnaire from API on mount
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const fetchQuestions = async () => {
      try {
        const res = await apiFetch("/profile/questionnaire");
        if (res.ok) {
          const data: QuestionnaireData = await res.json();
          if (isMounted && data.questions?.length > 0) {
            setQuestionnaire(data);
          }
        }
      } catch (err) {
        console.warn("Using fallback questionnaire definitions:", err);
      }
    };
    fetchQuestions();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const questions = questionnaire.questions;
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const currentAnswer = answers[currentQuestion.id];
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  const sectionMeta = SECTION_LABELS[currentQuestion.section] || {
    title: "Risk Assessment",
    subtitle: "Financial Profile",
    icon: "📊",
  };

  const handleSelectOption = (optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
    setError(null);
  };

  const handleNext = () => {
    if (!currentAnswer) {
      setError("Please select an option before continuing.");
      return;
    }
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setError(null);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const endpoint = isReassessment ? "/profile/reassess" : "/profile/submit";
      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({
          questionnaire_version: questionnaire.version,
          answers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join(". ")
          : data.detail || "Unable to calculate risk profile.";
        throw new Error(msg);
      }

      setResult(data as RiskProfileData);
      onSuccess(data as RiskProfileData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Assessment submission failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Archetype descriptions
  const getArchetypeDetails = (level: number) => {
    switch (level) {
      case 1:
        return {
          title: "Conservative Preserver",
          allocation: "15% Equities • 75% Fixed Income • 10% Cash",
          color: "from-blue-600 to-indigo-700",
          desc: "Capital preservation and defense. Volatility is strictly minimized with high-grade bonds and cash equivalents.",
        };
      case 2:
        return {
          title: "Moderately Conservative",
          allocation: "35% Equities • 55% Fixed Income • 10% Cash",
          color: "from-teal-600 to-emerald-700",
          desc: "Income generation with measured growth. Low drawdowns with modest exposure to blue-chip equities.",
        };
      case 3:
        return {
          title: "Balanced Navigator",
          allocation: "60% Equities • 35% Fixed Income • 5% Cash",
          color: "from-amber-500 to-yellow-600",
          desc: "Classic 60/40 balanced growth. Combines compounding market returns with stabilizing debt instruments.",
        };
      case 4:
        return {
          title: "Moderately Aggressive",
          allocation: "75% Equities • 20% Fixed Income • 5% Alternatives",
          color: "from-orange-500 to-rose-600",
          desc: "Growth-focused compounding. Willing to absorb multi-month drawdowns in pursuit of higher long-term real gains.",
        };
      case 5:
        return {
          title: "Aggressive Exponentialist",
          allocation: "90% Equities • 10% Crypto / Alternatives",
          color: "from-[#D4AF37] to-[#722F37]",
          desc: "Maximum capital appreciation. High appetite for volatility, opportunistic dip accumulation, and high-beta assets.",
        };
      default:
        return {
          title: "Balanced Investor",
          allocation: "60% Equities • 40% Bonds",
          color: "from-neutral-700 to-neutral-900",
          desc: "Diversified balanced investor profile.",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#191C24] text-white rounded-3xl border border-[#D4AF37]/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
              <SparklesIcon size={18} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Investor Risk Assessment
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                  {questionnaire.version}
                </span>
              </h2>
              <p className="text-xs text-[#A0A5B2]">
                {result ? "Assessment Complete" : `Section: ${sectionMeta.title}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#A0A5B2] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Dynamic Progress Bar (Hidden on Result View) */}
        {!result && (
          <div className="w-full bg-white/5 h-1.5 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FAF6ED] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {result ? (
            /* ════════════════ RESULT CELEBRATION VIEW ════════════════ */
            <div className="text-center py-4 space-y-6 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#722F37]/30 border-2 border-[#D4AF37] shadow-xl shadow-[#D4AF37]/20 mx-auto">
                <ShieldCheckIcon size={40} className="text-[#D4AF37]" />
              </div>

              <div>
                <span className="text-xs font-semibold tracking-widest uppercase text-[#D4AF37] px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                  Risk Level {result.risk_level} of 5
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
                  {result.risk_label}
                </h3>
                <p className="text-sm text-[#D4AF37] font-medium mt-1">
                  {getArchetypeDetails(result.risk_level).title}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-left max-w-lg mx-auto space-y-3">
                <p className="text-xs text-[#C5CAD6] leading-relaxed">
                  {getArchetypeDetails(result.risk_level).desc}
                </p>

                <div className="pt-3 border-t border-white/10">
                  <div className="text-[11px] font-semibold text-[#A0A5B2] uppercase tracking-wider mb-1.5">
                    Recommended Target Allocation
                  </div>
                  <div className="text-xs font-bold text-white bg-black/40 px-3.5 py-2 rounded-xl border border-white/10">
                    {getArchetypeDetails(result.risk_level).allocation}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-[#A0A5B2] block">Weighted Score</span>
                    <span className="text-sm font-bold text-[#D4AF37]">
                      {result.weighted_score} <span className="text-xs text-[#A0A5B2] font-normal">/ 34</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-[#A0A5B2] block">Raw Tolerance</span>
                    <span className="text-sm font-bold text-white">
                      {result.raw_score} <span className="text-xs text-[#A0A5B2] font-normal">/ 16</span>
                    </span>
                  </div>
                </div>

                {result.applied_constraints && result.applied_constraints.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <span className="mt-0.5">⚠️</span>
                    <div>
                      <strong className="block font-semibold">Constraint Applied</strong>
                      <span className="text-[11px] text-amber-200/90">
                        Level adjusted due to: {result.applied_constraints.join(", ").replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-[#191C24] bg-gradient-to-r from-[#D4AF37] to-[#FAF6ED] rounded-xl hover:shadow-lg hover:shadow-[#D4AF37]/25 transition-all cursor-pointer"
                >
                  Apply & Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* ════════════════ QUESTION WIZARD STEP VIEW ════════════════ */
            <div className="space-y-6">
              {/* Question metadata badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#A0A5B2]">
                  <span className="text-base">{sectionMeta.icon}</span>
                  <span className="font-semibold text-white">{sectionMeta.title}</span>
                </div>
                <span className="text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full border border-[#D4AF37]/30">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
              </div>

              {/* Prompt */}
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {currentQuestion.prompt}
                </h3>
                <p className="text-xs text-[#A0A5B2] mt-1">{sectionMeta.subtitle}</p>
              </div>

              {/* Options Selection Tiles */}
              <div className="space-y-2.5 pt-2">
                {currentQuestion.options.map((option) => {
                  const isSelected = currentAnswer === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectOption(option.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-[#D4AF37]/15 border-[#D4AF37] shadow-md shadow-[#D4AF37]/10 text-white"
                          : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-[#C5CAD6]"
                      }`}
                    >
                      <div className="flex items-center gap-3 pr-4">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-[#D4AF37] bg-[#D4AF37] text-[#191C24]"
                              : "border-white/30 bg-transparent"
                          }`}
                        >
                          {isSelected && <CheckCircle2Icon size={14} className="text-[#191C24]" />}
                        </div>
                        <span className="text-sm font-medium">{option.label}</span>
                      </div>
                      <ArrowUpRightIcon
                        size={16}
                        className={`transition-transform ${
                          isSelected ? "text-[#D4AF37] translate-x-0.5" : "text-white/20"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        {!result && (
          <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0 || submitting}
              className={`px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/15 transition-all cursor-pointer ${
                currentIndex === 0 || submitting
                  ? "opacity-30 cursor-not-allowed text-[#A0A5B2]"
                  : "text-white hover:bg-white/10"
              }`}
            >
              Previous
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#A0A5B2] hidden sm:inline">
                {currentIndex + 1} / {totalQuestions} answered
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={!currentAnswer || submitting}
                className={`px-6 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  !currentAnswer || submitting
                    ? "opacity-50 cursor-not-allowed bg-white/20 text-[#A0A5B2]"
                    : "bg-[#D4AF37] hover:bg-[#FAF6ED] text-[#191C24] shadow-md shadow-[#D4AF37]/20"
                }`}
              >
                {submitting ? (
                  <span>Evaluating...</span>
                ) : currentIndex === totalQuestions - 1 ? (
                  <>
                    <span>Submit Assessment</span>
                    <SparklesIcon size={14} />
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
