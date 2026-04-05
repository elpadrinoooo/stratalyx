# Stratalyx — Implementation TODO

**Last Updated:** March 2026
**Purpose:** Prioritised checklist of every action required to go from local build to
revenue-generating product. Ordered by phase and priority within each phase.

Each item is tagged with:
- `[CODE]` — requires a code change
- `[LEGAL]` — legal / compliance action
- `[OPS]` — infrastructure / deployment
- `[CONTENT]` — content creation
- `[BIZ]` — business / admin action
- `[DESIGN]` — UX / design change

Items marked `🔴 BLOCKING` must be completed before taking any money.

---

## PHASE 0 — Pre-Launch: Compliance + Deploy
### (Complete before charging a single user)

### Week 1: Legal Hygiene (BLOCKING)

- [ ] `[LEGAL]` 🔴 **Book 2-hour consultation with a fintech securities attorney**
      Confirm: is the "educational framework alignment" positioning sufficient to avoid RIA
      registration? What changes are required? Cost: ~$600–$1,000. Non-optional.
      Look for: securities law specialist, fintech experience, SEC/FINRA background.

- [ ] `[CODE]` 🔴 **Reframe all BUY/HOLD/AVOID verdict language throughout the product**
      - `BUY` → `Strong Framework Alignment`
      - `HOLD` → `Mixed Framework Signals`
      - `AVOID` → `Weak Framework Alignment`
      - Files to change: `src/engine/sanitise.ts`, `src/screens/AnalyzerModal.tsx`,
        `src/screens/HistoryScreen.tsx`, `src/screens/WatchlistScreen.tsx`,
        `src/screens/ComparisonsScreen.tsx`, `src/types/analysis.ts` (Verdict type)
      - Update all tests that assert on `BUY`/`HOLD`/`AVOID` text

- [ ] `[CODE]` 🔴 **Add legal disclaimer box to AnalyzerModal above the Run button**
      Text: "Stratalyx applies documented public investment frameworks for educational purposes
      only. All outputs are AI-generated and do not constitute personalised investment advice or
      a recommendation to buy or sell any security. Stratalyx is not a registered investment
      adviser. Always consult a qualified financial adviser."
      Style: amber info box, small text, non-dismissible.

- [ ] `[CODE]` 🔴 **Add disclaimer footer to every analysis result card**
      Small grey text at the bottom of every result: "Educational framework analysis only.
      Not investment advice."

- [ ] `[CODE]` 🔴 **Add disclaimer to shareable analysis URLs**
      When `#/analysis/TICKER/investorId` is resolved on mount, show a one-time banner:
      "This is an educational framework analysis. Not personalised investment advice."

- [ ] `[CODE]` 🔴 **Add affiliation disclaimer to Strategies Library**
      Under each investor's name/header: "Framework criteria are based on publicly documented
      writings, letters, and interviews. Not affiliated with or endorsed by [Investor Name] or
      their firm."

- [ ] `[CODE]` 🔴 **Change first-person LLM voice to third-person in prompts**
      Audit `src/engine/prompt.ts` — ensure investor context (`ctx` field) frames the output as
      "Under [Investor]'s framework..." not "I, [Investor], would..."
      Review all 11 investor `ctx` strings in `src/constants/investors.ts`.

- [ ] `[LEGAL]` 🔴 **Draft Terms of Service**
      Must include: educational purpose only, no investment advice, not an RIA, no liability for
      financial decisions made based on outputs, arbitration clause, governing law.
      Can use a fintech ToS template as starting point — but have attorney review.

- [ ] `[LEGAL]` 🔴 **Draft Privacy Policy**
      Must cover: email collection, analytics (PostHog), error monitoring (Sentry), LLM data
      forwarding to Anthropic API, FMP data retrieval, right to deletion, GDPR basics.

- [ ] `[LEGAL]` **Review FMP API Terms of Service**
      Confirm: caching responses server-side, displaying in UI, forwarding to Anthropic LLM
      are all permitted. Document findings.

- [ ] `[LEGAL]` **Review Anthropic API Terms of Service**
      Confirm: financial analysis use case is permitted. Check data handling provisions.

### Week 1–2: Production Deployment

- [ ] `[OPS]` **Register domain** — check stratalyx.ai availability (or .com fallback)

- [ ] `[OPS]` **Deploy frontend to Vercel**
      Connect GitHub repo → Vercel. Set environment variables. Configure custom domain.

