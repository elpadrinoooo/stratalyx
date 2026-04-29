/**
 * @jest-environment node
 *
 * Coverage for /api/user/analyses — the GET endpoint that hydrates a
 * signed-in user's analyses + watchlist from Supabase on session load.
 * Without this endpoint working, the History/Watchlist screens render
 * empty after every page refresh.
 */
import request from 'supertest'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

process.env['ANTHROPIC_API_KEY'] = process.env['ANTHROPIC_API_KEY'] || 'test'
process.env['GOOGLE_API_KEY']    = process.env['GOOGLE_API_KEY']    || 'test'
process.env['OPENAI_API_KEY']    = process.env['OPENAI_API_KEY']    || 'test'
process.env['MISTRAL_API_KEY']   = process.env['MISTRAL_API_KEY']   || 'test'
process.env['FMP_API_KEY']       = process.env['FMP_API_KEY']       || 'test'
process.env['FINNHUB_API_KEY']   = process.env['FINNHUB_API_KEY']   || 'test'
process.env['ADMIN_PASSWORD']    = process.env['ADMIN_PASSWORD']    || 'test'

// ── Mock supabaseAdmin so the route's .from('analyses')/.from('watchlist')
//    chains return canned data without touching a real Supabase project. The
//    chain mirrors the call shape the route uses: from().select().eq().order().limit()
//    for analyses, and from().select().eq() for watchlist.
const mockAnalysesData: Array<{ ticker: string; investor_id: string; result: unknown; created_at: string }> = []
const mockWatchlistData: Array<{ ticker: string }> = []

jest.mock('../supabaseAdmin', () => {
  const buildAnalysesChain = () => ({
    select: () => ({
      eq: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: mockAnalysesData, error: null }),
        }),
      }),
    }),
  })
  const buildWatchlistChain = () => ({
    select: () => ({
      eq: () => Promise.resolve({ data: mockWatchlistData, error: null }),
    }),
  })
  return {
    supabaseConfigured: true,
    supabaseAdmin: {
      from: (table: string) =>
        table === 'analyses' ? buildAnalysesChain() : buildWatchlistChain(),
    },
  }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app } = require('../app') as typeof import('../app')

const TEST_AUTH = 'Bearer test-user:test-uid:test@example.com:free:user'

beforeEach(() => {
  mockAnalysesData.length = 0
  mockWatchlistData.length = 0
})

describe('GET /api/user/analyses', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/user/analyses')
    expect(res.status).toBe(401)
  })

  it('keys analyses by ticker:investorId', async () => {
    mockAnalysesData.push({
      ticker: 'AAPL', investor_id: 'buffett',
      result: { ticker: 'AAPL', investorId: 'buffett', strategyScore: 80 },
      created_at: '2026-04-01T00:00:00Z',
    })
    mockAnalysesData.push({
      ticker: 'NVDA', investor_id: 'lynch',
      result: { ticker: 'NVDA', investorId: 'lynch', strategyScore: 65 },
      created_at: '2026-04-02T00:00:00Z',
    })
    mockWatchlistData.push({ ticker: 'AAPL' }, { ticker: 'TSLA' })

    const res = await request(app).get('/api/user/analyses').set('Authorization', TEST_AUTH)
    expect(res.status).toBe(200)
    expect(res.body.analyses).toEqual({
      'AAPL:buffett': { ticker: 'AAPL', investorId: 'buffett', strategyScore: 80 },
      'NVDA:lynch':   { ticker: 'NVDA', investorId: 'lynch',   strategyScore: 65 },
    })
    expect(res.body.watchlist).toEqual(['AAPL', 'TSLA'])
  })

  it('most-recent run wins on duplicate (ticker, investorId)', async () => {
    // Ascending order — same key appears twice; the later row should overwrite.
    mockAnalysesData.push({
      ticker: 'AAPL', investor_id: 'buffett',
      result: { ticker: 'AAPL', investorId: 'buffett', strategyScore: 50 },
      created_at: '2026-04-01T00:00:00Z',
    })
    mockAnalysesData.push({
      ticker: 'AAPL', investor_id: 'buffett',
      result: { ticker: 'AAPL', investorId: 'buffett', strategyScore: 92 },
      created_at: '2026-04-15T00:00:00Z',
    })
    const res = await request(app).get('/api/user/analyses').set('Authorization', TEST_AUTH)
    expect(res.status).toBe(200)
    expect(res.body.analyses['AAPL:buffett'].strategyScore).toBe(92)
  })

  it('skips rows with missing ticker / investor / result', async () => {
    mockAnalysesData.push(
      // Each cast is intentional — the route should defensively filter these
      // out so a single bad row never blanks the whole response.
      { ticker: '',     investor_id: 'buffett', result: { ok: true }, created_at: '2026-04-01T00:00:00Z' },
      { ticker: 'AAPL', investor_id: '',        result: { ok: true }, created_at: '2026-04-01T00:00:00Z' },
      { ticker: 'AAPL', investor_id: 'buffett', result: null,         created_at: '2026-04-01T00:00:00Z' },
      { ticker: 'NVDA', investor_id: 'lynch',
        result: { ticker: 'NVDA', investorId: 'lynch', strategyScore: 70 },
        created_at: '2026-04-02T00:00:00Z' },
    )
    const res = await request(app).get('/api/user/analyses').set('Authorization', TEST_AUTH)
    expect(res.status).toBe(200)
    expect(Object.keys(res.body.analyses)).toEqual(['NVDA:lynch'])
  })

  it('returns empty shapes when the user has nothing stored', async () => {
    const res = await request(app).get('/api/user/analyses').set('Authorization', TEST_AUTH)
    expect(res.status).toBe(200)
    expect(res.body.analyses).toEqual({})
    expect(res.body.watchlist).toEqual([])
  })
})
