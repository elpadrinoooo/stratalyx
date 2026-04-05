# Stratalyx — Implementation TODO

**Last Updated:** April 2026
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

## Recently Completed (April 2026)

- [x] `[CODE]` **Markets dashboard** — index sparklines, top movers, market status, ad placeholders
- [x] `[CODE]` **News screen** — FMP-powered news feed with thumbnails, source tags, market sentiment
- [x] `[CODE]` **Market Events screen** — earnings calendar, economic events, IPO pipeline
- [x] `[CODE]` **Path-based share URLs with OG meta tags** — `/share/:ticker/:investorId` and
      `/share/comparison/:ticker/:investors` serve HTML with injected `og:title`, `og:description`,
      `og:image`, `og:url`, `twitter:card` for real social preview cards
- [x] `[CODE]` **Comparisons share button** — per-comparison link copied to clipboard
- [x] `[CODE]` **Affiliate link system** — `server/affiliate.json` + `/api/link?url=` redirect route;
      all investor source links now route through the proxy for tracking
- [x] `[CODE]` **Admin dashboard** — password-protected screen (via `?admin=1`); affiliate map editor
      with live save to disk; accessible via `ADMIN_PASSWORD` env var
- [x] `[CODE]` **Export for NotebookLM** — admin-only 📋 Export button in AnalyzerModal; copies
      formatted markdown of the full analysis result to clipboard
- [x] `[CODE]` **OG default image** — `public/og-default.svg` served at `/og-default.png`
- [x] `[CODE]` **React Error Boundaries** — `<ErrorBoundary>` wraps all screens and AnalyzerModal

---

## PHASE 0 — Pre-Launch: Compliance + Deploy
### (Complete before charging a single user)

### Week 1: Legal Hygiene (BLOCKING)

- [ ] `[LEGAL]` 🔴 **Book 2-hour consultation with a fintech securities attorney**
      Confirm: is the "educational framework alignment" positioning sufficient to avoid RIA
      registration? What changes are required? Cost: ~$600–$1,000. Non-optional.
      Look for: securities law specialist, fintech experience, SEC/FINRA background.

- [x] `[CODE]` 🔴 ~~**Reframe all BUY/HOLD/AVOID verdict language**~~ **DONE** — internal enum values
      kept for type safety; all UI display goes through `verdictLabel()` in `src/engine/utils.ts`:
      BUY → "Strong Framework Alignment", HOLD → "Mixed Framework Signals",
      AVOID → "Weak Framework Alignment". Admin export text also updated (April 2026).

- [x] `[CODE]` 🔴 ~~**Add legal disclaimer box to AnalyzerModal above the Run button**~~ **DONE** —
      amber box below the input row; non-dismissible. Also a second disclaimer at line ~330 shown
      during history/comparison view in the modal.

- [x] `[CODE]` 🔴 ~~**Add disclaimer footer to every analysis result card**~~ **DONE** — grey text at
      bottom of result section: "Educational framework analysis only — not investment advice.
      AI outputs may be inaccurate or incomplete. Stratalyx is not a registered investment adviser."

- [x] `[CODE]` 🔴 ~~**Add disclaimer to shareable analysis URLs**~~ **DONE** — share banner shown on
      mount for both analysis and comparison share links; shows on every share URL load.

- [x] `[CODE]` 🔴 ~~**Add affiliation disclaimer to Strategies Library**~~ **DONE** — "Framework
      criteria are based on publicly documented writings... Not affiliated with or endorsed by
      [Investor Name] or their firm." shown under each investor header.

- [x] `[CODE]` 🔴 ~~**Change first-person LLM voice to third-person in prompts**~~ **DONE** — prompt
      explicitly instructs "Write all output in third person... Do not write as if you are
      [investor name]." All 11 investor `ctx` strings are third-person ("Apply X's framework...").

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

- [x] `[OPS]` ~~**Add React Error Boundaries**~~ **DONE** — all screens + AnalyzerModal wrapped (TD-02 cleared).

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

- [ ] `[CODE]` **Data flywheel — analysis storage infrastructure** ← strategic moat
      - On every analysis run: store `{ ticker, investor_id, score, verdict, price_at_analysis,
        key_signals, timestamp, user_id }` in Supabase `analyses` table
      - Anonymous analysis (no auth): store with `user_id = null`
      - Enables: accuracy retrospectives, aggregate scoring trends, SEO page data
      - This is the core proprietary dataset — more runs = more accurate framework benchmarks

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

- [ ] `[CODE]` **Portfolio analysis mode** ← highest-value retention feature (founder assessment)
      - New screen or modal: "Analyze my portfolio"
      - Input: up to 10 ticker symbols
      - Output: per-stock framework scores + portfolio aggregate alignment score
      - CTA: "Analyze underperforming holdings in detail"

