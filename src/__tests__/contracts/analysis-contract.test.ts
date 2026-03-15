/**
 * @jest-environment node
 *
 * LLM contract tests — enforce AnalysisResult output schema.
 * These verify that sanitiseResult() correctly enforces all field contracts
 * regardless of what the mocked LLM returns.
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

function mockClaude(responseText: string) {
  server.use(
    http.post('http://localhost/api/claude', () => {
      return HttpResponse.json({
        content: [{ type: 'text', text: responseText }],
      })
    })
  )
}

describe('L-01: verdict is always BUY | HOLD | AVOID', () => {
  it('passes through valid verdict', async () => {
    mockClaude('{"strategyScore":7,"verdict":"BUY","verdictReason":"Good"}')
    const result = await runAnalysis(OPTS)
    expect(['BUY', 'HOLD', 'AVOID']).toContain(result.verdict)
  })

  it('defaults to HOLD for unknown verdict', async () => {
    mockClaude('{"strategyScore":7,"verdict":"STRONG_BUY","verdictReason":"Great"}')
    const result = await runAnalysis(OPTS)
    expect(result.verdict).toBe('HOLD')
  })

  it('defaults to HOLD when verdict is missing', async () => {
    mockClaude('{"strategyScore":5}')
    const result = await runAnalysis(OPTS)
    expect(result.verdict).toBe('HOLD')
  })
})

describe('L-02: strategyScore is always 0–10', () => {
  it('clamps score > 10 to 10', async () => {
    mockClaude('{"strategyScore":15,"verdict":"BUY"}')
    const result = await runAnalysis(OPTS)
    expect(result.strategyScore).toBe(10)
  })

  it('clamps score < 0 to 0', async () => {
    mockClaude('{"strategyScore":-3,"verdict":"AVOID"}')
    const result = await runAnalysis(OPTS)
    expect(result.strategyScore).toBe(0)
  })

  it('defaults to 5 for non-numeric score', async () => {
    mockClaude('{"strategyScore":"excellent","verdict":"BUY"}')
    const result = await runAnalysis(OPTS)
    expect(result.strategyScore).toBe(5)
  })
})

describe('L-03: moatScore is always 0–10', () => {
  it('clamps moatScore > 10 to 10', async () => {
    mockClaude('{"strategyScore":7,"verdict":"BUY","moatScore":99}')
    const result = await runAnalysis(OPTS)
    expect(result.moatScore).toBeLessThanOrEqual(10)
    expect(result.moatScore).toBeGreaterThanOrEqual(0)
  })
})

describe('L-04: strengths is always an array, max 5 items', () => {
  it('returns empty array when strengths is missing', async () => {
    mockClaude('{"strategyScore":5,"verdict":"HOLD"}')
    const result = await runAnalysis(OPTS)
    expect(Array.isArray(result.strengths)).toBe(true)
    expect(result.strengths).toHaveLength(0)
  })

  it('limits strengths to 5 items', async () => {
    const strengths = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    mockClaude(JSON.stringify({ strategyScore: 7, verdict: 'BUY', strengths }))
    const result = await runAnalysis(OPTS)
    expect(result.strengths).toHaveLength(5)
  })
})

describe('L-05: risks is always an array, max 4 items', () => {
  it('returns empty array when risks is missing', async () => {
    mockClaude('{"strategyScore":5,"verdict":"HOLD"}')
    const result = await runAnalysis(OPTS)
    expect(Array.isArray(result.risks)).toBe(true)
  })

  it('limits risks to 4 items', async () => {
    const risks = ['r1', 'r2', 'r3', 'r4', 'r5']
    mockClaude(JSON.stringify({ strategyScore: 5, verdict: 'HOLD', risks }))
    const result = await runAnalysis(OPTS)
    expect(result.risks).toHaveLength(4)
  })
})

describe('L-06: screenResults is always an array', () => {
  it('returns empty array when screenResults is missing', async () => {
    mockClaude('{"strategyScore":5,"verdict":"HOLD"}')
    const result = await runAnalysis(OPTS)
    expect(Array.isArray(result.screenResults)).toBe(true)
  })

  it('returns empty array when screenResults is a non-array', async () => {
    mockClaude('{"strategyScore":5,"verdict":"HOLD","screenResults":"passed"}')
    const result = await runAnalysis(OPTS)
    expect(Array.isArray(result.screenResults)).toBe(true)
    expect(result.screenResults).toHaveLength(0)
  })
})

describe('L-07: ticker is always uppercase', () => {
  it('uppercases ticker in result', async () => {
    mockClaude('{"strategyScore":7,"verdict":"BUY"}')
    const result = await runAnalysis({ ...OPTS, ticker: 'aapl' })
    expect(result.ticker).toBe('AAPL')
  })
})

describe('L-08: isLive reflects fmpKey presence', () => {
  it('isLive=false when no fmpKey', async () => {
    mockClaude('{"strategyScore":7,"verdict":"BUY"}')
    const result = await runAnalysis({ ...OPTS, fmpKey: null })
    expect(result.isLive).toBe(false)
  })

  it('isLive=true when fmpKey is provided', async () => {
    mockClaude('{"strategyScore":7,"verdict":"BUY"}')
    const result = await runAnalysis({ ...OPTS, fmpKey: 'test-fmp-key' })
    expect(result.isLive).toBe(true)
  })
})
