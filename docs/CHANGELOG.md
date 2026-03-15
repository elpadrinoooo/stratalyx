# Changelog

All notable changes to Stratalyx are documented here.
Format: [Semantic Versioning](https://semver.org) — `MAJOR.MINOR.PATCH`

---

## [Unreleased] — v1.0.0

### Added
- TypeScript migration — full strict-mode conversion of all source files
- Express proxy server (`server/index.ts`) — API keys moved server-side
- In-memory FMP cache on proxy — 1hr TTL, reduces free-tier usage ~80%
- Complete TypeScript type definitions (`src/types/`) for all data shapes
- `CLAUDE.md` — Claude Code session context file
- `docs/PRD.md` — Full product requirements document
- `docs/ADR.md` — Architecture decision records (7 decisions)
- `docs/TESTING.md` — Full QA and testing plan
- `scaffold.sh` — One-command project setup script
- MSW test infrastructure (`msw/`, `fixtures/`)
- Jest configuration with ts-jest and jsdom environment
- Path aliases in `tsconfig.json` and `jest.config.ts`
- `concurrently` for running client and proxy simultaneously
- `src/App.tsx` — full app shell wiring AppProvider, Navbar, screens, modal
- `src/setupTests.ts` — jest-dom setup
- `src/setupMsw.ts` — MSW lifecycle for integration/contract tests
- `src/__mocks__/styleMock.ts` and `fileMock.ts`
- Unit tests: 61 tests across utils, sanitise, reducer (all passing)

### Changed
- All API calls moved from direct browser fetch to `/api/*` proxy routes
- FMP key management: server-side `.env` (primary), in-app modal with sessionStorage (demo/development)
- `package.json` scripts updated with `dev`, `dev:client`, `dev:server`, `test`, `typecheck`

### Security
- Anthropic API key: browser → server `.env` (never in browser again)
- FMP API key: React state → server `.env` (option to use in-app key for demo)
- CORS restricted to `localhost:5173` in development
- Model enforcement: proxy locks model to `claude-haiku-4-5-20251001`

---

## [0.9.0] — 2026-03 — Live Data Integration

### Added
- Financial Modeling Prep (FMP) API integration
- `fetchLiveData()` — 5 concurrent FMP calls per analysis
- `buildLiveDataBlock()` — formats live data into structured LLM prompt block
- Live data badge — `LiveBadge` component, green = live / amber = AI estimated
- Expandable Live Data Panel in Analyzer Modal (17 financial metrics)
- FMP API Key Modal — in-app key management with setup instructions
- "Add API Key" button in Navbar with live/estimated status indicator
- Amber banner on Screener when no FMP key configured
- Data source footer on all analyses: "FMP Live Data" or "Claude Training Knowledge"
- Fetching phase labels in modal: "Fetching live data from FMP…" → "Applying framework…"

### Changed
- `analyze()` function now accepts `fmpKey` parameter and fetches live data before calling Claude
- Live financial metrics pre-filled into the LLM prompt (ROE, P/E, PEG, margins, FCF, etc.)
- Analysis result now includes `liveData`, `isLive`, and `dataSource` fields
- Screener footer updated to reflect live vs AI-only data status

---

## [0.8.0] — 2026-03 — Cathie Wood + Full Strategy Enrichment

### Added
- Cathie Wood (ARK Invest) investor profile — 11th strategy
- Wright's Law learning curve formula for Wood framework
- ARK 5-year probability-weighted DCF formula
- Full biographical content for all 11 investors
- Historical performance figures (AUM, CAGR) for all investors
- "Best suited for" use case section per investor
- Expandable "Learn more" section with book recommendations
- All financial equations with plain-language explanations
- Avatar images from Wikimedia Commons with monogram fallback

### Changed
- Strategies page redesigned as a research library with sidebar + detail panel
- 3 tabs per investor: Overview, Rules, Formulas
- Quote strip below hero section on each investor profile
- Stat pills: Era, AUM, ~CAGR displayed in hero

---

## [0.7.0] — 2026-03 — Navigation Fix + Full App Integration

### Added
- Watchlist screen with empty state, stock cards, and analysis CTA
- Watchlist badge count on nav tab
- `ProviderModelBar` shared component (reused across Screener, Watchlist, Modal)
- Toast component with auto-dismiss (3.5s) and manual close

### Fixed
- **Critical:** Navbar tabs were static `<div>` elements with no click handlers — converted to `<button>` with `dispatch({type:'SCREEN'})`
- **Critical:** Logo was not clickable — added `onClick` returning to Screener
- **Critical:** Strategies page was a separate artifact with no shared state — merged into single unified app
- **Critical:** `prov is not defined` error — moved `PROVIDERS`/`PROV` declarations to top of file before all component definitions
- Provider switch in Analyzer Modal was not resetting model — fixed `PROVIDER` action in reducer

### Changed
- All screens share single `useReducer` state — navigation, investor selection, and analyses persist across screens

---

## [0.6.0] — 2026-03 — QA Plan + Live Test Runner

### Added
- Full QA and testing plan document
- Live in-browser test runner artifact (70 tests across 9 suites)
- Interactive QA checklist (44 items across 6 categories)
- Testing stack recommendation: Jest, RTL, Cypress, MSW, k6, Lighthouse
- Example test code for all test categories

---

## [0.5.0] — 2026-03 — LLM Provider Selection

### Added
- Provider selector: Anthropic, OpenAI, Google, OpenRouter, Ollama
- Model selector — updates dynamically based on selected provider
- Provider badge showing active provider name
- Provider/model selectors in Screener toolbar and Analyzer Modal settings panel
- `PROVIDER` action in reducer resets model to first available when provider changes

---

## [0.4.0] — 2026-03 — Strategy Comparison

### Added
- "Compare with another strategy" section in Analyzer Modal
- Side-by-side comparison cards for two investor results on same stock
- Score delta calculation with amber warning for divergences > 3 points
- Comparisons screen displaying all saved comparisons
- `CMP` action in state reducer

---

## [0.3.0] — 2026-03 — Core Analysis Features

### Added
- Analysis History screen with sorted card grid
- `SAVE` action stores analysis under `ticker:investorId` key
- `analyses` persisted in app state across navigation
- History badge count on nav tab

---

## [0.2.0] — 2026-03 — Strategies Page

### Added
- Strategies Research Library page
- 11 investor profiles with biographical and educational content
- Screening rules with thresholds and explanatory rationale
- Financial equations with formulas and plain-language explanations
- `InvestorCard` sidebar component
- `DetailPanel` with tabbed layout

---

## [0.1.0] — 2026-03 — Initial Release

### Added
- React SPA with dark theme design system
- Screener table with 10 demo stocks
- Analyzer Modal with Claude AI analysis
- 11 investor strategies (Buffett, Graham, Lynch, Munger, Greenblatt, Dalio, Marks, Klarman, Pabrai, Wood, Fisher)
- Watchlist (star/unstar stocks)
- `useReducer` global state management
- `extractJson()` LLM response parser
- `sanitiseResult()` output contract enforcement
- `clean()` ticker input sanitisation
