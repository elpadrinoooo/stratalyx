# Follow-ups for the founder

Things I cannot do because they require an account, an external dashboard,
a credit card, or a decision I shouldn't make on your behalf. Each entry
notes the **phase** it blocks and the **minimal action** you need to take.

I'll keep this file up to date as later phases run.

---

## Blocked on external account creation

### 1. Upstash Redis (rate limiter + later, FMP cache)
**Blocks:** Phase 2.4 (tier-aware rate limiting), Phase 3.2 (KV-backed FMP cache with stampede protection).
**Why:** Replaces the in-process `express-rate-limit` and the in-memory FMP cache with a shared store, so multiple Railway instances or a future Vercel Edge function see the same counters/cache.
**Action:** sign up at https://upstash.com → create a free Redis database (any region near Railway us-east) → copy these two values into Railway env vars:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
**Cost:** free tier covers ~10k commands/day; we'll use ~1k/day initially.

### 2. Sentry (error reporting)
**Blocks:** Phase 5.1.
**Action:** sign up at https://sentry.io → create a JS (React) project + a Node project (or one combined) → copy DSN + Auth Token (for source-map upload) into env:
  - `VITE_SENTRY_DSN` (frontend)
  - `SENTRY_DSN` (backend)
  - `SENTRY_AUTH_TOKEN` (CI only, for source maps)
  - `SENTRY_ORG`, `SENTRY_PROJECT` (CI only)

### 3. PostHog (product analytics)
**Blocks:** Phase 5.2.
**Action:** sign up at https://posthog.com (cloud, EU or US — pick whichever matches your data-residency preference) → create a project → copy the project API key:
  - `VITE_POSTHOG_KEY`
  - `VITE_POSTHOG_HOST` (usually `https://us.i.posthog.com` or EU equivalent)

### 4. Stripe (payments)
**Blocks:** Phase 6.
**Action:** sign up at https://stripe.com → activate account (will require business info) → in test mode, create three Products with monthly recurring Prices: Pro $19, Power $49 → grab keys:
  - `STRIPE_SECRET_KEY` (test or live, depending on phase)
  - `STRIPE_PUBLISHABLE_KEY` → `VITE_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET` (created when you register the webhook endpoint)
  - `STRIPE_PRICE_PRO`, `STRIPE_PRICE_POWER` (Price IDs)

### 5. Resend (transactional email + Verdict newsletter)
**Blocks:** Phase 7.
**Action:** sign up at https://resend.com → verify a sending domain (probably stratalyx.ai) → configure SPF/DKIM/DMARC records on the domain DNS → API key:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` (e.g., `verdict@stratalyx.ai`)

### 6. Google Search Console (SEO submission)
**Blocks:** Phase 9.4 — sitemap submission verification.
**Action:** add the property at https://search.google.com/search-console → verify ownership (DNS or HTML file) → submit `https://stratalyx.vercel.app/sitemap.xml` (or your custom domain) once Phase 9 ships dynamic sitemap generation.

---

## Blocked on a decision

### 7. CSP rollout strategy
**Status (Phase 2.3):** I'm shipping CSP in **`Content-Security-Policy-Report-Only`** mode first. Violations report to `/api/csp-report` and log only. After ~1 week of clean reports, promote to enforcing by changing one header.
**Action:** monitor `csp_violation` log entries for ~7 days. When clean, ping me and I'll flip the header.

### 8. Domain for production
**Status:** `vercel.json` and code reference `stratalyx.vercel.app`; `public/robots.txt` and `public/sitemap.xml` reference `stratalyx.ai`. The two don't match.
**Action:** decide canonical domain. If `stratalyx.ai`, configure custom domain in Vercel + Railway. I'll then update `CORS_ALLOWED_ORIGINS`, `og:url` defaults, and the sitemap host in one commit.

### 9. Brand guideline doc (for share pages, OG images, email)
**Status:** Phase 9 + Phase 7 produce public-facing surfaces. The plan's voice rules ("confident, precise, no hype") are clear enough for me to draft, but final tone is yours.
**Action:** when Phase 9 lands a draft share page, review the copy + OG image and either approve or send back specific changes.

### 10. Legal copy (ToS, Privacy Policy, disclaimers)
**Status (Phase 8):** I'll draft based on the plan's bullets. The plan explicitly says "This phase requires my review before commit."
**Action:** review the drafts before they merge. Likely also worth a $300-$1,000 lawyer review pre-launch if revenue is on the line.

---

## Track-only (no action needed)

### 11. Phase 2.4 deferred
Phase 2.4 (Upstash-backed rate limiter) is parked until item #1 above is done. Existing `express-rate-limit` keeps working in the meantime; it's IP-only, not user/tier-aware, but acceptable for current traffic.

### 12. Phase 9 OG image platform decision
Phase 9.2 (dynamic OG image generation) needs either (a) a single Vercel function for `/api/og/{slug}` using `@vercel/og`, or (b) `satori` + `@resvg/resvg-js` on Railway. I'll pick at the start of Phase 9 based on Railway cold-start measurements; flagging here so you're not surprised.
