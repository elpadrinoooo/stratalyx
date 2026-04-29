/**
 * Detect share-link payloads from the URL or server-injected globals.
 *
 * Sources, in priority order:
 *   1. window.location.pathname  — `/share/AAPL/buffett` (Vercel rewrites
 *      `/share/*` to `/`, so the SPA loads with the original path intact).
 *   2. window globals — set by Express when serving Railway-built dist/index.html
 *      directly (OG meta-tag injection). Kept for direct Railway hits and
 *      backwards compatibility.
 *   3. ?share / ?comparison query params — the dev fallback.
 *   4. legacy `#/analysis/...` hash — older share links still in the wild.
 */

export interface AnalysisShare { ticker: string; investorId: string }
export interface ComparisonShare { ticker: string; investorIds: string[] }

interface SharedWindow {
  __SHARE_TICKER__?: string
  __SHARE_INVESTOR__?: string
  __SHARE_COMPARISON__?: { ticker: string; investors: string }
}

export function parseShareSource(loc: Location, win: SharedWindow): AnalysisShare | null {
  const pm = loc.pathname.match(/^\/share\/([A-Za-z0-9.]+)\/([A-Za-z]+)\/?$/)
  if (pm) return { ticker: pm[1].toUpperCase(), investorId: pm[2].toLowerCase() }

  if (win.__SHARE_TICKER__ && win.__SHARE_INVESTOR__) {
    return { ticker: win.__SHARE_TICKER__, investorId: win.__SHARE_INVESTOR__ }
  }

  const sp = new URLSearchParams(loc.search).get('share')
  if (sp) {
    const [t, i] = sp.split('/')
    if (t && i) return { ticker: t.toUpperCase(), investorId: i.toLowerCase() }
  }

  const m = loc.hash.match(/^#\/analysis\/([A-Za-z0-9.]+)\/([A-Za-z]+)$/)
  if (m) return { ticker: m[1].toUpperCase(), investorId: m[2].toLowerCase() }

  return null
}

export function parseComparisonShare(loc: Location, win: SharedWindow): ComparisonShare | null {
  const pm = loc.pathname.match(/^\/share\/comparison\/([A-Za-z0-9.]+)\/([A-Za-z,]+)\/?$/)
  if (pm) {
    const ids = pm[2].toLowerCase().split(',').filter(Boolean)
    if (ids.length >= 2) return { ticker: pm[1].toUpperCase(), investorIds: ids }
  }

  if (win.__SHARE_COMPARISON__?.ticker && win.__SHARE_COMPARISON__.investors) {
    const ids = win.__SHARE_COMPARISON__.investors.split(',').filter(Boolean)
    if (ids.length >= 2) return { ticker: win.__SHARE_COMPARISON__.ticker, investorIds: ids }
  }

  const cp = new URLSearchParams(loc.search).get('comparison')
  if (cp) {
    const [t, inv] = cp.split('/')
    const ids = (inv ?? '').split(',').filter(Boolean)
    if (t && ids.length >= 2) return { ticker: t.toUpperCase(), investorIds: ids }
  }

  return null
}