- [ ] `[OPS]` **Deploy backend proxy to Railway**
      Connect GitHub repo → Railway service. Set `ANTHROPIC_API_KEY`, `FMP_API_KEY`,
      `FRONTEND_URL`, `NODE_ENV=production`. Configure custom subdomain (api.stratalyx.ai).

- [ ] `[OPS]` **SSL certificates** — automatic via Vercel + Railway, verify both work.

- [ ] `[OPS]` **Set CORS in server/index.ts for production domain**
      Change `process.env.FRONTEND_URL` to the actual deployed frontend URL.

- [ ] `[OPS]` **Set up Sentry** (error monitoring)
      - Install `@sentry/react` in frontend
      - Install `@sentry/node` in backend
      - Configure DSN from Sentry dashboard
      - Verify errors from production show up in Sentry dashboard

- [ ] `[OPS]` **Set up PostHog** (product analytics)
      - Install `posthog-js` in frontend
      - Track: `analysis_run`, `framework_selected`, `ticker_searched`, `share_link_copied`,
        `upgrade_modal_shown`, `paywall_hit`
      - Do NOT track: ticker symbols in personally identifiable context

- [ ] `[OPS]` **Add React Error Boundaries**
      Wrap all 5 screens and AnalyzerModal with Error Boundary components (TD-02 in tech debt).
      Display graceful error UI instead of white screen crash.

- [ ] `[OPS]` **Smoke test production deployment**
      - Run 3 analyses end-to-end on production
      - Verify FMP data is fetched
      - Verify analysis completes
      - Verify error states work
      - Verify share link resolves correctly

### Week 2: Email Capture

- [ ] `[CODE]` **Add email capture to the app**
      - Simple modal or inline form: "Get notified when new investor frameworks launch"
      - Show after user's first completed analysis
      - Store emails in Supabase (even before auth is built) or a simple Airtable
      - Do not show again once dismissed

- [ ] `[CONTENT]` **Create lead magnet PDF: "How Buffett Evaluates the Magnificent 7"**
      - Run each of AAPL, MSFT, GOOGL, META, NVDA, AMZN, TSLA through Buffett framework
      - Format as a clean 8-page PDF (one stock per page + intro)
      - Use the actual Stratalyx output structure as the template
      - Offer in exchange for email signup

- [ ] `[BIZ]` **Set up professional email** (hello@stratalyx.ai or founder@stratalyx.ai)
      Use Google Workspace or Fastmail. Do not use Gmail for product correspondence.

---

## PHASE 1 — Monetisation Foundation
### (Complete within first 4–6 weeks post-launch)

### Authentication

- [ ] `[CODE]` **Set up Supabase project**
      - Create project at supabase.com
      - Enable Auth (email + Google OAuth)
      - Create `users` table with: `id`, `email`, `tier` (free/pro), `analyses_this_month`,
        `analyses_reset_at`, `stripe_customer_id`, `stripe_subscription_id`

- [ ] `[CODE]` **Implement sign-up flow**
      - Email + password form
      - "Continue with Google" OAuth button
      - Mandatory ToS + disclaimer checkbox (required, not optional)
      - Email verification before first analysis

- [ ] `[CODE]` **Implement sign-in flow**
      - Email + password
      - Google OAuth
      - "Forgot password" → email reset flow

- [ ] `[CODE]` **Persist analyses and watchlist to Supabase on auth**
      - Create `analyses` table: `user_id`, `ticker`, `investor_id`, `result` (JSONB), `created_at`
      - Create `watchlist` table: `user_id`, `ticker`, `added_at`
      - Migrate in-memory/localStorage state to database on login

- [ ] `[CODE]` **Server-side usage counter**
      - Track `analyses_this_month` per user in Supabase
      - Increment on every successful analysis
      - Reset on first day of each calendar month
      - Check limit before running analysis (return 402 if free user at limit)

### Billing (Stripe)

- [ ] `[OPS]` **Set up Stripe account** and create products:
      - Product: "Stratalyx Pro Monthly" — $19/month recurring
      - Product: "Stratalyx Pro Annual" — $149/year recurring
      - Coupon: FOUNDER50 — 50% off first 3 months (for early subscribers)

- [ ] `[CODE]` **Add Stripe Checkout redirect** on "Upgrade to Pro" click
      - Server endpoint: `POST /api/billing/create-checkout-session`
      - Returns Stripe Checkout URL
      - Client redirects to URL

