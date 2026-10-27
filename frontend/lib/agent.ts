"use client";

/**
 * Mostro AI Client-Side Assistant Transport
 * Lists the issuers the agent can answer about and consumes the token-authenticated
 * `POST /sse` server-sent-event stream.
 *
 * `EventSource` cannot be used here: the agent endpoint is POST + Bearer auth, so the
 * stream is read manually from the fetch response body.
 */

import { API_BASE, apiFetch, getValidAccessToken } from "./auth";

export interface IpoListItem {
  id: string;
  company_name: string;
  symbol: string;
}

export interface AgentCitation {
  chunk_id: string;
  page_number: number;
  section_path: string | null;
  score: number;
}

export interface QuizQuestion {
  kind: "mcq" | "open_ended";
  question: string;
  options: string[] | null;
  answer: string | null;
}

export interface CalendarCard {
  proposal_id: string;
  title: string;
  start: string;
  end: string;
  description: string;
}

export type AgentEventType =
  | "session"
  | "token"
  | "answer"
  | "quiz"
  | "calendar"
  | "refusal"
  | "error";

export interface AgentEvent {
  type: AgentEventType;
  content: string | null;
  session_id: string | null;
  question: QuizQuestion | null;
  calendar: CalendarCard | null;
  citations: AgentCitation[];
  memory_trace: Record<string, unknown> | null;
}

export interface AgentRequestPayload {
  message: string;
  ipo_id: string;
  session_id?: string | null;
  consent_quiz?: boolean;
}

/** Fetch the issuers available to the signed-in user. */
export async function listIpos(): Promise<IpoListItem[]> {
  const res = await apiFetch("/ipos");
  if (!res.ok) {
    throw new Error(`Could not load the IPO list (HTTP ${res.status}).`);
  }
  return (await res.json()) as IpoListItem[];
}

/**
 * Stream one assistant turn.
 *
 * Resolves once the server closes the stream; individual frames are handed to
 * `onEvent` as they arrive. Pass an `AbortSignal` to cancel an in-flight turn.
 */
export async function streamAgent(
  payload: AgentRequestPayload,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = await getValidAccessToken();

  const res = await fetch(`${API_BASE}/sse`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`The assistant request failed (HTTP ${res.status}).`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    // Raw carriage returns only ever come from SSE line terminators; JSON payloads
    // escape theirs, so stripping them keeps frame splitting to a single "\n\n".
    buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).replace(/^ /, ""))
        .join("\n");

      if (data) {
        try {
          onEvent(JSON.parse(data) as AgentEvent);
        } catch {
          // Keep-alive/comment frames and partial JSON are safe to skip.
        }
      }

      boundary = buffer.indexOf("\n\n");
    }
  }
}