- [ ] `[CODE]` **Price alert system** ← top engagement driver between investment decisions
      - Watch a stock at a specific price level: "Alert me when AAPL drops below $180"
      - Notify via email: re-runs analysis at alert trigger, shows score change
      - Requires: Supabase alert table + daily price cron job

- [ ] `[CODE]` **Shareable analysis image cards**
      - Client-side PNG export of analysis result using `html-to-image`
      - 1200×630 branded card with: score, verdict, ticker, investor, top 3 signals
      - Download + share button in AnalyzerModal result section
      - Drives organic social sharing (Twitter/X, LinkedIn, Reddit)

- [ ] `[CODE]` **Analysis accuracy dashboard** (data flywheel prerequisite)
      - Store every analysis run in Supabase: `ticker`, `investor_id`, `score`, `verdict`,
        `price_at_analysis`, `timestamp`
      - 90-day retrospective: compare original verdict vs. actual stock performance
      - Display in History screen as "accuracy tracking" — builds trust and legitimacy
      - Admin view: aggregate accuracy metrics across all users and frameworks

- [ ] `[CODE]` **Remove multi-LLM selector as user-facing feature**
      - Lock to `claude-haiku-4-5-20251001` server-side (already done)
      - Remove any provider/model picker UI from AnalyzerModal and settings
      - Rationale: multi-LLM is an engineering detail, not a user value proposition;
        complicates pricing and support; adds no meaningful output quality difference

- [ ] `[CODE]` **Screener batch mode**
      - Allow running a framework filter across all stocks in a watchlist or preset list
      - Example: "Show all S&P 500 stocks scoring >7/10 under Graham's criteria"
      - Output: sortable table of ticker / score / key pass-fail signals
      - Phase 1: manual list of 100 large-caps; Phase 2: FMP screener endpoint

- [ ] `[DESIGN]` **Mobile UX audit**
      - Test all screens at 375px (iPhone SE) and 390px (iPhone 14)
      - Fix any horizontal scrolling
      - Ensure touch targets are 44×44px minimum
      - Verify analysis output is readable without scrolling (score + signals above fold)

- [x] `[CODE]` ~~**React Error Boundaries on all screens**~~ **DONE** (Phase 0)

---

## PHASE 3 — Growth
### (Complete within months 3–6)

### Distribution

- [ ] `[CODE]` **SEO public analysis pages** ← compound organic growth engine
      - Pre-generate static pages: `/analysis/AAPL/buffett`, `/analysis/MSFT/graham`, etc.
      - Cover all S&P 500 stocks × all 11 investor frameworks = ~5,500 pages
      - Each page: OG meta, article schema markup, full framework analysis output
      - Refresh weekly via cron; store results in Supabase for deduplication
      - Submit `sitemap.xml` to Google Search Console
      - Target: "AAPL warren buffett analysis", "NVDA benjamin graham score" long-tail keywords

- [ ] `[CODE]` **Community annotations on analysis results**
      - Users can upvote/downvote specific framework signals: "I agree this moat is wide"
      - Annotations stored in Supabase: `analysis_id`, `signal_index`, `vote`, `user_id`
      - Aggregate displayed on result cards: "12 investors agree with this signal"
      - Differentiator: turns Stratalyx into a community platform, not just a tool

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
- [ ] `[BIZ]` **B2B licensing to financial newsletters** — "powered by Stratalyx" white-label
      offering; flat $500–$2,000/month per newsletter; target: The Motley Fool, Seeking Alpha
      contributors, Substack finance writers with >10k subscribers
- [ ] `[CODE]` Batch analysis (run a strategy across all watchlist stocks at once)

---

## Technical Debt (Address alongside features, not as separate sprints)

- [ ] `[CODE]` TD-01: Migrate inline styles to CSS Modules (tackle during Phase 2 mobile audit)
- [x] `[CODE]` ~~TD-02: React Error Boundaries — wrap all screens~~ **DONE** (April 2026)
- [ ] `[CODE]` TD-03: Move FMP cache to Redis for multi-user production (Phase 1)
- [ ] `[CODE]` TD-05: Remove in-app FMP key modal for production (use `.env` exclusively)
- [ ] `[CODE]` TD-06: Accessibility audit — WCAG AA compliance (Phase 1)

---

## Quick Wins (Can be done any time, < 2 hours each)

- [x] `[CODE]` ~~Add `<meta>` description and Open Graph tags for social sharing~~ **DONE** — path-based share routes with full OG injection (April 2026)
- [ ] `[DESIGN]` **Real OG image** — replace `og-default.svg` placeholder with a proper 1200×630
      PNG (use Figma or Canva); current SVG works but won't render in some Twitter/Slack previews
- [ ] `[CODE]` Add favicon (use the Stratalyx logo or a simple hexagon)
- [ ] `[CODE]` Add `robots.txt` and `sitemap.xml` for SEO — required before submitting to Google
      Search Console; blocks crawlers from /api/* routes; sitemap lists all share URLs
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
