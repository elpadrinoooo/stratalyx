import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'

export const ANTHROPIC_KEY = process.env['ANTHROPIC_API_KEY'] ?? ''
export const GOOGLE_KEY    = process.env['GOOGLE_API_KEY']    ?? ''
export const OPENAI_KEY    = process.env['OPENAI_API_KEY']    ?? ''
export const MISTRAL_KEY   = process.env['MISTRAL_API_KEY']   ?? ''
export const FMP_KEY       = process.env['FMP_API_KEY']       ?? ''

/** Locked model — clients cannot override this */
const LOCKED_MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 2000

// ── In-memory FMP cache (1 hour TTL) ─────────────────────────────────────────
interface CacheEntry {
  data: unknown
  ts: number
}
export const fmpCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000  // 1 hour

function getCached(key: string): unknown | null {
  const entry = fmpCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    fmpCache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: unknown): void {
  fmpCache.set(key, { data, ts: Date.now() })
}

// ── App ───────────────────────────────────────────────────────────────────────
export const app = express()

const CORS_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173'
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-fmp-key'],
}))

app.use(express.json({ limit: '1mb' }))

// ── Rate limiting ─────────────────────────────────────────────────────────────

const IS_TEST = Boolean(process.env['JEST_WORKER_ID'])

/** 60 FMP data requests per minute per IP */
const fmpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => IS_TEST,
  message: { error: 'Too many FMP requests — please try again in a minute' },
})

/** 20 LLM analysis requests per minute per IP */
const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => IS_TEST,
  message: { error: 'Too many analysis requests — please try again in a minute' },
})

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    claude:   Boolean(ANTHROPIC_KEY),
    gemini:   Boolean(GOOGLE_KEY),
    openai:   Boolean(OPENAI_KEY),
    mistral:  Boolean(MISTRAL_KEY),
    fmp:      Boolean(FMP_KEY),
    cacheSize: fmpCache.size,
    uptime: process.uptime(),
    time:   new Date().toISOString(),
  })
})

// ── Claude proxy ──────────────────────────────────────────────────────────────
app.post('/claude', llmLimiter, async (req: Request, res: Response) => {
  if (!ANTHROPIC_KEY) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
    return
  }

  const { prompt } = req.body as { prompt?: unknown; model?: unknown }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'prompt must be a non-empty string' })
    return
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LOCKED_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data: unknown = await upstream.json()

    if (!upstream.ok) {
      const err = data as { error?: { message?: string } }
      res.status(upstream.status).json({
        error: 'Anthropic API error',
        detail: err.error?.message ?? upstream.statusText,
      })
      return
    }

    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach Anthropic API', detail: message })
  }
})

// ── Gemini proxy ──────────────────────────────────────────────────────────────
app.post('/gemini', llmLimiter, async (req: Request, res: Response) => {
  if (!GOOGLE_KEY) {
    res.status(503).json({ error: 'GOOGLE_API_KEY not configured on server' })
    return
  }

  const { prompt, model } = req.body as { prompt?: unknown; model?: unknown }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'prompt must be a non-empty string' })
    return
  }

  const ALLOWED_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro']
  const geminiModel = typeof model === 'string' && ALLOWED_GEMINI_MODELS.includes(model)
    ? model
    : 'gemini-2.5-flash'

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GOOGLE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 16384 },
        }),
      },
    )

    const data: unknown = await upstream.json()

    if (!upstream.ok) {
      const err = data as { error?: { message?: string } }
      res.status(upstream.status).json({
        error: 'Gemini API error',
        detail: err.error?.message ?? upstream.statusText,
      })
      return
    }

    // Normalise Gemini response to match Claude's { content: [{ type, text }] } shape
    const gemini = data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> }
    const parts = gemini.candidates?.[0]?.content?.parts ?? []
    // Thinking models may prepend thought parts; grab the last non-thought text
    const textPart = [...parts].reverse().find(p => !p.thought && p.text) ?? parts[0]
    const text = textPart?.text ?? ''
    res.json({ content: [{ type: 'text', text }] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach Gemini API', detail: message })
  }
})

// ── Yahoo Finance price proxy (no API key required) ──────────────────────────
app.get('/price/:ticker', async (req: Request, res: Response) => {
  const ticker = (req.params['ticker'] ?? '').toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 10)
  if (!ticker) {
    res.status(400).json({ error: 'ticker is required' })
    return
  }

  const cacheKey = `yahoo:${ticker}`
  const cached = getCached(cacheKey)
  if (cached !== null) {
    res.set('X-Cache', 'HIT')
    res.json(cached)
    return
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'Yahoo Finance unavailable' })
      return
    }

    const data = await upstream.json() as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number
            chartPreviousClose?: number
            currency?: string
            shortName?: string
            exchangeName?: string
          }
        }>
        error?: { description?: string }
      }
    }

    const meta = data.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) {
      res.status(404).json({ error: `No price data found for ${ticker}` })
      return
    }

    const payload = {
      ticker,
      price:         meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose ?? 0,
      currency:      meta.currency ?? 'USD',
      shortName:     meta.shortName ?? ticker,
      exchange:      meta.exchangeName ?? '',
    }

    setCache(cacheKey, payload)
    res.set('X-Cache', 'MISS')
    res.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach Yahoo Finance', detail: message })
  }
})

