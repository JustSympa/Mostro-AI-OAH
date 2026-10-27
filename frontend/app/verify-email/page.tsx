"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ShieldCheckIcon, CheckCircle2Icon, ArrowUpRightIcon } from "../../components/Icons";
import { ChevronLeft, KeyRound, AlertCircle, RefreshCw } from "lucide-react";
import { API_BASE } from "../../lib/auth";

/* ───────────────────────── 3D Metallic Spheres (Matching /login) ───────────────────────── */
function MetallicSphere({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%,
          #ffffff 0%, #f2b8be 12%, #d4606c 28%, #9e2d3a 48%, #722F37 65%, #4a1520 82%, #1e0508 100%)`,
        boxShadow: `
          inset -${size * 0.08}px -${size * 0.08}px ${size * 0.20}px rgba(30,5,8,0.55),
          inset  ${size * 0.04}px  ${size * 0.04}px ${size * 0.12}px rgba(255,200,205,0.70),
          0 ${size * 0.14}px ${size * 0.32}px rgba(114,47,55,0.40)`,
        ...style,
      }}
    />
  );
}

function MetallicSphereGold({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%,
          #ffffff 0%, #fff8d6 10%, #ffe066 24%, #e5c358 42%, #d4af37 60%, #a07c10 80%, #5c4300 100%)`,
        boxShadow: `
          inset -${size * 0.08}px -${size * 0.08}px ${size * 0.20}px rgba(80,55,0,0.50),
          inset  ${size * 0.04}px  ${size * 0.04}px ${size * 0.12}px rgba(255,250,200,0.90),
          0 ${size * 0.14}px ${size * 0.32}px rgba(212,175,55,0.45)`,
        ...style,
      }}
    />
  );
}

function MetallicSphereDark({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%,
          #9aa0ae 0%, #6b7280 18%, #454a55 36%, #2d3240 55%, #191c24 72%, #0f111a 88%, #05070d 100%)`,
        boxShadow: `
          inset -${size * 0.08}px -${size * 0.08}px ${size * 0.20}px rgba(0,0,0,0.70),
          inset  ${size * 0.04}px  ${size * 0.04}px ${size * 0.12}px rgba(180,190,210,0.35),
          0 ${size * 0.14}px ${size * 0.32}px rgba(15,17,26,0.50)`,
        ...style,
      }}
    />
  );
}

