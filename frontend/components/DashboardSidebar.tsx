"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  SparklesIcon,
  BrainIcon,
  CalendarIcon,
  NewspaperIcon,
  BotIcon,
  ShieldCheckIcon,
  XIcon,
} from "./Icons";
import { RiskProfileData } from "./RiskAssessmentWizard";

export type DashboardTab = "ipo" | "learning" | "news" | "assistant";

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  profile: RiskProfileData | null;
  userEmail: string | null;
  onOpenSecurity: () => void;
  onOpenAssessment: () => void;
  onLogout: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function DashboardSidebar({
  activeTab,
  onSelectTab,
  profile,
  userEmail,
  onOpenSecurity,
  onOpenAssessment,
  onLogout,
  mobileOpen,
  setMobileOpen,
}: DashboardSidebarProps) {
  const navItems: {
    id: DashboardTab;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: "ipo",
      label: "IPO Calendar & Intel",
      sublabel: "Debut dates, S-1s & AI briefs",
      icon: <CalendarIcon size={18} />,
      badge: "Live",
    },
    {
      id: "learning",
      label: "Financial Learning",
      sublabel: "Quests, roadmaps & XP",
      icon: <BrainIcon size={18} />,
      badge: "XP Quests",
    },
    {
      id: "news",
      label: "News & Updates",
      sublabel: "Market headlines & IPO filings",
      icon: <NewspaperIcon size={18} />,
    },
    {
      id: "assistant",
      label: "AI Assistant",
      sublabel: "Prospectus Q&A & concepts",
      icon: <BotIcon size={18} />,
      badge: "Copilot",
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-5 text-[#191C24]">
      {/* ── Top Section ── */}
      <div className="space-y-6">
        {/* Logo & Close on mobile */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link href="/" className="flex items-center group">
            <Image
              src="/logo-light.png"
              alt="Mostro AI"
              width={768}
              height={235}
              className="h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[#5F6470] hover:text-[#191C24] hover:bg-[#F8F7F4]"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* User Risk Profile Status Chip */}
        <div className="p-3.5 rounded-2xl bg-[#F8F7F4] border border-[#E8E5DE] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#858995]">
              Calibrated Archetype
            </span>
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#191C24] truncate">
              {profile ? profile.risk_label : "Uncalibrated Profile"}
            </span>
            {profile ? (
              <span className="text-[10px] font-bold text-[#8A6A00] bg-[#FAF6ED] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                Lvl {profile.risk_level}/5
              </span>
            ) : (
              <button
                onClick={onOpenAssessment}
                className="text-[10px] font-bold text-[#8A6A00] hover:underline"
              >
                Assess Now →
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items (The 4 Main Services + Overview) */}
        <nav className="space-y-1.5">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#858995]">
            Core Services
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#191C24] text-white shadow-md shadow-[#191C24]/10 border border-[#D4AF37]/40"
                    : "text-[#5F6470] hover:text-[#191C24] hover:bg-white/80 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <span
                    className={`p-1.5 rounded-xl transition-colors ${
                      isActive ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "text-[#858995]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <div>
                    <div className="text-xs font-bold tracking-tight">{item.label}</div>
                    <div
                      className={`text-[10px] truncate max-w-[140px] ${
                        isActive ? "text-[#C5CAD6]" : "text-[#858995]"
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      isActive
                        ? "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30"
                        : "bg-[#F8F7F4] text-[#8A6A00] border-[#E8E5DE]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom Section (Security, Profile & Sign Out) ── */}
      <div className="pt-4 border-t border-[#E8E5DE] space-y-2">
        <button
          onClick={onOpenAssessment}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#191C24] hover:bg-white border border-[#E8E5DE] transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <SparklesIcon size={14} className="text-[#8A6A00]" />
            <span>Risk Questionnaire</span>
          </span>
          <span className="text-[10px] text-[#858995]">v1</span>
        </button>

        <button
          onClick={onOpenSecurity}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#191C24] hover:bg-white border border-[#E8E5DE] transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <ShieldCheckIcon size={14} className="text-[#8A6A00]" />
            <span>Account & 2FA</span>
          </span>
          <span className="text-[10px] text-emerald-600 font-bold">Secure</span>
        </button>

        <div className="pt-2 flex items-center justify-between px-2">
          <div className="text-[11px] text-[#858995] truncate max-w-[130px]">
            {userEmail || "Investor Account"}
          </div>
          <button
            onClick={onLogout}
            className="text-[11px] font-bold text-[#9E2D3A] hover:underline cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] lg:w-[292px] shrink-0 bg-white/70 backdrop-blur-md border-r border-[#E8E5DE] sticky top-0 h-screen z-30 shadow-xs">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 animate-slide-right flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
