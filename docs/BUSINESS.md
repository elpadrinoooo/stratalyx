# Stratalyx — Business Strategy

**Version:** 1.0.0
**Last Updated:** March 2026
**Status:** Pre-Launch Planning
**Classification:** Internal — Founder Reference

---

## Overview

This document captures the business model, go-to-market strategy, legal compliance framework, and
competitive positioning for Stratalyx. It is a living document and should be updated as decisions
are made and validated through user feedback.

---

## 1. Business Model

### 1.1 Model: Freemium SaaS

Stratalyx monetises through a freemium subscription model. The free tier creates top-of-funnel
volume and word-of-mouth. The Pro tier captures users who find genuine value and want unlimited
access.

| Tier | Price | Limits | Target user |
|------|-------|--------|-------------|
| **Free** | $0 | 3 analyses/month, Buffett + Lynch frameworks only, no export | Students, casual users, word-of-mouth |
| **Pro** | $19/month or $149/year | Unlimited analyses, all frameworks, portfolio analysis, history export, watchlist sync | Active self-directed investors |
| **Teams** | $49/seat/month | Everything in Pro + shared watchlists, team history, API access | Future — small investment clubs, advisory firms |

**Key pricing rationale:**
- $19/month is the validated price band for retail investor tools (Seeking Alpha $19, Simply Wall St
  $15, Koyfin $49). Users who read financial content are accustomed to this price point.
- Annual plan at $149/year (35% discount) dramatically reduces churn. Annual subscribers retain at
  80–90% vs 60–65% for monthly.
- 3 free analyses/month (not 10) forces the decision to upgrade within the first week, not the
  first month. This is deliberate — 10 free analyses delays the paywall long enough that users
  never feel urgency.

### 1.2 Monetisation Sequence

Phase the rollout to avoid building payment infrastructure before proving the product has value:

| Phase | Timing | Action |
|-------|--------|--------|
| 0 | Now | No paywall. Email capture only. Build pre-launch list. |
| 1 | Month 1 | Deploy free tier. Hard limit at 3 analyses/month. No payment yet. |
| 2 | Month 2 | Add Stripe paywall. Founder discount: $9/month for first 50 subscribers. |
| 3 | Month 3+ | Full $19/month Pro tier. Annual plan at $149. |

### 1.3 Open Source Strategy

After achieving 100 paying subscribers and validating product-market fit, open source the
**core framework engine** on GitHub:
- `src/constants/investors.ts` — all 11 investor framework definitions
- `src/engine/` — the analysis orchestrator, prompt builder, data pipeline
- `src/types/` — all TypeScript interfaces

**Keep proprietary (hosted product only):**
- Billing layer (Stripe integration)
- Auth layer (Supabase)
- Re-engagement notification system
- The hosted UX and production deployment
- Any future data or community layers

**Reference model:** Ghost (open source CMS + Ghost Pro hosted), Cal.com, Plausible Analytics.

**Benefits:**
- Builds the founder's brand in the developer community
- Attracts contributors who add investor frameworks (free R&D)
- GitHub stars = distribution credibility
- Does not give away the business — execution, UX, and the hosted layer remain proprietary

**Timing trigger:** 100 paying subscribers OR 6 months post-launch, whichever comes first.

### 1.4 Unit Economics (Projections)

**Assumptions:**
- Primary acquisition: organic (content/SEO, Reddit, Twitter) — near-zero marginal CAC
- Free-to-paid conversion: 2% (industry standard for fintech tools: 2–5%)
- Monthly churn (Pro): 6% initially, target <4% after retention features (notifications) ship
- Average revenue per user (blended monthly + annual): ~$16.50/month

| Milestone | Free users | Paying | MRR | ARR |
|-----------|-----------|--------|-----|-----|
| Month 3 | 1,000 | 20 | $380 | $4,560 |
| Month 6 | 3,000 | 90 | $1,710 | $20,520 |
| Month 12 | 10,000 | 300 | $5,700 | $68,400 |
| Month 24 | 35,000 | 1,000 | $19,000 | $228,000 |

**LTV calculation:**
- Monthly Pro at $19: 18-month avg retention × $19 = $342 LTV
- Annual Pro at $149: 2.2-year avg retention × $149 = $328 LTV (similar, but less admin)
- LTV:CAC (organic): ~20:1 to 40:1 — very strong economics if distribution holds

---

## 2. Go-to-Market Strategy

### 2.1 Target Customer Definition

**Primary:** Financially literate self-directed investors, aged 28–45, income $80K–$200K,
$20K–$200K invested, active on Reddit (r/investing, r/ValueInvesting) and financial Twitter/X.
Has read at least one investing book. Uses Fidelity, Schwab, or Robinhood.

**NOT targeting:** Day traders, options traders, crypto traders, passive index fund investors who
don't want to think about individual stocks.

### 2.2 The First 100 Paying Customers

