# Investor Risk Questionnaire

Questionnaire version: **`2026-10-v1`**. Source of truth: [`app/services/risk_questionnaire.py`](../app/services/risk_questionnaire.py).

8 multiple-choice questions in three sections. Only 5 are scored; the 3 general questions feed constraint rules. Option scores and weights are never sent to the client — `GET /profile/questionnaire` returns only question/option IDs and labels.

Clients submit answers as `{ "questionnaire_version": "2026-10-v1", "answers": { "<question_id>": "<option_id>", ... } }`. All 8 questions must be answered.

---

## Section 1 — General information (not scored)

### Q1. Age bracket
- **ID:** `age_bracket`
- **Prompt:** What is your age bracket?
- **Weight:** 0

| Option ID | Label |
|---|---|
| `lt_25` | <25 |
| `25_34` | 25–34 |
| `35_44` | 35–44 |
| `45_54` | 45–54 |
| `55_64` | 55–64 |
| `65_plus` | 65+ |

**Usage:** Stored with the profile for audit. No constraint rule references it in this version.

### Q2. Investment horizon
- **ID:** `investment_horizon`
- **Prompt:** What is your investment horizon?
- **Weight:** 0

| Option ID | Label |
|---|---|
| `lt_1y` | <1 year |
| `1_3y` | 1–3 years |
| `3_5y` | 3–5 years |
| `5_10y` | 5–10 years |
| `10y_plus` | 10+ years |

**Usage:** `lt_1y` triggers **`short_horizon_cap`** — final risk level capped at 2.

### Q3. Investment amount as % of total savings
- **ID:** `savings_share`
- **Prompt:** What share of your total savings is this investment?
- **Weight:** 0

| Option ID | Label |
|---|---|
| `lt_10` | <10% |
| `10_25` | 10–25% |
| `25_50` | 25–50% |
| `gt_50` | >50% |

**Usage:** `gt_50` triggers **`savings_concentration_reduction`** — final risk level reduced by 1 (floor 1).

---

## Section 2 — Risk tolerance (scored, high weight)

### Q4. Drawdown reaction
- **ID:** `drawdown_reaction`
- **Prompt:** The stock market falls 31% in three months. You hold an investment that lost 31%. What do you do?
- **Weight:** ×2

| Option ID | Label | Score | Contribution |
|---|---|---|---|
| `sell_all` | Sell all | 1 | 2 |
| `sell_some` | Sell some | 2 | 4 |
| `hold` | Hold | 3 | 6 |
| `buy_more` | Buy more | 4 | 8 |

### Q5. Return / risk trade-off
- **ID:** `return_tradeoff`
- **Prompt:** Choose between: (A) 20% expected return with 5% loss risk, or (B) 50% expected return with 15% loss risk.
- **Weight:** ×4 (double the other tolerance questions)

| Option ID | Label | Score | Contribution |
|---|---|---|---|
| `a` | A | 1 | 4 |
| `b` | B | 3 | 12 |

### Q6. Loss tolerance (self-assessment)
- **ID:** `loss_tolerance`
- **Prompt:** How much loss can you tolerate in a year?
- **Weight:** ×2

| Option ID | Label | Score | Contribution |
|---|---|---|---|
| `none` | None | 1 | 2 |
| `up_to_5` | Up to 5% | 2 | 4 |
| `up_to_15` | Up to 15% | 3 | 6 |
| `up_to_30` | Up to 30% | 4 | 8 |
| `over_30` | More than 30% | 5 | 10 |

---

## Section 3 — Risk capacity (scored, medium weight)

### Q7. Emergency fund
- **ID:** `emergency_fund`
- **Prompt:** Do you have an emergency fund covering 6+ months of expenses?
- **Weight:** ×1

| Option ID | Label | Score | Contribution |
|---|---|---|---|
| `yes` | Yes | 2 | 2 |
| `no` | No | 0 | 0 |

### Q8. Near-term withdrawal
- **ID:** `near_term_withdrawal`
- **Prompt:** Will you need to withdraw this money within 2 years?
- **Weight:** ×1

| Option ID | Label | Score | Contribution |
|---|---|---|---|
| `yes` | Yes | 0 | 0 |
| `no` | No | 2 | 2 |

**Usage:** besides its score, `yes` triggers **`near_term_withdrawal_cap`** — final risk level capped at 2.

---

## Scoring

1. **Raw score** = sum of option scores for Q4–Q8. Range **3–16**.
2. **Weighted score** = sum of `score × weight` for Q4–Q8. Range **8–34** (tolerance contributes up to 30, capacity up to 4).
3. **Base level** from the weighted score:

| Level | Label | Weighted score |
|---|---|---|
| 1 | Conservative | 8–12 |
| 2 | Moderately Conservative | 14–18 |
| 3 | Moderate | 20–24 |
| 4 | Moderately Aggressive | 26–28 |
| 5 | Aggressive | 30–34 |

All achievable weighted scores are even; thresholds are inclusive lower bounds of 14, 19, 25 and 29.

4. **Constraints**, applied in this order:

| Rule ID | Trigger | Effect |
|---|---|---|
| `short_horizon_cap` | Q2 = `lt_1y` | Cap level at 2 |
| `near_term_withdrawal_cap` | Q8 = `yes` | Cap level at 2 |
| `savings_concentration_reduction` | Q3 = `gt_50` | Level − 1 (floor 1) |

Every triggered rule is recorded in `applied_constraints`.

### Examples

| Answers | Weighted | Base level | Constraints | Final |
|---|---|---|---|---|
| Buy more, B, >30%, fund yes, withdraw no, horizon 10+y, savings <10% | 34 | 5 | — | **5 Aggressive** |
| Same, but horizon <1 year | 34 | 5 | `short_horizon_cap` | **2 Moderately Conservative** |
| Same, but horizon <1 year and savings >50% | 34 | 5 | cap, then reduction | **1 Conservative** |
| Same, but savings >50% | 34 | 5 | `savings_concentration_reduction` | **4 Moderately Aggressive** |
| Sell all, A, none, fund no, withdraw no | 10 | 1 | — | **1 Conservative** |

---

## Audit trail

Each submission stores:
- `risk_profiles` — version, questionnaire version, raw/weighted score, level, label, full raw `answers` JSON, `applied_constraints`, timestamp.
- `risk_profile_answers` — one row per question: option ID, option label, option score, weight, contribution.
- `audit_logs` — `risk_profile_submitted` / `risk_profile_reassessed` event with base level, final level and triggered rules.
