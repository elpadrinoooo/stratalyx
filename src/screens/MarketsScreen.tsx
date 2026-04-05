import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area,
} from 'recharts'
import { C, R } from '../constants/colors'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { useApp } from '../state/context'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Mover {
  symbol:            string
  name:              string
  price:             number
  change:            number
  changesPercentage: number
  volume:            number
}

interface MarketMoversPayload {
  gainers: Mover[]
  losers:  Mover[]
}

interface IndexCardData {
  ticker:    string
  label:     string
  points:    { t: number; p: number }[]
  price:     number
  changePct: number
  loading:   boolean
  error:     string
}

interface Props {
  fmpKey:          string
  onOpenFmpModal:  () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INDEX_CARDS = [
  { ticker: 'DIA', label: 'DOW' },
  { ticker: 'QQQ', label: 'NASDAQ' },
  { ticker: 'SPY', label: 'S&P 500' },
  { ticker: 'IWM', label: 'Russell 2000' },
]

const fmtVol = (v: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

const fmtPct = (v: number) =>
  (v >= 0 ? '+' : '') + v.toFixed(2) + '%'

// ── Sub-components ────────────────────────────────────────────────────────────

function AdPlaceholder({ width, height }: { width: number | string; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        border: `1px dashed ${C.border}`,
        borderRadius: R.r8,
        background: C.bg2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ color: C.t4, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Advertisement
      </span>
    </div>
  )
}

function SkeletonIndexCard() {
  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ background: C.bg2, borderRadius: 4, width: 60, height: 11 }} />
      <div style={{ background: C.bg2, borderRadius: 4, width: 90, height: 22 }} />
      <div style={{ background: C.bg2, borderRadius: 4, width: 50, height: 18 }} />
      <div style={{ background: C.bg2, borderRadius: R.r6, width: '100%', height: 64, marginTop: 4 }} />
    </div>
  )
}

