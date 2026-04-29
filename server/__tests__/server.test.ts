/**
 * @jest-environment node
 *
 * Backend integration tests — Express server (server/app.ts)
 * S-01 through S-12
 *
 * All external fetch calls are intercepted via jest mock so no real API
 * traffic is made during tests.
 */
import request from 'supertest'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Ensure all provider keys are set so key-guard checks don't return 503.
// Tests mock fetch globally so no real upstream calls are made — these are
// just sentinel values to satisfy the `if (!KEY) res.status(503)` guards.
process.env['ANTHROPIC_API_KEY'] = process.env['ANTHROPIC_API_KEY'] || 'test-anthropic-key'
process.env['GOOGLE_API_KEY']    = process.env['GOOGLE_API_KEY']    || 'test-google-key'
process.env['OPENAI_API_KEY']    = process.env['OPENAI_API_KEY']    || 'test-openai-key'
process.env['MISTRAL_API_KEY']   = process.env['MISTRAL_API_KEY']   || 'test-mistral-key'
process.env['FMP_API_KEY']       = process.env['FMP_API_KEY']       || 'test-fmp-key'
process.env['FINNHUB_API_KEY']   = process.env['FINNHUB_API_KEY']   || 'test-finnhub-key'
process.env['ADMIN_PASSWORD']    = process.env['ADMIN_PASSWORD']    || 'test-admin-password'

// Must import AFTER jest env is set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, fmpCache } = require('../app') as typeof import('../app')

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal mock Response compatible with the fetch API */
function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as unknown as Response
}

/**
 * Bearer token honored by attachUser when JEST_WORKER_ID is set. Format:
 * "test-user:<id>:<email>:<tier>:<isAdmin>". Production never sees this.
 */
const TEST_AUTH = 'Bearer test-user:test-uid:test@example.com:free:user'

/** Shorthand: GET path with the test bearer token attached. */
function authedGet(path: string) {
  return request(app).get(path).set('Authorization', TEST_AUTH)
}

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

beforeEach(() => {
  // Reset fetch mock and clear FMP cache before each test
  mockFetch.mockReset()
  fmpCache.clear()
})

// ── S-01: GET /health ─────────────────────────────────────────────────────────

describe('S-01: GET /health', () => {
  it('returns status ok with all required fields', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(typeof res.body.claude).toBe('boolean')
    expect(typeof res.body.gemini).toBe('boolean')
    expect(typeof res.body.openai).toBe('boolean')
    expect(typeof res.body.mistral).toBe('boolean')
    expect(typeof res.body.fmp).toBe('boolean')
    expect(typeof res.body.cacheSize).toBe('number')
    expect(typeof res.body.uptime).toBe('number')
    expect(typeof res.body.time).toBe('string')
  })

  it('reports api keys as configured (keys present in .env)', async () => {
    const res = await request(app).get('/health')
    expect(res.body.claude).toBe(true)
    expect(res.body.gemini).toBe(true)
    expect(res.body.fmp).toBe(true)
  })
})

// ── S-02: POST /claude — input validation ─────────────────────────────────────

describe('S-02: POST /claude — input validation', () => {
  it('returns 400 when prompt is missing', async () => {
    const res = await request(app).post('/claude').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/prompt/i)
  })

  it('returns 400 when prompt is an empty string', async () => {
    const res = await request(app).post('/claude').send({ prompt: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/prompt/i)
  })

  it('returns 400 when prompt is not a string', async () => {
    const res = await request(app).post('/claude').send({ prompt: 42 })
    expect(res.status).toBe(400)
  })
})

// ── S-03: POST /claude — upstream success ────────────────────────────────────

describe('S-03: POST /claude — upstream success', () => {
  it('proxies valid prompt and returns Anthropic response', async () => {
    const mockBody = { content: [{ type: 'text', text: '{"verdict":"BUY"}' }] }
    mockFetch.mockResolvedValueOnce(mockResponse(mockBody))

    const res = await request(app)
      .post('/claude')
      .send({ prompt: 'Analyze AAPL' })

    expect(res.status).toBe(200)
    expect(res.body.content[0].text).toBe('{"verdict":"BUY"}')
  })

  it('ignores client-supplied model — always uses locked model', async () => {
    const mockBody = { content: [{ type: 'text', text: 'ok' }] }
    mockFetch.mockResolvedValueOnce(mockResponse(mockBody))

    await request(app)
      .post('/claude')
      .send({ prompt: 'test', model: 'claude-opus-4-5' })

    // Verify the fetch call used the locked model, not the client model
    const fetchCall = mockFetch.mock.calls[0]
    const body = JSON.parse(fetchCall[1]?.body as string) as { model: string }
    expect(body.model).toBe('claude-haiku-4-5-20251001')
  })
})

