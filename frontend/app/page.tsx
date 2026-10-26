import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { LearningPath } from "../components/LearningPath";
import { IpoCalendar } from "../components/IpoCalendar";
import { NewsSection } from "../components/NewsSection";
import { AiAssistantSection } from "../components/AiAssistantSection";
import { PrinciplesSection } from "../components/PrinciplesSection";
import { CtaBanner } from "../components/CtaBanner";
import { Footer } from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#191C24] selection:bg-[#E8D8B0] selection:text-[#191C24]">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Sections */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section with Floating Frosted Glass Centerpiece */}
        <Hero />

        {/* Pillar 1: Financial Learning Quests */}
        <LearningPath />

        {/* Pillar 2: IPO Calendar & Discovery */}
        <IpoCalendar />

        {/* Pillar 3: Curated Financial News */}
        <NewsSection />

        {/* Pillar 4: AI Financial Assistant */}
        <AiAssistantSection />

        {/* Three Core Principles & Trust */}
        <PrinciplesSection />

        {/* High-Impact Pre-Footer CTA */}
        <CtaBanner />
      </main>

      {/* Footer & Educational Disclaimers */}
      <Footer />
    </div>
  );
}
