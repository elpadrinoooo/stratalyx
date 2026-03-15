# Stratalyx.ai — Testing Plan

**Version:** 1.0.0
**Last Updated:** March 2026

---

## 1. Testing Philosophy

- **All external HTTP calls are mocked** — MSW intercepts at the network level. No real API calls in tests.
- **Unit tests are pure** — they test functions in isolation with no DOM or network setup.
- **Integration tests cover state flows** — they test the analysis pipeline end-to-end with mocked API responses.
- **Contract tests enforce the LLM output schema** — every field of `AnalysisResult` is validated.
- **`onUnhandledRequest: 'error'`** — any unmocked HTTP call in a test fails immediately, preventing silent network calls.

---

## 2. Test Suite Overview

| Type | Framework | Location | Coverage Target |
|------|-----------|----------|----------------|
| Unit | Jest + ts-jest | `src/__tests__/unit/` | ≥90% |
| Integration | Jest + MSW | `src/__tests__/integration/` | ≥85% |
| LLM Contract | Jest + MSW | `src/__tests__/contracts/` | 100% of output fields |
| E2E | Cypress | `cypress/e2e/` | Critical user flows |
| Performance | k6 + Lighthouse | `k6/` | p95 < 6s, LCP < 2.5s |

---

## 3. Test ID Convention

Test IDs are prefixed by type for traceability in CI output:

| Prefix | Type | Example |
|--------|------|---------|
| `U-XX` | Unit | `U-01: clean() strips injection characters` |
| `I-XX` | Integration | `I-01: runAnalysis() stores result in state` |
| `L-XX` | LLM Contract | `L-01: verdict is always BUY\|HOLD\|AVOID` |
| `E-XX` | E2E | `E-01: user can analyze a stock end-to-end` |

---

## 4. Unit Tests (`src/__tests__/unit/`)

Pure function tests — no DOM, no network, no React rendering.

### 4.1 `utils.test.ts`

| ID | Function | Test case |
|----|----------|-----------|
| U-01 | `clean()` | Trims leading/trailing whitespace |
| U-02 | `clean()` | Collapses internal whitespace |
| U-03 | `clean()` | Returns empty string for non-string input |
| U-04 | `fmtN()` | Formats to 2 decimal places by default |
| U-05 | `fmtN()` | Respects decimals parameter |
| U-06 | `fmtN()` | Returns '' for Infinity/NaN |
| U-07 | `fmtPct()` | Appends % sign |
| U-08 | `fmtPct()` | Returns '' for Infinity |
| U-09 | `fmtB()` | Formats trillions with T suffix |
| U-10 | `fmtB()` | Formats billions with B suffix |
| U-11 | `fmtB()` | Formats millions with M suffix |
| U-12 | `fmtB()` | Returns '' for NaN |
| U-13 | `extractJson()` | Extracts JSON from surrounding prose |
| U-14 | `extractJson()` | Handles nested objects |
| U-15 | `extractJson()` | Returns null when no JSON present |
| U-16 | `extractJson()` | Returns null for malformed JSON |
| U-17 | `pegColor()` | Returns C.gain for PEG ≤ 1.5 |
| U-18 | `pegColor()` | Returns C.warn for PEG 1.5–2.5 |
| U-19 | `pegColor()` | Returns C.loss for PEG > 2.5 |
| U-20 | `scColor()` | Returns C.gain for score ≥ 7 |
| U-21 | `scColor()` | Returns C.warn for score 5–6 |
| U-22 | `scColor()` | Returns C.loss for score < 5 |
| U-23 | `vColor()` | Returns C.gain for BUY |
| U-24 | `vColor()` | Returns C.loss for AVOID |
| U-25 | `vColor()` | Returns C.warn for HOLD and unknown |

### 4.2 `sanitise.test.ts`

| ID | Field | Test case |
|----|-------|-----------|
| U-26 | base fields | Passes through ticker, investorId, isLive untouched |
| U-27 | `strategyScore` | Clamps to 10 when > 10 |
| U-28 | `strategyScore` | Clamps to 0 when < 0 |
| U-29 | `strategyScore` | Defaults to 5 for non-numeric |
| U-30 | `verdict` | Normalises lowercase 'buy' → 'BUY' |
| U-31 | `verdict` | Passes through 'AVOID' |
| U-32 | `verdict` | Defaults to 'HOLD' for unknown string |
| U-33 | `verdict` | Defaults to 'HOLD' when missing |
| U-34 | `moat` | Normalises 'wide' → 'Wide' |
| U-35 | `moat` | Returns '' for unknown value |
| U-36 | `debtLevel` | Normalises 'low' → 'Low' |
| U-37 | `debtLevel` | Returns '' for unknown value |
| U-38 | numeric fields | Defaults all to 0 when missing |
| U-39 | `screenResults` | Returns [] for non-array input |
| U-40 | `strengths` | Limits to 5 items |
| U-41 | `risks` | Limits to 4 items |
| U-42 | text fields | Returns '' for missing verdictReason/thesis |

### 4.3 `reducer.test.ts`

