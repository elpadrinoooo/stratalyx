/**
 * @jest-environment node
 *
 * Integration tests — analysis pipeline
 * These tests import setupMsw to intercept network calls.
 */
import '../../setupMsw'
import { describe, it, expect } from '@jest/globals'
import { http, HttpResponse } from 'msw'
import { server } from '../../../msw/server'
import { runAnalysis } from '../../engine/analyze'
import { INVESTORS } from '../../constants/investors'

const buffett = INVESTORS.find((i) => i.id === 'buffett')!

const OPTS = {
  ticker: 'AAPL',
  investor: buffett,
  provider: 'anthropic',
  model: 'claude-haiku-4-5-20251001',
  authToken: null,
}

// I-01 was "AI-only mode (no fmpKey)" — fmpKey is gone after Phase 3.1 client
// cleanup; the server holds the FMP key and live data is attempted on every
// run. The test now exercises the happy path: MSW returns FMP data + Claude
// JSON, we expect a valid result with live data.

describe('I-01: runAnalysis() — happy path (live data + Claude)', () => {
  it('calls /api/claude and returns a valid AnalysisResult with isLive=true', async () => {
    const result = await runAnalysis(OPTS)
    expect(result.ticker).toBe('AAPL')
    expect(result.investorId).toBe('buffett')
    expect(result.isLive).toBe(true)
    expect(result.dataSource).toContain('FMP')
    expect(result.strategyScore).toBeGreaterThanOrEqual(0)
    expect(result.strategyScore).toBeLessThanOrEqual(10)
    expect(['BUY', 'HOLD', 'AVOID']).toContain(result.verdict)
  })
})

// I-02 (live data mode) merged into I-01 above — now redundant.

describe('I-03: runAnalysis() — FMP failure is non-fatal', () => {
  it('falls back to AI-only when FMP endpoints fail', async () => {
    server.use(
      http.get('http://localhost/api/fmp/profile/:ticker', () => {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }),
      http.get('http://localhost/api/fmp/ratios-ttm/:ticker', () => {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }),
      http.get('http://localhost/api/fmp/quote/:ticker', () => {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }),
      http.get('http://localhost/api/fmp/income-statement/:ticker', () => {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }),
      http.get('http://localhost/api/fmp/cash-flow-statement/:ticker', () => {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      })
    )
    // Should not throw — FMP failure is non-fatal
    const result = await runAnalysis(OPTS)
    expect(result.ticker).toBe('AAPL')
    // liveData may be null since all FMP calls failed
    expect(result.isLive).toBe(false)
  })
})

describe('I-04: runAnalysis() — Claude API error', () => {
  it('throws on Claude 500 error', async () => {
    server.use(
      http.post('http://localhost/api/claude', () => {
        return HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
      })
    )
    await expect(runAnalysis(OPTS)).rejects.toThrow()
  })
})

describe('I-05: runAnalysis() — unparseable JSON from Claude', () => {
  it('throws when Claude returns no JSON', async () => {
    server.use(
      http.post('http://localhost/api/claude', () => {
        return HttpResponse.json({
          content: [{ type: 'text', text: 'Sorry, I cannot provide that analysis.' }],
        })
      })
    )
    await expect(runAnalysis(OPTS)).rejects.toThrow('LLM response did not contain valid JSON')
  })
})

describe('I-06: sanitizeTicker in runAnalysis()', () => {
  it('throws for empty/invalid ticker', async () => {
    await expect(runAnalysis({ ...OPTS, ticker: '' })).rejects.toThrow('Invalid ticker symbol')
    // All injection chars stripped → empty string → invalid
    await expect(runAnalysis({ ...OPTS, ticker: '<>{}' })).rejects.toThrow('Invalid ticker symbol')
  })
})

// ── Phase 4.3: deterministic valuation overrides LLM-hallucinated IV/MoS ─────

