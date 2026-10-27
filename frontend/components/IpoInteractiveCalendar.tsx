"use client";

import React, { useState } from "react";
import {
  CalendarIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CheckCircle2Icon,
  BotIcon,
  SendIcon,
  XIcon,
} from "./Icons";

// =========================================================================
// 1. IPO MILESTONES & COLOR PALETTE SPECIFICATION
// "Filing Date, Price Band Announcement Date, Basis of Allotment Date,
//  Refund Initiation, Listing Date, Lock-Up Expiration Date"
// =========================================================================
export type IpoMilestoneType =
  | "Filing Date"
  | "Price Band Announcement Date"
  | "Basis of Allotment Date"
  | "Refund Initiation"
  | "Listing Date"
  | "Lock-Up Expiration Date";

export interface MilestoneMeta {
  label: IpoMilestoneType;
  colorHex: string;
  dotBg: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  lightBg: string;
  icon: string;
  shortDesc: string;
}

export const MILESTONE_PALETTE: Record<IpoMilestoneType, MilestoneMeta> = {
  "Filing Date": {
    label: "Filing Date",
    colorHex: "#10B981", // Emerald Green
    dotBg: "bg-emerald-500",
    badgeBg: "bg-emerald-500 text-white",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-700",
    lightBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: "📄",
    shortDesc: "Initial S-1 registration statement filed with SEC / exchange regulator",
  },
  "Price Band Announcement Date": {
    label: "Price Band Announcement Date",
    colorHex: "#0EA5E9", // Sky Blue
    dotBg: "bg-sky-500",
    badgeBg: "bg-sky-500 text-white",
    badgeBorder: "border-sky-500/30",
    badgeText: "text-sky-700",
    lightBg: "bg-sky-50 text-sky-800 border-sky-200",
    icon: "🏷️",
    shortDesc: "Syndicate bookrunners announce indicative share pricing bracket",
  },
  "Basis of Allotment Date": {
    label: "Basis of Allotment Date",
    colorHex: "#F59E0B", // Amber / Warm Orange
    dotBg: "bg-amber-500",
    badgeBg: "bg-amber-500 text-white",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-800",
    lightBg: "bg-amber-50 text-amber-800 border-amber-200",
    icon: "📊",
    shortDesc: "Registrar finalizes subscription oversubscription quota & share allocations",
  },
  "Refund Initiation": {
    label: "Refund Initiation",
    colorHex: "#8B5CF6", // Purple / Violet
    dotBg: "bg-purple-500",
    badgeBg: "bg-purple-500 text-white",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-700",
    lightBg: "bg-purple-50 text-purple-800 border-purple-200",
    icon: "🔄",
    shortDesc: "Escrow funds unblocked & returned for unallocated investor bids",
  },
  "Listing Date": {
    label: "Listing Date",
    colorHex: "#EC4899", // Vibrant Rose / Pink (matches template pink badge)
    dotBg: "bg-pink-500",
    badgeBg: "bg-pink-500 text-white",
    badgeBorder: "border-pink-500/30",
    badgeText: "text-pink-700",
    lightBg: "bg-pink-50 text-pink-800 border-pink-200",
    icon: "🚀",
    shortDesc: "Shares commence public secondary market trading bell on the exchange",
  },
  "Lock-Up Expiration Date": {
    label: "Lock-Up Expiration Date",
    colorHex: "#EAB308", // Golden Yellow (matches template yellow badge)
    dotBg: "bg-yellow-500",
    badgeBg: "bg-yellow-500 text-slate-900",
    badgeBorder: "border-yellow-500/30",
    badgeText: "text-yellow-800",
    lightBg: "bg-yellow-50 text-yellow-800 border-yellow-200",
    icon: "🔓",
    shortDesc: "Contractual restriction ends; early investors and employees free to sell",
  },
};

// =========================================================================
// 2. IPO EVENT DATA MODEL WITH COMPREHENSIVE MILESTONES
// =========================================================================
export interface IpoMilestoneEvent {
  id: string; // unique event id
  ipoId: string;
  companyName: string;
  ticker: string;
  sector: string;
  logo: string;
  exchange: string;
  milestoneType: IpoMilestoneType;
  year: number;
  month: number; // 0-indexed (10 = Nov, 11 = Dec, 0 = Jan)
  day: number;
  timeStr: string;
  detailsSnippet: string;
}

export interface IpoFullProfile {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  logo: string;
  exchange: string;
  status: "Confirmed" | "S-1 Filed" | "Pending Pricing" | "Trading";
  valuation: string;
  priceBand: string;
  revenueRunRate: string;
  hypeScore: string;
  lockupDays: string;
  lockupDateStr: string;
  underwriters: string[];
  underwritersCount: number;
  s1Summary: string;
  riskFactors: string;
  milestonesTimeline: {
    type: IpoMilestoneType;
    dateFormatted: string;
    completed: boolean;
  }[];
  aiQa: { query: string; answer: string }[];
}

