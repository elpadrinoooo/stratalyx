import { supabaseAdmin, supabaseConfigured } from './supabaseAdmin.js'

/**
 * Settings cache — admin-editable runtime config from public.app_settings.
 *
 * Everything in here is non-secret (limits, thresholds, prices, flags).
 * Sensitive credentials (API keys, DB URLs) stay in process env where they
 * belong; this module is intentionally read-only from the application side.
 *
 * Lookup pattern: `await getSetting('free_tier_limit', 25)` returns the
 * stored value, falling back to the supplied default if Supabase isn't
 * configured (local dev / CI), the row is missing, or the cached fetch
 * has failed for any reason. Cached for 60s in-process to keep hot
 * routes (LLM proxy) from doing a DB round-trip on every request.
 */

const CACHE_TTL_MS = 60_000
const IS_TEST = Boolean(process.env['JEST_WORKER_ID'])

interface CacheEntry { value: unknown; cachedAt: number }
const cache = new Map<string, CacheEntry>()

let inFlight: Promise<void> | null = null

/** Refresh the entire settings table into the in-process cache. */
async function refresh(): Promise<void> {
  if (!supabaseConfigured || IS_TEST) return
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('app_settings')
        .select('key, value')
      if (error || !data) return
      const now = Date.now()
      for (const row of data) {
        cache.set(row.key as string, { value: row.value, cachedAt: now })
      }
    } catch {
      // swallow — caller will use the default
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/**
 * Get a typed setting. Returns the cached value if fresh; otherwise fires a
 * non-blocking refresh and returns the stale value. First call (cold cache)
 * awaits the refresh so the value is correct.
 */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  if (!supabaseConfigured || IS_TEST) return fallback

  const entry = cache.get(key)
  const stale = !entry || Date.now() - entry.cachedAt > CACHE_TTL_MS

  if (!entry) {
    // Cold — must wait so we don't return the wrong value on first request.
    await refresh()
    const fresh = cache.get(key)
    return fresh !== undefined ? (fresh.value as T) : fallback
  }

  if (stale) {
    // Warm but expired — kick off async refresh, return current value.
    void refresh()
  }

  return entry.value !== undefined ? (entry.value as T) : fallback
}

/** Test helper — clear the cache between Jest cases. Not exported in prod typings. */
export function _resetSettingsCacheForTests(): void {
  cache.clear()
}
