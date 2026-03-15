> This file is read automatically by Claude Code at the start of every session.
> It gives Claude Code the full context it needs to work on this codebase
> without asking repeated questions about architecture or conventions.

---

## What This Project Is

Stratalyx is a **multi-investor, multi-LLM stock analysis platform** written in
React 18 + TypeScript + Vite on the frontend and Express on the backend.

It applies the documented frameworks of 11 legendary investors (Buffett, Graham,
Lynch, Munger, Greenblatt, Dalio, Marks, Klarman, Pabrai, Wood, Fisher) to any
publicly traded stock, grounding every AI analysis in real-time financial data
from Financial Modeling Prep (FMP).

Full product spec: `docs/PRD.md`
Architecture decisions: `docs/ADR.md`
Testing plan: `docs/TESTING.md`
Changelog: `docs/CHANGELOG.md`

---

## How to Run

```bash
# Install dependencies
npm install

# Start both client and proxy server
npm run dev
# Client:  http://localhost:5173
# Proxy:   http://localhost:3001
# Health:  http://localhost:3001/health

# Run tests
npm test

# TypeScript check
npm run typecheck
```

---

## Repository Structure

```
stratalyx/
├── src/
│   ├── types/              ← TypeScript interfaces — start here to understand data shapes
│   │   ├── investor.ts     Investor, InvestorRule, InvestorEquation
│   │   ├── provider.ts     Provider, LLMModel, ModelTier
│   │   ├── stock.ts        Stock, MoatRating
│   │   ├── fmp.ts          FMPProfile, FMPRatiosTTM, FMPQuote, etc.
│   │   ├── analysis.ts     AnalysisResult, LiveData, ScreenResult, Verdict
│   │   ├── state.ts        AppState, Action (discriminated union), Screen
│   │   └── index.ts        Barrel export
│   ├── constants/
│   │   ├── colors.ts       Design tokens — object C, used everywhere for styling
│   │   ├── investors.ts    INVESTORS array (11 entries) + INV lookup map
│   │   ├── providers.ts    PROVIDERS array (5 entries) + PROV lookup map
│   │   └── stocks.ts       STOCKS array (10 demo stocks)
│   ├── state/
│   │   ├── reducer.ts      Pure reducer(state, action) — no side effects
│   │   ├── initialState.ts INIT constant
│   │   └── context.ts      AppContext, Ctx, useApp() hook
│   ├── engine/
│   │   ├── analyze.ts      Main orchestrator — calls FMP then Claude
│   │   ├── fmp.ts          fetchLiveData() and buildLiveDataBlock()
│   │   ├── prompt.ts       buildPrompt() — constructs the full LLM prompt
│   │   ├── sanitise.ts     sanitiseResult() — enforces output contract
│   │   └── utils.ts        clean(), fmtN(), fmtPct(), fmtB(), extractJson()
│   ├── components/         Shared stateless UI primitives
│   ├── screens/            One file per route
│   ├── hooks/              useAnalysis(), useWatchlist()
│   └── context/            AppContext provider component
├── server/
│   └── index.ts            Express proxy — API keys never reach the browser
├── msw/
│   ├── server.ts           MSW node server for tests
│   └── handlers.ts         Mock API handlers for Claude + FMP
├── fixtures/               JSON fixtures used by MSW handlers
├── src/__tests__/
│   ├── unit/               Pure function tests
│   ├── integration/        State flow + API integration tests
│   └── contracts/          LLM output schema validation tests
├── docs/
│   ├── PRD.md              Full product requirements document
│   ├── ADR.md              Architecture decision records
│   ├── TESTING.md          Full QA and testing plan
│   ├── CHANGELOG.md        Version history
│   └── CONTRIBUTING.md     Contribution guidelines
├── .env                    Real keys — NEVER commit
├── .env.example            Template — safe to commit
└── CLAUDE.md               ← You are reading this
```

---

## Critical Rules — Read Before Making Changes

### 1. TypeScript Strict Mode is Enforced

`tsconfig.json` has `"strict": true`. Never use `any` — use `unknown` and narrow
it. If you're not sure of the type, look in `src/types/` first. All types are
already defined.

```typescript
// ✗ Never do this
const result: any = await analyze(ticker, investorId)

// ✓ Do this
const result: AnalysisResult = await analyze(ticker, investorId)
```

### 2. The Reducer is Pure — No Side Effects

`src/state/reducer.ts` must contain zero side effects — no fetch calls, no
console.log, no localStorage, no Date.now() (except in TOAST where it generates
an ID — this is acceptable). All async operations belong in components or hooks.

### 3. All API Keys Are Server-Side Only

Never add any API key to any file inside `src/`. All secrets belong in `.env`
and are accessed only from `server/index.ts`. The browser never sees keys.

If a feature requires a new external API, add a new proxy route to
`server/index.ts` and call `/api/new-route` from the frontend.

### 4. Analysis Keys Are `"TICKER:investorId"`

