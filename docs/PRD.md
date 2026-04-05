# Stratalyx — Product Requirements Document

**Version:** 1.1.0
**Status:** Active Development — Pre-Launch
**Last Updated:** March 2026
**Owner:** Stratalyx Product
**Classification:** Internal — Engineering Reference

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Success Metrics](#3-goals-and-success-metrics)
4. [Users and Personas](#4-users-and-personas)
5. [Feature Requirements](#5-feature-requirements)
6. [Legal and Compliance Requirements](#6-legal-and-compliance-requirements)
7. [Business Model](#7-business-model)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Technical Architecture](#9-technical-architecture)
10. [Data Requirements](#10-data-requirements)
11. [API Contracts](#11-api-contracts)
12. [UI/UX Requirements](#12-uiux-requirements)
13. [Security Requirements](#13-security-requirements)
14. [Testing Requirements](#14-testing-requirements)
15. [Roadmap](#15-roadmap)
16. [Out of Scope](#16-out-of-scope)
17. [Open Questions](#17-open-questions)
18. [Decision Log](#18-decision-log)

---

## 1. Product Overview

### 1.1 What is Stratalyx?

Stratalyx is a **multi-investor, multi-LLM stock framework analysis platform** that applies the
documented investment philosophies of legendary investors to any publicly traded US stock. It
combines real-time financial data from Financial Modeling Prep (FMP) with AI analysis to produce
structured, framework-aligned educational research.

### 1.2 Core Value Proposition

> "See how Warren Buffett, Benjamin Graham, or Peter Lynch would evaluate any stock — grounded in
> real financial data, not guesswork. Learn the framework. Apply the lens. Think like a legend."

Unlike generic AI chatbots or screeners, Stratalyx:
- Applies a **specific, documented investor framework** rather than a generic "is this a good stock" prompt
- Injects **verified live financial data** (P/E, ROE, FCF, margins, growth rates) into every analysis
- Produces **structured, comparable outputs** across multiple strategies for the same stock
- Educates users on **why** each criterion matters, not just what the framework says
- Positions all outputs as **educational research**, not personalised investment recommendations

### 1.3 Legal Positioning

Stratalyx is an **educational research and framework-analysis tool**. It does not:
- Provide personalised investment advice
- Recommend specific securities for specific investors
- Operate as a Registered Investment Adviser (RIA) under the Investment Advisers Act of 1940

All analysis outputs are clearly labelled as AI-generated educational content applying documented
public-domain investment frameworks. Users are required to acknowledge this at sign-up. See
Section 6 for full compliance requirements.

### 1.4 Current State

The application is a fully functional React SPA with an Express proxy backend. It runs locally. It
has a complete test suite (113 tests), full TypeScript strict-mode compliance, and 120 curated
stocks in the screener with dynamic full US market loading via FMP.

**Pre-launch requirements before taking payments:** legal review, compliance language implementation,
production deployment (Vercel + Railway), Stripe billing integration, and email capture.

---

## 2. Problem Statement

### 2.1 The Gap We Fill

Financially literate self-directed investors face three compounding problems:

1. **Data without interpretation** — financial data is abundant and free (Yahoo Finance, Finviz,
   Macrotrends). What people cannot get is interpretation through a trusted mental model. A retail
   investor staring at a P/E of 32 doesn't know if that's cheap or expensive for this company, in
   this sector, at this moment.

2. **Frameworks in books, not tools** — the investment philosophies of Buffett, Graham, Lynch et al.
   are extensively documented in books. They are not operationalised into actionable screening tools
   that apply to real companies with real current data.

3. **AI without grounding** — existing AI tools hallucinate financial figures. Stratalyx grounds
   every analysis in verified live financial data before the AI makes a single interpretive claim.

### 2.2 The Emotional Job-to-be-Done

Users are not buying analysis. They are buying **validated conviction** — the feeling that their
investment thinking has been checked against a legendary investor's criteria. This is a different
purchase psychology and it commands higher willingness to pay than a data terminal.

### 2.3 What We Are Not

- Not a trading platform or broker
- Not a financial advisor or registered investment adviser
- Not a real-time price streaming service
- Not a portfolio performance tracker
- Not a social/community platform (yet)

---

## 3. Goals and Success Metrics

### 3.1 Product Goals

| Goal | Description |
|------|-------------|
| G-01 | Users can apply any investor framework to any US-listed stock in under 30 seconds |
| G-02 | Every analysis is grounded in real financial data when an FMP key is present |
| G-03 | Users can compare how two different investors would evaluate the same stock |
| G-04 | The Strategies page functions as a standalone educational resource |
| G-05 | The platform is extensible — new investors, providers, and data sources can be added without architectural changes |
| G-06 | All outputs are clearly framed as educational framework analysis, not investment advice |
| G-07 | Re-engagement triggers bring users back within 7 days of their last analysis |

### 3.2 Technical Success Metrics (v1.0)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Analysis completion rate | >95% | Successful JSON parse / total attempts |
| Live data fetch success rate | >98% | FMP responses / total attempts |
| p95 analysis latency (with live data) | <6s | Server-side timing |
| p95 analysis latency (AI only) | <4s | Server-side timing |
| Test suite pass rate | 100% | CI on every commit |
| TypeScript strict mode errors | 0 | `tsc --noEmit` |
| Unit test coverage | ≥90% | Jest coverage report |

### 3.3 Business Success Metrics (v1.1 — Post-Launch)

| Metric | Target (Month 3) | Target (Month 12) |
|--------|-----------------|-------------------|
| Free registered users | 1,000 | 10,000 |
| Paying subscribers (Pro) | 30 | 500 |
| Monthly MRR | $570 | $9,500 |
| Monthly churn (Pro) | <8% | <5% |
| Free-to-paid conversion | >2% | >3% |
| D7 retention (free users) | >25% | >35% |
| D30 retention (paid users) | >70% | >80% |

---

## 4. Users and Personas

### 4.1 Primary Persona — The Informed Hobbyist Investor (REVISED)

**Name:** Jordan, 33
**Background:** Marketing manager or software professional, earns $90K–$160K, has $30K–$150K
invested across Fidelity, Robinhood, or Schwab. Has read at least one investing book. Has strong
opinions about popular stocks. Active on financial Twitter/X and Reddit.
**Goals:** Feel like they are doing real, systematic analysis — not just vibes + Googling. Reduce
the emotional component of investment decisions. Learn through the process.
**Pain points:** Knows what P/E means but doesn't know what a "good" P/E looks like for this
specific company. Wants a framework but finds book criteria abstract without real numbers.
**How they use Stratalyx:** Runs a stock through 2–3 investor frameworks when researching a
position. Checks the watchlist after earnings. Shares a particularly interesting analysis result on
Twitter/X or Reddit.
**Willingness to pay:** $15–$25/month for something they use weekly.
**Technical comfort:** Medium — comfortable with apps, not with API keys.

### 4.2 Secondary Persona — The Finance Student

**Name:** Priya, 22
**Background:** Finance or economics undergraduate or early-career analyst. Learning fundamental
analysis. Writing investment research papers or blog posts.
**Goals:** Understand how legendary investors think. See real frameworks applied to real companies
with real numbers. Build a mental model for evaluating companies.
**How they use Stratalyx:** Uses the Strategies Library as a study resource. Runs analyses on
well-known stocks to see framework application. May share results in class or on LinkedIn.
**Willingness to pay:** Low (student). Valuable as a word-of-mouth vector. Should be
on the free tier.
**Technical comfort:** Medium.

### 4.3 Tertiary Persona — The Fintech Developer

**Name:** Marcus, 29
**Background:** Full-stack developer building fintech tools or personal projects.
**Goals:** Understand the architecture. Extend or fork the platform. Contribute investor frameworks.
**How they use Stratalyx:** GitHub repository, Strategies Library for framework validation, open
source contribution if that path is pursued.
**Technical comfort:** Expert.

---

## 5. Feature Requirements

### 5.1 Core Features (v1.0 — Production Ready)

#### F-01: Strategy Screener

**Priority:** P0
**Description:** Full US market stock list (FMP-powered) with search, sector filter, sort, and
pagination. Active investor strategy banner. Analysis trigger from any row.

**Acceptance Criteria:**
- [x] Starts with 120 curated stocks, expands to full US market via FMP `/stock/list`
- [x] 24-hour localStorage cache for full stock list
- [x] Search filters by ticker and company name in real time
- [x] Sector filter chips with "All" option
- [x] Sort by Default / Score / Ticker A–Z
- [x] Pagination: 100 per page, "Load more" button
- [x] Footer shows "Showing X of Y · Z total" with loading indicator
- [x] Active investor banner updates immediately on strategy selection
- [x] "Analyze" button opens the Analyzer Modal pre-filled with the ticker
- [x] Live data status indicator reflects whether FMP key is configured
- [x] All 11 investor strategies selectable via pill buttons

#### F-02: Strategy Analyzer Modal

**Priority:** P0
**Description:** Full-screen modal that accepts any ticker, fetches live financial data, constructs
an investor-specific prompt, and returns a structured AI analysis with educational framing.

**Acceptance Criteria:**
- [x] Accepts any US ticker input (validated and sanitised)
- [x] Enter key triggers analysis
- [x] Collapsible settings panel (collapsed when ticker pre-filled)
- [x] Auto-runs analysis on mount when ticker is pre-filled
- [x] Loading skeleton with phase labels during analysis
- [x] Result displays: framework alignment verdict, strategy score, market price, intrinsic value
      range, margin of safety, moat assessment, screen results, KPI grid, strengths, risks, thesis
- [x] Data source labelled: "FMP Live Data" or "AI Framework Estimate"
- [x] Shareable URL: `#/analysis/TICKER/investorId`
- [x] Share button copies link to clipboard
- [x] Result saved to History automatically
- [x] Modal closes on backdrop click or Escape key
- [ ] **All verdict language uses framework-alignment framing (see Section 6.3)**

#### F-03: Strategies Research Library

**Priority:** P0
**Description:** Educational resource presenting all investor profiles with biography, philosophy,
screening rules, and financial formulas.

**Acceptance Criteria:**
- [x] All 11 investors listed in sidebar
- [x] Detail panel with 3 tabs: Overview, Rules, Formulas
- [x] Hero strip shows AUM, CAGR, era, style as stat pills
- [x] "Use strategy →" button sets active investor AND navigates to Screener

#### F-04: Watchlist

**Priority:** P1
- [x] Star button on every screener row toggles watchlist membership
- [x] Watchlist badge on nav tab shows count
- [x] Suggested popular stocks on empty state
- [x] Each card shows key financial metrics
- [x] Analysis CTA per card

#### F-05: Analysis History

**Priority:** P1
- [x] All completed analyses displayed as cards sorted by recency
- [x] Clicking a card re-opens the Analyzer Modal for that ticker

#### F-06: Strategy Comparisons

**Priority:** P1
- [x] Side-by-side comparison of two investor analyses on the same stock
- [x] Score delta with amber warning for divergences > 3 points

#### F-07: Navigation

**Priority:** P0
- [x] All 5 nav tabs functional
- [x] Cmd/Ctrl+K opens Analyzer Modal
- [x] Badge counts on Watchlist, History, Comparisons

### 5.2 Pre-Launch Requirements (Must complete before monetising)

#### F-08: Legal Compliance Language

**Priority:** P0 — BLOCKING for monetisation
**Description:** Reframe all output language and add mandatory disclosures throughout the product.
See Section 6 for full requirements.

#### F-09: User Authentication

**Priority:** P0 for v1.1
**Description:** Email + password sign-up with Supabase Auth. Required for persistent history,
paid subscriptions, and re-engagement notifications.

**Acceptance Criteria:**
- [ ] Email + password sign-up and sign-in
- [ ] "Continue with Google" OAuth option
- [ ] Email verification on sign-up
- [ ] Password reset flow
- [ ] Mandatory ToS + disclaimer acknowledgment checkbox at sign-up
- [ ] JWT-based session via Supabase

#### F-10: Freemium Billing (Stripe)

**Priority:** P0 for v1.1
**Description:** Stripe Checkout integration. Free tier with usage limits, Pro tier with
unlimited access.

**Pricing:**
- **Free:** 3 analyses/month, Buffett + Lynch frameworks only, no history export
- **Pro ($19/month or $149/year):** Unlimited analyses, all frameworks, history export,
  watchlist sync, priority queue
- **Teams ($49/seat/month):** Shared watchlists, team history, API access — future tier

**Acceptance Criteria:**
- [ ] Usage counter tracked per user (server-side, not localStorage)
- [ ] Hard paywall at 3 analyses/month for free users
- [ ] "Upgrade to Pro" modal triggered at paywall
- [ ] Stripe Checkout redirect on upgrade click
- [ ] Stripe webhook handling: subscription created / cancelled / payment failed
- [ ] Subscription status stored in user record (Supabase)
- [ ] Pro badge visible in navbar for paying users
- [ ] Annual plan available at 35% discount

#### F-11: Email Capture (Pre-Auth)

**Priority:** P0 — Before auth is built
**Description:** Simple email capture with lead magnet for users who visit the product before
account creation is ready. Used to build a pre-launch list.

**Lead magnet:** "Free PDF: How Buffett Would Evaluate the Magnificent 7" — 7 one-page framework
analyses generated from the product.

#### F-12: Re-engagement Notifications (Retention-Critical)

**Priority:** P1 for v1.1
**Description:** Event-triggered emails that bring users back to the product. This is the single
most important retention mechanism.

**Notification types:**
- **Earnings alert:** When a stock in a user's watchlist reports quarterly earnings, re-run the
  analysis and send: "AAPL Q2 earnings released — Buffett score changed from 7.1 → 8.4. Revenue
  grew 12% YoY." (Requires earnings calendar endpoint from FMP)
- **Price-movement alert:** When a watchlisted stock moves >5% in a day, notify the user and
  show the current framework score vs. the score at time of last analysis
- **Weekly digest:** Sunday evening email showing watchlist scores, any score changes, and
  1 featured analysis to re-engage inactive users

**Acceptance Criteria:**
- [ ] Earnings calendar fetched from FMP `/earning_calendar` weekly
- [ ] Automated re-analysis triggered server-side when earnings date passes
- [ ] Email sent via Resend or Postmark (transactional email provider)
- [ ] Users can configure notification preferences (on/off per type)
- [ ] Unsubscribe link in every email (CAN-SPAM / GDPR requirement)

#### F-13: Portfolio Analysis Mode

**Priority:** P1 for v1.1 — High perceived-value feature
**Description:** User inputs up to 10 holdings. The product runs all of them through the active
investor framework and produces a portfolio alignment score.

**Acceptance Criteria:**
- [ ] Input: up to 10 ticker symbols
- [ ] Output: per-stock framework score, portfolio aggregate score, best/worst aligned holdings
- [ ] Visual breakdown: which holdings pass all criteria, which fail which rules
- [ ] CTA: "Analyze underperforming holdings in detail"

#### F-14: Analysis Output Format Improvement (Retention)

**Priority:** P1 — Quick win
**Description:** Lead with structured data, not prose. Users should be able to read the key
output in 15 seconds on mobile.

**New output structure:**
1. Framework Alignment header with score badge + verdict badge (above the fold)
2. 5 key framework signals in a scannable list (pass/fail per criterion, bold, icon)
3. 2-sentence thesis summary
4. "Read full analysis ↓" expand for the detailed prose

### 5.3 Future Features (v2.0)

| ID | Feature |
|----|---------|
| F-15 | Custom investor framework builder |
| F-16 | Historical analysis replay (how would Buffett rate AAPL in 2015?) |
| F-17 | Multi-stock batch analysis |
| F-18 | Collaborative watchlists |
| F-19 | Public API / developer access |
| F-20 | Mobile native app (React Native or Expo) |
| F-21 | Additional investor frameworks (target: 30+ by v2.0) |
| F-22 | Broker API integration (read-only portfolio import) |

---

## 6. Legal and Compliance Requirements

**This section is BLOCKING for any monetisation. Do not charge money before completing this
section. Consult a fintech-specialist securities attorney before launch.**

### 6.1 Regulatory Background

Under the **Investment Advisers Act of 1940**, anyone who provides investment advice for
compensation and is in the business of giving investment advice must register as an RIA with the
SEC or state regulators. The SEC's position is that the AI/algorithm origin of advice does not
remove the adviser-status obligation from the platform operator.

Stratalyx avoids this by:
1. Positioning outputs as **educational framework application**, not personalised recommendations
2. Reframing all verdict language (see 6.3)
3. Adding mandatory disclosures at every output touchpoint
4. Requiring explicit user acknowledgment at sign-up

### 6.2 Pre-Launch Legal Checklist

- [ ] **Consult a fintech securities attorney** (2-hour engagement, ~$600–$1,000) before
      launching paid tiers. Confirm the educational positioning is sufficient.
- [ ] **Draft Terms of Service** that explicitly disclaim investment adviser status, establish
      educational purpose, and include arbitration clause
- [ ] **Draft Privacy Policy** that covers email collection, analytics data, FMP data processing,
      and LLM data forwarding (Anthropic API ToS compliance)
- [ ] **Review FMP API Terms of Service** — confirm: storing API responses, displaying in UI,
      and forwarding to third-party LLMs are all permitted uses
- [ ] **Review Anthropic API Terms** — confirm financial analysis use case is permitted
- [ ] **State-by-state review** — New York, California, and Massachusetts have the most
      aggressive securities law enforcement. Confirm no blue-sky law issues.
- [ ] **GDPR basics** if any EU users are expected: cookie consent, data deletion endpoint,
      privacy policy in plain language

### 6.3 Required Language Changes (Code Changes)

The following language must be changed throughout the product. These are not optional.

| Current language | Required replacement |
|-----------------|---------------------|
| `BUY` verdict | `Strong Framework Alignment` |
| `HOLD` verdict | `Mixed Framework Signals` |
| `AVOID` verdict | `Weak Framework Alignment` |
| "Intrinsic value: $185" | "Estimated fair value under this framework's assumptions: $185" |
| "Warren Buffett would buy this" | "This stock meets the key criteria of Buffett's documented framework" |
| "Analysis" (where it implies recommendation) | "Framework Evaluation" |

**Note:** The score (0–10) and the prose thesis can remain as-is. They are clearly analytical
rather than directive. The verdict badge is the highest-risk element.

### 6.4 Required Disclaimers

The following disclaimer must appear at **minimum** in these locations:
1. Before every analysis is generated (modal, above the Run Analysis button)
2. Watermarked or appended on every shareable analysis URL
3. In the Terms of Service (with explicit checkbox acknowledgment at sign-up)
4. In the product footer

**Required disclaimer text:**
> "Stratalyx applies documented public investment frameworks for educational purposes only. All
> outputs are AI-generated and do not constitute personalised investment advice, a solicitation,
> or a recommendation to buy or sell any security. Stratalyx is not a registered investment
> adviser. Past performance of any investor or framework does not guarantee future results. Always
> do your own research and consult a qualified financial adviser before making investment
> decisions."

### 6.5 Investor Name / Likeness Considerations

Using the names and documented frameworks of public figures like Buffett, Graham, and Lynch is
generally acceptable as educational commentary on publicly documented philosophies. However:

- Do NOT imply any endorsement by or affiliation with the living investors or their firms
- Do NOT generate analysis text in first person as if written by the investor
  ("I, Warren Buffett, would...") — use third person ("Under Buffett's documented framework...")
- Do NOT directly contradict a living investor's publicly stated current position without a clear
  disclaimer that this is a framework simulation, not their actual view
- Add a note in the Strategies Library: "Framework criteria are based on publicly documented
  writings, interviews, and letters. This is not affiliated with or endorsed by any investor or
  their firm."

---

## 7. Business Model

Full business strategy details in `docs/BUSINESS.md`. Summary:

### 7.1 Model: Freemium SaaS

**Free tier:** 3 analyses/month, 2 frameworks (Buffett + Lynch), no history export
**Pro ($19/month or $149/year):** Unlimited analyses, all frameworks, history, portfolio analysis
**Teams ($49/seat/month):** Shared features, API access — future

### 7.2 Monetisation Sequence

1. **Phase 1 (Now → Month 1):** Email capture only. Build pre-launch list. No payment friction.
2. **Phase 2 (Month 1–2):** Deploy with free tier. No paywall. Collect usage data.
   Understand how people actually use the product.
3. **Phase 3 (Month 2–3):** Add Stripe paywall. Convert early active users with a founder
   discount ($9/month for life for the first 50 subscribers).
4. **Phase 4 (Month 3+):** Full $19/month Pro tier. Add annual discount.

### 7.3 Open Source Strategy

The plan is to open-source the **core framework engine** (investor framework definitions, prompt
templates, financial data pipeline) after achieving 100 paying customers and validating product-
market fit. This:
- Builds the founder's name in the developer community
- Attracts contributors who add frameworks (free R&D)
- Does not give away the hosted product's UX, billing, notifications, or data layer

The hosted SaaS at stratalyx.ai remains the paid product. The GitHub repo becomes the distribution
moat. Reference: Ghost, Cal.com, Plausible Analytics open-core model.

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Requirement | Target |
|-------------|--------|
| Analysis with live data (p95) | < 6 seconds end-to-end |
| Analysis without live data (p95) | < 4 seconds |
| FMP data fetch (5 concurrent calls, p95) | < 2 seconds |
| Initial page load (LCP) | < 2.5 seconds |
| Cumulative Layout Shift | < 0.1 |
| Total Blocking Time | < 300ms |

### 8.2 Reliability

- API proxy must handle FMP and Claude errors gracefully with user-friendly messages
- FMP cache (1hr TTL) must prevent redundant calls within a session
- Analysis must never crash the app — all errors caught and displayed in error state
- React Error Boundaries must wrap all screens and the modal

### 8.3 Mobile Responsiveness

Financial decisions happen on the go. The product must be fully usable on mobile:
- All screens scroll and render correctly on 375px+ viewports
- Analysis output scannable in 15 seconds without scrolling (score + 5 signals above fold)
- Touch targets minimum 44×44px
- No horizontal scroll on any screen

### 8.4 Accessibility

- All interactive elements must be keyboard navigable
- All buttons must have accessible labels
- Colour contrast must meet WCAG AA (4.5:1 for normal text)
- Modal must trap focus when open

### 8.5 Browser Support

- Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- Mobile: iOS Safari 15+, Chrome for Android 100+

---

## 9. Technical Architecture

### 9.1 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│  React 18 + TypeScript + Vite                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Screener │ │Strategies│ │Watchlist │  ...        │
│  └──────────┘ └──────────┘ └──────────┘            │
│         ↓ fetch('/api/claude')                      │
│         ↓ fetch('/api/fmp/*')                       │
└─────────────────────────────────────────────────────┘
          ↓ Vite dev proxy (/api → :3001)
┌─────────────────────────────────────────────────────┐
│              Express Proxy  :3001                   │
│  POST /claude  →  Anthropic API  (key: server-side) │
│  GET  /fmp/*   →  FMP API        (key: server-side) │
│  GET  /health  →  status check                      │
│  In-memory FMP cache (1hr TTL)                      │
└─────────────────────────────────────────────────────┘
          ↓                        ↓
┌──────────────────┐    ┌────────────────────────────┐
│  Anthropic API   │    │  Financial Modeling Prep   │
│  Claude Haiku    │    │  /profile, /ratios-ttm,    │
│  (multi-LLM      │    │  /income-statement,        │
│   support built  │    │  /cash-flow-statement,     │
│   in)            │    │  /quote, /stock/list       │
└──────────────────┘    └────────────────────────────┘
```

**v1.1 additions:**
```
┌──────────────────┐    ┌────────────────────────────┐
│  Supabase        │    │  Stripe                    │
│  Auth + Postgres │    │  Billing + Webhooks        │
└──────────────────┘    └────────────────────────────┘
          ↓
┌──────────────────┐
│  Resend/Postmark │
│  Transactional   │
│  Email           │
└──────────────────┘
```

### 9.2 State Management

Single `useReducer` at the root. State shape defined in `AppState`. All mutations go through typed
`Action` dispatches. Will be segmented when auth + persistence state is added in v1.1.

### 9.3 Data Flow — Analysis Request

```
User enters ticker
       ↓
clean(ticker)              — sanitise input
       ↓
fetchLiveData(ticker)      — 5 concurrent FMP calls via /api/fmp/*
       ↓
buildLiveDataBlock(data)   — format into structured text block
       ↓
buildPrompt(inv, liveBlock)— inject investor ctx + live data
       ↓
POST /api/claude           — proxy to Anthropic
       ↓
extractJson(response)      — parse first valid JSON from response text
       ↓
sanitiseResult(raw)        — clamp scores, enforce verdict enum, coerce arrays
       ↓
dispatch SAVE              — store in analyses[ticker:investorId]
       ↓
Render result
```

---

## 10. Data Requirements

### 10.1 Investor Data

All 11 investor profiles are static constants in `src/constants/investors.ts`. Each contains
biographical information, visual identity, strategy metadata, screening rules, financial equations,
and the LLM prompt context (`ctx` field).

**Data source:** Publicly documented investment books, annual reports, interviews, and academic
research. All figures are referenced to public sources.

**Disclaimer to add to Strategies Library:** "Framework criteria are based on publicly documented
writings, letters, and interviews. Not affiliated with or endorsed by any investor or their firm."

### 10.2 Stock Screener Data

120 curated stocks in `src/constants/stocks.ts` serve as the baseline. `useStockList` hook
dynamically fetches the full FMP US stock list (NYSE, NASDAQ, AMEX, NYSE ARCA — common stocks
only), merges it with the static list, and caches it in localStorage for 24 hours.

### 10.3 Live Financial Data (FMP)

5 FMP endpoints called per analysis:

| Endpoint | Data retrieved | Cache TTL |
|----------|---------------|-----------|
| `GET /profile/{symbol}` | Company name, sector, description, price, mktCap, beta | 1hr |
| `GET /ratios-ttm/{symbol}` | P/E, P/B, ROE, margins, debt ratios, PEG | 1hr |
| `GET /income-statement/{symbol}?limit=5` | Revenue, EPS, operating income (5yr) | 1hr |
| `GET /cash-flow-statement/{symbol}?limit=3` | FCF, capex, operating cash flow | 1hr |
| `GET /quote/{symbol}` | Real-time price, market cap | 1hr |

Additional endpoints (v1.1):
- `GET /earning_calendar` — for earnings-triggered re-analysis notifications

---

## 11. API Contracts

### 11.1 POST /api/claude

**Request:** `{ prompt: string, model: string }`
**Response:** Anthropic `/v1/messages` response — `data.content[].text` contains analysis JSON.
**Errors:** 503 (key not configured), 502 (upstream unreachable), 4xx passthrough

### 11.2 GET /api/fmp/:path

**Request:** Any valid FMP v3 path. Query params passed through. `apikey` injected server-side.
**Response:** Raw FMP API response, cached 1hr.
**Cache header:** `X-Cache: HIT | MISS`

### 11.3 GET /health

**Response:** `{ status, claude: boolean, fmp: boolean, cacheSize, uptime, time }`

---

## 12. UI/UX Requirements

### 12.1 Design System

All design tokens in `src/constants/colors.ts` as the `C` object. No external CSS framework.
All styles are inline React styles.

### 12.2 Analysis Output Priority (REVISED)

The analysis modal output must be restructured so key information is readable in 15 seconds:

1. **Above the fold:** Framework alignment badge (Strong/Mixed/Weak) + score (7.4/10) + ticker +
   investor name
2. **5 key signals:** Framework criteria pass/fail list (scannable, icon + bold criterion name +
   result)
3. **2-sentence thesis** summary
4. **"Read full analysis →"** expand for detailed prose, KPI grid, risks, strengths

This pattern must be implemented before launch. Users currently scroll through dense prose on mobile.

### 12.3 Interaction Patterns

- Investor selection: pill button strip, single select, instant feedback
- Analysis trigger: button + Enter key
- Watchlist toggle: star icon, optimistic update
- Screen navigation: tab bar
- Modal dismiss: backdrop click, Escape key, explicit close button
- Toast notifications: auto-dismiss after 3.5s

### 12.4 Legal Disclaimer Placement

- In modal: amber info box above "Run Framework Analysis" button
- On every result card: small grey footer text
- In page footer: persistent 1-line disclaimer

---

## 13. Security Requirements

### 13.1 API Key Security

| Requirement | Implementation |
|------------|----------------|
| Anthropic key never in browser | Server-side only, `.env`, Express proxy |
| FMP key (server) never in browser | Server-side only, `.env`, Express proxy |
| `.env` never committed | `.gitignore` enforced, `.env.example` provided |

### 13.2 Input Sanitisation

The ticker `clean()` pipeline: strip `< > { } " ' \` → truncate to 10 chars → uppercase →
allow only `A-Z 0-9 .` → return empty string for null/undefined.

### 13.3 Rate Limiting (Production)

- Claude proxy: 20 req/min per IP (already implemented)
- FMP proxy: 60 req/min per IP (already implemented)
- Auth endpoints (v1.1): 10 attempts/15min per IP

### 13.4 CORS Policy

Development: `origin: 'http://localhost:5173'`
Production: `origin: process.env.FRONTEND_URL`

---

## 14. Testing Requirements

See `docs/TESTING.md` for full test plan.

| Type | Framework | Coverage Target |
|------|-----------|----------------|
| Unit | Jest + ts-jest | ≥90% |
| Integration | Jest + MSW | ≥85% |
| LLM Contract | Jest + MSW | 100% of output fields |
| E2E | Cypress | Critical user flows |

**Additional tests required before launch:**
- [ ] Legal disclaimer text appears in analysis modal (integration test)
- [ ] Framework alignment language used throughout (no raw BUY/HOLD/AVOID in UI text)
- [ ] Paywall modal triggers at 4th analysis attempt (free user) — requires auth + billing

---

## 15. Roadmap

### Phase 0 — Pre-Launch Compliance + Deployment (Weeks 1–2)

- [ ] Legal review consultation (securities attorney)
- [ ] Reframe verdict language: BUY/HOLD/AVOID → framework alignment
- [ ] Add required disclaimers to modal, footer, and ToS draft
- [ ] Add investor name/likeness disclaimer to Strategies Library
- [ ] Production deployment: Vercel (frontend) + Railway (backend)
- [ ] Custom domain + SSL
- [ ] Sentry error monitoring
- [ ] PostHog analytics
- [ ] Email capture + lead magnet PDF

### Phase 1 — Monetisation Foundation (Weeks 3–6)

- [ ] Supabase Auth (email + Google OAuth)
- [ ] Stripe freemium paywall (3 free analyses, $19/month Pro)
- [ ] Usage counter (server-side per user)
- [ ] "Upgrade to Pro" modal at paywall
- [ ] Annual plan ($149/year)
- [ ] Founder discount campaign ($9/month for first 50 subscribers)
- [ ] Stripe webhook handling

### Phase 2 — Retention Loop (Months 2–3)

- [ ] Earnings calendar integration (FMP `/earning_calendar`)
- [ ] Earnings-triggered re-analysis (server-side cron)
- [ ] Transactional email (Resend): earnings alerts + price movement alerts
- [ ] Weekly digest email for inactive users
- [ ] Analysis output restructure: scan-first format
- [ ] Portfolio analysis mode (up to 10 holdings)
- [ ] Mobile UX audit and fixes

### Phase 3 — Growth (Months 3–6)

- [ ] SEO content pipeline: 10 cornerstone articles on investor frameworks
- [ ] Twitter/X analysis thread automation
- [ ] Affiliate program setup (30% commission, 3-month cookie)
- [ ] Open source core framework engine on GitHub
- [ ] Additional investor frameworks: Druckenmiller, Dalio, Ackman, Philip Fisher deep-cut
- [ ] Analysis versioning (delta vs. last analysis)

### Phase 4 — Platform (Months 6–12)

- [ ] Public API + developer documentation
- [ ] Custom investor framework builder
- [ ] Historical analysis replay
- [ ] B2B partnerships (financial newsletter integrations)
- [ ] Teams tier launch

---

## 16. Out of Scope (v1.0)

- Real-time price streaming (WebSockets / SSE)
- Options, futures, crypto, or non-US equities
- Portfolio performance tracking (returns, P&L)
- Broker API integration (buy/sell execution)
- Social features (public profiles, follows, comments)
- Mobile native app
- Dark/light theme toggle (dark only)
- Internationalisation (English only for launch)

---

## 17. Open Questions

| # | Question | Owner | Status |
|---|---------|-------|--------|
| OQ-01 | Which database for v1.1? (Supabase Postgres vs Neon) | Engineering | Leaning Supabase (single auth + db vendor) |
| OQ-02 | Deployment target confirmed? (Vercel + Railway) | Engineering | Open |
| OQ-03 | Which transactional email provider? (Resend vs Postmark) | Engineering | Leaning Resend (developer experience) |
| OQ-04 | Open source timing: 100 paying users or time-based (6 months)? | Product | Open |
| OQ-05 | Should we support non-US equities (LSE, TSX) in Phase 3? | Product | Deferred |
| OQ-06 | Attorney engagement: local fintech lawyer vs. online service (Clerky, LegalZoom)? | Founder | Open — prefer specialist |
| OQ-07 | Lead magnet PDF: generated programmatically or hand-crafted? | Product | Hand-crafted for quality |
| OQ-08 | Domain: stratalyx.ai is the target — is it available/affordable? | Founder | Check immediately |

---

## 18. Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|---------|-----------|------------------------|
| 2026-03 | TypeScript over JavaScript | Type safety. Claude Code performs better with typed codebases. | JavaScript — rejected |
| 2026-03 | Express over Hono for proxy | Most documented, easiest to debug | Hono, Next.js API routes |
| 2026-03 | FMP over Alpha Vantage | Better ratios, cleaner API, 250 free calls/day | Alpha Vantage, Yahoo Finance |
| 2026-03 | Inline styles over CSS framework | Artifact-origin constraint; token object provides equivalent maintainability | Tailwind, CSS Modules |
| 2026-03 | Single useReducer over Zustand/Redux | Sufficient for current complexity | Zustand, Redux Toolkit |
| 2026-03 | In-memory FMP cache on Express | Prevents burning free tier (250 calls/day) | Redis (overkill for now) |
| 2026-03 | MSW for API mocking in tests | Network-level interception, same handlers in Jest + Cypress | jest.mock, nock |
| 2026-03 | Educational framing over investment advice | Legal compliance — avoids unregistered RIA status | No change — too high legal risk |
| 2026-03 | Freemium at 3 analyses/month | Forces conversion decision within first week, not first month | 10 free (too generous), no free tier (too high friction) |
| 2026-03 | Open-source core, paid hosted product | Builds founder brand + contributor community without giving away moat | Fully closed (no community benefit), fully open (no revenue) |
