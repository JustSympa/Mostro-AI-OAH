import React from "react";
import { ShieldCheckIcon, SparklesIcon } from "./Icons";

export function PrinciplesSection() {
  const principles = [
    {
      num: "01",
      title: "Learned Step by Step",
      description:
        "Nobody is born understanding options Greeks or discounted cash flows. We break intimidating market mechanics into bite-sized, sequential milestones so you never feel out of your depth.",
    },
    {
      num: "02",
      title: "Complexity Made Plain",
      description:
        "Wall Street jargon often protects insiders by making simple concepts sound obscure. We decode financial disclosures, balance sheets, and macroeconomic indicators into clear, intuitive English.",
    },
    {
      num: "03",
      title: "You Remain in Control",
      description:
        "We never promise returns, push sponsored tickers, or act as an investment adviser. We provide objective, verifiable knowledge so you can make your own informed financial decisions with confidence.",
    },
  ];

  return (
    <section className="py-20 sm:py-24 relative bg-[#F8F7F4] border-t border-[#E8E5DE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#E8D8B0] text-[#8A6A00] text-xs font-semibold uppercase tracking-wider">
            <ShieldCheckIcon size={14} />
            <span>Our Foundation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#191C24] tracking-tight">
            Built on Three Unshakable Principles
          </h2>
          <p className="text-[#5F6470] text-base">
            Mostro AI was created to replace intimidation with clarity, giving every individual the
            tools to understand financial markets on their own terms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {principles.map((principle, idx) => (
            <div
              key={idx}
              className="glass-panel-light p-8 rounded-3xl border border-[#E8E5DE] bg-white space-y-4 relative overflow-hidden shadow-xs"
            >
              <div className="text-3xl font-black text-[#E8D8B0] tracking-tight">
                {principle.num}
              </div>
              <h3 className="text-lg font-bold text-[#191C24]">{principle.title}</h3>
              <p className="text-sm text-[#5F6470] leading-relaxed">
                {principle.description}
              </p>
            </div>
          ))}
        </div>

        {/* Disclaimer Callout */}
        <div className="mt-12 p-6 rounded-2xl bg-white border border-[#E8E5DE] text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A6A00] mb-1">
            <SparklesIcon size={14} />
            <span>Strictly Educational & Objective</span>
          </div>
          <p className="text-xs text-[#5F6470] leading-relaxed">
            Mostro AI does not provide financial, legal, tax, or investment advice. All materials,
            learning modules, and AI explanations are designed purely for financial literacy and
            informational purposes.
          </p>
        </div>
      </div>
    </section>
  );
}