- [ ] `[CODE]` **Handle Stripe webhooks**
      Server endpoint: `POST /api/billing/webhook`
      Handle events:
      - `customer.subscription.created` → set user tier to 'pro'
      - `customer.subscription.deleted` → set user tier to 'free'
      - `invoice.payment_failed` → send payment failure email, set grace period

- [ ] `[CODE]` **Add paywall modal** (triggered at 4th analysis attempt for free users)
      Show: "You've used your 3 free analyses this month. Upgrade to Pro for unlimited access."
      CTA: "Upgrade to Pro — $19/month" + "Start annual plan — $149/year (save 35%)"
      Include social proof when available: "Join X investors using Stratalyx Pro"

- [ ] `[CODE]` **Add Pro badge to navbar** for paying subscribers

- [ ] `[CODE]` **Add billing management link** in user settings
      "Manage subscription" → Stripe Customer Portal redirect

---

## PHASE 2 — Retention Loop
### (Complete within months 2–3)

### Re-engagement Notifications

- [ ] `[CODE]` **Earnings calendar integration**
      - `GET /api/fmp/earning_calendar` — fetch weekly, store in Supabase
      - Cron job: every morning, check if any watchlisted stock reports earnings today
      - Trigger re-analysis for affected users

- [ ] `[OPS]` **Set up transactional email provider** (Resend recommended)
      - Configure DNS records for email sending
      - Create email templates: earnings alert, price movement alert, weekly digest

- [ ] `[CODE]` **Earnings alert email**
      Template: "[TICKER] just reported earnings — [Investor] score changed [OLD] → [NEW]"
      Body: summary of what changed in the key framework criteria, CTA to view in product

- [ ] `[CODE]` **Price movement alert**
      - Daily cron: check price delta for all watchlisted stocks across all users
      - If delta > 5%: email user with current framework score vs. score at last analysis
      - Limit to 1 email per stock per user per 48 hours

- [ ] `[CODE]` **Weekly digest email** (Sunday 6pm user local time)
      - Send to users inactive for >7 days
      - Content: watchlist summary, any score changes this week, 1 featured analysis
      - Unsubscribe link mandatory

- [ ] `[CODE]` **Notification preferences page**
      Users can toggle: earnings alerts on/off, price alerts on/off, weekly digest on/off.

### Product Improvements

- [ ] `[CODE]` **Restructure analysis output for scan-first reading**
      New order:
      1. Framework alignment badge + score (above the fold)
      2. 5 key framework signals — pass/fail list (icon + criterion + result)
      3. 2-sentence thesis summary
      4. "Read full analysis ↓" expand for prose + KPI grid + risks + strengths

- [ ] `[CODE]` **Analysis versioning — score delta display**
      If user has run this stock + framework before:
      Show: "Score changed from 7.1 → 8.4 since your last analysis on [date] at $[price]"
      Store: `previous_score`, `previous_price`, `previous_date` in analysis record

- [ ] `[CODE]` **Portfolio analysis mode**
      - New screen or modal: "Analyze my portfolio"
      - Input: up to 10 ticker symbols
      - Output: per-stock framework scores + portfolio aggregate alignment score
      - CTA: "Analyze underperforming holdings in detail"

- [ ] `[DESIGN]` **Mobile UX audit**
      - Test all screens at 375px (iPhone SE) and 390px (iPhone 14)
      - Fix any horizontal scrolling
      - Ensure touch targets are 44×44px minimum
      - Verify analysis output is readable without scrolling (score + signals above fold)

- [ ] `[CODE]` **React Error Boundaries on all screens** (if not done in Phase 0)

---

## PHASE 3 — Growth
### (Complete within months 3–6)

### Distribution

- [ ] `[CONTENT]` **Write 10 SEO cornerstone articles**
      Priority order (by estimated search volume):
      1. "Warren Buffett's stock evaluation criteria — the complete guide"
      2. "How Benjamin Graham's Graham Number works — with examples"
      3. "Peter Lynch's GARP strategy: how to find growth at a reasonable price"
      4. "Charlie Munger's mental models for investing"
      5. "Joel Greenblatt's Magic Formula explained"
      6. "Ray Dalio's All-Weather investing principles"
      7. "Howard Marks on risk: the most important thing in investing"
      8. "Seth Klarman's value investing philosophy"
      9. "How to analyze a stock like a legendary investor"
      10. "Best stock analysis tools for self-directed investors 2026"

