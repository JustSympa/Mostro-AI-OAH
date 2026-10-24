# Mostro AI

**A trustworthy, prospectus-grounded assistant that helps people in Africa understand IPOs, avoid scams, and learn about investing.**

This document addresses to the examiner of this project. It provides straight anwsers to everything the examiner has to check.

---

## Table of contents

1. [Why Mostro exists](#1-why-mostro-exists)
2. [Objectives and non-goals](#2-objectives-and-non-goals)
3. [Installation Instructions](#3-intallation-instructions)
4. [Usage Instructions](#4-usage-instructions)
5. [API Documentation](#5-api-documentation)
6. [Examples](#6-examples)
7. [Logging and Tracing](#7-logging-and-tracing)
8. [Integration of Sponsor Technologies](#8-sponsor-tech)
9. [License and Acknowledgments](#9-License-and-acknowledgments)
10. [Contact Information](#contact-information)

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

