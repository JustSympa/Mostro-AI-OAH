import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mostro AI | Financial Education & Market Intelligence",
  description:
    "A human-centered financial education platform. Master financial concepts step by step with gamified learning quests, real-time IPO tracking, curated market news, and 24/7 AI clarity.",
  keywords: [
    "Mostro AI",
    "financial education",
    "financial literacy",
    "learning quests",
    "IPO calendar",
    "market intelligence",
    "financial AI copilot",
  ],
  authors: [{ name: "Mostro AI Team" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FFFFFF] text-[#191C24] selection:bg-[#E8D8B0] selection:text-[#191C24]">
        {children}
      </body>
    </html>
  );
}
