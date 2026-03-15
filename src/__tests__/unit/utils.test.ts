import { describe, it, expect } from '@jest/globals'
import { clean, fmtN, fmtPct, fmtB, extractJson, pegColor, scColor, vColor, sanitizeTicker } from '../../engine/utils'

describe('clean()', () => {
  it('trims whitespace', () => {
    expect(clean('  hello  ')).toBe('hello')
  })
  it('collapses internal whitespace', () => {
    expect(clean('foo   bar')).toBe('foo bar')
  })
  it('returns empty string for non-strings', () => {
    expect(clean(42)).toBe('')
    expect(clean(null)).toBe('')
    expect(clean(undefined)).toBe('')
  })
})

describe('fmtN()', () => {
  it('formats a number to 2 decimal places by default', () => {
    expect(fmtN(3.14159)).toBe('3.14')
  })
  it('respects decimals param', () => {
    expect(fmtN(3.14159, 4)).toBe('3.1416')
  })
  it('returns empty string for non-finite', () => {
    expect(fmtN(Infinity)).toBe('')
    expect(fmtN(NaN)).toBe('')
    expect(fmtN('abc')).toBe('')
  })
  it('accepts string numbers', () => {
    expect(fmtN('2.5')).toBe('2.50')
  })
})

describe('fmtPct()', () => {
  it('appends % sign', () => {
    expect(fmtPct(12.5)).toBe('12.5%')
  })
  it('uses 1 decimal by default', () => {
    expect(fmtPct(0.123)).toBe('0.1%')
  })
  it('returns empty string for non-finite', () => {
    expect(fmtPct(Infinity)).toBe('')
  })
})

describe('fmtB()', () => {
  it('formats trillions', () => {
    expect(fmtB(2.85e12)).toBe('2.85T')
  })
  it('formats billions', () => {
    expect(fmtB(99.5e9)).toBe('99.50B')
  })
  it('formats millions', () => {
    expect(fmtB(1.5e6)).toBe('1.50M')
  })
  it('formats thousands', () => {
    expect(fmtB(5000)).toBe('5.00K')
  })
  it('formats small numbers', () => {
    expect(fmtB(42)).toBe('42.00')
  })
  it('returns empty string for non-finite', () => {
    expect(fmtB(NaN)).toBe('')
  })
})

describe('extractJson()', () => {
  it('extracts JSON from surrounding prose', () => {
    const raw = 'Here is the result:\n{"score": 8, "verdict": "BUY"}\nEnd.'
    const result = extractJson(raw)
    expect(result).toEqual({ score: 8, verdict: 'BUY' })
  })
  it('handles nested objects', () => {
    const raw = '{"a": {"b": 1}}'
    expect(extractJson(raw)).toEqual({ a: { b: 1 } })
  })
  it('returns null when no JSON present', () => {
    expect(extractJson('no json here')).toBeNull()
  })
  it('returns null for malformed JSON', () => {
    expect(extractJson('{ bad json }')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(extractJson('')).toBeNull()
  })
})

describe('pegColor()', () => {
  it('returns gain for PEG ≤ 1.5', () => {
    expect(pegColor(1.0)).toMatch(/10b981/)
  })
  it('returns warn for PEG between 1.5 and 2.5', () => {
    expect(pegColor(2.0)).toMatch(/f59e0b/)
  })
  it('returns loss for PEG > 2.5', () => {
    expect(pegColor(3.0)).toMatch(/ef4444/)
  })
  it('returns loss for Infinity', () => {
    expect(pegColor(Infinity)).toMatch(/ef4444/)
  })
})

describe('scColor()', () => {
  it('returns gain for score ≥ 7', () => {
    expect(scColor(8)).toMatch(/10b981/)
  })
  it('returns warn for score 5–6', () => {
    expect(scColor(6)).toMatch(/f59e0b/)
  })
  it('returns loss for score < 5', () => {
    expect(scColor(3)).toMatch(/ef4444/)
  })
})

describe('vColor()', () => {
  it('returns gain for BUY', () => {
    expect(vColor('BUY')).toMatch(/10b981/)
  })
  it('returns loss for AVOID', () => {
    expect(vColor('AVOID')).toMatch(/ef4444/)
  })
  it('returns warn for HOLD', () => {
    expect(vColor('HOLD')).toMatch(/f59e0b/)
  })
  it('returns warn for unknown verdict', () => {
    expect(vColor('UNKNOWN')).toMatch(/f59e0b/)
  })
})

describe('sanitizeTicker()', () => {
  it('uppercases input', () => {
    expect(sanitizeTicker('aapl')).toBe('AAPL')
  })
  it('strips injection characters < > { } " \' \\', () => {
    expect(sanitizeTicker('<AAPL>')).toBe('AAPL')
    expect(sanitizeTicker('{"ticker":"MSFT"}')).toBe('TICKERMSFT')
    expect(sanitizeTicker("AA'PL")).toBe('AAPL')
    expect(sanitizeTicker('AA\\PL')).toBe('AAPL')
  })
  it('strips non-alphanumeric non-dot characters', () => {
    expect(sanitizeTicker('BRK-B')).toBe('BRKB')
    expect(sanitizeTicker('BRK.B')).toBe('BRK.B')
  })
  it('truncates to 10 characters', () => {
    expect(sanitizeTicker('ABCDEFGHIJK')).toHaveLength(10)
    expect(sanitizeTicker('ABCDEFGHIJK')).toBe('ABCDEFGHIJ')
  })
  it('returns empty string for empty input', () => {
    expect(sanitizeTicker('')).toBe('')
    expect(sanitizeTicker('   ')).toBe('')
  })
  it('returns empty string for non-string input', () => {
    expect(sanitizeTicker(null)).toBe('')
    expect(sanitizeTicker(undefined)).toBe('')
    expect(sanitizeTicker(42)).toBe('')
  })
})
