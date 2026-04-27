# CSP decisions log

Tracks every directive choice in our Content-Security-Policy and the
reasoning. Update this file before tightening or loosening any directive.

## Mode

**Report-Only** as of 2026-04-26 (Phase 2.3). Violations POST to
`/csp-report` and are logged via `console.warn(JSON.stringify({event:'csp_violation',...}))`.
Phase 5 will route them into Sentry. Founder flips to enforcing
(`Content-Security-Policy` instead of `Content-Security-Policy-Report-Only`)
after ~7 days of clean reports — tracked in
[.audit/FOLLOWUPS.md](FOLLOWUPS.md) item #7.

## Directives

```
default-src 'self'
script-src  'self' 'unsafe-inline' https://*.supabase.co https://js.stripe.com
connect-src 'self' https://*.supabase.co
            https://api.anthropic.com https://api.openai.com
            https://generativelanguage.googleapis.com https://api.mistral.ai
            https://*.financialmodelingprep.com https://finnhub.io
            https://query1.finance.yahoo.com
            https://api.stripe.com https://*.posthog.com https://*.sentry.io
img-src     'self' data: https://financialmodelingprep.com
style-src   'self' 'unsafe-inline'
frame-src   https://js.stripe.com
report-uri  /csp-report
```

| Directive | Choice | Reason |
|---|---|---|
| `default-src 'self'` | restrictive | nothing else loads cross-origin by default |
| `script-src 'unsafe-inline'` | permissive | Vite injects an inline bootstrap script in `index.html`. Tightening would require a nonce-based build; flagged for later |
| `script-src https://*.supabase.co` | required | Supabase Auth UI loads scripts |
| `script-src https://js.stripe.com` | required | Stripe Checkout & Elements (Phase 6) |
| `connect-src` LLM hosts | required | the four provider proxies (`api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, `api.mistral.ai`) |
| `connect-src https://*.financialmodelingprep.com` | required | server-side; client never directly hits FMP. Listed defensively in case future client-side direct calls land |
| `connect-src https://finnhub.io` | required | news/symbol search endpoints |
| `connect-src https://query1.finance.yahoo.com` | required | Yahoo price + history (no API key) |
| `connect-src https://api.stripe.com` | required | Stripe Elements client (Phase 6) |
| `connect-src https://*.posthog.com` | required | PostHog analytics (Phase 5) |
| `connect-src https://*.sentry.io` | required | Sentry error reports (Phase 5) |
| `img-src data:` | permissive | data-URI inline icons used by lucide-react and the SVG favicon |
| `img-src https://financialmodelingprep.com` | required | company-logo PNGs (`image-stock/{ticker}.png`) |
| `style-src 'unsafe-inline'` | permissive | most components use inline `style={...}` props. Tightening would require a CSS-in-JS migration |
| `frame-src https://js.stripe.com` | required | Stripe Elements iframes |
| `frame-ancestors` | absent here | enforced via `X-Frame-Options: DENY` per-request, except on `/embed/*` (Phase 10) which sets its own |
| `report-uri /csp-report` | required | violation collector |

## Per-route overrides

| Route | Override | Reason |
|---|---|---|
| `/embed/*` (Phase 10) | omit `X-Frame-Options`, set `frame-ancestors *` | embed widget is meant to be iframed by third parties |
| `/api/og/*` (Phase 9) | full CORS `*` (separate from CSP) | OG images load cross-origin in link previews |

## Pending tightenings (after going enforcing)

1. Replace `script-src 'unsafe-inline'` with a nonce. Vite's `index.html` template needs a server-rendered nonce. Decision deferred until after launch.
2. Replace `style-src 'unsafe-inline'` with a hash-based or nonce-based scheme. Larger refactor (every inline style → class).
3. Tighten `connect-src` once Phase 5 confirms PostHog/Sentry are using a single regional host; currently we wildcard `*.posthog.com` and `*.sentry.io`.

## Things deliberately not in CSP

- `object-src` — defaults to `'none'` via `default-src 'self'` since `<object>` doesn't qualify under `default-src 'self'`. We don't use plugin content.
- `base-uri` — our SPA never uses `<base href>`. Worth adding `base-uri 'self'` defensively in a follow-up.
- `form-action` — Supabase Auth uses fetch, not form-POST. Worth adding `form-action 'self'` defensively in a follow-up.
