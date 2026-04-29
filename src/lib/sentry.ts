/**
 * Frontend Sentry init. Same graceful-no-op pattern as analytics.ts: if
 * VITE_SENTRY_DSN is unset (local dev / CI / unconfigured prod), every
 * function here becomes a no-op so the app boots normally.
 *
 * The only Sentry surface the app should touch is this module's exports —
 * never `import * as Sentry from '@sentry/react'` directly at a call site.
 * That keeps swap-out costs low (Datadog, Highlight, etc.) and centralizes
 * the "scrub PII" decisions.
 */
import * as Sentry from '@sentry/react'
import { viteEnv } from './viteEnv'

let initialized = false

export function initSentry(opts: { dsn?: string } = {}): void {
  if (initialized) return
  const dsn = opts.dsn ?? viteEnv.SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: viteEnv.MODE,
    // Sample everything in dev, 20% in prod — adjust later when traffic grows.
    tracesSampleRate: viteEnv.PROD ? 0.2 : 1.0,
    // Replay is off by default — enable later if we need session replay.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
  initialized = true
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return
  try { Sentry.captureException(err, context ? { extra: context } : undefined) } catch { /* never throw from telemetry */ }
}

export function setSentryUser(user: { id: string; email: string } | null): void {
  if (!initialized) return
  try { Sentry.setUser(user) } catch { /* see above */ }
}
