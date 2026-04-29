/* eslint-disable no-console -- one-time startup banner; matches index.ts style */
/**
 * Backend Sentry init. Imported FIRST in server/index.ts so it loads before
 * any code that might throw — Sentry v8's auto-instrumentation patches
 * Node's HTTP/Express internals at require time, so init must run before
 * those modules are loaded.
 *
 * No-ops when SENTRY_DSN is unset. The module is safe to import in tests:
 * Sentry.init() is just skipped.
 */
import * as Sentry from '@sentry/node'

const dsn = process.env['SENTRY_DSN'] ?? ''
const isTest = Boolean(process.env['JEST_WORKER_ID'])

let initialized = false

if (dsn && !isTest) {
  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.2 : 1.0,
  })
  initialized = true
  console.log('[sentry] backend error reporting enabled')
} else if (!isTest) {
  console.log('[sentry] SENTRY_DSN not set — backend error reporting disabled')
}

export const sentryEnabled = (): boolean => initialized
export { Sentry }
