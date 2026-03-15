import type { AnalysisResult, RawLLMResult, Verdict, DebtLevel, MoatRating, ScreenResult } from '../types'

const VERDICTS: Verdict[] = ['BUY', 'HOLD', 'AVOID']
const DEBT_LEVELS: DebtLevel[] = ['Low', 'Moderate', 'High', '']
const MOAT_RATINGS: MoatRating[] = ['Wide', 'Narrow', 'None', '']

function clamp010(raw: unknown): number {
  return Math.min(10, Math.max(0, Number(raw) || 5))
}

function toVerdict(raw: unknown): Verdict {
  const s = String(raw ?? '').toUpperCase().trim()
  const found = VERDICTS.find((v) => v === s)
  return found ?? 'HOLD'
}

function toDebtLevel(raw: unknown): DebtLevel {
  const s = String(raw ?? '').trim()
  const normalised = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  const found = DEBT_LEVELS.find((d) => d === normalised)
  return found ?? ''
}

function toMoat(raw: unknown): MoatRating {
  const s = String(raw ?? '').trim()
  const normalised = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  const found = MOAT_RATINGS.find((m) => m === normalised)
  return found ?? ''
}

function toScreenResults(raw: unknown): ScreenResult[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: unknown) => {
    if (typeof item !== 'object' || item === null) {
      return { rule: '', pass: false, note: '' }
    }
    const r = item as Record<string, unknown>
    return {
      rule: typeof r['rule'] === 'string' ? r['rule'] : '',
      pass: Boolean(r['pass']),
      note: typeof r['note'] === 'string' ? r['note'] : '',
    }
  })
}

function toStringArray(raw: unknown, maxLen: number): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s): s is string => typeof s === 'string')
    .slice(0, maxLen)
}

/**
 * Sanitise raw LLM output against the full AnalysisResult contract.
 * All fields are coerced to their expected types; no field is trusted blindly.
 */
export function sanitiseResult(
  raw: RawLLMResult,
  base: Pick<
    AnalysisResult,
    | 'ticker'
    | 'companyName'
    | 'sector'
    | 'description'
    | 'investorId'
    | 'investorName'
    | 'dataSource'
    | 'timestamp'
    | 'liveData'
    | 'isLive'
  >
): AnalysisResult {
  return {
    ...base,
    strategyScore:     clamp010(raw.strategyScore),
    verdict:           toVerdict(raw.verdict),
    verdictReason:     typeof raw.verdictReason === 'string' ? raw.verdictReason : '',
    marketPrice:       Number(raw.marketPrice) || 0,
    intrinsicValueLow: Number(raw.intrinsicValueLow) || 0,
    intrinsicValueHigh:Number(raw.intrinsicValueHigh) || 0,
    marginOfSafety:    Number(raw.marginOfSafety) || 0,
    moSUp:             Boolean(raw.moSUp),
    moat:              toMoat(raw.moat),
    moatScore:         clamp010(raw.moatScore),
    screenResults:     toScreenResults(raw.screenResults),
    strengths:         toStringArray(raw.strengths, 5),
    risks:             toStringArray(raw.risks, 4),
    thesis:            typeof raw.thesis === 'string' ? raw.thesis : '',
    roe:               Number(raw.roe) || 0,
    pe:                Number(raw.pe) || 0,
    peg:               Number(raw.peg) || 0,
    margin:            Number(raw.margin) || 0,
    debtLevel:         toDebtLevel(raw.debtLevel),
    div:               Number(raw.div) || 0,
    fcf:               Number(raw.fcf) || 0,
  }
}
