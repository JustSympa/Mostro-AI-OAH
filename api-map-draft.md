# Mostro AI: API map

**Version 0.2 (monolith, hackathon MVP).** One FastAPI application exposes user management and the AI agent. There is no service-to-service communication: users authenticate directly with JWTs.

Changes from v0.1:
- Removed the internal-key and `X-User-Id` headers, the "backend gateway" concept, and the service-boundary notes.
- Added standard auth and user routes.
- Added the new agent features: agentic RAG with the JEV retrieval loop, the education pipeline (profile, knowledge states, quizzes), and calendar reminders.
- Added testability routes (traces, demo seed, integration health, time travel for reminders) so an examiner can verify everything from the API alone.
- The chat endpoint now defaults to a **non-streaming** JSON response, because Swagger UI and `curl` handle it better. Streaming is opt-in.

## Contents

1. [Overview](#1-overview)
2. [Conventions](#2-conventions)
3. [Examiner quickstart](#3-examiner-quickstart)
4. [System](#4-system)
5. [Auth](#5-auth)
6. [Users and onboarding](#6-users-and-onboarding)
7. [IPOs and sources](#7-ipos-and-sources)
8. [Chat and the agent](#8-chat-and-the-agent)
9. [Education: glossary, knowledge, quizzes](#9-education-glossary-knowledge-quizzes)
10. [Calendar and reminders](#10-calendar-and-reminders)
11. [Usage](#11-usage)
12. [Admin](#12-admin)
13. [Objects and enums](#13-objects-and-enums)
14. [Errors](#14-errors)
15. [Required ERD and config changes](#15-required-erd-and-config-changes)

---

## 1. Overview

Tier column used in every table: **C** = core (needed for the demo), **S** = support (needed for a complete product), **X** = stretch (only if time allows).

| # | Group | Prefix | Endpoints | Notes |
|---|---|---|---|---|
| 4 | System | `/health`, `/v1/meta` | 3 | Health, versions, sponsor-integration status |
| 5 | Auth | `/v1/auth` | 5 | Register, login, refresh, logout |
| 6 | Users and onboarding | `/v1/users/me`, `/v1/onboarding` | 6 | Account, profile, risk/knowledge questionnaire |
| 7 | IPOs and sources | `/v1/ipos`, `/v1/chunks`, `/v1/documents` | 7 | Read-only catalog and citation viewer |
| 8 | Chat and agent | `/v1/chat`, `/v1/ipos/{id}/ask` | 10 | The agent: agentic RAG, traces |
| 9 | Education | `/v1/glossary`, `/v1/me/knowledge`, `/v1/quizzes` | 8 | Glossary, mastery, MCQ and open-ended quizzes |
| 10 | Calendar | `/v1/calendar` | 7 | Proposals, confirmation, reminders, `.ics` |
| 11 | Usage | `/v1/usage` | 1 | Token and cost tracking (Meterless) |
| 12 | Admin | `/v1/admin` | 27 | Ingestion, review, glossary, users, demo tools |

About 74 endpoints in total, but the **C** tier is about 36. Build in tier order.

## 2. Conventions

- **Base path:** `/v1`. `/health` is unversioned. Interactive docs at `/docs` and the schema at `/openapi.json`.
- **Authentication:** `Authorization: Bearer <access_token>` on everything except `/health`, `/v1/meta`, and the auth routes.
- **Roles:** `user` and `admin`. Admin routes return `403` for normal users. Users can only see their own sessions, messages, quizzes, proposals, and usage.
- **Format:** JSON (`application/json`), except `POST /v1/auth/token` (form-encoded, so the Swagger "Authorize" button works), document upload (`multipart/form-data`), the optional SSE stream, and the `.ics` download.
- **Pagination:** query `limit` (default 20, max 100) and `cursor`. Responses return `{ "items": [...], "next_cursor": "..." | null }`.
- **Timestamps:** ISO 8601 UTC. Calendar events additionally carry an IANA `timezone` (for example `Africa/Douala`).
- **Rate limiting:** per user on message endpoints (they cost money). Exceeding it returns `429` with `Retry-After`.
- **Notation:** `P` path param, `Q` query param, `B` body field, `H` header, `*` required.

## 3. Examiner quickstart

Everything in the agent can be exercised with these calls, in order. Seed data is loaded on startup when `DEMO_MODE=true`, or by calling `POST /v1/admin/demo/seed`.

| Step | Call | What to look for |
|---|---|---|
| 1 | `GET /v1/meta` | Models, thresholds (JEV score 0.70, 3 tries, quiz every 4 turns), and sponsor integrations status |
| 2 | `POST /v1/auth/register` | Returns user and tokens immediately |
| 3 | `GET /v1/ipos` | Pick a demo IPO `id` |
| 4 | `POST /v1/ipos/{id}/ask` with `debug=true` | **Prospectus search:** answer with page citations and the full trace (rewrites, JEV scores, Zetaris queries) |
| 5 | Ask something the prospectus doesn't contain | **Abstention** after 3 failed JEV tries (`outcome: abstained`) |
| 6 | Ask "explain oversubscription like I'm new" | **Education route** adapts to the profile and mastery (set them first with `PUT /v1/users/me/profile` and `PUT /v1/me/knowledge/{term_id}`) |
| 7 | Ask "when does the offer open and close?" | **Calendar route** returns a `calendar_card` |
| 8 | `POST /v1/calendar/proposals/{id}/confirm`, then `GET /v1/calendar/reminders` | Reminder scheduled; `GET /v1/calendar/events.ics` exports it |
| 9 | `POST /v1/chat/sessions/{id}/quizzes`, then `POST /v1/quizzes/{id}/answer` | **Engagement loop**: grading, feedback, and mastery change in `GET /v1/me/knowledge` |
| 10 | `GET /v1/usage/me` | Tokens and cost per request (Meterless tracking) |

```bash
BASE=http://localhost:8000

# 1. Register (returns tokens) and keep the access token
TOKEN=$(curl -s -X POST $BASE/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"judge@example.com","password":"Judge-2026!","full_name":"Judge"}' | jq -r .access_token)

# 2. Find an IPO
curl -s $BASE/v1/ipos -H "Authorization: Bearer $TOKEN" | jq '.items[] | {id, company_name}'

# 3. Ask the agent about it, with the full reasoning trace
curl -s -X POST $BASE/v1/ipos/$IPO_ID/ask -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"What is the minimum subscription amount?","debug":true}' | jq

# 4. Inspect the trace of any past answer
curl -s $BASE/v1/chat/messages/$MESSAGE_ID/trace -H "Authorization: Bearer $TOKEN" | jq
```

## 4. System

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| GET | `/health` | Liveness. No auth. | none | `200 { "status": "ok" }` | C |
| GET | `/health/ready` | Readiness: database reachable, pgvector present, agent graph compiled. No external calls. | none | `200 { "status": "ready", "checks": {...} }` or `503` | S |
| GET | `/v1/meta` | Public build info: API version, chat and embedding models, embedding dimension, prompt versions, agent settings (`jev_min_score`, `jev_max_tries`, `quiz_every_n_turns`), supported languages, and which sponsor integrations are enabled (`zetaris`, `meterless`, `nvidia`). No secrets. | none | `200 {...}` | C |

## 5. Auth

JWT access token (short-lived) plus refresh token (long-lived, stored hashed, revocable).

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| POST | `/v1/auth/register` | Create an account. Returns tokens right away so a tester can start immediately. | B: `email`*, `password`* (min 8 chars), `full_name`*, `preferred_language` (`en`\|`fr`) | `201 { user, access_token, refresh_token, token_type, expires_in }` | C |
| POST | `/v1/auth/login` | Log in with JSON credentials. | B: `email`*, `password`* | `200 { user, access_token, refresh_token, token_type, expires_in }` | C |
| POST | `/v1/auth/token` | OAuth2 password flow, form-encoded. Lets the **Authorize** button in `/docs` work. | B (form): `username`* (the email), `password`* | `200 { access_token, token_type }` | C |
| POST | `/v1/auth/refresh` | Exchange a refresh token for a new access token (and rotate the refresh token). | B: `refresh_token`* | `200 { access_token, refresh_token, expires_in }` | S |
| POST | `/v1/auth/logout` | Revoke the refresh token. | B: `refresh_token`* | `204` | S |

## 6. Users and onboarding

The profile feeds the education route ("Fetch User Profile and Knowledge").

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| GET | `/v1/users/me` | Current account. | none | `200` User | C |
| PATCH | `/v1/users/me` | Update name. | B: `full_name` | `200` User | S |
| DELETE | `/v1/users/me` | Delete the account and all its sessions, messages, quizzes, proposals, and knowledge data. | none | `204` | S |
| GET | `/v1/users/me/profile` | Onboarding answers and language. | none | `200` Profile | C |
| PUT | `/v1/users/me/profile` | Set or replace the profile. Drives answer depth and tone, so a tester can change it and compare answers. | B: `preferred_language`, `onboarding_answers` (object: for example `experience`, `risk_tolerance`, `goal`) | `200` Profile | C |
| GET | `/v1/onboarding/questions` | The questionnaire definition (questions, allowed answers) so a client or tester knows what `onboarding_answers` accepts. | Q: `language` | `200 { items: [ { key, question, options } ] }` | S |

## 7. IPOs and sources

Read-only for users. Only `published` IPOs are visible to non-admins. Creating and editing is in [Admin](#12-admin).

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| GET | `/v1/ipos` | List published IPOs. | Q: `country`, `q` (search company or symbol), `limit`, `cursor` | `200` Page of IPO | C |
| GET | `/v1/ipos/{ipo_id}` | One IPO with its documents' status and a few sample questions to try. | P: `ipo_id`* | `200` IPO | C |
| GET | `/v1/ipos/{ipo_id}/key-facts` | **Verified** key facts only (dates, price, minimum subscription, receiving agents...), each with its source page. | P: `ipo_id`*<br>Q: `fact_type` | `200 { items: [KeyFact] }` | C |
| GET | `/v1/ipos/{ipo_id}/summaries` | Verified section summaries (risks, business, financials, offer terms). | P: `ipo_id`* | `200 { items: [ { section_name, summary_text } ] }` | S |
| GET | `/v1/ipos/{ipo_id}/documents` | The IPO's indexed documents and versions (title, version, status). | P: `ipo_id`* | `200 { items: [Document] }` | S |
| GET | `/v1/chunks/{chunk_id}` | The exact passage behind a citation: text, section path, page. | P: `chunk_id`* | `200 { id, document_id, section_path, page_number, content }` | C |
| GET | `/v1/documents/{document_id}/pages/{page}` | Full extracted text of one page, to verify a citation in context. | P: `document_id`*, `page`* | `200 { document_id, page, text }` | S |

## 8. Chat and the agent

A chat session is bound to **one IPO**. The IPO is fixed at creation and never chosen by the model.

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| POST | `/v1/chat/sessions` | Create a session for an IPO. Fails if the IPO is not published or has no indexed document. | B: `ipo_id`* | `201` Session | C |
| GET | `/v1/chat/sessions` | The user's sessions, most recent first. | Q: `ipo_id`, `limit`, `cursor` | `200` Page of Session | S |
| GET | `/v1/chat/sessions/{session_id}` | One session (includes `turn_count`, `quiz_opt_in`). | P: `session_id`* | `200` Session | S |
| PATCH | `/v1/chat/sessions/{session_id}` | Toggle quiz opt-in. When on, the agent adds a quiz after answers regardless of turn count. `ipo_id` is immutable. | P: `session_id`*<br>B: `quiz_opt_in` (bool) | `200` Session | C |
| DELETE | `/v1/chat/sessions/{session_id}` | Delete the session with its messages, citations, quizzes, and proposals. | P: `session_id`* | `204` | S |
| POST | `/v1/chat/sessions/{session_id}/messages` | **Send a message to the agent.** Runs the full graph: intent routing, retrieval with the JEV loop (or education or calendar route), generation with DeepSeek, then post-processing (quiz, calendar card). Default response is plain JSON. | P: `session_id`*<br>B: `content`* (1 to 2000 chars), `stream` (bool, default `false`), `debug` (bool, default `false`; includes the trace in the response) | `200` Message, or an SSE stream when `stream=true` | C |
| POST | `/v1/ipos/{ipo_id}/ask` | **One-call convenience for testers.** Reuses the user's latest session for this IPO (or creates one), then behaves exactly like the message endpoint. | P: `ipo_id`*<br>B: `content`*, `new_session` (bool, default `false`), `stream`, `debug` | `200` Message (includes `session_id`) | C |
| GET | `/v1/chat/sessions/{session_id}/messages` | Conversation history, oldest first, with citations, quizzes, and calendar cards attached. | P: `session_id`*<br>Q: `limit`, `cursor` | `200` Page of Message | S |
| GET | `/v1/chat/messages/{message_id}` | One message with its attachments. | P: `message_id`* | `200` Message | S |
| GET | `/v1/chat/messages/{message_id}/trace` | **The agent's reasoning record** for an assistant message: route chosen, every retrieval try with rewritten query, chunk scores and JEV verdict, Zetaris queries, node timings, token usage and cost, quiz and calendar decisions. Owner or admin only. | P: `message_id`* | `200` Trace | C |

### Agent behavior behind the message endpoint

1. **Route.** The intent router classifies the message: `prospectus_search`, `financial_education`, `calendar`, or `out_of_scope`.
2. **Prospectus search.** Rewrite the query, retrieve chunks (through Zetaris), and score them with the JEV evaluator. If the score is below **0.70** and tries are below **3**, rewrite and retry. After 3 tries, abstain. At 0.70 or above, build the context.
3. **Education.** Fetch the user's profile and knowledge states, then build a context adapted to level and language.
4. **Calendar.** Read verified key-fact dates and build the context.
5. **Generate.** DeepSeek answers from the built context only, with page citations.
6. **Post-process.** Add a quiz when `turn_count % 4 == 0` or `quiz_opt_in` is on (MCQ for factual checks, open-ended for conceptual ones). Add a `calendar_card` when a key date was found that the user has not saved yet.
7. **Track.** Every LLM call is logged with tokens and cost (Meterless).

### SSE contract (only when `stream=true`)

Each event has a name and a JSON `data` payload.

| Event | Data | When |
|---|---|---|
| `route` | `{ "intent" }` | After routing |
| `retrieval` | `{ "try", "query", "score", "verdict": "retry" \| "verified" \| "abstain" }` | Once per JEV attempt |
| `message.start` | `{ "message_id", "session_id" }` | Answer begins |
| `token` | `{ "delta" }` | Incremental answer text |
| `citation` | `{ "index", "chunk_id", "page_number", "section_path", "quote_text" }` | A source used |
| `quiz` | Quiz object (without the answer) | A quiz was added |
| `calendar_card` | CalendarCard object | A key date can be saved |
| `message.end` | `{ "message_id", "outcome", "usage": {...} }` | Final event |
| `error` | `{ "code", "message" }` | Fatal error; the stream ends |

With `stream=false`, the same information arrives in one Message object. The answer text contains markers like `[1]` that point to a citation `index`.

## 9. Education: glossary, knowledge, quizzes

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| GET | `/v1/glossary` | Glossary terms, for tooltips and a "learn" screen. This is general education, not prospectus content. | Q: `q`, `category`, `language`, `limit`, `cursor` | `200` Page of `{ id, term, category, definition, simple_explanation }` | S |
| GET | `/v1/glossary/{term_id}` | One term. | P: `term_id`* | `200` GlossaryTerm | S |
| GET | `/v1/me/knowledge` | The user's mastery state per glossary term. The education route reads this. | Q: `mastery_level`, `limit`, `cursor` | `200` Page of KnowledgeState | C |
| PUT | `/v1/me/knowledge/{term_id}` | Set a mastery level manually (for self-assessment, and so a tester can start from a known state). | P: `term_id`*<br>B: `mastery_level`* | `200` KnowledgeState | C |
| POST | `/v1/chat/sessions/{session_id}/quizzes` | **Request a quiz on demand**, without waiting for the turn-count trigger. Generated from the IPO and a concept. | P: `session_id`*<br>B: `type` (`mcq`\|`open`, default `mcq`), `term_id` (optional concept), `topic` (optional free text) | `201` Quiz (no answer revealed) | C |
| GET | `/v1/quizzes/{quiz_id}` | One quiz and its status. | P: `quiz_id`* | `200` Quiz | S |
| POST | `/v1/quizzes/{quiz_id}/answer` | Submit an answer. MCQ is graded deterministically; open-ended answers are graded by the LLM against a rubric. Updates the user's mastery for the concept. | P: `quiz_id`*<br>B: `option_id` (for `mcq`) or `text` (for `open`, max 1000 chars) | `200 { correct, score, feedback, correct_option_id, explanation, mastery_before, mastery_after }` | C |
| GET | `/v1/me/quizzes` | Quiz history with results. | Q: `status`, `limit`, `cursor` | `200` Page of Quiz | S |

## 10. Calendar and reminders

The agent proposes events from **verified** key facts. The user confirms; confirming schedules a reminder. There is no external calendar integration in the MVP, but the `.ics` export works with any calendar app.

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| POST | `/v1/ipos/{ipo_id}/calendar/proposals` | Direct trigger (the "Direct Calendar Trigger" path), without chat: build proposals for the IPO's verified date facts. | P: `ipo_id`*<br>B: `fact_types` (default: all date facts), `timezone`* (IANA) | `201 { items: [CalendarProposal] }` | C |
| GET | `/v1/calendar/proposals` | The user's proposals. | Q: `status`, `session_id`, `ipo_id` | `200 { items: [CalendarProposal] }` | C |
| GET | `/v1/calendar/proposals/{proposal_id}` | One proposal. | P: `proposal_id`* | `200` CalendarProposal | S |
| POST | `/v1/calendar/proposals/{proposal_id}/confirm` | Accept the proposal and schedule its reminder. | P: `proposal_id`*<br>B: `timezone` (IANA), `remind_before_minutes` (default 1440) | `200 { proposal, reminder }` | C |
| POST | `/v1/calendar/proposals/{proposal_id}/reject` | Dismiss the proposal. | P: `proposal_id`* | `200` CalendarProposal | S |
| GET | `/v1/calendar/reminders` | Reminders with their state (`scheduled`, `due`, `sent`, `cancelled`) and trigger time. This is where a tester sees that reminders exist and fire. | Q: `status`, `ipo_id` | `200 { items: [Reminder] }` | C |
| GET | `/v1/calendar/events.ics` | Confirmed events as an iCalendar file, to import or subscribe in any calendar app. | Q: `ipo_id` | `200` `text/calendar` | S |

## 11. Usage

Meterless sits in front of the model calls and records tokens and cost.

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| GET | `/v1/usage/me` | The user's token and cost totals, with breakdown by day, route, and model. | Q: `from`, `to`, `group_by` (`day`\|`route`\|`model`) | `200 { totals: {...}, items: [...] }` | C |

Each assistant message also carries its own `usage` object (input tokens, output tokens, cost).

## 12. Admin

All admin routes require the `admin` role. In production, the **Demo and test tools** group must be disabled (`DEMO_MODE=false`).

### 12.1 IPOs and ingestion

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| POST | `/v1/admin/ipos` | Create an IPO (starts as `draft`). | B: `company_name`*, `symbol`, `issuer_country`* (ISO alpha-2), `exchange` | `201` IPO | C |
| PATCH | `/v1/admin/ipos/{ipo_id}` | Edit fields and/or change `status` (`draft`, `review`, `published`, `archived`). Publishing requires an `indexed` document and all required key facts `verified`. | P: `ipo_id`*<br>B: `company_name`, `symbol`, `issuer_country`, `status` | `200` IPO, or `409 PUBLISH_PRECONDITION_FAILED` listing what is missing | C |
| POST | `/v1/admin/ipos/{ipo_id}/documents` | Upload a prospectus or addendum and start ingestion (parse, chunk, embed). Duplicate file hash is rejected. | P: `ipo_id`*<br>B (multipart): `file`* (PDF), `title`, `version` | `202 { document_id, job_id }` | C |
| GET | `/v1/admin/ipos/{ipo_id}/documents` | Documents and versions with status, including non-indexed ones. | P: `ipo_id`* | `200 { items: [Document] }` | S |
| GET | `/v1/admin/documents/{document_id}` | One document: status, page count, chunk count, parser used. | P: `document_id`* | `200` Document | S |
| POST | `/v1/admin/documents/{document_id}/reingest` | Re-run ingestion (new chunking settings or embedding model). Old chunks are replaced atomically. | P: `document_id`*<br>B: `steps` (subset of `parse`,`chunk`,`embed`,`facts`,`summaries`) | `202 { job_id }` | S |
| GET | `/v1/admin/jobs/{job_id}` | Ingestion job progress. | P: `job_id`* | `200 { id, status, step, progress, error }` | C |
| GET | `/v1/admin/documents/{document_id}/chunks` | Inspect stored chunks (the manual quality check after parsing). | P: `document_id`*<br>Q: `page`, `q`, `limit`, `cursor` | `200` Page of Chunk (no vectors) | S |

### 12.2 Key facts and summaries

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| GET | `/v1/admin/ipos/{ipo_id}/key-facts` | All key facts in every review state, with source page. | P: `ipo_id`*<br>Q: `review_status` | `200 { items: [KeyFact] }` | C |
| POST | `/v1/admin/ipos/{ipo_id}/key-facts/extract` | Run LLM extraction of key facts from the document. Verified facts are never overwritten. | P: `ipo_id`*<br>B: `fact_types` (optional subset) | `202 { job_id }` | C |
| PATCH | `/v1/admin/key-facts/{fact_id}` | Review a fact: verify, reject, or correct its value (source page still required). | P: `fact_id`*<br>B: `review_status`* (`verified`\|`rejected`), `value`, `source_page` | `200` KeyFact | C |
| GET | `/v1/admin/ipos/{ipo_id}/section-summaries` | All generated summaries in every state. | P: `ipo_id`* | `200 { items: [...] }` | S |
| POST | `/v1/admin/ipos/{ipo_id}/section-summaries/generate` | Generate or regenerate summaries. | P: `ipo_id`*<br>B: `section_names` (optional) | `202 { job_id }` | S |
| PATCH | `/v1/admin/section-summaries/{summary_id}` | Review or edit a summary. | P: `summary_id`*<br>B: `review_status`*, `summary_text` | `200` | S |

### 12.3 Glossary and users

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| POST | `/v1/admin/glossary` | Add a term. | B: `term`*, `category`, `definition`*, `simple_explanation`*, `language` | `201` GlossaryTerm | S |
| PUT | `/v1/admin/glossary/{term_id}` | Replace a term. | P: `term_id`*<br>B: same as POST | `200` GlossaryTerm | S |
| DELETE | `/v1/admin/glossary/{term_id}` | Remove a term. | P: `term_id`* | `204` | S |
| GET | `/v1/admin/users` | List users. | Q: `q`, `role`, `limit`, `cursor` | `200` Page of User | S |
| PATCH | `/v1/admin/users/{user_id}` | Change role or deactivate. | P: `user_id`*<br>B: `role`, `is_active` | `200` User | S |
| GET | `/v1/admin/usage` | Usage and cost across all users. | Q: `from`, `to`, `group_by` (`user`\|`day`\|`route`\|`model`) | `200 { totals, items }` | S |

### 12.4 Demo and test tools

These exist so an examiner can verify the agent from the API alone.

| Method | Path | Description | Params | Returns | T |
|---|---|---|---|---|---|
| POST | `/v1/admin/demo/seed` | Idempotently load demo data: a published IPO with an indexed prospectus, verified key facts, summaries, glossary, and demo users (one user, one admin). | B: `reset_first` (bool, default `false`) | `200 { ipo_ids, users }` | C |
| POST | `/v1/admin/demo/reset` | Delete all demo and test data and return to a clean state. | none | `204` | S |
| GET | `/v1/admin/integrations/health` | Live check of every dependency: database, pgvector, DeepSeek, embeddings, **Zetaris** query path, **Meterless** proxy, and NVIDIA if enabled. Shows latency and last error. | none | `200 { items: [ { name, status, latency_ms, detail } ] }` | C |
| POST | `/v1/admin/retrieval/debug` | Run retrieval and the JEV evaluator only, and return every candidate with its scores. Tuning tool. | B: `ipo_id`*, `query`*, `top_k` (default 6) | `200 { items: [ { chunk_id, page_number, section_path, score, snippet } ], jev_score, verdict }` | S |
| POST | `/v1/admin/reminders/run-due` | Run the reminder scheduler once. The optional `now` override lets a tester **fast-forward time** to see reminders fire without waiting. | B: `now` (ISO timestamp, optional) | `200 { processed, sent: [Reminder] }` | C |
| POST | `/v1/admin/evals/run` | Run the built-in evaluation set (factual, abstention, education, calendar cases) against the live agent. | B: `suite` (optional), `ipo_id` | `202 { run_id }` | X |
| GET | `/v1/admin/evals/{run_id}` | Eval report: accuracy, citation correctness, abstention correctness, average JEV tries, cost. | P: `run_id`* | `200` Report | X |

## 13. Objects and enums

**Message:** `{ id, session_id, sender, content, intent, outcome, citations: [Citation], quiz: Quiz | null, calendar_card: CalendarCard | null, latency_seconds, usage, created_at, trace? }`. `trace` appears only when `debug=true`.

**Citation:** `{ index, chunk_id, document_id, page_number, section_path, quote_text }`

**Quiz:** `{ id, session_id, type, concept: { term_id, term }, question, options: [ { id, text } ] | null, status, created_at }`. The correct answer is never included until it has been answered.

**CalendarCard:** `{ proposal_id, event_title, event_date, timezone, source_page, status }`

**CalendarProposal:** `{ id, ipo_id, session_id | null, key_fact_id, event_title, event_date, timezone, status, source_page, created_at }`

**Reminder:** `{ id, proposal_id, event_title, event_date, due_at, status, sent_at }`

**Trace:**
```json
{
  "intent": "prospectus_search",
  "tries": [
    { "try": 1, "rewritten_query": "...", "retrieved": [ { "chunk_id": "...", "page_number": 42, "score": 0.51 } ], "jev_score": 0.51, "verdict": "retry" },
    { "try": 2, "rewritten_query": "...", "retrieved": [ ... ], "jev_score": 0.83, "verdict": "verified" }
  ],
  "zetaris_queries": [ { "target": "pgvector", "name": "chunk_search", "rows": 8, "ms": 41 } ],
  "nodes": [ { "name": "router", "ms": 220 }, { "name": "generate", "ms": 1840 } ],
  "quiz_decision": { "turn_count": 4, "triggered": true, "reason": "turn_count % 4 == 0" },
  "calendar_decision": { "date_found": true, "already_saved": false },
  "model": "deepseek-...", "prompt_version": "v3",
  "usage": { "input_tokens": 2310, "output_tokens": 312, "cost_usd": 0.0009 }
}
```

| Enum | Values |
|---|---|
| `sender` | `user`, `assistant` |
| `intent` | `prospectus_search`, `financial_education`, `calendar`, `out_of_scope` |
| `outcome` | `answered`, `abstained`, `refused`, `error` |
| `role` | `user`, `admin` |
| `ipo.status` | `draft`, `review`, `published`, `archived` |
| `document.status` | `uploaded`, `parsing`, `indexed`, `failed`, `superseded` |
| `key_fact.review_status` | `pending`, `verified`, `rejected` |
| `mastery_level` | `unseen`, `learning`, `familiar`, `mastered` (to be confirmed) |
| `quiz.type` | `mcq`, `open` |
| `quiz.status` | `pending`, `answered` |
| `calendar_proposal.status` | `proposed`, `confirmed`, `rejected` |
| `reminder.status` | `scheduled`, `due`, `sent`, `cancelled` |
| `job.status` | `queued`, `running`, `succeeded`, `failed` |

## 14. Errors

One shape for all errors:

```json
{ "error": { "code": "IPO_NOT_PUBLISHED", "message": "Human-readable text", "request_id": "...", "details": {} } }
```

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Malformed body or params; `details` lists fields |
| 401 | `UNAUTHENTICATED` | Missing, invalid, or expired token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 403 | `FORBIDDEN` | Not the owner, or admin role required |
| 404 | `NOT_FOUND` | Unknown id (also used for resources the caller must not know exist) |
| 409 | `EMAIL_TAKEN` | Registration with an existing email |
| 409 | `IPO_NOT_PUBLISHED` | Session requested on an unpublished IPO |
| 409 | `DUPLICATE_DOCUMENT` | Same file hash already ingested for this IPO |
| 409 | `PUBLISH_PRECONDITION_FAILED` | Publishing blocked; `details` lists what is missing |
| 409 | `QUIZ_ALREADY_ANSWERED` | Second answer to the same quiz |
| 409 | `INVALID_STATE_TRANSITION` | For example confirming a rejected proposal |
| 422 | `NO_VERIFIED_DATES` | Calendar requested but the IPO has no verified date facts |
| 429 | `RATE_LIMITED` | Too many requests; `Retry-After` set |
| 502 | `UPSTREAM_LLM_ERROR` | DeepSeek or the embedding provider failed after retries |
| 503 | `NOT_READY` | Database or dependency unavailable |

An abstention is **not** an error: it is a `200` with `outcome: "abstained"`. Inside an SSE stream, failures arrive as an `error` event because the HTTP status was already `200`.

## 15. Required ERD and config changes

The new ERD does not yet cover everything this API needs.

**New tables**
1. `refresh_tokens`: `id, user_id, token_hash, expires_at, revoked_at`.
2. `quizzes`: `id, chat_session_id, message_id, user_id, glossary_term_id, type, question, options (jsonb), correct_answer, rubric, status, created_at`.
3. `quiz_attempts`: `id, quiz_id, user_id, answer, score, feedback, mastery_before, mastery_after, answered_at`.
4. `calendar_reminders`: `id, proposal_id, user_id, due_at, status, sent_at`.
5. `usage_events` (Meterless): `id, user_id, message_id, route, model, input_tokens, output_tokens, cost_usd, created_at`.
6. `ingestion_jobs`: `id, document_id, kind, status, step, progress, error, started_at, finished_at`.

**Changed tables**
- `users`: add `role` and `is_active`.
- `chat_sessions`: add `quiz_opt_in` (boolean).
- `messages`: add `outcome` and `trace` (jsonb). Keep `intent` and `latency_seconds`.
- `calendar_proposals`: make `chat_session_id` nullable (direct proposals have none), add `user_id`, `ipo_id`, `timezone`, `remind_before_minutes`, `source_page`.
- `documents`: add `storage_uri`, `page_count`, `doc_type`.
- `chunks`: keep the full-text `fts` column, `chunk_type`, and `chunk_index` from the baseline schema.
- `glossary_terms`: add `language` (for French).
- `key_facts`: add `reviewed_by`, `reviewed_at`. Store dates in `value` as ISO strings with the timezone.
- `ipos`: add `exchange` and `published_at`.

**New configuration**
`JWT_SECRET`, `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS`, `DEMO_MODE`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `JEV_MIN_SCORE` (0.70), `JEV_MAX_TRIES` (3), `QUIZ_EVERY_N_TURNS` (4), `MESSAGE_RATE_LIMIT_PER_MINUTE`, plus the Zetaris and Meterless connection settings.

**Decisions still open**
- How reminders are delivered in the MVP (in-app state only, or also email). The API above works either way.
- The final list of `mastery_level` values.
- Whether the `out_of_scope` route and advice-seeking requests are handled by the router, since the new graph has no separate guardrail node.
