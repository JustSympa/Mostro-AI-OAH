"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  isAuthenticated,
  getStoredEmail,
  logout,
  apiFetch,
  subscribeToAuth,
} from "../../lib/auth";
import {
  ShieldCheckIcon,
  SparklesIcon,
  MenuIcon,
} from "../../components/Icons";
import {
  DashboardSidebar,
  DashboardTab,
} from "../../components/DashboardSidebar";
import {
  RiskAssessmentWizard,
  RiskProfileData,
} from "../../components/RiskAssessmentWizard";
import { SecuritySettingsModal } from "../../components/SecuritySettingsModal";
import { IpoInteractiveCalendar } from "../../components/IpoInteractiveCalendar";
import { FinancialLearningHub } from "../../components/FinancialLearningHub";
import { IpoNewsHub } from "../../components/IpoNewsHub";

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state (ipo, learning, news)
  const initialTab = (searchParams.get("tab") as DashboardTab) || "ipo";
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    initialTab === "learning" || initialTab === "news" ? initialTab : "ipo"
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // User & Profile State
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<RiskProfileData | null>(null);

  // Modals state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  // Learning Service State
  const [userXp, setUserXp] = useState(450);

  // Authentication check
  useEffect(() => {
    const syncAuth = () => {
      if (!isAuthenticated()) {
        router.replace("/login");
        return;
      }
      setUserEmail(getStoredEmail());
    };

    syncAuth();
    return subscribeToAuth(syncAuth);
  }, [router]);

  // Fetch Risk Profile from Backend
  useEffect(() => {
    const loadRiskProfile = async () => {
      try {
        const res = await apiFetch("/profile/me");
        if (res.ok) {
          const data: RiskProfileData = await res.json();
          setProfile(data);
        } else if (res.status === 404) {
          setProfile(null);
        }
      } catch (err) {
        console.warn("Could not load risk profile:", err);
      }
    };

    if (isAuthenticated()) {
      loadRiskProfile();
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#191C24] flex selection:bg-[#E8D8B0]">
      {/* ════════════════ LEFT DASHBOARD SIDEBAR ════════════════ */}
      <DashboardSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        profile={profile}
        userEmail={userEmail}
        onOpenSecurity={() => setSecurityModalOpen(true)}
        onOpenAssessment={() => setWizardOpen(true)}
        onLogout={handleLogout}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* ════════════════ RIGHT MAIN CONTENT ════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top App Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-[#E8E5DE] px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-[#5F6470] hover:text-[#191C24] hover:bg-[#F8F7F4] border border-[#E8E5DE]"
            >
              <MenuIcon size={20} />
            </button>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#858995]">
                Mostro AI Platform
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#191C24] capitalize">
                {activeTab === "ipo"
                  ? "IPO Calendar & Intel"
                  : activeTab === "learning"
                  ? "Financial Learning Quests"
                  : "News & Updates"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setWizardOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#191C24] bg-[#FAF6ED] hover:bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-full transition-all cursor-pointer"
            >
              <SparklesIcon size={14} className="text-[#8A6A00]" />
              <span>{profile ? `Risk Lvl ${profile.risk_level}` : "Calibrate Risk"}</span>
            </button>

            <button
              onClick={() => setSecurityModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#191C24] bg-white border border-[#E8E5DE] rounded-full hover:border-[#D4AF37] transition-all cursor-pointer shadow-xs"
            >
              <ShieldCheckIcon size={14} className="text-[#8A6A00]" />
              <span>2FA Protected</span>
            </button>

            <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#191C24] text-white">
              {userXp} XP
            </div>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="p-4 sm:p-8 space-y-8 w-full max-w-[1700px] mx-auto">
          {/* ════════════════ TAB 2: FINANCIAL LEARNING ════════════════ */}
          {activeTab === "learning" && (
            <div className="animate-fade-in">
              <FinancialLearningHub onXpChange={setUserXp} />
            </div>
          )}

          {/* ════════════════ TAB 1: IPO CALENDAR (DEFAULT) ════════════════ */}
          {activeTab === "ipo" && (
            <div className="space-y-6 animate-fade-in">
              <IpoInteractiveCalendar />
            </div>
          )}

          {/* ════════════════ TAB 3: NEWS & UPDATES ════════════════ */}
          {activeTab === "news" && (
            <div className="animate-fade-in">
              <IpoNewsHub riskLabel={profile?.risk_label} />
            </div>
          )}
        </main>
      </div>

      {/* ════════════════ MODALS ════════════════ */}
      <RiskAssessmentWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={(newProfile) => {
          setProfile(newProfile);
        }}
        isReassessment={!!profile}
      />

      <SecuritySettingsModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
        userEmail={userEmail}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-9 h-9 border-3 border-[#1E2568] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[#5F6470]">Loading Mostro AI Command Center...</p>
          </div>
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
