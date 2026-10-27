"use client";

import React, { useState } from "react";
import { apiFetch } from "../lib/auth";
import { ShieldCheckIcon, XIcon } from "./Icons";

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null;
}

export function SecuritySettingsModal({
  isOpen,
  onClose,
  userEmail,
}: SecuritySettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"2fa" | "password">("2fa");

  // 2FA state
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [twoFaSuccess, setTwoFaSuccess] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle 2FA Setup Generation
  const handleStartTotpSetup = async () => {
    setTwoFaError(null);
    setTwoFaSuccess(null);
    setTwoFaLoading(true);
    try {
      const res = await apiFetch("/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to initialize 2FA.");
      setQrSvg(data.qr_svg);
    } catch (err: unknown) {
      setTwoFaError(err instanceof Error ? err.message : "Failed to load 2FA setup.");
    } finally {
      setTwoFaLoading(false);
    }
  };

  // Handle 2FA Verification
  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError(null);
    setTwoFaLoading(true);
    try {
      const res = await apiFetch("/auth/2fa/verify-setup", {
        method: "POST",
        body: JSON.stringify({ code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid code. Please try again.");
      setBackupCodes(data.backup_codes);
      setQrSvg(null);
      setTwoFaSuccess("Two-Factor Authentication is now enabled on your account!");
    } catch (err: unknown) {
      setTwoFaError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setTwoFaLoading(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword.length < 12) {
      setPwdError("New password must be at least 12 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    setPwdLoading(true);
    try {
      const res = await apiFetch("/auth/set-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword || null,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join(". ")
          : data.detail || "Could not update password.";
        throw new Error(msg);
      }
      setPwdSuccess("Password successfully changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#191C24] text-white rounded-3xl border border-[#D4AF37]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
              <ShieldCheckIcon size={20} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Security Settings</h2>
              <p className="text-xs text-[#A0A5B2]">{userEmail || "Account Security"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#A0A5B2] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 flex gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab("2fa")}
            className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === "2fa" ? "text-[#D4AF37]" : "text-[#A0A5B2] hover:text-white"
            }`}
          >
            Two-Factor Auth (2FA)
            {activeTab === "2fa" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === "password" ? "text-[#D4AF37]" : "text-[#A0A5B2] hover:text-white"
            }`}
          >
            Change Password
            {activeTab === "password" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === "2fa" && (
            <div className="space-y-4">
              {!qrSvg && !backupCodes && (
                <div className="space-y-4">
                  <p className="text-xs text-[#C5CAD6] leading-relaxed">
                    Protect your account with Time-based One-Time Password (TOTP) authentication using
                    apps like Google Authenticator, 1Password, or Authy.
                  </p>
                  <button
                    onClick={handleStartTotpSetup}
                    disabled={twoFaLoading}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#191C24] bg-[#D4AF37] hover:bg-[#FAF6ED] transition-all cursor-pointer shadow-md shadow-[#D4AF37]/20"
                  >
                    {twoFaLoading ? "Generating QR Code..." : "Setup Two-Factor Authenticator"}
                  </button>
                </div>
              )}

              {/* QR Code Step */}
              {qrSvg && (
                <div className="space-y-4 text-center">
                  <p className="text-xs text-[#C5CAD6]">
                    Scan this QR code using your authenticator app, then enter the 6-digit code below:
                  </p>
                  <div
                    className="p-4 bg-white rounded-2xl inline-block max-w-[200px] mx-auto shadow-inner [&>svg]:w-full [&>svg]:h-auto"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                  <form onSubmit={handleVerifyTotp} className="space-y-3 max-w-xs mx-auto">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.trim())}
                      className="w-full text-center text-lg tracking-widest font-mono py-2.5 px-4 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#D4AF37]"
                      required
                    />
                    <button
                      type="submit"
                      disabled={twoFaLoading || totpCode.length < 6}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-[#191C24] bg-[#D4AF37] hover:bg-[#FAF6ED] transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {twoFaLoading ? "Verifying..." : "Verify & Enable 2FA"}
                    </button>
                  </form>
                </div>
              )}

              {/* Backup Codes Display */}
              {backupCodes && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    <strong>2FA Enabled!</strong> Save these single-use recovery codes in a safe
                    place. If you lose your phone, you will need these to access your account:
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-black/40 rounded-xl font-mono text-xs text-white border border-white/10">
                    {backupCodes.map((code, idx) => (
                      <div key={idx} className="p-1 text-center bg-white/5 rounded">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {twoFaSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  {twoFaSuccess}
                </div>
              )}
              {twoFaError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {twoFaError}
                </div>
              )}
            </div>
          )}

          {activeTab === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs text-[#A0A5B2] block mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="text-xs text-[#A0A5B2] block mb-1">New Password (12+ characters)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-[#A0A5B2] block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                  required
                />
              </div>

              {pwdSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  {pwdSuccess}
                </div>
              )}
              {pwdError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {pwdError}
                </div>
              )}

              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full py-3 rounded-xl text-xs font-bold text-[#191C24] bg-[#D4AF37] hover:bg-[#FAF6ED] transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-[#D4AF37]/20"
              >
                {pwdLoading ? "Updating Password..." : "Save New Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
