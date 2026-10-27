"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BotIcon,
  SendIcon,
  SparklesIcon,
  BookOpenIcon,
  CalendarIcon,
  LightbulbIcon,
} from "./Icons";
import {
  listIpos,
  streamAgent,
  type AgentCitation,
  type CalendarCard,
  type IpoListItem,
  type QuizQuestion,
} from "../lib/agent";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  tone?: "refusal" | "error";
  citations?: AgentCitation[];
  quiz?: QuizQuestion;
  calendar?: CalendarCard;
  streaming?: boolean;
}

const TONE_CLASS: Record<"refusal" | "error", string> = {
  refusal: "border-[#E8D8B0] bg-[#FAF6ED]",
  error: "border-[#F0C9CE] bg-[#FDF6F7]",
};

/** Quiz prompt with an opt-in answer reveal, so the card does not spoil itself. */
function QuizCard({ question }: { question: QuizQuestion }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="mt-3 rounded-2xl border border-[#E8D8B0] bg-[#FAF6ED] p-4 space-y-2.5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#8A6A00]">
        <LightbulbIcon size={13} />
        <span>Knowledge Check</span>
      </div>
      <p className="text-sm font-semibold text-[#191C24]">{question.question}</p>

      {question.options && (
        <ul className="space-y-1.5">
          {question.options.map((option) => (
            <li
              key={option}
              className="text-xs text-[#5F6470] px-3 py-2 rounded-xl bg-white border border-[#E8E5DE]"
            >
              {option}
            </li>
          ))}
        </ul>
      )}

      {question.answer && (
        <div className="pt-1">
          {revealed ? (
            <p className="text-xs font-semibold text-[#8A6A00]">
              Suggested answer: {question.answer}
            </p>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="text-xs font-bold text-[#8A6A00] hover:underline cursor-pointer"
            >
              Reveal suggested answer →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CalendarProposalCard({ card }: { card: CalendarCard }) {
  const format = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  };

  return (
    <div className="mt-3 rounded-2xl border border-[#E8E5DE] bg-white p-4 space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#8A6A00]">
        <CalendarIcon size={13} />
        <span>Proposed Calendar Entry</span>
      </div>
      <p className="text-sm font-bold text-[#191C24]">{card.title}</p>
      <p className="text-xs text-[#5F6470]">
        {format(card.start)} → {format(card.end)}
      </p>
      <p className="text-xs text-[#5F6470] leading-relaxed">{card.description}</p>
    </div>
  );
}

function CitationList({ citations }: { citations: AgentCitation[] }) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-[#E8E5DE] space-y-1">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#858995]">
        <BookOpenIcon size={12} />
        <span>Prospectus Sources</span>
      </div>
      {citations.map((citation) => (
        <div key={citation.chunk_id} className="text-[11px] text-[#5F6470]">
          Page {citation.page_number}
          {citation.section_path ? ` · ${citation.section_path}` : ""}
          <span className="text-[#858995]"> — match {citation.score.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

export function AiAssistantChat() {
  const [ipos, setIpos] = useState<IpoListItem[]>([]);
  const [loadingIpos, setLoadingIpos] = useState(true);
  const [iposError, setIposError] = useState<string | null>(null);
  const [selectedIpoId, setSelectedIpoId] = useState<string>("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turnError, setTurnError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const nextId = useCallback(() => {
    idRef.current += 1;
    return `msg-${idRef.current}`;
  }, []);

  // Load the issuers the agent can answer about.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const items = await listIpos();
        if (cancelled) return;
        setIpos(items);
        setSelectedIpoId((current) => current || items[0]?.id || "");
      } catch (err) {
        if (cancelled) return;
        setIposError(err instanceof Error ? err.message : "Could not load the IPO list.");
      } finally {
        if (!cancelled) setLoadingIpos(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Abort any in-flight turn when the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the transcript pinned to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const selectedIpo = ipos.find((ipo) => ipo.id === selectedIpoId) || null;

  const resetConversation = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setSessionId(null);
    setTurnError(null);
    setBusy(false);
  };

  const handleSelectIpo = (id: string) => {
    if (id === selectedIpoId) return;
    resetConversation();
    setSelectedIpoId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy || !selectedIpoId) return;

    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", text },
      { id: assistantId, role: "assistant", text: "", streaming: true },
    ]);
    setInput("");
    setBusy(true);
    setTurnError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const patchAssistant = (updater: (message: ChatMessage) => ChatMessage) => {
      setMessages((prev) =>
        prev.map((message) => (message.id === assistantId ? updater(message) : message))
      );
    };

    try {
      await streamAgent(
        { message: text, ipo_id: selectedIpoId, session_id: sessionId },
        (event) => {
          switch (event.type) {
            case "session":
              if (event.session_id) setSessionId(event.session_id);
              break;
            case "token":
              patchAssistant((m) => ({ ...m, text: m.text + (event.content ?? "") }));
              break;
            case "answer":
              patchAssistant((m) => ({
                ...m,
                text: event.content ?? m.text,
                citations: event.citations ?? [],
                streaming: false,
              }));
              break;
            case "quiz":
              if (event.question) {
                patchAssistant((m) => ({ ...m, quiz: event.question as QuizQuestion }));
              }
              break;
            case "calendar":
              if (event.calendar) {
                patchAssistant((m) => ({ ...m, calendar: event.calendar as CalendarCard }));
              }
              break;
            case "refusal":
            case "error":
              patchAssistant((m) => ({
                ...m,
                text: event.content ?? m.text,
                tone: event.type === "refusal" ? "refusal" : "error",
                streaming: false,
              }));
              break;
          }
        },
        controller.signal
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        const message =
          err instanceof Error ? err.message : "The assistant is temporarily unavailable.";
        setTurnError(message);
        patchAssistant((m) =>
          m.text
            ? { ...m, streaming: false }
            : { ...m, text: message, tone: "error", streaming: false }
        );
      }
    } finally {
      patchAssistant((m) => (m.streaming ? { ...m, streaming: false } : m));
      setBusy(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── Context Selector ── */}
      <div className="rounded-3xl border border-[#E8E5DE] bg-white p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#8A6A00]">
            <BotIcon size={13} />
            <span>AI Financial Copilot</span>
          </div>
          <p className="text-xs text-[#5F6470]">
            Answers are grounded in the selected issuer&apos;s prospectus and your learning profile.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="assistant-ipo" className="text-[11px] font-bold text-[#858995] whitespace-nowrap">
            Issuer
          </label>
          <select
            id="assistant-ipo"
            value={selectedIpoId}
            onChange={(e) => handleSelectIpo(e.target.value)}
            disabled={loadingIpos || ipos.length === 0}
            className="text-xs font-semibold text-[#191C24] bg-[#F8F7F4] border border-[#E8E5DE] rounded-xl px-3 py-2 min-w-[220px] disabled:opacity-60 cursor-pointer"
          >
            {ipos.length === 0 && <option value="">{loadingIpos ? "Loading…" : "No issuers"}</option>}
            {ipos.map((ipo) => (
              <option key={ipo.id} value={ipo.id}>
                {ipo.symbol} — {ipo.company_name}
              </option>
            ))}
          </select>
          <button
            onClick={resetConversation}
            disabled={messages.length === 0}
            className="text-[11px] font-bold text-[#5F6470] hover:text-[#191C24] px-3 py-2 rounded-xl border border-[#E8E5DE] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            New chat
          </button>
        </div>
      </div>

      {/* ── Transcript ── */}
      <div
        ref={scrollRef}
        className="rounded-3xl border border-[#E8E5DE] bg-white p-5 h-[calc(100vh-22rem)] min-h-[380px] overflow-y-auto space-y-5"
      >
        {iposError && (
          <div className="rounded-2xl border border-[#F0C9CE] bg-[#FDF6F7] p-4 text-xs text-[#9E2D3A]">
            {iposError}
          </div>
        )}

        {!iposError && ipos.length === 0 && !loadingIpos && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2">
            <BotIcon size={28} className="text-[#D4AF37]" />
            <p className="text-sm font-bold text-[#191C24]">No issuers available yet</p>
            <p className="text-xs text-[#5F6470] max-w-sm">
              The assistant can only answer about issuers registered in the platform. Seed the
              <span className="font-mono"> ipos </span> table to get started.
            </p>
          </div>
        )}

        {messages.length === 0 && ipos.length > 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="p-3 rounded-2xl bg-[#FAF6ED] border border-[#E8D8B0]">
              <SparklesIcon size={22} className="text-[#8A6A00]" />
            </div>
            <p className="text-sm font-bold text-[#191C24]">
              Ask about {selectedIpo?.company_name ?? "this issuer"}
            </p>
            <p className="text-xs text-[#5F6470] max-w-md">
              &ldquo;What are the biggest risk factors in the filing?&rdquo; or &ldquo;Explain the
              revenue model in plain English.&rdquo;
            </p>
          </div>
        )}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[#191C24] text-white px-4 py-3 text-sm">
                {message.text}
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-xl bg-[#FAF6ED] border border-[#E8D8B0] flex items-center justify-center">
                <BotIcon size={16} className="text-[#8A6A00]" />
              </div>
              <div
                className={`max-w-[85%] rounded-2xl rounded-bl-sm border px-4 py-3 ${
                  message.tone
                    ? TONE_CLASS[message.tone]
                    : "border-[#E8E5DE] bg-[#F8F7F4]"
                }`}
              >
                {message.streaming && !message.text ? (
                  <span className="text-xs font-semibold text-[#858995]">
                    Reading the filing…
                  </span>
                ) : (
                  <p className="text-sm text-[#191C24] whitespace-pre-wrap leading-relaxed">
                    {message.text}
                  </p>
                )}

                {message.calendar && <CalendarProposalCard card={message.calendar} />}
                {message.quiz && <QuizCard question={message.quiz} />}
                {message.citations && <CitationList citations={message.citations} />}
              </div>
            </div>
          )
        )}
      </div>

      {/* ── Composer ── */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-[#E8E5DE] bg-white p-3 flex items-end gap-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={2}
          disabled={busy || !selectedIpoId}
          placeholder={
            selectedIpoId
              ? "Ask about the prospectus, valuation, risks, or a financial concept…"
              : "Select an issuer to begin"
          }
          className="flex-1 resize-none bg-transparent text-sm text-[#191C24] placeholder:text-[#858995] outline-none px-2 py-1.5 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim() || !selectedIpoId}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#191C24] text-white text-xs font-bold hover:bg-[#2A2F3B] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <SendIcon size={14} />
          <span>{busy ? "Streaming" : "Send"}</span>
        </button>
      </form>

      {turnError && (
        <p className="text-[11px] text-[#9E2D3A] px-2">{turnError}</p>
      )}
    </div>
  );
}
