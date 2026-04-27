# Secret hygiene audit — Phase 2.5

Date: 2026-04-26.

## Findings

### 1. No hardcoded secrets in source

Grep across `*.{ts,tsx,js,cjs,json}` (excluding `node_modules`, `dist`, `coverage`, `.git`) for the pattern `(api_key|secret|token|password|bearer)\s*[:=]\s*['"][a-zA-Z0-9_-]{16,}` — **zero matches**.

### 2. No secrets in client bundle

The only `VITE_*` env var matching `*_KEY|TOKEN|SECRET|PASSWORD` is `VITE_SUPABASE_ANON_KEY`. That is Supabase's public anon key, designed to be exposed in client code and constrained server-side by Row Level Security. **Safe.**

### 3. No secrets logged

Grepping for `console.* .* (KEY|TOKEN|SECRET|password|apiKey)` finds only **presence labels**, never values:

- `server/supabaseAdmin.ts:12` — `'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set'` (the env var name as a string, not the value)
- `server/index.ts:8-10` — startup banner showing `'ANTHROPIC_API_KEY' / 'GOOGLE_API_KEY' / 'FMP_API_KEY'` as missing-config diagnostics (env names only)
- `src/lib/supabase.ts:10,27` — same pattern, env var name strings

### 4. No secrets in error responses to clients

Reviewed every `res.status(...).json({...})` call in `server/app.ts` and the proxied API responses bubbled to clients. Server forwards upstream provider error messages (`err.error?.message`) but never the API key. The Anthropic/OpenAI/Gemini/Mistral/FMP/Finnhub keys never appear in any response body.

### 5. `.env` discipline

- `.env` listed in `.gitignore` ✅
- `.env.example` ships only placeholders (`your-key-here`) ✅
- No `.env*` file present in HEAD beyond `.env.example` ✅

### 6. The `x-fmp-key` header — *removed in this commit batch*

Until today, the server accepted an `x-fmp-key` header from the client as a **fallback** if `FMP_KEY` was unset on the server. This isn't a secret-leakage bug per se (the header travels over HTTPS and the server just forwards it), but it created a UX where users were prompted to paste a third-party API key into our frontend, persist it in their browser, and ship it on every request. Even legitimate, this is a bad pattern: if any layer logs the request headers (Vercel edge logs, Railway request logs, an upstream proxy), the user's personal FMP key is captured.

**Removed:** the `FmpKeyModal`, the `x-fmp-key` header path on both client and server, the `allowedHeaders` entry in CORS, and the `clientKey` fallback in `/market-movers` and `/fmp/*`.

## Verdict

**No outstanding secret-hygiene issues.** Phase 2.5 acceptance met.

## Things future phases must remember

- When Phase 5 adds Sentry, ensure the `beforeSend` hook strips `Authorization` and `Cookie` headers from breadcrumbs (default behavior, but verify).
- When Phase 5 adds PostHog, ensure no event payload field carries an API key (none should — this is just a guardrail).
- When Phase 6 wires Stripe, the only client-exposed value is the publishable key. Webhook signing secret stays server-only.
- When Phase 9 adds OG-image generation, the FMP key reaches that route too — ensure the OG endpoint doesn't echo back the upstream URL.
