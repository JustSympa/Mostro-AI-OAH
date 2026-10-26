"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheckIcon, CheckCircle2Icon, ArrowUpRightIcon } from "../../components/Icons";
import { ChevronLeft } from "lucide-react";
import { setAuthSession, API_BASE } from "../../lib/auth";

/* ───────────────────────── Local SVGs ───────────────────────── */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
   METALLIC SPHERE — BURGUNDY / DEEP WINE
   Specular white → rose blush → ruby → dark wine → near-black
───────────────────────────────────────────────────────── */
function MetallicSphere({ size, style }: {
  size: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%,
          #ffffff       0%,
          #f2b8be      12%,
          #d4606c      28%,
          #9e2d3a      48%,
          #722F37      65%,
          #4a1520      82%,
          #1e0508     100%)`,
        boxShadow: `
          inset -${size * 0.08}px -${size * 0.08}px ${size * 0.20}px rgba(30,5,8,0.55),
          inset  ${size * 0.04}px  ${size * 0.04}px ${size * 0.12}px rgba(255,200,205,0.70),
          0 ${size * 0.14}px ${size * 0.32}px rgba(114,47,55,0.40)`,
        ...style,
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────
   METALLIC SPHERE — GOLD / WARM AMBER
   Specular white → bright cream → amber → deep gold → ochre
───────────────────────────────────────────────────────── */
function MetallicSphereGold({ size, style }: {
  size: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%,
          #ffffff       0%,
          #fff8d6      10%,
          #ffe066      24%,
          #e5c358      42%,
          #d4af37      60%,
          #a07c10      80%,
          #5c4300     100%)`,
        boxShadow: `
          inset -${size * 0.08}px -${size * 0.08}px ${size * 0.20}px rgba(80,55,0,0.50),
          inset  ${size * 0.04}px  ${size * 0.04}px ${size * 0.12}px rgba(255,250,200,0.90),
          0 ${size * 0.14}px ${size * 0.32}px rgba(212,175,55,0.45)`,
        ...style,
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────
   METALLIC SPHERE — DARK / MIDNIGHT CHARCOAL
   Specular light-slate → mid-blue-gray → deep navy → near-black
───────────────────────────────────────────────────────── */
function MetallicSphereDark({ size, style }: {
  size: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%,
          #9aa0ae       0%,
          #6b7280      18%,
          #454a55      36%,
          #2d3240      55%,
          #191c24      72%,
          #0f111a      88%,
          #05070d     100%)`,
        boxShadow: `
          inset -${size * 0.08}px -${size * 0.08}px ${size * 0.20}px rgba(0,0,0,0.70),
          inset  ${size * 0.04}px  ${size * 0.04}px ${size * 0.12}px rgba(180,190,210,0.35),
          0 ${size * 0.14}px ${size * 0.32}px rgba(15,17,26,0.50)`,
        ...style,
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────
   METALLIC RING / TORUS — supports color variants
───────────────────────────────────────────────────────── */
type RingVariant = "silver" | "gold" | "burgundy" | "dark";

const RING_COLORS: Record<RingVariant, [string, string, string, string]> = {
  silver: ["#e8e8e8", "#c0c0c0", "#d0d0d0", "#909090"],
  gold: ["#ffe680", "#d4af37", "#f0d060", "#8a6800"],
  burgundy: ["#e8808a", "#9e2d3a", "#c04050", "#4a1520"],
  dark: ["#6b7280", "#2d3240", "#454a55", "#0f111a"],
};

function MetallicRing({ size, thickness, style, variant = "silver" }: {
  size: number;
  thickness: number;
  style?: React.CSSProperties;
  variant?: RingVariant;
}) {
  const [top, right, bottom, left] = RING_COLORS[variant];
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: "transparent",
        border: `${thickness}px solid`,
        borderColor: "transparent",
        borderTopColor: top,
        borderRightColor: right,
        borderBottomColor: bottom,
        borderLeftColor: left,
        boxShadow: `
          0 0 0 ${thickness * 0.4}px rgba(255,255,255,0.12),
          0 ${size * 0.08}px ${size * 0.22}px rgba(40,40,40,0.22),
          inset 0 0 ${thickness * 2.5}px rgba(255,255,255,0.25)`,
        filter: `drop-shadow(0 3px 10px rgba(40,40,40,0.25))`,
        ...style,
      }}
    />
  );
}

/* ─────────────── Flow Points ─────────────── */
const flowPoints = [
  {
    color: "#191C24",
    label: "Midnight Black",
    title: "Gamified Learning Quests",
    desc: "Step-by-step financial mastery from foundations to advanced derivatives.",
  },
  {
    color: "#722F37",
    label: "Deep Burgundy",
    title: "IPO Discovery Radar",
    desc: "Live tracking of every public market debut — S-1 filings to lockup dates.",
  },
  {
    color: "#D4AF37",
    label: "Gold",
    title: "24/7 AI Financial Clarity",
    desc: "Your personal copilot to cut through financial jargon — anytime.",
  },
];

/* ─────────────── Inner Component (uses useSearchParams) ─────────────── */
function AuthInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(() => (searchParams.get("tab") === "signup" ? 1 : 0));

  // Sign In state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  // Sign Up state
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  const isLengthValid = regPassword.length >= 12;
  const hasLettersAndNums = /[a-zA-Z]/.test(regPassword) && /[0-9!@#$%^&*(),.?":{}|<>]/.test(regPassword);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(null); setLoginSuccess(null); setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed.");
      if (data.status === "mfa_required") {
        setMfaRequired(true);
        setChallengeToken(data.challenge_token);
        setLoginSuccess("Enter your 2FA code.");
      } else if (data.status === "ok") {
        setAuthSession(data.access_token, data.expires_in || 900, loginEmail);
        setLoginSuccess("Authentication successful! Redirecting...");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to reach authentication service.";
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(null); setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challenge_token: challengeToken, code: twoFactorCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid 2FA code.");
      if (data.status === "ok") {
        setAuthSession(data.access_token, data.expires_in || 900, loginEmail);
        setLoginSuccess("Verified! Access granted.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify 2FA code.";
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setRegError(null);
    if (!isLengthValid) { setRegError("Password must be at least 12 characters."); return; }
    if (!termsAccepted) { setRegError("Please accept the educational terms to continue."); return; }
    setRegLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join(". ")
          : (data.detail || "Registration could not be completed.");
        throw new Error(msg);
      }
      setRegSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to reach authentication service.";
      setRegError(msg);
    }
    finally { setRegLoading(false); }
  };

  /* shared input class */
  const inputCls = `
    w-full px-4 py-3 rounded-xl text-sm text-[#191C24] placeholder-[#9A9A9A]
    bg-white/55 border border-white/70
    focus:outline-none focus:border-[#D4AF37]/80 focus:ring-2 focus:ring-[#D4AF37]/20
    transition-all duration-200 backdrop-blur-sm
  `;

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 py-12"
      style={{ background: "linear-gradient(135deg, #dcdcdc 0%, #e8e7e4 40%, #d5d5d5 100%)" }}
    >

      {/* ═══════════════ FLOATING METALLIC OBJECTS ═══════════════ */}

      {/* Spheres */}
      {/* Large midnight-black spheres */}
      <MetallicSphere
        size={220}
        style={{ top: "-65px", right: "-45px", opacity: 0.92 }}
      />
      {/* Burgundy — mid sizes */}
      <MetallicSphere
        size={140}
        style={{ top: "40%", left: "-70px", opacity: 0.88 }}
      />
      <MetallicSphere
        size={80}
        style={{ bottom: "22%", right: "28%", opacity: 0.78 }}
      />

      {/* ── GOLD spheres ── */}
      <MetallicSphereGold
        size={200}
        style={{ bottom: "-75px", right: "10%", opacity: 0.92 }}
      />
      <MetallicSphereGold
        size={160}
        style={{ top: "-70px", right: "26%", opacity: 0.90 }}
      />
      <MetallicSphereGold
        size={110}
        style={{ top: "16%", left: "-40px", opacity: 0.88 }}
      />
      <MetallicSphereGold
        size={60}
        style={{ top: "10%", right: "13%", opacity: 0.80 }}
      />
      <MetallicSphereGold
        size={44}
        style={{ top: "68%", left: "14%", opacity: 0.75 }}
      />

      {/* ── DARK / MIDNIGHT spheres ── */}
      <MetallicSphereDark
        size={170}
        style={{ bottom: "-60px", left: "20%", opacity: 0.88 }}
      />
      <MetallicSphereDark
        size={100}
        style={{ top: "58%", right: "7%", opacity: 0.82 }}
      />
      <MetallicSphereDark
        size={55}
        style={{ top: "12%", left: "14%", opacity: 0.78 }}
      />
      <MetallicSphereDark
        size={130}
        style={{ bottom: "8%", left: "-55px", opacity: 0.85 }}
      />

      {/* ── Rings / Tori — each gets its own color variant ── */}
      <MetallicRing size={190} thickness={24} variant="burgundy"
        style={{ top: "26%", right: "-55px", opacity: 0.82, transform: "rotate(-28deg)" }} />
      <MetallicRing size={130} thickness={17} variant="gold"
        style={{ bottom: "18%", left: "6%", opacity: 0.72, transform: "rotate(52deg)" }} />
      <MetallicRing size={95} thickness={13} variant="dark"
        style={{ top: "7%", left: "27%", opacity: 0.62, transform: "rotate(18deg)" }} />
      <MetallicRing size={72} thickness={10} variant="silver"
        style={{ bottom: "34%", right: "13%", opacity: 0.58, transform: "rotate(-62deg)" }} />
      <MetallicRing size={58} thickness={8} variant="gold"
        style={{ top: "52%", left: "32%", opacity: 0.50, transform: "rotate(38deg)" }} />


      {/* Diffuse ambient light */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(255,255,255,0.25), transparent 70%)" }} />

      {/* ═══════════════ WIDE GLASS CARD ═══════════════ */}
      <div className="relative w-full max-w-5xl z-10">

        {/* Outer rim — very subtle white highlight */}
        <div className="absolute -inset-[1px] rounded-[32px] pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.15) 50%, rgba(200,200,200,0.3) 100%)",
            borderRadius: 33,
            filter: "blur(0.5px)",
          }} />

        {/* The glass panel */}
        <div
          className="relative rounded-[30px] overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.38)",
            backdropFilter: "blur(36px) saturate(150%) brightness(1.04)",
            WebkitBackdropFilter: "blur(36px) saturate(150%) brightness(1.04)",
            border: "1px solid rgba(255, 255, 255, 0.65)",
            boxShadow: `
              inset 0 1.5px 1px 0 rgba(255,255,255,0.90),
              inset 0 -1px 1px 0 rgba(200,200,200,0.35),
              0 32px 72px -16px rgba(80,80,80,0.22),
              0 8px 24px rgba(120,120,120,0.10)
            `,
          }}
        >
          {/* Top specular shimmer */}
          <div className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95) 50%, transparent)" }} />

          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[620px]">

            {/* ══════════ LEFT PANEL: Brand + Flow Points ══════════ */}
            <div
              className="flex flex-col justify-between p-10 lg:p-12 relative overflow-hidden"
              style={{
                borderRight: "1px solid rgba(255,255,255,0.50)",
                background: "rgba(255,255,255,0.18)",
              }}
            >
              {/* Subtle inner sphere decoration */}
              <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle at 35% 30%, #fff 0%, #e0e0e0 50%, #bbb 100%)",
                  opacity: 0.25,
                  filter: "blur(2px)",
                }} />

              {/* Logo */}
              <div className="relative z-10">
                <Link
                  href="/"
                  aria-label="Back to home"
                  className="mt-3 inline-flex items-center text-[#5F6470] hover:text-[#191C24] transition-colors"
                >
                  <ChevronLeft size={18} strokeWidth={1.8} />
                </Link>
                <Link href="/" className="inline-block group">
                  <img
                    src="/logo-icon.png"
                    alt="Mostro AI"
                    className="h-10 w-auto object-contain group-hover:opacity-90 transition-opacity rounded-[10px]"
                  />
                </Link>
              </div>

              {/* Headline */}
              <div className="relative z-10 space-y-3 mt-8 lg:mt-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A6A00]">
                  Your Financial Education Hub
                </p>
                <h2 className="text-3xl font-black text-[#191C24] leading-tight tracking-tight">
                  Build real financial
                  <br />
                  <span
                    style={{
                      background: "linear-gradient(90deg, #191C24 0%, #722F37 45%, #D4AF37 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    confidence.
                  </span>
                </h2>
                <p className="text-sm text-[#5F6470] leading-relaxed max-w-xs">
                  Join thousands mastering markets through guided quests, live IPO data, and 24/7 AI clarity.
                </p>
              </div>

              {/* Flow Points */}
              <div className="relative z-10 space-y-4 mt-8 lg:mt-0">
                {flowPoints.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3.5">
                    {/* Colored indicator dot */}
                    <div
                      className="mt-1 shrink-0 w-3 h-3 rounded-full shadow-md"
                      style={{
                        background: pt.color,
                        boxShadow: `0 0 0 3px ${pt.color}22, 0 2px 8px ${pt.color}55`,
                      }}
                    />
                    <div>
                      <p className="text-sm font-bold text-[#191C24] leading-snug">{pt.title}</p>
                      <p className="text-xs text-[#5F6470] leading-relaxed mt-0.5">{pt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom trust badge */}
              <div className="relative z-10 mt-8 lg:mt-0 flex items-center gap-2 text-[11px] text-[#858995]">
                <ShieldCheckIcon size={14} className="text-[#8A6A00]" />
                <span>Argon2id encrypted · Hardware 2FA ready · Zero product upsells</span>
              </div>
            </div>

            {/* ══════════ RIGHT PANEL: Form ══════════ */}
            <div className="flex flex-col p-8 sm:p-10 lg:p-12">

              {/* Tab Switcher */}
              <div
                className="relative flex p-1.5 rounded-2xl mb-7"
                style={{
                  background: "rgba(255,255,255,0.50)",
                  border: "1px solid rgba(255,255,255,0.70)",
                }}
              >
                {/* Sliding indicator */}
                <div
                  className="absolute top-1.5 bottom-1.5 rounded-xl transition-transform duration-300"
                  style={{
                    width: "calc(50% - 6px)",
                    left: 6,
                    background: "rgba(255,255,255,0.85)",
                    boxShadow: "0 2px 10px rgba(120,120,120,0.15), 0 1px 3px rgba(0,0,0,0.08)",
                    border: "1px solid rgba(255,255,255,0.90)",
                    transform: tab === 0 ? "translateX(0)" : "translateX(calc(100% + 6px))",
                  }}
                />
                {["Sign In", "Sign Up"].map((label, i) => (
                  <button
                    key={i}
                    id={`tab-${i === 0 ? "signin" : "signup"}`}
                    onClick={() => setTab(i)}
                    className={`relative flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 z-10 ${tab === i ? "text-[#191C24]" : "text-[#858995] hover:text-[#5F6470]"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Slide Viewport */}
              <div className="overflow-hidden flex-1">
                <div
                  className="flex h-full transition-transform duration-500"
                  style={{
                    transform: `translateX(${tab === 0 ? "0%" : "-100%"})`,
                    transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
                  }}
                >

                  {/* ── SIGN IN ── */}
                  <div className="min-w-full space-y-4">
                    <div className="mb-5">
                      <h1 className="text-2xl font-black text-[#191C24] tracking-tight">Welcome back</h1>
                      <p className="text-xs text-[#858995] mt-1">Resume your financial education journey.</p>
                    </div>

                    {loginError && (
                      <div className="p-3 rounded-xl text-xs text-rose-700 leading-relaxed"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        {loginError}
                      </div>
                    )}
                    {loginSuccess && (
                      <div className="p-3 rounded-xl text-xs text-emerald-700 leading-relaxed"
                        style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                        {loginSuccess}
                      </div>
                    )}

                    {!mfaRequired ? (
                      <>
                        <a href={`${API_BASE}/auth/google`} id="btn-google-signin"
                          className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-semibold text-sm text-[#191C24] transition-all"
                          style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.80)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                          <GoogleIcon /> Continue with Google
                        </a>

                        <div className="relative flex items-center justify-center">
                          <div className="w-full" style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }} />
                          <span className="absolute px-3 text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-widest"
                            style={{ background: "rgba(240,240,238,0.01)", backdropFilter: "blur(4px)" }}>
                            or with email
                          </span>
                        </div>

                        <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                          <div className="space-y-1.5">
                            <label htmlFor="login-email" className="block text-xs font-semibold text-[#5F6470] uppercase tracking-wider">Email</label>
                            <input id="login-email" type="email" required placeholder="name@example.com"
                              value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputCls} />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label htmlFor="login-password" className="text-xs font-semibold text-[#5F6470] uppercase tracking-wider">Password</label>
                              <a href="#" className="text-[11px] font-semibold text-[#722F37] hover:text-[#9A3F48] transition-colors">Forgot?</a>
                            </div>
                            <div className="relative">
                              <input id="login-password" type={showLoginPwd ? "text" : "password"} required
                                placeholder="Enter your password" value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)} className={inputCls + " pr-12"} />
                              <button type="button" onClick={() => setShowLoginPwd(!showLoginPwd)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#5F6470] transition-colors">
                                <EyeIcon open={showLoginPwd} />
                              </button>
                            </div>
                          </div>

                          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#858995] pt-0.5">
                            <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#D0D0D0] accent-[#D4AF37]" />
                            Remember this device for 30 days
                          </label>

                          <button id="btn-signin-submit" type="submit" disabled={loginLoading}
                            className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              background: "linear-gradient(135deg, #191C24 0%, #722F37 60%, #8A3F48 100%)",
                              boxShadow: "0 4px 20px rgba(114,47,55,0.35), 0 2px 6px rgba(25,28,36,0.2)",
                            }}>
                            {loginLoading ? "Authenticating..." : "Sign In to Mostro AI"}
                          </button>
                        </form>
                      </>
                    ) : (
                      <form onSubmit={handleMfaSubmit} className="space-y-4">
                        <div className="p-3.5 rounded-xl space-y-1"
                          style={{ background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.30)" }}>
                          <span className="text-xs font-bold text-[#8A6A00] flex items-center gap-1.5">
                            <ShieldCheckIcon size={14} /> Two-Factor Authentication
                          </span>
                          <p className="text-xs text-[#5F6470]">Enter the 6-digit code from your authenticator app.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="mfa-code" className="block text-xs font-semibold text-[#5F6470] uppercase tracking-wider">Auth Code</label>
                          <input id="mfa-code" type="text" required placeholder="e.g. 123456"
                            value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)}
                            className={inputCls + " text-center font-mono tracking-widest"} />
                        </div>
                        <button id="btn-mfa-submit" type="submit" disabled={loginLoading}
                          className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #191C24 0%, #722F37 60%, #8A3F48 100%)", boxShadow: "0 4px 20px rgba(114,47,55,0.35)" }}>
                          {loginLoading ? "Verifying..." : "Confirm & Sign In"}
                        </button>
                        <button type="button" onClick={() => setMfaRequired(false)}
                          className="w-full text-xs text-[#9A9A9A] hover:text-[#5F6470] transition-colors text-center">
                          ← Return to login
                        </button>
                      </form>
                    )}

                    <p className="text-center text-xs text-[#9A9A9A] pt-2">
                      No account yet?{" "}
                      <button onClick={() => setTab(1)}
                        className="font-bold text-[#722F37] hover:text-[#9A3F48] transition-colors hover:underline underline-offset-2">
                        Sign up free →
                      </button>
                    </p>
                  </div>

                  {/* ── SIGN UP ── */}
                  <div className="min-w-full space-y-4">
                    {!regSuccess ? (
                      <>
                        <div className="mb-5">
                          <h1 className="text-2xl font-black text-[#191C24] tracking-tight">Create your account</h1>
                          <p className="text-xs text-[#858995] mt-1">Instant access to financial quests & market intelligence.</p>
                        </div>

                        {regError && (
                          <div className="p-3 rounded-xl text-xs text-rose-700 leading-relaxed"
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                            {regError}
                          </div>
                        )}

                        <a href={`${API_BASE}/auth/google`} id="btn-google-register"
                          className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-semibold text-sm text-[#191C24] transition-all"
                          style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.80)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                          <GoogleIcon /> Sign up with Google
                        </a>

                        <div className="relative flex items-center justify-center">
                          <div className="w-full" style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }} />
                          <span className="absolute px-3 text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-widest"
                            style={{ backdropFilter: "blur(4px)" }}>
                            or with email
                          </span>
                        </div>

                        <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                          <div className="space-y-1.5">
                            <label htmlFor="reg-email" className="block text-xs font-semibold text-[#5F6470] uppercase tracking-wider">Email</label>
                            <input id="reg-email" type="email" required placeholder="name@example.com"
                              value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputCls} />
                          </div>

                          <div className="space-y-1.5">
                            <label htmlFor="reg-password" className="block text-xs font-semibold text-[#5F6470] uppercase tracking-wider">Password (12+ chars)</label>
                            <div className="relative">
                              <input id="reg-password" type={showRegPwd ? "text" : "password"} required
                                placeholder="Create a strong password" value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)} className={inputCls + " pr-12"} />
                              <button type="button" onClick={() => setShowRegPwd(!showRegPwd)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#5F6470] transition-colors">
                                <EyeIcon open={showRegPwd} />
                              </button>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className={`flex items-center gap-1 text-[11px] transition-colors ${isLengthValid ? "text-emerald-600 font-semibold" : "text-[#B0B0B0]"}`}>
                                <CheckCircle2Icon size={11} /> 12+ chars
                              </span>
                              <span className={`flex items-center gap-1 text-[11px] transition-colors ${hasLettersAndNums ? "text-emerald-600 font-semibold" : "text-[#B0B0B0]"}`}>
                                <CheckCircle2Icon size={11} /> Letters & numbers
                              </span>
                            </div>
                          </div>

                          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#858995] leading-relaxed pt-0.5">
                            <input type="checkbox" checked={termsAccepted}
                              onChange={(e) => setTermsAccepted(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-[#D0D0D0] accent-[#D4AF37] mt-0.5 shrink-0" />
                            I understand Mostro AI is an educational platform and does not offer financial advisory services.
                          </label>

                          <button id="btn-register-submit" type="submit" disabled={regLoading}
                            className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              background: "linear-gradient(135deg, #191C24 0%, #722F37 60%, #8A3F48 100%)",
                              boxShadow: "0 4px 20px rgba(114,47,55,0.35), 0 2px 6px rgba(25,28,36,0.2)",
                            }}>
                            {regLoading ? "Creating Account..." : "Create Free Account"}
                          </button>
                        </form>

                        <p className="text-center text-xs text-[#9A9A9A] pt-2">
                          Already have an account?{" "}
                          <button onClick={() => setTab(0)}
                            className="font-bold text-[#722F37] hover:text-[#9A3F48] transition-colors hover:underline underline-offset-2">
                            Sign in →
                          </button>
                        </p>
                      </>
                    ) : (
                      <div className="text-center space-y-6 py-8">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                          style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.35)" }}>
                          <CheckCircle2Icon size={30} className="text-[#8A6A00]" />
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-xl font-bold text-[#191C24]">Check your inbox!</h2>
                          <p className="text-xs text-[#5F6470] max-w-xs mx-auto leading-relaxed">
                            A verification link was sent to{" "}
                            <strong className="text-[#191C24]">{regEmail}</strong>.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                          <Link
                            href="/verify-email"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-[#191C24] bg-white/80 hover:bg-white border border-[#D4AF37]/50 shadow-md transition-all"
                          >
                            Enter Verification Token <ArrowUpRightIcon size={15} className="text-[#8A6A00]" />
                          </Link>
                          <button onClick={() => setTab(0)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg"
                            style={{ background: "linear-gradient(135deg, #191C24 0%, #722F37 60%, #8A3F48 100%)", boxShadow: "0 4px 20px rgba(114,47,55,0.35)" }}>
                            Proceed to Sign In <ArrowUpRightIcon size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Bottom disclaimer */}
              <p className="text-center text-[10px] text-[#B0B0B0] leading-relaxed mt-6 pt-5"
                style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                Mostro AI is purely an educational platform. No investment advice is provided.
                <br />Protected by Argon2id encryption &amp; enterprise-grade security.
              </p>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Outer page wrapped in Suspense for useSearchParams ─────────────── */
export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#dcdcdc]" />}>
      <AuthInner />
    </Suspense>
  );
}