**Source 1: Reddit (Weeks 1–4) — Target: 20–40 paying customers**
- Communities: r/investing (2.2M), r/stocks (5.1M), r/ValueInvesting (500K)
- Strategy: Genuine "I built a thing, want feedback" post with demo GIF or screenshot
- Post a real analysis result: "I ran NVDA through Graham's framework and here's what came out"
- Answer investment questions in community threads and mention the tool when genuinely relevant
- Do NOT advertise. Do not post repeatedly. One quality post per community.
- Expected: 500–2,000 signups, 10–30 paying conversions at 2%

**Source 2: Twitter/X Financial Community (Weeks 1–8) — Target: 30–50 paying customers**
- Strategy: Post one framework analysis per day as an image/thread
  Example: "AAPL through Benjamin Graham's eyes — live data, real criteria. Thread 🧵"
- Include structured output as a visual (score, verdict, 5 key signals)
- Tag with relevant tickers and investing hashtags
- Build relationships with accounts in the 5K–50K follower range — they amplify
- Expected: 60-day runway before meaningful traction. Patience required.

**Source 3: Newsletter + YouTube Partnerships (Weeks 8–16) — Target: 30–50 paying customers**
- Identify 20 financial education newsletters and YouTube channels with 10K–100K audiences
- Offer: free Pro account for life + 30% affiliate commission + custom landing page
- Template outreach message: personalised, references their specific content, 3 sentences max
- Target 5 active affiliate partnerships within 3 months
- Expected: 500–1,000 users per active affiliate, 1–2% conversion = 10–20 paying per affiliate

### 2.3 The One Channel to Bet Everything On: SEO + Content

**Why:** The search volume for "[investor] stock analysis method," "how to analyze stocks like
Buffett," "Benjamin Graham investment criteria checklist" is large, consistent, and growing. These
are high-intent, zero-competition long-tail queries.

**The content machine:**
- 11 investor frameworks × potential keywords = ~500 primary target pages
- Cornerstones: "Warren Buffett's stock evaluation criteria — complete guide" (target)
- Long-tail: "How would Peter Lynch evaluate NVDA stock?" (analysis-trigger content)
- Each article links to the product for the interactive version

**SEO execution:**
- Write 10 cornerstone articles in Months 1–2 (these take 4–6 weeks to index)
- Each article: 1,500–2,500 words, covers the framework in depth, ends with CTA to try it live
- Publish on a blog subdomain (blog.stratalyx.ai) or as product marketing pages

**Why this compounds:** A blog post written in Month 2 drives free signups in Month 8, 12, and 24
with no additional effort. Paid acquisition stops the moment you stop paying. Content keeps working.

### 2.4 First 90 Days — Concrete Calendar

**Days 1–14:**
- [ ] Deploy to production (Vercel + Railway)
- [ ] Set up PostHog analytics + Sentry error monitoring
- [ ] Add email capture with lead magnet: "Free PDF: How Buffett evaluates the Magnificent 7"
- [ ] Register domain (stratalyx.ai) and set up professional email

**Days 15–30:**
- [ ] Reddit launch posts (3 posts across different communities, 1 week apart)
- [ ] Twitter/X: begin daily analysis thread (1 per day, every day, no exceptions)
- [ ] Collect email addresses aggressively on every screen
- [ ] Target: 200+ email signups, first organic users

**Days 31–60:**
- [ ] Write and publish 5 SEO cornerstone articles
- [ ] Stripe paywall goes live (founder $9/month discount for early subscribers)
- [ ] Begin personal outreach to 20 newsletter writers
- [ ] Target: 500 free users, 10 paying subscribers, $90–$180 MRR

**Days 61–90:**
- [ ] Write and publish 5 more SEO articles (10 total)
- [ ] First 3–5 active affiliate partnerships
- [ ] Launch annual pricing
- [ ] Target: 1,000 free users, 30 paying subscribers, $500–$600 MRR

---

## 3. Competitive Positioning

### 3.1 Direct Competitors

| Competitor | Price | Strength | Our Differentiation |
|-----------|-------|----------|-------------------|
| Seeking Alpha | $19–$299/mo | Brand, content volume, news | Framework-lens UX; we explain *why*, they just rate |
| Simply Wall St | $15/mo | Visual design, global stocks | Investor-philosophy framing; borrowing a mental model |
| Koyfin | $49/mo | Professional data terminal | Accessible to non-professionals; no Bloomberg Terminal fluency required |
| Finviz Elite | $39.50/mo | Screener power | Analysis depth; we interpret, they just filter |
| ChatGPT Plus | $20/mo | General AI | Structured output, live data, zero prompt-writing required |
| Finchat.io | Freemium | AI company analysis | Investor framework lens; we apply specific philosophies |

### 3.2 Our Actual Moat (Honest Assessment)

**Today (thin):**
- Curated, validated investor framework prompts — 2-week lead time to replicate
- Clean UX built specifically for this use case — 3-month lead time to replicate
- Brand/trust if built early — the only durable moat

**Tomorrow (buildable):**
- SEO authority on investor framework content (18–24 months to build, nearly impossible to fast-follow)
- Historical analysis data (what stocks scored what under which frameworks over time)
- Community and social proof (users sharing Stratalyx analyses on Reddit/Twitter)
- Contributor ecosystem (open source frameworks attract validators and extenders)

