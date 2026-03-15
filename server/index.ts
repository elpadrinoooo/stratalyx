import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'

const app = express()
const PORT = Number(process.env['PORT'] ?? 3001)
const ANTHROPIC_KEY = process.env['ANTHROPIC_API_KEY'] ?? ''
const GOOGLE_KEY = process.env['GOOGLE_API_KEY'] ?? ''
const FMP_KEY = process.env['FMP_API_KEY'] ?? ''

/** Locked model — clients cannot override this */
const LOCKED_MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 2000

// ── In-memory FMP cache (1 hour TTL) ─────────────────────────────────────────
interface CacheEntry {
  data: unknown
  ts: number
}
const fmpCache = new Map<string, CacheEntry>()
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

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env['NODE_ENV'] === 'production'
    ? false
    : 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}))

app.use(express.json({ limit: '1mb' }))

// ── Rate limiting (TD-04 P1) ──────────────────────────────────────────────────
// Generous limits for local/dev use, strict enough to block abuse in production.

/** 60 FMP data requests per minute per IP */
const fmpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many FMP requests — please try again in a minute' },
})

/** 20 LLM analysis requests per minute per IP */
const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many analysis requests — please try again in a minute' },
})

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    claude: Boolean(ANTHROPIC_KEY),
    gemini: Boolean(GOOGLE_KEY),
    fmp:    Boolean(FMP_KEY),
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

  // Allow client-selected model, default to gemini-2.0-flash
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

// ── FMP proxy ─────────────────────────────────────────────────────────────────
app.get('/fmp/*', fmpLimiter, async (req: Request, res: Response) => {
  if (!FMP_KEY) {
    res.status(503).json({ error: 'FMP_API_KEY not configured on server' })
    return
  }

  // Build FMP URL from the path after /fmp/
  const fmpPath = req.params[0] as string
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString()
  const sep = queryString ? '&' : '?'
  const url = `https://financialmodelingprep.com/api/v3/${fmpPath}${queryString ? `?${queryString}` : ''}${sep}apikey=${FMP_KEY}`

  const cacheKey = url

  // Cache hit
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

app.listen(PORT, () => {
  console.log(`Stratalyx proxy server running on :${PORT}`)
  console.log(`  Claude: ${ANTHROPIC_KEY ? '✓ configured' : '✗ missing ANTHROPIC_API_KEY'}`)
  console.log(`  Gemini: ${GOOGLE_KEY ? '✓ configured' : '✗ missing GOOGLE_API_KEY'}`)
  console.log(`  FMP:    ${FMP_KEY ? '✓ configured' : '✗ missing FMP_API_KEY'}`)
})
