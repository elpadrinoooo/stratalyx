import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { C, R } from '../constants/colors'
import { sanitizeTicker } from '../engine/utils'
import { useWindowWidth } from '../hooks/useWindowWidth'

// ── types ─────────────────────────────────────────────────────────────────────

interface Article {
  title:         string
  text:          string
  url:           string
  image:         string
  site:          string
  publishedDate: string
  tickers:       string[]
}

interface SavedArticle extends Article {
  id:           string
  savedAt:      number
  searchTicker: string | null   // which ticker query surfaced this article
  rewritten?:   string          // LLM-generated version (cached)
}

interface NewsPayload {
  articles: Article[]
  page:     number
  hasMore:  boolean
}

type SortMode = 'newest' | 'oldest' | 'ticker' | 'source'

interface SearchResult { symbol: string; name: string }

// ── localStorage library ──────────────────────────────────────────────────────

const STORAGE_KEY = 'stratalyx_news_library'

function loadLibrary(): SavedArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedArticle[]) : []
  } catch { return [] }
}

function saveLibrary(lib: SavedArticle[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lib)) } catch { /* quota */ }
}

function articleId(a: Article): string {
  // Stable ID from URL, fallback to title hash
  const src = a.url && a.url !== '#' ? a.url : a.title
  let h = 0
  for (let i = 0; i < src.length; i++) h = (Math.imul(31, h) + src.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

// ── placeholder articles ──────────────────────────────────────────────────────

const N = Date.now(), H = 3_600_000

const PLACEHOLDER_ARTICLES: Article[] = [
  { title: 'Federal Reserve Signals Cautious Approach to Rate Cuts Amid Inflation Data', text: 'Fed officials indicated they need more evidence that inflation is sustainably moving toward the 2% target before cutting interest rates. Recent CPI data showed stickier-than-expected core inflation, complicating the timeline for policy easing.', url: '#', image: '', site: 'Reuters', publishedDate: new Date(N - 2*H).toISOString(), tickers: ['SPY','TLT','GLD'] },
  { title: 'NVIDIA Beats Earnings Expectations as AI Chip Demand Surges', text: "NVIDIA's data center revenue hit a new record, driven by surging demand for H100 and Blackwell GPUs from cloud providers and AI startups. Management raised forward guidance above analyst consensus.", url: '#', image: '', site: 'Bloomberg', publishedDate: new Date(N - 5*H).toISOString(), tickers: ['NVDA','AMD','INTC'] },
  { title: "Apple's Services Revenue Hits All-Time High, Offsetting Hardware Slowdown", text: "Apple's services segment — including the App Store, Apple Music, and iCloud — posted record quarterly revenue, helping offset a decline in iPhone unit sales in key markets including China.", url: '#', image: '', site: 'CNBC', publishedDate: new Date(N - 8*H).toISOString(), tickers: ['AAPL'] },
  { title: 'Oil Prices Drop as OPEC+ Members Signal Production Flexibility', text: 'Crude oil futures fell after reports that several OPEC+ members may ease voluntary production cuts. A stronger US dollar and demand concerns from China added further downward pressure on energy prices.', url: '#', image: '', site: 'WSJ', publishedDate: new Date(N - 12*H).toISOString(), tickers: ['XOM','CVX','USO'] },
  { title: "Microsoft's Azure Cloud Growth Reaccelerates, Boosted by Copilot Adoption", text: "Azure revenue grew faster than expected, driven by enterprise adoption of Microsoft's AI Copilot suite. CEO Satya Nadella highlighted that every major product line is now AI-enabled.", url: '#', image: '', site: 'TechCrunch', publishedDate: new Date(N - 18*H).toISOString(), tickers: ['MSFT','GOOGL','AMZN'] },
  { title: 'US Jobs Report Comes in Stronger Than Expected, Wage Growth Cools', text: 'The economy added more jobs than economists forecast, with broad-based gains across sectors. Average hourly earnings growth slowed year-over-year, a development the Fed views as progress on inflation.', url: '#', image: '', site: 'Financial Times', publishedDate: new Date(N - 24*H).toISOString(), tickers: ['SPY','QQQ','DIA'] },
  { title: 'Tesla Reports Record Deliveries as Price Cuts Drive Volume', text: "Tesla's latest quarterly deliveries surpassed Wall Street expectations after aggressive price reductions globally. However, margins remained under pressure.", url: '#', image: '', site: 'Electrek', publishedDate: new Date(N - 30*H).toISOString(), tickers: ['TSLA'] },
  { title: "Berkshire Hathaway Increases Cash Reserves to Record $189 Billion", text: "Warren Buffett's Berkshire Hathaway continued selling equities and building cash, raising its cash pile to a record high. Buffett noted that attractive large-scale acquisitions remain scarce.", url: '#', image: '', site: 'Barrons', publishedDate: new Date(N - 36*H).toISOString(), tickers: ['BRK.B','BRK.A'] },
  { title: 'Amazon Web Services Wins $10B Pentagon Cloud Contract', text: "AWS secured a major multi-year government cloud contract. The deal is expected to accelerate AWS revenue growth and strengthen its government cloud position.", url: '#', image: '', site: 'Bloomberg', publishedDate: new Date(N - 48*H).toISOString(), tickers: ['AMZN','MSFT'] },
  { title: 'Alphabet Reports Strong Ad Revenue Recovery as Search Monetisation Improves', text: "Google's parent company beat revenue and earnings estimates, buoyed by a recovery in digital advertising spend. YouTube ad revenue also grew strongly.", url: '#', image: '', site: 'Reuters', publishedDate: new Date(N - 52*H).toISOString(), tickers: ['GOOGL','GOOG','META'] },
  { title: "JPMorgan Chase Raises Dividend After Passing Fed's Stress Test", text: "JPMorgan and several other major US banks announced dividend increases and buyback authorisations following the Federal Reserve's annual stress test.", url: '#', image: '', site: 'WSJ', publishedDate: new Date(N - 60*H).toISOString(), tickers: ['JPM','BAC','GS','MS'] },
  { title: 'Semiconductor Stocks Rally on Strong Taiwan Export Data and AI Optimism', text: "Chip stocks surged after Taiwan reported record semiconductor exports, fuelled by AI server builds. Analysts raised price targets on NVDA, AVGO, and ASML.", url: '#', image: '', site: 'CNBC', publishedDate: new Date(N - 72*H).toISOString(), tickers: ['NVDA','AVGO','ASML','TSM'] },
]

// ── helpers ───────────────────────────────────────────────────────────────────

function relDate(s: string): string {
  const hrs = (Date.now() - new Date(s).getTime()) / 3_600_000
  if (hrs < 1)  return `${Math.round(hrs * 60)}m ago`
  if (hrs < 24) return `${Math.round(hrs)}h ago`
  if (hrs < 48) return 'Yesterday'
  return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const SITE_COLORS: Record<string, string> = {
  Reuters: '#FF8000', Bloomberg: '#1DA1F2', CNBC: '#004B87', WSJ: '#003087',
  'Financial Times': '#FCD0B1', TechCrunch: '#0A7C59', Barrons: '#003087', Electrek: '#00C853',
  Yahoo: '#6001D2', SeekingAlpha: '#1C6EBB', Motley: '#E52D1E',
}

// ── article modal (LLM rewrite) ───────────────────────────────────────────────

function ArticleModal({
  article,
  onClose,
  onRewriteSave,
}: {
  article: SavedArticle
  onClose: () => void
  onRewriteSave: (id: string, rewritten: string) => void
}) {
  const [content, setContent]     = useState(article.rewritten ?? '')
  const [generating, setGenerating] = useState(!article.rewritten)

  useEffect(() => {
    if (article.rewritten) { setContent(article.rewritten); return }

    let cancelled = false
    setGenerating(true)

    fetch('/api/gemini', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `You are a financial analyst writing for Stratalyx, a professional investor research platform.

Rewrite the following financial news article in clear, analytical prose for investors. Preserve all key facts, companies, figures, and market context. Write in third person. Be concise (200–300 words).

End with exactly two lines:
"Key Takeaway: [one sharp sentence summarising the market implication]"
"Source: ${article.site}"

Headline: ${article.title}

Article text:
${article.text || '(No article body available — rewrite based on the headline only.)'}`,
      }),
    })
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((d: any) => {
        if (cancelled) return
        const text: string = d?.content?.[0]?.text ?? d?.error ?? 'Could not generate article.'
        setContent(text)
        setGenerating(false)
        onRewriteSave(article.id, text)
      })
      .catch(() => {
        if (cancelled) return
        setContent('Failed to generate article — check your Claude API key.')
        setGenerating(false)
      })

    return () => { cancelled = true }
  }, [article, onRewriteSave])

  // Format content: bold "Key Takeaway:" and "Source:" lines
  const paragraphs = content.split('\n').filter(l => l.trim())

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12,
        width: '100%', maxWidth: 680, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ background: C.accentM, border: `1px solid ${C.accentB}`, borderRadius: R.r99, color: C.accent, fontSize: 10, fontWeight: 700, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                AI Rewrite
              </span>
              <span style={{ color: C.t4, fontSize: 11 }}>{article.site} · {relDate(article.publishedDate)}</span>
              {article.tickers.slice(0,4).map(t => (
                <span key={t} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r99, color: C.t3, fontSize: 10, fontFamily: 'monospace', padding: '1px 6px' }}>{t}</span>
              ))}
            </div>
            <h2 style={{ margin: 0, color: C.t1, fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{article.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, color: C.t3, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px 9px', flexShrink: 0 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 20px' }}>
          {generating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '40px 0', color: C.t3 }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 13 }}>Generating analysis…</span>
            </div>
          ) : (
            <div style={{ fontSize: 14, lineHeight: 1.8, color: C.t2 }}>
              {paragraphs.map((p, i) => {
                const isKeyTakeaway = p.startsWith('Key Takeaway:')
                const isSource      = p.startsWith('Source:')
                if (isKeyTakeaway) return (
                  <div key={i} style={{ background: C.accentM, border: `1px solid ${C.accentB}`, borderRadius: R.r8, padding: '10px 14px', margin: '18px 0 10px', color: C.t1, fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>
                    <span style={{ color: C.accent, fontWeight: 700 }}>Key Takeaway: </span>
                    {p.replace('Key Takeaway:', '').trim()}
                  </div>
                )
                if (isSource) return (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <span style={{ color: C.t4, fontSize: 12 }}>{p}</span>
                    {article.url && article.url !== '#' && (
                      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                        Read original ↗
                      </a>
                    )}
                  </div>
                )
                return <p key={i} style={{ margin: '0 0 14px' }}>{p}</p>
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── news card ─────────────────────────────────────────────────────────────────

function NewsCard({
  article,
  placeholder,
  onCardClick,
  onTickerClick,
}: {
  article: SavedArticle
  placeholder: boolean
  onCardClick: (a: SavedArticle) => void
  onTickerClick: (t: string) => void
}) {
  const [imgErr, setImgErr] = useState(false)
  const visibleTickers = article.tickers.slice(0, 4)
  const extraCount     = article.tickers.length - visibleTickers.length
  const fallbackBg     = SITE_COLORS[article.site] ?? C.accentM

  return (
    <div
      onClick={() => onCardClick(article)}
      style={{
        background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        cursor: 'pointer', opacity: placeholder ? 0.8 : 1,
        transition: 'border-color .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.accentB; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px rgba(0,0,0,.2)` }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
    >
      {/* Image / fallback */}
      {article.image && !imgErr ? (
        <img src={article.image} alt="" onError={() => setImgErr(true)}
          style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block', flexShrink: 0 }} />
      ) : (
        <div style={{ width: '100%', height: 130, background: fallbackBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 26, fontWeight: 800, fontFamily: 'monospace', opacity: 0.4 }}>
            {article.site.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: C.t4, fontSize: 11, fontWeight: 600 }}>{article.site}</span>
          <span style={{ color: C.border }}>·</span>
          <span style={{ color: C.t4, fontSize: 11 }}>{relDate(article.publishedDate)}</span>
          {placeholder && <span style={{ marginLeft: 'auto', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r99, color: C.t4, fontSize: 9, fontWeight: 600, padding: '1px 6px', textTransform: 'uppercase' }}>Sample</span>}
          {article.rewritten && !placeholder && <span style={{ marginLeft: 'auto', color: C.accent, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>✦ Analysed</span>}
        </div>

        <div style={{ color: C.t1, fontSize: 13, fontWeight: 700, lineHeight: 1.4,
          display: '-webkit-box',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          WebkitLineClamp: 3 as any, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
          {article.title}
        </div>

        {article.text && (
          <p style={{ color: C.t3, fontSize: 11, lineHeight: 1.5, margin: 0,
            display: '-webkit-box',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            WebkitLineClamp: 2 as any, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
            {article.text}
          </p>
        )}

        {article.tickers.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 4 }}>
            {visibleTickers.map(t => (
              <button key={t}
                onClick={e => { e.stopPropagation(); !placeholder && onTickerClick(t) }}
                style={{ background: C.accentM, border: `1px solid ${C.accentB}`, borderRadius: R.r99, color: C.accent, cursor: placeholder ? 'default' : 'pointer', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, padding: '2px 7px' }}>
                {t}
              </button>
            ))}
            {extraCount > 0 && <span style={{ color: C.t4, fontSize: 10, padding: '2px 0' }}>+{extraCount}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, overflow: 'hidden' }}>
      <div style={{ height: 130, background: C.bg2 }} />
      <div style={{ padding: '11px 13px' }}>
        <div style={{ height: 10, background: C.bg2, borderRadius: R.r4, marginBottom: 8, width: '40%' }} />
        <div style={{ height: 13, background: C.bg2, borderRadius: R.r4, marginBottom: 5 }} />
        <div style={{ height: 13, background: C.bg2, borderRadius: R.r4, marginBottom: 5, width: '80%' }} />
        <div style={{ height: 10, background: C.bg2, borderRadius: R.r4, width: '60%' }} />
      </div>
    </div>
  )
}

// ── main screen ───────────────────────────────────────────────────────────────

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'ticker', label: 'Ticker A–Z' },
  { id: 'source', label: 'Source A–Z' },
]

// inject spinner keyframe once
if (typeof document !== 'undefined' && !document.getElementById('news-spin-style')) {
  const s = document.createElement('style')
  s.id = 'news-spin-style'
  s.textContent = '@keyframes spin { to { transform: rotate(360deg) } }'
  document.head.appendChild(s)
}

export function NewsScreen({ fmpKey: _fmpKey }: { fmpKey?: string }) {
  const width    = useWindowWidth()
  const isMobile = width <= 640
  const isTablet = width <= 960
  const cols     = isMobile ? 1 : isTablet ? 2 : 3

  // ── library (persistent) ──
  const [library, setLibrary]   = useState<SavedArticle[]>(() => loadLibrary())
  const [isPlaceholder, setIsPlaceholder] = useState(false)

  // Sync library → localStorage on every change (reliable alternative to calling
  // saveLibrary inside state updaters, which React may discard in Strict Mode)
  useEffect(() => {
    saveLibrary(library)
  }, [library])

  // Merge incoming articles into library (dedup by id)
  const mergeIntoLibrary = useCallback((articles: Article[], ticker: string | null) => {
    setLibrary(prev => {
      const existing = new Map(prev.map(a => [a.id, a]))
      for (const a of articles) {
        const id = articleId(a)
        if (!existing.has(id)) {
          existing.set(id, { ...a, id, savedAt: Date.now(), searchTicker: ticker })
        }
      }
      return Array.from(existing.values())
    })
  }, [])

  // ── fetch state ──
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]           = useState('')
  const [noKey, setNoKey]           = useState(false)
  const [hasMore, setHasMore]       = useState(true)
  const [page, setPage]             = useState(0)
  const [activeTicker, setActiveTicker] = useState<string | null>(null)

  // ── search / suggestions ──
  const [tickerInput, setTickerInput] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [showSugg, setShowSugg]       = useState(false)
  const searchRef                     = useRef<HTMLDivElement>(null)
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── sort / filter ──
  const [sortMode, setSortMode]         = useState<SortMode>('newest')
  const [filterTicker, setFilterTicker] = useState<string | null>(null)

  // ── article modal ──
  const [selectedArticle, setSelectedArticle] = useState<SavedArticle | null>(null)

  // ── fetch news ──────────────────────────────────────────────────────────────

  const showPlaceholders = useCallback((ticker: string | null) => {
    setIsPlaceholder(true)
    const placeholdersSaved = PLACEHOLDER_ARTICLES.map(a => ({
      ...a, id: articleId(a), savedAt: Date.now(), searchTicker: ticker,
    }))
    const filtered = ticker ? placeholdersSaved.filter(a => a.tickers.includes(ticker)) : placeholdersSaved
    mergeIntoLibrary(filtered.length > 0 ? filtered : placeholdersSaved, ticker)
  }, [mergeIntoLibrary])

  const fetchNews = useCallback(async (ticker: string | null, pg: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({ page: String(pg) })
      if (ticker) params.set('ticker', ticker)
      const res = await fetch(`/api/news?${params}`)

      if (res.status === 503) { setNoKey(true); showPlaceholders(ticker); setLoading(false); setLoadingMore(false); return }
      if (res.status === 403) { const d = await res.json() as { error?: string }; showPlaceholders(ticker); throw new Error(d.error ?? 'News unavailable') }
      if (!res.ok) throw new Error(`Failed to load news (${res.status})`)

      const data = await res.json() as NewsPayload
      setIsPlaceholder(false)
      mergeIntoLibrary(data.articles, ticker)
      setHasMore(data.hasMore)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load news')
      showPlaceholders(ticker)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [mergeIntoLibrary, showPlaceholders])

  useEffect(() => { fetchNews(null, 0, false) }, [fetchNews])

  // ── suggestions ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = tickerInput.trim()
    if (q.length < 2) { setSuggestions([]); setShowSugg(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = await res.json() as { results: SearchResult[] }
        setSuggestions(data.results)
        setShowSugg(data.results.length > 0)
      } catch { /* ignore */ }
    }, 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [tickerInput])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSugg(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const selectSuggestion = useCallback((s: SearchResult) => {
    setTickerInput(s.symbol); setSuggestions([]); setShowSugg(false)
    setActiveTicker(s.symbol); setFilterTicker(s.symbol); setPage(0)
    fetchNews(s.symbol, 0, false)
  }, [fetchNews])

  const handleSearch = useCallback(() => {
    const t = sanitizeTicker(tickerInput) || tickerInput.trim().toUpperCase()
    if (!t) return
    setSuggestions([]); setShowSugg(false)
    setActiveTicker(t); setFilterTicker(t); setPage(0)
    fetchNews(t, 0, false)
  }, [tickerInput, fetchNews])

  const handleClear = useCallback(() => {
    setActiveTicker(null); setFilterTicker(null); setTickerInput(''); setPage(0)
    fetchNews(null, 0, false)
  }, [fetchNews])

  const handleLoadMore = useCallback(() => {
    const next = page + 1; setPage(next)
    fetchNews(activeTicker, next, true)
  }, [page, activeTicker, fetchNews])

  // ── save LLM rewrite back to library ────────────────────────────────────────

  const handleRewriteSave = useCallback((id: string, rewritten: string) => {
    setLibrary(prev => prev.map(a => a.id === id ? { ...a, rewritten } : a))
    // Keep selectedArticle in sync so reopening the same modal shows cached content
    setSelectedArticle(prev => prev?.id === id ? { ...prev, rewritten } : prev)
  }, [])

  // ── sorted / filtered view ───────────────────────────────────────────────────

  const displayArticles = useMemo(() => {
    let list = filterTicker
      ? library.filter(a => a.tickers.includes(filterTicker))
      : library
    switch (sortMode) {
      case 'newest': list = [...list].sort((a, b) => b.savedAt - a.savedAt); break
      case 'oldest': list = [...list].sort((a, b) => a.savedAt - b.savedAt); break
      case 'ticker': list = [...list].sort((a, b) => (a.tickers[0] ?? '').localeCompare(b.tickers[0] ?? '')); break
      case 'source': list = [...list].sort((a, b) => a.site.localeCompare(b.site)); break
    }
    return list
  }, [library, sortMode, filterTicker])

  // Unique tickers in library for filter chips
  const knownTickers = useMemo(() => {
    const set = new Set<string>()
    library.forEach(a => a.tickers.forEach(t => set.add(t)))
    return Array.from(set).sort().slice(0, 20)
  }, [library])

  return (
    <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', color: C.t1, fontSize: 22, fontWeight: 800 }}>Financial News</h1>
          <div style={{ color: C.t3, fontSize: 13 }}>
            {library.length > 0
              ? `${library.length} article${library.length !== 1 ? 's' : ''} saved · click any to read AI analysis`
              : 'Search for a stock or browse the latest market news'}
          </div>
        </div>
        {library.length > 0 && (
          <button
            onClick={() => { setLibrary([]); setIsPlaceholder(false) }}
            style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: R.r8, color: C.t4, cursor: 'pointer', fontSize: 11, padding: '5px 10px' }}
          >
            Clear library
          </button>
        )}
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div ref={searchRef} style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <input
            value={tickerInput}
            onChange={e => { setTickerInput(e.target.value.toUpperCase()); setShowSugg(true) }}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); if (e.key === 'Escape') setShowSugg(false) }}
            onFocus={() => suggestions.length > 0 && setShowSugg(true)}
            placeholder="Search by ticker or company name…"
            style={{ width: '100%', boxSizing: 'border-box', background: C.bg0, border: `1px solid ${C.border}`, borderRadius: R.r8, color: C.t1, fontSize: 14, padding: '8px 12px', outline: 'none' }}
          />
          {showSugg && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r8, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,.3)' }}>
              {suggestions.map(s => (
                <div key={s.symbol} onMouseDown={() => selectSuggestion(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.bg2)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: C.accent, minWidth: 52 }}>{s.symbol}</span>
                  <span style={{ color: C.t3, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={handleSearch} disabled={!tickerInput.trim() || loading}
          style={{ background: C.accent, border: 'none', borderRadius: R.r8, color: '#fff', cursor: tickerInput.trim() && !loading ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, padding: '8px 18px', whiteSpace: 'nowrap', opacity: tickerInput.trim() && !loading ? 1 : 0.5 }}>
          {loading ? 'Loading…' : 'Search'}
        </button>
        {activeTicker && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.accentM, border: `1px solid ${C.accentB}`, borderRadius: R.r99, padding: '4px 10px', marginTop: 2 }}>
            <span style={{ color: C.accent, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{activeTicker}</span>
            <button onClick={handleClear} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        )}
      </div>

      {/* Status banners */}
      {(noKey || (isPlaceholder && !error)) && (
        <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 15 }}>🔑</span>
          <span style={{ color: C.t2, fontSize: 12, lineHeight: 1.5 }}>
            {noKey
              ? <><strong style={{ color: C.t1 }}>Finnhub API key required</strong> — Add <code>FINNHUB_API_KEY</code> to <code>.env</code> for live news. Showing sample articles.</>
              : <><strong style={{ color: C.t1 }}>Live news unavailable</strong> — Check your Finnhub API key in <code>.env</code>. Showing sample articles.</>}
          </span>
        </div>
      )}
      {error && <div style={{ color: 'var(--c-warn)', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8 }}>{error}</div>}

      {/* Sort + filter bar */}
      {displayArticles.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Sort buttons */}
          <div style={{ display: 'flex', gap: 3, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: 3 }}>
            {SORT_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setSortMode(o.id)}
                style={{ background: sortMode === o.id ? C.bg1 : 'transparent', border: sortMode === o.id ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: R.r6, color: sortMode === o.id ? C.t1 : C.t4, cursor: 'pointer', fontSize: 11, fontWeight: sortMode === o.id ? 700 : 400, padding: '4px 10px', whiteSpace: 'nowrap' }}>
                {o.label}
              </button>
            ))}
          </div>

          {/* Ticker filter chips */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {knownTickers.slice(0, 12).map(t => (
              <button key={t} onClick={() => setFilterTicker(filterTicker === t ? null : t)}
                style={{ background: filterTicker === t ? C.accentM : C.bg2, border: `1px solid ${filterTicker === t ? C.accentB : C.border}`, borderRadius: R.r99, color: filterTicker === t ? C.accent : C.t4, cursor: 'pointer', fontSize: 10, fontFamily: 'monospace', fontWeight: 600, padding: '3px 8px' }}>
                {t}
              </button>
            ))}
          </div>

          <span style={{ marginLeft: 'auto', color: C.t4, fontSize: 11 }}>{displayArticles.length} article{displayArticles.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && library.length === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Articles grid */}
      {displayArticles.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
            {displayArticles.map(a => (
              <NewsCard key={a.id} article={a} placeholder={isPlaceholder} onCardClick={setSelectedArticle} onTickerClick={t => { setFilterTicker(t); setActiveTicker(t); setPage(0); fetchNews(t, 0, false) }} />
            ))}
          </div>

          {!isPlaceholder && hasMore && !filterTicker && (
            <div style={{ textAlign: 'center', marginTop: 22 }}>
              <button onClick={handleLoadMore} disabled={loadingMore}
                style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, color: C.t2, cursor: loadingMore ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, padding: '8px 24px', opacity: loadingMore ? 0.6 : 1 }}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && displayArticles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📰</div>
          <div style={{ fontSize: 15, color: C.t2, fontWeight: 700, marginBottom: 6 }}>No articles found</div>
          <div style={{ fontSize: 13, color: C.t3 }}>{filterTicker ? `No saved articles for ${filterTicker}` : 'Search for a stock to get started'}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ color: C.t4, fontSize: 10, marginTop: 16, textAlign: 'right' }}>
        {isPlaceholder ? 'Sample articles · not real news' : 'News via Finnhub · AI analysis via Claude · Not investment advice'}
      </div>

      {/* Article modal */}
      {selectedArticle && (
        <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} onRewriteSave={handleRewriteSave} />
      )}
    </div>
  )
}