// ── S-04: POST /claude — upstream error ──────────────────────────────────────

describe('S-04: POST /claude — upstream errors', () => {
  it('propagates 4xx error from Anthropic with detail', async () => {
    const errBody = { error: { message: 'Invalid API key' } }
    mockFetch.mockResolvedValueOnce(mockResponse(errBody, 401))

    const res = await request(app)
      .post('/claude')
      .send({ prompt: 'test' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/anthropic api error/i)
    expect(res.body.detail).toMatch(/invalid api key/i)
  })

  it('returns 502 when fetch itself throws (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const res = await request(app)
      .post('/claude')
      .send({ prompt: 'test' })

    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/failed to reach anthropic/i)
  })
})

// ── S-05: POST /gemini — input validation ────────────────────────────────────

describe('S-05: POST /gemini — input validation', () => {
  it('returns 400 when prompt is missing', async () => {
    const res = await request(app).post('/gemini').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/prompt/i)
  })

  it('returns 400 when prompt is empty', async () => {
    const res = await request(app).post('/gemini').send({ prompt: '' })
    expect(res.status).toBe(400)
  })
})

// ── S-06: POST /gemini — response normalization ──────────────────────────────

describe('S-06: POST /gemini — response normalization', () => {
  it('normalizes Gemini response to Claude content array shape', async () => {
    const geminiBody = {
      candidates: [
        { content: { parts: [{ text: '{"verdict":"HOLD"}' }] } },
      ],
    }
    mockFetch.mockResolvedValueOnce(mockResponse(geminiBody))

    const res = await request(app)
      .post('/gemini')
      .send({ prompt: 'Analyze MSFT' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      content: [{ type: 'text', text: '{"verdict":"HOLD"}' }],
    })
  })

  it('skips thought parts and returns the last non-thought text', async () => {
    const geminiBody = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'thinking...', thought: true },
              { text: '{"verdict":"BUY"}', thought: false },
            ],
          },
        },
      ],
    }
    mockFetch.mockResolvedValueOnce(mockResponse(geminiBody))

    const res = await request(app)
      .post('/gemini')
      .send({ prompt: 'Analyze AAPL' })

    expect(res.status).toBe(200)
    expect(res.body.content[0].text).toBe('{"verdict":"BUY"}')
  })

  it('uses gemini-2.5-flash by default', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })
    )

    await request(app).post('/gemini').send({ prompt: 'test' })

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('gemini-2.5-flash')
  })

  it('respects allowed model selection (gemini-2.5-pro)', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })
    )

    await request(app)
      .post('/gemini')
      .send({ prompt: 'test', model: 'gemini-2.5-pro' })

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('gemini-2.5-pro')
  })

  it('falls back to gemini-2.5-flash for disallowed model', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })
    )

    await request(app)
      .post('/gemini')
      .send({ prompt: 'test', model: 'gpt-4o' })

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('gemini-2.5-flash')
  })
})

// ── S-07: GET /fmp/* — proxy & cache ─────────────────────────────────────────

describe('S-07: GET /fmp/* — proxy and cache', () => {
  it('returns data and X-Cache: MISS on first request', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([{ symbol: 'AAPL', price: 185 }]))

    const res = await authedGet('/fmp/profile/AAPL')

    expect(res.status).toBe(200)
    expect(res.headers['x-cache']).toBe('MISS')
    expect(res.body[0].symbol).toBe('AAPL')
  })

  it('returns X-Cache: HIT on second identical request', async () => {
    // First request — populates cache
    mockFetch.mockResolvedValueOnce(mockResponse([{ symbol: 'AAPL', price: 185 }]))
    await authedGet('/fmp/profile/AAPL')

    // Second request — should hit cache without calling fetch again
    const res = await authedGet('/fmp/profile/AAPL')

    expect(res.status).toBe(200)
    expect(res.headers['x-cache']).toBe('HIT')
    // fetch should only have been called once total
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('returns 502 when FMP fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('DNS lookup failed'))

    const res = await authedGet('/fmp/profile/BADTICKER')

    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/failed to reach fmp/i)
  })

  it('propagates non-2xx FMP status to client', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Not found' }, 404))

    const res = await authedGet('/fmp/profile/XXXX')

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/fmp api error/i)
  })
})

// ── S-08: GET /fmp/* — path allowlist ────────────────────────────────────────

