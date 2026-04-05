# Stratalyx — Product Requirements Document

**Version:** 1.3.0
**Status:** Active Development — Pre-Launch
**Last Updated:** April 2026
**Owner:** Stratalyx Product
**Classification:** Internal — Engineering Reference

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Success Metrics](#3-goals-and-success-metrics)
4. [Users and Personas](#4-users-and-personas)
5. [Feature Requirements](#5-feature-requirements)
6. [Legal and Compliance Requirements](#6-legal-and-compliance-requirements)
7. [Business Model](#7-business-model)
8. [Go-to-Market Strategy](#8-go-to-market-strategy)
9. [Moat and Defensibility](#9-moat-and-defensibility)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Technical Architecture](#11-technical-architecture)
12. [Data Requirements](#12-data-requirements)
13. [API Contracts](#13-api-contracts)
14. [UI/UX Requirements](#14-uiux-requirements)
15. [Security Requirements](#15-security-requirements)
16. [Testing Requirements](#16-testing-requirements)
17. [Roadmap](#17-roadmap)
18. [Out of Scope](#18-out-of-scope)
19. [Open Questions](#19-open-questions)
20. [Decision Log](#20-decision-log)

---

## 1. Product Overview

### 1.1 What is Stratalyx?

Stratalyx is a **multi-investor stock framework analysis platform** that applies the documented
investment philosophies of 22 legendary investors to any publicly traded US stock. It combines
real-time financial data from Financial Modeling Prep (FMP) with AI analysis to produce structured,
framework-aligned educational research with a viral sharing and content ecosystem.

### 1.2 Core Value Proposition

> "See how Warren Buffett, Benjamin Graham, or Peter Lynch would evaluate any stock — grounded in
> real financial data, not guesswork. Learn the framework. Apply the lens. Think like a legend."

Unlike generic AI chatbots or screeners, Stratalyx:
- Applies a **specific, documented investor framework** rather than a generic "is this a good stock" prompt
- Injects **verified live financial data** (P/E, ROE, FCF, margins, growth rates) into every analysis
- Produces **structured, comparable outputs** across 22 strategies for the same stock
- Creates **viral, shareable analysis cards** with full OG social preview metadata
- Educates users on **why** each criterion matters, not just what the framework says
- Positions all outputs as **educational research**, not personalised investment recommendations

### 1.3 Legal Positioning

Stratalyx is an **educational research and framework-analysis tool**. It does not:
- Provide personalised investment advice
- Recommend specific securities for specific investors
- Operate as a Registered Investment Adviser (RIA) under the Investment Advisers Act of 1940

All analysis outputs are clearly labelled as AI-generated educational content applying documented
public-domain investment frameworks. Users are required to acknowledge this at sign-up. See
Section 6 for full compliance requirements.

### 1.4 Current State (April 2026)

The application is a fully functional React SPA with an Express proxy backend, running in local
development. **Recent additions have significantly expanded the feature surface:**

**Screens (9):**
- Screener — full US market stock list with FMP integration
- Analyzer Modal — 22-framework AI analysis with live FMP data
- Strategies Library — educational research on 22 investors with source links
- Watchlist — saved stocks with metrics
- History — all completed analyses with archive
- Comparisons — side-by-side dual-investor analysis
- Markets Dashboard — ETF index sparklines (DIA/QQQ/SPY/IWM), Top Gainers/Losers tables, ad placeholders
- Market Events — historical market events timeline with S&P 500/Nasdaq/DJIA overlay chart
- News Feed — Finnhub-powered financial news with slide-in article reader
- Admin (hidden) — affiliate code management, password-protected, accessed via `?admin=1`

**Viral & Sharing Infrastructure (all live):**
- Path-based share URLs: `/share/:ticker/:investorId` and `/share/comparison/:ticker/:investors`
- Full OG meta tag injection (og:title, og:description, og:image, og:url, twitter:card) for social previews
- Comparison share button on every comparison card
- Export for NotebookLM button (admin-only) — copies formatted markdown
- Default branded OG image (SVG 1200×630) at `/og-default.png`

**Affiliate & Admin (live):**
- `server/affiliate.json` — domain → tracking suffix config (17 domains mapped)
- `/api/link?url=` redirect route appends affiliate params to all outbound source links
- Admin dashboard: affiliate code editor, Basic Auth protected, live file writes

**Pre-launch requirements before taking payments:** legal review, production deployment, Stripe
billing integration, Supabase authentication, and email capture.

---

## 2. Problem Statement

### 2.1 The Gap We Fill

Financially literate self-directed investors face three compounding problems:

1. **Data without interpretation** — financial data is abundant and free (Yahoo Finance, Finviz,
   Macrotrends). What people cannot get is interpretation through a trusted mental model.

2. **Frameworks in books, not tools** — the investment philosophies of Buffett, Graham, Lynch et al.
   are extensively documented in books. They are not operationalised into actionable screening tools
   that apply to real companies with real current data.

3. **AI without grounding** — existing AI tools hallucinate financial figures. Stratalyx grounds
   every analysis in verified live financial data before the AI makes a single interpretive claim.

### 2.2 The Real Emotional Job-to-be-Done

The stated problem: "I want to know how legendary investors would evaluate this stock."

The **real** problem: "I have a stock idea I'm excited about and I want structured, credible-sounding
analysis that confirms my conviction or tells me I'm wrong before I put money in."

Users are buying **validated conviction** — the feeling that their investment thinking has been
checked against a legendary investor's criteria. This is a different purchase psychology and it
commands higher willingness to pay than a data terminal.

### 2.3 The Real Customer

28–45 years old. Invests $500–$5,000 per trade. Reads financial Twitter and r/ValueInvesting.
Has heard of Buffett's principles and finds them intellectually appealing. Does not have time to
build a DCF model. Has modest but real disposable income. Knows enough to care about P/E ratios
and moats, but not enough to construct a full analytical thesis from scratch.

**~2–3 million of these people exist in the US and Western Europe.**

### 2.4 What We Are Not

- Not a trading platform or broker
- Not a financial advisor or registered investment adviser
- Not a real-time price streaming service
- Not a portfolio performance tracker (yet — this is Phase 2 retention anchor)
- Not a social/community platform (yet)

---

## 3. Goals and Success Metrics

### 3.1 Product Goals

| Goal | Description |
|------|-------------|
| G-01 | Users can apply any investor framework to any US-listed stock in under 30 seconds |
| G-02 | Every analysis is grounded in real financial data when an FMP key is present |
| G-03 | Users can compare how two different investors would evaluate the same stock |
| G-04 | The Strategies page functions as a standalone educational resource |
| G-05 | The platform is extensible — new investors, providers, and data sources can be added without architectural changes |
| G-06 | All outputs are clearly framed as educational framework analysis, not investment advice |
| G-07 | Re-engagement triggers bring users back within 7 days of their last analysis |
| G-08 | Every analysis result is shareable with a social-preview card in one click |
| G-09 | The comparison feature drives sharing, debate, and organic distribution |
| G-10 | SEO-indexed public analysis pages capture high-intent organic search traffic |

### 3.2 Technical Success Metrics (v1.0)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Analysis completion rate | >95% | Successful JSON parse / total attempts |
| Live data fetch success rate | >98% | FMP responses / total attempts |
| p95 analysis latency (with live data) | <6s | Server-side timing |
| p95 analysis latency (AI only) | <4s | Server-side timing |
| Test suite pass rate | 100% | CI on every commit |
| TypeScript strict mode errors | 0 | `tsc --noEmit` |
| Unit test coverage | ≥90% | Jest coverage report |

### 3.3 Business Success Metrics (Post-Launch)

| Metric | Month 3 Target | Month 12 Target |
|--------|---------------|-----------------|
| Free registered users | 1,000 | 10,000 |
| Paying subscribers (Pro) | 30 | 500 |
| Monthly MRR | $570 | $9,500 |
| Monthly churn (Pro) | <8% | <5% |
| Free-to-paid conversion | >2% | >3% |
| D7 retention (free users) | >25% | >35% |
| D30 retention (paid users) | >70% | >80% |
| Share link clicks per month | — | 2,000 |
| Organic search traffic | — | 30% of signups |

---

## 4. Users and Personas

### 4.1 Primary Persona — The Informed Hobbyist Investor

**Name:** Jordan, 33
**Background:** Marketing manager or software professional, earns $90K–$160K, has $30K–$150K
invested. Has read at least one investing book. Active on financial Twitter/X and Reddit.
**Goals:** Feel like they are doing real, systematic analysis. Reduce emotional component.
**How they use Stratalyx:** Runs a stock through 2–3 investor frameworks when researching a
position. Shares an interesting divergence comparison result on Twitter/X.
**Willingness to pay:** $15–$25/month.

### 4.2 Secondary Persona — The Finance Student

**Name:** Priya, 22
**Background:** Finance or economics undergraduate or early-career analyst.
**Goals:** Understand legendary frameworks applied to real companies. Build mental models.
**How they use Stratalyx:** Strategies Library as a study resource. Shares results on LinkedIn.
**Willingness to pay:** Low. Valuable as a word-of-mouth vector. Target: free tier.

### 4.3 Tertiary Persona — The Newsletter Author / Content Creator

**Name:** Sarah, 38
**Background:** Runs an investing Substack with 8,000 subscribers.
**Goals:** Content for weekly issue. Credible, visual analysis to anchor posts.
**How they use Stratalyx:** Runs 2–3 stocks per week through multiple frameworks. Exports the
comparison divergence as shareable content. Potentially a B2B/white-label customer.
**Willingness to pay:** $49–$199/month for Teams tier with white-label branding.

### 4.4 Developer Persona

**Name:** Marcus, 29
**Background:** Full-stack developer building fintech tools or personal projects.
**How they use Stratalyx:** GitHub repository, public API access (future).
**Technical comfort:** Expert.

---

## 5. Feature Requirements

### 5.1 Core Features (Built — v1.0)

#### F-01: Strategy Screener ✅
Full US market stock list with search, sector filter, sort, pagination. FMP-powered.

#### F-02: Strategy Analyzer Modal ✅
22-framework AI analysis with live FMP data injection. Shareable via `/share/:ticker/:investorId`.

**Note on share URLs:** Share mechanism was updated from hash-based (`#/analysis/AAPL/buffett`) to
path-based (`/share/AAPL/buffett`) to support server-side OG tag injection. Legacy hash links still
work for backward compatibility.

#### F-03: Strategies Research Library ✅
22 investor profiles with biography, philosophy, screening rules, formulas, and source links.
All source links route through `/api/link?url=` for affiliate tracking.

#### F-04: Watchlist ✅
Star button toggles watchlist. Badge count on nav. Suggested stocks on empty state.

#### F-05: Analysis History ✅
All completed analyses as cards. Archive support. Click to re-open modal.

#### F-06: Strategy Comparisons ✅
Side-by-side dual-investor analysis. Score delta bar. Archive/restore. Share button per card.

#### F-07: Markets Dashboard ✅
ETF index sparklines (DIA/QQQ/SPY/IWM), Top Gainers/Losers tables (FMP stable API),
market status indicator, refresh button, ad placeholder zones.

#### F-08: Market Events Timeline ✅
Historical market events chart overlaying DJIA, S&P 500, and Nasdaq data. Brush selector.

#### F-09: News Feed ✅
Finnhub-powered financial news. Slide-in article reader. General + ticker-specific news.

#### F-10: Viral Share Infrastructure ✅
- `/share/:ticker/:investorId` — Express injects OG tags into dist/index.html
- `/share/comparison/:ticker/:investors` — comparison share with OG tags
- og:title, og:description, og:image, og:url, og:type, twitter:card on all share routes
- Default branded OG image (1200×630 SVG) at `/og-default.png`
- App reads `window.__SHARE_TICKER__` / `window.__SHARE_COMPARISON__` on load
- Context-aware share banner (analysis vs comparison wording)
- Export for NotebookLM button (admin-only) — formatted markdown copy

#### F-11: Affiliate Link System ✅
- `server/affiliate.json` maps domains to tracking suffixes (17 domains)
- `/api/link?url=` redirect route appends affiliate params
- All 21 source links in Strategies Library route through affiliate system

#### F-12: Admin Dashboard ✅
- `src/screens/AdminScreen.tsx` — accessed via `?admin=1`
- Password-protected via Basic Auth (`ADMIN_PASSWORD` env var)
- Affiliate code editor: key-value table, add/edit/delete, live file writes
- Export for NotebookLM button only visible to logged-in admin

---

### 5.2 Pre-Launch Requirements (Blocking for Monetisation)

#### F-13: Legal Compliance Language 🔴 BLOCKING

- [ ] Consult fintech securities attorney ($600–$1,000) before charging money
- [ ] Reframe BUY/HOLD/AVOID → framework alignment language throughout
- [ ] Add non-dismissible disclaimer box in AnalyzerModal above Run button
- [ ] Add ToS and Privacy Policy pages, linked in footer
- [ ] Third-person LLM voice in all 22 investor prompt contexts
- [ ] Affiliation disclaimer on Strategies Library (not affiliated with investor or firm)
- [ ] Review FMP API terms for commercial use
- [ ] Review Anthropic API terms for financial analysis use case

#### F-14: Production Deployment 🔴 BLOCKING

- [ ] Deploy frontend to Vercel (stratalyx.ai domain)
- [ ] Deploy backend to Railway (api.stratalyx.ai)
- [ ] Set up Sentry for error monitoring
- [ ] Set up PostHog for product analytics
- [ ] Smoke test all routes end-to-end on production

#### F-15: User Authentication

- [ ] Supabase Auth — email/password + Google OAuth
- [ ] Mandatory ToS + disclaimer acknowledgment checkbox at sign-up
- [ ] Persist analyses and watchlist to Supabase on auth
- [ ] Server-side usage counter per user (not localStorage)

#### F-16: Freemium Billing (Stripe)

- **Free:** 3 analyses/month, Buffett + Graham frameworks only
- **Pro ($19/month or $149/year):** Unlimited analyses, all 22 frameworks, history export
- **Teams ($49/seat/month):** Shared watchlists, white-label analysis cards, API access

- [ ] Stripe Checkout + webhook handling (created / cancelled / payment failed)
- [ ] Hard paywall modal at 3 analyses/month for free users
- [ ] Pro badge in navbar for paying users
- [ ] Annual plan at 35% discount

#### F-17: Email Capture (Pre-Auth)

- [ ] Simple modal after first completed analysis: "Get notified when new frameworks launch"
- [ ] Lead magnet: "How Buffett Would Evaluate the Magnificent 7" (7-page PDF)
- [ ] Store in Supabase or Airtable
- [ ] Professional email: hello@stratalyx.ai

---

### 5.3 Retention Features (Phase 2 — Months 2–3)

#### F-18: Re-engagement Notifications 🔑 Retention-Critical

**The single most important retention mechanism.** Without it, users binge-analyze on sign-up
and churn within 30 days.

- [ ] Earnings alert: when watchlisted stock reports earnings, re-run analysis, email score delta
- [ ] Price-movement alert: >5% move on watchlisted stock triggers email with framework score vs last analysis
- [ ] Weekly digest: Sunday email for users inactive >7 days — watchlist scores, any changes, 1 featured analysis
- [ ] Notification preferences page (per-type on/off)
- [ ] Unsubscribe link in every email (CAN-SPAM/GDPR)
- [ ] Transactional email via Resend

#### F-19: Portfolio Analysis Mode 🔑 Highest-Value Feature

**This is the feature that transforms the business model.** Single-stock analysis is a demo.
Portfolio analysis is the product. It creates a recurring reason to return.

- [ ] Input: up to 10 ticker symbols
- [ ] Run all through active investor framework
- [ ] Portfolio aggregate alignment score
- [ ] Visual breakdown: pass/fail per holding per criterion
- [ ] Best and worst aligned holdings highlighted
- [ ] CTA to deep-dive underperforming holdings

#### F-20: Price Alerts Tied to Intrinsic Value

**Drives daily/weekly engagement between investment decisions.**

- [ ] "Alert me when AAPL drops to Buffett's estimated intrinsic value range"
- [ ] Daily cron check against current price vs stored intrinsic value range
- [ ] Email/in-app notification when threshold crossed

#### F-21: Analysis Score Delta (Versioning)

- [ ] If user has run this stock + framework before: "Score changed 7.1 → 8.4 since [date] at $[price]"
- [ ] Store `previous_score`, `previous_price`, `previous_date` in analysis record

#### F-22: Analysis Output Format Improvement

Lead with structured data for scan-first reading on mobile:
1. Framework Alignment header + score badge + verdict badge (above the fold)
2. 5 key framework signals — scannable pass/fail list with icons
3. 2-sentence thesis summary
4. "Read full analysis ↓" expand for prose + KPI grid + risks + strengths

---

### 5.4 Growth Features (Phase 3 — Months 3–6)

#### F-23: SEO Public Analysis Pages 🔑 Zero-CAC Acquisition Channel

**The highest-ROI distribution mechanism available.** Captures high-intent search traffic at zero cost.

- [ ] Pre-run Buffett analysis on all S&P 500 stocks (automated script, 3–4 days of work)
- [ ] Publish as indexable server-rendered pages: `/analysis/AAPL/buffett`
- [ ] Target titles: "Warren Buffett Analysis of Apple (AAPL) — 2026 Score: 8/10"
- [ ] Auto-update weekly via cron
- [ ] `robots.txt` and `sitemap.xml` for SEO indexing
- [ ] One new public analysis page per day as ongoing content engine

#### F-24: Shareable Analysis Image Cards

**One well-designed card that goes semi-viral is worth $10,000 in paid acquisition.**

- [ ] Designed card format (1200×628) for Twitter/X and LinkedIn sharing
- [ ] Content: ticker, investor name, score, top 3 framework signals, verdict badge
- [ ] Generated client-side via `html-to-image` npm package
- [ ] Download + share directly from the analyzer result
- [ ] Admin Export button: full formatted image card for content creation

#### F-25: Data Flywheel Infrastructure

**The only moat that cannot be replicated.** Every analysis creates a permanent data point.

- [ ] Store all analysis outputs in Supabase with: ticker, investor, score, date, price-at-analysis
- [ ] Track actual stock performance 3/6/12 months after high-score analyses
- [ ] Public accuracy dashboard: "Our Buffett analyses rated 8+/10 have a 63% hit rate over 12 months"
- [ ] This becomes a genuine trust asset — eventually publishable as a track record

#### F-26: Screener Batch Mode

**Drives upgrade conversions.** Power user feature that serious investors need.

- [ ] "Show me all S&P 500 stocks scoring above 7/10 under Graham's framework"
- [ ] Set threshold (score min), framework, universe (S&P 500 / Nasdaq 100 / all)
- [ ] Results table with score, key metrics, one-click to full analysis
- [ ] Pro-only feature (drives upgrade conversations)

#### F-27: B2B Newsletter Licensing

**Revenue diversification. Higher ACV, lower churn.**

- [ ] White-label analysis cards with newsletter branding
- [ ] Custom domain analysis pages (newsletter.com/analysis/AAPL/buffett)
- [ ] Pricing: $199–$999/month depending on audience size
- [ ] Target: 200+ investing Substacks with 5,000+ subscribers
- [ ] Affiliate/commission program for newsletter referrals (30% recurring)

---

### 5.5 Platform Features (Phase 4 — Months 6–12)

| ID | Feature |
|----|---------|
| F-28 | Custom investor framework builder (user-defined criteria + weights) |
| F-29 | Historical analysis replay (how would Buffett rate AAPL in 2015?) |
| F-30 | Public API + developer documentation |
| F-31 | Batch portfolio analysis (run all watchlist stocks at once) |
| F-32 | Community annotations — users flag analyses as accurate/inaccurate |
| F-33 | Open-source core framework engine (GitHub, Show HN, distribution play) |
| F-34 | Broker API integration (read-only portfolio import) |
| F-35 | Mobile native app (React Native or Expo) |
| F-36 | Additional investor frameworks (target: 30+ by v2.0 — currently at 22) |

---

## 6. Legal and Compliance Requirements

🔴 **BLOCKING for any monetisation. Do not charge money before completing this section.**

### 6.1 Regulatory Background

Under the **Investment Advisers Act of 1940**, anyone who provides investment advice for compensation
and is in the business of giving investment advice must register as an RIA. Stratalyx avoids this by:

1. Positioning all outputs as **educational framework application**, not personalised recommendations
2. Reframing all verdict language (see 6.3)
3. Adding mandatory disclosures at every output touchpoint
4. Requiring explicit user acknowledgment at sign-up

UK note: The FCA under Consumer Duty rules (2024) is stricter than the SEC on AI-generated financial
content. Secure UK-specific counsel before enabling UK user signups.

### 6.2 Pre-Launch Legal Checklist

- [ ] Consult fintech securities attorney (2-hour, ~$600–$1,000) before launching paid tiers
- [ ] Draft Terms of Service — educational purpose, no investment advice, no RIA status, arbitration
- [ ] Draft Privacy Policy — email, analytics, FMP data, LLM data forwarding (Anthropic), GDPR basics
- [ ] Review FMP API Terms of Service for commercial redistribution rights
- [ ] Review Anthropic API Terms of Service for financial analysis use case
- [ ] Dedicated disclaimer page (not just a footer note)

### 6.3 Verdict Language Reframing (BLOCKING)

Current language creates regulatory risk by mirroring registered analyst language:

| Current | Replacement |
|---------|-------------|
| `BUY` | `Strong Framework Alignment` |
| `HOLD` | `Mixed Framework Signals` |
| `AVOID` | `Weak Framework Alignment` |

Files to change: `src/types/analysis.ts`, `src/engine/sanitise.ts`, `src/screens/AnalyzerModal.tsx`,
`HistoryScreen.tsx`, `WatchlistScreen.tsx`, `ComparisonsScreen.tsx`, and all tests asserting on
`BUY`/`HOLD`/`AVOID`.

Also at risk: the intrinsic value range and margin of safety calculations. These are specifically the
outputs that registered analysts produce — caveat heavily in the UI.

### 6.4 LLM Voice Requirement

All 22 investor `ctx` strings in `src/constants/investors.ts` must use third-person framing:
"Under [Investor]'s framework..." — **not** "I, [Investor], would..."

---

## 7. Business Model

### 7.1 Pricing (Confirmed)

| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | 3 analyses/month, Buffett + Graham only |
| Pro | $19/month or $149/year | Unlimited analyses, all 22 frameworks, export |
| Teams | $49/seat/month | 5 seats, white-label cards, API access |
| Newsletter B2B | $199–$999/month | Custom branding, dedicated pages, bulk API |

### 7.2 Unit Economics Reality

**With organic acquisition (content, community) at $20–30 CAC:**
- LTV at $19/month × 5-month average retention = $95 (baseline without retention loop)
- LTV at $19/month × 10-month average retention = $190 (with portfolio analysis + alerts)
- LTV:CAC ratio = ~5–8:1 — viable with organic channels

**With paid acquisition at $80–150 CAC:** model breaks until retention is extended. Do not run
paid acquisition until portfolio analysis and price alerts are live.

### 7.3 Revenue Targets

| Stage | ARR | Composition |
|-------|-----|-------------|
| Month 6 | $15,000 | 60 Pro subscribers |
| Month 12 | $115,000 | 500 Pro + 3 B2B newsletters |
| Month 24 | $500,000 | 1,800 Pro + 10 B2B + early Teams |
| Month 36 | $1,000,000+ | 4,000+ Pro + 20 B2B + 5 Teams |

### 7.4 The $10M ARR Path

8,000–10,000 individual subscribers at ~$45/month blended = $4.3–5.4M ARR
50 B2B clients at ~$500/month = $300k ARR
Premium advisor/institutional tier at $200–500/month = $1–2M ARR
**Total: $5.6–7.7M ARR** — achievable over 36 months with consistent execution.
To reach $10M: requires either a breakout viral moment or a strategic distribution partnership.

---

## 8. Go-to-Market Strategy

### 8.1 First 100 Paying Customers — Where They Live

1. **r/ValueInvesting** (180k members) and **r/SecurityAnalysis** (600k members)
   Post genuine analysis threads — "I ran NVDA through all 22 investor frameworks, here's the divergence" —
   not product announcements. One good post can drive 500 signups.

2. **Twitter/X fintech community**
   Find accounts posting about Buffett letters, value investing. 3–5 authentic endorsements from
   10k-follower accounts beat a month of ads.

3. **Substack investing newsletters**
   200+ with 5,000–100,000 subscribers. Offer free Unlimited tier in exchange for one authentic
   mention. Ten successful placements = thousands of qualified signups.

4. **Investment clubs and AAII**
   American Association of Individual Investors: 150,000 members, exact demographic.

### 8.2 Primary Distribution Channel: SEO + Shareable Content

**Pre-run the Buffett analysis on all 500 S&P 500 stocks.**
Publish as indexable pages. Title: "Warren Buffett Analysis of Apple (AAPL) — 2026 Score: 8/10"
will rank for "warren buffett apple stock" within 3–6 months. That query has meaningful monthly
search volume at zero CAC.

**Shareable analysis cards** (F-24) are the second half. Every shared card is free distribution
to an audience of exactly the right people.

### 8.3 Positioning Strategy

**Do not lead with "11 investor frameworks" (or 22). Lead with one.**

Be "the Warren Buffett analyzer" or "the value investing AI tool." Specificity drives search,
word-of-mouth, and community identity. "What would Buffett think of this stock?" is a question
millions of people type into Google. Own that question first. Expand after $1M ARR.

The multi-framework library is an asset. It is not the pitch.

### 8.4 Tactical 90-Day GTM Plan

**Days 1–30:**
- Deploy to production
- Add Stripe + Supabase Auth
- Consult securities attorney
- Run 500 S&P 500 stocks through Buffett framework, publish as SEO pages
- Soft launch: Twitter/X + one Reddit post

**Days 31–60:**
- Enable paid tiers
- Post 3 genuine analysis threads on r/ValueInvesting
- Reach out to 20 investing Substacks
- Target: 500 free users, 15–25 paying customers

**Days 61–90:**
- Launch shareable analysis image cards
- First B2B conversation with a newsletter
- Begin daily SEO analysis page publishing
- Target: 1,000 free users, 50–75 paying customers

---

## 9. Moat and Defensibility

### 9.1 Current Moat (Honest Assessment)

**Minimal.** The investor frameworks are public knowledge. The prompt engineering is replicable
in a weekend. The FMP integration is a commodity. The UI is good but not defensible.

What exists today: execution advantage + head start + ability to move faster than incumbents.
That window is 12–24 months.

### 9.2 Buildable Moats (24-Month Horizon)

**1. Data flywheel (highest value)**
Every analysis run creates a data point: stock, framework, score, date, price. 500,000 analyses
with tracked subsequent performance is something no competitor has. An empirically validated AI
analysis track record is genuinely proprietary. Build the infrastructure from day one.

**2. Community and validation layer**
Users annotating analyses ("I acted on this — here's what happened"), rating accuracy, sharing —
creates a validation layer that raw model outputs don't have. "Stratalyx community-validated
analysis" is a different product after 18 months.

**3. Brand and trust through track record**
If "Stratalyx Buffett analysis" scores correlate with subsequent 12-month returns at a
statistically meaningful level, and you publish that transparently — that is a trust asset
that cannot be replicated quickly. Takes 2–3 years but is the highest-value moat available.

**4. Integration depth**
Becoming the analysis API embedded in 50+ newsletters and tools creates switching cost.

### 9.3 What to Stop Doing

**Remove multi-LLM as a user-facing feature.** Supporting Gemini, Claude, OpenAI, OpenRouter,
Ollama as *user choices* is an engineering cost, a quality-consistency liability, and a positioning
mistake. Users do not want to choose their LLM. They want the best analysis.

Decision: Pick the best-performing model for financial reasoning (currently Claude Haiku), make
outputs exceptional, remove the choice from the user entirely. **Keep the abstraction layer
on the backend as an infrastructure hedge against pricing changes — but hide it from users.**

---

## 10. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NF-01 | All API keys server-side only | Always |
| NF-02 | TypeScript strict mode, zero `any` | 0 errors on `tsc --noEmit` |
| NF-03 | No direct browser-to-external API calls | Enforced by proxy architecture |
| NF-04 | Rate limiting on all proxy routes | 20 req/min LLM, 60 req/min FMP |
| NF-05 | In-memory cache on Express (TTL-aware) | 1hr default, 5min for 1d charts and movers |
| NF-06 | localStorage persistence for state | `stratalyx_state_v2` key |
| NF-07 | Zero console errors in production | Enforced by error boundaries |
| NF-08 | Mobile-responsive at 375px | All screens |

---

## 11. Technical Architecture

### 11.1 Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Inline styles with `C`/`R` design tokens from `src/constants/colors.ts` |
| State | `useReducer` + Context — no Zustand/Redux |
| Backend | Express (Node.js), TypeScript, tsx for dev |
| AI Models | Anthropic Claude Haiku (server-locked), Gemini 2.5 Flash, OpenAI GPT-4o-mini |
| Financial Data | Financial Modeling Prep (FMP) — live via server proxy |
| Market Data | Yahoo Finance (history/sparklines, no key) + Finnhub (news, search) |
| Affiliate | `server/affiliate.json` → `/api/link?url=` redirect route |
| Share Layer | Express `/share/*` routes inject OG tags into `dist/index.html` |
| Admin | Express `/api/admin/*` (Basic Auth) + React AdminScreen |
| Testing | Jest + MSW v2 |
| Future Auth | Supabase Auth |
| Future Billing | Stripe Checkout + Webhooks |

### 11.2 Key Architectural Decisions

- **Analysis state key:** `"TICKER:investorId"` — always this format
- **All LLM output** passes through `extractJson()` → `sanitiseResult()` → UI
- **All colours** from `C` token object — never hardcoded hex
- **Default model:** `claude-haiku-4-5-20251001`, enforced server-side
- **Share URLs:** path-based (`/share/AAPL/buffett`) — server injects OG tags into HTML
- **Affiliate links:** all outbound source links route through `/api/link?url=`

---

## 12. Data Requirements

- All financial data from FMP (company profile, ratios TTM, income statement, cash flow, quote)
- Yahoo Finance for price history and index sparklines (no API key required)
- Finnhub for news feed and ticker symbol search
- Analyses stored client-side in localStorage (`stratalyx_state_v2`)
- **Future (Phase 2):** All analyses persisted to Supabase with price-at-analysis for data flywheel

---

## 13. API Contracts

### Frontend → Backend Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/claude` | POST | — | Claude proxy |
| `/api/gemini` | POST | — | Gemini proxy |
| `/api/openai` | POST | — | OpenAI proxy |
| `/api/mistral` | POST | — | Mistral proxy |
| `/api/price/:ticker` | GET | — | Yahoo Finance spot price |
| `/api/history/:ticker` | GET | — | Yahoo Finance chart history |
| `/api/search` | GET | — | Finnhub ticker search |
| `/api/news` | GET | — | Finnhub news feed |
| `/api/market-movers` | GET | x-fmp-key | FMP top gainers/losers |
| `/api/fmp/*` | GET | x-fmp-key | FMP data proxy (allowlisted paths) |
| `/api/link` | GET | — | Affiliate link redirect |
| `/api/admin/affiliate` | GET/PUT | Basic Auth | Affiliate config read/write |
| `/share/:ticker/:investorId` | GET | — | OG-tagged share page |
| `/share/comparison/:ticker/:investors` | GET | — | Comparison share page |
| `/og-default.png` | GET | — | Default OG image (SVG) |

---

## 14. UI/UX Requirements

### 14.1 Design Tokens

All colours, font families, and border radii from `src/constants/colors.ts` via `C` and `R`
objects. Never hardcode hex. Inline styles only (no CSS Modules, no Tailwind — until Phase 2 audit).

### 14.2 Responsiveness

- Desktop (>960px): full layout
- Tablet (641–960px): stacked tables, 4-column index grid
- Mobile (≤640px): 2-column grid, no leaderboard ads, stacked movers

### 14.3 Required UX Patterns

- Every empty state must have a clear, helpful action
- Every loading state uses skeleton placeholders (no spinners except for full-page)
- All modals close on Escape + backdrop click
- Toast notifications for all async success/error states
- Keyboard shortcut: Cmd/Ctrl+K opens Analyzer Modal

---

## 15. Security Requirements

- All API keys in `.env` — never in `src/` code
- Allowlist on FMP proxy (prevents SSRF to arbitrary endpoints)
- Protocol validation on `/api/link` redirect (HTTPS/HTTP only)
- Admin routes protected by Basic Auth (`ADMIN_PASSWORD` env var)
- Rate limiting: 20 req/min for LLM routes, 60 req/min for FMP routes
- CORS restricted to `CORS_ORIGIN` env var

---

## 16. Testing Requirements

- Test files in `src/__tests__/` mirroring `src/` structure
- Test IDs: `U-XX` (unit), `I-XX` (integration), `L-XX` (LLM contract), `E-XX` (e2e)
- All external HTTP intercepted by MSW — never real calls in tests
- Use `renderWithCtx(component, stateOverrides)` helper for components using `useApp()`
- MSW lifecycle in `src/setupMsw.ts`
- Every new utility function in `src/engine/utils.ts` must have corresponding unit tests

---

## 17. Roadmap

### Phase 0 — Pre-Launch (Complete before charging) 🔴

Legal review, verdict language reframing, production deployment (Vercel + Railway), Sentry,
PostHog, email capture, lead magnet PDF.

### Phase 1 — Monetisation (Weeks 1–6 post-deploy)

Supabase Auth, Stripe billing, usage counter, paywall modal, SEO public analysis pages,
shareable analysis image cards.

### Phase 2 — Retention (Months 2–3)

Portfolio analysis mode, re-engagement emails (earnings alerts + price alerts + weekly digest),
price alerts tied to intrinsic value, analysis score delta display.

### Phase 3 — Growth (Months 3–6)

Data flywheel infrastructure, screener batch mode, B2B newsletter outreach and licensing,
open-source core framework, affiliate program.

### Phase 4 — Platform (Months 6–12)

Public API, custom framework builder, historical replay, community annotations, accuracy
track record dashboard, Teams tier.

---

## 18. Out of Scope (v1.x)

- Real-time streaming prices
- Options or derivatives analysis
- International stocks (non-US) — deferred to v2.0
- Portfolio performance tracking (vs benchmarks)
- Social/community features beyond sharing
- Custom alert channels (Slack, WhatsApp) — email only for now
- Mobile native app — v2.0

---

## 19. Open Questions

1. **Legal:** Does the "framework alignment" framing satisfy SEC educational exemption?
   → Requires attorney confirmation before launch.

2. **Multi-LLM:** Should LLM provider selection remain user-facing in Pro tier, or hidden entirely?
   → Current recommendation: hide from users, keep backend abstraction for resilience.

3. **Data flywheel timing:** When does accumulating analysis performance data become publishable?
   → Minimum 12 months of data with 200+ data points per framework before claiming statistical significance.

4. **UK expansion:** FCA Consumer Duty rules may require additional compliance steps.
   → Flag for UK-specific attorney review when UK user signups begin.

5. **Pricing validation:** Is $19/month the right price or should we start at $9/month and test?
   → Test both via A/B on landing page before locking in.

---

## 20. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Mar 2026 | State management: `useReducer` + Context | Simpler than Zustand; no external dependency; sufficient for this scale |
| Mar 2026 | Styling: inline styles with design tokens | Consistent token enforcement; migrate to CSS Modules in Phase 2 |
| Mar 2026 | Default model: Claude Haiku (locked server-side) | Cost vs quality balance for financial analysis; prevents prompt injection via model param |
| Mar 2026 | Markets Dashboard added | Increases daily engagement surface and creates ad revenue opportunity |
| Mar 2026 | News Feed added (Finnhub) | Increases session time and creates re-engagement hook around news events |
| Apr 2026 | Share URLs changed from hash to path-based | Required for server-side OG tag injection — social crawlers cannot read hash fragments |
| Apr 2026 | Multi-LLM removed as user-facing positioning | Users don't want to choose models; keep backend abstraction but hide choice |
| Apr 2026 | Affiliate link system via server/affiliate.json | Zero-deploy-required affiliate code updates; admin manages via dashboard |
| Apr 2026 | Admin dashboard (Basic Auth + React screen) | No external framework needed at this scale; PocketBase recommended if DB needed |
| Apr 2026 | Shareable image cards deferred to Phase 3 | OG meta tags provide immediate value; image generation (html-to-image) is Phase 1 quick win |