| ID | Action | Test case |
|----|--------|-----------|
| U-43 | `SET_SCREEN` | Updates screen field |
| U-44 | `SET_INVESTOR` | Updates investor field |
| U-45 | `SET_PROVIDER` | Updates provider field |
| U-46 | `SET_MODEL` | Updates model field |
| U-47 | `OPEN_MODAL` | Sets modalOpen=true and modalTicker |
| U-48 | `CLOSE_MODAL` | Clears modalOpen and modalTicker |
| U-49 | `SET_ANALYSIS` | Stores result under TICKER:investorId key |
| U-50 | `CLEAR_ANALYSIS` | Removes specific key from analyses |
| U-51 | `CLEAR_ALL_ANALYSES` | Empties analyses object |
| U-52 | `ADD_COMPARISON` | Prepends comparison to list |
| U-53 | `ADD_COMPARISON` | Replaces existing comparison with same id |
| U-54 | `REMOVE_COMPARISON` | Removes by id |
| U-55 | `CLEAR_COMPARISONS` | Empties comparisons array |
| U-56 | `ADD_TO_WATCHLIST` | Adds ticker |
| U-57 | `ADD_TO_WATCHLIST` | Does not duplicate |
| U-58 | `REMOVE_FROM_WATCHLIST` | Removes ticker |
| U-59 | `TOAST` | Appends toast with unique id |
| U-60 | `DISMISS_TOAST` | Removes toast by id |
| U-61 | unknown | Returns state unchanged |

---

## 5. Integration Tests (`src/__tests__/integration/`)

These tests import `src/setupMsw.ts` (which starts/resets/closes the MSW server) and use `renderWithCtx()` to render components with a live AppContext.

### 5.1 `analysis.test.ts`

| ID | Test case |
|----|-----------|
| I-01 | `runAnalysis()` calls `/api/claude` and returns a valid `AnalysisResult` |
| I-02 | `runAnalysis()` calls FMP endpoints first when `fmpKey` is set |
| I-03 | `runAnalysis()` skips FMP and calls Claude only when `fmpKey` is null |
| I-04 | `runAnalysis()` throws on Claude API error |
| I-05 | `runAnalysis()` throws if Claude returns unparseable JSON |
| I-06 | FMP fetch failure is non-fatal — analysis continues with AI-only data |

### 5.2 `screener.test.ts`

| ID | Test case |
|----|-----------|
| I-07 | Screener renders all 10 demo stocks |
| I-08 | Search input filters by ticker |
| I-09 | Search input filters by company name |
| I-10 | Clicking "Analyze" opens modal with pre-filled ticker |
| I-11 | Investor pill selection updates active investor in state |

### 5.3 `watchlist.test.ts`

| ID | Test case |
|----|-----------|
| I-12 | WLBtn toggles watchlist membership |
| I-13 | Watchlist badge count updates on add/remove |
| I-14 | Empty state shown when watchlist is empty |
| I-15 | Analysis result displayed on card when available |

---

## 6. LLM Contract Tests (`src/__tests__/contracts/`)

These tests use the MSW Claude handler and exercise the full `runAnalysis()` pipeline. They verify the output contract regardless of what the mock LLM returns.

### 6.1 `analysis-contract.test.ts`

| ID | Field | Contract rule |
|----|-------|--------------|
| L-01 | `verdict` | Always one of BUY\|HOLD\|AVOID |
| L-02 | `strategyScore` | Always 0–10 |
| L-03 | `moatScore` | Always 0–10 |
| L-04 | `strengths` | Always an array, max 5 items |
| L-05 | `risks` | Always an array, max 4 items |
| L-06 | `screenResults` | Always an array |
| L-07 | `ticker` | Always uppercase |
| L-08 | `isLive` | True when fmpKey provided, false otherwise |

---

## 7. MSW Setup

### `msw/handlers.ts`

Default handlers cover all API endpoints used in the app:

| Handler | Path | Returns |
|---------|------|---------|
| `http.post` | `/api/claude` | `fixtures/claude-success.json` |
| `http.get` | `/api/fmp/profile/:ticker` | `fixtures/fmp-profile.json` |
| `http.get` | `/api/fmp/ratios/:ticker` | `fixtures/fmp-ratios.json` |
| `http.get` | `/api/fmp/quote/:ticker` | `fixtures/fmp-quote.json` |
| `http.get` | `/api/fmp/income/:ticker` | `[]` |
| `http.get` | `/api/fmp/cashflow/:ticker` | `[]` |

### Error scenarios

Override handlers in individual tests using `server.use()`:

```typescript
import { http, HttpResponse } from 'msw'
import { server } from '../../../msw/server'

it('handles Claude API error', async () => {
  server.use(
    http.post('http://localhost/api/claude', () => {
      return HttpResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 })
    })
  )
  // ... test expects error state
})
```

---

## 8. Test Helpers

### `renderWithCtx()`

A helper to render React components wrapped in `AppProvider` with optional state overrides:

```typescript
// src/__tests__/helpers/renderWithCtx.tsx
import React from 'react'
import { render } from '@testing-library/react'
import { AppProvider } from '../../context/AppContext'
import type { AppState } from '../../types'

export function renderWithCtx(
  ui: React.ReactElement,
  stateOverrides?: Partial<AppState>
) {
  // Wrap in a provider that accepts initial state overrides
  return render(<AppProvider initialOverrides={stateOverrides}>{ui}</AppProvider>)
}
```

---

## 9. Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific file
node_modules/.bin/jest src/__tests__/unit/utils.test.ts

# Run specific test by name
node_modules/.bin/jest --testNamePattern="U-13"

# Watch mode
npm run test:watch
```

---

## 10. Coverage Thresholds

Enforced in `jest.config.ts`:

```typescript
coverageThreshold: {
  global: {
    statements: 90,
    lines: 90,
    functions: 85,
    branches: 80,
  },
}
```

Coverage must not drop below these thresholds on any PR. CI will fail if it does.

---

## 11. CI Requirements

Before any merge to `main` or `develop`:

```bash
npm run typecheck   # 0 TypeScript errors
npm test            # 0 test failures, all thresholds met
npm run lint        # 0 ESLint errors
```
