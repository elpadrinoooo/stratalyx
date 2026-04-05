import { C } from '../constants/colors'
import type { Verdict } from '../types'

/** Remove leading/trailing whitespace and collapse internal whitespace. */
export function clean(s: unknown): string {
  if (typeof s !== 'string') return ''
  return s.trim().replace(/\s+/g, ' ')
}

/** Format a number with fixed decimal places. Returns '' for non-finite values. */
export function fmtN(n: unknown, decimals = 2): string {
  const num = Number(n)
  if (!isFinite(num)) return ''
  return num.toFixed(decimals)
}

/** Format a number as a percentage string. Returns '' for non-finite values. */
export function fmtPct(n: unknown, decimals = 1): string {
  const num = Number(n)
  if (!isFinite(num)) return ''
  return `${num.toFixed(decimals)}%`
}

/** Format a large number in billions/millions with suffix. Returns '' for non-finite values. */
export function fmtB(n: unknown): string {
  const num = Number(n)
  if (!isFinite(num)) return ''
  const abs = Math.abs(num)
  if (abs >= 1e12) return `${(num / 1e12).toFixed(2)}T`
  if (abs >= 1e9)  return `${(num / 1e9).toFixed(2)}B`
  if (abs >= 1e6)  return `${(num / 1e6).toFixed(2)}M`
  if (abs >= 1e3)  return `${(num / 1e3).toFixed(2)}K`
  return num.toFixed(2)
}

/**
 * Extract the first JSON object from a string that may contain prose.
 * Returns null if no valid JSON object is found.
 */
export function extractJson(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '{') depth++
    else if (raw[i] === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(raw.slice(start, i + 1)) as Record<string, unknown>
        } catch {
          return null
        }
      }
    }
  }
  return null
}

// ── Colour utility functions ─────────────────────────────────────────────────

/** Map PEG ratio to colour token. */
export function pegColor(peg: number): string {
  if (!isFinite(peg) || peg > 2.5) return C.loss
  if (peg > 1.5) return C.warn
  return C.gain
}

/** Map strategy score (0–10) to colour token. */
export function scColor(score: number): string {
  if (score >= 7) return C.gain
  if (score >= 5) return C.warn
  return C.loss
}

/** Map verdict to colour token. */
export function vColor(verdict: Verdict | string): string {
  if (verdict === 'BUY')   return C.gain
  if (verdict === 'AVOID') return C.loss
  return C.warn  // HOLD
}

/** Map verdict to background colour. */
export function vBg(verdict: Verdict | string): string {
  if (verdict === 'BUY')   return C.gainBg
  if (verdict === 'AVOID') return C.lossBg
  return C.warnBg  // HOLD
}

/** Map internal verdict to user-facing framework-alignment label. */
export function verdictLabel(verdict: Verdict | string): string {
  if (verdict === 'BUY')   return 'Strong Framework Alignment'
  if (verdict === 'AVOID') return 'Weak Framework Alignment'
  return 'Mixed Framework Signals'  // HOLD
}

/**
 * Sanitise a raw ticker input for use in API calls and prompts.
 * Rules (PRD §11.2):
 *   1. Return '' for non-string / falsy input
 *   2. Strip < > { } " ' \ characters
 *   3. Allow only A-Z 0-9 . (after uppercase)
 *   4. Truncate to 10 characters
 *   5. Uppercase
 */
export function sanitizeTicker(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return ''
  return raw
    .replace(/[\r\n\t]/g, '')        // strip newlines/tabs (prompt injection)
    .replace(/[<>{}'"\\/]/g, '')     // strip injection-prone chars
    .toUpperCase()
    .replace(/[^A-Z0-9.]/g, '')
    .slice(0, 10)
}

/** Build a Clearbit logo URL from a company name. */
export function getLogo(name = ''): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(inc|corp|co|ltd|llc|plc|group|company|the|holdings|international|services|technologies|solutions)\b/g, '')
    .trim()
    .replace(/\s+/g, '')
  return `https://logo.clearbit.com/${slug}.com`
}

/** Convert a timestamp (ms) to a relative time string like "2 days ago". */
export function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(months / 12)
  return `${years}y ago`
}
