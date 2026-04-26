import React, { useEffect, useState } from 'react'
import { RotateCw, ArrowRight } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import { C, R } from '../constants/colors'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { useApp } from '../state/context'
import { FirstAnalysisCTA } from '../components/FirstAnalysisCTA'
import { Button } from '../components/Button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Mover {
  symbol:            string
  name:              string
  price:             number
  change:            number
  changesPercentage: number
  exchange:          string
}

interface MarketMoversPayload {
  gainers: Mover[]
  losers:  Mover[]
}

interface IndexCardData {
  ticker:        string
  label:         string
  points:        { t: number; p: number }[]
  price:         number
  previousClose: number
  changePct:     number
  changeDollar:  number
  loading:       boolean
  error:         string
}

interface Props {
  fmpKey:         string
  onOpenFmpModal: () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INDEX_CARDS = [
  { ticker: 'DIA', label: 'DOW',          subtitle: 'Dow Jones' },
  { ticker: 'QQQ', label: 'NASDAQ',       subtitle: 'Nasdaq 100' },
  { ticker: 'SPY', label: 'S&P 500',      subtitle: 'S&P 500' },
  { ticker: 'IWM', label: 'Russell 2000', subtitle: 'Small Cap' },
]

const fmtPct = (v: number) =>
  (v >= 0 ? '+' : '') + v.toFixed(2) + '%'

const fmtDollar = (v: number) =>
  (v >= 0 ? '+' : '') + '$' + Math.abs(v).toFixed(2)

// ── Market status ─────────────────────────────────────────────────────────────

type MarketStatus = { label: string; color: string; open: boolean }

function getMarketStatus(): MarketStatus {
  const etNow  = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day    = etNow.getDay()                                    // 0=Sun 6=Sat
  const mins   = etNow.getHours() * 60 + etNow.getMinutes()       // minutes since midnight ET
  if (day === 0 || day === 6)              return { label: 'Weekend — Closed',  color: C.t4,   open: false }
  if (mins >= 570  && mins < 960)          return { label: 'Market Open',        color: C.gain, open: true  } // 9:30–16:00
  if (mins >= 240  && mins < 570)          return { label: 'Pre-Market',         color: C.warn, open: false } // 4:00–9:30
  if (mins >= 960  && mins < 1200)         return { label: 'After Hours',        color: C.warn, open: false } // 16:00–20:00
  return                                          { label: 'Market Closed',      color: C.t4,   open: false }
}

function fmtAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 10)   return 'just now'
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AdPlaceholder({ width, height }: { width: number | string; height: number }) {
  return (
    <div style={{
      width, height, flexShrink: 0,
      border: `1px dashed ${C.border}`,
      borderRadius: R.r8,
      background: C.bg2,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: C.t4, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Advertisement
      </span>
    </div>
  )
}

function SkeletonIndexCard() {
  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ background: C.bg2, borderRadius: 4, width: 70, height: 11 }} />
      <div style={{ background: C.bg2, borderRadius: 4, width: 50, height: 10 }} />
      <div style={{ background: C.bg2, borderRadius: 4, width: 100, height: 24 }} />
      <div style={{ background: C.bg2, borderRadius: 4, width: 80, height: 16 }} />
      <div style={{ background: C.bg2, borderRadius: R.r6, width: '100%', height: 72, marginTop: 2 }} />
    </div>
  )
}