### 3.3 Positioning Statement

**For** self-directed investors who want systematic analysis **but** don't want to learn a
professional data terminal, **Stratalyx** is the investor-lens analysis tool that **applies
legendary frameworks to any stock with live financial data** — unlike generic AI tools, which
hallucinate, or data platforms, which require you to build your own analysis logic.

---

## 4. Legal and Regulatory Risk Management

Full compliance requirements in `docs/PRD.md` Section 6. Business-level summary:

### 4.1 Primary Risk: Unregistered Investment Adviser

**Risk:** Charging money for AI-generated BUY/HOLD/AVOID recommendations on specific securities
may constitute operating as an unregistered investment adviser under the Investment Advisers Act
of 1940.

**Mitigation:**
1. Reframe all output language to "framework alignment" not "buy/sell" (code change required)
2. All outputs clearly labelled as AI-generated educational framework application
3. Mandatory disclaimer acknowledgment at sign-up
4. Consult a fintech securities attorney before first payment is taken

**Cost of getting this wrong:** SEC cease and desist + disgorgement of all revenues + legal fees
($20K–$100K minimum). This is existential. The legal consultation is not optional.

### 4.2 Investor Name/Likeness Risk

**Risk:** Generating analysis "in the voice of" Buffett, Graham, etc. could expose the company
to right-of-publicity or false-endorsement claims.

**Mitigation:**
- Third-person framing only: "Under Buffett's documented framework..." not "I, Buffett, would..."
- Clear disclaimer on Strategies Library: not affiliated with or endorsed by any investor or firm
- Do not contradict a living investor's publicly stated positions without a clear simulation caveat

### 4.3 API Data Licensing Risk

**Risk:** FMP API ToS may restrict storing responses, displaying in UI, or forwarding to LLMs.

**Mitigation:**
- Read FMP ToS in full before production launch
- Cache is server-side only (1hr TTL) — likely within ToS scope
- If ToS restricts LLM forwarding: strip all FMP attribution from prompts and rephrase as
  "financial metrics" without citing the source

### 4.4 Disclaimer Minimum Viable Set

Must appear before launch:
1. ✅ In modal before every analysis run
2. ✅ In ToS (with checkbox at sign-up)
3. ✅ In product footer
4. ✅ On every shareable analysis URL
5. ✅ In Strategies Library: not endorsed by any investor

---

## 5. Retention Strategy

### 5.1 The Churn Problem

Without intervention, expected monthly churn for a $19 tool with no habit loop: 8–12%. That means
half your subscribers leave within 6 months. The product needs re-engagement triggers to survive.

**Target:** <5% monthly churn by Month 6 (after notifications ship).

### 5.2 The Re-engagement Loop

Every re-engagement event should bring the user back to the product and give them a reason to run
another analysis:

```
Event occurs (earnings, price move)
       ↓
Server re-runs framework analysis automatically
       ↓
Score changes (or doesn't — that's also interesting)
       ↓
Email sent: "AAPL Buffett score ↑ from 7.1 → 8.4 after Q2 earnings"
       ↓
User clicks → lands on updated analysis result in product
       ↓
User sees their watchlist, maybe runs another analysis
       ↓
Monthly analysis count incremented → potential upsell trigger
```

### 5.3 Habit Triggers by User Type

| User type | Trigger | Frequency |
|-----------|---------|-----------|
| Active investor | Earnings alert on watchlisted stock | Per earnings event (quarterly per stock) |
| Casual user | Price move >5% on watchlist | When it happens |
| Inactive user (>14 days) | Weekly digest: top framework scores + featured analysis | Weekly (Sunday) |
| New user (Day 3 + Day 7) | Onboarding email: "Have you tried the comparison feature?" | Once each |

### 5.4 Key Retention Features to Build (Priority Order)

1. **Earnings-triggered re-analysis** (highest impact, requires FMP earnings calendar)
2. **Price-movement watchlist alerts** (medium effort, high perceived value)
3. **Weekly digest email** (low effort, good for re-engaging dormant users)
4. **Analysis versioning** (show score delta vs. last analysis — makes users want to check back)
5. **Portfolio analysis mode** (high perceived value, drives Pro conversion)

---

## 6. Revenue Milestones and Decision Points

| Milestone | Revenue | Decision triggered |
|-----------|---------|-------------------|
| First paying customer | $19 | Proof that someone will pay — keep going |
| 10 paying subscribers | $190/mo | Real signal — start SEO content investment |
| 50 paying subscribers | $950/mo | Validate channel — double down on what worked |
| 100 paying subscribers | $1,900/mo | Consider open sourcing core engine |
| Break-even (covers API costs + domain) | ~$50/mo | Already profitable at 3 subscribers |
| Covers founder's time at $20/hr (20hr/wk) | ~$1,600/mo | ~84 subscribers |
| Ramen profitable (founder full-time) | ~$3,000/mo | ~158 subscribers |
| Hire first part-time content writer | ~$5,000/mo | ~263 subscribers |
| Raise pre-seed or stay bootstrapped decision | ~$10,000/mo | ~526 subscribers |
