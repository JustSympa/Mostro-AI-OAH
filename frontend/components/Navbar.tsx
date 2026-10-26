"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SparklesIcon, MenuIcon, XIcon, ArrowUpRightIcon, ShieldCheckIcon } from "./Icons";
import { isAuthenticated, getStoredEmail, logout, subscribeToAuth } from "../lib/auth";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      setIsLoggedIn(isAuthenticated());
      setUserEmail(getStoredEmail());
    };
    updateStatus();
    return subscribeToAuth(updateStatus);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setUserEmail(null);
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel-light border-b border-white/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand (Using User-Provided Light Logo) */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center group py-2">
              <img
                src="/logo-light.png"
                alt="Mostro AI"
                className="h-9 sm:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-white/70 backdrop-blur-md p-1.5 rounded-full border border-[#E8E5DE] shadow-xs">
            <a
              href="#learning-path"
              className="px-4 py-2 text-sm font-medium text-[#5F6470] hover:text-[#191C24] hover:bg-white rounded-full transition-all"
            >
              Financial Learning
            </a>
            <a
              href="#ipo-calendar"
              className="px-4 py-2 text-sm font-medium text-[#5F6470] hover:text-[#191C24] hover:bg-white rounded-full transition-all"
            >
              IPO Calendar
            </a>
            <a
              href="#news"
              className="px-4 py-2 text-sm font-medium text-[#5F6470] hover:text-[#191C24] hover:bg-white rounded-full transition-all"
            >
              Market News
            </a>
            <a
              href="#ai-assistant"
              className="px-4 py-2 text-sm font-medium text-[#5F6470] hover:text-[#191C24] hover:bg-white rounded-full transition-all flex items-center gap-1.5"
            >
              <SparklesIcon size={14} className="text-[#8A6A00]" />
              AI Assistant
            </a>
          </nav>

          {/* Desktop Auth CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/80 border border-[#E8E5DE] text-[#191C24] flex items-center gap-1.5">
                  <ShieldCheckIcon size={14} className="text-[#8A6A00]" />
                  <span>{userEmail || "Authenticated"}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-xs font-bold text-[#9E2D3A] hover:bg-rose-50 border border-rose-200/60 rounded-full transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-[#5F6470] hover:text-[#191C24] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#191C24] hover:bg-[#252A36] rounded-full shadow-md shadow-[#191C24]/10 border border-[#D4AF37]/50 hover:border-[#D4AF37] transition-all"
                >
                  <span>Get Started Free</span>
                  <ArrowUpRightIcon size={16} className="text-[#D4AF37] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#5F6470] hover:text-[#191C24] hover:bg-[#F8F7F4] focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8E5DE] glass-panel-light px-4 pt-3 pb-6 space-y-3 bg-white/95">
          <div className="flex flex-col space-y-1">
            <a
              href="#learning-path"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-base font-medium text-[#191C24] hover:bg-[#F8F7F4]"
            >
              📚 Financial Learning
            </a>
            <a
              href="#ipo-calendar"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-base font-medium text-[#191C24] hover:bg-[#F8F7F4]"
            >
              📅 IPO Calendar & Discovery
            </a>
            <a
              href="#news"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-base font-medium text-[#191C24] hover:bg-[#F8F7F4]"
            >
              📰 Curated Market News
            </a>
            <a
              href="#ai-assistant"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-base font-medium text-[#191C24] hover:bg-[#F8F7F4]"
            >
              🤖 AI Financial Assistant
            </a>
          </div>
          <div className="pt-4 border-t border-[#E8E5DE] flex flex-col gap-2">
            {isLoggedIn ? (
              <>
                <div className="text-xs font-semibold px-3 py-2 rounded-xl bg-[#F8F7F4] text-[#191C24] border border-[#E8E5DE] flex items-center gap-1.5">
                  <ShieldCheckIcon size={14} className="text-[#8A6A00]" />
                  <span>{userEmail || "Signed in"}</span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-center py-2.5 text-sm font-semibold text-[#9E2D3A] bg-rose-50 rounded-xl border border-rose-200 cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-[#191C24] bg-[#F8F7F4] rounded-xl border border-[#E8E5DE]"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-white bg-[#191C24] rounded-xl shadow-md border border-[#D4AF37]/50"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