function IndexMiniCard({ card }: { card: IndexCardData }) {
  const [hovered, setHovered] = useState(false)
  const up         = card.changePct >= 0
  const strokeColor = up ? C.gain : C.loss
  const fillId     = `grad-${card.ticker}`
  const hasData    = card.points.length > 1

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.bg1,
        border: `1px solid ${hovered ? C.accentB : C.border}`,
        borderRadius: R.r12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,.15)' : 'none',
      }}
    >
      {/* Label + ETF ticker */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ color: C.t1, fontSize: 13, fontWeight: 700 }}>{card.label}</span>
        <span style={{ color: C.t4, fontSize: 10, fontFamily: C.mono }}>{card.ticker}</span>
      </div>

      {card.error ? (
        <span style={{ color: C.t4, fontSize: 12, marginTop: 4 }}>Unavailable</span>
      ) : (
        <>
          {/* Price */}
          <span style={{ color: C.t1, fontSize: 22, fontWeight: 700, fontFamily: C.mono, lineHeight: 1.1, marginTop: 2 }}>
            {card.price > 0 ? `$${card.price.toFixed(2)}` : '…'}
          </span>

          {/* Change row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{
              background: up ? C.gainBg : C.lossBg,
              color:      up ? C.gain   : C.loss,
              border:    `1px solid ${up ? C.gainB : C.lossB}`,
              borderRadius: R.r99,
              fontSize: 11, fontWeight: 700,
              padding: '2px 7px',
              fontFamily: C.mono,
            }}>
              {fmtPct(card.changePct)}
            </span>
            {card.previousClose > 0 && (
              <span style={{ color: up ? C.gain : C.loss, fontSize: 11, fontFamily: C.mono }}>
                {fmtDollar(card.changeDollar)}
              </span>
            )}
          </div>
        </>
      )}

      {/* Sparkline */}
      {hasData && !card.error && (
        <div style={{ marginTop: 6 }}>
          <ResponsiveContainer width="100%" height={72}>
            <AreaChart data={card.points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="p"
                stroke={strokeColor}
                strokeWidth={1.5}
                fill={`url(#${fillId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function SkeletonMoverRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: R.r6 }}>
      <div style={{ background: C.bg2, borderRadius: 3, width: 44, height: 13, flexShrink: 0 }} />
      <div style={{ background: C.bg2, borderRadius: 3, flex: 1, height: 11 }} />
      <div style={{ background: C.bg2, borderRadius: 3, width: 50, height: 13, flexShrink: 0 }} />
      <div style={{ background: C.bg2, borderRadius: 3, width: 50, height: 13, flexShrink: 0 }} />
      <div style={{ background: C.bg2, borderRadius: 3, width: 40, height: 11, flexShrink: 0 }} />
    </div>
  )
}

function MoverRow({ mover, isGainer, onTickerClick }: {
  mover: Mover
  isGainer: boolean
  onTickerClick: (s: string) => void
}) {
  const [hov, setHov] = useState(false)
  const pct = mover.changesPercentage

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 8px', borderRadius: R.r6,
        background: hov ? C.bg2 : 'transparent',
        transition: 'background .12s',
      }}
    >
      <button
        onClick={() => onTickerClick(mover.symbol)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: C.accent, fontFamily: C.mono, fontWeight: 700,
          fontSize: 12, padding: 0, width: 52, textAlign: 'left', flexShrink: 0,
        }}
      >
        {mover.symbol}
      </button>
      <span style={{ color: C.t3, fontSize: 11, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {mover.name}
      </span>
      <span style={{ color: C.t1, fontFamily: C.mono, fontSize: 12, flexShrink: 0, width: 60, textAlign: 'right' }}>
        ${mover.price.toFixed(2)}
      </span>
      <span style={{
        color: isGainer ? C.gain : C.loss,
        fontFamily: C.mono, fontSize: 12, fontWeight: 600,
        flexShrink: 0, width: 60, textAlign: 'right',
      }}>
        {fmtPct(pct)}
      </span>
      <span style={{ color: C.t4, fontSize: 10, flexShrink: 0, width: 52, textAlign: 'right', fontFamily: C.mono }}>
        {mover.exchange}
      </span>
    </div>
  )
}

function MoversTable({ title, movers, isGainer, loading, onTickerClick }: {
  title:         string
  movers:        Mover[]
  isGainer:      boolean
  loading:       boolean
  onTickerClick: (s: string) => void
}) {
  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, overflow: 'hidden', flex: 1, minWidth: 0 }}>
      {/* Header */}
      <div style={{ padding: '11px 14px 9px', borderBottom: `1px solid ${C.border44}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: C.t1, fontSize: 13, fontWeight: 700 }}>{title}</span>
        <span style={{
          background: isGainer ? C.gainBg : C.lossBg,
          color:      isGainer ? C.gain   : C.loss,
          border:    `1px solid ${isGainer ? C.gainB : C.lossB}`,
          borderRadius: R.r99, fontSize: 10, fontWeight: 700, padding: '1px 6px',
        }}>
          Top 10
        </span>
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderBottom: `1px solid ${C.border44}` }}>
        <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', width: 52, flexShrink: 0 }}>Ticker</span>
        <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', flex: 1 }}>Company</span>
        <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', width: 60, textAlign: 'right', flexShrink: 0 }}>Price</span>
        <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', width: 60, textAlign: 'right', flexShrink: 0 }}>Chg %</span>
        <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', width: 52, textAlign: 'right', flexShrink: 0 }}>Exch</span>
      </div>

      {/* Rows */}
      <div style={{ padding: '4px 0 6px' }}>
        {loading ? (
          Array.from({ length: 10 }, (_, i) => <SkeletonMoverRow key={i} />)
        ) : movers.length === 0 ? (
          <div style={{ color: C.t4, fontSize: 13, textAlign: 'center', padding: '28px 16px' }}>
            No data available
          </div>
        ) : (
          movers.map(m => (
            <MoverRow key={m.symbol} mover={m} isGainer={isGainer} onTickerClick={onTickerClick} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export function MarketsScreen({ fmpKey, onOpenFmpModal }: Props) {
  const { dispatch }  = useApp()
  const width         = useWindowWidth()
  const isMobile      = width <= 640
  const isTablet      = width <= 960

  const [indexCards, setIndexCards] = useState<IndexCardData[]>(
    INDEX_CARDS.map(c => ({ ...c, subtitle: '', points: [], price: 0, previousClose: 0, changePct: 0, changeDollar: 0, loading: true, error: '' }))
  )
  const [movers,        setMovers]        = useState<MarketMoversPayload | null>(null)
  const [moversLoading, setMoversLoading] = useState(true)
  const [moversError,   setMoversError]   = useState('')
  const [noFmpKey,      setNoFmpKey]      = useState(false)
  const [refreshKey,    setRefreshKey]    = useState(0)
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null)
  const [, forceRender] = useState(0)

  // Tick every 30s so "X ago" stays current
  useEffect(() => {
    const t = setInterval(() => forceRender(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  // 4 parallel index sparkline fetches — reset to loading state when refresh fires.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndexCards(INDEX_CARDS.map(c => ({
      ...c, subtitle: '', points: [], price: 0, previousClose: 0, changePct: 0, changeDollar: 0, loading: true, error: '',
    })))

    INDEX_CARDS.forEach((card, i) => {
      fetch(`/api/history/${card.ticker}?range=1d`)
        .then(r => r.ok ? r.json() as Promise<{ points: { t: number; p: number }[]; previousClose: number }> : Promise.reject(r.status))
        .then(data => {
          const pts   = data.points
          const last  = pts[pts.length - 1]?.p ?? 0
          const prev  = data.previousClose > 0 ? data.previousClose : (pts[0]?.p ?? 0)
          const changePct    = prev > 0 ? ((last - prev) / prev) * 100 : 0
          const changeDollar = last - prev
          setIndexCards(prev2 => prev2.map((c, idx) =>
            idx === i ? { ...c, points: pts, price: last, previousClose: data.previousClose, changePct, changeDollar, loading: false } : c
          ))
        })
        .catch(() =>
          setIndexCards(prev2 => prev2.map((c, idx) =>
            idx === i ? { ...c, loading: false, error: 'Unavailable' } : c
          ))
        )
    })
   
  }, [refreshKey])

  // Market movers — reset state on refresh, fetch, then settle.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMoversLoading(true)
    setNoFmpKey(false)
    setMoversError('')
    const headers: HeadersInit = fmpKey ? { 'x-fmp-key': fmpKey } : {}
    fetch('/api/market-movers', { headers })
      .then(r => {
        if (r.status === 503) { setNoFmpKey(true); setMoversLoading(false); return null }
        if (!r.ok) throw new Error(`Failed to load market movers (${r.status})`)
        return r.json() as Promise<MarketMoversPayload>
      })
      .then(data => {
        if (data) { setMovers(data); setMoversLoading(false); setLastUpdated(new Date()) }
      })
      .catch(e => { setMoversError(e instanceof Error ? e.message : String(e)); setMoversLoading(false) })
  }, [fmpKey, refreshKey])

  const openAnalyzer = (ticker: string) => dispatch({ type: 'OPEN_MODAL', payload: ticker })
  const status       = getMarketStatus()
  const allCardsLoaded = indexCards.every(c => !c.loading)

  return (
    <div style={{ padding: isMobile ? '14px' : '20px 24px', maxWidth: 1440, margin: '0 auto' }}>

      <FirstAnalysisCTA />

      {/* ── Page heading ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.t1 }}>
              Markets Overview
            </h1>
            {/* Market status pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: status.color + '18',
              border: `1px solid ${status.color}44`,
              borderRadius: R.r99,
              padding: '3px 9px',
              flexShrink: 0,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: status.color, flexShrink: 0,
                boxShadow: status.open ? `0 0 0 3px ${status.color}33` : 'none',
              }} />
              <span style={{ color: status.color, fontSize: 11, fontWeight: 600 }}>{status.label}</span>
            </div>
          </div>
          <p style={{ margin: 0, color: C.t3, fontSize: 13 }}>
            US equity snapshot · index ETF proxies via Yahoo Finance
            {lastUpdated && (
              <span style={{ color: C.t4 }}> · updated {fmtAgo(lastUpdated)}</span>
            )}
          </p>
        </div>

        {/* Header actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => dispatch({ type: 'OPEN_MODAL', payload: '' })}
            aria-label="Analyze a stock"
            icon={<ArrowRight size={14} strokeWidth={2.2} aria-hidden />}
            iconPosition="right"
          >
            Analyze a stock
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={!allCardsLoaded}
            icon={<RotateCw size={14} strokeWidth={2} aria-hidden />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Index mini-cards ─────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 20,
      }}>
        {indexCards.map((card, i) =>
          card.loading
            ? <SkeletonIndexCard key={card.ticker + i} />
            : <IndexMiniCard key={card.ticker} card={card} />
        )}
      </div>

      {/* ── Leaderboard ad — desktop only ────────────────────────────────── */}
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <AdPlaceholder width={728} height={90} />
        </div>
      )}

      {/* ── No-key banner ────────────────────────────────────────────────── */}
      {noFmpKey && (
        <div style={{
          background: C.warnBg, border: `1px solid ${C.warnB}`,
          borderRadius: R.r10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ color: C.warn, fontSize: 13 }}>
            An FMP API key is required to load Top Gainers and Top Losers.
          </span>
          <button
            onClick={onOpenFmpModal}
            style={{
              background: C.accent, color: 'var(--c-fg-on-accent, #fff)',
              border: 'none', borderRadius: R.r8,
              padding: '6px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            Add API Key
          </button>
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {moversError && !noFmpKey && (
        <div style={{
          background: C.lossBg, border: `1px solid ${C.lossB}`,
          borderRadius: R.r8, padding: '10px 14px', marginBottom: 16,
          color: C.loss, fontSize: 13,
        }}>
          {moversError}
        </div>
      )}

      {/* ── Gainers + Losers + side ad ───────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
          <MoversTable
            title="Top Gainers"
            movers={movers?.gainers ?? []}
            isGainer={true}
            loading={moversLoading && !noFmpKey}
            onTickerClick={openAnalyzer}
          />
          <MoversTable
            title="Top Losers"
            movers={movers?.losers ?? []}
            isGainer={false}
            loading={moversLoading && !noFmpKey}
            onTickerClick={openAnalyzer}
          />
        </div>

        {/* Rectangle ad — wide desktop only */}
        {!isTablet && <AdPlaceholder width={300} height={250} />}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{ color: C.t4, fontSize: 10, textAlign: 'right', marginTop: 24, lineHeight: 1.8 }}>
        Index data via Yahoo Finance (DIA · QQQ · SPY · IWM as proxies) · Movers via Financial Modeling Prep
        <br />Market hours are US Eastern Time · Not investment advice
      </div>

    </div>
  )
}
