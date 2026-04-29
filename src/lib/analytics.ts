/**
 * Thin PostHog wrapper. Single import surface for the rest of the app so
 * call sites stay vendor-agnostic and so missing env vars degrade silently
 * (no boot crash, no console noise) — useful in local dev and CI where the
 * key is absent.
 *
 * Why not import posthog-js directly at every call site:
 *   - Lets us no-op cleanly when VITE_POSTHOG_KEY isn't set.
 *   - Centralizes the "do not track ticker symbols in PII context" rule
 *     by giving each event a typed property bag.
 *   - Lets tests assert behavior without mocking the SDK.
 */
import posthog from 'posthog-js'
import { viteEnv } from './viteEnv'

// ── Discriminated union of every event we track ──────────────────────────────
// Adding a new event? Add it here first, then call track() with it. TypeScript
// will refuse the call until the event is declared, which keeps the analytics
// schema centralized instead of scattered through the codebase.
export type AnalyticsEvent =
  | { name: 'analysis_run';        props: { ticker: string; investor_id: string; provider: string; model: string; success: boolean } }
  | { name: 'framework_selected';  props: { investor_id: string } }
  | { name: 'ticker_searched';     props: { ticker: string } }
  | { name: 'share_link_copied';   props: { kind: 'analysis' | 'comparison'; ticker: string } }
  | { name: 'auth_signed_in';      props: { tier: 'free' | 'pro' } }
  | { name: 'auth_signed_out';     props: Record<string, never> }

let initialized = false

interface InitOpts { key?: string; host?: string }

export function initAnalytics(opts: InitOpts = {}): void {
  if (initialized) return
  // Tests inject via `opts`; production reads from Vite env. Splitting these
  // apart keeps the module testable without forcing `import.meta` evaluation
  // inside Jest (which compiles in CommonJS mode).
  const key  = opts.key  ?? viteEnv.POSTHOG_KEY
  const host = opts.host ?? viteEnv.POSTHOG_HOST ?? 'https://us.i.posthog.com'
  if (!key) return  // graceful no-op — missing key in dev/CI is expected

  posthog.init(key, {
    api_host: host,
    // We rely on identify() after sign-in; no anonymous fingerprinting.
    person_profiles: 'identified_only',
    // We don't capture any DOM-aware events automatically — every event is
    // an explicit track() call so the schema stays auditable.
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    loaded: () => { initialized = true },
  })
  initialized = true
}

export function track<E extends AnalyticsEvent>(event: E['name'], props: E['props']): void {
  if (!initialized) return
  try { posthog.capture(event, props as Record<string, unknown>) } catch { /* never let analytics throw */ }
}

export function identify(userId: string, traits: { tier: 'free' | 'pro'; isAdmin?: boolean }): void {
  if (!initialized) return
  try { posthog.identify(userId, traits as Record<string, unknown>) } catch { /* see above */ }
}

export function resetAnalytics(): void {
  if (!initialized) return
  try { posthog.reset() } catch { /* see above */ }
}

/** Test-only — lets unit tests reset the init flag without a full module reload. */
export function __resetForTests(): void { initialized = false }
