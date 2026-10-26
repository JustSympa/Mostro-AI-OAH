"use client";

import React, { useState } from "react";
import {
  SparklesIcon,
  BotIcon,
  SendIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  CheckCircle2Icon,
} from "./Icons";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  keyPoints?: string[];
  proTip?: string;
  timestamp: string;
}

const defaultMessages: ChatMessage[] = [
  {
    id: "welcome",
    sender: "bot",
    text: "Hello! I am Mostro AI, your dedicated financial learning companion. What concept, ticker, or market mechanics would you like to explore today?",
    keyPoints: [
      "Ask me to simplify Wall Street jargon (Derivatives, DCF, IPOs, Short Squeezes)",
      "Get objective breakdowns of corporate financial statements",
      "Test scenarios and clear your investment doubts in seconds",
    ],
    timestamp: "Just now",
  },
];

const promptLibrary: { query: string; response: Omit<ChatMessage, "id" | "sender" | "timestamp"> }[] = [
  {
    query: "Explain Call Options like I'm 15",
    response: {
      text: "Think of a Call Option like a concert ticket deposit coupon:",
      keyPoints: [
        "Imagine your favorite artist announces a concert. You pay $10 today for a coupon that gives you the right to buy a ticket for $100 anytime in the next 30 days.",
        "If the concert sells out and tickets surge to $300, your coupon lets you still buy it for $100. You made a huge profit!",
        "If the artist cancels or tickets drop to $50, you simply don't use the coupon. The only thing you lost was your $10 deposit.",
        "In the stock market: A Call Option gives you the right (not obligation) to buy 100 shares of a stock at a set strike price before a deadline.",
      ],
      proTip: "Pro-Tip: When you BUY a call option, your maximum risk is strictly limited to the premium you paid, while your upside is theoretically unlimited.",
    },
  },
  {
    query: "How do I read P/E vs PEG ratio?",
    response: {
      text: "The Price-to-Earnings (P/E) ratio shows how much investors pay for $1 of current profit. But P/E alone is blind to future growth—that is where PEG comes in:",
      keyPoints: [
        "P/E Ratio = Stock Price ÷ Earnings Per Share (EPS). A high P/E (e.g. 50x) might look expensive, but what if the company is doubling its sales every year?",
        "PEG Ratio = P/E Ratio ÷ Expected Annual Growth Rate. It normalizes valuation for speed.",
        "Rule of Thumb: A PEG around 1.0 is considered fairly valued. A PEG < 1.0 suggests the stock may be undervalued relative to its growth trajectory.",
      ],
      proTip: "Pro-Tip: Always check whether the PEG calculation uses historical trailing growth or forward analyst estimates, which can be overly optimistic.",
    },
  },
  {
    query: "What are the risks of pre-IPO investing?",
    response: {
      text: "Pre-IPO investing allows private participation before public market debuts, but it carries three unique structural risks:",
      keyPoints: [
        "Illiquidity Trap: Private shares cannot be sold freely on an exchange. You are locked in until a liquidity event occurs.",
        "Lockup Period: Even after the IPO bell rings, early investors and employees are typically barred from selling for 90 to 180 days.",
        "Information Asymmetry: Private companies are not required to file quarterly 10-Q reports with the SEC until they formally register an S-1.",
      ],
      proTip: "Pro-Tip: Many hot IPOs experience initial retail hype followed by a post-lockup dip when early venture funds liquidate their positions.",
    },
  },
  {
    query: "Can you explain Dollar-Cost Averaging during dips?",
    response: {
      text: "Dollar-Cost Averaging (DCA) is an emotional circuit-breaker that removes market timing anxiety:",
      keyPoints: [
        "Instead of trying to guess the exact market bottom with a lump sum, you invest a fixed dollar amount at regular intervals (e.g. $250 every Friday).",
        "When market prices crash, your fixed $250 automatically purchases more shares at a discount.",
        "When prices surge, your $250 buys fewer shares. Over time, your average cost basis gravitates lower without panic.",
      ],
      proTip: "Pro-Tip: DCA combined with broad-market low-cost index funds has historically outperformed over 85% of active day traders across 10-year periods.",
    },
  },
];

