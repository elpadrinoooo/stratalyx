# Stratalyx hardening — audit response

Single-document summary of the work done against the v3 production-hardening
plan. Source for every claim is the corresponding commit + the matching file
in `.audit/`.

**Range:** `e9648eb` (HEAD before this work) → `847ec32` (current HEAD).
**Footprint:** 13 commits, 68 files changed, +3,688 / −433.

---

## 1. Changes by phase

### Phase 0 — pre-flight audit
- `3c58f4e` — `[docs] baseline audit before refactor`
  - `.audit/baseline.md` documents the starting state plus three deviations from the plan that needed your sign-off.

### Phase 1 — test infra + CI + the four bugs that surfaced
- `e07d816` — `[fix] AnalyzerModal: 'Run another' button referenced undeclared setters` — real production bug.
- `523e62f` — `[refactor] drop unused default React imports` — 20 files cleaned (sub-agent did the mechanical work).
- `31b7a4b` — `[fix] surface and fix latent TS errors` — `useGetList` import + unused `req` param.
- `6644989` — `[ci] Phase 1: typecheck gate, coverage threshold, husky, lint-staged` — `tsc -b` (was a no-op), Jest threshold, Husky pre-commit/pre-push, ESLint tightening, CI coverage PR comment.
- `8c35da3` — `[docs] Phase 1 coverage snapshot`.

### Phase 2 — security
- `59851ad` — `[refactor] thread Supabase auth into FMP-backed client fetches` — prep step.
- `580404d` — `[security] auth-gate /market-movers and /fmp/* + drop x-fmp-key fallback` — auth required + structured rejection logs.
- `6f65452` — `[docs] Phase 2.5 secret-hygiene audit + founder follow-ups index` — clean.
- `2180598` — `[refactor] remove FMP key client UI (server holds the key now)` — Phase 3.1 folded in.
- `bc49c50` — `[security] CORS allowlist + security headers + CSP report-only` — `.audit/csp-decisions.md` documents directives.
- `3d99283` — `[docs] Phase 2 acceptance: coverage snapshot + manual-test checklist` — `.audit/phase2-manual-tests.md` is your in-browser walkthrough.

### Phase 4 — deterministic valuation engine (gating phase)
- `847ec32` — `[feat] Phase 4.1 + 4.2: deterministic valuation engine` — pure server-side math, 22 investors → 9 strategies, 142 net new tests, `.audit/valuation-strategy-decisions.md` documents the per-investor mapping rationale.

---

## 2. Files touched

### New (production code)
| Path | Purpose |
|---|---|
| `server/valuation/types.ts` | Strategy I/O contracts |
| `server/valuation/helpers.ts` | clamp, round, defaultDiscountRate, ownerEarnings, netDebt, sensitivity grid, marginOfSafety, impliedGrowthRate |
| `server/valuation/dcf.ts` | twoStageDCF — high-growth + Gordon terminal |
| `server/valuation/graham.ts` | grahamNumber + ncavPerShare |
| `server/valuation/lynch.ts` | lynchFairValue (PEG-based, capped) |
| `server/valuation/strategies.ts` | 9 strategy variants + STRATEGIES map (all 22 investors) |
| `server/valuation/index.ts` | Public barrel for downstream consumers |
| `src/__mocks__/supabaseMock.ts` | Jest module mock — `import.meta.env` doesn't compile under ts-jest CJS |

### New (config / infrastructure)
| Path | Purpose |
|---|---|
| `.husky/pre-commit` | `npx lint-staged` |
| `.husky/pre-push` | `npm run typecheck && npm test` |