describe('I-07 (Phase 4.3): deterministic valuation overrides LLM IV/MoS', () => {
  it('attaches result.valuation when live data is available', async () => {
    const result = await runAnalysis(OPTS)
    expect(result.valuation).toBeDefined()
    // Default MSW fixtures have no FCF (income-statement and cash-flow-statement
    // both return []), so Buffett's owner-earnings DCF cannot run. Strategy
    // should report inapplicable with a clear reason.
    expect(result.valuation?.applicable).toBe(false)
    expect(result.valuation?.inapplicableReason).toMatch(/free cash flow/i)
    // When inapplicable, the LLM's claimed IV/MoS pass through (the override
    // only fires for applicable strategies).
    expect(result.intrinsicValueLow).toBe(170)
    expect(result.intrinsicValueHigh).toBe(220)
    expect(result.marginOfSafety).toBe(8.4)
  })

  it('overrides LLM IV/MoS when FCF is available and the DCF runs', async () => {
    // Override MSW to return cash-flow data with a meaningful FCF figure +
    // multi-year income for CAGR derivation. The Buffett strategy will then
    // produce a deterministic IV — which MUST replace the LLM fixture's
    // 170/220/8.4 numbers.
    server.use(
      http.get('http://localhost/api/fmp/cash-flow-statement/:ticker', () => {
        return HttpResponse.json([
          { date: '2024-09-30', freeCashFlow: 100_000_000_000, operatingCashFlow: 110e9, capitalExpenditure: 10e9, dividendsPaid: 15e9 },
        ])
      }),
      http.get('http://localhost/api/fmp/income-statement/:ticker', () => {
        return HttpResponse.json([
          { date: '2024-09-30', revenue: 380e9, grossProfit: 170e9, operatingIncome: 115e9, netIncome: 95e9, eps: 6.5, ebitda: 130e9 },
          { date: '2023-09-30', revenue: 380e9, grossProfit: 170e9, operatingIncome: 110e9, netIncome: 90e9, eps: 6.0, ebitda: 125e9 },
          { date: '2022-09-30', revenue: 365e9, grossProfit: 160e9, operatingIncome: 105e9, netIncome: 87e9, eps: 5.7, ebitda: 120e9 },
        ])
      }),
    )

    const result = await runAnalysis(OPTS)
    expect(result.valuation).toBeDefined()
    expect(result.valuation?.applicable).toBe(true)
    expect(result.valuation?.method).toMatch(/owner earnings/i)
    // Deterministic numbers must have replaced the LLM's 170/220/8.4
    expect(result.intrinsicValueLow).not.toBe(170)
    expect(result.intrinsicValueHigh).not.toBe(220)
    expect(result.marginOfSafety).not.toBe(8.4)
    // Must be positive, well-formed
    expect(result.intrinsicValueLow).toBeGreaterThan(0)
    expect(result.intrinsicValueLow).toBeLessThanOrEqual(result.intrinsicValueHigh)
    // moSUp reflects the sign of the new MoS
    if (result.marginOfSafety > 0) expect(result.moSUp).toBe(true)
    if (result.marginOfSafety < 0) expect(result.moSUp).toBe(false)
    // Sensitivity grid populated for DCF strategies
    expect(result.valuation?.sensitivity.length).toBeGreaterThan(0)
  })

  it('falls back to LLM numbers when isLive is false (no live data)', async () => {
    // Force every FMP endpoint to fail so liveData ends up null.
    server.use(
      http.get('http://localhost/api/fmp/profile/:ticker', () => HttpResponse.json({ error: 'unauth' }, { status: 401 })),
      http.get('http://localhost/api/fmp/ratios-ttm/:ticker', () => HttpResponse.json({ error: 'unauth' }, { status: 401 })),
      http.get('http://localhost/api/fmp/quote/:ticker', () => HttpResponse.json({ error: 'unauth' }, { status: 401 })),
      http.get('http://localhost/api/fmp/income-statement/:ticker', () => HttpResponse.json({ error: 'unauth' }, { status: 401 })),
      http.get('http://localhost/api/fmp/cash-flow-statement/:ticker', () => HttpResponse.json({ error: 'unauth' }, { status: 401 })),
    )
    const result = await runAnalysis(OPTS)
    expect(result.isLive).toBe(false)
    // No deterministic valuation when live data is absent
    expect(result.valuation).toBeUndefined()
    // LLM numbers pass through
    expect(result.intrinsicValueLow).toBe(170)
    expect(result.intrinsicValueHigh).toBe(220)
  })
})