The `analyses` object in state is indexed by `"${ticker}:${investorId}"`.
Always use this format. Never use other separators.

```typescript
const key = `${result.ticker}:${result.investorId}`
state.analyses[key] = result
```

### 5. All LLM Output Passes Through sanitiseResult()

Never render raw LLM output. The chain is always:

```
LLM text → extractJson() → sanitiseResult() → AnalysisResult → UI
```

If you add new fields to `AnalysisResult`, add corresponding sanitisation
logic to `sanitiseResult()` in `src/engine/sanitise.ts`.

### 6. Design Tokens — Use C Object Only

All colours, font families, and border radii come from `src/constants/colors.ts`.
Never hardcode hex values in component files.

```typescript
// ✗ Never
style={{ color: '#10b981' }}

// ✓ Always
style={{ color: C.gain }}
```

### 7. Tests Must Pass Before Commit

```bash
npm run typecheck   # must show 0 errors
npm test            # must show 0 failures
```

If you add a new utility function to `src/engine/utils.ts`, add corresponding
unit tests to `src/__tests__/unit/utils.test.ts`.

---

## Common Tasks — How to Do Them

### Add a new investor strategy

1. Add an `Investor` object to `src/constants/investors.ts` following the existing pattern
2. Ensure the `ctx` field is a detailed prompt context string (4–6 sentences)
3. Add at least 4 `rules` and 2 `equations`
4. Add the avatar URL with a fallback monogram test
5. Run `npm run typecheck` — TypeScript will catch any missing fields

### Add a new data provider

1. Add a `Provider` object to `src/constants/providers.ts`
2. If it requires a new API route, add it to `server/index.ts`
3. Add a new MSW handler to `msw/handlers.ts`
4. Add a fixture file to `fixtures/`
5. Update `src/types/provider.ts` if needed

### Add a new screen

1. Create `src/screens/NewScreen.tsx`
2. Add the screen name to the `Screen` union type in `src/types/state.ts`
3. Add the component to `src/App.tsx` (screen switcher in `AppShell`)
4. Add a nav tab entry to the `SCREENS` array in `src/components/Navbar.tsx`

### Fix a bug in analysis output

1. Check `sanitiseResult()` in `src/engine/sanitise.ts` first
2. Check `extractJson()` in `src/engine/utils.ts`
3. Check the prompt construction in `src/engine/prompt.ts`
4. Write a failing test in `src/__tests__/contracts/` that reproduces the bug
5. Fix the function
6. Confirm the test passes

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Server-side only — Anthropic API key |
| `FMP_API_KEY` | Recommended | Server-side only — FMP data API key |
| `PORT` | No | Express proxy port (default: 3001) |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | Production only | CORS origin for deployed frontend |

---

## Testing Conventions

- Test files live in `src/__tests__/` mirroring `src/` structure
- Test IDs follow `U-XX` (unit), `I-XX` (integration), `L-XX` (LLM contract), `E-XX` (e2e)
- All external HTTP calls are intercepted by MSW — never real calls in tests
- Use `renderWithCtx(component, stateOverrides)` helper for components that use `useApp()`
- MSW lifecycle (listen/reset/close) is set up in `src/setupMsw.ts` — import this in integration/contract tests
- Run a single test: `npx jest --testNamePattern="U-05"`
- Run a single file: `npx jest src/__tests__/unit/utils.test.ts`

---

## Known Technical Debt

| ID | Description | Priority | Target Version |
|----|-------------|----------|----------------|
| TD-01 | Inline styles should migrate to CSS Modules or Tailwind | P2 | v1.1 |
| TD-02 | No React Error Boundaries — components can crash silently | P1 | v1.0 patch |
| TD-03 | FMP cache is in-memory on Express — lost on server restart | P2 | v1.1 (Redis) |
| TD-04 | ~~No rate limiting on the proxy~~ **DONE** — `express-rate-limit` added (20 req/min Claude, 60 req/min FMP) | ~~P1~~ | ~~v1.0 before deploy~~ |
| TD-05 | In-app FMP key lives in sessionStorage — cleared on tab close | P2 | v1.1 (move to .env fully) |
| TD-06 | No accessibility audit completed | P1 | v1.0 patch |
| TD-07 | Screener stock data is static/approximate | P2 | v1.1 (FMP-powered screener) |

---

## Questions Claude Code Should Never Ask

These decisions are already made. If you're unsure, use what's documented here:

- **State management?** → `useReducer` + Context. No Zustand, no Redux.
- **Styling?** → Inline styles with `C` tokens. No Tailwind, no CSS Modules yet.
- **API calls from frontend?** → Always via `/api/*` proxy. Never direct.
- **Default LLM model?** → `claude-haiku-4-5-20251001`. Enforced server-side.
- **Analysis storage key?** → `"TICKER:investorId"`.
- **Test mocking?** → MSW. No `jest.mock()` for HTTP.
- **TypeScript `any`?** → Never. Use `unknown` and narrow.
