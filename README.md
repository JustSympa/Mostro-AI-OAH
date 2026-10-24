# Mostro AI

**ATTENTION EXAMINER:** For a consive overview of the project tailored specifically for evaluation, please refer to [OPEN_AGENT_HACKATHON.md](OPEN_AGENT_HACKATHON.md)
---

**A trustworthy, prospectus-grounded assistant that helps people in Africa understand IPOs, avoid scams, and learn about investing.**

This repository contains the entire codebase of the Mostro platform : frontend and backend.

> **Status:** Proof of Concept / MVP . See [Roadmap](#14-roadmap) for where we are.

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

Large IPOs, such as the recent Dangote refinery IPO, bring many first-time investors into capital markets. Alongside genuine interest come three problems:

- **Scams.** Fake offers, fake "agents", WhatsApp investment groups, and requests to pay into personal accounts.
- **Hard-to-find, hard-to-read information.** The official document is a prospectus of hundreds of pages written in legal and financial language.
- **Skepticism.** Many people distrust anything related to investing, often for good reason.

Mostro answers these with one idea: **let people ask questions directly to the official prospectus, and show them exactly where each answer comes from.** A user can verify any statement by opening the cited page. That verifiability is the product.

## 2. Objectives and non-goals

### Objectives

1. **Accurate answers about a specific IPO**: dates, price, minimum subscription, how to apply, receiving agents and banks, use of proceeds, risks, and so on, always with citations (page, section, short quote).
2. **Financial education**: explain concepts (IPO, allotment, oversubscription, dilution, prospectus) in plain language, adapted to the user's level and language.
3. **Scam protection**: help users check whether an account, agent, or procedure matches what the official prospectus says.
4. **Calendar actions**: turn verified IPO dates (opening, closing, allotment, listing) into calendar events the user confirms.
5. **Honesty over fluency**: when the document doesn't contain the answer, say so.

### Non-goals

- **No personalized investment advice.** We do not tell anyone to buy, sell, or how much to invest.
- **No predictions or guaranteed returns**, ever.
- **No live market data** in v1 (subscription levels, allotment results, listing prices). The prospectus is a snapshot, and we say so.
- **No executing actions** on a user's behalf. The AI service only *proposes*; other services execute after user confirmation.
- **Not a general chatbot.** Off-topic requests are politely redirected.

## 3. Target population

Primary: **first-time and early-stage retail investors across Africa**, including people who are skeptical of investing or have been targeted by scams.

What this implies for the engineering:

| Reality | Design consequence |
|---|---|
| Many users are new to finance | Plain language, adjustable level, glossary for general concepts |
| Anglophone and Francophone markets | English and French from day one; more languages later |
| Mobile-first, variable bandwidth | Streaming responses, short answers by default |
| High scam exposure | Scam-aware behavior, official-source comparison, careful wording |
| Low institutional trust | Every claim cites a page the user can open |
| Different regulators per country | Information and education only; never advice |

## 4. Product overview

The user logs in, picks **one IPO** from the published list, and chats with the assistant. The conversation is **bound to that IPO**: the assistant only knows that IPO's official documents.

What the assistant can do:

- **Answer questions from the prospectus** with page citations.
- **Explain** terms and sections in simple language, in the user's language.
- **Summarize** broad sections ("what are the main risks?").
- **Check legitimacy details**: "Is this bank account one of the official receiving agents?"
- **Propose calendar events** for key dates, which the user confirms in the app.
- **Decline or redirect** advice-seeking, off-topic, and manipulative requests.
- **Abstain** when the document doesn't answer the question.

## 5. Core design principles

1. **The prospectus is the source of truth.** The LLM explains; it does not invent. Facts come from retrieved passages or human-verified structured data.
2. **The IPO is never chosen by the model.** `ipo_id` comes from the session and is applied as a hard database filter. This prevents cross-IPO leakage and prompt-injection context switching.
3. **Abstain rather than guess.** If retrieval confidence is low, the answer is "I couldn't find this in the prospectus", plus where to look.
4. **Deterministic checks on top of the LLM.** Every number and date in an answer must appear in the retrieved sources.
5. **Propose, never execute.** Calendar actions are returned as proposals. Credentials never enter the AI service.
6. **Human in the loop for facts that matter.** Key facts (dates, prices, agents) are extracted by LLM and verified by a person before use.
7. **Everything is auditable.** Each answer stores the query rewrite, retrieved chunks and scores, model, prompt version, and latency.
8. **Quality is measured, not felt.** Evals run on every prompt, model, or chunking change.

## 6. Architecture


### Chat flow (LangGraph)

### Ingestion pipeline (offline)

### Model roles

| Role | Model (configurable) | Used for |
|---|---|---|
| Fast LLM | `deepseek-v4-flash` | Guardrails, routing, query rewriting |
| Main LLM | `deepseek-v4-pro` | Answer generation, key-fact extraction, summaries |
| Embeddings | `voyage-3.5` (1024 dims) | Chunks, glossary, queries |


## 7. Data model

The SQLAlchemy models define the current schema; Alembic's initial migration
creates the baseline and subsequent revisions capture changes. The older
`ai_service_schema.sql` is retained as a reference and is not the provisioning
path. Main tables:

| Group | Tables | Notes |
|---|---|---|
| Reference | `ipo` | Synced copy; the backend owns the master record |
| Knowledge | `document`, `chunk`, `key_fact`, `section_summary`, `glossary_term` | Written by ingestion; read-only for the chat API |
| Conversation | `chat_session`, `message`, `message_citation`, `calendar_proposal` | Written at runtime; doubles as the audit log |
| Operations | `ingestion_job` | Tracks document-ingestion work for admin APIs |

Important details:

- `chunk.ipo_id` is denormalized on purpose, so retrieval filters on it directly.
- `document.version` and `status` handle addenda; only `indexed` documents are searchable.
- `key_fact.review_status = 'verified'` is required before a fact is used or turned into a calendar proposal.
- `chat_session.user_id` is an opaque UUID from the backend, with no cross-service foreign key.
- `glossary_term` holds general education content, kept separate from prospectus text.

## 8. Tech stack

| Concern | Choice |
|---|---|
| Language / tooling | Python 3.12, [uv](https://docs.astral.sh/uv/), ruff, mypy, pytest |
| User App | Next.js, Tailwind CSS, SSG |
| API | FastAPI, Uvicorn, Server-Sent Events (`sse-starlette`) |
| Agent orchestration | LangGraph (+ `langgraph-checkpoint-postgres`) |
| LLM | DeepSeek via `langchain-deepseek` |
| Embeddings | Voyage API (`voyage-3.5`, 1024 dims, all environments) |
| Database | PostgreSQL 17 + pgvector (HNSW) + full-text search |
| DB access | SQLAlchemy 2 (async) + psycopg 3, Alembic migrations |
| Document parsing | Docling, PyMuPDF (optional `ingest` dependency group) |
| Resilience / logging | tenacity, structlog |
| Observability | Langfuse (optional) |
| Packaging | Docker (multi-stage: `api` and `ingest` targets) |

## 9. Repository structure

```
Mostro-AI-OAH/
├── backend/
│   ├── src/
│   |   ├── api/                     # HTTP layer only, no business logic
│   |   │   ├── deps.py              # internal-key auth, DB session, graph
│   |   │   ├── routes/              # chat (SSE), sessions, ingestion, health
│   |   │   └── schemas/             # request/response models: the contract with the backend
│   |   │
│   |   ├── services/                # use cases
│   |   │   ├── chat_service.py      # load session, run graph, persist message + citations
│   |   │   ├── user_service.py      # basic auth, account management, etc
│   |   │   └── calendar_service.py  # build proposals from verified key facts
│   |   │
│   |   ├── agent/                   # LangGraph
│   |   │   ├── state.py             # typed graph state
│   |   │   ├── graph.py             # nodes and edges
│   |   │   ├── nodes/               # input_guard, understand, retrieve, key_facts,
│   |   │   │                        # summary, calendar, generate, output_guard, abstain
│   |   │   └── prompts/             # versioned prompt templates
│   |   │
│   |   ├── retrieval/               # hybrid SQL, RRF, rerank, neighbor expansion, abstention gate
│   |   ├── guardrails/              # injection, advice, PII, numeric/date check, citation check
│   |   ├── llm/                     # DeepSeek chat and embedding providers (all provider code)
│   |   ├── db/                      # session, SQLAlchemy models, repositories
│   |   ├── ingestion/               # parse, chunk, embed, extract_facts, summarize, pipeline
│   |   ├── domain/                  # enums, citation and fact types
│   |   └── core/                    # logging, errors, telemetry
|   |
|   ├── tests/
|   │   ├── unit/                    # guardrails, chunking, numeric check, RRF
|   │   ├── integration/             # real Postgres, mocked LLM
|   │   └── e2e/                     # full chat flow on a seeded IPO
|   |
|   ├── evals/
|   |   ├── datasets/                # golden Q&A per IPO (JSONL), trap sets
|   |   └── metrics/                 # faithfulness, citation, abstention
|   ├── migrations/                  # Alembic migrations
|   ├── scripts/                     # smoke_check.py, seed and eval runners
|   ├── pyproject.toml, uv.lock
|   ├── alembic.ini
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
├── .env.example, docker-compose.yml, Dockerfile, .dockerignore
├── ai_service_schema.sql        # legacy/reference SQL; use Alembic to provision
└── Dockerfile
```

### Layering rules

- **Dependency direction:** `api → services → agent → retrieval / guardrails → db / llm`. Nothing imports upward.
- **`llm/` is the only package that knows about model providers.** Swapping a provider touches one folder.
- **`retrieval/` is the only place that writes the filtered search SQL.** It takes `ipo_id` from the caller, never from a prompt or model output.
- **Ingestion is a separate process** with heavier dependencies and different failure modes.
- **Prompts are files, not strings in code.** The prompt version is logged with every message.

## 10. Getting started

### Prerequisites

- Python 3.12
- [uv](https://docs.astral.sh/uv/)
- Docker and Docker Compose
- A [DeepSeek API key](https://platform.deepseek.com/) (LLM)
- A [Voyage API key](https://dashboard.voyageai.com/) (embeddings — used in all environments including dev)

### First-time setup

```bash

```

The smoke check verifies three things: the database is reachable with pgvector installed, the embedding dimension matches the schema, and DeepSeek answers. **If it fails, fix that before writing any feature code.**

## 11. Useful commands

### Run and debug

```bash

```

### Database

```bash

```

### Ingestion (single-document v1)

```bash

```

The IPO row must already exist in `ai.ipo`. The `ingest` command registers the local PDF as a document, calculates its SHA-256 file hash, and reuses an existing document record for duplicate uploads. The parser preserves page numbers, recognizes heading paths and lists from PDF layout, and emits detected tables as complete Markdown table chunks. Embedding inputs add the section path and nearby same-section text while leaving the source `content` unchanged. Ingestion records progress in `ai.ingestion_job` and replaces a document's chunks only after parsing and embedding succeed.

Always inspect the stored chunks by hand after ingesting a new prospectus: check page numbers, table integrity, and section paths.

### Quality

```bash
uv run ruff check .                             # lint
uv run ruff format --check .                    # format check
uv run mypy src                                  # type check
uv run pytest tests/unit                         # fast tests
uv run pytest tests/integration                  # needs the database running
uv run --env-file .env python scripts/run_eval.py --ipo-id <ipo-uuid>  # retrieval recall@k; embeddings only, no LLM
```

The retrieval dataset in `evals/datasets/dangote_prospectus.jsonl` contains
25 questions with known source pages from the first Dangote refinery
prospectus. Page numbers are 1-based PDF page positions, matching ingestion's
page metadata. Index that prospectus and run the recall evaluation before
advancing to the next phase; if recall is poor, revisit chunking rather than
adding a reranker. The script uses the configured embedding provider and
Postgres retrieval, but does not create a chat client or invoke an LLM.

### Docker images

```bash

```

## 12. Configuration

All configuration comes from environment variables, read in one place (`config.py`). Copy `.env.example` to `.env` for local work. Never commit `.env`. The embedding provider is Voyage (`voyage-multimodal-3.5`, 1024 dims) in **all** environments — dev, test, staging, and production. Runtime providers are available through `ai.llm`; transient failures use bounded retries and successful/failed calls log provider, model, latency, and available token counts without logging input or output text.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection (`postgresql+psycopg://...`) |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL` | LLM access |
| `LLM_MODEL_FAST`, `LLM_MODEL_MAIN` | Models for guardrails/routing vs generation |
| `VOYAGE_API_KEY`, `EMBEDDING_MODEL` | Voyage embeddings API key (required in all environments) |
| `LLM_TIMEOUT_SECONDS`, `EMBEDDING_TIMEOUT_SECONDS` | Provider request timeouts (default: 30 seconds) |
| `PROVIDER_MAX_ATTEMPTS` | Maximum attempts for transient provider failures (default: 3) |
| `EMBEDDING_DIM` | Must match the `VECTOR(n)` column (currently 1024) |
| `ADMIN_API_KEY` | Separate key reserved for admin endpoints |
| `CORS_ORIGINS` | JSON list of allowed local development browser origins; quote the whole value in `.env` (for example, `CORS_ORIGINS='["http://localhost:3000"]'`) |
| `RETRIEVAL_CANDIDATES` | Maximum candidate count retrieved independently by vector and full-text search |
| `ABSTAIN_SCORE_THRESHOLD` | Below this best vector cosine similarity, the assistant abstains |
| `LANGFUSE_*` | Optional tracing |

## 13. Testing and evaluation

Language-model systems fail silently, so we measure instead of trusting. We use three layers:

1. **Unit tests**: guardrails, chunking, the numeric/date checker, rank fusion. Fast, no network.
2. **Integration tests**: a real Postgres with pgvector and *mocked* LLM calls (`respx`), so tests never spend money.
3. **Evals**: a golden set per IPO (questions with known answers and source pages), plus trap sets.

Metrics we track:

- **Retrieval:** recall@k and MRR against known source pages.
- **Answers:** faithfulness (every claim supported), citation correctness, abstention correctness.
- **Behavior:** refusal quality on trap sets, tool/route correctness.

Trap sets include: advice-seeking ("should I put all my savings in?"), scam messages, prompt injection, questions about a different IPO, French and code-switched queries, and calendar edge cases (time zones, past dates, "next Friday").

**Rule: run the evals after every change to a prompt, model, or chunking setting.**

## 14. Roadmap

## 15. Conventions and contributing

- **Branches and commits:** 
- **Code style:** 
- **Type everything** 
- **No provider code outside `llm/`.**
- **Prompts live in `agent/prompts/` and are versioned.** Changing a prompt means running the evals.
- **Never accept `ipo_id` from model output.** It comes from the session.
- **Schema changes go through Alembic**, never by editing the database by hand.
- **Write tests with the feature**, not after.

## 16. Security, privacy and compliance

- **Information, not advice.** The product educates and informs. It must never give personalized investment recommendations or promise returns. Disclaimers and wording must be reviewed by a lawyer for each target country, since rules differ by regulator (for example Nigeria's SEC, Kenya's CMA).
- **Service authentication.** The AI service is internal. Every request must carry the internal key; it is not exposed directly to the internet.
- **Isolation.** Retrieval always filters by the session's `ipo_id`. Chat sessions are bound to one IPO for their lifetime.
- **No credentials in this service.** Calendar tokens and user credentials stay in the backend.
- **Prompt injection.** Prospectus text and user messages are treated as untrusted data. The model never decides which IPO to read and never executes actions.
- **Personal data.** User messages may contain personal details. The PII check runs *before* anything is sent to an external LLM provider. Note that the DeepSeek API is hosted outside most users' regions; prospectus text is public, user messages are not. Review data-handling obligations per country.
- **Secrets.** Provided via environment variables or a secret manager. Never committed, never baked into images.
- **Auditability.** Every answer stores its sources, model, and prompt version, so we can explain what the assistant said and why.
- **Wording on scams.** The assistant says things like "this account is not among the receiving agents listed on page X" and always directs users to confirm through official channels. It never declares with certainty that something is or isn't a scam.

## 17. Glossary

| Term | Meaning |
|---|---|
| **IPO** | Initial Public Offering: a company sells shares to the public for the first time |
| **Prospectus** | The official legal document describing the offer, the company, the risks, and how to subscribe |
| **Addendum / supplement** | An official amendment to a prospectus |
| **Allotment** | The process of deciding how many shares each applicant receives |
| **Oversubscription** | More shares requested than offered |
| **Receiving agent** | An authorized institution that collects applications and payments |
| **RAG** | Retrieval-Augmented Generation: retrieve relevant passages, then have the model answer from them |
| **Chunk** | A small piece of the prospectus (text or table) stored with its embedding and page number |
| **Embedding** | A numeric vector representing the meaning of a text, used for similarity search |
| **Hybrid search** | Combining vector similarity with keyword (full-text) search |
| **RRF** | Reciprocal Rank Fusion: a simple way to merge two ranked result lists |
| **Reranker** | A model that re-orders retrieved chunks by relevance to the question |
| **Abstention** | Declining to answer because the sources don't support one |
| **Guardrails** | Checks before and after the model that block unsafe or unsupported behavior |
| **SSE** | Server-Sent Events: how answers are streamed token by token to the client |
| **Key fact** | A structured, human-verified value (for example the offer closing date) with its source page |