- [ ] `[BIZ]` **Reddit launch posts**
      - r/investing: "I built a tool that applies Buffett's criteria to any stock with live data"
      - r/ValueInvesting: "How would Graham evaluate NVDA? I ran it through his framework"
      - r/stocks: community feedback request post
      - Space posts 1 week apart. One per community.

- [ ] `[BIZ]` **Twitter/X daily analysis thread** — begin on launch day, never stop
      Format: "[TICKER] through [Investor]'s lens — [Score]/10 [Verdict]"
      + 5 key framework signals as bullet points
      + "Full analysis: [link]"

- [ ] `[BIZ]` **Affiliate program setup**
      - 30% recurring commission on referred subscribers
      - 90-day cookie
      - Custom landing page per affiliate
      - Track via Rewardful or Lemon Squeezy (if switching from Stripe)
      - Reach out to 20 financial newsletters + YouTube channels personally

- [ ] `[CODE]` **Open source the core framework engine**
      - Create public GitHub repository: `stratalyx/stratalyx-core`
      - Include: `src/constants/investors.ts`, `src/engine/`, `src/types/`
      - Write a proper README: what it is, how to use it, how to contribute
      - Add CONTRIBUTING.md with instructions for adding investor frameworks
      - Submit to r/programming, HackerNews Show HN, Product Hunt

### Framework Expansion

- [ ] `[CODE]` **Add 5 new investor frameworks**
      Priority order:
      1. Stanley Druckenmiller (macro, momentum, concentration)
      2. Bill Ackman (activist, concentrated value)
      3. Philip Fisher extended (growth, scuttlebutt — expand existing)
      4. Michael Burry (deep contrarian, credit analysis)
      5. Terry Smith (quality compounder, UK perspective)

---

## PHASE 4 — Platform
### (Months 6–12)

- [ ] `[CODE]` Public API + developer documentation
- [ ] `[CODE]` Custom investor framework builder (user-defined criteria + weights)
- [ ] `[CODE]` Historical analysis replay (backtesting a framework on past data)
- [ ] `[BIZ]` Teams tier launch ($49/seat/month)
- [ ] `[BIZ]` B2B outreach to financial newsletter platforms and brokerage APIs
- [ ] `[CODE]` Batch analysis (run a strategy across all watchlist stocks at once)

---

## Technical Debt (Address alongside features, not as separate sprints)

- [ ] `[CODE]` TD-01: Migrate inline styles to CSS Modules (tackle during Phase 2 mobile audit)
- [ ] `[CODE]` TD-02: React Error Boundaries — wrap all screens (Phase 0)
- [ ] `[CODE]` TD-03: Move FMP cache to Redis for multi-user production (Phase 1)
- [ ] `[CODE]` TD-05: Remove in-app FMP key modal for production (use `.env` exclusively)
- [ ] `[CODE]` TD-06: Accessibility audit — WCAG AA compliance (Phase 1)

---

## Quick Wins (Can be done any time, < 2 hours each)

- [ ] `[CODE]` Add `<meta>` description and Open Graph tags for social sharing
- [ ] `[CODE]` Add favicon (use the Stratalyx logo or a simple hexagon)
- [ ] `[CODE]` Add `robots.txt` and `sitemap.xml` for SEO
- [ ] `[CODE]` Add loading skeleton for the full-market stock list fetch
- [ ] `[CODE]` Add "Copy to clipboard" button on analysis thesis paragraph
- [ ] `[CODE]` Show analysis timestamp on result cards ("Analyzed 3 days ago")
- [ ] `[CODE]` Add keyboard shortcut cheat sheet (? key to toggle)
- [ ] `[DESIGN]` Improve empty states — all screens should have a clear, helpful empty state

---

## Definition of "Launch-Ready"

The product is ready to be announced publicly when ALL of the following are true:

- [ ] Phase 0 (Legal + Deploy) checklist is 100% complete
- [ ] Verdict language reframed throughout
- [ ] Disclaimer appears in modal, footer, and on shareable links
- [ ] ToS and Privacy Policy are live and linked in the footer
- [ ] Attorney has reviewed and confirmed the educational positioning
- [ ] Production deployment is stable (no crashes in 48-hour smoke test)
- [ ] Error monitoring (Sentry) is active
- [ ] Analytics (PostHog) is capturing key events
- [ ] Email capture is collecting signups
- [ ] Lead magnet PDF is ready
