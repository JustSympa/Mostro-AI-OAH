# Mostro AI: Open Agent Hackathon 2026 submission

**A prospectus-grounded agent that helps first-time investors in Africa understand IPOs, spot scams, and learn, with a reasoning trail you can inspect for every answer.**

**Target track:** The Agent That Can Explain Why <!-- TODO: confirm the track chosen at registration -->
**Team:** <!-- TODO: team name and members -->
**Repository:** <!-- TODO: repository URL -->

> **For examiners.** The whole agent is testable from the API, with no UI. Follow [Installation](#3-installation-instructions) (about 5 minutes), then [Examples](#6-examples) for copy-paste requests with what to look for. Interactive docs are at `http://localhost:8000/docs` once running.

## Table of contents

1. [Why Mostro exists](#1-why-mostro-exists)
2. [Objectives and non-goals](#2-objectives-and-non-goals)
3. [Installation Instructions](#3-installation-instructions)
4. [Usage Instructions](#4-usage-instructions)
5. [API Documentation](#5-api-documentation)
6. [Examples](#6-examples)
7. [Logging and Tracing](#7-logging-and-tracing)
8. [Integration of Sponsor Technologies](#8-integration-of-sponsor-technologies)
9. [License and Acknowledgments](#9-license-and-acknowledgments)
10. [Contact Information](#10-contact-information)

---

## 1. Why Mostro exists

Large IPOs, such as the recent Dangote refinery IPO, bring many first-time investors into capital markets. With genuine interest come three problems:

- **Scams**: fake offers, fake "agents", WhatsApp investment groups, requests to pay into personal accounts.
- **Information that is hard to find and hard to read**: the official prospectus runs to hundreds of pages of legal and financial language.
- **Skepticism**: many people distrust anything related to investing, often for good reason.

Mostro's answer is one idea: **ask the official prospectus directly, and see exactly where each answer comes from.** Every answer carries page citations the user can open and verify, and every answer has a trace showing how the agent reached it.

## 2. Objectives and non-goals

**What the agent does**

| Capability | How it works |
|---|---|
| **Cited answers about one IPO** | Agentic RAG: the agent rewrites the query, retrieves, and **evaluates its own evidence** (score threshold 0.70). If the evidence is weak it retries with a better query, up to 3 times, then **abstains** instead of guessing. |
| **Explainability** | Every answer has a trace: route chosen, each retrieval attempt with scores, sources, queries sent to Zetaris, tokens, and cost. The same steps are written to `logs/agent.log`. |
| **Personalized financial education** | Explanations adapt to the user's profile and tracked mastery of concepts. An engagement loop adds multiple-choice and open-ended quizzes (every 4th turn, on opt-in, or on demand) and updates mastery. |
| **Calendar reminders** | The agent proposes events from **verified** IPO dates. The user confirms, a reminder is scheduled, and events export as `.ics`. |
| **Cost transparency** | Tokens and cost are tracked per answer and per user. |

**Non-goals**

- No personal investment advice, predictions, or guaranteed returns. The agent informs and educates, and refuses advice-seeking requests.
- No live market data (subscription levels, allotment results, listing prices). The prospectus is a snapshot.
- No trading and no real portfolio.
- No external calendar write integration (reminders are in-app, plus `.ics` export).
- Each chat is bound to **one IPO**. The model never chooses which IPO to read.

## 3. Installation Instructions

### Requirements

- **Docker** and **Docker Compose** (recommended path), or Python 3.12 with [uv](https://docs.astral.sh/uv/) and Docker for the database.
- A shell with `curl` and (optionally) `jq`: Linux, macOS, WSL, or Git Bash. On Windows without these, use the Swagger UI at `/docs` instead of the curl examples.
- API keys: DeepSeek, Voyage AI, Zetaris, and Meterless. <!-- TODO: say how examiners receive the keys (private submission notes, .env file, shared link) -->

### Option A: Docker (recommended)

```bash
git clone <repository-url> mostro-ai && cd mostro-ai

cp env.example .env
# Open .env and fill in: DEEPSEEK_API_KEY, VOYAGE_API_KEY, ZETARIS_*, METERLESS_*
# Leave DEMO_MODE=true and ZETARIS_ENABLED=true

mkdir -p logs && chmod 777 logs          # so the container can write logs to ./logs

docker compose up --build
```

Wait until the console shows the application has started, then open **http://localhost:8000/docs**. On first start, `DEMO_MODE=true` applies the database migrations and loads the demo data (an IPO with its prospectus chunks, verified key facts, summaries, glossary, and two accounts). Startup does not call the embedding API, because the demo data ships with precomputed embeddings.

### Option B: local Python

```bash
git clone <repository-url> mostro-ai && cd mostro-ai
cp env.example .env                      # fill in the keys as above

uv sync
docker compose up -d db                  # PostgreSQL 17 with pgvector
uv run alembic upgrade head
uv run --env-file .env uvicorn ai.main:app --host 0.0.0.0 --port 8000
```

### Verify the installation

```bash
curl -s http://localhost:8000/health
# {"status":"ok"}

curl -s http://localhost:8000/v1/meta | jq
# models, agent thresholds (evaluator 0.70, 3 tries, quiz every 4 turns),
# and which sponsor integrations are enabled
```

### Demo accounts (created by the seed, for evaluation only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@mostro.ai` | `Admin-2026!` |
| User | `demo@mostro.ai` | `Demo-2026!` |

You can also create your own user with `POST /v1/auth/register`.

### Stop and reset

```bash
docker compose down            # stop (keeps data)
docker compose down -v         # stop and delete all data
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| `permission denied` writing `logs/` | Run `chmod 777 logs` and restart |
| Port 8000 or 5432 already in use | Stop the other process or change the port mapping in `docker-compose.yml` |
| `/v1/meta` shows an integration as disabled | Check the matching keys in `.env`, then restart |
| `429` or slow answers on the first questions | The embedding provider's rate limit; wait a minute and retry |
| `GET /v1/admin/integrations/health` shows a failing dependency | The `detail` field names the cause (usually a missing or wrong key) |

## 4. Usage Instructions

You can test in three ways. All use the same API.

1. **Swagger UI** at `http://localhost:8000/docs`: click **Authorize**, enter the demo email as *username* and the password, then use **Try it out** on any route.
2. **curl**: the copy-paste examples in [section 6](#6-examples).
3. **Any HTTP client** (Postman, Insomnia, `httpx`): use `Authorization: Bearer <access_token>`.

**Conventions**

- Get a token with `POST /v1/auth/login` (JSON) or `POST /v1/auth/token` (form, used by Swagger).
- Chat answers return **plain JSON by default**. Add `"stream": true` to receive Server-Sent Events.
- Add `"debug": true` to any chat message to get the full reasoning trace in the same response.
- **Abstention is not an error.** It is a `200` response with `"outcome": "abstained"`.

### Suggested 10-minute evaluation path

| # | Check | Where | What it proves |
|---|---|---|---|
| 1 | Ask a factual question about the IPO | Example 1 | Cited answer, evidence loop, trace |
| 2 | Open a cited source | Example 2 | Citations are real and verifiable |
| 3 | Ask something the prospectus cannot answer | Example 3 | **Abstention** after 3 evaluated attempts |
| 4 | Change the profile and ask the same concept twice | Example 4 | Personalized education |
| 5 | Ask about key dates, confirm, fast-forward time | Example 5 | Calendar proposals and reminders |
| 6 | Request a quiz and answer it | Example 6 | Engagement loop and mastery update |
| 7 | Ask for investment advice | Example 7 | Safe refusal |
| 8 | Read usage and cost | Example 8 | Meterless tracking |
| 9 | Check integrations and read the logs | Examples 9 and 10, section 7 | Zetaris and Meterless are live; step-by-step reasoning |
| 10 | (Optional) Ingest a new prospectus | Example 11 | The full admin pipeline |

**Demo data:** the seeded IPO is <!-- TODO: IPO name --> with a prospectus of <!-- TODO: N pages --> pages. Source: <!-- TODO: real public prospectus, or a synthetic sample (state clearly if synthetic) -->.

## 5. API Documentation

Interactive documentation: **`http://localhost:8000/docs`** (Swagger) and `http://localhost:8000/openapi.json`. The complete endpoint list (about 74 routes with parameters and responses) is in [`docs/api-map.md`](docs/api-map.md). The routes used in this evaluation:

**System and auth**

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/v1/meta` | Models, agent thresholds, enabled integrations |
| POST | `/v1/auth/register` | Create an account (returns tokens) |
| POST | `/v1/auth/login` | JSON login (returns tokens) |
| POST | `/v1/auth/token` | Form login for the Swagger Authorize button |

**Catalog and sources**

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/ipos` | List published IPOs |
| GET | `/v1/ipos/{ipo_id}` | One IPO with sample questions |
| GET | `/v1/ipos/{ipo_id}/key-facts` | Verified key facts with source pages |
| GET | `/v1/chunks/{chunk_id}` | The exact passage behind a citation |

**The agent**

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/ipos/{ipo_id}/ask` | **One-call chat**: reuses or creates a session, runs the agent |
| POST | `/v1/chat/sessions` | Create a session explicitly |
| POST | `/v1/chat/sessions/{id}/messages` | Send a message to the agent |
| PATCH | `/v1/chat/sessions/{id}` | Toggle `quiz_opt_in` |
| GET | `/v1/chat/messages/{message_id}/trace` | The reasoning record of an answer |

**Education**

| Method | Path | Purpose |
|---|---|---|
| GET / PUT | `/v1/users/me/profile` | Onboarding answers and language |
| GET | `/v1/glossary` | Glossary terms |
| GET | `/v1/me/knowledge` | Mastery per concept |
| PUT | `/v1/me/knowledge/{term_id}` | Set mastery manually |
| POST | `/v1/chat/sessions/{id}/quizzes` | Request a quiz (`mcq` or `open`) |
| POST | `/v1/quizzes/{quiz_id}/answer` | Answer a quiz and get graded |

**Calendar and usage**

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/calendar/proposals/{id}/confirm` | Confirm a proposal and schedule its reminder |
| GET | `/v1/calendar/reminders` | List reminders and their state |
| GET | `/v1/calendar/events.ics` | Export confirmed events |
| GET | `/v1/usage/me` | Tokens and cost |

**Admin (admin account only)**

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/admin/integrations/health` | Live health of DeepSeek, embeddings, Zetaris, Meterless, database |
| POST | `/v1/admin/reminders/run-due` | Run the reminder scheduler once; optional `now` fast-forwards time |
| POST | `/v1/admin/retrieval/debug` | Retrieval and evaluator scores only |
| POST | `/v1/admin/ipos/{id}/documents` | Upload a prospectus PDF (starts ingestion) |
| GET | `/v1/admin/jobs/{job_id}` | Ingestion progress |
| POST | `/v1/admin/demo/seed`, `/v1/admin/demo/reset` | Reload or clear demo data |

**Chat message fields**

| Field | Meaning |
|---|---|
| `content` | The answer, with `[n]` citation markers |
| `citations[]` | `chunk_id`, `page_number`, `section_path`, `quote_text` |
| `intent` | `prospectus_search`, `financial_education`, `calendar`, or `out_of_scope` |
| `outcome` | `answered`, `abstained`, `refused`, or `error` |
| `quiz` | A quiz object when one was attached (the answer is hidden until you answer) |
| `calendar_card` | A date the user can save, with `proposal_id` |
| `usage` | Input tokens, output tokens, cost in USD |
| `trace` | Present when `debug=true` |

**Errors** use one shape: `{ "error": { "code", "message", "request_id", "details" } }`.

## 6. Examples

Run these in order. They assume the demo data and a running server. `jq` is used to pick fields; without it, read the raw JSON.

### Setup

```bash
BASE=http://localhost:8000

# Log in as the demo user and as the admin
TOKEN=$(curl -s -X POST $BASE/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@mostro.ai","password":"Demo-2026!"}' | jq -r .access_token)

ADMIN=$(curl -s -X POST $BASE/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@mostro.ai","password":"Admin-2026!"}' | jq -r .access_token)

# The demo IPO
IPO_ID=$(curl -s $BASE/v1/ipos -H "Authorization: Bearer $TOKEN" | jq -r '.items[0].id')
echo $IPO_ID
```

### Example 1: a cited, factual answer with the reasoning trace

```bash
R=$(curl -s -X POST $BASE/v1/ipos/$IPO_ID/ask -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"What is the minimum subscription amount?","new_session":true,"debug":true}')

echo $R | jq '{intent, outcome, content, citations}'
echo $R | jq '.trace.tries'                # each retrieval attempt with its score and verdict

SESSION_ID=$(echo $R | jq -r .session_id)
MSG_ID=$(echo $R | jq -r .id)
```

**Look for:** `intent: prospectus_search`, `outcome: answered`, page citations, and in the trace at least one try whose evaluator score is **0.70 or above** with verdict `verified`. If an early try scored below 0.70, you will see the **rewritten query** of the retry.

### Example 2: verify a citation against the source

```bash
CHUNK_ID=$(echo $R | jq -r '.citations[0].chunk_id')
curl -s $BASE/v1/chunks/$CHUNK_ID -H "Authorization: Bearer $TOKEN" | jq
```

**Look for:** the exact passage and page number the answer relied on. Compare with the `quote_text` in the citation.

### Example 3: abstention (the agent refuses to guess)

```bash
curl -s -X POST $BASE/v1/ipos/$IPO_ID/ask -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"What will the share price be on its first day of trading?","debug":true}' \
  | jq '{outcome, content, tries: (.trace.tries | length), scores: [.trace.tries[].jev_score]}'
```

**Look for:** `outcome: abstained`, **3 tries** with scores below 0.70, and an honest message saying the prospectus does not contain this. No invented number.

### Example 4: personalized education

```bash
# Find the glossary term and the user's current mastery
TERM_ID=$(curl -s "$BASE/v1/glossary?q=oversubscription" -H "Authorization: Bearer $TOKEN" | jq -r '.items[0].id')

# A beginner profile
curl -s -X PUT $BASE/v1/users/me/profile -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"preferred_language":"en","onboarding_answers":{"experience":"beginner","risk_tolerance":"low","goal":"learn"}}' | jq

curl -s -X POST $BASE/v1/ipos/$IPO_ID/ask -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"Explain oversubscription","new_session":true}' | jq -r .content

# Now mark the concept as mastered and ask again
curl -s -X PUT $BASE/v1/me/knowledge/$TERM_ID -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"mastery_level":"mastered"}' | jq

curl -s -X POST $BASE/v1/ipos/$IPO_ID/ask -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"Explain oversubscription","new_session":true,"debug":true}' | jq -r '.content, .trace.nodes'
```

**Look for:** `intent: financial_education`. The first answer defines the concept in simple terms; the second is shorter and more direct because the user's knowledge state says it is mastered. The trace shows the profile and knowledge that were loaded.

### Example 5: calendar proposal, confirmation, reminder, `.ics`

```bash
R=$(curl -s -X POST $BASE/v1/ipos/$IPO_ID/ask -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"When does the offer open and close?","new_session":true}')
echo $R | jq '{intent, content, calendar_card}'

PROPOSAL_ID=$(echo $R | jq -r '.calendar_card.proposal_id')

curl -s -X POST $BASE/v1/calendar/proposals/$PROPOSAL_ID/confirm -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"timezone":"Africa/Douala","remind_before_minutes":1440}' | jq

curl -s $BASE/v1/calendar/reminders -H "Authorization: Bearer $TOKEN" | jq

# Fast-forward time so the reminder fires without waiting
curl -s -X POST $BASE/v1/admin/reminders/run-due -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"now":"2100-01-01T00:00:00Z"}' | jq

curl -s $BASE/v1/calendar/reminders -H "Authorization: Bearer $TOKEN" | jq '.items[].status'
curl -s $BASE/v1/calendar/events.ics -H "Authorization: Bearer $TOKEN"
```

**Look for:** `intent: calendar`, a `calendar_card` built from **verified** dates, a reminder in state `scheduled` after confirming, state `sent` after the fast-forward, and an `.ics` file with the event.

### Example 6: the quiz loop and mastery update

```bash
# On-demand multiple-choice quiz for the session from Example 1
Q=$(curl -s -X POST $BASE/v1/chat/sessions/$SESSION_ID/quizzes -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"type":"mcq"}')
echo $Q | jq                                  # the correct answer is NOT revealed

QUIZ_ID=$(echo $Q | jq -r .id)
OPTION_ID=$(echo $Q | jq -r '.options[0].id')

curl -s -X POST $BASE/v1/quizzes/$QUIZ_ID/answer -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d "{\"option_id\":\"$OPTION_ID\"}" | jq

curl -s $BASE/v1/me/knowledge -H "Authorization: Bearer $TOKEN" | jq

# Open-ended question, graded by the LLM
curl -s -X POST $BASE/v1/chat/sessions/$SESSION_ID/quizzes -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"type":"open"}' | jq .question

# Automatic quiz: opt in, then every answer carries one
curl -s -X PATCH $BASE/v1/chat/sessions/$SESSION_ID -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"quiz_opt_in":true}' | jq
```

**Look for:** the graded result with `correct`, `score`, `feedback`, `explanation`, and `mastery_before` versus `mastery_after`. Quizzes also appear automatically on every 4th turn of a session, as `quiz` in the chat response.

### Example 7: safe refusal of investment advice

```bash
curl -s -X POST $BASE/v1/ipos/$IPO_ID/ask -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"Should I put all my savings into this IPO?","new_session":true,"debug":true}' \
  | jq '{intent, outcome, content}'
```

**Look for:** `intent: out_of_scope`, `outcome: refused`, and an answer that explains it cannot give personal advice and offers to explain the risks from the prospectus instead.

### Example 8: tokens and cost (Meterless tracking)

```bash
echo $R | jq .usage                                           # one answer
curl -s "$BASE/v1/usage/me?group_by=route" -H "Authorization: Bearer $TOKEN" | jq
```

**Look for:** input tokens, output tokens, and cost per route and model.

### Example 9: sponsor integrations are live

```bash
curl -s $BASE/v1/admin/integrations/health -H "Authorization: Bearer $ADMIN" | jq
curl -s $BASE/v1/chat/messages/$MSG_ID/trace -H "Authorization: Bearer $TOKEN" | jq .zetaris_queries
```

**Look for:** `zetaris` and `meterless` with status `ok` and a latency, and the Zetaris queries (name, target, rows, duration) used by that specific answer.

### Example 10: inspect retrieval directly

```bash
curl -s -X POST $BASE/v1/admin/retrieval/debug -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d "{\"ipo_id\":\"$IPO_ID\",\"query\":\"minimum subscription amount\"}" | jq
```

**Look for:** the candidate chunks with pages and scores, the evaluator score, and the verdict.

### Example 11 (optional): ingest a new prospectus end to end

```bash
IPO=$(curl -s -X POST $BASE/v1/admin/ipos -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"company_name":"Test Co","issuer_country":"NG"}' | jq -r .id)

curl -s -X POST $BASE/v1/admin/ipos/$IPO/documents -H "Authorization: Bearer $ADMIN" \
  -F "file=@/path/to/prospectus.pdf" -F "title=Prospectus"          # returns a job_id

curl -s $BASE/v1/admin/jobs/<JOB_ID> -H "Authorization: Bearer $ADMIN" | jq     # poll until succeeded

curl -s -X POST $BASE/v1/admin/ipos/$IPO/key-facts/extract -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{}'                         # LLM extraction
curl -s $BASE/v1/admin/ipos/$IPO/key-facts -H "Authorization: Bearer $ADMIN" | jq
# review each fact with PATCH /v1/admin/key-facts/{id}  {"review_status":"verified", "reviewed_by":"examiner"}

curl -s -X PATCH $BASE/v1/admin/ipos/$IPO -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"status":"published"}'     # blocked until facts are verified
```

**Look for:** publishing is **refused** (`409 PUBLISH_PRECONDITION_FAILED`) until the required facts are verified. Ingestion of a long PDF can take several minutes because embedding calls are throttled to respect provider limits.

### Streaming (optional)

```bash
curl -N -X POST $BASE/v1/ipos/$IPO_ID/ask -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"What are the main risks?","stream":true}'
```

Events arrive as `route`, `retrieval` (one per evaluator attempt), `message.start`, `token`, `citation`, `quiz`, `calendar_card`, and `message.end`.

## 7. Logging and Tracing

The agent writes its reasoning to **both the console and the `logs/` folder**.

| Where | Format | Content |
|---|---|---|
| Console (`docker compose logs -f api`) | Human-readable | Everything |
| `logs/app.log` | JSON lines | Everything: requests, auth, scheduler, ingestion, errors |
| `logs/agent.log` | JSON lines | **Only the agent's step-by-step reasoning**: routing, rewrites, retrieval, evaluator verdicts, generation, quiz and calendar decisions, Zetaris queries, Meterless usage |
| `GET /v1/chat/messages/{id}/trace` | JSON | The same story for one answer, from the database |

**Watch the agent think**

```bash
tail -f logs/agent.log | jq -c '{event, node, try, score, verdict, duration_ms}'

# Everything for one answer
grep "<MESSAGE_ID>" logs/agent.log | jq -c .
```

**What a single answer looks like in `logs/agent.log`** (illustrative; `session_id` and other fields omitted for space)

```json
{"event":"agent.route.decided","intent":"prospectus_search","reason":"asks for a fact about the offer"}
{"event":"agent.rewrite","try":1,"rewritten":"minimum subscription amount per application"}
{"event":"retrieval.attempt","try":1,"via":"zetaris","top":[{"page":41,"score":0.62}]}
{"event":"agent.jev.verdict","try":1,"score":0.58,"verdict":"retry","reason":"passage describes eligibility, not the amount"}
{"event":"agent.rewrite","try":2,"rewritten":"minimum number of shares and amount payable on application"}
{"event":"retrieval.attempt","try":2,"via":"zetaris","top":[{"page":44,"score":0.88}]}
{"event":"agent.jev.verdict","try":2,"score":0.83,"verdict":"verified","reason":"states the minimum amount explicitly"}
{"event":"agent.context.built","sources":2,"context_tokens":1180,"profile_level":"beginner"}
{"event":"llm.request.completed","model":"deepseek","input_tokens":1450,"output_tokens":210,"duration_ms":1830}
{"event":"agent.postprocess.quiz","triggered":false,"reason":"turn 1 of 4"}
{"event":"meterless.usage","route":"prospectus_search","cost_usd":0.0009}
```

**Principles**

- Logs record **decisions with short reasons**, not raw model chain-of-thought.
- Passwords, tokens, API keys, and emails are never logged.
- Your own question text appears (truncated) in demo mode only.
- Each line carries `request_id`, `session_id`, `message_id`, and `ipo_id`, so you can follow one answer from the HTTP request to the final response.

## 8. Integration of Sponsor Technologies

| Sponsor | What it does in Mostro | Where | How to verify |
|---|---|---|---|
| **Zetaris** | **Query layer over our data stores.** Chunk retrieval for prospectus search and the user's profile and knowledge lookups for education go through the Zetaris harness, as predefined, parameterized, read-only queries. <!-- TODO: describe the actual connection and what is virtualized --> | `ai/integrations/zetaris/` | `zetaris` in `GET /v1/admin/integrations/health`; `trace.zetaris_queries` on any answer; `zetaris.query` events in `logs/agent.log`; `"via":"zetaris"` on every retrieval attempt |
| **Meterless** | **Usage and cost tracking around every LLM call**: tokens and cost per answer, per route, per user. <!-- TODO: describe the actual Meterless component used --> | `ai/integrations/meterless/` | `meterless` in the health check; `usage` on every message; `GET /v1/usage/me`; `meterless.usage` events in the logs |
| **Cursor** | **Development environment.** The repository was built in Cursor, guided by `AGENTS.md` (project rules) and `README.md` (full technical documentation). <!-- TODO: link evidence: commit history, screenshots, prompts --> | `AGENTS.md`, `README.md` | Repository history and files |
| **NVIDIA** | Not integrated in this submission (optional). <!-- TODO: update if a NVIDIA model or service is added --> | | |

**Other technology:** DeepSeek (language model), Voyage AI (embeddings), PostgreSQL with pgvector, FastAPI, LangGraph.

> `ZETARIS_ENABLED=true` is required for evaluation. A direct-database fallback exists only for local development and tests, and every trace states which path was used.

## 9. License and Acknowledgments

**License:** <!-- TODO: choose a license (for example MIT or Apache-2.0), add a LICENSE file, and name it here -->

**Acknowledgments**

- **GenAI.Works** for organizing the Open Agent Hackathon.
- **Zetaris** and **Meterless** for the technologies integrated in this project, and **NVIDIA** and **Cursor** (SpaceX AI) for supporting the event and the tooling. <!-- TODO: align names with the official sponsor list -->
- **DeepSeek** and **Voyage AI** for the language and embedding models.
- Open-source projects used: FastAPI, LangGraph, PostgreSQL, pgvector, SQLAlchemy, Alembic, structlog, and Docling.
- Prospectus content used in the demo: <!-- TODO: source and permission/licence of the demo document -->

## 10. Contact Information

| | |
|---|---|
| **Team** | <!-- TODO --> |
| **Lead developer** | <!-- TODO: name --> |
| **Email** | <!-- TODO --> |
| **Repository** | <!-- TODO --> |
| **Demo or video** | <!-- TODO --> |

For questions during evaluation, contact <!-- TODO: preferred channel and expected response time -->.
