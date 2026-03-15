import type { MoatRating } from './stock'
import type { FMPProfile, FMPRatiosTTM, FMPIncomeStatement, FMPCashFlow, FMPQuote } from './fmp'

export type Verdict = 'BUY' | 'HOLD' | 'AVOID'
export type DebtLevel = 'Low' | 'Moderate' | 'High' | ''

export interface ScreenResult {
  rule: string
  pass: boolean
  note: string
}

export interface LiveData {
  profile: FMPProfile | null
  ratios: FMPRatiosTTM | null
  income: FMPIncomeStatement[]
  cashFlow: FMPCashFlow[]
  quote: FMPQuote | null
}

export interface AnalysisResult {
  ticker: string
  companyName: string
  sector: string
  description: string
  investorId: string
  investorName: string
  strategyScore: number
  verdict: Verdict
  verdictReason: string
  marketPrice: number
  intrinsicValueLow: number
  intrinsicValueHigh: number
  marginOfSafety: number
  moSUp: boolean
  moat: MoatRating
  moatScore: number
  screenResults: ScreenResult[]
  strengths: string[]
  risks: string[]
  thesis: string
  roe: number
  pe: number
  peg: number
  margin: number
  debtLevel: DebtLevel
  div: number
  fcf: number
  dataSource: string
  timestamp: number
  liveData: LiveData | null
  isLive: boolean
}

export interface RawLLMResult {
  strategyScore?: unknown
  verdict?: unknown
  verdictReason?: unknown
  marketPrice?: unknown
  intrinsicValueLow?: unknown
  intrinsicValueHigh?: unknown
  marginOfSafety?: unknown
  moSUp?: unknown
  moat?: unknown
  moatScore?: unknown
  screenResults?: unknown
  strengths?: unknown
  risks?: unknown
  thesis?: unknown
  roe?: unknown
  pe?: unknown
  peg?: unknown
  margin?: unknown
  debtLevel?: unknown
  div?: unknown
  fcf?: unknown
}