### Modified (production code, in order of impact)
| Path | Why |
|---|---|
| `server/app.ts` | CORS allowlist; security headers + CSP report-only; `/csp-report`; auth gate on `/fmp/*` and `/market-movers`; drop `x-fmp-key` |
| `server/authMiddleware.ts` | New `requireAuth`; test-mode bearer token shortcut |
| `src/screens/AnalyzerModal.tsx` | Real bug fix (`setCompPhase`/`setCompInvId`); drop fmpKey prop; fix invalid `ReturnType<INV[string]>` type; drop unused React |
| `src/App.tsx` | Drop fmpKey state, sessionStorage, FmpKeyModal render, prop wiring |
| `src/components/Navbar.tsx` | Drop fmpBtn, fmpKeySet/onOpenFmpModal props, KeyRound import |
| `src/screens/MarketsScreen.tsx` | Drop fmpKey/onOpenFmpModal; rename noFmpKey state to moversBlock = 'unauth'\|'down'; route 401 → sign-in CTA |
| `src/screens/ScreenerScreen.tsx` | Drop fmpKeySet/onOpenFmpModal; status strip keys off `state.user` |
| `src/engine/analyze.ts` | Drop fmpKey from AnalyzeOptions; always attempt live data |
| `src/engine/fmp.ts` | Drop fmpKey from FetchLiveDataOptions; only authToken remains |
| `src/hooks/useStockList.ts` | Send Authorization header; falls back to static list on 401 |
| `src/hooks/useAnalysis.ts` | Drop fmpKey from `run()` |
| `src/admin/AdminPanel.tsx` | Add `useGetList` import; type `rows.map` callback |
| `server/usageLimiter.ts` | `_req` param to satisfy noUnusedParameters |
| `server/index.ts` | `eslint-disable` justification on startup banner (Phase 5 replaces with pino) |
| 15 source files | Drop unused default `React` imports (modern JSX transform) |
| 5 test files | Drop unused default `React` imports |

### Deleted
| Path | Why |
|---|---|
| `src/components/FmpKeyModal.tsx` | Server holds the FMP key; modal no longer reachable |

### Modified (test code)
| Path | Why |
|---|---|
| `server/__tests__/server.test.ts` | New CORS, header, CSP, auth-gate test blocks (S-09, S-09b, S-13, S-14); 9 `/fmp/*` calls switched to `authedGet` |
| `src/__tests__/integration/screener.test.tsx`, `watchlist.test.tsx` | Drop fmpKeySet/onOpenFmpModal props |
| `src/__tests__/integration/analysis.test.ts` | I-01/I-02 collapsed; isLive now reflects live-data availability, not fmpKey presence |
| `src/__tests__/contracts/analysis-contract.test.ts` | L-08 rewritten |

### Audit docs
- `.audit/baseline.md` — Phase 0 starting state
- `.audit/coverage-phase1.txt` — actual baseline post-fixes
- `.audit/coverage-phase2.txt` — security-phase coverage delta
- `.audit/coverage-phase4.txt` — valuation-engine coverage delta
- `.audit/secret-hygiene-phase2.md` — secret audit (clean)
- `.audit/csp-decisions.md` — CSP directive choices + per-route overrides
- `.audit/phase2-manual-tests.md` — your in-browser checklist after deploy
- `.audit/valuation-strategy-decisions.md` — per-investor strategy rationale
- `.audit/FOLLOWUPS.md` — index of items only you can do (accounts, decisions)

---

## 3. Test coverage

| Metric | Phase 0 | Phase 1 | Phase 2 | Phase 4 | Δ |
|---|---|---|---|---|---|
| Statements | 32.58%* | 30.48% | 30.95% | **36.17%** | +5.69 / +3.59 vs Phase 0 |
| Branches | 33.97%* | 30.66% | 30.97% | **35.41%** | +4.75 / +1.44 vs Phase 0 |
| Functions | 28.62%* | 26.52% | 27.07% | **29.17%** | +2.10 / +0.55 vs Phase 0 |
| Lines | 35.09%* | 32.79% | 33.34% | **38.69%** | +5.92 / +3.60 vs Phase 0 |
| Test count | 205 | 205 | 218 | **360** | +155 |
| Test suites | 14 | 14 | 14 | **19** | +5 |

\* Phase 0 was captured during a flaky failure that excluded ~195 statements; the post-Phase-1 measurement is the true floor.

**`server/valuation/`** (Phase 4 module): **98.03%** statements / 88.20% branches / **100%** functions / **98.65%** lines. Per-file gate of 95/80/95/95 enforced in CI.