let messageSequence = 0;
function generateMessageId(prefix: string): string {
  messageSequence += 1;
  return `${prefix}-${messageSequence}`;
}

export function AiChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendPrompt = (queryText: string) => {
    if (!queryText.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: generateMessageId("user"),
      sender: "user",
      text: queryText,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Look for matching prompt or synthesize a general intelligent response
    setTimeout(() => {
      const match = promptLibrary.find(
        (p) => p.query.toLowerCase() === queryText.toLowerCase()
      );

      let botResponse: ChatMessage;

      if (match) {
        botResponse = {
          id: generateMessageId("bot"),
          sender: "bot",
          text: match.response.text,
          keyPoints: match.response.keyPoints,
          proTip: match.response.proTip,
          timestamp: "Just now",
        };
      } else {
        botResponse = {
          id: generateMessageId("bot"),
          sender: "bot",
          text: `Great question regarding "${queryText}". Here is the core framework to analyze this:`,
          keyPoints: [
            "Market Fundamentals: Focus on cash generation, unit economics, and competitive defensive barriers.",
            "Risk vs Expected Value: Determine your worst-case drawdown before evaluating theoretical upside.",
            "Action Step: Check our Level 3 quest module on Financial Statements to see how institutional analysts model this.",
          ],
          proTip: "Pro-Tip: You can ask specific questions like 'How do I read a balance sheet?' or 'What is an ETF expense ratio?' for deep dives!",
          timestamp: "Just now",
        };
      }

      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <section id="ai-copilot" className="py-20 sm:py-28 relative scroll-mt-20 bg-slate-950/60">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <SparklesIcon size={14} />
            <span>Pillar 4 • 24/7 AI Financial Clarity</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Clear Every Doubt With Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Personalized AI Copilot
            </span>
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            No question is too simple or too complex. From deciphering quarterly 10-Ks to demystifying
            options volatility, Mostro AI provides instant, unbiased clarity.
          </p>
        </div>

        {/* Clickable Quick Prompts */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
            <MessageSquareIcon size={14} className="text-emerald-400" />
            <span>Try these interactive sample questions:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {promptLibrary.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(item.query)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/5 hover:border-emerald-500/30 transition-all text-left shadow-sm hover:scale-[1.01]"
              >
                &ldquo;{item.query}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Live Interactive Chat Sandbox */}
        <div className="max-w-4xl mx-auto glass-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[580px] bg-[#0a0e18]/95">
          {/* Chat Window Top Bar */}
          <div className="px-6 py-4 bg-slate-900/90 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <BotIcon size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Mostro Financial Copilot
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h4>
                <p className="text-[11px] text-slate-400">Trained on SEC Filings & Financial Economics</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheckIcon size={14} className="text-emerald-400" />
              <span>Zero Jargon Guaranteed</span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-2xl ${
                  msg.sender === "user" ? "ml-auto justify-end" : "mr-auto justify-start"
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-1">
                    <BotIcon size={16} />
                  </div>
                )}
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-semibold rounded-tr-none shadow-md"
                      : "bg-slate-900/90 border border-white/5 text-slate-200 rounded-tl-none space-y-3"
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Bullet points if present */}
                  {msg.keyPoints && msg.keyPoints.length > 0 && (
                    <ul className="space-y-2 pt-1 border-t border-white/5">
                      {msg.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2Icon size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-normal">{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Pro Tip Callout if present */}
                  {msg.proTip && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                      {msg.proTip}
                    </div>
                  )}

                  <div
                    className={`text-[10px] text-right mt-1 ${
                      msg.sender === "user" ? "text-slate-900/70" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 items-center text-slate-400 text-xs">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <BotIcon size={16} />
                </div>
                <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-slate-900/80 border border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-200" />
                  <span className="ml-1 text-[11px]">Mostro is formulating clarity...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 bg-slate-900/90 border-t border-white/5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt(inputValue);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask any financial question (e.g. 'What is a Bear Flag pattern?')..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="p-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                aria-label="Send message"
              >
                <SendIcon size={18} />
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Mostro AI is designed for financial education and self-directed clarity. Not registered
              financial advisory.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
