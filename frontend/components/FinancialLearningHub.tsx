"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BADGES,
  EMPTY_PROGRESS,
  LEVELS,
  MENTAL_MODELS,
  SCENARIOS,
  STAGES,
  TOTAL_LESSONS,
  computeXp,
  getLevelInfo,
  isBadgeUnlocked,
  type IconName,
  type LearningProgress,
  type Lesson,
  type Scenario,
} from "../lib/learningContent";
import {
  AwardIcon,
  BarChart3Icon,
  BookOpenIcon,
  BrainIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CompassIcon,
  FlameIcon,
  LightbulbIcon,
  LockIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TargetIcon,
  TrendingUpIcon,
  XIcon,
  ZapIcon,
} from "./Icons";

const STORAGE_KEY = "mostro.learning.progress.v1";
const STREAK_DAYS = 5;

type HubTab = "curriculum" | "simulator" | "models" | "badges";

function HubIcon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  switch (name) {
    case "compass":
      return <CompassIcon size={size} className={className} />;
    case "book":
      return <BookOpenIcon size={size} className={className} />;
    case "chart":
      return <BarChart3Icon size={size} className={className} />;
    case "target":
      return <TargetIcon size={size} className={className} />;
    case "star":
      return <StarIcon size={size} className={className} />;
    case "award":
      return <AwardIcon size={size} className={className} />;
    case "zap":
      return <ZapIcon size={size} className={className} />;
    case "shield":
      return <ShieldCheckIcon size={size} className={className} />;
    case "brain":
      return <BrainIcon size={size} className={className} />;
    case "flame":
      return <FlameIcon size={size} className={className} />;
    case "lightbulb":
      return <LightbulbIcon size={size} className={className} />;
    default:
      return <TrendingUpIcon size={size} className={className} />;
  }
}

const TIER_STYLES: Record<string, string> = {
  bronze: "bg-amber-50 border-amber-300 text-amber-800",
  silver: "bg-slate-50 border-slate-300 text-slate-700",
  gold: "bg-[#FAF6ED] border-[#D4AF37]/50 text-[#8A6A00]",
};

interface FinancialLearningHubProps {
  /** Called whenever total XP changes so the dashboard header badge stays in sync. */
  onXpChange: (xp: number) => void;
}