**Global threshold ratchet:**
- Phase 1 set: 30 / 30 / 26 / 32
- Phase 4 lifted to: 35 / 34 / 28 / 37

---

## 4. Manual testing checklist

Read `.audit/phase2-manual-tests.md` once Railway picks up the deploy + Vercel rebuilds. Highlights:

1. **Anonymous flow** — incognito, visit Markets. Expect "Sign in to view Top Gainers and Top Losers." with a Sign In CTA. Visit Screener. Expect static curated list + "AI-estimated data mode · Sign in for live financials."
2. **Signed-in flow** — refresh Markets after signing in. Gainers + losers populate. Run an analysis. `dataSource` includes "FMP".
3. **CORS** — open dev tools console of a third-party site, `fetch('https://stratalyx-backend-production.up.railway.app/api/health')`. Browser blocks (no `Access-Control-Allow-Origin` header).
4. **Security headers** — inspect any `/api/*` response. `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`, `Content-Security-Policy-Report-Only: …` (NOT the enforcing variant — that's flipped after ~7 days).
5. **CSP violations** — manually inject a script from `example.com` in the dev console. Watch Railway logs for `event: 'csp_violation'` JSON.
6. **FMP key UI is gone** — search the running app for "Add API Key" / "FMP API Key Management". Should match nothing.
7. **Old share links work** — visit `/share/AAPL/buffett`. Should redirect into the app and trigger an analysis. Existing public links don't break.
8. **Auth-failure logs** — `curl https://stratalyx-backend-production.up.railway.app/api/fmp/profile/AAPL`. Expect Railway log line: `{"event":"auth_rejected","route":"/fmp/profile/AAPL","ip":"...","ts":"...","reason":"missing_token"}`.
9. **Valuation module** — `node -e "const v = require('./server/valuation'); console.log(JSON.stringify(v.valuationFor('buffett', { ticker: 'AAPL', marketPrice: 180, marketCapUSD: 2.8e12, ratios: { eps: 6.5, bookValuePerShare: 4.5 }, cashFlow: { freeCashFlow: 1e11 }, sharesOutstanding: 1.5e10, earningsGrowthRate: 0.10 }), null, 2))"`. Expect a `ValuationOutput` with method "Two-stage DCF on owner earnings (FCF)", positive intrinsicValueMid, populated sensitivity grid.

---

## 5. Open product decisions (deferred to you)

Tracked in `.audit/FOLLOWUPS.md`. Highlights:

- **Upstash account** — gates Phase 2.4 rate limiter, Phase 3.2 cache, Phase 3.4 cost ceiling. ~5 minutes of your time.
- **CSP enforcement flip** — ship CSP without `Report-Only` after ~7 days of clean logs. You decide when.
- **Domain canonicalization** — `stratalyx.vercel.app` (in vercel.json) vs `stratalyx.ai` (in robots.txt + sitemap.xml). Pick one.
- **Sentry / PostHog / Stripe / Resend accounts** — gate Phases 5, 6, 7.
- **Phase 9 OG-image platform** — `@vercel/og` on a Vercel function vs `satori` on Railway. Decision deferred to start of Phase 9.

---

## 6. Cost model

Rough per-active-user/month estimate, post-Phase-2 deployment:

| Component | Cost driver | Per active user / month |
|---|---|---|
| FMP | analyses × ~7 endpoints / 70% cache hit rate | ~$0.10 (50 analyses × 7 calls × 30% miss × $0.0001 per call estimate) |
| LLM (Haiku free tier) | 5 free analyses × 2k input + 2k output tokens | ~$0.003 |
| LLM (Sonnet pro tier) | 100 analyses × 2k+2k tokens | ~$2.40 |
| LLM (Opus power tier) | 500 analyses × 2k+2k tokens | ~$60 |
| Supabase | usage tracking + auth | <$0.01 (well within free tier ~50k MAU) |
| Vercel | static + serverless | <$0.01 (well within hobby tier <100GB bandwidth) |
| Railway | always-on Express | ~$0.20 ($5/mo / 25 active users) |

**Per-tier monthly contribution margin (very rough):**
- Free: −$0.30 (FMP + Haiku + infra)
- Pro $19: $19 − ~$3 = $16 net
- Power $49: $49 − ~$60 = **−$11 net (loss-making at full cap)** — model stress-tests 500 analyses; real usage is likely 100-200 → break-even around 200 analyses.

**Implications:**
1. Free tier is loss-leader — model relies on free → paid conversion.
2. Power tier needs a cap on Opus usage OR a higher price point (consider $79).
3. FMP cache hit rate is the single biggest variable. Phase 3.2 (Upstash-backed cache with stampede protection) is high-leverage cost work.

---

## 7. Discovered issues (not in the plan)

1. **`npm run typecheck` was a no-op.** It ran `tsc --noEmit` against the project-references root tsconfig, which compiles nothing. Switched to `tsc -b --pretty false`. Surfaced 19 latent TS errors, all fixed.
2. **AnalyzerModal:1108 runtime bug.** "Run another" button after a comparison referenced setters that weren't threaded through props. Would throw `ReferenceError`. Fixed.
3. **Phase 0 coverage was inflated.** Captured during a flaky failure that excluded ~195 statements from the denominator. Real baseline (post-fix) was 30.48%, not 32.58%.
4. **Robots.txt + sitemap.xml hardcode `stratalyx.ai`** but the live deploy is at `stratalyx.vercel.app`. Listed in followups.
5. **Existing `/share/*` Express routes already do server-side OG-tag injection.** Phase 9 should preserve these as 301 redirects to the new `/a/{slug}` URLs, not blow them away — existing share links in the wild keep working.
6. **`@supabase/supabase-js` uses `import.meta.env`** which ts-jest can't compile in CJS mode. Worked around with `src/__mocks__/supabaseMock.ts` + a Jest `moduleNameMapper` entry.

---

## 8. Risks and mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM-hallucinated DCF numbers go viral via screenshot | High | Brand-extinction | **Phase 4.3 not yet shipped.** Until pipeline integration lands, the LLM still produces IV/MoS. Recommend prioritizing 4.3 next session. |
| Phase 2.4 (rate limiter) deferred → cost runaway from a single bad actor | Medium | $$$$ | Existing `express-rate-limit` IP-only limiter still active. Phase 2.4 unblocks once Upstash is provisioned. |
| CSP report-only never flipped to enforcing | Medium | Low security ROI | `.audit/FOLLOWUPS.md` #7 tracks. CSP violations log structurally — Phase 5 routes to Sentry. |
| Power-tier costs exceed revenue | Medium | $$ | Cap Opus daily call count per user; consider $79 price point. Visible once Phase 5 admin metrics dashboard ships. |
| Auth gate breaks anonymous /search and /news | Low (auth-gated routes scoped narrowly) | UX | Verified: only `/fmp/*` and `/market-movers` require auth. `/search`, `/news`, `/price`, `/history` stay anonymous. |
| Existing share links break post-deploy | Low | Distribution | Verified: `/share/:ticker/:investorId` Express route preserved + tested. |

---

## 9. Recommended next steps (in priority order)

1. **You:** provision Upstash + Stripe accounts in parallel (~10 min total). Unblocks phases 2.4, 3.2-3.4, 6.
2. **Me, next session:** Phase 4.3 — server-side `/api/analyze` orchestration + new prompt template + Zod validation. Wires the deterministic engine into the production analysis flow. ~6-10 commits.
3. **You:** monitor Railway logs for `csp_violation` events for ~7 days. Tell me when clean and I flip CSP from Report-Only to enforcing (~2 commits).
4. **Me:** Phase 4.5 — Supabase `analyses` table migration + persistence layer. Requires you to apply the migration in Supabase. Then Phase 4.4 (UI display of sensitivity / inputs / methods page).
5. Once all of Phase 4 is verified in production, **Phase 9** can begin — the public share pages, OG images, compare pages, Stratalyx Index. The viral distribution motion.

Phases 5 (observability), 6 (Stripe), 7 (alerts + Verdict), 8 (disclaimers), 10 (embeds), 11 (polish) all sequence after the above.
