# Stratalyx.ai — Product Requirements Document

**Version:** 1.0.0
**Status:** Active Development
**Last Updated:** March 2026
**Owner:** Stratalyx Product Team
**Classification:** Internal — Engineering Reference

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Success Metrics](#3-goals-and-success-metrics)
4. [Users and Personas](#4-users-and-personas)
5. [Feature Requirements](#5-feature-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Technical Architecture](#7-technical-architecture)
8. [Data Requirements](#8-data-requirements)
9. [API Contracts](#9-api-contracts)
10. [UI/UX Requirements](#10-uiux-requirements)
11. [Security Requirements](#11-security-requirements)
12. [Testing Requirements](#12-testing-requirements)
13. [Roadmap](#13-roadmap)
14. [Out of Scope](#14-out-of-scope)
15. [Open Questions](#15-open-questions)
16. [Decision Log](#16-decision-log)

---

## 1. Product Overview

### 1.1 What is Stratalyx?

Stratalyx is a **multi-investor, multi-LLM stock analysis platform** that applies the documented investment frameworks of eleven legendary investors to any publicly traded stock. It combines real-time financial data from Financial Modeling Prep (FMP) with AI analysis via Anthropic Claude to produce structured, framework-aligned investment theses.

### 1.2 Core Value Proposition

> "Ask what Warren Buffett, Benjamin Graham, or Cathie Wood would think about any stock — grounded in real financial data, not guesswork."

Unlike generic AI chatbots or screeners, Stratalyx:
- Applies a **specific, documented investor framework** rather than a generic "is this a good stock" prompt
- Injects **verified live financial data** (P/E, ROE, FCF, margins, growth rates) into every AI prompt
- Produces **structured, comparable outputs** across multiple strategies for the same stock
- Educates users on **why** each criterion matters, not just what the verdict is

### 1.3 Current State (v1.0)

The application is a fully functional React single-page application built and validated as a Claude artifact. It is being migrated to a production TypeScript + Vite + Express codebase for local development, testing, and eventual deployment.

---

## 2. Problem Statement

### 2.1 The Gap We Fill

Individual investors and finance students face three compounding problems:

1. **Information overload** — financial data is abundant but contextually meaningless without an interpretive framework
2. **Framework inaccessibility** — the investment philosophies of Buffett, Graham, Lynch et al. are documented in books but not operationalised into actionable screening tools
3. **AI without grounding** — existing AI tools hallucinate financial figures and lack verified real-time data, making their outputs unreliable for investment research

### 2.2 What We Are Not

- Not a trading platform
- Not a financial advisor
- Not a real-time price ticker or portfolio tracker
- Not a social/community platform (yet)

---

## 3. Goals and Success Metrics

### 3.1 Product Goals

| Goal | Description |
|------|-------------|
| G-01 | Users can apply any of 11 investor frameworks to any US-listed stock in under 30 seconds |
| G-02 | Every analysis is grounded in real financial data when an FMP key is present |
| G-03 | Users can compare how two different investors would evaluate the same stock |
| G-04 | The Strategies page functions as a standalone educational resource |
| G-05 | The platform is extensible — new investors, providers, and data sources can be added without architectural changes |

### 3.2 Success Metrics (v1.0)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Analysis completion rate | >95% | Successful JSON parse / total attempts |
| Live data fetch success rate | >98% | FMP responses / total attempts |
| p95 analysis latency (with live data) | <6s | Server-side timing |
| p95 analysis latency (AI only) | <4s | Server-side timing |
| Test suite pass rate | 100% | CI on every commit |
| TypeScript strict mode errors | 0 | `tsc --noEmit` |
| Unit test coverage | ≥90% | Jest coverage report |

---

## 4. Users and Personas

### 4.1 Primary Persona — The Informed Individual Investor

**Name:** Alex, 34
**Background:** Software engineer, self-directed investor with $50k portfolio
**Goals:** Apply systematic frameworks to stock research, reduce emotional bias
**Pain points:** Reads investment books but struggles to operationalise the criteria
**How they use Stratalyx:** Runs a stock through 2–3 investor frameworks before making a decision, uses the comparison feature to understand divergences
**Technical comfort:** High — comfortable with API keys, developer tools

### 4.2 Secondary Persona — The Finance Student

**Name:** Priya, 22
**Background:** Finance undergraduate, learning fundamental analysis
**Goals:** Understand how legendary investors think, practice applying frameworks
**Pain points:** Theory in textbooks doesn't connect to real stocks with real numbers
**How they use Stratalyx:** Uses the Strategies page as a study resource, runs analyses on well-known stocks to see how the framework applies
**Technical comfort:** Medium

### 4.3 Tertiary Persona — The Fintech Developer

**Name:** Marcus, 29
**Background:** Full-stack developer building fintech tools
**Goals:** Understand the architecture, extend or fork the platform
**How they use Stratalyx:** Reads the codebase, extends investor frameworks, integrates new data providers
**Technical comfort:** Expert

---

## 5. Feature Requirements

### 5.1 Core Features (v1.0 — Must Have)

#### F-01: Strategy Screener

**Priority:** P0
**Description:** Display a table of pre-loaded stocks with key financial metrics. Allow filtering by name/ticker. Show the active investor strategy with philosophy summary. Trigger analysis from any row.

**Acceptance Criteria:**
- [ ] Table renders all 10 pre-loaded stocks
- [ ] Search filters by ticker and company name in real time
- [ ] Active investor banner updates immediately on strategy selection
- [ ] Provider and model selectors are visible and functional
- [ ] "Analyze" button opens the Analyzer Modal pre-filled with the ticker
- [ ] Live data status indicator reflects whether FMP key is configured
- [ ] All 11 investor strategies selectable via pill buttons

#### F-02: Strategy Analyzer Modal

**Priority:** P0
**Description:** Full-screen modal that accepts any ticker, fetches live financial data, constructs an investor-specific prompt, and returns a structured AI analysis.

**Acceptance Criteria:**
- [ ] Accepts any US ticker input (validated and sanitised)
- [ ] Enter key triggers analysis
- [ ] Analyze button disabled when input is empty or analysis is in progress
- [ ] Loading skeleton displayed during analysis
- [ ] Analysis settings panel shows investor, provider, and model selectors
- [ ] If FMP key configured: fetches 5 data endpoints concurrently before calling Claude
- [ ] Live data injected verbatim into Claude prompt as a structured block
- [ ] Result displays: verdict badge, strategy score, market price, intrinsic value range, margin of safety, moat assessment, screen results, KPI grid, strengths, risks, thesis
- [ ] Data source labelled: "FMP Live Data" or "Claude Training Knowledge"
- [ ] "Compare with another strategy" section allows running a second investor framework
- [ ] Result saved to History automatically
- [ ] Toast notification on completion
- [ ] Modal closes on backdrop click or Escape key
- [ ] Error state shown on API failure with message

#### F-03: Strategies Research Library

**Priority:** P0
**Description:** Sidebar + detail panel layout presenting all 11 investor profiles with biography, philosophy, screening rules, and financial formulas.

**Acceptance Criteria:**
- [ ] All 11 investors listed in sidebar with avatar, name, era, style tags
- [ ] Avatar loads from Wikimedia with monogram fallback on error
- [ ] Detail panel has 3 tabs: Overview, Rules, Formulas
- [ ] Overview: biography, philosophy, use case, expandable learn more section
- [ ] Rules: all screening criteria with threshold and explanatory rationale
- [ ] Formulas: all equations with formula string and plain-language explanation
- [ ] Hero strip shows AUM, CAGR, era, style as stat pills
- [ ] "Use strategy →" button sets active investor AND navigates to Screener
- [ ] Active investor in sidebar reflects global state investor selection

#### F-04: Watchlist

**Priority:** P1
**Description:** Starred stocks from the Screener, displayed as cards with the active investor's analysis result if available.

**Acceptance Criteria:**
- [ ] Star button on every screener row toggles watchlist membership
- [ ] Watchlist badge on nav tab shows count
- [ ] Empty state with CTA to Screener
- [ ] Each card shows: ticker, name, sector, moat, P/E, PEG, dividend, FCF
- [ ] If analysis exists for active investor: show score bar, verdict, reason, re-analyze button
- [ ] If no analysis: show "Analyze with [Investor]" CTA button
- [ ] Investor and provider/model selectors available on Watchlist page
- [ ] Live data badge shown on cards with completed analyses

#### F-05: Analysis History

**Priority:** P1
**Description:** Grid of all completed analyses across all sessions, sorted by most recent.

**Acceptance Criteria:**
- [ ] All saved analyses displayed as cards
- [ ] Each card shows: ticker, company name, verdict badge, investor tag, score bar, score/10, date
- [ ] Live data badge visible on each card
- [ ] Clicking a card re-opens the Analyzer Modal for that ticker
- [ ] Sorted by timestamp descending
- [ ] Empty state shown when no analyses exist

#### F-06: Strategy Comparisons

**Priority:** P1
**Description:** Side-by-side view of two investor analyses on the same stock.

**Acceptance Criteria:**
- [ ] Comparisons created from the "vs [investor]" section in the Analyzer Modal
- [ ] Each comparison shows both investor results side by side
- [ ] Score delta calculated and highlighted in amber if divergence > 3 points
- [ ] Warning shown for significant divergences
- [ ] Maximum 20 comparisons stored
- [ ] Empty state shown when no comparisons exist

#### F-07: Navigation

**Priority:** P0
**Description:** Persistent top navbar with logo, tab navigation, live data status indicator, active investor badge, and Analyze CTA.

**Acceptance Criteria:**
- [ ] Logo click navigates to Screener from any screen
- [ ] All 5 nav tabs functional: Screener, Strategies, Watchlist, History, Comparisons
- [ ] Active tab visually highlighted
- [ ] Badge counts on Watchlist, History, Comparisons tabs
- [ ] FMP key status indicator (green = live, amber = AI only)
- [ ] Active investor pill shown in navbar
- [ ] Global "Analyze" button opens modal
- [ ] Cmd/Ctrl+K opens Analyzer Modal
- [ ] Escape closes modal

#### F-08: FMP API Key Management

**Priority:** P1
**Description:** In-app modal for entering and managing the FMP API key, stored in memory for the session.

**Acceptance Criteria:**
- [ ] Accessible from navbar status indicator
- [ ] Explains what live data unlocks
- [ ] Input field for key entry
- [ ] Save button stores key in state and shows success toast
- [ ] Clear button removes key
- [ ] Disclaimer: key stored in memory only, never persisted to storage

### 5.2 Planned Features (v1.1 — Should Have)

| ID | Feature | Priority | Notes |
|----|---------|----------|-------|
| F-09 | User authentication (email/password + OAuth) | P0 | Enables persistence |
| F-10 | Persistent analysis history (database) | P0 | Requires F-09 |
| F-11 | User preferences (default investor, theme) | P1 | Requires F-09 |
| F-12 | Portfolio tracker (multiple stocks, aggregate scoring) | P1 | |
| F-13 | Export analysis to PDF | P2 | |
| F-14 | Email digest of watchlist analyses | P2 | |
| F-15 | Screener with custom filters (P/E range, sector, etc.) | P1 | |

### 5.3 Future Features (v2.0 — Could Have)

| ID | Feature |
|----|---------|
| F-16 | Custom investor framework builder |
| F-17 | Historical analysis replay (how would Buffett have rated AAPL in 2015?) |
| F-18 | Multi-stock batch analysis |
| F-19 | Collaborative watchlists |
| F-20 | Broker API integration (read-only portfolio import) |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Requirement | Target |
|-------------|--------|
| Analysis with live data (p95) | < 6 seconds end-to-end |
| Analysis without live data (p95) | < 4 seconds |
| FMP data fetch (5 concurrent calls, p95) | < 2 seconds |
| Initial page load (LCP) | < 2.5 seconds |
| Cumulative Layout Shift | < 0.1 |
| Total Blocking Time | < 300ms |

### 6.2 Reliability

- API proxy must handle FMP and Claude errors gracefully with user-friendly messages
- FMP cache (1hr TTL) must prevent redundant calls within a session
- Analysis must never crash the app — all errors caught and displayed in error state
- React Error Boundaries must wrap all screens and the modal

### 6.3 Security

- API keys must never be transmitted to or stored in the browser
- All external API calls must route through the Express proxy
- FMP key entered in-app is stored in sessionStorage only (cleared on tab close)
- Ticker input sanitised against injection: strip `< > { } " ' \`, truncate to 10 chars, uppercase, alphanumeric + dots only
- CORS restricted to localhost:5173 in development

### 6.4 Accessibility

- All interactive elements must be keyboard navigable
- All buttons must have accessible labels
- Colour contrast must meet WCAG AA (4.5:1 for normal text)
- Modal must trap focus when open

### 6.5 Browser Support

- Chrome 100+
- Firefox 100+
- Safari 15+
- Edge 100+
- Mobile: iOS Safari 15+, Chrome for Android 100+

---

## 7. Technical Architecture

### 7.1 System Architecture

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
│  claude-haiku-   │    │  /income-statement,        │
│  4-5-20251001    │    │  /cash-flow-statement,     │
│                  │    │  /quote                    │
└──────────────────┘    └────────────────────────────┘
```

### 7.2 Frontend Architecture

See `CLAUDE.md` Repository Structure section for the full file tree.

### 7.3 State Management

Single `useReducer` at the root. State shape is defined in `AppState`. All mutations go through typed `Action` dispatches. No external state library — the app's complexity does not warrant Redux or Zustand at this stage.

**Analysis storage key format:** `"TICKER:investorId"` — e.g. `"AAPL:buffett"`

### 7.4 Data Flow — Analysis Request

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

## 8. Data Requirements

### 8.1 Investor Data

All 11 investor profiles are static constants defined in `src/constants/investors.ts`. Each profile contains:
- Biographical information (name, shortName, era, tagline, avatar)
- Visual identity (color)
- Strategy metadata (style, rules, equations)
- LLM prompt context (`ctx` field — injected verbatim into every analysis prompt)

**Data source:** Publicly documented investment books, annual reports, interviews, and academic research. All figures and biographical details are referenced to public sources.

### 8.2 Stock Screener Data

10 pre-loaded stocks in `src/constants/stocks.ts` serve as screener demonstration data. These are approximate figures used for display only. All actual analysis uses live FMP data when a key is present.

### 8.3 Live Financial Data (FMP)

5 FMP endpoints called per analysis:

| Endpoint | Data retrieved | TTL |
|----------|---------------|-----|
| `GET /profile/{symbol}` | Company name, sector, description, price, mktCap, beta | 1hr |
| `GET /ratios-ttm/{symbol}` | P/E, P/B, ROE, margins, debt ratios, PEG | 1hr |
| `GET /income-statement/{symbol}?limit=5` | Revenue, EPS, operating income (5yr history) | 1hr |
| `GET /cash-flow-statement/{symbol}?limit=3` | FCF, capex, operating cash flow | 1hr |
| `GET /quote/{symbol}` | Real-time price, market cap | 1hr |

### 8.4 LLM Output Contract

Every analysis result must conform to `AnalysisResult` interface. The `sanitiseResult()` function enforces:
- `strategyScore` and `moatScore` clamped to integer 0–10
- `verdict` is always one of `BUY | HOLD | AVOID` (defaults to `HOLD`)
- `strengths` is always an array, maximum 5 items
- `risks` is always an array, maximum 4 items
- `screenResults` is always an array

---

## 9. API Contracts

### 9.1 POST /api/claude

**Request:**
```typescript
{
  prompt:     string   // full analysis prompt
  model:      string   // enforced server-side to claude-haiku-4-5-20251001
}
```

**Response:** Anthropic `/v1/messages` response — `data.content[].text` contains the analysis JSON string.

**Error responses:** 503 (key not configured), 502 (upstream unreachable), 4xx (upstream error passthrough)

### 9.2 GET /api/fmp/:path

**Request:** Any valid FMP v3 path. Query params passed through. `apikey` injected server-side.

**Response:** Raw FMP API response, cached for 1hr.

**Cache header:** `X-Cache: HIT | MISS`

### 9.3 GET /health

**Response:**
```typescript
{
  status:    'ok'
  claude:    boolean   // whether ANTHROPIC_API_KEY is set
  fmp:       boolean   // whether FMP_API_KEY is set
  cacheSize: number    // current FMP cache entry count
  uptime:    number    // server uptime in seconds
  time:      string    // ISO timestamp
}
```

---

## 10. UI/UX Requirements

### 10.1 Design System

All design tokens are defined in `src/constants/colors.ts` as the `C` object. No external CSS framework. All styles are inline React styles.

**Colour palette:**
- Background: `#07080c` (bg0) → `#181c27` (bg3), 4 levels of depth
- Border: `#232840`
- Accent: `#6366f1` (indigo)
- Gain: `#10b981` (emerald)
- Loss: `#ef4444` (red)
- Warning: `#f59e0b` (amber)
- Text: `#f0f2f8` (t1) → `#2e3554` (t4), 4 levels

**Typography:**
- UI: system-ui sans-serif stack
- Data/code: `SFMono-Regular, Consolas, Menlo` monospace

### 10.2 Layout Principles

- Maximum content width: 1440px, centred
- All screens scroll independently
- Modal overlays use fixed positioning with `rgba(0,0,0,0.8)` backdrop
- Responsive via CSS grid `auto-fill` columns — no hardcoded breakpoints
- Overflow-x: auto on tables for mobile

### 10.3 Interaction Patterns

- Investor selection: pill button strip, single select, instant feedback
- Provider/model selection: native `<select>` elements
- Analysis trigger: button + Enter key
- Watchlist toggle: star icon, optimistic update
- Screen navigation: tab bar, no page transitions
- Modal dismiss: backdrop click, Escape key, explicit close button
- Toast notifications: auto-dismiss after 3.5s, manual close

### 10.4 Loading States

- Analysis in progress: spinner + descriptive phase text ("Fetching live data from FMP…" → "Applying Buffett's framework…")
- Skeleton placeholders shown while awaiting result
- Buttons disabled during loading with reduced opacity

### 10.5 Error States

- API errors: red banner with error message, no crash
- Invalid ticker: validation before API call
- Missing API key: amber banner with CTA, graceful degradation to AI estimates

---

## 11. Security Requirements

### 11.1 API Key Security

| Requirement | Implementation |
|------------|----------------|
| Anthropic key never in browser | Server-side only, `.env`, Express proxy |
| FMP key (server) never in browser | Server-side only, `.env`, Express proxy |
| FMP key (in-app) not persisted | sessionStorage only, cleared on tab close |
| `.env` never committed | `.gitignore` enforced, `.env.example` provided |

### 11.2 Input Sanitisation

The ticker `clean()` pipeline enforces:
1. Strip `< > { } " ' \` characters
2. Truncate to 10 characters
3. Uppercase
4. Allow only `A-Z 0-9 .`
5. Return empty string for null/undefined

This prevents prompt injection via ticker input.

### 11.3 Model Enforcement

The Express proxy enforces `model: "claude-haiku-4-5-20251001"` and caps `max_tokens` at 2000 regardless of what the client sends, preventing accidental use of expensive models.

### 11.4 CORS Policy

Development: `origin: 'http://localhost:5173'`
Production: `origin: process.env.FRONTEND_URL`

---

## 12. Testing Requirements

See `docs/TESTING.md` for full test plan. Summary:

| Type | Framework | Coverage Target | Files |
|------|-----------|----------------|-------|
| Unit | Jest + ts-jest | ≥90% | `src/__tests__/unit/` |
| Integration | Jest + MSW | ≥85% | `src/__tests__/integration/` |
| LLM Contract | Jest + MSW | 100% of output fields | `src/__tests__/contracts/` |
| E2E | Cypress | Critical user flows | `cypress/e2e/` |
| Performance | k6 + Lighthouse | p95 < 6s, LCP < 2.5s | `k6/` |

**CI requirement:** All unit, integration, and contract tests must pass before merge. Coverage must not drop below threshold.

---

## 13. Roadmap

### v1.0 — Foundation (Current)
- [x] 11 investor strategy frameworks with educational content
- [x] Live financial data integration (FMP)
- [x] AI analysis via Claude with investor-specific prompts
- [x] Strategy comparison feature
- [x] Watchlist management
- [x] Analysis history
- [x] TypeScript migration
- [x] Express proxy (API key security)
- [x] Full test suite (unit)
- [ ] React Error Boundaries
- [ ] Accessibility audit (WCAG AA)
- [ ] Production deployment

### v1.1 — Accounts & Persistence
- [ ] User authentication (Supabase Auth or Auth.js)
- [ ] PostgreSQL database (analyses, watchlists, preferences)
- [ ] Row-level security (users see only their own data)
- [ ] Session persistence across devices

### v1.2 — Screener Power Features
- [ ] Custom filter builder (sector, P/E range, market cap)
- [ ] Bulk analysis (run one strategy across all watchlist stocks)
- [ ] Export to PDF / CSV

### v2.0 — Platform
- [ ] Public API
- [ ] Custom investor framework builder
- [ ] Historical analysis replay
- [ ] Mobile app (React Native)

---

## 14. Out of Scope

The following are explicitly NOT in scope for v1.0:

- Real-time price streaming (WebSockets / SSE)
- Options, futures, crypto, or non-US equities
- Portfolio performance tracking
- Broker API integration (buy/sell execution)
- Social features (sharing, comments, follows)
- Paid subscription / billing
- Mobile native app
- Dark/light theme toggle (dark only)
- Internationalisation (English only)

---

## 15. Open Questions

| # | Question | Owner | Status |
|---|---------|-------|--------|
| OQ-01 | Which database for v1.1 persistence? (Supabase vs PlanetScale vs Neon) | Engineering | Open |
| OQ-02 | Deployment target for v1.0? (Vercel + Railway vs Fly.io vs self-hosted) | Engineering | Open |
| OQ-03 | Should the FMP cache move to Redis for multi-user scenarios? | Engineering | Open |
| OQ-04 | Which auth provider for v1.1? (Supabase Auth vs Auth.js vs Clerk) | Engineering | Open |
| OQ-05 | Should we support non-US equities (LSE, TSX) in v1.1? | Product | Open |
| OQ-06 | Rate limiting strategy for the proxy? (per-IP vs per-user) | Engineering | Open |

---

## 16. Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|---------|-----------|------------------------|
| 2026-03 | TypeScript over JavaScript | Type safety catches category of bugs most likely during file-splitting refactor. Claude Code performs better with typed codebases. | JavaScript — rejected: no type safety, harder for AI-assisted development |
| 2026-03 | Express over Hono for proxy | Most documented, easiest to debug on Linux, Claude Code has deepest Express knowledge | Hono (lighter but less documented for beginners), Next.js API routes (too much framework overhead for a simple proxy) |
| 2026-03 | FMP over Alpha Vantage | Better TypeScript types, more comprehensive financial ratios, cleaner API design | Alpha Vantage (more restrictive free tier), Yahoo Finance (unofficial, unreliable) |
| 2026-03 | Inline styles over CSS modules | Artifact-origin constraint; avoids build tooling for style isolation. Acceptable for single-team project. | Tailwind (requires compiler), CSS Modules (extra files), styled-components (runtime overhead) |
| 2026-03 | Single useReducer over Zustand/Redux | App complexity does not warrant external state library. Discriminated Action union provides type safety equivalent to Redux Toolkit. | Zustand (simpler but less type-safe), Redux Toolkit (overkill for current scope) |
| 2026-03 | In-memory FMP cache on Express | Prevents burning free tier (250 calls/day) on repeated analyses. 1hr TTL appropriate for financial data freshness. | Redis (overkill for single-user local dev), No cache (burns quota too fast) |
| 2026-03 | MSW for API mocking in tests | Industry standard, intercepts at network level, works identically in Jest and Cypress | jest.mock (too low-level), nock (Node-only), manual fetch mocking (brittle) |
