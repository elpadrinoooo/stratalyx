import { describe, it, expect } from '@jest/globals'
import { sanitiseResult } from '../../engine/sanitise'
import type { RawLLMResult } from '../../types'

const BASE = {
  ticker: 'AAPL',
  companyName: 'Apple Inc.',
  sector: 'Technology',
  description: 'Test description',
  investorId: 'buffett',
  investorName: 'Warren Buffett',
  dataSource: 'Claude (estimated)',
  timestamp: 1000000,
  liveData: null,
  isLive: false,
}

const FULL_RAW: RawLLMResult = {
  strategyScore: 8,
  verdict: 'BUY',
  verdictReason: 'Strong moat and FCF.',
  marketPrice: 185.5,
  intrinsicValueLow: 170,
  intrinsicValueHigh: 220,
  marginOfSafety: 8.4,
  moSUp: true,
  moat: 'Wide',
  moatScore: 9,
  screenResults: [
    { rule: 'ROE > 15%', pass: true, note: 'ROE 147%' },
  ],
  strengths: ['Brand loyalty', 'Services growth'],
  risks: ['Regulatory risk'],
  thesis: 'Long-term buy.',
  roe: 147.2,
  pe: 28.5,
  peg: 1.9,
  margin: 26.4,
  debtLevel: 'Moderate',
  div: 0.55,
  fcf: 99.6,
}

describe('sanitiseResult()', () => {
  it('passes through base fields untouched', () => {
    const result = sanitiseResult(FULL_RAW, BASE)
    expect(result.ticker).toBe('AAPL')
    expect(result.investorId).toBe('buffett')
    expect(result.isLive).toBe(false)
  })

  it('clamps strategyScore to 0–10', () => {
    expect(sanitiseResult({ strategyScore: 15 }, BASE).strategyScore).toBe(10)
    expect(sanitiseResult({ strategyScore: -5 }, BASE).strategyScore).toBe(0)
    expect(sanitiseResult({ strategyScore: 'bad' }, BASE).strategyScore).toBe(5)
  })

  it('normalises verdict to BUY | HOLD | AVOID', () => {
    expect(sanitiseResult({ verdict: 'buy' }, BASE).verdict).toBe('BUY')
    expect(sanitiseResult({ verdict: 'AVOID' }, BASE).verdict).toBe('AVOID')
    expect(sanitiseResult({ verdict: 'NONSENSE' }, BASE).verdict).toBe('HOLD')
    expect(sanitiseResult({}, BASE).verdict).toBe('HOLD')
  })

  it('normalises moat to Wide | Narrow | None | ""', () => {
    expect(sanitiseResult({ moat: 'wide' }, BASE).moat).toBe('Wide')
    expect(sanitiseResult({ moat: 'NARROW' }, BASE).moat).toBe('Narrow')
    expect(sanitiseResult({ moat: 'garbage' }, BASE).moat).toBe('')
    expect(sanitiseResult({}, BASE).moat).toBe('')
  })

  it('normalises debtLevel to Low | Moderate | High | ""', () => {
    expect(sanitiseResult({ debtLevel: 'low' }, BASE).debtLevel).toBe('Low')
    expect(sanitiseResult({ debtLevel: 'HIGH' }, BASE).debtLevel).toBe('High')
    expect(sanitiseResult({ debtLevel: 'invalid' }, BASE).debtLevel).toBe('')
  })

  it('coerces numeric fields to numbers, defaulting to 0', () => {
    const result = sanitiseResult({}, BASE)
    expect(result.pe).toBe(0)
    expect(result.peg).toBe(0)
    expect(result.roe).toBe(0)
    expect(result.margin).toBe(0)
    expect(result.div).toBe(0)
    expect(result.fcf).toBe(0)
  })

  it('coerces screenResults, ignoring non-array input', () => {
    expect(sanitiseResult({ screenResults: 'bad' }, BASE).screenResults).toEqual([])
    const result = sanitiseResult({
      screenResults: [{ rule: 'ROE', pass: true, note: 'ok' }],
    }, BASE)
    expect(result.screenResults).toHaveLength(1)
    expect(result.screenResults[0].rule).toBe('ROE')
    expect(result.screenResults[0].pass).toBe(true)
  })

  it('limits strengths to 5 items', () => {
    const strengths = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    expect(sanitiseResult({ strengths }, BASE).strengths).toHaveLength(5)
  })

  it('limits risks to 4 items', () => {
    const risks = ['a', 'b', 'c', 'd', 'e']
    expect(sanitiseResult({ risks }, BASE).risks).toHaveLength(4)
  })

  it('returns empty string for verdictReason and thesis when missing', () => {
    const result = sanitiseResult({}, BASE)
    expect(result.verdictReason).toBe('')
    expect(result.thesis).toBe('')
  })
})