export function FinancialLearningHub({ onXpChange }: FinancialLearningHubProps) {
  const [progress, setProgress] = useState<LearningProgress>(EMPTY_PROGRESS);
  const [hydrated, setHydrated] = useState(false);
  const [hubTab, setHubTab] = useState<HubTab>("curriculum");

  // Lesson modal
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [quizAttempts, setQuizAttempts] = useState(0);

  // Scenario drill-in
  const [openScenarioId, setOpenScenarioId] = useState<string | null>(null);
  const [scenarioChoice, setScenarioChoice] = useState<number | null>(null);

  // Mental models accordion
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  const allLessons = useMemo(() => STAGES.flatMap((stage) => stage.lessons), []);
  const xp = useMemo(() => computeXp(progress), [progress]);
  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);
  const earnedBadges = useMemo(
    () => BADGES.filter((badge) => isBadgeUnlocked(badge.id, progress)),
    [progress]
  );

  const nextLesson = allLessons.find((lesson) => !progress.lessons.includes(lesson.id)) ?? null;

  const stageUnlocked = useMemo(
    () =>
      STAGES.map(
        (_, index) =>
          index === 0 ||
          STAGES[index - 1].lessons.every((lesson) => progress.lessons.includes(lesson.id))
      ),
    [progress]
  );

  const openLesson = useMemo(
    () => (openLessonId ? allLessons.find((lesson) => lesson.id === openLessonId) ?? null : null),
    [openLessonId, allLessons]
  );

  const openScenario = useMemo(
    () => (openScenarioId ? SCENARIOS.find((scenario) => scenario.id === openScenarioId) ?? null : null),
    [openScenarioId]
  );

  // Restore persisted progress on mount.
  useEffect(() => {
    const hydrate = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<LearningProgress>;
          setProgress({
            lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
            scenarios: Array.isArray(parsed.scenarios) ? parsed.scenarios : [],
            perfectFirstTry: typeof parsed.perfectFirstTry === "number" ? parsed.perfectFirstTry : 0,
            modelsViewed: Array.isArray(parsed.modelsViewed) ? parsed.modelsViewed : [],
          });
        }
      } catch {
        // Ignore malformed or unavailable storage.
      }
      setHydrated(true);
    };

    hydrate();
  }, []);

  // Persist progress whenever it changes.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Storage can be full or blocked; learning still works in-memory.
    }
  }, [progress, hydrated]);

  // Keep the dashboard header XP badge in sync with derived XP.
  useEffect(() => {
    onXpChange(xp);
  }, [xp, onXpChange]);

  const launchLesson = (lesson: Lesson) => {
    setOpenLessonId(lesson.id);
    setQuizPick(null);
    setQuizAttempts(0);
  };

  const handleQuizPick = (index: number) => {
    if (!openLesson) return;
    const isCorrect = index === openLesson.quiz.correctIndex;
    const firstAttempt = quizAttempts === 0;
    setQuizAttempts((prev) => prev + 1);
    setQuizPick(index);

    if (isCorrect && firstAttempt && !progress.lessons.includes(openLesson.id)) {
      setProgress((prev) => ({
        ...prev,
        lessons: [...prev.lessons, openLesson.id],
        perfectFirstTry: prev.perfectFirstTry + 1,
      }));
      return;
    }

    if (isCorrect && !progress.lessons.includes(openLesson.id)) {
      completeLesson(openLesson.id);
    }
  };

  const completeLesson = (lessonId: string) => {
    setProgress((prev) =>
      prev.lessons.includes(lessonId)
        ? prev
        : { ...prev, lessons: [...prev.lessons, lessonId] }
    );
  };

  const handleScenarioChoice = (scenario: Scenario, index: number) => {
    setScenarioChoice(index);
    setProgress((prev) =>
      prev.scenarios.includes(scenario.id)
        ? prev
        : { ...prev, scenarios: [...prev.scenarios, scenario.id] }
    );
  };

  const toggleModel = (modelId: string) => {
    const isOpening = expandedModelId !== modelId;
    setExpandedModelId(isOpening ? modelId : null);
    if (isOpening) {
      setProgress((prev) =>
        prev.modelsViewed.includes(modelId)
          ? prev
          : { ...prev, modelsViewed: [...prev.modelsViewed, modelId] }
      );
    }
  };

  const quizSolved = !!openLesson && quizPick === openLesson.quiz.correctIndex;
  const lessonDone = !!openLesson && progress.lessons.includes(openLesson.id);

  const hubTabs: { id: HubTab; label: string; icon: React.ReactNode }[] = [
    { id: "curriculum", label: "Curriculum", icon: <BookOpenIcon size={15} /> },
    { id: "simulator", label: "Simulator", icon: <TargetIcon size={15} /> },
    { id: "models", label: "Mental Models", icon: <BrainIcon size={15} /> },
    { id: "badges", label: `Badges (${earnedBadges.length}/${BADGES.length})`, icon: <AwardIcon size={15} /> },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ════════════════ PROGRESS RIBBON ════════════════ */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#191C24] via-[#20242D] to-[#191C24] text-white border border-[#D4AF37]/40 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 inline-block">
            Level {levelInfo.level} • {levelInfo.title} • {xp} XP
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Financial Learning Hub
          </h2>
          <p className="text-xs sm:text-sm text-[#C5CAD6]">
            Work the four-stage path from compounding foundations to portfolio convexity. Finish lessons,
            run scenario simulations, and collect mental models to level up your investor rank.
          </p>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#C5CAD6]">
              <span>
                {levelInfo.isMax
                  ? "Maximum rank reached"
                  : `${levelInfo.xpIntoLevel} / ${levelInfo.xpForLevel} XP to ${levelInfo.nextTitle}`}
              </span>
              <span className="text-[#D4AF37]">{levelInfo.progressPct}%</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FAF6ED] transition-all duration-500"
                style={{ width: `${levelInfo.progressPct}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => nextLesson && launchLesson(nextLesson)}
            disabled={!nextLesson}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#D4AF37] text-[#191C24] hover:bg-[#FAF6ED] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default"
          >
            <ZapIcon size={14} />
            {nextLesson ? `Continue: ${nextLesson.title}` : "All lessons complete"}
          </button>
        </div>

        <div className="flex gap-3 shrink-0">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[110px]">
            <span className="text-3xl font-extrabold text-[#D4AF37] block">{STREAK_DAYS} 🔥</span>
            <span className="text-[11px] text-[#C5CAD6] font-semibold uppercase tracking-wider">
              Day Streak
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[110px]">
            <span className="text-3xl font-extrabold text-[#D4AF37] block">
              {progress.lessons.length}
              <span className="text-base text-[#C5CAD6]">/{TOTAL_LESSONS}</span>
            </span>
            <span className="text-[11px] text-[#C5CAD6] font-semibold uppercase tracking-wider">
              Lessons Done
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[110px]">
            <span className="text-3xl font-extrabold text-[#D4AF37] block">
              {levelInfo.level}
              <span className="text-base text-[#C5CAD6]">/{LEVELS.length}</span>
            </span>
            <span className="text-[11px] text-[#C5CAD6] font-semibold uppercase tracking-wider">
              Rank Level
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════ HUB TABS ════════════════ */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-white border border-[#E8E5DE] w-fit shadow-xs">
        {hubTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setHubTab(tab.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              hubTab === tab.id
                ? "bg-[#191C24] text-white shadow-sm"
                : "text-[#5F6470] hover:text-[#191C24] hover:bg-[#F8F7F4]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════ CURRICULUM ════════════════ */}
      {hubTab === "curriculum" && (
        <div className="space-y-6">
          {STAGES.map((stage, stageIndex) => {
            const unlocked = stageUnlocked[stageIndex];
            const done = stage.lessons.filter((lesson) => progress.lessons.includes(lesson.id)).length;

            return (
              <div key={stage.id} className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E5DE] shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`p-2.5 rounded-2xl border ${
                        unlocked ? "bg-[#FAF6ED] border-[#D4AF37]/40 text-[#8A6A00]" : "bg-neutral-100 border-neutral-200 text-neutral-400"
                      }`}
                    >
                      <HubIcon name={stage.icon} size={20} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#858995]">
                          {stage.label}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F8F7F4] text-[#5F6470] border border-[#E8E5DE]">
                          {stage.level}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#191C24]">{stage.title}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#5F6470]">
                      {done}/{stage.lessons.length} lessons
                    </span>
                    {!unlocked && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200">
                        <LockIcon size={11} /> Locked
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#5F6470] leading-relaxed">{stage.summary}</p>

                {/* Winding lesson path */}
                <div className="space-y-1">
                  {stage.lessons.map((lesson, lessonIndex) => {
                    const isDone = progress.lessons.includes(lesson.id);
                    const isFrontier = nextLesson?.id === lesson.id;
                    const canOpen = unlocked;
                    const indent = lessonIndex % 2 === 1 ? "lg:ml-16" : "lg:ml-0";

                    return (
                      <div key={lesson.id} className={`flex items-stretch gap-4 ${indent}`}>
                        {/* Connector + node */}
                        <div className="flex flex-col items-center">
                          <span
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-colors ${
                              isDone
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : !canOpen
                                ? "bg-neutral-100 border-neutral-200 text-neutral-400"
                                : isFrontier
                                ? "bg-[#D4AF37] border-[#D4AF37] text-[#191C24] ring-4 ring-[#D4AF37]/20"
                                : "bg-white border-[#D4AF37]/50 text-[#8A6A00]"
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2Icon size={16} />
                            ) : !canOpen ? (
                              <LockIcon size={14} />
                            ) : (
                              lessonIndex + 1
                            )}
                          </span>
                          {lessonIndex < stage.lessons.length - 1 && (
                            <span className="w-px flex-1 border-l border-dashed border-[#E8E5DE] my-1" />
                          )}
                        </div>

                        {/* Lesson card */}
                        <button
                          onClick={() => canOpen && launchLesson(lesson)}
                          disabled={!canOpen}
                          className={`flex-1 mb-3 text-left p-4 rounded-2xl border transition-all ${
                            canOpen
                              ? "bg-[#F8F7F4] border-[#E8E5DE] hover:bg-white hover:border-[#D4AF37] hover:shadow-sm cursor-pointer"
                              : "bg-neutral-50 border-neutral-100 cursor-default"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4
                                className={`text-sm font-bold ${
                                  canOpen ? "text-[#191C24]" : "text-neutral-400"
                                }`}
                              >
                                {lesson.title}
                              </h4>
                              <p className={`text-[11px] ${canOpen ? "text-[#5F6470]" : "text-neutral-400"}`}>
                                {lesson.subtitle}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold text-[#858995]">
                                <span>{lesson.minutes} min read</span>
                                <span>•</span>
                                <span className="text-[#8A6A00]">+{lesson.xp} XP</span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${
                                isDone
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isFrontier
                                  ? "bg-[#FAF6ED] text-[#8A6A00] border-[#D4AF37]/40"
                                  : "bg-white text-[#858995] border-[#E8E5DE]"
                              }`}
                            >
                              {isDone ? "Completed" : isFrontier ? "Start here" : "Not started"}
                            </span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════ SCENARIO SIMULATOR ════════════════ */}
      {hubTab === "simulator" && (
        <div className="space-y-5">
          {!openScenario ? (
            <>
              <div className="p-5 rounded-3xl bg-white border border-[#E8E5DE] shadow-xs">
                <h3 className="text-base font-bold text-[#191C24]">Scenario Simulations</h3>
                <p className="text-xs text-[#5F6470] mt-1">
                  Real market situations with no single &apos;right&apos; answer — only better and worse decisions.
                  Each completed simulation awards 60 XP.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SCENARIOS.map((scenario) => {
                  const isDone = progress.scenarios.includes(scenario.id);
                  return (
                    <button
                      key={scenario.id}
                      onClick={() => {
                        setOpenScenarioId(scenario.id);
                        setScenarioChoice(null);
                      }}
                      className="text-left p-5 rounded-3xl bg-white border border-[#E8E5DE] shadow-xs hover:border-[#D4AF37]/50 hover:shadow-md transition-all space-y-3 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#858995]">
                          {scenario.timeframe}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isDone
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-[#FAF6ED] text-[#8A6A00] border-[#D4AF37]/40"
                          }`}
                        >
                          {isDone ? "Completed" : `+${scenario.xp} XP`}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#191C24] group-hover:text-[#8A6A00] transition-colors">
                        {scenario.title}
                      </h4>
                      <p className="text-xs text-[#5F6470] leading-relaxed line-clamp-3">{scenario.setup}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8A6A00]">
                        Open simulation <ChevronRightIcon size={13} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-5">
              <button
                onClick={() => setOpenScenarioId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5F6470] hover:text-[#191C24] cursor-pointer"
              >
                ← Back to all simulations
              </button>

              <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#D4AF37]/40 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#858995]">
                      {openScenario.timeframe}
                    </span>
                    <h3 className="text-xl font-extrabold text-[#191C24]">{openScenario.title}</h3>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    +{openScenario.xp} XP
                  </span>
                </div>

                <p className="text-sm text-[#5F6470] leading-relaxed">{openScenario.setup}</p>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {openScenario.metrics.map((metric) => (
                    <div key={metric.label} className="p-3.5 rounded-2xl bg-[#F8F7F4] border border-[#E8E5DE]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#858995] block">
                        {metric.label}
                      </span>
                      <span
                        className={`text-sm font-extrabold font-mono block mt-1 ${
                          metric.tone === "up"
                            ? "text-emerald-600"
                            : metric.tone === "down"
                            ? "text-rose-600"
                            : "text-[#191C24]"
                        }`}
                      >
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-1">
                  <p className="text-sm font-bold text-[#191C24]">{openScenario.question}</p>
                  <div className="space-y-2.5">
                    {openScenario.options.map((option, index) => {
                      const revealed = scenarioChoice !== null;
                      const isChosen = scenarioChoice === index;
                      const isBest = option.score === 2;

                      let cls = "bg-[#F8F7F4] border-[#E8E5DE] hover:bg-white hover:border-[#D4AF37]";
                      if (revealed && isChosen) {
                        cls =
                          option.score === 2
                            ? "bg-emerald-50 border-emerald-400"
                            : option.score === 1
                            ? "bg-amber-50 border-amber-300"
                            : "bg-rose-50 border-rose-300";
                      } else if (revealed && isBest) {
                        cls = "bg-emerald-50/60 border-emerald-300";
                      } else if (revealed) {
                        cls = "bg-[#F8F7F4] border-[#E8E5DE] opacity-70";
                      }

                      return (
                        <div key={option.text} className={`rounded-2xl border transition-all ${cls}`}>
                          <button
                            onClick={() => handleScenarioChoice(openScenario, index)}
                            className="w-full text-left p-3.5 text-xs font-semibold text-[#191C24] cursor-pointer"
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span>{option.text}</span>
                              {revealed && isBest && (
                                <span className="text-[10px] font-bold text-emerald-700 whitespace-nowrap shrink-0">
                                  Optimal
                                </span>
                              )}
                            </span>
                          </button>
                          {revealed && isChosen && (
                            <p className="px-3.5 pb-3.5 text-[11px] leading-relaxed text-[#5F6470] animate-fade-in">
                              {option.outcome}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {scenarioChoice !== null && (
                  <div className="p-4 rounded-2xl bg-[#191C24] text-[#C5CAD6] text-[11px] leading-relaxed animate-fade-in">
                    <span className="font-bold text-[#D4AF37] block mb-1">Debrief</span>
                    {openScenario.debrief}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ MENTAL MODELS ════════════════ */}
      {hubTab === "models" && (
        <div className="space-y-5">
          <div className="p-5 rounded-3xl bg-white border border-[#E8E5DE] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#191C24]">Wall Street Mental Models</h3>
              <p className="text-xs text-[#5F6470] mt-1">
                The heuristics professional investors reach for when the numbers alone are not enough.
              </p>
            </div>
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[#FAF6ED] text-[#8A6A00] border border-[#D4AF37]/40">
              {progress.modelsViewed.length}/{MENTAL_MODELS.length} explored
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MENTAL_MODELS.map((model) => {
              const isOpen = expandedModelId === model.id;
              const viewed = progress.modelsViewed.includes(model.id);
              return (
                <div
                  key={model.id}
                  className={`p-5 rounded-3xl bg-white border shadow-xs transition-all ${
                    isOpen ? "border-[#D4AF37] shadow-md md:col-span-2" : "border-[#E8E5DE]"
                  }`}
                >
                  <button
                    onClick={() => toggleModel(model.id)}
                    className="w-full text-left cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-[#FAF6ED] border border-[#D4AF37]/40 text-[#8A6A00] shrink-0">
                          <LightbulbIcon size={16} />
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-[#191C24]">{model.name}</h4>
                          <p className="text-[11px] text-[#858995]">Popularised by {model.origin}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-2 shrink-0">
                        {viewed && <CheckCircle2Icon size={14} className="text-emerald-500" />}
                        <ChevronRightIcon
                          size={16}
                          className={`text-[#858995] transition-transform ${isOpen ? "rotate-90" : ""}`}
                        />
                      </span>
                    </div>
                    <p className="text-xs text-[#5F6470] italic mt-3">“{model.tagline}”</p>
                  </button>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-[#E8E5DE] grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A6A00]">
                          The Principle
                        </span>
                        <p className="text-[11px] text-[#5F6470] leading-relaxed">{model.principle}</p>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A6A00]">
                          In Practice
                        </span>
                        <p className="text-[11px] text-[#5F6470] leading-relaxed">{model.inPractice}</p>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E2D3A]">
                          The Pitfall
                        </span>
                        <p className="text-[11px] text-[#5F6470] leading-relaxed">{model.pitfall}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════ BADGES ════════════════ */}
      {hubTab === "badges" && (
        <div className="space-y-5">
          <div className="p-5 rounded-3xl bg-white border border-[#E8E5DE] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#191C24]">Achievement Badges</h3>
              <p className="text-xs text-[#5F6470] mt-1">
                Earn badges as you complete lessons, simulations and mental models.
              </p>
            </div>
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[#FAF6ED] text-[#8A6A00] border border-[#D4AF37]/40">
              {earnedBadges.length}/{BADGES.length} earned
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {BADGES.map((badge) => {
              const unlocked = isBadgeUnlocked(badge.id, progress);
              return (
                <div
                  key={badge.id}
                  className={`p-5 rounded-3xl border shadow-xs text-center space-y-2.5 ${
                    unlocked
                      ? "bg-white border-[#D4AF37]/40"
                      : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <span
                    className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border ${
                      unlocked
                        ? TIER_STYLES[badge.tier]
                        : "bg-neutral-100 border-neutral-200 text-neutral-400"
                    }`}
                  >
                    <HubIcon name={badge.icon} size={24} />
                  </span>
                  <h4 className={`text-sm font-bold ${unlocked ? "text-[#191C24]" : "text-neutral-400"}`}>
                    {badge.name}
                  </h4>
                  <p className={`text-[11px] leading-relaxed ${unlocked ? "text-[#5F6470]" : "text-neutral-400"}`}>
                    {badge.description}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      unlocked
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-neutral-100 text-neutral-500 border-neutral-200"
                    }`}
                  >
                    {unlocked ? "Unlocked" : "Locked"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════ LESSON MODAL ════════════════ */}
      {openLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-[#D4AF37]/30 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-[#E8E5DE] px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A6A00]">
                    {STAGES.find((stage) => stage.lessons.some((l) => l.id === openLesson.id))?.label}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F8F7F4] text-[#5F6470] border border-[#E8E5DE]">
                    {openLesson.minutes} min • +{openLesson.xp} XP
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-[#191C24]">{openLesson.title}</h3>
                <p className="text-xs text-[#5F6470]">{openLesson.subtitle}</p>
              </div>
              <button
                onClick={() => setOpenLessonId(null)}
                className="p-1.5 rounded-lg text-[#5F6470] hover:text-[#191C24] hover:bg-[#F8F7F4] shrink-0 cursor-pointer"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {lessonDone && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2Icon size={15} />
                  Lesson completed — review any time.
                </div>
              )}

              <div className="space-y-5">
                {openLesson.sections.map((section) => (
                  <div key={section.heading} className="space-y-1.5">
                    <h4 className="text-sm font-bold text-[#191C24]">{section.heading}</h4>
                    <p className="text-xs text-[#5F6470] leading-relaxed">{section.body}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF6ED] border border-[#D4AF37]/30 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A6A00] flex items-center gap-1.5">
                  <SparklesIcon size={12} /> Key Takeaways
                </span>
                <ul className="space-y-1.5">
                  {openLesson.takeaways.map((takeaway) => (
                    <li key={takeaway} className="text-[11px] text-[#191C24] flex items-start gap-2">
                      <span className="text-[#8A6A00] mt-0.5">•</span>
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Knowledge check */}
              <div className="p-4 rounded-2xl bg-white border border-[#E8E5DE] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#FAF6ED] text-[#8A6A00] border border-[#D4AF37]/40">
                    <ZapIcon size={14} />
                  </span>
                  <span className="text-xs font-bold text-[#191C24]">Knowledge Check</span>
                </div>
                <p className="text-xs text-[#5F6470]">{openLesson.quiz.prompt}</p>

                <div className="space-y-2">
                  {openLesson.quiz.options.map((option, index) => {
                    const isCorrect = index === openLesson.quiz.correctIndex;
                    const isPicked = quizPick === index;
                    let cls = "bg-[#F8F7F4] border-[#E8E5DE] hover:bg-white hover:border-[#D4AF37]";
                    if (isPicked) {
                      cls = isCorrect ? "bg-emerald-50 border-emerald-400" : "bg-rose-50 border-rose-300";
                    } else if (quizSolved && isCorrect) {
                      cls = "bg-emerald-50/60 border-emerald-300";
                    }
                    return (
                      <button
                        key={option}
                        onClick={() => handleQuizPick(index)}
                        className={`w-full text-left p-3 rounded-xl text-xs font-semibold text-[#191C24] border transition-all cursor-pointer ${cls}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {quizPick !== null && (
                  <p
                    className={`text-[11px] leading-relaxed p-3 rounded-xl border animate-fade-in ${
                      quizSolved
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}
                  >
                    {openLesson.quiz.explanation}
                  </p>
                )}
              </div>

              {/* Footer action */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-[#858995]">
                  {lessonDone
                    ? "Progress saved."
                    : quizSolved
                    ? "Quiz cleared — lesson recorded."
                    : "Answer the check to complete this lesson."}
                </span>
                <button
                  onClick={() => setOpenLessonId(null)}
                  disabled={!lessonDone}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-[#191C24] text-white hover:bg-[#20242D] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
                >
                  {lessonDone ? "Done" : "Answer to finish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
