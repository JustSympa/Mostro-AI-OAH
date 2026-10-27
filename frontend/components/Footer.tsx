import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheckIcon } from "./Icons";

export function Footer() {
  return (
    <footer className="border-t border-[#E8E5DE] bg-[#F8F7F4] text-[#5F6470] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info (Col 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-icon.png"
                alt="Mostro AI"
                width={150}
                height={146}
                className="w-10 h-10 rounded-xl object-cover"
              />
              <span className="font-extrabold text-lg text-[#191C24]">
                Mostro<span className="text-[#8A6A00]">.ai</span>
              </span>
            </div>
            <p className="text-[#5F6470] leading-relaxed text-xs max-w-sm">
              Human-centered financial education and market intelligence. Designed to empower
              curious, self-directed individuals with institutional-grade clarity.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#858995]">
              <span className="w-2 h-2 rounded-full bg-[#26734D]" />
              <span>Core Education & Authentication Engine Online</span>
            </div>
          </div>

          {/* Col 1: Platform Pillars */}
          <div className="space-y-3">
            <h5 className="font-bold text-[#191C24] text-xs uppercase tracking-wider">
              Core Pillars
            </h5>
            <ul className="space-y-2">
              <li>
                <a href="#learning-path" className="hover:text-[#191C24] transition-colors">
                  Financial Learning
                </a>
              </li>
              <li>
                <a href="#ipo-calendar" className="hover:text-[#191C24] transition-colors">
                  IPO Discovery Calendar
                </a>
              </li>
              <li>
                <a href="#news" className="hover:text-[#191C24] transition-colors">
                  Curated Market News
                </a>
              </li>
              <li>
                <a href="#ai-assistant" className="hover:text-[#191C24] transition-colors">
                  AI Financial Assistant
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2: Curriculum Stages */}
          <div className="space-y-3">
            <h5 className="font-bold text-[#191C24] text-xs uppercase tracking-wider">Curriculum</h5>
            <ul className="space-y-2">
              <li>
                <a href="#learning-path" className="hover:text-[#191C24] transition-colors">
                  Stage 01: Wealth Foundations
                </a>
              </li>
              <li>
                <a href="#learning-path" className="hover:text-[#191C24] transition-colors">
                  Stage 02: Order Mechanics
                </a>
              </li>
              <li>
                <a href="#learning-path" className="hover:text-[#191C24] transition-colors">
                  Stage 03: Forensic 10-Ks
                </a>
              </li>
              <li>
                <a href="#learning-path" className="hover:text-[#191C24] transition-colors">
                  Stage 04: Options & Hedging
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Trust & Access */}
          <div className="space-y-3">
            <h5 className="font-bold text-[#191C24] text-xs uppercase tracking-wider">
              Account & Security
            </h5>
            <ul className="space-y-2 text-[#5F6470]">
              <li>
                <Link href="/login" className="hover:text-[#191C24] transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-[#191C24] transition-colors">
                  Create Free Account
                </Link>
              </li>
              <li className="flex items-center gap-1.5 pt-1 text-[11px] text-[#858995]">
                <ShieldCheckIcon size={14} className="text-[#8A6A00]" /> Argon2id Encryption
              </li>
              <li className="flex items-center gap-1.5 text-[11px] text-[#858995]">
                <ShieldCheckIcon size={14} className="text-[#8A6A00]" /> Hardware 2FA Ready
              </li>
            </ul>
          </div>
        </div>

        {/* Legal & Educational Disclaimer */}
        <div className="mt-12 pt-8 border-t border-[#E8E5DE] space-y-4">
          <p className="text-[11px] text-[#858995] leading-relaxed text-justify">
            <strong className="text-[#191C24]">Regulatory & Educational Disclaimer:</strong> Mostro
            AI is strictly an educational software platform designed to facilitate financial literacy
            and self-directed market comprehension. None of the materials, simulation metrics, IPO
            filing digests, or AI assistant responses constitute investment advice, financial
            endorsements, or legal solicitation. Securities trading involves substantial risk of loss.
            Always conduct independent research or consult an accredited financial advisor before
            allocating capital.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#858995] pt-2 gap-2">
            <span>© 2026 Mostro AI Platform. All rights reserved.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-[#191C24]">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-[#191C24]">
                Terms of Service
              </a>
              <a href="#" className="hover:text-[#191C24]">
                Security Architecture
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