/* ───────────────────────── Verification Inner Form ───────────────────────── */
function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";
  const initialStatus = searchParams.get("status");

  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(initialStatus === "success");

  const handleVerify = useCallback(async (tokenToVerify: string) => {
    const cleanToken = tokenToVerify.trim();
    if (!cleanToken) {
      setError("Please enter a valid verification token.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: cleanToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Email verification failed. The token may be expired or already used.");
      }

      setIsVerified(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to reach verification service.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // If a token is provided in the URL query, automatically trigger verification
  useEffect(() => {
    if (initialToken && !isVerified) {
      const timer = setTimeout(() => {
        void handleVerify(initialToken);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialToken, isVerified, handleVerify]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(token);
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 py-12"
      style={{ background: "linear-gradient(135deg, #dcdcdc 0%, #e8e7e4 40%, #d5d5d5 100%)" }}
    >
      {/* Floating Metallic Spheres */}
      <MetallicSphere size={220} style={{ top: "-65px", right: "-45px", opacity: 0.92 }} />
      <MetallicSphere size={140} style={{ top: "45%", left: "-70px", opacity: 0.88 }} />
      <MetallicSphereGold size={180} style={{ bottom: "-60px", right: "12%", opacity: 0.92 }} />
      <MetallicSphereGold size={110} style={{ top: "16%", left: "-30px", opacity: 0.88 }} />
      <MetallicSphereDark size={160} style={{ bottom: "-40px", left: "15%", opacity: 0.88 }} />
      <MetallicSphereDark size={90} style={{ top: "60%", right: "8%", opacity: 0.82 }} />

      {/* Main Glassmorphic Card */}
      <div
        className="relative z-10 w-full max-w-lg rounded-3xl p-8 sm:p-10 transition-all duration-300"
        style={{
          background: "rgba(255, 255, 255, 0.45)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.75)",
          boxShadow: `
            inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.90),
            0 24px 60px -12px rgba(25, 28, 36, 0.18),
            0 4px 12px rgba(0, 0, 0, 0.06)`,
        }}
      >
        {/* Navigation / Back Link */}
        <div className="flex items-center justify-between pb-6 border-b border-black/5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F6470] hover:text-[#191C24] transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Back to Sign In</span>
          </Link>
          <div className="flex items-center gap-2">
            <Image
              src="/logo-icon.png"
              alt="Mostro AI"
              width={150}
              height={146}
              className="w-5 h-5 object-contain"
            />
            <span className="text-xs font-bold text-[#191C24] tracking-tight">
              Mostro<span className="text-[#8A6A00]">.ai</span>
            </span>
          </div>
        </div>

        {/* Card Content */}
        <div className="pt-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/80 border border-white/90 shadow-xs text-[#8A6A00] mb-2">
              <KeyRound size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191C24] tracking-tight">
              {isVerified ? "Email Verified" : "Verify Your Email"}
            </h1>
            <p className="text-xs sm:text-sm text-[#5F6470] max-w-sm mx-auto leading-relaxed">
              {isVerified
                ? "Your security credentials have been successfully validated. Your Mostro AI account is active."
                : "Enter the security token sent to your email or developer terminal to activate your account."}
            </p>
          </div>

          {/* Success State */}
          {isVerified ? (
            <div className="space-y-6 pt-2">
              <div
                className="p-5 rounded-2xl flex items-start gap-3.5"
                style={{
                  background: "rgba(38, 115, 77, 0.08)",
                  border: "1px solid rgba(38, 115, 77, 0.25)",
                }}
              >
                <CheckCircle2Icon size={20} className="text-[#26734D] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-[#191C24] space-y-1">
                  <div className="font-bold text-[#26734D]">Verification Complete</div>
                  <p className="text-[#5F6470] leading-relaxed">
                    You can now access your account, configure Two-Factor Authentication, and begin your financial quests.
                  </p>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-[#191C24] hover:bg-[#252A36] border border-[#D4AF37]/50 shadow-lg shadow-[#191C24]/15 transition-all group"
              >
                <span>Proceed to Sign In</span>
                <ArrowUpRightIcon
                  size={16}
                  className="text-[#D4AF37] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                />
              </Link>
            </div>
          ) : (
            /* Verification Input Form */
            <form onSubmit={onSubmit} className="space-y-4 pt-2">
              {error && (
                <div
                  className="p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-[#9E2D3A]"
                  style={{
                    background: "rgba(158, 45, 58, 0.08)",
                    border: "1px solid rgba(158, 45, 58, 0.25)",
                  }}
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{error}</div>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="token-input"
                  className="block text-xs font-semibold text-[#5F6470] uppercase tracking-wider"
                >
                  Security Token
                </label>
                <div className="relative">
                  <input
                    id="token-input"
                    type="text"
                    required
                    placeholder="Paste 64-char hex verification token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-xl text-sm font-mono text-[#191C24] placeholder-[#9A9A9A] bg-white/65 border border-white/80 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all backdrop-blur-sm disabled:opacity-50"
                  />
                  {token && (
                    <button
                      type="button"
                      onClick={() => setToken("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#858995] hover:text-[#191C24] px-1.5 py-0.5"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#858995] pt-0.5">
                  Single-use token valid for 24 hours from initial registration.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !token.trim()}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-[#191C24] hover:bg-[#252A36] border border-[#D4AF37]/50 shadow-md shadow-[#191C24]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin text-[#D4AF37]" />
                    <span>Verifying Token...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Activate Account</span>
                    <ArrowUpRightIcon size={16} className="text-[#D4AF37]" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Security Assurance */}
          <div className="pt-4 border-t border-black/5 flex items-center justify-between text-[11px] text-[#858995]">
            <div className="flex items-center gap-1.5">
              <ShieldCheckIcon size={14} className="text-[#8A6A00]" />
              <span>Cryptographic Token Hashing</span>
            </div>
            <Link href="/login?tab=signup" className="text-[#8A6A00] font-semibold hover:underline">
              Need a new token?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#E8E7E4]">
          <div className="p-6 rounded-2xl bg-white/50 backdrop-blur-md text-sm font-semibold text-[#191C24]">
            Loading verification portal...
          </div>
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