function IndexMiniCard({ card }: { card: IndexCardData }) {
  const up = card.changePct >= 0
  const strokeColor = up ? C.gain : C.loss
  const fillId = `grad-${card.ticker}`

  return (
    <div
      style={{
        background: C.bg1,
        border: `1px solid ${C.border}`,
        borderRadius: R.r12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span style={{ color: C.t3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {card.label}
      </span>
      <span style={{ color: C.t1, fontSize: 20, fontWeight: 700, fontFamily: C.mono, lineHeight: 1.2 }}>
        {card.error ? '—' : card.price > 0 ? `$${card.price.toFixed(2)}` : '…'}
      </span>
      {!card.error && (
        <span style={{
          display: 'inline-block',
          background: up ? C.gainBg : C.lossBg,
          color: up ? C.gain : C.loss,
          border: `1px solid ${up ? C.gainB : C.lossB}`,
          borderRadius: R.r99,
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 7px',
          alignSelf: 'flex-start',
        }}>
          {fmtPct(card.changePct)}
        </span>
      )}
      {card.error && <span style={{ color: C.t4, fontSize: 11 }}>Unavailable</span>}
      {card.points.length > 1 && (
        <div style={{ marginTop: 6 }}>
          <ResponsiveContainer width="100%" height={64}>
            <AreaChart data={card.points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.25} />
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.border44}` }}>
      <div style={{ background: C.bg2, borderRadius: 3, width: 44, height: 13 }} />
      <div style={{ background: C.bg2, borderRadius: 3, flex: 1, height: 11 }} />
      <div style={{ background: C.bg2, borderRadius: 3, width: 50, height: 13 }} />
      <div style={{ background: C.bg2, borderRadius: 3, width: 44, height: 13 }} />
      <div style={{ background: C.bg2, borderRadius: 3, width: 44, height: 11 }} />
    </div>
  )
}

function MoverRow({ mover, isGainer, onTickerClick }: { mover: Mover; isGainer: boolean; onTickerClick: (s: string) => void }) {
  const [hovered, setHovered] = useState(false)
  const pct = mover.changesPercentage

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 8px',
        borderRadius: R.r6,
        background: hovered ? C.bg2 : 'transparent',
        cursor: 'default',
        transition: 'background .12s',
      }}
    >
      <button
        onClick={() => onTickerClick(mover.symbol)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: C.accent, fontFamily: C.mono, fontWeight: 700,
          fontSize: 12, padding: 0, width: 50, textAlign: 'left', flexShrink: 0,
        }}
      >
        {mover.symbol}
      </button>
      <span style={{ color: C.t3, fontSize: 11, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {mover.name}
      </span>
      <span style={{ color: C.t1, fontFamily: C.mono, fontSize: 12, flexShrink: 0, width: 58, textAlign: 'right' }}>
        ${mover.price.toFixed(2)}
      </span>
      <span style={{
        color: isGainer ? C.gain : C.loss,
        fontFamily: C.mono, fontSize: 12, fontWeight: 600,
        flexShrink: 0, width: 58, textAlign: 'right',
      }}>
        {fmtPct(pct)}
      </span>
      <span style={{ color: C.t4, fontSize: 11, flexShrink: 0, width: 44, textAlign: 'right' }}>
        {fmtVol(mover.volume)}
      </span>
    </div>
  )
}

function MoversTable({ title, movers, isGainer, loading, onTickerClick }: {
  title:          string
  movers:         Mover[]
  isGainer:       boolean
  loading:        boolean
  onTickerClick:  (s: string) => void
}) {
  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, overflow: 'hidden', flex: 1, minWidth: 0 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${C.border44}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: C.t1, fontSize: 13, fontWeight: 700 }}>{title}</span>
        <span style={{
          background: isGainer ? C.gainBg : C.lossBg,
          color:      isGainer ? C.gain   : C.loss,
          border:    `1px solid ${isGainer ? C.gainB : C.lossB}`,
          borderRadius: R.r99,
          fontSize: 10, fontWeight: 700,
          padding: '1px 6px',
        }}>
          Top 10
        </span>
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderBottom: `1px solid ${C.border44}` }}>
        <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', width: 50, flexShrink: 0 }}>Ticker</span>
        <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', flex: 1 }}>Company</span>
        <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', width: 58, textAlign: 'right', flexShrink: 0 }}>Price</span>
        <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', width: 58, textAlign: 'right', flexShrink: 0 }}>Chg%</span>
        <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', width: 44, textAlign: 'right', flexShrink: 0 }}>Vol</span>
      </div>

      {/* Rows */}
      <div style={{ padding: '4px 8px 8px' }}>
        {loading
          ? Array.from({ length: 10 }, (_, i) => <SkeletonMoverRow key={i} />)
          : movers.map(m => (
              <MoverRow
                key={m.symbol}
                mover={m}
                isGainer={isGainer}
                onTickerClick={onTickerClick}
              />
            ))
        }
      </div>
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export function MarketsScreen({ fmpKey, onOpenFmpModal }: Props) {
  const { dispatch } = useApp()
  const width    = useWindowWidth()
  const isMobile = width <= 640
  const isTablet = width <= 960

  const [indexCards, setIndexCards] = useState<IndexCardData[]>(
    INDEX_CARDS.map(c => ({ ...c, points: [], price: 0, changePct: 0, loading: true, error: '' }))
  )
  const [movers,        setMovers]        = useState<MarketMoversPayload | null>(null)
  const [moversLoading, setMoversLoading] = useState(true)
  const [moversError,   setMoversError]   = useState('')
  const [noFmpKey,      setNoFmpKey]      = useState(false)

  // 4 parallel index sparkline fetches
  useEffect(() => {
    INDEX_CARDS.forEach((card, i) => {
      fetch(`/api/history/${card.ticker}?range=1d`)
        .then(r => r.ok ? r.json() as Promise<{ points: { t: number; p: number }[] }> : Promise.reject(r.status))
        .then(data => {
          const pts   = data.points
          const first = pts[0]?.p ?? 0
          const last  = pts[pts.length - 1]?.p ?? 0
          const changePct = first > 0 ? ((last - first) / first) * 100 : 0
          setIndexCards(prev => prev.map((c, idx) =>
            idx === i ? { ...c, points: pts, price: last, changePct, loading: false } : c
          ))
        })
        .catch(() =>
          setIndexCards(prev => prev.map((c, idx) =>
            idx === i ? { ...c, loading: false, error: 'Unavailable' } : c
          ))
        )
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Market movers
  useEffect(() => {
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
      .then(data => { if (data) { setMovers(data); setMoversLoading(false) } })
      .catch(e => { setMoversError(e instanceof Error ? e.message : String(e)); setMoversLoading(false) })
  }, [fmpKey])

  const openAnalyzer = (ticker: string) => dispatch({ type: 'OPEN_MODAL', payload: ticker })

  return (
    <div style={{ padding: isMobile ? '14px' : '20px 24px', maxWidth: 1440, margin: '0 auto' }}>

      {/* Page heading */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.t1 }}>
          Markets Overview
        </h1>
        <p style={{ margin: '4px 0 0', color: C.t3, fontSize: 13 }}>
          Live market snapshot — index data via Yahoo Finance
        </p>
      </div>

      {/* Index mini-cards */}
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

      {/* Leaderboard ad — desktop only */}
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <AdPlaceholder width={728} height={90} />
        </div>
      )}

      {/* No-key banner */}
      {noFmpKey && (
        <div style={{
          background: C.warnBg,
          border: `1px solid ${C.warnB}`,
          borderRadius: R.r10,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{ color: C.warn, fontSize: 13 }}>
            FMP API key required to load Top Gainers and Top Losers.
          </span>
          <button
            onClick={onOpenFmpModal}
            style={{
              background: C.accent,
              color: 'var(--c-fg-on-accent, #fff)',
              border: 'none',
              borderRadius: R.r8,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Add API Key
          </button>
        </div>
      )}

      {/* Error state */}
      {moversError && !noFmpKey && (
        <div style={{
          background: C.lossBg,
          border: `1px solid ${C.lossB}`,
          borderRadius: R.r8,
          padding: '10px 14px',
          marginBottom: 16,
          color: C.loss,
          fontSize: 13,
        }}>
          {moversError}
        </div>
      )}

      {/* Gainers + Losers + side ad */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* Tables */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
          <MoversTable
            title="Top Gainers"
            movers={movers?.gainers ?? []}
            isGainer={true}
            loading={moversLoading}
            onTickerClick={openAnalyzer}
          />
          <MoversTable
            title="Top Losers"
            movers={movers?.losers ?? []}
            isGainer={false}
            loading={moversLoading}
            onTickerClick={openAnalyzer}
          />
        </div>

        {/* Rectangle ad — wide desktop only */}
        {!isTablet && <AdPlaceholder width={300} height={250} />}
      </div>

      {/* Footer */}
      <div style={{ color: C.t4, fontSize: 10, textAlign: 'right', marginTop: 24 }}>
        Index data via Yahoo Finance · Movers via Financial Modeling Prep · Not investment advice
      </div>

    </div>
  )
}
