# Mostro AI

**A trustworthy, prospectus-grounded assistant that helps people in Africa understand IPOs, avoid scams, and learn about investing.**

This repository is a single FastAPI application ("monolith") that contains user management and the whole AI system: the agent, retrieval, education, calendar reminders, ingestion, and admin tooling. It is built for the **Open Agent Hackathon 2026** (GenAI.Works).

This README is the full technical documentation and is written for **coding agents and developers** working in this repo. Examiners should read [`OPEN_AGENT_HACKATHON.md`](OPEN_AGENT_HACKATHON.md) instead. Related files:

| File | Purpose |
|---|---|
| `AGENTS.md` | Short, strict rules for coding agents (must be consistent with this README) |
| `docs/api-map.md` | The complete endpoint list (method, path, params, returns). **The API contract.** |
| `OPEN_AGENT_HACKATHON.md` | Examiner guide: install, run, and test the agent |

> **Status:** active development (pre-MVP). See [Roadmap](#14-roadmap) and the "Current status" box there.

---

## Table of contents

1. [Why Mostro exists](#1-why-mostro-exists)
2. [Objectives and non-goals](#2-objectives-and-non-goals)
3. [Target population](#3-target-population)
4. [Product overview](#4-product-overview)
5. [Core design principles](#5-core-design-principles)
6. [Architecture](#6-architecture)
7. [Data model](#7-data-model)
8. [Tech stack](#8-tech-stack)
9. [Repository structure](#9-repository-structure)
10. [Getting started](#10-getting-started)
11. [Useful commands](#11-useful-commands)
12. [Configuration](#12-configuration)
13. [Testing and evaluation](#13-testing-and-evaluation)
14. [Roadmap](#14-roadmap)
15. [Conventions and contributing](#15-conventions-and-contributing)
16. [Security, privacy and compliance](#16-security-privacy-and-compliance)
17. [Glossary](#17-glossary)

---

## 1. Why Mostro exists

Large IPOs, such as the recent Dangote refinery IPO, bring many first-time investors into capital markets. With genuine interest come three problems:

- **Scams.** Fake offers, fake "agents", WhatsApp investment groups, and requests to pay into personal accounts.
- **Hard-to-find, hard-to-read information.** The official document is a prospectus of hundreds of pages in legal and financial language.
- **Skepticism.** Many people distrust anything related to investing, often for good reason.

Mostro's answer is one idea: **let people ask questions directly to the official prospectus, and show exactly where each answer comes from.** A user can verify any statement by opening the cited page. Verifiability is the product.

## 2. Objectives and non-goals

### Objectives

1. **Accurate, cited answers about one IPO**: dates, price, minimum subscription, how to apply, receiving agents and banks, use of proceeds, risks. Every answer carries citations (page, section, short quote).
2. **Explainability.** For every answer, the system can show *how it decided*: the route chosen, each retrieval attempt and its score, the sources used, and the cost. This is exposed through a trace endpoint and through log files.
3. **Personalized financial education.** Explanations adapt to the user's profile and tracked knowledge. An interactive quiz loop (multiple-choice and open-ended) reinforces learning and updates mastery.
4. **Calendar reminders.** Verified IPO dates become proposals that the user confirms, then scheduled reminders, with an `.ics` export.
5. **Honesty over fluency.** If the prospectus does not support an answer after the retrieval loop, the agent abstains.
6. **Testable from the API alone.** Every capability, plus seed data, traces, integration health, and time-travel for reminders, is reachable through HTTP routes.

### Non-goals

- **No personalized investment advice**, predictions, or guaranteed returns, ever. The agent informs and educates.
- **No live market data** in v1 (subscription levels, allotment results, listing prices). The prospectus is a snapshot, and the agent says so.
- **No trading, no real portfolio.** The "user data" store holds profile and knowledge state only.
- **No external calendar write integration** in the MVP. Reminders live in the app; `.ics` export covers other calendars.
- **Not a general chatbot.** Off-topic requests are politely refused. A chat session is bound to **one IPO**.

## 3. Target population

Primary: **first-time and early-stage retail investors across Africa**, including people skeptical of investing or targeted by scams.

| Reality | Design consequence |
|---|---|
| Many users are new to finance | Plain language, profile-adapted depth, glossary, quizzes |
| Anglophone and Francophone markets | English and French from day one; more languages later |
| Mobile-first, variable bandwidth | Short answers by default, optional streaming |
| High scam exposure | Scam-aware wording, comparison with official details |
| Low institutional trust | Every claim cites a page the user can open |
| Different regulator per country | Information and education only; never advice |

## 4. Product overview

1. A user **registers** and completes a short **onboarding** (experience, risk tolerance, goal, language).
2. The user picks **one published IPO** and opens a chat session bound to it.
3. For each message, the agent routes to one of three pipelines:
   - **Prospectus search** (agentic RAG): rewrite, retrieve, evaluate, retry up to 3 times, then answer with citations or abstain.
   - **Financial education**: explain concepts using the user's profile and mastery state.
   - **Calendar**: read verified key dates and propose calendar events.
4. After the answer, a **post-processor** may attach a **quiz** (every 4th turn, or when the user opted in) and a **calendar card** (when a key date was found and not yet saved).
5. The user can answer quizzes (mastery updates), confirm calendar proposals (reminders are scheduled), and view their **token and cost usage**.
6. **Admins** upload prospectuses, review extracted key facts, manage the glossary, and use demo and debug tools.

The complete route list is in `docs/api-map.md`.

## 5. Core design principles

1. **The prospectus is the source of truth.** The LLM explains; it does not invent. Facts come from retrieved passages or human-verified key facts.
2. **The IPO is never chosen by the model.** `ipo_id` comes from the session and is applied as a hard filter in the database query.
3. **Abstain rather than guess.** When the retrieval evaluator never reaches the threshold, the agent says it could not find support in the prospectus.
4. **Explain the decision, not just the answer.** Every step writes a structured record to the trace and to the log files.
5. **Verified data only for facts that matter.** Dates, prices, and agents feed answers and calendar proposals only when `review_status = verified`.
6. **Propose, then confirm.** The agent proposes calendar events; the user confirms.
7. **Testable by API.** Anything an examiner needs to see must be reachable by an HTTP call.
8. **Sponsor technology is real, visible, and replaceable.** Zetaris and Meterless sit behind adapters, and their use is visible in traces, logs, and health checks.
9. **Measure quality.** Evals run after every prompt, model, retrieval, or chunking change.

## 6. Architecture

### 6.1 System overview

```
Client (curl / Swagger UI / future frontend)
        │  HTTPS, JWT bearer
        ▼
┌──────────────────────────── FastAPI application ────────────────────────────┐
│ api/  routes: auth, users, ipos, chat, education, calendar, usage, admin    │
│ services/  business logic       core/  logging, errors, security            │
│ agent/  LangGraph graph  ─►  retrieval/  ─►  integrations/zetaris           │
│                          ─►  llm/  (DeepSeek chat, Voyage embeddings)       │
│                          ─►  integrations/meterless (usage + cost tracking) │
│ scheduler  (reminders)          ingestion/  (separate entrypoint)           │
└───────────────┬─────────────────────────────────────────────┬───────────────┘
                ▼                                             ▼
   PostgreSQL + pgvector (users, IPOs, chunks,         logs/  (app.log, agent.log)
   key facts, sessions, messages, quizzes, usage...)
```

There are no other services. Zetaris is used as the query layer over the data stores; DeepSeek and Voyage AI are external APIs.

### 6.2 Agent graph (LangGraph)

The agent is a **fixed graph with conditional edges**, not a free tool-calling loop. This makes it testable, debuggable, and explainable.

```mermaid
flowchart TD
    U([User message]) --> GW[FastAPI: auth, rate limit]
    GW --> MT[Meterless usage tracking]
    MT --> R{Intent router}

    R -->|prospectus_search| QR[Query rewriter]
    R -->|financial_education| EF[Fetch profile and knowledge via Zetaris]
    R -->|calendar| CE[Extract key dates via Zetaris]
    R -->|out_of_scope| RF[Refusal]

    QR --> RT[Retrieve chunks via Zetaris]
    RT --> J{JEV retrieval evaluator}
    J -->|score below 0.70 and tries below 3| QR
    J -->|tries reached 3| AB[Abstain]
    J -->|score 0.70 or above| CB[Context builder]

    EF --> CB
    CE --> CB
    CB --> G[DeepSeek generation]
    G --> PP[Post-processor]

    PP --> QC{Turn count divisible by 4 or user opted in?}
    QC -->|no| F[Formatter]
    QC -->|yes| QT{Quiz type}
    QT -->|factual check| MCQ[Build MCQ]
    QT -->|conceptual| OPEN[Build open-ended question]
    MCQ --> F
    OPEN --> F

    PP --> CC{Key date found and not yet saved?}
    CC -->|yes| CP[Build calendar proposal and card]
    CC -->|no| F
    CP --> F

    F --> OUT([Response: JSON or SSE])
    AB --> OUT
    RF --> OUT
```

**Node contracts.** Every node takes the graph state and returns a partial state update. Nodes must be individually unit-testable with fakes.

| Node | Responsibility | Writes to state |
|---|---|---|
| `router` | Classify intent: `prospectus_search`, `financial_education`, `calendar`, `out_of_scope` (includes advice-seeking). Cheap model, structured output with a short reason. | `intent`, `route_reason` |
| `query_rewriter` | Turn the message plus history into a standalone search query. On retries, rewrite differently using the evaluator's feedback. | `rewritten_query`, `tries` |
| `retriever` | Hybrid search (vector + full-text, fused with RRF), filtered by `ipo_id`, executed through the Zetaris adapter. | `retrieved` (chunk id, page, section, score) |
| `jev_evaluator` | Score whether the retrieved evidence is sufficient for the task, 0 to 1, plus a short reason and a hint for rewriting. Default implementation: LLM-as-judge on the fast model with structured output. Threshold `JEV_MIN_SCORE` (0.70), max tries `JEV_MAX_TRIES` (3). | `jev_score`, `verdict`, `feedback` |
| `refusal` / `abstain` | Produce the honest "I could not find this in the prospectus" (outcome `abstained`) or the out-of-scope refusal (outcome `refused`). No generation from model knowledge. | `answer`, `outcome` |
| `edu_fetch` | Load the user's profile and knowledge states (through Zetaris). Also retrieve relevant chunks when the question concerns this IPO. | `profile`, `knowledge` |
| `calendar_extract` | Load **verified** date key facts for the IPO. | `key_dates` |
| `context_builder` | Assemble the prompt context: verified chunks or facts, user level and language, citation markers. | `context` |
| `generate` | DeepSeek call. Answers only from the context, adds `[n]` citation markers, adapts tone and language. | `answer`, `citations`, `usage` |
| `post_processor` | Decide on quiz and calendar card (rules below). Skipped when the outcome is `abstained` or `refused`. | `quiz`, `calendar_card` |
| `formatter` | Build the final response object (and SSE events when streaming), persist message, citations, quiz, proposal, trace, and usage. | `response` |

**State fields (minimum):** `user_id`, `session_id`, `ipo_id`, `message`, `history`, `turn_count`, `quiz_opt_in`, `intent`, `profile`, `knowledge`, `rewritten_query`, `tries`, `retrieved`, `jev_score`, `verdict`, `key_dates`, `context`, `answer`, `citations`, `quiz`, `calendar_card`, `outcome`, `usage`, `trace`.

### 6.3 Retrieval and the evaluator loop

1. Rewrite the query (first try uses history; later tries use the evaluator's hint).
2. Embed the query (Voyage, `input_type=query`) and run hybrid search filtered by `ipo_id` and indexed documents only. Fuse vector and full-text ranks with Reciprocal Rank Fusion, keep the top candidates, expand neighboring chunks.
3. The evaluator scores the evidence against the original task.
4. `score >= 0.70` → build context. `score < 0.70` and `tries < 3` → go back to step 1. `tries == 3` → abstain.
5. Every try is recorded in the trace (rewritten query, chunk ids, pages, scores, verdict).

> **Cost and rate-limit note:** each try costs one query embedding and one evaluator call. Voyage's free trial without a payment method is limited to 3 requests and 10K tokens per minute, so a 3-try abstention can take about a minute on that tier. Add a payment method to the Voyage account, and cache query embeddings for identical rewritten queries.

### 6.4 Education pipeline

- Inputs: `user_profiles.onboarding_answers` (experience, risk tolerance, goal), `preferred_language`, and `user_knowledge_states` (per glossary term mastery).
- The context builder tells the model the user's level and which concepts they have already mastered (so it does not over-explain) or not yet seen (so it defines them).
- General concepts come from `glossary_terms` (`definition`, `simple_explanation`), labeled as **general education**, not as prospectus content.
- **Quiz engine:**
  - Trigger: `turn_count % QUIZ_EVERY_N_TURNS == 0` or `chat_sessions.quiz_opt_in`, or an explicit request (`POST /v1/chat/sessions/{id}/quizzes`).
  - Type: factual knowledge (numbers, dates, procedures) → **MCQ**; conceptual understanding → **open-ended**. Make the rule configurable.
  - Grading: MCQ is deterministic. Open-ended is graded by the LLM against a rubric stored with the quiz, returning score, feedback, and an explanation.
  - Mastery update (proposed default): `unseen → learning` on first exposure; a correct answer promotes one level; an incorrect answer demotes at most one level; always update `last_reviewed_at`.
  - The correct answer is never returned before the quiz is answered.

### 6.5 Calendar and reminders

- Proposals are built **only from verified date key facts** (`offer_open_date`, `offer_close_date`, `allotment_date`, `listing_date`, and similar).
- A proposal is created by the agent (post-processor or calendar route) or directly (`POST /v1/ipos/{id}/calendar/proposals`).
- Flow: `proposed` → user `confirm` (with timezone and `remind_before_minutes`) → a `calendar_reminders` row is scheduled → the scheduler marks it `due` then `sent` (in-app state in the MVP).
- Timestamps always carry an explicit IANA timezone (for example `Africa/Douala`). Never use naive datetimes.
- `POST /v1/admin/reminders/run-due` runs one scheduler tick and accepts a `now` override so a tester can fast-forward time.
- `GET /v1/calendar/events.ics` exports confirmed events.

### 6.6 Ingestion pipeline

Runs as a separate entrypoint (`python -m ai.ingestion ...`) and through admin routes (which enqueue a job).

```
Upload PDF → parse (layout-aware) → section-aware chunking → embed (Voyage) → store
                      └→ key-facts extraction (LLM) → human review → publish
                      └→ section summaries (LLM) → review
```

- Chunk along headings, about 400 to 800 tokens, prepend a context header (`Issuer > Section > Subsection`) before embedding, keep tables as their own chunks, keep page numbers on everything, treat addenda as new document versions.
- Embedding calls must be **throttled** (requests and tokens per minute) and batched; see `ai/llm/rate_limit.py`.
- Key facts carry their source page and need `review_status = verified` before use. Publishing an IPO requires an indexed document and the required key facts verified.

### 6.7 Sponsor integrations

Both integrations sit behind small adapters in `ai/integrations/` so they can be disabled in tests and so their use is observable.

| Integration | Role in the system | Adapter | Observability |
|---|---|---|---|
| **Zetaris** | Query layer over the data stores. Retrieval queries and user profile/knowledge queries go through it. | `ai/integrations/zetaris/` | `zetaris.query` log events, `trace.zetaris_queries`, `GET /v1/admin/integrations/health` |
| **Meterless** | Usage tracking around every LLM call: tokens and cost per request. | `ai/integrations/meterless/` | `meterless.usage` log events, `usage_events` table, `message.usage`, `GET /v1/usage/me` |

Rules for the adapters:
- Define a narrow interface (for example `run_chunk_search(...)`, `get_user_context(...)`, `record_usage(...)`).
- Provide a **direct-Postgres fallback** (`ZETARIS_ENABLED=false`) for local development and tests, and mark `via: "zetaris" | "direct"` in the trace. For the hackathon evaluation, Zetaris must be enabled.
- Queries are **predefined and parameterized**, read-only, with timeouts and row limits. Never let the model write free-form SQL.
- Confirm the actual connection method (MCP, REST, or JDBC) in the Zetaris documentation and record it here when decided: <!-- TODO: connection method -->.

### 6.8 Logging and tracing

The agent must write logs to **both the console and the `logs/` folder**, so a developer or examiner can follow the agent's reasoning step by step.

**Handlers**

| Sink | Format | Content |
|---|---|---|
| Console | Pretty (`LOG_FORMAT=console`) or JSON | All events at `LOG_LEVEL` |
| `logs/app.log` | JSON lines, rotating | Everything: HTTP requests, auth events, errors, scheduler, ingestion |
| `logs/agent.log` | JSON lines, rotating | Only agent-related events (`agent.*`, `retrieval.*`, `zetaris.*`, `meterless.*`, `llm.*`) |

`logs/` is git-ignored (keep a `.gitkeep`), created at startup if missing, and mounted as a volume in Docker.

**Mandatory fields** on every event: `timestamp` (UTC ISO 8601), `level`, `event`, `logger`. Bind these when known: `request_id`, `user_id`, `session_id`, `ipo_id`, `message_id`, `node`, `try`, `duration_ms`.

**Agent event catalog** (use these names; add new ones in the same style)

| Event | Fields (besides mandatory) |
|---|---|
| `agent.run.start` / `agent.run.end` | `turn_count`, `intent`, `outcome`, `total_ms` |
| `agent.node.start` / `agent.node.end` | `node`, `duration_ms`, `decision` (short summary) |
| `agent.route.decided` | `intent`, `reason` |
| `agent.rewrite` | `try`, `original`, `rewritten` |
| `retrieval.attempt` | `try`, `top` (list of `{chunk_id, page, score}`), `via` |
| `agent.jev.verdict` | `try`, `score`, `verdict`, `reason` |
| `agent.abstain` | `tries`, `best_score` |
| `agent.context.built` | `sources`, `context_tokens`, `profile_level` |
| `llm.request.completed` / `llm.request.failed` | `provider`, `model`, `operation`, `input_tokens`, `output_tokens`, `duration_ms` |
| `agent.postprocess.quiz` | `triggered`, `reason`, `quiz_type` |
| `agent.postprocess.calendar` | `date_found`, `already_saved`, `proposal_id` |
| `zetaris.query` | `name`, `target`, `rows`, `duration_ms` |
| `meterless.usage` | `route`, `model`, `input_tokens`, `output_tokens`, `cost_usd` |

**Rules**
- Log **structured decisions with a short reason**, not raw model chain-of-thought.
- Never log passwords, tokens, API keys, or emails. A redaction processor must drop these keys.
- User message text is logged (truncated to 200 characters) only when `LOG_USER_CONTENT=true` (default `true` when `DEMO_MODE=true`, otherwise `false`). Full prompts are logged only at `DEBUG` with `LOG_PROMPTS=true`.
- The same information is stored in `messages.trace` and served by `GET /v1/chat/messages/{id}/trace`. The log files and the trace must tell the same story.

### 6.9 Model roles

| Role | Model (configurable) | Used for |
|---|---|---|
| Fast LLM | DeepSeek flash model | Router, query rewriting, evaluator |
| Main LLM | DeepSeek pro model | Generation, quiz grading, key-fact extraction, summaries |
| Embeddings | Voyage AI (`voyage-multimodal-3.5`, 1024 dimensions) | Chunks, queries, glossary |

Check the provider docs for current model names before changing them (DeepSeek renamed its models in 2026). If the embedding model or dimension changes, **every vector must be re-embedded** and the `VECTOR(n)` columns migrated. Voyage supports 2048 dimensions, but pgvector cannot HNSW-index plain `vector` columns above 2000 dimensions, so stay at 1024.

## 7. Data model

The authoritative schema is the Alembic migrations. `ai_service_schema.sql` is the older baseline and **must be updated** to match this section. Keep from the baseline: the `fts` generated column and GIN index, `chunk_type`, `chunk_index`, the HNSW index, and the accent-insensitive text search configuration.

```mermaid
erDiagram
    users ||--o| user_profiles : has
    users ||--o{ user_knowledge_states : tracks
    users ||--o{ chat_sessions : initiates
    users ||--o{ refresh_tokens : owns
    users ||--o{ usage_events : incurs
    glossary_terms ||--o{ user_knowledge_states : mapped_to
    glossary_terms ||--o{ quizzes : about
    ipos ||--o{ documents : contains
    ipos ||--o{ chunks : denormalized
    ipos ||--o{ key_facts : has
    ipos ||--o{ section_summaries : has
    ipos ||--o{ chat_sessions : bound_to
    documents ||--o{ chunks : split_into
    documents ||--o{ ingestion_jobs : processed_by
    chat_sessions ||--o{ messages : contains
    chat_sessions ||--o{ quizzes : asks
    chat_sessions ||--o{ calendar_proposals : generates
    messages ||--o{ message_citations : cites
    messages ||--o{ usage_events : measured_by
    chunks ||--o{ message_citations : referenced_in
    key_facts ||--o{ calendar_proposals : source_date
    calendar_proposals ||--o| calendar_reminders : schedules
    quizzes ||--o{ quiz_attempts : answered_by

    users { uuid id PK
            string email UK
            string password_hash
            string full_name
            string role
            bool is_active
            timestamp created_at }
    user_profiles { uuid id PK
            uuid user_id FK
            jsonb onboarding_answers
            string preferred_language
            timestamp updated_at }
    refresh_tokens { uuid id PK
            uuid user_id FK
            string token_hash
            timestamp expires_at
            timestamp revoked_at }
    glossary_terms { uuid id PK
            string term UK
            string category
            string language
            text definition
            text simple_explanation }
    user_knowledge_states { uuid id PK
            uuid user_id FK
            uuid glossary_term_id FK
            string mastery_level
            timestamp last_reviewed_at }
    ipos { uuid id PK
            string company_name
            string symbol
            string issuer_country
            string exchange
            string status
            timestamp published_at
            timestamp created_at }
    documents { uuid id PK
            uuid ipo_id FK
            string title
            string doc_type
            string file_hash UK
            string version
            string storage_uri
            int page_count
            string status }
    chunks { uuid id PK
            uuid document_id FK
            uuid ipo_id FK
            int chunk_index
            string chunk_type
            text content
            vector embedding
            tsvector fts
            int page_number
            string section_path }
    key_facts { uuid id PK
            uuid ipo_id FK
            string fact_type
            string value
            int source_page
            string review_status
            string reviewed_by
            timestamp reviewed_at }
    section_summaries { uuid id PK
            uuid ipo_id FK
            string section_name
            text summary_text
            string review_status }
    chat_sessions { uuid id PK
            uuid user_id FK
            uuid ipo_id FK
            int turn_count
            bool quiz_opt_in
            timestamp created_at }
    messages { uuid id PK
            uuid chat_session_id FK
            string sender
            text content
            string intent
            string outcome
            float latency_seconds
            jsonb trace
            timestamp created_at }
    message_citations { uuid id PK
            uuid message_id FK
            uuid chunk_id FK
            string quote_text
            int page_number }
    quizzes { uuid id PK
            uuid chat_session_id FK
            uuid message_id FK
            uuid user_id FK
            uuid glossary_term_id FK
            string type
            text question
            jsonb options
            string correct_answer
            text rubric
            string status }
    quiz_attempts { uuid id PK
            uuid quiz_id FK
            uuid user_id FK
            text answer
            float score
            text feedback
            string mastery_before
            string mastery_after
            timestamp answered_at }
    calendar_proposals { uuid id PK
            uuid user_id FK
            uuid ipo_id FK
            uuid chat_session_id FK
            uuid key_fact_id FK
            string event_title
            timestamp event_date
            string timezone
            string status
            int source_page }
    calendar_reminders { uuid id PK
            uuid proposal_id FK
            uuid user_id FK
            timestamp due_at
            string status
            timestamp sent_at }
    usage_events { uuid id PK
            uuid user_id FK
            uuid message_id FK
            string route
            string model
            int input_tokens
            int output_tokens
            float cost_usd
            timestamp created_at }
    ingestion_jobs { uuid id PK
            uuid document_id FK
            string kind
            string status
            string step
            float progress
            text error
            timestamp finished_at }
```

Notes:
- `chunks.ipo_id` is denormalized on purpose: retrieval filters on it directly. Only chunks of `indexed` documents are searchable.
- `calendar_proposals.chat_session_id` is nullable (direct proposals have no chat).
- `messages.trace` holds the agent trace; `usage_events` holds per-call tokens and cost.
- Dates in `key_facts.value` are ISO strings with timezone.
- `mastery_level` values: `unseen`, `learning`, `familiar`, `mastered` (to be confirmed).

## 8. Tech stack

| Concern | Choice |
|---|---|
| Language and tooling | Python 3.12, [uv](https://docs.astral.sh/uv/), ruff, mypy, pytest |
| API | FastAPI, Uvicorn, Pydantic v2, `pydantic-settings`, SSE (`sse-starlette`), `python-multipart` |
| Auth | JWT (`pyjwt`), password hashing (`pwdlib[argon2]`), OAuth2 password form for Swagger |
| Agent | LangGraph, `langchain-core`, `langchain-deepseek` |
| LLM | DeepSeek |
| Embeddings | Voyage AI over HTTP (`httpx`), adapter in `ai/llm/embeddings.py` |
| Database | PostgreSQL 17, pgvector (HNSW), full-text search |
| DB access | SQLAlchemy 2 (async), psycopg 3, Alembic |
| Scheduler | APScheduler (reminders) |
| Calendar export | `icalendar` |
| Ingestion | Docling, PyMuPDF (optional `ingest` dependency group), `tiktoken` |
| Resilience and logging | `tenacity`, `structlog` |
| Data layer sponsor | Zetaris |
| Usage tracking sponsor | Meterless |
| Tests | pytest, pytest-asyncio, httpx, respx |
| Packaging | Docker (multi-stage), Docker Compose |
| Dev environment | Cursor (with `AGENTS.md`) |

## 9. Repository structure

The Python package is `ai`. Adjust paths if it lives under `src/`.

```
Mostro-AI-OAH/
├── README.md                    # this file (for coding agents and developers)
├── OPEN_AGENT_HACKATHON.md      # examiner guide
├── AGENTS.md                    # rules for coding agents
├── pyproject.toml, uv.lock
├── env.example                  # copy to .env
├── Dockerfile, docker-compose.yml, .dockerignore, .gitignore
├── alembic.ini
├── migrations/                  # Alembic (baseline = section 7)
├── logs/                        # runtime logs (git-ignored, keep .gitkeep)
├── data/demo/                   # demo IPO: chunks with precomputed embeddings, key facts,
│                                # glossary, questionnaire (used by the demo seed)
├── docs/
│   └── api-map.md               # full endpoint list (the API contract)
├── scripts/                     # smoke_check.py, seed_demo.py, run_eval.py
│
├── ai/
│   ├── main.py                  # app factory, lifespan (DB pool, graph, scheduler, demo seed)
│   ├── config.py                # pydantic-settings; the only place that reads env
│   │
│   ├── core/
│   │   ├── logging.py           # structlog setup: console + logs/app.log + logs/agent.log
│   │   ├── errors.py            # typed errors and HTTP mapping
│   │   ├── security.py          # JWT, password hashing
│   │   └── middleware.py        # request id, access log, rate limit
│   │
│   ├── api/                     # HTTP layer only
│   │   ├── deps.py              # current user, admin guard, DB session
│   │   ├── routes/              # system, auth, users, ipos, chat, education,
│   │   │                        # calendar, usage, admin
│   │   └── schemas/             # request/response models
│   │
│   ├── services/                # use cases: auth, users, chat, quiz, calendar,
│   │                            # reminders, usage, demo_seed
│   │
│   ├── agent/                   # LangGraph
│   │   ├── state.py, graph.py
│   │   ├── nodes/               # router, query_rewriter, retriever, jev_evaluator,
│   │   │                        # edu_fetch, calendar_extract, context_builder,
│   │   │                        # generate, post_processor, quiz_builder,
│   │   │                        # calendar_proposal, refusal, formatter
│   │   └── prompts/             # versioned prompt templates
│   │
│   ├── retrieval/               # hybrid SQL, RRF, neighbor expansion
│   ├── integrations/
│   │   ├── zetaris/             # client, parameterized queries, health check
│   │   └── meterless/           # usage tracking wrapper, health check
│   ├── llm/                     # chat.py (DeepSeek), embeddings.py (Voyage),
│   │                            # retry.py, rate_limit.py, reranker.py (optional)
│   ├── db/                      # session, SQLAlchemy models, repositories
│   ├── ingestion/               # parse, chunk, embed, extract_facts, summarize, pipeline
│   └── domain/                  # enums and shared types
│
├── tests/                       # unit/, integration/, e2e/
└── evals/                       # datasets/ (golden Q&A, trap sets), metrics/
```

### Layering rules

- **Direction:** `api → services → agent → retrieval / integrations / llm → db`. Nothing imports upward.
- **Provider code lives in `ai/llm/` and `ai/integrations/` only.** No `httpx` calls to DeepSeek, Voyage, Zetaris, or Meterless anywhere else.
- **Retrieval SQL lives in `ai/retrieval/` and the Zetaris queries only**, and always takes `ipo_id` from the caller, never from model output.
- **Routes contain no business logic.** Routes validate input, call a service, and shape the response.
- **Ingestion is its own entrypoint** with heavier dependencies.
- **Prompts are files**, versioned; the prompt version is stored in the trace.

## 10. Getting started

### Prerequisites

Python 3.12, [uv](https://docs.astral.sh/uv/), Docker and Docker Compose, and API keys for DeepSeek and Voyage AI (plus Zetaris and Meterless credentials when you test those integrations).

### First-time setup

```bash
# 1. Install dependencies (add --extra ingest to run ingestion locally)
uv sync

# 2. Configure the environment
cp env.example .env              # fill in the keys; see section 12

# 3. Start Postgres with pgvector
docker compose up -d db

# 4. Apply migrations
uv run alembic upgrade head

# 5. Verify connectivity (database, embeddings, LLM, integrations)
uv run --env-file .env python scripts/smoke_check.py

# 6. Run the API (DEMO_MODE=true seeds demo data on startup)
uv run --env-file .env uvicorn ai.main:app --reload
```

Open `http://localhost:8000/docs`. Logs appear in the console and in `logs/`.

If you are starting without a `pyproject.toml`:

```bash
uv init --package ai && cd ai
uv add fastapi "uvicorn[standard]" pydantic-settings sse-starlette python-multipart email-validator \
       structlog tenacity orjson tiktoken httpx pyjwt "pwdlib[argon2]" apscheduler icalendar
uv add langgraph langchain-core langchain-deepseek
uv add "sqlalchemy[asyncio]" "psycopg[binary,pool]" pgvector alembic
uv add --group dev pytest pytest-asyncio respx ruff mypy pre-commit
uv add --optional ingest docling pymupdf
```

### Known gotchas

- **Voyage rate limits.** Without a payment method, the free trial allows only 3 requests and 10K tokens per minute. Ingesting a prospectus or running the retrieval loop will be throttled or fail. Add a payment method (higher limits), and keep the throttling in `ai/llm/rate_limit.py`.
- **Demo seed must not call the embedding API.** `data/demo/` ships precomputed embeddings with the same model and dimension as the config. If you change the embedding model, regenerate them.
- **Docker log folder permissions.** The container runs as a non-root user. Run `mkdir -p logs && chmod 777 logs` before `docker compose up` so it can write to the bind mount.
- **Embedding dimension is fixed in the column type.** `EMBEDDING_DIM` must equal the `VECTOR(n)` size (1024).

## 11. Useful commands

### Run and debug

```bash
uv run --env-file .env uvicorn ai.main:app --reload       # API with hot reload
curl http://localhost:8000/health                         # liveness
curl http://localhost:8000/v1/meta                        # versions, thresholds, integrations
```

### Logs (see section 6.8)

```bash
tail -f logs/agent.log                                    # follow the agent step by step
tail -f logs/agent.log | jq -c '{event, node, try, score, verdict, duration_ms}'
grep '"message_id": "<ID>"' logs/agent.log | jq .         # everything for one answer
jq -r 'select(.level=="error")' logs/app.log              # errors only
```

### Database

```bash
docker compose up -d db                                   # start Postgres + pgvector
docker compose down -v                                    # stop and delete all data
docker compose exec db psql -U ai -d ai_service           # SQL shell
uv run alembic revision --autogenerate -m "describe"      # create a migration
uv run alembic upgrade head                               # apply
uv run alembic downgrade -1                               # roll back one
```

### Ingestion and demo data

```bash
uv run --env-file .env python -m ai.ingestion run <document_id>      # parse, chunk, embed
uv run --env-file .env python scripts/seed_demo.py                   # load demo data manually
```

### Quality

```bash
uv run ruff check . && uv run ruff format .               # lint and format
uv run mypy ai                                            # type check
uv run pytest tests/unit                                  # fast tests, no network
uv run pytest tests/integration                           # needs the database
uv run pytest tests/e2e                                   # full examiner flow on the demo IPO
uv run --env-file .env python scripts/run_eval.py         # evals
```

### Docker

```bash
mkdir -p logs && chmod 777 logs
docker compose up --build                                 # db + migrations + API
docker compose logs -f api                                # console logs
docker build --target ingest -t mostro-ai-ingest .        # ingestion image
```

## 12. Configuration

All configuration comes from environment variables, read only in `ai/config.py`. Copy `env.example` to `.env`. Never commit `.env`.

| Variable | Purpose | Default / example |
|---|---|---|
| `ENV` | `dev`, `test`, `prod` | `dev` |
| `DEMO_MODE` | Seed demo data on startup, enable demo and debug admin routes, log user content | `true` for the hackathon, `false` in production |
| `DATABASE_URL` | Postgres connection | `postgresql+psycopg://ai:ai@localhost:5432/ai_service` |
| `LOG_LEVEL` | Minimum level | `INFO` |
| `LOG_FORMAT` | Console format: `console` or `json` | `console` |
| `LOG_DIR` | Folder for log files | `logs` |
| `LOG_FILE_MAX_MB`, `LOG_FILE_BACKUPS` | Rotation | `20`, `5` |
| `LOG_USER_CONTENT` | Log truncated user text | `true` in demo mode |
| `LOG_PROMPTS` | Log full prompts at DEBUG | `false` |
| `JWT_SECRET` | JWT signing key | long random string |
| `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS` | Token lifetimes | `30`, `7` |
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` | Admin account created at startup | demo only |
| `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` | Demo user created by the seed | demo only |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL` | LLM access | `https://api.deepseek.com` |
| `LLM_MODEL_FAST`, `LLM_MODEL_MAIN` | Router/evaluator vs generation models | check provider docs |
| `VOYAGE_API_KEY` | Embeddings access | |
| `EMBEDDING_MODEL` | Embedding model | `voyage-multimodal-3.5` |
| `EMBEDDING_DIM` | Must match `VECTOR(n)` | `1024` |
| `EMBEDDING_TIMEOUT_SECONDS`, `PROVIDER_MAX_ATTEMPTS` | HTTP timeout and retries | `30`, `3` |
| `EMBEDDING_REQUESTS_PER_MINUTE`, `EMBEDDING_TOKENS_PER_MINUTE` | Client-side throttling (stay under your tier) | free trial: `3`, `10000` |
| `JEV_MIN_SCORE` | Evaluator pass threshold | `0.70` |
| `JEV_MAX_TRIES` | Retrieval attempts before abstaining | `3` |
| `QUIZ_EVERY_N_TURNS` | Quiz cadence | `4` |
| `RETRIEVAL_CANDIDATES`, `RERANK_TOP_K` | Retrieval sizes | `30`, `6` |
| `MESSAGE_RATE_LIMIT_PER_MINUTE` | Per-user limit on message endpoints | `20` |
| `ZETARIS_ENABLED` | Use Zetaris (otherwise direct Postgres fallback) | `true` for evaluation |
| `ZETARIS_URL`, `ZETARIS_*` credentials | Zetaris connection | <!-- TODO: confirm method --> |
| `METERLESS_ENABLED`, `METERLESS_BASE_URL`, `METERLESS_API_KEY` | Usage tracking | <!-- TODO: confirm --> |

## 13. Testing and evaluation

Language-model systems fail silently, so we measure.

1. **Unit tests**: nodes with fake LLMs and fake retrievers, JEV loop logic (retry, abstain, pass), quiz trigger rules, mastery updates, calendar proposal rules, rank fusion, auth, log redaction. Fast, no network.
2. **Integration tests**: real Postgres with pgvector, mocked HTTP for DeepSeek, Voyage, Zetaris, and Meterless (`respx`). Tests must never call paid APIs.
3. **End-to-end test** (`tests/e2e/`): automates the examiner flow in `OPEN_AGENT_HACKATHON.md` against the demo IPO (register, ask with citations, abstention, education adaptation, calendar confirm and reminder fast-forward, quiz answer, usage). **This test must pass before any submission.**
4. **Evals** (`evals/`): a golden set per IPO (factual, table-based, multi-page, unanswerable), plus trap sets: advice-seeking, scam messages, prompt injection, questions about another IPO, French and code-switched queries, calendar edge cases (time zones, past dates).

Metrics: retrieval recall@k and MRR, answer faithfulness, citation correctness, abstention correctness, **average evaluator tries**, route accuracy, quiz grading agreement, cost per answer.

**Rule:** run the evals after every change to a prompt, model, threshold, retrieval setting, or chunking.

## 14. Roadmap

Ordered by risk: data and retrieval first, features after. Tier labels match `docs/api-map.md` (C = core, S = support, X = stretch).

> **Current status:** config, logging, retry modules, and a first embeddings adapter (Gemini) exist. The adapter must be **migrated to Voyage AI**, and throttling added. Everything else below is open. Tick boxes as phases finish.

- [ ] **Phase 0: Foundation.** `config.py`, `core/logging.py` (console + `logs/app.log` + `logs/agent.log`, redaction), errors, middleware (request id, access log), DB session, Alembic baseline from section 7, `/health`, `/v1/meta`.
- [ ] **Phase 1: Auth and users.** Register, login, token, refresh, logout, `users/me`, profile, onboarding questions. Admin bootstrap. *Needed by every other route.*
- [ ] **Phase 2: LLM and embedding layers.** DeepSeek client, Voyage client with batching and throttling, Meterless usage wrapper, fakes for tests.
- [ ] **Phase 3: Ingestion and data.** Parse, chunk, embed, store; key-fact extraction with review routes; section summaries; admin IPO and document routes; demo data package in `data/demo/` with precomputed embeddings; demo seed.
- [ ] **Phase 4: Retrieval and evaluator.** Hybrid search through the Zetaris adapter (with direct fallback), RRF, the JEV evaluator, the retrieval debug route. Start retrieval evals.
- [ ] **Phase 5: Agent graph v1.** Router, rewriter, retriever, evaluator loop, abstain, refusal, context builder, generate, formatter. Chat routes (`ask`, sessions, messages), trace route, agent logging. *First end-to-end slice.*
- [ ] **Phase 6: Education.** Edu route, glossary routes, knowledge states, quiz engine (on-trigger and on-demand), grading, mastery updates.
- [ ] **Phase 7: Calendar.** Calendar route and direct proposals, confirm/reject, reminders, scheduler, `run-due` time travel, `.ics`.
- [ ] **Phase 8: Observability and testability.** `usage` routes, `integrations/health`, demo reset, full examiner flow e2e test.
- [ ] **Phase 9: Evals and polish.** Eval suites and optional eval routes (X), French checks, performance, final `OPEN_AGENT_HACKATHON.md` review.

**Minimum shippable demo:** phases 0 to 5, plus the Zetaris and Meterless integrations visible in traces and usage. Beyond v1: more languages (Swahili, Hausa, Yoruba, Pidgin, Arabic), more countries, WhatsApp channel, a source for live announcements, external calendar integration.

## 15. Conventions and contributing

### For coding agents

- Read this README, `AGENTS.md`, and `docs/api-map.md` before changing anything. The API map is the contract: change it in the same commit as the route.
- Build in roadmap order and tier order. Do not start a phase while the previous one's checks fail.
- Run `ruff check`, `ruff format --check`, `mypy ai`, and the relevant `pytest` targets before declaring a task done, and report the results.
- If requirements are ambiguous or conflict with a rule here, stop and ask instead of guessing.
- Ask before: adding dependencies, changing the API contract, changing the embedding model or dimension, destructive schema changes, deleting evals.

### Code

- Type hints everywhere; async for I/O; Pydantic models across boundaries (API schemas, graph state, repository returns).
- Graph nodes are small functions: state in, partial state out. No hidden global state.
- Every LLM and embedding call has a timeout, retries (`tenacity`), throttling where limits apply, and logs provider, model, duration, and tokens.
- Use `get_logger(__name__)` from `ai/core/logging.py`. Event names are dotted, lowercase (`agent.jev.verdict`). Every agent node logs `agent.node.start` and `agent.node.end`. Follow the redaction and content rules in section 6.8.
- Calendar datetimes carry explicit IANA time zones.
- Errors are typed (`ai/core/errors.py`) and mapped to the error shape in the API map. An abstention is a `200`, not an error.
- Schema changes go through Alembic. Prompts live in `ai/agent/prompts/` and are versioned; changing one means running the evals.

### Hard rules

1. `ipo_id` never comes from model output. It comes from the session.
2. Provider and sponsor code stays in `ai/llm/` and `ai/integrations/`.
3. Zetaris queries are predefined, parameterized, read-only. No model-written SQL.
4. Only verified key facts feed answers and calendar proposals.
5. Never weaken the evaluator threshold, the abstention path, or the refusal path to make a test pass.
6. No investment advice, predictions, or guaranteed-return wording anywhere, including prompts and fixtures.
7. Never log or commit secrets. Never expose a quiz's correct answer before it is answered.
8. Tests must not call paid or external APIs.

### Workflow

Short-lived branches, small pull requests, clear commit messages. <!-- TODO: confirm commit convention --> CI runs lint, types, and tests; it must pass before merge.

## 16. Security, privacy and compliance

- **Authentication.** Short-lived JWT access tokens and revocable, hashed refresh tokens. Passwords hashed with Argon2. Admin routes require the `admin` role.
- **Authorization.** Users only access their own sessions, messages, quizzes, proposals, reminders, and usage. Return `404` for resources of other users where existence should not leak.
- **Isolation.** Retrieval is filtered by the session's `ipo_id`. A session is bound to one IPO for life.
- **Rate limiting.** Per user on message endpoints, since they cost money.
- **Demo tooling.** Seed, reset, retrieval debug, and time-travel routes exist only when `DEMO_MODE=true`. Demo credentials are for the hackathon only and must be changed or removed in any real deployment.
- **Information, not advice.** The product must never give personalized recommendations or promise returns. Disclaimers and wording need legal review per country.
- **Scam wording.** Say things like "this account is not listed among the receiving agents on page X" and tell users to confirm through official channels. Never state with certainty that something is or is not a scam.
- **Prompt injection.** Prospectus text and user messages are untrusted data. The model never chooses the IPO, never writes SQL, and never executes actions.
- **Personal data.** User messages may contain personal details. DeepSeek and Voyage are external APIs hosted outside most users' regions; prospectus text is public, user messages are not. Review data-handling obligations per country. Users can delete their account and all associated data (`DELETE /v1/users/me`).
- **Logs.** Redact secrets and emails. Log user text only when allowed by configuration.
- **Secrets.** Environment variables or a secret manager; never committed, never baked into images.

## 17. Glossary

| Term | Meaning |
|---|---|
| **IPO** | Initial Public Offering: a company sells shares to the public for the first time |
| **Prospectus** | The official legal document describing the offer, the company, the risks, and how to subscribe |
| **Addendum** | An official amendment to a prospectus, ingested as a new document version |
| **Allotment** | Deciding how many shares each applicant receives |
| **Oversubscription** | More shares requested than offered |
| **Receiving agent** | An authorized institution that collects applications and payments |
| **Chunk** | A piece of the prospectus (text or table) stored with its embedding, page, and section |
| **Embedding** | A numeric vector representing the meaning of text, used for similarity search |
| **Hybrid search** | Vector similarity combined with full-text keyword search |
| **RRF** | Reciprocal Rank Fusion: a simple way to merge two ranked result lists |
| **Agentic RAG** | Retrieval-augmented generation where the agent evaluates its own retrieval and retries with a better query |
| **JEV evaluator** | The graph node that scores whether retrieved evidence is sufficient for the task (threshold 0.70, max 3 tries) |
| **Abstention** | Declining to answer because the sources do not support one (`outcome: abstained`) |
| **Refusal** | Declining an out-of-scope or advice-seeking request (`outcome: refused`) |
| **Intent** | The route chosen by the router: `prospectus_search`, `financial_education`, `calendar`, `out_of_scope` |
| **Key fact** | A structured value (such as the offer closing date) with its source page and a review status |
| **Verified** | A key fact or summary a human reviewed; only verified items feed answers and proposals |
| **Mastery level** | The user's tracked understanding of a glossary term |
| **Quiz** | An MCQ or open-ended question generated after an answer or on demand |
| **Calendar proposal** | A suggested event built from a verified date, confirmed or rejected by the user |
| **Reminder** | A scheduled notification created when a proposal is confirmed |
| **Trace** | The structured record of how one answer was produced, served by the trace route and mirrored in `logs/agent.log` |
| **Zetaris** | Sponsor data platform used as the query layer over the data stores |
| **Meterless** | Sponsor technology used here for usage and cost tracking around LLM calls |
| **SSE** | Server-Sent Events, the optional streaming format for chat responses |
| **Demo mode** | `DEMO_MODE=true`: seeds demo data and enables test and debug routes |
