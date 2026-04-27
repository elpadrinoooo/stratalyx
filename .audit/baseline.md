# Baseline audit — pre-refactor snapshot

Captured 2026-04-26 on `main` @ `e9648eb` ("LLM config: token usage + cost shown next to each provider and model"). Working tree clean.

This document is the **point of comparison** for everything Phases 1–11 change. Anything not noted here didn't exist on this date.

---

## 1. Build / typecheck / test / lint

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck` | ✅ pass | clean |
| `npm run lint` | ✅ pass | no warnings (existing exceptions silenced; see ESLint section) |
| `npm test` | ✅ 14 suites / 205 tests pass | ~30s. One worker logs "failed to exit gracefully" — open-handle leak, non-blocking |
| `npm test -- --coverage` | ⚠️ flaky | one run failed 1/205, immediate re-run was clean. Coverage instrumentation slows tests near jest's default 30s timeout — investigate if recurrent in CI |
| `npm run build` | ✅ pass | 20s. Two `vite:reporter` warnings about `src/lib/supabase.ts` and `src/engine/analyze.ts` being both static- and dynamic-imported (chunking can't optimize) |

### Bundle sizes (production build, gzipped)

| Chunk | Raw | Gzipped |
|---|---|---|
| `assets/index-*.js` (main app) | 1,573 kB | **412 kB** |
| `assets/AdminPanel-*.js` (admin lazy chunk) | 1,077 kB | **323 kB** |
| `assets/index-*.css` | 1.93 kB | 0.58 kB |
| `index.html` | 0.82 kB | 0.48 kB |

Phase 11 budget target is 500 kB main JS gzipped. **We're at 412 kB — under budget but with little headroom.** Adding Sentry + PostHog + Stripe.js will eat into this. Prioritize lazy-loading framework definitions and recharts (Phase 11.1) to claw back room before adding more deps.

---

## 2. Test coverage baseline

| Metric | % | Counts |
|---|---|---|
| Statements | **32.58%** | 925/2839 |
| Branches | **33.97%** | 720/2119 |
| Functions | **28.62%** | 239/835 |
| Lines | **35.09%** | 828/2359 |

This is the floor CI will defend per Phase 1.3. Expect Phase 4 (valuation module @ 95%+) to lift the overall number 5–8 pts; phases 2/3 add per-route tests that should each add 2–3 pts.

Test layout already exists:
- `src/__tests__/unit/` — pure-function tests (`utils`, `sanitise`, `reducer`, `persist`)
- `src/__tests__/integration/` — RTL component tests (`history`, `watchlist`, `comparisons`, `screener`, `strategies`, `marketEvents`, `analysis`, `toasts-modal`)
- `src/__tests__/contracts/` — schema/contract tests (`analysis-contract`)
- `server/__tests__/` — Express route tests via supertest
- `src/__mocks__/` — fileMock, styleMock

---

## 3. Test framework & tooling — *important deviation from the plan*

The plan (Phase 1.1) prescribes Vitest. **The repo is already on Jest** (29.7) with ts-jest (29.4), jest-environment-jsdom, @testing-library/react/jest-dom/user-event, MSW (2.12), supertest, Playwright (1.59), and Cypress (15.12). All configured and working with 205 passing tests.

**Recommendation: stay on Jest.** Migrating would burn time, churn 14 working test suites, and provide ~zero functional benefit. The plan's stated goals (jsdom env, RTL, MSW, fast-check, coverage in CI, pre-commit hooks, GH Actions) are all achievable on Jest. I'll add `fast-check` (for Phase 4 property tests) and Husky + lint-staged (Phase 1.4) onto the existing Jest setup unless you direct otherwise.

What's already installed and will be reused:
- `jest`, `ts-jest`, `jest-environment-jsdom`, `@types/jest`
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- `msw` (with handlers in `msw/handlers.ts` and setup in `src/setupMsw.ts`)
- `supertest` (used in `server/__tests__/server.test.ts`)
- `@playwright/test` + `e2e/` directory
- `cypress` + `cypress.config.ts`

What's missing and needs adding in Phase 1:
- `@vitest/coverage-v8` → not needed, Jest already has `--coverage`
- `fast-check` → install for Phase 4 property tests
- `husky`, `lint-staged` → install for Phase 1.4 pre-commit hooks

---

## 4. CI & Git automation

`.github/workflows/ci.yml` exists. Triggers on push to `main` and PRs to `main`. Runs typecheck → lint → test (`--ci --maxWorkers=2`) → build sequentially in one job on `ubuntu-latest`, Node 20, npm cache keyed on lockfile.

**Gaps vs. Phase 1.3:**
- No coverage upload / PR comment
- No coverage threshold gate
- No Lighthouse / accessibility job
- No Vercel preview deploy workflow
- Lint and test run sequentially in one job (acceptable for now; split if total time exceeds 5 min)

**No Husky / pre-commit hooks installed** (no `.husky/` dir; `package.json` has no `husky`/`lint-staged` config).

---

## 5. ESLint baseline

`eslint.config.js` is minimal: extends `js.configs.recommended`, `tseslint.configs.recommended`, `react-hooks/recommended`, `react-refresh/vite`. No custom rules tightened. `dist` globally ignored.

Per Phase 1.5, will tighten in **new code only**:
- `@typescript-eslint/no-explicit-any`: warn → error
- `@typescript-eslint/no-floating-promises`: error
- `react-hooks/exhaustive-deps`: error
- `no-console`: warn (allow `warn`/`error`)

Existing violations not back-filled.

---

## 6. Environment variables

### Server-side (process.env, never exposed to client)

| Var | Purpose | Source files |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude proxy | `server/app.ts:24` |
| `GOOGLE_API_KEY` | Gemini proxy | `server/app.ts:25` |
| `OPENAI_API_KEY` | OpenAI proxy | `server/app.ts:26` |
| `MISTRAL_API_KEY` | Mistral proxy | `server/app.ts:27` |
| `FMP_API_KEY` | FMP financial data | `server/app.ts:28` |
| `FINNHUB_API_KEY` | News + symbol search | `server/app.ts:29` |
| `SUPABASE_URL` | Supabase admin client | `server/supabaseAdmin.ts:3` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin client (bypasses RLS) | `server/supabaseAdmin.ts:4` |
| `CORS_ORIGIN` | CORS origin allowlist (currently single value) | `server/app.ts:71` |
| `PORT` | Express listen port | `server/index.ts:3` |
| `ADMIN_PASSWORD` | Basic-Auth for `/admin/*` routes | `server/app.ts:979` |
| `NODE_ENV` | dev/prod toggle | various |
| `JEST_WORKER_ID` | (Jest-set) test detection for skipping rate limit | `server/app.ts:89`, etc. |
| `API_BASE` | Test-only override for SSR fetches | `src/setupMsw.ts:5`, `src/engine/fmp.ts:5`, `src/engine/analyze.ts:87` |

### Client-exposed (`import.meta.env.VITE_*`, baked into JS bundle)

| Var | Purpose | Safe to expose? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ public |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | ✅ public (RLS-restricted) |
| `VITE_API_ORIGIN` | Backend origin override | ✅ public (just a URL) |

**No secrets exposed via `VITE_*`.** ✅ Phase 2.5 secret-hygiene audit can confirm by grep, but the inventory looks clean.

`.env` is in `.gitignore`. `.env.example` carries placeholders only (no real secrets).

---

## 7. Observability — *currently none*

Grep for `sentry|posthog|logrocket|@vercel/analytics|datadog|newrelic|mixpanel|amplitude` returns no source-code matches. Only mentions live in `docs/` markdown.

What exists today:
- Server logs to stdout via implicit `console` (no `pino`, no structured logging)
- `recordAnalysis()` writes per-request usage/cost rows to a Supabase `analyses` table (visible in admin cost dashboard)
- Vercel + Railway platform-level request logs
- No client-side analytics, no error reporting, no alerting

Phase 5 builds the entire stack from scratch (Sentry, PostHog, structured logging, alert rules, admin metrics dashboard).

---

## 8. SEO state

Already in `public/`:
- `robots.txt` — allows `/`, disallows `/api/`, points to `https://stratalyx.ai/sitemap.xml` (note: hardcoded to `stratalyx.ai`, not `stratalyx.vercel.app`)
- `sitemap.xml` — single static entry for `https://stratalyx.ai/`
- `og-default.svg` — static fallback OG image
- `favicon.svg`, `icons.svg`

`index.html` has: `<meta name="description">`, `<meta name="theme-color">`, viewport, `<title>`. No Open Graph / Twitter Card tags in the static HTML. **OG tags are server-injected at request time** for `/share/:ticker/:investorId` and `/share/comparison/:ticker/:investors` routes (see `server/app.ts:919-976`).

No structured data (Schema.org), no canonical tags, no per-route meta beyond what's injected on share routes.

---

## 9. Architecture — *important deviation from the plan*

The plan repeatedly assumes a **Vite + Vercel serverless** layout (e.g., `/api/_lib/fmp.ts`, `/api/_lib/valuation/`, `@vercel/og` Edge handlers). The actual deployment is:

- **Vite SPA** (frontend) deployed to Vercel
- **Express server** (`server/`) deployed to **Railway** (`Procfile` + `railway.json`)
- **`vercel.json` rewrites** `/api/*` → `https://stratalyx-backend-production.up.railway.app/api/*`

So `/api/*` is **not** Vercel serverless functions — it's a long-running Express service on Railway. Implications:

1. `@vercel/og` for Phase 9.2 OG images works *only* if the OG endpoint runs on Vercel. We can either (a) move OG generation to its own Vercel function (split the route from Railway), or (b) generate PNGs server-side on Railway via `satori` + `@resvg/resvg-js`. Option (a) keeps the Edge cache benefits; option (b) keeps everything in one service. **Defer this decision until Phase 9 — flag for your call then.**
2. Vercel KV (Phase 2.4 rate-limiter, Phase 3.2 FMP cache) is reachable from Vercel functions but not directly from Railway. **Replace with Upstash Redis** (same `@upstash/ratelimit` API, just different storage backend) so the Express server can use it.
3. `Vercel Edge middleware` (Phase 5.4 for request IDs) doesn't exist for our setup — instead, attach request IDs in an Express middleware.
4. There's **already an in-memory FMP cache** in `server/app.ts:35-56` (1h TTL). Phase 3 replaces this with the KV/Upstash-backed version per the plan, but the existing cache logic is a useful reference for what's already cached.

None of this changes the *intent* of any phase; it changes the *implementation surface*. I'll proceed with these substitutions unless you object.

---

## 10. Existing routes & features that overlap with planned phases

The plan describes things to build; many already exist in some form. Phase plans should *extend* these, not replace them.

### Phase 2 (security)

- ✅ Auth middleware exists (`server/authMiddleware.ts`, `attachUser`); applied globally
- ✅ LLM proxy routes already require auth via `checkUsage` + `gateProvider`
- ❌ `/market-movers`, `/fmp/*`, `/search`, `/news` are **not** auth-gated — Phase 2.1 confirmed needed
- ⚠️ CORS is **single-origin** (env var), not allowlist
- ❌ No security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `CSP`, `Permissions-Policy`)
- ⚠️ Rate limiting exists (`express-rate-limit`) at IP level — not user/tier aware. Phase 2.4 needs to extend, not replace
- ✅ Admin password protection exists (Basic Auth, timing-safe compare, rate-limited)
- ✅ Affiliate redirect uses an allowlist (no open-redirect vuln)

### Phase 3 (FMP)

- ✅ Server-side FMP proxy exists at `/fmp/*` (`server/app.ts:795`) with allowlist of endpoints (`profile`, `ratios-ttm`, `income-statement`, `cash-flow-statement`, `quote`, `stock/list`)
- ✅ In-memory cache (1h TTL)
- ❌ `FmpKeyModal.tsx` still ships and the server still accepts `x-fmp-key` header (Phase 3.1 removes this — currently a code path where users supply their own key as fallback)
- ❌ No cost telemetry per FMP call, no daily budget enforcement, no cache stampede protection, no stale-when-down fallback

### Phase 7 (alerts/Verdict)

- No cron jobs configured. Railway supports cron via separate worker process; Vercel cron runs on Vercel functions only. Coordinate platform choice in Phase 7 kickoff.

### Phase 9 (share pages)

- ✅ `/share/:ticker/:investorId` and `/share/comparison/:ticker/:investors` routes exist with **server-side OG tag injection** (`server/app.ts:938-976`). The injection reads `dist/index.html` and inserts og:title/description/image plus a `window.__SHARE_*__` global the SPA reads on hydration.
- ❌ Share content is **not persisted** — slugs are derived live from URL params. Phase 4.5 introduces the `analyses` table that Phase 9 share pages should read from. The existing `/share/*` routes can stay as a fallback / 301 source, but the canonical viral URL becomes `/a/{slug}`.

### Phase 8 (disclaimers)

- No first-use modal
- No persistent footer disclaimer (need to verify in UI walkthrough)
- "[investor name] would say…" phrasing audit not done — Phase 8.3 flagged for review

---

## 11. Risks I want flagged before Phase 1 starts

1. **Don't migrate test framework.** See §3. Need your sign-off to keep Jest.
2. **Vercel-vs-Railway split.** See §9. The plan's "/api/_lib/*" naming and Vercel Edge / KV assumptions don't match reality. I'll substitute Upstash + Express middleware. Need your sign-off — alternative is to migrate API routes from Railway back onto Vercel functions, which is a larger refactor and would change cold-start / cost characteristics.
3. **Bundle headroom is tight (412KB / 500KB).** Adding Sentry/PostHog/Stripe.js without first lazy-loading recharts and framework definitions will breach the Phase 11 budget. Sequencing matters.
4. **Coverage flake under instrumentation.** Re-run made it pass but the Jest open-handle leak ("worker process has failed to exit gracefully") suggests an MSW or supertest teardown bug we should diagnose before relying on coverage as a CI gate.
5. **Existing `/share/*` routes are working.** Phase 9 must preserve these URLs as 301s (or keep them serving) so any links already shared in the wild don't break.

---

## 12. Phase 0 acceptance

- [x] Build / typecheck / test / lint passing
- [x] Test framework identified (**Jest**, not Vitest)
- [x] CI / hooks / Vercel inventoried
- [x] Env vars catalogued (server vs client; no secrets in `VITE_*`)
- [x] Observability state captured (none)
- [x] SEO state captured
- [x] Working tree clean

**Holding for "proceed" before starting Phase 1.**
