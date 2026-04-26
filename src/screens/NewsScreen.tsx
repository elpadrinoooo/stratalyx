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
  searchTicker: string | null
  insight?:     string   // user-triggered AI insight (cached)
}

interface NewsPayload {
  articles: Article[]
  page:     number
  hasMore:  boolean
}

type SortMode = 'newest' | 'oldest' | 'ticker' | 'source'

interface SearchResult { symbol: string; name: string }

// ── localStorage ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'stratalyx_news_library'

function loadLibrary(): SavedArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    // migrate old 'rewritten' field → 'insight'
    return (JSON.parse(raw) as (SavedArticle & { rewritten?: string })[]).map(a => {
      if (a.rewritten && !a.insight) { a.insight = a.rewritten; delete a.rewritten }
      return a
    })
  } catch { return [] }
}

function saveLibrary(lib: SavedArticle[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lib)) } catch { /* quota */ }
}

function articleId(a: Article): string {
  const src = a.url && a.url !== '#' ? a.url : a.title
  let h = 0
  for (let i = 0; i < src.length; i++) h = (Math.imul(31, h) + src.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

// ── placeholders ──────────────────────────────────────────────────────────────

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

// ── inject keyframes once ─────────────────────────────────────────────────────

if (typeof document !== 'undefined') {
  if (!document.getElementById('news-spin-style')) {
    const s = document.createElement('style'); s.id = 'news-spin-style'
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}'
    document.head.appendChild(s)
  }
  if (!document.getElementById('news-panel-style')) {
    const s = document.createElement('style'); s.id = 'news-panel-style'
    s.textContent = `
      @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    `
    document.head.appendChild(s)
  }
}

// ── reader panel ──────────────────────────────────────────────────────────────

function ReaderPanel({
  article,
  related,
  onClose,
  onInsightSave,
  onRelatedClick,
  onTickerClick,
}: {
  article:       SavedArticle
  related:       SavedArticle[]
  onClose:       () => void
  onInsightSave: (id: string, insight: string) => void
  onRelatedClick:(a: SavedArticle) => void
  onTickerClick: (t: string) => void
}) {
  const width    = useWindowWidth()
  const isMobile = width <= 640
  const panelW   = isMobile ? '100vw' : Math.min(540, width * 0.48) + 'px'

  const [imgErr,     setImgErr]     = useState(false)
  const [insight,    setInsight]    = useState(article.insight ?? '')
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiDone,     setAiDone]     = useState(!!article.insight)
  const fallbackBg = SITE_COLORS[article.site] ?? C.accentM

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleGenerateInsight() {
    if (aiLoading || aiDone) return
    setAiLoading(true)
    fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `You are a senior financial analyst writing for Stratalyx investors.

Analyse the following news article and produce a structured investment brief. Be direct, data-driven, and concise.

Structure your response exactly as:
**Market Impact:** [2-3 sentences on price/sector implications]
**Key Risks:** [2-3 sentences on what could go wrong]
**Opportunity:** [1-2 sentences on who benefits]
**Key Takeaway:** [One sharp sentence]

Headline: ${article.title}
Article: ${article.text || '(No body — base on headline only.)'}
Source: ${article.site}`,
      }),
    })
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((d: any) => {
        const text: string = d?.content?.[0]?.text ?? d?.error ?? 'Could not generate insight.'
        setInsight(text)
        setAiDone(true)
        setAiLoading(false)
        onInsightSave(article.id, text)
      })
      .catch(() => {
        setInsight('Failed to generate insight. Please try again.')
        setAiLoading(false)
      })
  }

  // Render AI insight with bold **section:** headers
  function renderInsight(text: string) {
    return text.split('\n').filter(l => l.trim()).map((line, i) => {
      const boldMatch = line.match(/^\*\*(.+?):\*\*\s*(.*)/)
      if (boldMatch) return (
        <div key={i} style={{ marginBottom: 12 }}>
          <span style={{ color: C.t1, fontWeight: 700, fontSize: 13 }}>{boldMatch[1]}: </span>
          <span style={{ color: C.t2, fontSize: 13, lineHeight: 1.7 }}>{boldMatch[2]}</span>
        </div>
      )
      return <p key={i} style={{ color: C.t2, fontSize: 13, lineHeight: 1.7, margin: '0 0 10px' }}>{line}</p>
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)',
          animation: 'fadeIn .2s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: panelW, zIndex: 9999,
        background: C.bg1, borderLeft: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight .25s cubic-bezier(.4,0,.2,1)',
        boxShadow: '-8px 0 40px rgba(0,0,0,.35)',
      }}>

        {/* ── Top bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: SITE_COLORS[article.site] ? SITE_COLORS[article.site] + '22' : C.bg2, border: `1px solid ${SITE_COLORS[article.site] ? SITE_COLORS[article.site] + '44' : C.border}`, borderRadius: R.r6, color: SITE_COLORS[article.site] ?? C.t3, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
              {article.site}
            </span>
            <span style={{ color: C.t4, fontSize: 11 }}>{relDate(article.publishedDate)}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {article.url && article.url !== '#' && (
              <a href={article.url} target="_blank" rel="noopener noreferrer"
                style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r6, color: C.t3, fontSize: 11, fontWeight: 600, padding: '4px 10px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Source ↗
              </a>
            )}
            <button
              onClick={onClose}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.bg3; (e.currentTarget as HTMLButtonElement).style.color = C.t1 }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.bg2; (e.currentTarget as HTMLButtonElement).style.color = C.t3 }}
              style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r6, color: C.t3, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '4px 10px', transition: 'background .12s, color .12s' }}>
              ×
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Hero image */}
          {article.image && !imgErr ? (
            <img
              src={article.image}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: '100%', height: 160, background: fallbackBg + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: fallbackBg, fontSize: 40, fontWeight: 800, fontFamily: 'monospace', opacity: 0.3 }}>
                {article.site.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          <div style={{ padding: '18px 20px 24px' }}>

            {/* Ticker chips */}
            {article.tickers.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                {article.tickers.map(t => (
                  <button key={t}
                    onClick={() => { onTickerClick(t); onClose() }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.accentM }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.bg2 }}
                    style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r99, color: C.accent, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, padding: '3px 9px', transition: 'background .12s' }}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Headline */}
            <h2 style={{ margin: '0 0 14px', color: C.t1, fontSize: 18, fontWeight: 800, lineHeight: 1.4 }}>
              {article.title}
            </h2>

            {/* Summary */}
            {article.text && (
              <p style={{ margin: '0 0 20px', color: C.t2, fontSize: 14, lineHeight: 1.8 }}>
                {article.text}
              </p>
            )}

            {/* AI Insight section */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: C.t1, fontSize: 13, fontWeight: 700 }}>AI Insight</span>
                  {aiDone && (
                    <span style={{ background: C.accentM, border: `1px solid ${C.accentB}`, borderRadius: R.r99, color: C.accent, fontSize: 9, fontWeight: 700, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      ✦ Done
                    </span>
                  )}
                </div>
                {!aiDone && (
                  <button
                    onClick={handleGenerateInsight}
                    disabled={aiLoading}
                    onMouseEnter={e => { if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                    style={{
                      background: C.accent, border: 'none', borderRadius: R.r8,
                      color: 'var(--c-fg-on-accent, #fff)', cursor: aiLoading ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 700, padding: '6px 14px',
                      opacity: aiLoading ? 0.7 : 1, transition: 'opacity .15s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    {aiLoading
                      ? <><div style={{ width: 12, height: 12, border: `2px solid rgba(255,255,255,.3)`, borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Analysing…</>
                      : '✦ Generate Insight'}
                  </button>
                )}
              </div>

              {!insight && !aiLoading && (
                <p style={{ color: C.t4, fontSize: 12, fontStyle: 'italic', margin: 0 }}>
                  Click "Generate Insight" to get an AI-powered market analysis of this article.
                </p>
              )}

              {insight && (
                <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: '14px 16px' }}>
                  {renderInsight(insight)}
                </div>
              )}
            </div>

            {/* Related articles */}
            {related.length > 0 && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
                <div style={{ color: C.t3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                  Related · {related[0].tickers.find(t => article.tickers.includes(t))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {related.slice(0, 4).map(r => (
                    <div key={r.id}
                      onClick={() => onRelatedClick(r)}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = C.bg2 }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = C.bg0 }}
                      style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: R.r8, cursor: 'pointer', background: C.bg0, transition: 'background .12s' }}>
                      {r.image ? (
                        <img src={r.image} alt="" referrerPolicy="no-referrer"
                          style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: R.r6, flexShrink: 0 }}
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div style={{ width: 56, height: 42, borderRadius: R.r6, flexShrink: 0, background: (SITE_COLORS[r.site] ?? C.accentM) + '33', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: SITE_COLORS[r.site] ?? C.accent, fontSize: 13, fontWeight: 800, fontFamily: 'monospace' }}>{r.site.slice(0,2).toUpperCase()}</span>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: C.t1, fontSize: 12, fontWeight: 600, lineHeight: 1.4,
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          display: '-webkit-box', WebkitLineClamp: 2 as any, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                          {r.title}
                        </div>
                        <div style={{ color: C.t4, fontSize: 10, marginTop: 3 }}>{r.site} · {relDate(r.publishedDate)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── news card ─────────────────────────────────────────────────────────────────

function NewsCard({
  article,
  placeholder,
  onCardClick,
  onTickerClick,
}: {
  article:      SavedArticle
  placeholder:  boolean
  onCardClick:  (a: SavedArticle) => void
  onTickerClick:(t: string) => void
}) {
  const [imgErr, setImgErr] = useState(false)
  const visibleTickers = article.tickers.slice(0, 4)
  const extraCount     = article.tickers.length - visibleTickers.length
  const fallbackBg     = SITE_COLORS[article.site] ?? C.accentM

  return (
    <div
      onClick={() => onCardClick(article)}
      style={{
        background: C.bg1,
        border: `1px solid ${placeholder ? C.warnB : C.border}`,
        borderRadius: R.r12,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = placeholder ? C.warn : C.accentB; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,.2)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = placeholder ? C.warnB : C.border; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
    >
      {/* Thumbnail */}
      {article.image && !imgErr ? (
        <img
          src={article.image}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgErr(true)}
          style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block', flexShrink: 0, filter: placeholder ? 'grayscale(0.45)' : 'none' }}
        />
      ) : (
        <div style={{ width: '100%', height: 140, background: fallbackBg + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ color: fallbackBg, fontSize: 32, fontWeight: 800, fontFamily: 'monospace', opacity: 0.35 }}>
            {article.site.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {/* Demo-data ribbon — only on placeholder cards */}
      {placeholder && (
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 8, left: 8,
            background: C.warn, color: '#000',
            fontSize: 10, fontWeight: 800, letterSpacing: '.08em',
            padding: '3px 8px', borderRadius: R.r4,
            textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(0,0,0,.4)',
          }}
        >
          Demo
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: C.t4, fontSize: 11, fontWeight: 600 }}>{article.site}</span>
          <span style={{ color: C.border }}>·</span>
          <span style={{ color: C.t4, fontSize: 11 }}>{relDate(article.publishedDate)}</span>
          {article.insight && !placeholder && <span style={{ marginLeft: 'auto', color: C.accent, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>✦ Insight</span>}
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
                onClick={e => { e.stopPropagation(); if (!placeholder) onTickerClick(t) }}
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
      <div style={{ height: 140, background: C.bg2 }} />
      <div style={{ padding: '11px 13px' }}>
        <div style={{ height: 10, background: C.bg2, borderRadius: R.r4, marginBottom: 8, width: '40%' }} />
        <div style={{ height: 13, background: C.bg2, borderRadius: R.r4, marginBottom: 5 }} />
        <div style={{ height: 13, background: C.bg2, borderRadius: R.r4, marginBottom: 5, width: '80%' }} />
        <div style={{ height: 10, background: C.bg2, borderRadius: R.r4, width: '60%' }} />
      </div>
    </div>
  )
}

// ── sort options ──────────────────────────────────────────────────────────────

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'ticker', label: 'Ticker A–Z' },
  { id: 'source', label: 'Source A–Z' },
]

// ── main screen ───────────────────────────────────────────────────────────────

export function NewsScreen() {
  const width    = useWindowWidth()
  const isMobile = width <= 640
  const isTablet = width <= 960
  const cols     = isMobile ? 1 : isTablet ? 2 : 3

  // ── library ──
  const [library, setLibrary]         = useState<SavedArticle[]>(() => loadLibrary())
  const [isPlaceholder, setIsPlaceholder] = useState(false)

  useEffect(() => { saveLibrary(library) }, [library])

  const mergeIntoLibrary = useCallback((articles: Article[], ticker: string | null) => {
    setLibrary(prev => {
      const existing = new Map(prev.map(a => [a.id, a]))
      for (const a of articles) {
        const id = articleId(a)
        if (!existing.has(id)) existing.set(id, { ...a, id, savedAt: Date.now(), searchTicker: ticker })
      }
      return Array.from(existing.values())
    })
  }, [])

  // ── fetch state ──
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [error,        setError]        = useState('')
  const [noKey,        setNoKey]        = useState(false)
  const [hasMore,      setHasMore]      = useState(true)
  const [page,         setPage]         = useState(0)
  const [activeTicker, setActiveTicker] = useState<string | null>(null)

  // ── search ──
  const [tickerInput,  setTickerInput]  = useState('')
  const [suggestions,  setSuggestions]  = useState<SearchResult[]>([])
  const [showSugg,     setShowSugg]     = useState(false)
  const searchRef  = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── sort / filter ──
  const [sortMode,      setSortMode]      = useState<SortMode>('newest')
  const [filterTicker,  setFilterTicker]  = useState<string | null>(null)

  // ── reader panel ──
  const [selectedArticle, setSelectedArticle] = useState<SavedArticle | null>(null)

  // ── fetch ──────────────────────────────────────────────────────────────────

  const showPlaceholders = useCallback((ticker: string | null) => {
    setIsPlaceholder(true)
    const ps = PLACEHOLDER_ARTICLES.map(a => ({ ...a, id: articleId(a), savedAt: Date.now(), searchTicker: ticker }))
    const filtered = ticker ? ps.filter(a => a.tickers.includes(ticker)) : ps
    mergeIntoLibrary(filtered.length > 0 ? filtered : ps, ticker)
  }, [mergeIntoLibrary])

  const fetchNews = useCallback(async (ticker: string | null, pg: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true)
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

  // ── suggestions ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = tickerInput.trim()
    if (q.length < 2) { setSuggestions([]); setShowSugg(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = await res.json() as { results: SearchResult[] }
        setSuggestions(data.results); setShowSugg(data.results.length > 0)
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
    const next = page + 1; setPage(next); fetchNews(activeTicker, next, true)
  }, [page, activeTicker, fetchNews])

  // ── insight save ──
  const handleInsightSave = useCallback((id: string, insight: string) => {
    setLibrary(prev => prev.map(a => a.id === id ? { ...a, insight } : a))
    setSelectedArticle(prev => prev?.id === id ? { ...prev, insight } : prev)
  }, [])

  // ── display ──
  const displayArticles = useMemo(() => {
    let list = filterTicker ? library.filter(a => a.tickers.includes(filterTicker)) : library
    switch (sortMode) {
      case 'newest': list = [...list].sort((a, b) => b.savedAt - a.savedAt); break
      case 'oldest': list = [...list].sort((a, b) => a.savedAt - b.savedAt); break
      case 'ticker': list = [...list].sort((a, b) => (a.tickers[0] ?? '').localeCompare(b.tickers[0] ?? '')); break
      case 'source': list = [...list].sort((a, b) => a.site.localeCompare(b.site)); break
    }
    return list
  }, [library, sortMode, filterTicker])

  const knownTickers = useMemo(() => {
    const set = new Set<string>()
    library.forEach(a => a.tickers.forEach(t => set.add(t)))
    return Array.from(set).sort().slice(0, 20)
  }, [library])

  // Related articles for the reader panel
  const relatedArticles = useMemo(() => {
    if (!selectedArticle) return []
    return library
      .filter(a => a.id !== selectedArticle.id && a.tickers.some(t => selectedArticle.tickers.includes(t)))
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, 4)
  }, [selectedArticle, library])

  return (
    <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', color: C.t1, fontSize: 22, fontWeight: 800 }}>Financial News</h1>
          <div style={{ color: C.t3, fontSize: 13 }}>
            {library.length > 0
              ? `${library.length} article${library.length !== 1 ? 's' : ''} in library · click any to read`
              : 'Search for a stock or browse the latest market news'}
          </div>
        </div>
        {library.length > 0 && (
          <button
            onClick={() => { setLibrary([]); setIsPlaceholder(false) }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.lossB; (e.currentTarget as HTMLButtonElement).style.color = C.loss }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.t4 }}
            style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: R.r8, color: C.t4, cursor: 'pointer', fontSize: 11, padding: '5px 10px', transition: 'border-color .12s, color .12s' }}>
            Clear library
          </button>
        )}
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div ref={searchRef} style={{ position: 'relative', flex: 1, minWidth: isMobile ? 0 : 200 }}>
          <input
            value={tickerInput}
            onChange={e => { setTickerInput(e.target.value.toUpperCase()); setShowSugg(true) }}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); if (e.key === 'Escape') setShowSugg(false) }}
            onFocus={e => { if (suggestions.length > 0) setShowSugg(true); (e.target as HTMLInputElement).style.borderColor = C.accent }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = C.border }}
            placeholder="Search by ticker or company name…"
            style={{ width: '100%', boxSizing: 'border-box', background: C.bg0, border: `1px solid ${C.border}`, borderRadius: R.r8, color: C.t1, fontSize: 14, padding: '8px 12px', outline: 'none', transition: 'border-color .15s' }}
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
          style={{ background: C.accent, border: 'none', borderRadius: R.r8, color: 'var(--c-fg-on-accent, #fff)', cursor: tickerInput.trim() && !loading ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, padding: '8px 18px', whiteSpace: 'nowrap', opacity: tickerInput.trim() && !loading ? 1 : 0.5 }}>
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
        <div style={{ background: C.warnBg, border: `1px solid ${C.warnB}`, borderRadius: R.r8, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15 }}>🔑</span>
          <span style={{ color: C.t2, fontSize: 12, lineHeight: 1.5, flex: 1, minWidth: 240 }}>
            {noKey
              ? <><strong style={{ color: C.warn }}>Demo mode</strong> — these are sample articles, not live news. Add a <code>FINNHUB_API_KEY</code> to your <code>.env</code> to see real headlines.</>
              : <><strong style={{ color: C.warn }}>Live news unavailable</strong> — showing sample articles. Check your <code>FINNHUB_API_KEY</code> in <code>.env</code>.</>}
          </span>
          <a
            href="https://finnhub.io/register"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: C.warn,
              color: '#000',
              border: 'none',
              borderRadius: R.r6,
              fontSize: 11,
              fontWeight: 700,
              padding: '5px 11px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              letterSpacing: '.02em',
            }}
          >
            Get free key →
          </a>
        </div>
      )}
      {error && <div style={{ color: 'var(--c-warn)', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8 }}>{error}</div>}

      {/* Sort + filter bar */}
      {displayArticles.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 3, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: 3 }}>
            {SORT_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setSortMode(o.id)}
                style={{ background: sortMode === o.id ? C.bg1 : 'transparent', border: sortMode === o.id ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: R.r6, color: sortMode === o.id ? C.t1 : C.t4, cursor: 'pointer', fontSize: 11, fontWeight: sortMode === o.id ? 700 : 400, padding: '4px 10px', whiteSpace: 'nowrap' }}>
                {o.label}
              </button>
            ))}
          </div>
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

      {/* Skeletons */}
      {loading && library.length === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Grid */}
      {displayArticles.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
            {displayArticles.map(a => (
              <NewsCard key={a.id} article={a} placeholder={isPlaceholder} onCardClick={setSelectedArticle}
                onTickerClick={t => { setFilterTicker(t); setActiveTicker(t); setPage(0); fetchNews(t, 0, false) }} />
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

      {/* Empty */}
      {!loading && displayArticles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📰</div>
          <div style={{ fontSize: 15, color: C.t2, fontWeight: 700, marginBottom: 6 }}>No articles found</div>
          <div style={{ fontSize: 13, color: C.t3 }}>{filterTicker ? `No saved articles for ${filterTicker}` : 'Search for a stock to get started'}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ color: C.t4, fontSize: 10, marginTop: 16, textAlign: 'right' }}>
        {isPlaceholder ? 'Sample articles · not real news' : 'News via Finnhub · AI insights via Gemini · Not investment advice'}
      </div>

      {/* Reader panel */}
      {selectedArticle && (
        <ReaderPanel
          article={selectedArticle}
          related={relatedArticles}
          onClose={() => setSelectedArticle(null)}
          onInsightSave={handleInsightSave}
          onRelatedClick={setSelectedArticle}
          onTickerClick={t => { setFilterTicker(t); setActiveTicker(t); setPage(0); fetchNews(t, 0, false) }}
        />
      )}
    </div>
  )
}