// ── Yahoo Finance historical chart data ──────────────────────────────────────
app.get('/history/:ticker', async (req: Request, res: Response) => {
  const ticker = (req.params['ticker'] ?? '').toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 10)
  const range    = ['1d','5d','1mo','3mo','6mo','1y','2y','5y'].includes(req.query['range'] as string)
    ? req.query['range'] as string
    : '1y'
  const interval = range === '1d' ? '5m'
    : range === '5d' ? '15m'
    : range === '1mo' ? '1d'
    : '1wk'

  if (!ticker) {
    res.status(400).json({ error: 'ticker is required' })
    return
  }

  const cacheKey = `yhist:${ticker}:${range}`
  const cached = getCached(cacheKey)
  if (cached !== null) {
    res.set('X-Cache', 'HIT')
    res.json(cached)
    return
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&events=div%2Csplit`
    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'Yahoo Finance unavailable' })
      return
    }

    const data = await upstream.json() as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; currency?: string }
          timestamp?: number[]
          indicators?: {
            quote?: Array<{ close?: (number | null)[] }>
          }
        }>
      }
    }

    const result = data.chart?.result?.[0]
    if (!result?.timestamp || !result.indicators?.quote?.[0]?.close) {
      res.status(404).json({ error: `No chart data for ${ticker}` })
      return
    }

    const timestamps = result.timestamp
    const closes     = result.indicators.quote[0].close

    const points = timestamps
      .map((ts, i) => ({ t: ts * 1000, p: closes[i] }))
      .filter((pt): pt is { t: number; p: number } => pt.p !== null && pt.p > 0)

    const payload = { ticker, range, points, currency: result.meta?.currency ?? 'USD' }
    setCache(cacheKey, payload)
    res.set('X-Cache', 'MISS')
    res.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach Yahoo Finance', detail: message })
  }
})

// ── OpenAI proxy ─────────────────────────────────────────────────────────────
app.post('/openai', llmLimiter, async (req: Request, res: Response) => {
  if (!OPENAI_KEY) {
    res.status(503).json({ error: 'OPENAI_API_KEY not configured on server' })
    return
  }

  const { prompt, model } = req.body as { prompt?: unknown; model?: unknown }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'prompt must be a non-empty string' })
    return
  }

  const ALLOWED_OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o', 'o3-mini']
  const openaiModel = typeof model === 'string' && ALLOWED_OPENAI_MODELS.includes(model)
    ? model
    : 'gpt-4o-mini'

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openaiModel,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data: unknown = await upstream.json()

    if (!upstream.ok) {
      const err = data as { error?: { message?: string } }
      res.status(upstream.status).json({
        error: 'OpenAI API error',
        detail: err.error?.message ?? upstream.statusText,
      })
      return
    }

    // Normalise to Claude's { content: [{ type, text }] } shape
    const openai = data as { choices?: Array<{ message?: { content?: string } }> }
    const text = openai.choices?.[0]?.message?.content ?? ''
    res.json({ content: [{ type: 'text', text }] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach OpenAI API', detail: message })
  }
})

// ── Mistral proxy ─────────────────────────────────────────────────────────────
app.post('/mistral', llmLimiter, async (req: Request, res: Response) => {
  if (!MISTRAL_KEY) {
    res.status(503).json({ error: 'MISTRAL_API_KEY not configured on server' })
    return
  }

  const { prompt, model } = req.body as { prompt?: unknown; model?: unknown }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'prompt must be a non-empty string' })
    return
  }

  const ALLOWED_MISTRAL_MODELS = ['mistral-small-3.1', 'mistral-large-2']
  const mistralModel = typeof model === 'string' && ALLOWED_MISTRAL_MODELS.includes(model)
    ? model
    : 'mistral-small-3.1'

  try {
    const upstream = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: mistralModel,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data: unknown = await upstream.json()

    if (!upstream.ok) {
      const err = data as { error?: { message?: string } }
      res.status(upstream.status).json({
        error: 'Mistral API error',
        detail: err.error?.message ?? upstream.statusText,
      })
      return
    }

    // Normalise to Claude's { content: [{ type, text }] } shape
    const mistral = data as { choices?: Array<{ message?: { content?: string } }> }
    const text = mistral.choices?.[0]?.message?.content ?? ''
    res.json({ content: [{ type: 'text', text }] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach Mistral API', detail: message })
  }
})

// ── FMP proxy ─────────────────────────────────────────────────────────────────
app.get('/fmp/*', fmpLimiter, async (req: Request, res: Response) => {
  // Accept key from client header as fallback when server env key isn't set
  const clientKey = typeof req.headers['x-fmp-key'] === 'string' ? req.headers['x-fmp-key'] : ''
  const effectiveFmpKey = FMP_KEY || clientKey

  if (!effectiveFmpKey) {
    res.status(503).json({ error: 'No FMP API key available — enter your key via the Live Data button' })
    return
  }

  const fmpPath = req.params[0] as string

  // Allowlist valid FMP paths — prevents SSRF to arbitrary endpoints
  const ALLOWED_FMP_SEGMENTS = [
    'profile', 'ratios-ttm', 'income-statement',
    'cash-flow-statement', 'quote', 'stock',
  ]
  const basePath = fmpPath.split('/')[0]
  if (!ALLOWED_FMP_SEGMENTS.includes(basePath)) {
    res.status(400).json({ error: 'Invalid FMP endpoint' })
    return
  }

  const queryString = new URLSearchParams(req.query as Record<string, string>).toString()
  const sep = queryString ? '&' : '?'
  const url = `https://financialmodelingprep.com/api/v3/${fmpPath}${queryString ? `?${queryString}` : ''}${sep}apikey=${effectiveFmpKey}`

  const cacheKey = url

  const cached = getCached(cacheKey)
  if (cached !== null) {
    res.set('X-Cache', 'HIT')
    res.json(cached)
    return
  }

  try {
    const upstream = await fetch(url)
    const data: unknown = await upstream.json()

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'FMP API error', detail: upstream.statusText })
      return
    }

    setCache(cacheKey, data)
    res.set('X-Cache', 'MISS')
    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: 'Failed to reach FMP API', detail: message })
  }
})

// ── Error handler ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ error: message })
})
