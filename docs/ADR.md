# Architecture Decision Records (ADR)

**Project:** Stratalyx.ai
**Format:** Lightweight ADR (Context → Decision → Consequences)

---

## ADR-001: Single useReducer for Global State

**Date:** 2026-03
**Status:** Accepted

### Context
The application needs shared state across 5 screens and a modal: active investor, provider, model, analyses, comparisons, watchlist, and toasts. Options considered: React Context + useState, useReducer, Zustand, Redux Toolkit.

### Decision
Use a single `useReducer` at the root with a discriminated union `Action` type. All state mutations go through typed dispatches. State is passed via a single React Context.

### Consequences
- **Good:** Zero dependencies, full TypeScript inference, no boilerplate, easy to test the pure reducer function in isolation
- **Good:** Discriminated union `Action` type means TypeScript will error if any component dispatches a malformed action
- **Bad:** As features grow (auth, persistence), this may need to be split — plan to segment into domain reducers if state exceeds ~15 action types
- **Trigger to revisit:** If adding auth + persistence pushes action count above 20

---

## ADR-002: Express Proxy for API Key Security

**Date:** 2026-03
**Status:** Accepted

### Context
The app calls Anthropic and FMP APIs. Both require secret keys. In the original artifact, FMP key was stored in React state and calls were made directly from the browser. This is acceptable for a sandboxed demo but unacceptable for a real deployment because the key is visible in browser DevTools network tab.

### Decision
All external API calls route through a local Express server (`server/index.ts`). Keys live in `.env` on the server only. The Vite dev server proxies `/api/*` to `localhost:3001`. The browser never sees any API key.

### Consequences
- **Good:** API keys are fully protected from browser inspection
- **Good:** Proxy enforces model selection and max_tokens cap, preventing accidental cost overruns
- **Good:** FMP cache lives on the server, shared across all analysis requests in a session
- **Bad:** Requires running two processes in development (`npm run dev` uses `concurrently` to handle this)
- **Bad:** Adds one network hop for every API call (negligible latency ~1ms on localhost)
- **Migration note:** The in-app FMP key modal (React state) remains for the artifact demo. In the VS Code project, both keys move to `.env`.

---

## ADR-003: Financial Modeling Prep (FMP) as Data Provider

**Date:** 2026-03
**Status:** Accepted

### Context
To ground AI analyses in real financial data, we need a financial data API. Requirements: real-time price, TTM ratios (P/E, P/B, ROE, margins), income statement history, cash flow, free tier availability.

### Decision
Use FMP (Financial Modeling Prep) as the primary data provider.

### Evaluation Matrix

| Provider | Free tier | TTM ratios | Income history | TypeScript | Reliability |
|----------|-----------|------------|----------------|------------|-------------|
| **FMP** | 250 calls/day | ✓ excellent | ✓ 5yr | ✓ good | ✓ stable |
| Alpha Vantage | 25 calls/day | ✓ limited | ✓ | ✗ manual | ✓ stable |
| Yahoo Finance | Unofficial | ✓ | ✓ | ✗ | ✗ fragile |
| Polygon.io | 5 calls/min | ✗ financials only on paid | ✗ | ✓ | ✓ stable |

### Consequences
- **Good:** 250 free calls/day is sufficient for development and light usage (with 1hr cache, 10 analyses = 50 calls)
- **Good:** Comprehensive TTM ratio endpoint covers all metrics needed for all 11 investor frameworks
- **Bad:** Free tier is insufficient for production multi-user traffic — will need paid tier or alternative at scale
- **Trigger to revisit:** When daily active users exceed ~20 (each burning ~25 calls/day)

---

## ADR-004: Inline Styles Over CSS Framework

**Date:** 2026-03
**Status:** Accepted (with noted technical debt)

### Context
The application was originally built as a Claude artifact where no build pipeline exists. All styling was done with inline React styles using a design token object (`C`). When migrating to VS Code, we could switch to Tailwind, CSS Modules, or styled-components.

### Decision
Retain inline styles for v1.0. Extract all design tokens into `src/constants/colors.ts`. Add a migration note for v1.1.

