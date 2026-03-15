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
  fmpKey: null,
}

describe('I-01: runAnalysis() — AI-only mode (no fmpKey)', () => {
  it('calls /api/claude and returns a valid AnalysisResult', async () => {
    const result = await runAnalysis(OPTS)
    expect(result.ticker).toBe('AAPL')
    expect(result.investorId).toBe('buffett')
    expect(result.isLive).toBe(false)
    expect(result.strategyScore).toBeGreaterThanOrEqual(0)
    expect(result.strategyScore).toBeLessThanOrEqual(10)
    expect(['BUY', 'HOLD', 'AVOID']).toContain(result.verdict)
  })
})

describe('I-02: runAnalysis() — live data mode (with fmpKey)', () => {
  it('returns isLive=true when fmpKey is provided', async () => {
    const result = await runAnalysis({ ...OPTS, fmpKey: 'test-key' })
    expect(result.isLive).toBe(true)
    expect(result.dataSource).toContain('FMP')
  })
})

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
    const result = await runAnalysis({ ...OPTS, fmpKey: 'test-key' })
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