export const IPO_PROFILES: Record<string, IpoFullProfile> = {
  stripe: {
    id: "stripe",
    name: "Stripe, Inc.",
    ticker: "NASDAQ: STRP",
    sector: "Fintech & Global Payments Infrastructure",
    logo: "💳",
    exchange: "NASDAQ • New York",
    status: "Confirmed",
    valuation: "$65B – $70B",
    priceBand: "$38.00 – $42.00",
    revenueRunRate: "$14.2B ARR (+22% YoY)",
    hypeScore: "94% Bullish",
    lockupDays: "180 Days",
    lockupDateStr: "16 May, 2027",
    underwriters: ["Goldman Sachs", "J.P. Morgan", "Morgan Stanley", "Citigroup"],
    underwritersCount: 14,
    s1Summary:
      "World's dominant internet payments gateway. Generating positive GAAP operating cash flow on over $1.2T in annualized payment volume across 135+ countries.",
    riskFactors:
      "Global regulatory compliance regarding payment schemes; competitive pricing pressure from legacy acquirers and emerging BNPL networks.",
    milestonesTimeline: [
      { type: "Filing Date", dateFormatted: "Oct 12, 2026", completed: true },
      { type: "Price Band Announcement Date", dateFormatted: "Nov 04, 2026", completed: true },
      { type: "Basis of Allotment Date", dateFormatted: "Nov 12, 2026", completed: true },
      { type: "Refund Initiation", dateFormatted: "Nov 14, 2026", completed: true },
      { type: "Listing Date", dateFormatted: "Nov 17, 2026", completed: false },
      { type: "Lock-Up Expiration Date", dateFormatted: "May 16, 2027", completed: false },
    ],
    aiQa: [
      {
        query: "What is Stripe's core competitive moat?",
        answer:
          "Stripe combines developer-first API integration with high switching costs across millions of enterprise internet checkouts. Its unified billing, fraud prevention (Radar), and card issuing platform create significant ecosystem stickiness.",
      },
      {
        query: "What are the key S-1 risk disclosures?",
        answer:
          "The filing highlights regulatory interchange fee caps in the EU, customer concentration among venture-backed tech startups, and geopolitical currency conversion risk.",
      },
      {
        query: "Is there dual-class voting stock?",
        answer:
          "Yes. Class B super-voting shares (10 votes per share) are retained by founders Patrick and John Collison to maintain operational voting control.",
      },
      {
        query: "How much free cash flow does Stripe generate?",
        answer:
          "Stripe generated $2.4B in adjusted free cash flow over the preceding 12 months, representing an operating cash conversion margin of approximately 17%.",
      },
    ],
  },

  databricks: {
    id: "databricks",
    name: "Databricks Inc.",
    ticker: "NYSE: DBRK",
    sector: "Enterprise AI & Lakehouse Architecture",
    logo: "🧱",
    exchange: "NYSE • New York",
    status: "S-1 Filed",
    valuation: "$43B – $48B",
    priceBand: "$68.00 – $74.00",
    revenueRunRate: "$2.6B ARR (+45% YoY)",
    hypeScore: "89% Bullish",
    lockupDays: "180 Days",
    lockupDateStr: "23 May, 2027",
    underwriters: ["Morgan Stanley", "Bank of America", "Barclays", "UBS"],
    underwritersCount: 12,
    s1Summary:
      "Pioneer of data lakehouse architecture combining data warehouses and data lakes with generative AI tooling (MosaicML). High net retention exceeding 130%.",
    riskFactors:
      "Massive cloud computing costs with AWS/Azure and head-to-head competition with Snowflake, BigQuery, and Microsoft Fabric.",
    milestonesTimeline: [
      { type: "Filing Date", dateFormatted: "Oct 28, 2026", completed: true },
      { type: "Price Band Announcement Date", dateFormatted: "Nov 10, 2026", completed: true },
      { type: "Basis of Allotment Date", dateFormatted: "Nov 17, 2026", completed: false },
      { type: "Refund Initiation", dateFormatted: "Nov 20, 2026", completed: false },
      { type: "Listing Date", dateFormatted: "Nov 24, 2026", completed: false },
      { type: "Lock-Up Expiration Date", dateFormatted: "May 23, 2027", completed: false },
    ],
    aiQa: [
      {
        query: "How does Databricks compare to Snowflake?",
        answer:
          "While Snowflake originated as a cloud data warehouse for structured business analytics, Databricks was founded by the creators of Apache Spark for unstructured big data and AI model training. Both platforms are converging in the modern AI stack.",
      },
      {
        query: "Is Databricks profitable?",
        answer:
          "Databricks is GAAP operating break-even and free cash flow positive, reinvesting heavily into expanding its open-source foundational AI model infrastructure.",
      },
    ],
  },

  cerebras: {
    id: "cerebras",
    name: "Cerebras Systems",
    ticker: "NASDAQ: CBRS",
    sector: "Semiconductors & AI Supercomputing",
    logo: "⚡",
    exchange: "NASDAQ • New York",
    status: "S-1 Filed",
    valuation: "$7.5B – $8.2B",
    priceBand: "$27.00 – $31.00",
    revenueRunRate: "$380M ARR (+180% YoY)",
    hypeScore: "78% Bullish",
    lockupDays: "90 Days",
    lockupDateStr: "08 Mar, 2027",
    underwriters: ["Citigroup", "Barclays", "Jefferies"],
    underwritersCount: 8,
    s1Summary:
      "Creator of the Wafer-Scale Engine (WSE-3)—the world's largest commercial AI chip designed for multi-gigawatt sovereign and enterprise model training.",
    riskFactors:
      "Heavy single-customer revenue concentration: Group 42 (G42) represents over 82% of reported historical revenues.",
    milestonesTimeline: [
      { type: "Filing Date", dateFormatted: "Nov 05, 2026", completed: true },
      { type: "Price Band Announcement Date", dateFormatted: "Nov 17, 2026", completed: false },
      { type: "Basis of Allotment Date", dateFormatted: "Dec 01, 2026", completed: false },
      { type: "Refund Initiation", dateFormatted: "Dec 03, 2026", completed: false },
      { type: "Listing Date", dateFormatted: "Dec 08, 2026", completed: false },
      { type: "Lock-Up Expiration Date", dateFormatted: "Mar 08, 2027", completed: false },
    ],
    aiQa: [
      {
        query: "What is Cerebras' main hardware advantage?",
        answer:
          "Unlike clusters of thousands of small GPUs interconnected by networking wires, Cerebras prints an entire 46,225 mm² silicon wafer as a single contiguous chip, drastically reducing inter-chip communication latency.",
      },
      {
        query: "What is the biggest risk factor in the S-1?",
        answer:
          "Customer concentration. Over 80% of revenue has come from G42 in the UAE. Any change in US trade regulations or customer demand poses a material revenue risk.",
      },
    ],
  },

  klarna: {
    id: "klarna",
    name: "Klarna Group",
    ticker: "NYSE: KLAR",
    sector: "Consumer Credit & Buy-Now-Pay-Later",
    logo: "🛍️",
    exchange: "NYSE • New York",
    status: "Confirmed",
    valuation: "$15B – $18B",
    priceBand: "$30.00 – $34.00",
    revenueRunRate: "$2.8B Annualized",
    hypeScore: "76% Moderate",
    lockupDays: "180 Days",
    lockupDateStr: "13 Jun, 2027",
    underwriters: ["Goldman Sachs", "J.P. Morgan", "Deutsche Bank"],
    underwritersCount: 10,
    s1Summary:
      "Global leader in interest-free consumer point-of-sale financing. Restructured for bottom-line profitability with extensive AI-driven automated customer operations.",
    riskFactors:
      "Macro sensitivity to consumer credit defaults, merchant fee regulations, and interest rate volatility on warehouse funding lines.",
    milestonesTimeline: [
      { type: "Filing Date", dateFormatted: "Nov 18, 2026", completed: false },
      { type: "Price Band Announcement Date", dateFormatted: "Dec 02, 2026", completed: false },
      { type: "Basis of Allotment Date", dateFormatted: "Dec 10, 2026", completed: false },
      { type: "Refund Initiation", dateFormatted: "Dec 12, 2026", completed: false },
      { type: "Listing Date", dateFormatted: "Dec 15, 2026", completed: false },
      { type: "Lock-Up Expiration Date", dateFormatted: "Jun 13, 2027", completed: false },
    ],
    aiQa: [
      {
        query: "How did Klarna return to profitability?",
        answer:
          "Through strict underwriting automation that slashed credit losses, alongside an AI customer service agent that absorbed work equivalent to 700 full-time reps, reducing overhead by ~25%.",
      },
    ],
  },

  reddit_lockup: {
    id: "reddit_lockup",
    name: "Reddit, Inc.",
    ticker: "NYSE: RDDT",
    sector: "Social Data & Community Intelligence",
    logo: "🤖",
    exchange: "NYSE • New York",
    status: "Trading",
    valuation: "$12.4B Market Cap",
    priceBand: "Trading at $64.20",
    revenueRunRate: "$1.1B ARR (+48% YoY)",
    hypeScore: "86% Bullish",
    lockupDays: "Founder Lock-Up Expiry",
    lockupDateStr: "27 Nov, 2026",
    underwriters: ["Morgan Stanley", "Goldman Sachs", "J.P. Morgan"],
    underwritersCount: 10,
    s1Summary:
      "Social knowledge forum licensing conversational user data to foundational LLM model builders including Google and OpenAI.",
    riskFactors:
      "Subreddit user sentiment rebellions, volatility in programmatic advertising yields, and potential insider share dump upon restriction expiry.",
    milestonesTimeline: [
      { type: "Filing Date", dateFormatted: "Feb 22, 2024", completed: true },
      { type: "Price Band Announcement Date", dateFormatted: "Mar 11, 2024", completed: true },
      { type: "Basis of Allotment Date", dateFormatted: "Mar 19, 2024", completed: true },
      { type: "Refund Initiation", dateFormatted: "Mar 20, 2024", completed: true },
      { type: "Listing Date", dateFormatted: "Mar 21, 2024", completed: true },
      { type: "Lock-Up Expiration Date", dateFormatted: "Nov 27, 2026", completed: false },
    ],
    aiQa: [
      {
        query: "What happens on Lock-Up Expiration Date?",
        answer:
          "Early venture capital backers and executive insiders are legally released from their lock-up agreement, enabling them to sell up to 25M common shares on the open market.",
      },
    ],
  },

  discord: {
    id: "discord",
    name: "Discord Technologies",
    ticker: "NYSE: DSCD",
    sector: "Social & Digital Communities",
    logo: "🎮",
    exchange: "NYSE • New York",
    status: "Pending Pricing",
    valuation: "$16B – $19B",
    priceBand: "$45.00 – $50.00",
    revenueRunRate: "$620M ARR (+30% YoY)",
    hypeScore: "82% Bullish",
    lockupDays: "180 Days",
    lockupDateStr: "13 Jul, 2027",
    underwriters: ["Morgan Stanley", "J.P. Morgan", "Goldman Sachs"],
    underwritersCount: 11,
    s1Summary:
      "200M+ Monthly Active Users in voice, video, and text communities. Generating accelerating subscription revenue from Nitro and digital avatar/server monetization.",
    riskFactors:
      "Safety moderation operational overhead and user pushback against ad-supported revenue models.",
    milestonesTimeline: [
      { type: "Filing Date", dateFormatted: "Dec 08, 2026", completed: false },
      { type: "Price Band Announcement Date", dateFormatted: "Dec 22, 2026", completed: false },
      { type: "Basis of Allotment Date", dateFormatted: "Jan 08, 2027", completed: false },
      { type: "Refund Initiation", dateFormatted: "Jan 10, 2027", completed: false },
      { type: "Listing Date", dateFormatted: "Jan 14, 2027", completed: false },
      { type: "Lock-Up Expiration Date", dateFormatted: "Jul 13, 2027", completed: false },
    ],
    aiQa: [
      {
        query: "What is Discord's primary revenue engine?",
        answer:
          "Discord generates over 85% of its revenue from user subscriptions (Discord Nitro), which grant HD video streaming, custom emojis, and large file uploads, avoiding advertising dependency.",
      },
    ],
  },
};