### Rationale
- Migrating ~1800 lines of inline styles to Tailwind classes is a high-effort, zero-feature-value task
- Claude Code can help with this migration in a dedicated refactor session
- The design token object provides equivalent maintainability to CSS variables for the current team size

### Consequences
- **Good:** Zero migration effort, zero risk of regressions
- **Bad:** No CSS class reuse, slightly larger HTML output, no responsive utility classes
- **Bad:** Harder for designers unfamiliar with JSS to contribute
- **Plan:** Schedule CSS migration as a dedicated v1.1 task using Claude Code's refactor capability
- **Trigger to revisit:** When onboarding a designer or adding a second frontend developer

---

## ADR-005: MSW for All Test API Mocking

**Date:** 2026-03
**Status:** Accepted

### Context
Tests must not make real network calls (cost, flakiness, rate limits). Options: `jest.mock()`, `nock`, manual fetch stubs, MSW (Mock Service Worker).

### Decision
Use MSW v2 for all API mocking in tests. A single `msw/server.ts` instance is shared across integration and contract tests via `src/setupMsw.ts`. Unit tests that don't touch the network import only `src/setupTests.ts`.

### Consequences
- **Good:** Intercepts at the network level — tests exercise the real `fetch()` call path, not a mocked module
- **Good:** Same handlers work in Jest (Node) and Cypress (browser) — write mocks once
- **Good:** `onUnhandledRequest: 'error'` in `beforeAll` ensures any unmocked API call fails the test immediately, preventing silent network calls
- **Bad:** Slightly more setup than `jest.mock()` — offset by the quality of the network-level interception

---

## ADR-006: LLM Output Contract Enforcement

**Date:** 2026-03
**Status:** Accepted

### Context
The LLM (Claude) returns a JSON string embedded in a natural language response. This JSON must conform to the `AnalysisResult` interface. LLMs occasionally return: out-of-range scores, invalid verdict strings, null arrays, truncated JSON, markdown-wrapped JSON.

### Decision
All LLM output passes through two layers before reaching the UI:
1. `extractJson()` — finds and parses the first valid JSON object in the response text
2. `sanitiseResult()` — enforces all output contract rules with explicit defaults

### Contract Rules Enforced by `sanitiseResult()`

| Field | Rule |
|-------|------|
| `strategyScore` | `Math.min(10, Math.max(0, Number(raw) \|\| 5))` |
| `moatScore` | Same as strategyScore |
| `verdict` | Must be `BUY \| HOLD \| AVOID`, defaults to `HOLD` |
| `strengths` | `Array.isArray() ? slice(0,5) : []` |
| `risks` | `Array.isArray() ? slice(0,4) : []` |
| `screenResults` | `Array.isArray() ? pass : []` |

### Consequences
- **Good:** The UI never receives malformed data regardless of LLM behaviour
- **Good:** Contract is testable in isolation — the sanitiseResult() unit tests cover all edge cases
- **Bad:** Lossy — if the LLM returns a score of 11 because it genuinely means "exceptional", we floor it to 10
- **Acceptable:** Score clamping is correct behaviour; a 0–10 scale is a design requirement

---

## ADR-007: Claude Haiku as Default Model

**Date:** 2026-03
**Status:** Accepted

### Context
The app supports multiple models across 5 providers. The default model used for all analyses must balance cost, speed, and output quality.

### Decision
Default to `claude-haiku-4-5-20251001`. This is enforced server-side in the Express proxy regardless of what the client requests.

### Rationale
- Haiku provides sufficient instruction-following quality for structured JSON output
- Haiku is ~10x cheaper than Sonnet and ~50x cheaper than Opus
- Analysis latency with Haiku is typically 1.5–3s vs 3–6s for Sonnet
- Users who want higher quality can select Sonnet or Opus in the model picker — the proxy will honour this but logs the selection

### Consequences
- **Good:** Low cost per analysis, fast response times
- **Bad:** Occasionally produces less nuanced investment theses compared to Sonnet
- **Trigger to revisit:** If user testing shows thesis quality is insufficient for the target persona
