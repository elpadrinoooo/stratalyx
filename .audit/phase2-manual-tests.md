# Phase 2 manual verification checklist

Scenarios automated tests can't cover. Run through these once Railway picks
up the deploy + Vercel rebuilds.

## Auth gate (Phase 2.1)

- [ ] **Anonymous on Markets screen.** Open the deployed app in an incognito window. Switch to the Markets tab. Expect: index sparklines render (Yahoo, no auth), but a yellow banner reading "Sign in to view Top Gainers and Top Losers." with a Sign In button.
- [ ] **Anonymous on Screener screen.** Same incognito. Expect: the static curated stock list renders. The status strip reads "AI-estimated data mode · Sign in for live financials."
- [ ] **Sign in.** Use a test account (or sign up). Refresh Markets. Expect: gainers + losers populate. Refresh Screener. Status strip flips to "Live data active — Real-time FMP financials injected into every analysis."
- [ ] **Run an analysis while signed in.** Open the analyzer modal, type AAPL, click Analyze. Expect: result with `dataSource` mentioning "FMP" and Live Data badge active.
- [ ] **Run an analysis while signed out** (sign out, then immediately try). Expect: a toast nudges you to sign in, the auth modal pops automatically.

## CORS (Phase 2.2)

- [ ] **Same-origin works.** App on `https://stratalyx.vercel.app` calls `/api/health` — succeeds.
- [ ] **Browser console: cross-origin blocked.** From the dev tools console of any unrelated site, run `fetch('https://stratalyx-backend-production.up.railway.app/api/health')`. Expect: browser blocks, network tab shows the response without an `Access-Control-Allow-Origin` header.
- [ ] **Localhost dev port still works.** Run `npm run dev`, app hits `localhost:3001` from `localhost:5173` — succeeds. Then bump `dev:client`'s port (`vite --port 3500`) and confirm it still works without an env change.

## Security headers (Phase 2.3)

- [ ] **Headers visible in network tab.** Inspect any `/api/*` response. Confirm:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (on app routes)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - `Content-Security-Policy-Report-Only: …`  (NOT the enforcing header)
- [ ] **iframe attempt blocked.** `<iframe src="https://stratalyx.vercel.app/" />` on a third-party page — browser refuses to render.
- [ ] **CSP violations logged.** Manually trigger a violation: in dev tools console, `var s=document.createElement('script'); s.src='https://example.com/x.js'; document.head.appendChild(s)`. Watch Railway logs for `event: 'csp_violation'`.
- [ ] **No regressions.** Click through every screen — Markets, Screener, Strategies, Watchlist, History, Comparisons, MarketEvents, News, Account. Open the analyzer modal. Sign in/out. Watch dev tools for any CSP warnings; if a legitimate resource is being report-blocked, add it to the allowlist in [.audit/csp-decisions.md](csp-decisions.md) before going enforcing.

## FMP key UI removal (Phase 3.1)

- [ ] **Modal is gone.** Search the running app for "Add API Key" / "FMP API Key Management" / "Add FMP API key" — none should appear.
- [ ] **Navbar pill is gone.** Top-right of the navbar should show usage pill + auth/account button + Analyze button. The KeyRound icon button is removed.
- [ ] **Old shareable links still work.** Visit `https://stratalyx.vercel.app/share/AAPL/buffett` — should redirect into the app and trigger an analysis (any pre-existing share link in the wild keeps working).

## Auth-failure observability

- [ ] **401 logs are structured.** Trigger an unauthenticated `/api/fmp/profile/AAPL` (e.g. `curl https://stratalyx-backend-production.up.railway.app/api/fmp/profile/AAPL`). Expect a Railway log line:
      `{"event":"auth_rejected","route":"/fmp/profile/AAPL","ip":"...","ts":"...","reason":"missing_token"}`
- [ ] **CORS rejection logs are structured.** Trigger by setting an invalid origin from a script tag — Railway log: `{"event":"cors_rejected","origin":"...","ts":"..."}`.

## What Phase 2 deliberately does not cover

- Tier-aware rate limiting — parked behind Upstash provisioning ([FOLLOWUPS.md](FOLLOWUPS.md) #1).
- CSP enforcement — currently report-only; flip after ~7 days clean (#7).
- Stripe webhook signature checks — Phase 6.
- Account lockout / password rate limiting — Supabase Auth handles natively.