describe('S-08: GET /fmp/* — path allowlist', () => {
  it('allows valid path: profile', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([{ symbol: 'AAPL' }]))
    const res = await authedGet('/fmp/profile/AAPL')
    expect(res.status).toBe(200)
  })

  it('allows valid path: quote', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([{ symbol: 'MSFT', price: 400 }]))
    const res = await authedGet('/fmp/quote/MSFT')
    expect(res.status).toBe(200)
  })

  it('allows valid path: stock/list', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]))
    const res = await authedGet('/fmp/stock/list')
    expect(res.status).toBe(200)
  })

  it('rejects unknown path with 400', async () => {
    const res = await authedGet('/fmp/unknown-endpoint/AAPL')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalid fmp endpoint/i)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects path traversal attempt — Express normalizes it away (404)', async () => {
    // Express normalizes /fmp/../../../etc/passwd before it hits the route,
    // so no FMP request is made regardless.
    const res = await request(app).get('/fmp/../../../etc/passwd')
    expect([400, 404]).toContain(res.status)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ── S-09: GET /fmp/* — auth required ─────────────────────────────────────────

describe('S-09: GET /fmp/* — auth required', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/fmp/profile/AAPL')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('AUTH_REQUIRED')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns 401 with malformed Bearer token', async () => {
    // 'Bearer garbage' falls past the test-mode prefix into the real
    // supabaseAdmin.auth.getUser path, which fails (invalid JWT) → req.user
    // stays undefined → requireAuth returns 401. mockFetch may register one
    // upstream Supabase call before the rejection; what matters is that no
    // FMP call is made.
    const res = await request(app)
      .get('/fmp/profile/AAPL')
      .set('Authorization', 'Bearer garbage')
    expect(res.status).toBe(401)
    const fmpCalls = mockFetch.mock.calls.filter(([u]) =>
      typeof u === 'string' && u.includes('financialmodelingprep.com')
    )
    expect(fmpCalls).toHaveLength(0)
  })

  it('proceeds to FMP fetch when authenticated', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([{ symbol: 'TSLA' }]))
    const res = await authedGet('/fmp/profile/TSLA')
    expect(res.status).toBe(200)
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('apikey=')
  })
})

// ── S-09b: GET /market-movers — auth required ────────────────────────────────

describe('S-09b: GET /market-movers — auth required', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/market-movers')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('AUTH_REQUIRED')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('proceeds to FMP fetch when authenticated', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([{ symbol: 'NVDA', changesPercentage: 5 }]))
    mockFetch.mockResolvedValueOnce(mockResponse([{ symbol: 'TSLA', changesPercentage: -3 }]))
    const res = await authedGet('/market-movers')
    expect(res.status).toBe(200)
    expect(res.body.gainers).toBeDefined()
    expect(res.body.losers).toBeDefined()
  })
})

// ── S-09c: GET /market-snapshot — auth + shape + caching ─────────────────────
// Powers the screener's live sort modes (gainers / losers / most-active)
// with a 60-second cache so repeated screener auto-refreshes don't hammer FMP.

describe('S-09c: GET /market-snapshot', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/market-snapshot')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('AUTH_REQUIRED')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns gainers + losers + mostActive arrays + asOf timestamp', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([
      { symbol: 'NVDA', name: 'NVIDIA',     price: 900, change:  10, changesPercentage: 1.5, exchange: 'NASDAQ' },
      { symbol: 'AMD',  name: 'AMD',        price: 200, change:   8, changesPercentage: 4.2, exchange: 'NASDAQ' },
    ]))
    mockFetch.mockResolvedValueOnce(mockResponse([
      { symbol: 'TSLA', name: 'Tesla',      price: 180, change: -10, changesPercentage: -5.2, exchange: 'NASDAQ' },
    ]))
    mockFetch.mockResolvedValueOnce(mockResponse([
      { symbol: 'AAPL', name: 'Apple',      price: 185, change:   2, changesPercentage: 1.1, exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft',  price: 410, change:  -1, changesPercentage: -0.2, exchange: 'NASDAQ' },
    ]))

    const res = await authedGet('/market-snapshot')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.gainers)).toBe(true)
    expect(Array.isArray(res.body.losers)).toBe(true)
    expect(Array.isArray(res.body.mostActive)).toBe(true)
    expect(res.body.gainers).toHaveLength(2)
    expect(res.body.gainers[0]).toMatchObject({ symbol: 'NVDA', changesPercentage: 1.5 })
    expect(res.body.mostActive[0]).toMatchObject({ symbol: 'AAPL' })
    expect(typeof res.body.asOf).toBe('string')
  })

  it('drops rows with no symbol so a single bad row never blanks the page', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([
      { symbol: '',     name: 'broken',  changesPercentage: 99 },
      { symbol: 'GOOD', name: 'GoodCorp', changesPercentage:  3 },
    ]))
    mockFetch.mockResolvedValueOnce(mockResponse([]))
    mockFetch.mockResolvedValueOnce(mockResponse([]))

    const res = await authedGet('/market-snapshot')
    expect(res.status).toBe(200)
    expect(res.body.gainers).toHaveLength(1)
    expect(res.body.gainers[0].symbol).toBe('GOOD')
  })

  it('serves second request from cache (X-Cache: HIT)', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([{ symbol: 'NVDA', changesPercentage: 5 }]))
    mockFetch.mockResolvedValueOnce(mockResponse([{ symbol: 'TSLA', changesPercentage: -3 }]))
    mockFetch.mockResolvedValueOnce(mockResponse([{ symbol: 'AAPL', changesPercentage: 1 }]))

    const r1 = await authedGet('/market-snapshot')
    expect(r1.headers['x-cache']).toBe('MISS')

    const r2 = await authedGet('/market-snapshot')
    expect(r2.headers['x-cache']).toBe('HIT')
    expect(r2.body.gainers[0].symbol).toBe('NVDA')
    // Second call should NOT have hit FMP again — only the 3 from the first call.
    expect(mockFetch.mock.calls).toHaveLength(3)
  })
})

// ── S-10: POST /openai — input validation ────────────────────────────────────

describe('S-10: POST /openai — input validation', () => {
  it('returns 400 when prompt is missing', async () => {
    const res = await request(app).post('/openai').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/prompt/i)
  })

  it('returns 400 when prompt is empty string', async () => {
    const res = await request(app).post('/openai').send({ prompt: '  ' })
    expect(res.status).toBe(400)
  })
})

// ── S-11: POST /openai — response normalization ──────────────────────────────

describe('S-11: POST /openai — response normalization', () => {
  it('normalizes OpenAI response to Claude content array shape', async () => {
    const openaiBody = {
      choices: [{ message: { content: '{"verdict":"BUY"}' } }],
    }
    mockFetch.mockResolvedValueOnce(mockResponse(openaiBody))

    const res = await request(app)
      .post('/openai')
      .send({ prompt: 'Analyze AAPL' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      content: [{ type: 'text', text: '{"verdict":"BUY"}' }],
    })
  })

  it('defaults to gpt-4o-mini when no model supplied', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ choices: [{ message: { content: 'ok' } }] })
    )

    await request(app).post('/openai').send({ prompt: 'test' })

    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as { model: string }
    expect(body.model).toBe('gpt-4o-mini')
  })

  it('respects allowed model (gpt-4o)', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ choices: [{ message: { content: 'ok' } }] })
    )

    await request(app).post('/openai').send({ prompt: 'test', model: 'gpt-4o' })

    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as { model: string }
    expect(body.model).toBe('gpt-4o')
  })

  it('falls back to gpt-4o-mini for disallowed model', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ choices: [{ message: { content: 'ok' } }] })
    )

    await request(app).post('/openai').send({ prompt: 'test', model: 'gpt-evil' })

    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as { model: string }
    expect(body.model).toBe('gpt-4o-mini')
  })

  it('returns 502 when OpenAI fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const res = await request(app).post('/openai').send({ prompt: 'test' })

    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/failed to reach openai/i)
  })
})

// ── S-12: POST /mistral — input validation ───────────────────────────────────

describe('S-12: POST /mistral — input validation', () => {
  it('returns 400 when prompt is missing', async () => {
    const res = await request(app).post('/mistral').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/prompt/i)
  })

  it('returns 400 when prompt is empty string', async () => {
    const res = await request(app).post('/mistral').send({ prompt: '' })
    expect(res.status).toBe(400)
  })
})

// ── S-13: POST /mistral — response normalization ─────────────────────────────

describe('S-13: POST /mistral — response normalization', () => {
  it('normalizes Mistral response to Claude content array shape', async () => {
    const mistralBody = {
      choices: [{ message: { content: '{"verdict":"AVOID"}' } }],
    }
    mockFetch.mockResolvedValueOnce(mockResponse(mistralBody))

    const res = await request(app)
      .post('/mistral')
      .send({ prompt: 'Analyze TSLA' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      content: [{ type: 'text', text: '{"verdict":"AVOID"}' }],
    })
  })

  it('defaults to mistral-small-3.1 when no model supplied', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ choices: [{ message: { content: 'ok' } }] })
    )

    await request(app).post('/mistral').send({ prompt: 'test' })

    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as { model: string }
    expect(body.model).toBe('mistral-small-3.1')
  })

  it('respects allowed model (mistral-large-2)', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ choices: [{ message: { content: 'ok' } }] })
    )

    await request(app).post('/mistral').send({ prompt: 'test', model: 'mistral-large-2' })

    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as { model: string }
    expect(body.model).toBe('mistral-large-2')
  })

  it('falls back to mistral-small-3.1 for disallowed model', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ choices: [{ message: { content: 'ok' } }] })
    )

    await request(app).post('/mistral').send({ prompt: 'test', model: 'evil-model' })

    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as { model: string }
    expect(body.model).toBe('mistral-small-3.1')
  })

  it('returns 502 when Mistral fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const res = await request(app).post('/mistral').send({ prompt: 'test' })

    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/failed to reach mistral/i)
  })
})

// ── S-13: CORS allowlist (Phase 2.2) ─────────────────────────────────────────

describe('S-13: CORS allowlist', () => {
  it('allows requests with no Origin header (server-to-server / curl)', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
  })

  it('allows localhost in non-prod (default test env)', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:5173')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('allows a different localhost port in non-prod', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:4321')
    expect(res.status).toBe(200)
  })

  it('rejects an unknown origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example.com')
    // express-cors invokes the cb error → request continues without ACAO header.
    // The response body still serves (CORS doesn't block server-side), but the
    // browser would refuse to expose it. Verify no ACAO header was set.
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})

// ── S-14: Security headers (Phase 2.3) ───────────────────────────────────────

describe('S-14: security headers', () => {
  it('sets X-Content-Type-Options on every response', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })

  it('sets X-Frame-Options: DENY on app routes', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['x-frame-options']).toBe('DENY')
  })

  it('omits X-Frame-Options on /embed/* routes (Phase 10 will iframe-render those)', async () => {
    // /embed/* doesn't exist as a route yet so we expect 404, but the headers
    // middleware runs before the 404 — the assertion is about absence on this path.
    const res = await request(app).get('/embed/whatever')
    expect(res.headers['x-frame-options']).toBeUndefined()
  })

  it('sets Referrer-Policy and Permissions-Policy', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(res.headers['permissions-policy']).toBe('geolocation=(), microphone=(), camera=()')
  })

  it('ships CSP in Report-Only mode (the enforcing variant is absent)', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['content-security-policy-report-only']).toContain("default-src 'self'")
    expect(res.headers['content-security-policy-report-only']).toContain('report-uri /csp-report')
    expect(res.headers['content-security-policy']).toBeUndefined()
  })

  it('CSP report endpoint returns 204 and accepts the report payload', async () => {
    const res = await request(app)
      .post('/csp-report')
      .set('Content-Type', 'application/csp-report')
      .send(JSON.stringify({ 'csp-report': { 'document-uri': 'https://x', 'violated-directive': 'script-src' } }))
    expect(res.status).toBe(204)
  })
})

// ── S-15: All providers pin temperature for output consistency ──────────────
// Without an explicit temperature, providers default to ~1.0 and the same
// prompt produces wildly different outputs run-to-run — the "two totally
// different results in seconds" bug. Stratalyx is an analysis tool; users
// expect consistent answers for consistent inputs. Pin to 0.1.

describe('S-15: LLM temperature pinning', () => {
  const expectedTemperature = 0.1

  it('Anthropic /claude sets temperature on the upstream request', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ content: [{ type: 'text', text: 'ok' }] }))
    await request(app).post('/claude').send({ prompt: 'test' })
    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as { temperature: number }
    expect(body.temperature).toBe(expectedTemperature)
  })

  it('Gemini /gemini sets temperature in generationConfig', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({
      candidates: [{ content: { parts: [{ text: 'ok' }] } }],
    }))
    await request(app).post('/gemini').send({ prompt: 'test' })
    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as { generationConfig: { temperature: number } }
    expect(body.generationConfig.temperature).toBe(expectedTemperature)
  })

  it('OpenAI /openai sets temperature on the upstream request', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({
      choices: [{ message: { content: 'ok' } }],
    }))
    await request(app).post('/openai').send({ prompt: 'test' })
    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as { temperature: number }
    expect(body.temperature).toBe(expectedTemperature)
  })

  it('Mistral /mistral sets temperature on the upstream request', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({
      choices: [{ message: { content: 'ok' } }],
    }))
    await request(app).post('/mistral').send({ prompt: 'test' })
    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string) as { temperature: number }
    expect(body.temperature).toBe(expectedTemperature)
  })
})