// =========================================================================
// 3. ALL SCHEDULED MILESTONE EVENTS
// Note: November 17 has MULTIPLE releases (Stripe Listing, Databricks Allotment, Cerebras Price Band)
// to trigger the multi-release popup!
// =========================================================================
export const SCHEDULED_EVENTS: IpoMilestoneEvent[] = [
  // ── NOVEMBER 2026 ──
  {
    id: "ev-strp-pb",
    ipoId: "stripe",
    companyName: "Stripe, Inc.",
    ticker: "NASDAQ: STRP",
    sector: "Fintech",
    logo: "💳",
    exchange: "NASDAQ",
    milestoneType: "Price Band Announcement Date",
    year: 2026,
    month: 10, // November
    day: 4,
    timeStr: "08:30 AM EST",
    detailsSnippet: "Syndicate announces initial $38.00 - $42.00 indicative range",
  },
  {
    id: "ev-cere-filing",
    ipoId: "cerebras",
    companyName: "Cerebras Systems",
    ticker: "NASDAQ: CBRS",
    sector: "AI Silicon",
    logo: "⚡",
    exchange: "NASDAQ",
    milestoneType: "Filing Date",
    year: 2026,
    month: 10,
    day: 5,
    timeStr: "04:15 PM EST",
    detailsSnippet: "Initial public S-1 registration statement submitted to SEC",
  },
  {
    id: "ev-dbrk-pb",
    ipoId: "databricks",
    companyName: "Databricks Inc.",
    ticker: "NYSE: DBRK",
    sector: "AI Lakehouse",
    logo: "🧱",
    exchange: "NYSE",
    milestoneType: "Price Band Announcement Date",
    year: 2026,
    month: 10,
    day: 10,
    timeStr: "09:00 AM EST",
    detailsSnippet: "Price bracket set at $68.00 - $74.00 per common share",
  },
  {
    id: "ev-strp-allot",
    ipoId: "stripe",
    companyName: "Stripe, Inc.",
    ticker: "NASDAQ: STRP",
    sector: "Fintech",
    logo: "💳",
    exchange: "NASDAQ",
    milestoneType: "Basis of Allotment Date",
    year: 2026,
    month: 10,
    day: 12,
    timeStr: "10:00 AM EST",
    detailsSnippet: "Institutional & retail allocations locked; 4.8x oversubscribed",
  },
  {
    id: "ev-strp-refund",
    ipoId: "stripe",
    companyName: "Stripe, Inc.",
    ticker: "NASDAQ: STRP",
    sector: "Fintech",
    logo: "💳",
    exchange: "NASDAQ",
    milestoneType: "Refund Initiation",
    year: 2026,
    month: 10,
    day: 14,
    timeStr: "11:30 AM EST",
    detailsSnippet: "Unallocated capital unblocked and returned to bidder accounts",
  },

  // ── MULTIPLE RELEASES ON NOV 17 (Listing Date + Basis of Allotment + Price Band) ──
  {
    id: "ev-strp-list",
    ipoId: "stripe",
    companyName: "Stripe, Inc.",
    ticker: "NASDAQ: STRP",
    sector: "Fintech & Payments",
    logo: "💳",
    exchange: "NASDAQ",
    milestoneType: "Listing Date",
    year: 2026,
    month: 10,
    day: 17,
    timeStr: "09:30 AM EST",
    detailsSnippet: "Official public debut & Opening Bell ceremony on NASDAQ",
  },
  {
    id: "ev-dbrk-allot",
    ipoId: "databricks",
    companyName: "Databricks Inc.",
    ticker: "NYSE: DBRK",
    sector: "Enterprise AI",
    logo: "🧱",
    exchange: "NYSE",
    milestoneType: "Basis of Allotment Date",
    year: 2026,
    month: 10,
    day: 17,
    timeStr: "11:00 AM EST",
    detailsSnippet: "Share allotment quotas finalized for qualified institutional buyers",
  },
  {
    id: "ev-cere-pb",
    ipoId: "cerebras",
    companyName: "Cerebras Systems",
    ticker: "NASDAQ: CBRS",
    sector: "AI Silicon",
    logo: "⚡",
    exchange: "NASDAQ",
    milestoneType: "Price Band Announcement Date",
    year: 2026,
    month: 10,
    day: 17,
    timeStr: "02:00 PM EST",
    detailsSnippet: "Indicative valuation price band announced at $27.00 - $31.00",
  },

  {
    id: "ev-klar-filing",
    ipoId: "klarna",
    companyName: "Klarna Group",
    ticker: "NYSE: KLAR",
    sector: "Fintech BNPL",
    logo: "🛍️",
    exchange: "NYSE",
    milestoneType: "Filing Date",
    year: 2026,
    month: 10,
    day: 18,
    timeStr: "09:00 AM EST",
    detailsSnippet: "F-1 / S-1 foreign issuer registration filing with SEC",
  },
  {
    id: "ev-dbrk-refund",
    ipoId: "databricks",
    companyName: "Databricks Inc.",
    ticker: "NYSE: DBRK",
    sector: "Enterprise AI",
    logo: "🧱",
    exchange: "NYSE",
    milestoneType: "Refund Initiation",
    year: 2026,
    month: 10,
    day: 20,
    timeStr: "10:30 AM EST",
    detailsSnippet: "Surplus application money refunded via direct credit",
  },
  {
    id: "ev-dbrk-list",
    ipoId: "databricks",
    companyName: "Databricks Inc.",
    ticker: "NYSE: DBRK",
    sector: "Enterprise AI",
    logo: "🧱",
    exchange: "NYSE",
    milestoneType: "Listing Date",
    year: 2026,
    month: 10,
    day: 24,
    timeStr: "09:30 AM EST",
    detailsSnippet: "Opening Bell trading start on NYSE under ticker $DBRK",
  },
  {
    id: "ev-rddt-lockup",
    ipoId: "reddit_lockup",
    companyName: "Reddit, Inc.",
    ticker: "NYSE: RDDT",
    sector: "Social Media & AI Data",
    logo: "🤖",
    exchange: "NYSE",
    milestoneType: "Lock-Up Expiration Date",
    year: 2026,
    month: 10,
    day: 27,
    timeStr: "04:00 PM EST",
    detailsSnippet: "Insider and VC founder share lock-up restriction unlocks (25M shares)",
  },

  // ── DECEMBER 2026 ──
  {
    id: "ev-cere-allot",
    ipoId: "cerebras",
    companyName: "Cerebras Systems",
    ticker: "NASDAQ: CBRS",
    sector: "AI Silicon",
    logo: "⚡",
    exchange: "NASDAQ",
    milestoneType: "Basis of Allotment Date",
    year: 2026,
    month: 11, // December
    day: 1,
    timeStr: "10:00 AM EST",
    detailsSnippet: "Allotment proportions determined; heavy sovereign AI allocation",
  },
  {
    id: "ev-klar-pb",
    ipoId: "klarna",
    companyName: "Klarna Group",
    ticker: "NYSE: KLAR",
    sector: "Fintech BNPL",
    logo: "🛍️",
    exchange: "NYSE",
    milestoneType: "Price Band Announcement Date",
    year: 2026,
    month: 11,
    day: 2,
    timeStr: "08:00 AM EST",
    detailsSnippet: "Pricing range finalized at $30.00 - $34.00 per share",
  },
  {
    id: "ev-cere-refund",
    ipoId: "cerebras",
    companyName: "Cerebras Systems",
    ticker: "NASDAQ: CBRS",
    sector: "AI Silicon",
    logo: "⚡",
    exchange: "NASDAQ",
    milestoneType: "Refund Initiation",
    year: 2026,
    month: 11,
    day: 3,
    timeStr: "11:00 AM EST",
    detailsSnippet: "Refund instructions sent for unallocated bids",
  },
  {
    id: "ev-cere-list",
    ipoId: "cerebras",
    companyName: "Cerebras Systems",
    ticker: "NASDAQ: CBRS",
    sector: "AI Silicon",
    logo: "⚡",
    exchange: "NASDAQ",
    milestoneType: "Listing Date",
    year: 2026,
    month: 11,
    day: 8,
    timeStr: "09:30 AM EST",
    detailsSnippet: "Cerebras begins official trading on NASDAQ under $CBRS",
  },
  {
    id: "ev-dscd-filing",
    ipoId: "discord",
    companyName: "Discord Technologies",
    ticker: "NYSE: DSCD",
    sector: "Social Communities",
    logo: "🎮",
    exchange: "NYSE",
    milestoneType: "Filing Date",
    year: 2026,
    month: 11,
    day: 8,
    timeStr: "04:30 PM EST",
    detailsSnippet: "Discord submits confidential S-1 registration to SEC",
  },
  {
    id: "ev-klar-allot",
    ipoId: "klarna",
    companyName: "Klarna Group",
    ticker: "NYSE: KLAR",
    sector: "Fintech BNPL",
    logo: "🛍️",
    exchange: "NYSE",
    milestoneType: "Basis of Allotment Date",
    year: 2026,
    month: 11,
    day: 10,
    timeStr: "10:30 AM EST",
    detailsSnippet: "Registrar finalizes consumer and institutional share allotments",
  },
  {
    id: "ev-klar-refund",
    ipoId: "klarna",
    companyName: "Klarna Group",
    ticker: "NYSE: KLAR",
    sector: "Fintech BNPL",
    logo: "🛍️",
    exchange: "NYSE",
    milestoneType: "Refund Initiation",
    year: 2026,
    month: 11,
    day: 12,
    timeStr: "09:00 AM EST",
    detailsSnippet: "Refunds for non-allocated applicants processed",
  },
  {
    id: "ev-klar-list",
    ipoId: "klarna",
    companyName: "Klarna Group",
    ticker: "NYSE: KLAR",
    sector: "Fintech BNPL",
    logo: "🛍️",
    exchange: "NYSE",
    milestoneType: "Listing Date",
    year: 2026,
    month: 11,
    day: 15,
    timeStr: "09:30 AM EST",
    detailsSnippet: "Klarna rings NYSE opening bell; trading starts at $KLAR",
  },
  {
    id: "ev-dscd-pb",
    ipoId: "discord",
    companyName: "Discord Technologies",
    ticker: "NYSE: DSCD",
    sector: "Social Communities",
    logo: "🎮",
    exchange: "NYSE",
    milestoneType: "Price Band Announcement Date",
    year: 2026,
    month: 11,
    day: 22,
    timeStr: "09:00 AM EST",
    detailsSnippet: "Indicated price bracket announced at $45.00 - $50.00",
  },

  // ── JANUARY 2027 ──
  {
    id: "ev-dscd-allot",
    ipoId: "discord",
    companyName: "Discord Technologies",
    ticker: "NYSE: DSCD",
    sector: "Social Communities",
    logo: "🎮",
    exchange: "NYSE",
    milestoneType: "Basis of Allotment Date",
    year: 2027,
    month: 0, // January
    day: 8,
    timeStr: "10:00 AM EST",
    detailsSnippet: "Allotment schedule completed for Nitro power users & institutional syndicate",
  },
  {
    id: "ev-dscd-refund",
    ipoId: "discord",
    companyName: "Discord Technologies",
    ticker: "NYSE: DSCD",
    sector: "Social Communities",
    logo: "🎮",
    exchange: "NYSE",
    milestoneType: "Refund Initiation",
    year: 2027,
    month: 0,
    day: 10,
    timeStr: "11:00 AM EST",
    detailsSnippet: "Unsuccessful application deposits refunded",
  },
  {
    id: "ev-dscd-list",
    ipoId: "discord",
    companyName: "Discord Technologies",
    ticker: "NYSE: DSCD",
    sector: "Social Communities",
    logo: "🎮",
    exchange: "NYSE",
    milestoneType: "Listing Date",
    year: 2027,
    month: 0,
    day: 14,
    timeStr: "09:30 AM EST",
    detailsSnippet: "Discord begins secondary market trading on NYSE ($DSCD)",
  },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function IpoInteractiveCalendar() {
  // Calendar view state: Defaults to November 2026
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(10); // November (0-indexed)
  const [selectedDay, setSelectedDay] = useState<number | null>(17); // Start on active Nov 17
  const [selectedIpoId, setSelectedIpoId] = useState<string | null>("stripe");
  const [selectedMilestone, setSelectedMilestone] = useState<IpoMilestoneType | null>("Listing Date");

  // Hover state for interactive date popover
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Multiple releases popup modal state
  const [multiReleaseModalOpen, setMultiReleaseModalOpen] = useState(false);
  const [multiReleaseEvents, setMultiReleaseEvents] = useState<IpoMilestoneEvent[]>([]);
  const [multiReleaseDay, setMultiReleaseDay] = useState<number | null>(null);

  // Milestone Filter (Show all or filter by specific milestone)
  const [filterMilestone, setFilterMilestone] = useState<IpoMilestoneType | "ALL">("ALL");

  // Alert tracking state
  const [isAlertSaved, setIsAlertSaved] = useState(false);

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "bot"; text: string }[]>([
    {
      sender: "bot",
      text: "Hello! I am your AI Prospectus Copilot. Ask me anything about Stripe's S-1 filing, valuation, underwriters, or lock-up mechanics.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Filter events for the current month
  const currentMonthEvents = SCHEDULED_EVENTS.filter(
    (ev) => ev.year === viewYear && ev.month === viewMonth
  );

  // Selected IPO profile
  const selectedProfile: IpoFullProfile | null = selectedIpoId
    ? IPO_PROFILES[selectedIpoId] ?? null
    : null;

  // Calendar Day Calculation
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Click on a calendar day
  const handleDayClick = (dayNum: number) => {
    setSelectedDay(dayNum);
    const dayEvents = currentMonthEvents.filter((ev) => ev.day === dayNum);

    if (dayEvents.length === 0) {
      // No IPO on this date
      return;
    }

    if (dayEvents.length > 1) {
      // MULTIPLE RELEASES: Trigger the multi-release modal!
      setMultiReleaseEvents(dayEvents);
      setMultiReleaseDay(dayNum);
      setMultiReleaseModalOpen(true);
    } else {
      // Exactly 1 release: select directly
      const singleEvent = dayEvents[0];
      handlePickIpoEvent(singleEvent);
    }
  };

  // Pick an IPO event (either directly or from multi-release modal)
  const handlePickIpoEvent = (ev: IpoMilestoneEvent) => {
    setSelectedIpoId(ev.ipoId);
    setSelectedMilestone(ev.milestoneType);
    setSelectedDay(ev.day);
    setViewYear(ev.year);
    setViewMonth(ev.month);
    setIsAlertSaved(false);
    setMultiReleaseModalOpen(false);

    // Initialize chatbot for the chosen IPO
    setChatMessages([
      {
        sender: "bot",
        text: `Switched context to **${ev.companyName}** (${ev.ticker}) for its **${ev.milestoneType}**. Ask me about its S-1 prospectus, risk disclosures, revenue rate, or underwriters.`,
      },
    ]);
    setChatInput("");
  };

  // Chat message handler
  const handleSendChat = (e?: React.FormEvent, directPrompt?: string) => {
    if (e) e.preventDefault();
    const promptText = directPrompt || chatInput;
    if (!promptText.trim() || !selectedProfile) return;

    const userMsg = promptText;
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setIsBotThinking(true);

    setTimeout(() => {
      let botReply = "";
      const lower = userMsg.toLowerCase();

      // Check pre-configured Q&A
      const matched = selectedProfile.aiQa.find(
        (qa) =>
          qa.query.toLowerCase().includes(lower) ||
          lower.includes(qa.query.toLowerCase().slice(0, 14))
      );

      if (matched) {
        botReply = matched.answer;
      } else if (lower.includes("valuation") || lower.includes("worth") || lower.includes("price")) {
        botReply = `${selectedProfile.name} has an indicated valuation of ${selectedProfile.valuation} with an initial price band of ${selectedProfile.priceBand}. Annualized revenue stands at ${selectedProfile.revenueRunRate}.`;
      } else if (lower.includes("lockup") || lower.includes("lock-up") || lower.includes("expire")) {
        botReply = `Insider and venture lockup period is **${selectedProfile.lockupDays}**, expiring on **${selectedProfile.lockupDateStr}**. Early investors cannot sell equity until this date.`;
      } else if (lower.includes("risk") || lower.includes("factor") || lower.includes("red flag")) {
        botReply = `Key S-1 Prospectus Risk Disclosure: ${selectedProfile.riskFactors}`;
      } else if (lower.includes("underwriter") || lower.includes("bank") || lower.includes("bookrunner")) {
        botReply = `Lead underwriting syndicate is led by ${selectedProfile.underwriters.join(", ")} alongside ${selectedProfile.underwritersCount} co-managers.`;
      } else {
        botReply = `According to ${selectedProfile.name}'s SEC registration filing: ${selectedProfile.s1Summary} Current market sentiment score stands at ${selectedProfile.hypeScore}.`;
      }

      setChatMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
      setIsBotThinking(false);
    }, 450);
  };

  // Day hover helper
  const getEventsForDay = (dayNum: number) => {
    return currentMonthEvents.filter((ev) => ev.day === dayNum);
  };

  return (
    <div className="w-full space-y-8">
      {/* ═══════════════════════════════════════════════════════════════
          MAIN CALENDAR CARD WITH TEMPLATE AESTHETICS (media_1793096945471.jpg)
          - Sleek Lavender/Purple accents
          - Left Vertical Navigation & Month List
          - Year Selector < 2026 >
          - Calendar Grid with Milestone Badge Colors
          - Hover Tooltips
          - Floating Quick Buttons
          ═══════════════════════════════════════════════════════════════ */}
      <div className="w-full rounded-3xl bg-white border border-[#E2E0D8] shadow-2xl overflow-hidden">
        {/* Top Header Bar with Filter & Legend Drawer */}
        <div className="bg-gradient-to-r from-[#191C24] via-[#20242D] to-[#191C24] text-white px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#8A6A00] text-white flex items-center justify-center shadow-lg">
              <CalendarIcon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight">IPO Milestone Discovery Calendar</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/20 text-[#E8D8B0] border border-[#D4AF37]/30">
                  Live 2026/2027 Pipeline
                </span>
              </div>
              <p className="text-xs text-white/70">
                Track Filings, Price Bands, Allotments, Refunds, Listings & Lock-Up Expirations
              </p>
            </div>
          </div>

          {/* Quick Milestone Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            <button
              onClick={() => setFilterMilestone("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMilestone === "ALL"
                  ? "bg-white text-[#191C24] shadow-md"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              All Milestones
            </button>
            <button
              onClick={() => setFilterMilestone("Listing Date")}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                filterMilestone === "Listing Date"
                  ? "bg-[#EC4899] text-white shadow-md shadow-[#EC4899]/30"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#EC4899]" />
              <span>Listings</span>
            </button>
            <button
              onClick={() => setFilterMilestone("Lock-Up Expiration Date")}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                filterMilestone === "Lock-Up Expiration Date"
                  ? "bg-[#EAB308] text-slate-950 shadow-md shadow-[#EAB308]/30"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
              <span>Lock-Ups</span>
            </button>
          </div>
        </div>

        {/* 6-COLOR PALETTE LEGEND BAR */}
        <div className="bg-[#FAF8F5] border-b border-[#E8E5DE] px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-bold text-[#5F6470] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <SparklesIcon size={14} className="text-[#D4AF37]" />
            <span>Milestone Color Palette:</span>
          </span>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {(Object.keys(MILESTONE_PALETTE) as IpoMilestoneType[]).map((typeKey) => {
              const meta = MILESTONE_PALETTE[typeKey];
              const isFiltered = filterMilestone === typeKey;
              return (
                <button
                  key={typeKey}
                  onClick={() => setFilterMilestone(filterMilestone === typeKey ? "ALL" : typeKey)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                    isFiltered
                      ? `${meta.badgeBg} border-transparent shadow-sm scale-105`
                      : `${meta.lightBg} hover:opacity-90`
                  }`}
                  title={meta.shortDesc}
                >
                  <span className={`w-2 h-2 rounded-full ${meta.dotBg}`} />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ──────── 2-SECTION SPLIT: LEFT TEMPLATE SIDEBAR + MAIN CALENDAR ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          {/* ──── LEFT SUB-SIDEBAR (Donna Williams Template Design) ──── */}
          <div className="lg:col-span-3 bg-gradient-to-b from-[#FAF6ED] via-[#F8F7F4] to-[#FAF6ED] p-6 border-r border-[#E8E5DE] flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              {/* User Profile Badge (Inspired by Donna Williams in template) */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-[#D4AF37]/30 shadow-sm backdrop-blur-sm">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#8A6A00] text-white flex items-center justify-center font-bold text-sm shadow-md">
                  DW
                </div>
                <div className="truncate">
                  <span className="text-[10px] font-semibold uppercase text-[#8A6A00] block">Investor Portfolio</span>
                  <h4 className="text-xs font-bold text-slate-800 truncate">Donna Williams</h4>
                </div>
              </div>

              {/* Navigation Tabs Pill (Template calendar icon tab) */}
              <div className="space-y-1">
                <div className="w-full px-3.5 py-2.5 rounded-xl bg-[#191C24] text-white font-bold text-xs flex items-center gap-2.5 shadow-md shadow-[#191C24]/20 border border-[#D4AF37]/40">
                  <CalendarIcon size={16} />
                  <span>IPO Calendar</span>
                </div>
              </div>

              {/* Year Selector: < 2026 > */}
              <div className="pt-2">
                <div className="flex items-center justify-between px-2 text-slate-600">
                  <button
                    onClick={() => setViewYear((y) => y - 1)}
                    className="w-7 h-7 rounded-full hover:bg-[#E8D8B0]/60 flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
                    aria-label="Previous Year"
                  >
                    ‹
                  </button>
                  <span className="text-sm font-extrabold text-slate-900 tracking-wider">
                    {viewYear}
                  </span>
                  <button
                    onClick={() => setViewYear((y) => y + 1)}
                    className="w-7 h-7 rounded-full hover:bg-[#E8D8B0]/60 flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
                    aria-label="Next Year"
                  >
                    ›
                  </button>
                </div>

                {/* Vertical Months List (All 12 Months) */}
                <div className="mt-3 space-y-0.5 text-center max-h-[320px] overflow-y-auto pr-1">
                  {MONTH_NAMES.map((mName, mIdx) => {
                    const isSelectedMonth = viewMonth === mIdx;
                    const eventsInMonth = SCHEDULED_EVENTS.filter(
                      (ev) => ev.year === viewYear && ev.month === mIdx
                    ).length;
                    return (
                      <button
                        key={mIdx}
                        onClick={() => setViewMonth(mIdx)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                          isSelectedMonth
                            ? "bg-white text-[#191C24] font-extrabold shadow-sm border border-[#D4AF37]/50 scale-105"
                            : "text-[#858995] hover:text-[#191C24] hover:bg-white/50"
                        }`}
                      >
                        <span>{mName}</span>
                        {eventsInMonth > 0 && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isSelectedMonth
                              ? "bg-[#D4AF37]/20 text-[#8A6A00]"
                              : "bg-[#E8E5DE] text-[#858995]"
                          }`}>
                            {eventsInMonth}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Helper Tip in Left Sidebar */}
            <div className="p-3.5 rounded-2xl bg-white/80 border border-[#D4AF37]/30 text-xs text-[#5F6470] space-y-1.5 shadow-sm">
              <span className="font-bold text-[#191C24] block flex items-center gap-1">
                <span>💡</span> <span>Interactive Tips</span>
              </span>
              <p className="text-[11px] leading-relaxed text-slate-500">
                • <strong>Hover</strong> any date to preview IPO details.
                <br />• <strong>Click</strong> to open the 2-column details & AI copilot.
                <br />• <strong>Nov 17</strong> has multiple releases to trigger selector popup!
              </p>
            </div>
          </div>

          {/* ──── MAIN CALENDAR SURFACE ──── */}
          <div className="lg:col-span-9 p-6 sm:p-8 flex flex-col justify-between relative bg-white">
            {/* Top Bar inside Calendar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E8E5DE] gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#8A6A00]">
                  Focused Date
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {selectedDay
                    ? `${MONTH_NAMES[viewMonth].slice(0, 3)} ${selectedDay}, ${viewYear}`
                    : `${MONTH_NAMES[viewMonth]} ${viewYear}`}
                </h3>
              </div>

              {/* Month Navigation Prev / Next Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <span>‹</span> <span>Previous</span>
                </button>
                <span className="text-xs font-bold text-[#8A6A00] bg-[#FAF6ED] px-3 py-1.5 rounded-full border border-[#D4AF37]/30">
                  {MONTH_NAMES[viewMonth]}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <span>Next</span> <span>›</span>
                </button>
              </div>
            </div>

            {/* Days of Week Header Row */}
            <div className="grid grid-cols-7 gap-2 text-center pt-6 pb-2">
              {DAYS_OF_WEEK.map((day, idx) => (
                <div
                  key={day}
                  className={`text-xs font-extrabold tracking-wider ${
                    idx === 0 || idx === 6 ? "text-[#D4AF37]" : "text-[#5F6470]"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Numbers Grid */}
            <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center py-2 relative">
              {/* Blank leading slots */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`blank-${idx}`} className="h-12 sm:h-14" />
              ))}

              {/* Actual Month Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const isSelected = selectedDay === dayNum;
                const dayEvents = getEventsForDay(dayNum);
                const hasEvents = dayEvents.length > 0;
                const hasMultiple = dayEvents.length > 1;

                return (
                  <div
                    key={dayNum}
                    className="flex flex-col items-center justify-center relative group"
                    onMouseEnter={() => setHoveredDay(dayNum)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {/* The Day Button */}
                    <button
                      onClick={() => handleDayClick(dayNum)}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex flex-col items-center justify-center text-xs font-bold transition-all cursor-pointer relative ${
                        isSelected
                          ? "bg-[#191C24] text-white shadow-lg shadow-[#191C24]/30 scale-110 z-10 ring-2 ring-[#D4AF37]"
                          : hasEvents
                          ? "bg-[#FAF6ED] hover:bg-[#E8D8B0]/30 text-[#191C24] border border-[#E8E5DE] hover:border-[#D4AF37]/50 font-extrabold shadow-sm"
                          : "text-slate-500 hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <span>{dayNum}</span>

                      {/* Milestone Colored Indicators / Badges on the Day */}
                      {hasEvents && (
                        <div className="flex items-center gap-0.5 absolute bottom-1">
                          {dayEvents.slice(0, 3).map((ev, i) => {
                            const meta = MILESTONE_PALETTE[ev.milestoneType];
                            return (
                              <span
                                key={i}
                                className={`w-2 h-2 rounded-full ${meta.dotBg} ring-1 ring-white shadow-xs`}
                                title={`${ev.companyName}: ${ev.milestoneType}`}
                              />
                            );
                          })}
                          {hasMultiple && dayEvents.length > 3 && (
                            <span className="text-[8px] font-black text-[#8A6A00] leading-none">
                              +{dayEvents.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* ──────── HOVER EFFECT: RICH FLOATING DETAILS CARD ──────── */}
                    {hoveredDay === dayNum && hasEvents && (
                      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 sm:w-72 bg-[#191C24] text-white p-3.5 rounded-2xl shadow-2xl border border-[#D4AF37]/30 z-50 pointer-events-none text-left animate-fade-in">
                        {/* Tooltip Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#D4AF37]/20 text-[11px]">
                          <span className="font-extrabold text-[#D4AF37]">
                            {MONTH_NAMES[viewMonth]} {dayNum}, {viewYear}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#E8D8B0]">
                            {dayEvents.length} {dayEvents.length > 1 ? "Events" : "Event"}
                          </span>
                        </div>

                        {/* List of IPOs on this date */}
                        <div className="py-2 space-y-2">
                          {dayEvents.map((ev) => {
                            const meta = MILESTONE_PALETTE[ev.milestoneType];
                            return (
                              <div key={ev.id} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-white flex items-center gap-1.5 truncate">
                                    <span>{ev.logo}</span>
                                    <span className="truncate">{ev.companyName}</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {ev.timeStr.slice(0, 8)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${meta.badgeBg}`}
                                  >
                                    {meta.icon} {meta.label}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-300 leading-tight">
                                  {ev.detailsSnippet}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Tooltip Prompt */}
                        <div className="pt-2 border-t border-[#D4AF37]/20 text-[10px] font-semibold text-[#D4AF37] flex items-center justify-between">
                          <span>{hasMultiple ? "Click to pick from multiple" : "Click to open 2-column copilot"}</span>
                          <span>›</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Summary Bar & Floating Action Buttons (Inspired by template) */}
            <div className="pt-6 mt-4 border-t border-[#E8E5DE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">
                  {currentMonthEvents.length} Milestones Scheduled
                </span>{" "}
                in {MONTH_NAMES[viewMonth]} {viewYear} • 2 Debuts Completed
              </div>

              {/* Template Floating Action Buttons (Pink Rocket + Blue Tag) */}
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  onClick={() => {
                    // Quick jump to Stripe listing on Nov 17
                    setViewYear(2026);
                    setViewMonth(10);
                    handleDayClick(17);
                  }}
                  title="Jump to Next Market Debut"
                  className="w-11 h-11 rounded-full bg-[#EC4899] text-white flex items-center justify-center shadow-lg shadow-[#EC4899]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  🚀
                </button>
                <button
                  onClick={() => {
                    // Quick jump to Price Bands
                    setFilterMilestone("Price Band Announcement Date");
                  }}
                  title="Filter by Price Band Releases"
                  className="w-11 h-11 rounded-full bg-[#0EA5E9] text-white flex items-center justify-center shadow-lg shadow-[#0EA5E9]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  🏷️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MULTIPLE RELEASES MODAL POPUP
          "and note if a date has multiple release use a popup to ask
           which of the ipos he or she is interested with"
          ═══════════════════════════════════════════════════════════════ */}
      {multiReleaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#D4AF37]/30 shadow-2xl p-6 sm:p-7 space-y-5 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FAF6ED] text-[#8A6A00] border border-[#D4AF37]/30">
                  Multiple Offerings on {MONTH_NAMES[viewMonth]} {multiReleaseDay}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  Which IPO offering are you interested in?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select one offering below to load its full S-1 prospectus & launch the AI Copilot:
                </p>
              </div>
              <button
                onClick={() => setMultiReleaseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* List of IPOs on this date */}
            <div className="space-y-3">
              {multiReleaseEvents.map((ev) => {
                const meta = MILESTONE_PALETTE[ev.milestoneType];
                const fullProfile = IPO_PROFILES[ev.ipoId];
                return (
                  <button
                    key={ev.id}
                    onClick={() => handlePickIpoEvent(ev)}
                    className="w-full p-4 rounded-2xl border border-[#E8E5DE] hover:border-[#D4AF37] hover:bg-[#FAF6ED]/50 transition-all text-left flex items-center justify-between group cursor-pointer shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center gap-3.5 truncate pr-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-2xl flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        {ev.logo}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900 truncate">
                            {ev.companyName}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500">
                            {ev.ticker}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${meta.badgeBg}`}
                          >
                            {meta.icon} {meta.label}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {ev.timeStr}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-[#8A6A00] block">
                        {fullProfile?.valuation.split("–")[0]}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#D4AF37] flex items-center gap-0.5 justify-end mt-1">
                        Select & Open ›
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 text-center text-xs text-slate-400">
              You can switch between offerings at any time from the calendar.
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          THE 2 COLUMNS DISPLAY (Triggered when date / IPO clicked)
          Column 1: Current IPO Details & Prospectus Intelligence
          Column 2: AI Prospectus Copilot & Chatbot
          ═══════════════════════════════════════════════════════════════ */}
      {selectedProfile && (
        <div className="space-y-4 animate-fade-in">
          {/* Section Banner */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse" />
              <h3 className="text-lg font-black text-slate-900">
                Offering Intelligence Workspace & Copilot
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Loaded for: <strong className="text-[#8A6A00]">{selectedProfile.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* ──────── COLUMN 1: IPO CURRENT DETAILS (7 Cols) ──────── */}
            <div className="lg:col-span-7 rounded-3xl bg-white border border-[#E2E0D8] p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                {/* Header: Logo, Name, Exchange, Milestone Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-50 border border-slate-200 text-3xl flex items-center justify-center shadow-inner shrink-0">
                      {selectedProfile.logo}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-slate-900">
                          {selectedProfile.name}
                        </h3>
                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {selectedProfile.ticker}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {selectedProfile.sector} • {selectedProfile.exchange}
                      </p>
                    </div>
                  </div>

                  {/* Active Milestone Status Pill */}
                  {selectedMilestone && (
                    <div className="self-start sm:self-auto">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-xs ${
                          MILESTONE_PALETTE[selectedMilestone].badgeBg
                        }`}
                      >
                        <span>{MILESTONE_PALETTE[selectedMilestone].icon}</span>
                        <span>{selectedMilestone}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* 6-Step Lifecycle Progress Tracker */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    IPO Milestone Progress Timeline
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {selectedProfile.milestonesTimeline.map((item, idx) => {
                      const meta = MILESTONE_PALETTE[item.type];
                      const isCurrent = item.type === selectedMilestone;
                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl text-center border transition-all ${
                            isCurrent
                              ? "bg-[#191C24] text-white border-[#191C24] shadow-md scale-102"
                              : item.completed
                              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          <span className="text-[10px] font-bold block truncate" title={item.type}>
                            {meta.icon} {item.type.split(" ")[0]}
                          </span>
                          <span
                            className={`text-[9px] block font-mono mt-0.5 ${
                              isCurrent ? "text-[#E8D8B0]" : "text-slate-400"
                            }`}
                          >
                            {item.dateFormatted}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Core Financials & Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Valuation Target
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono block mt-0.5">
                      {selectedProfile.valuation}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Price Band
                    </span>
                    <span className="text-sm font-extrabold text-[#8A6A00] font-mono block mt-0.5">
                      {selectedProfile.priceBand}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Revenue Scale
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono block mt-0.5">
                      {selectedProfile.revenueRunRate}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Hype & Sentiment
                    </span>
                    <span className="text-sm font-extrabold text-emerald-600 block mt-0.5">
                      {selectedProfile.hypeScore}
                    </span>
                  </div>
                </div>

                {/* S-1 Summary & Risk Disclosures */}
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[#FAF6ED]/50 border border-[#E8D8B0] space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#191C24]">
                      <SparklesIcon size={14} className="text-[#D4AF37]" />
                      <span>S-1 Prospectus Executive Thesis</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {selectedProfile.s1Summary}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <ShieldCheckIcon size={14} className="text-amber-600" />
                      <span>Key Risk Factors & Red Flags</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {selectedProfile.riskFactors}
                    </p>
                  </div>
                </div>

                {/* Lead Syndicate Underwriters */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-medium">Lead Bookrunners:</span>
                  <div className="flex items-center gap-1.5">
                    {selectedProfile.underwriters.map((bank) => (
                      <span
                        key={bank}
                        className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200"
                      >
                        {bank}
                      </span>
                    ))}
                    <span className="text-[10px] font-bold text-[#8A6A00] ml-1">
                      +{selectedProfile.underwritersCount} co-managers
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => setIsAlertSaved(!isAlertSaved)}
                  className={`px-5 py-3 rounded-2xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                    isAlertSaved
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                      : "bg-[#191C24] text-white hover:bg-[#20242D] shadow-md shadow-[#191C24]/20"
                  }`}
                >
                  {isAlertSaved ? (
                    <>
                      <CheckCircle2Icon size={16} />
                      <span>Alert Enabled for {selectedProfile.name}</span>
                    </>
                  ) : (
                    <>
                      <span>🔔 Set Milestone Alert</span>
                    </>
                  )}
                </button>

                <div className="text-xs text-slate-400 font-medium">
                  Lockup: <strong className="text-slate-700">{selectedProfile.lockupDays}</strong> (exp: {selectedProfile.lockupDateStr})
                </div>
              </div>
            </div>

            {/* ──────── COLUMN 2: AI CHATBOT & COPILOT (5 Cols) ──────── */}
            <div className="lg:col-span-5 rounded-3xl bg-gradient-to-b from-[#191C24] via-[#20242D] to-[#191C24] text-white p-6 sm:p-7 shadow-2xl flex flex-col justify-between space-y-5 relative overflow-hidden">
              {/* Soft gold decorative glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                {/* Chatbot Top Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#722F37] text-white flex items-center justify-center shadow-md">
                      <BotIcon size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>AI Prospectus Copilot</span>
                      </h4>
                      <span className="text-[10px] text-emerald-300 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Connected to {selectedProfile.name} S-1</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setChatMessages([
                        {
                          sender: "bot",
                          text: `Cleared conversation. Ask me any question about ${selectedProfile.name}'s financial metrics, moats, or risks.`,
                        },
                      ])
                    }
                    className="text-[10px] text-white/50 hover:text-white transition-colors cursor-pointer"
                  >
                    Reset Chat
                  </button>
                </div>

                {/* Chat Stream Box */}
                <div className="h-64 sm:h-72 overflow-y-auto space-y-2.5 p-3 rounded-2xl bg-black/40 border border-white/10 text-xs">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-[#722F37] text-white ml-6 text-right shadow-sm border border-[#D4AF37]/30"
                          : "bg-white/10 text-white/95 mr-3 border border-white/5 shadow-inner"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {isBotThinking && (
                    <div className="p-3 rounded-2xl bg-white/10 text-[#E8D8B0] mr-3 flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
                      <span>Consulting S-1 filing analysis...</span>
                    </div>
                  )}
                </div>

                {/* 1-Click Inquiry Suggestion Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                    Quick Questions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProfile.aiQa.map((qa) => (
                      <button
                        key={qa.query}
                        type="button"
                        onClick={() => handleSendChat(undefined, qa.query)}
                        className="text-[10px] px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 border border-white/10 transition-colors text-left cursor-pointer truncate max-w-full"
                      >
                        💡 {qa.query}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Bar Form */}
                <form onSubmit={handleSendChat} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Ask anything about ${selectedProfile.name}...`}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-[#191C24] font-bold hover:brightness-110 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-md shadow-[#D4AF37]/20"
                    aria-label="Send message"
                  >
                    <SendIcon size={14} />
                  </button>
                </form>
              </div>

              {/* Bottom Quick Disclaimer */}
              <div className="text-[10px] text-white/40 text-center pt-2 border-t border-white/10">
                AI Copilot synthesizes official SEC EDGAR S-1, 10-Q & F-1 filings in real time.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
