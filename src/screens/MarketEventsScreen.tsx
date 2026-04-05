import React, { useState, useMemo } from 'react'
import { C, R } from '../constants/colors'
import { MARKET_EVENTS, type EventType, type MarketEvent } from '../constants/marketEvents'
import { useApp } from '../state/context'
import { useWindowWidth } from '../hooks/useWindowWidth'

// ── type config ──────────────────────────────────────────────────────────────

const TYPE_META: Record<EventType, { label: string; color: string; bg: string; border: string }> = {
  crash:    { label: 'Crash',    color: 'var(--c-loss)',   bg: 'var(--c-lossBg)',   border: 'var(--c-lossB)'  },
  bear:     { label: 'Bear',     color: 'var(--c-warn)',   bg: 'var(--c-warnBg)',   border: 'var(--c-warnB)'  },
  crisis:   { label: 'Crisis',   color: 'var(--c-warn)',   bg: 'var(--c-warnBg)',   border: 'var(--c-warnB)'  },
  bull:     { label: 'Bull Run', color: 'var(--c-gain)',   bg: 'var(--c-gainBg)',   border: 'var(--c-gainB)'  },
  recovery: { label: 'Recovery', color: 'var(--c-gain)',   bg: 'var(--c-gainBg)',   border: 'var(--c-gainB)'  },
}

type Filter = 'all' | EventType
type SortMode = 'chronological' | 'severity'

// ── helpers ───────────────────────────────────────────────────────────────────

function pct(n: number | undefined): string {
  if (n === undefined) return '—'
  return `${n > 0 ? '+' : ''}${n}%`
}

function pctColor(n: number | undefined): string {
  if (n === undefined) return C.t4
  return n >= 0 ? 'var(--c-gain)' : 'var(--c-loss)'
}

function dateRange(e: MarketEvent): string {
  const fmt = (s: string) => new Date(s).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  if (!e.endDate) return fmt(e.date)
  return `${fmt(e.date)} – ${fmt(e.endDate)}`
}

function durationLabel(e: MarketEvent): string {
  if (!e.endDate) return ''
  const days = Math.round(
    (new Date(e.endDate).getTime() - new Date(e.date).getTime()) / 86_400_000
  )
  if (days < 7)  return `${days}d`
  if (days < 60) return `${days}d`
  const months = Math.round(days / 30)
  if (months < 24) return `${months} mo`
  return `${(months / 12).toFixed(1)} yr`
}

/** Max absolute % across all events — used to normalise bars */
const MAX_ABS_PCT = Math.max(
  ...MARKET_EVENTS.flatMap((e) =>
    [e.sp500, e.nasdaq, e.dow].filter((v): v is number => v !== undefined).map(Math.abs)
  )
)

/** Visual bar for an index % change */
function PerfBar({ value, label }: { value: number | undefined; label: string }) {
  if (value === undefined) return null
  const pctWidth = `${(Math.abs(value) / MAX_ABS_PCT) * 100}%`
  const color    = value >= 0 ? 'var(--c-gain)' : 'var(--c-loss)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, width: 44, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: C.bg2, borderRadius: R.r99, height: 5, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ height: '100%', width: pctWidth, background: color, borderRadius: R.r99, transition: 'width .4s' }} />
      </div>
      <span style={{ color, fontFamily: C.mono, fontSize: 12, fontWeight: 700, width: 44, textAlign: 'right', flexShrink: 0 }}>
        {pct(value)}
      </span>
    </div>
  )
}

// ── event card ────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: MarketEvent }) {
  const [open, setOpen] = useState(false)
  const meta     = TYPE_META[event.type]
  const duration = durationLabel(event)

  return (
    <div
      style={{
        background: C.bg1,
        border: `1px solid ${C.border}`,
        borderRadius: R.r12,
        overflow: 'hidden',
      }}
    >
      {/* Colored top bar */}
      <div style={{ height: 3, background: meta.color }} />

      <div style={{ padding: '14px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
              <span
                style={{
                  background: meta.bg, border: `1px solid ${meta.border}`,
                  borderRadius: R.r99, color: meta.color,
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  textTransform: 'uppercase', letterSpacing: '.06em', flexShrink: 0,
                }}
              >
                {meta.label}
              </span>
              {duration && (
                <span
                  style={{
                    background: C.bg2, border: `1px solid ${C.border}`,
                    borderRadius: R.r99, color: C.t3,
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', flexShrink: 0,
                  }}
                >
                  {duration}
                </span>
              )}
              <span style={{ color: C.t4, fontSize: 11 }}>{dateRange(event)}</span>
            </div>
            <h3 style={{ margin: 0, color: C.t1, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
              {event.title}
            </h3>
          </div>
        </div>

        {/* Performance bars */}
        {(event.sp500 !== undefined || event.nasdaq !== undefined || event.dow !== undefined) && (
          <div
            style={{
              background: C.bg2,
              border: `1px solid ${C.border}`,
              borderRadius: R.r8,
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              marginBottom: 10,
            }}
          >
            <PerfBar value={event.sp500}  label="S&P 500" />
            <PerfBar value={event.nasdaq} label="Nasdaq"  />
            <PerfBar value={event.dow}    label="Dow"     />
          </div>
        )}

        {/* Cause */}
        <p style={{ margin: '0 0 10px', color: C.t3, fontSize: 13, lineHeight: 1.65 }}>
          {event.cause}
        </p>

        {/* Toggle */}
        <button
          onClick={() => setOpen((x) => !x)}
          style={{
            background: 'none',
            border: `1px solid ${C.border}`,
            borderRadius: R.r6,
            color: open ? meta.color : C.t3,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'color .15s',
          }}
        >
          {open ? 'Show less ▲' : 'Full details ▼'}
        </button>

        {/* Expanded */}
        {open && (
          <div
            style={{
              marginTop: 12,
              borderTop: `1px solid ${C.border}`,
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div>
              <div style={{ color: meta.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
                Market Impact
              </div>
              <p style={{ margin: 0, color: C.t2, fontSize: 13, lineHeight: 1.7 }}>{event.impact}</p>
            </div>

            <div>
              <div style={{ color: 'var(--c-gain)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
                Recovery
              </div>
              <p style={{ margin: 0, color: C.t2, fontSize: 13, lineHeight: 1.7 }}>{event.recovery}</p>
            </div>

            {event.sources.length > 0 && (
              <div>
                <div style={{ color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                  Sources
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {event.sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--c-accent)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
                      {s.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── record callout strip ──────────────────────────────────────────────────────

function RecordStrip() {
  const worstCrash = MARKET_EVENTS
    .filter((e) => e.sp500 !== undefined && e.sp500 < 0)
    .sort((a, b) => (a.sp500 ?? 0) - (b.sp500 ?? 0))[0]

  const bestBull = MARKET_EVENTS
    .filter((e) => e.sp500 !== undefined && e.sp500 > 0)
    .sort((a, b) => (b.sp500 ?? 0) - (a.sp500 ?? 0))[0]

  // Fastest bear = shortest duration with sp500 < -20%
  const fastestBear = MARKET_EVENTS
    .filter((e) => e.sp500 !== undefined && e.sp500 < -20 && e.endDate)
    .sort((a, b) => {
      const dA = new Date(a.endDate!).getTime() - new Date(a.date).getTime()
      const dB = new Date(b.endDate!).getTime() - new Date(b.date).getTime()
      return dA - dB
    })[0]

  const records = [
    {
      label: 'Worst S&P 500 Drawdown',
      value: pct(worstCrash?.sp500),
      sub: worstCrash?.shortTitle ?? '',
      color: 'var(--c-loss)',
      bg: 'var(--c-lossBg)',
      border: 'var(--c-lossB)',
    },
    {
      label: 'Largest S&P 500 Bull Run',
      value: pct(bestBull?.sp500),
      sub: bestBull?.shortTitle ?? '',
      color: 'var(--c-gain)',
      bg: 'var(--c-gainBg)',
      border: 'var(--c-gainB)',
    },
    {
      label: 'Fastest Bear Market',
      value: fastestBear ? durationLabel(fastestBear) : '—',
      sub: fastestBear?.shortTitle ?? '',
      color: 'var(--c-warn)',
      bg: 'var(--c-warnBg)',
      border: 'var(--c-warnB)',
    },
  ]

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
      {records.map((r) => (
        <div
          key={r.label}
          style={{
            background: r.bg,
            border: `1px solid ${r.border}`,
            borderRadius: R.r10,
            padding: '10px 14px',
            flex: '1 1 160px',
          }}
        >
          <div style={{ color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>
            {r.label}
          </div>
          <div style={{ color: r.color, fontSize: 22, fontWeight: 800, fontFamily: C.mono, lineHeight: 1.1, marginBottom: 2 }}>
            {r.value}
          </div>
          <div style={{ color: C.t3, fontSize: 11 }}>{r.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── timeline ──────────────────────────────────────────────────────────────────

function Timeline({ events }: { events: MarketEvent[] }) {
  // Group by year
  const byYear = useMemo(() => {
    const map = new Map<number, MarketEvent[]>()
    for (const e of events) {
      const yr = new Date(e.date).getFullYear()
      if (!map.has(yr)) map.set(yr, [])
      map.get(yr)!.push(e)
    }
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [events])

  return (
    <div style={{ position: 'relative', paddingLeft: 52 }}>
      {/* Vertical spine */}
      <div
        style={{
          position: 'absolute',
          left: 22,
          top: 8,
          bottom: 8,
          width: 2,
          background: C.border,
          borderRadius: 1,
        }}
      />

      {byYear.map(([year, evts]) => (
        <div key={year} style={{ marginBottom: 24 }}>
          {/* Year label + dot */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <div
              style={{
                position: 'absolute',
                left: -38,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 32,
                height: 20,
                background: C.bg2,
                border: `1px solid ${C.border}`,
                borderRadius: R.r4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: C.t3,
                fontFamily: C.mono,
              }}
            >
              {year}
            </div>
            {/* Connector tick */}
            <div
              style={{
                position: 'absolute',
                left: -8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 8,
                height: 1,
                background: C.border,
              }}
            />
          </div>

          {/* Cards for this year */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {evts.map((e) => {
              const meta = TYPE_META[e.type]
              return (
                <div key={e.id} style={{ position: 'relative' }}>
                  {/* Dot on spine */}
                  <div
                    style={{
                      position: 'absolute',
                      left: -34,
                      top: 16,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: meta.color,
                      border: `2px solid ${C.bg1}`,
                      zIndex: 1,
                    }}
                  />
                  {/* Horizontal connector */}
                  <div
                    style={{
                      position: 'absolute',
                      left: -24,
                      top: 20,
                      width: 24,
                      height: 1,
                      background: C.border,
                    }}
                  />
                  <EventCard event={e} />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── decade jump nav ───────────────────────────────────────────────────────────

const DECADES = [1980, 1990, 2000, 2010, 2020]

function jumpToYear(yr: number, sortedEvents: MarketEvent[]) {
  const match = sortedEvents.find((e) => new Date(e.date).getFullYear() >= yr)
  if (match) {
    const el = document.getElementById(`event-${match.id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// ── main screen ───────────────────────────────────────────────────────────────

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All',       value: 'all'    },
  { label: 'Crashes',   value: 'crash'  },
  { label: 'Bears',     value: 'bear'   },
  { label: 'Crises',    value: 'crisis' },
  { label: 'Bull Runs', value: 'bull'   },
]

export function MarketEventsScreen() {
  const { dispatch } = useApp()
  const width    = useWindowWidth()
  const isMobile = width <= 768

  const [filter,   setFilter]   = useState<Filter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('chronological')

  const chronological = useMemo(
    () => [...MARKET_EVENTS].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    []
  )

  const filtered = useMemo(() => {
    const base = filter === 'all' ? chronological : chronological.filter((e) => e.type === filter)
    if (sortMode === 'severity') {
      return [...base].sort((a, b) => Math.abs(b.sp500 ?? 0) - Math.abs(a.sp500 ?? 0))
    }
    return base
  }, [filter, sortMode, chronological])

  const crashCount  = MARKET_EVENTS.filter((e) => e.type === 'crash').length
  const bearCount   = MARKET_EVENTS.filter((e) => e.type === 'bear').length
  const crisisCount = MARKET_EVENTS.filter((e) => e.type === 'crisis').length
  const bullCount   = MARKET_EVENTS.filter((e) => e.type === 'bull' || e.type === 'recovery').length

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Page header ── */}
      <div style={{ color: C.accent, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 2 }}>
        Research Library
      </div>
      <h1 style={{ margin: '0 0 4px', color: C.t1, fontSize: 22, fontWeight: 800 }}>Market Events</h1>
      <p style={{ margin: '0 0 18px', color: C.t2, fontSize: 14, lineHeight: 1.6, maxWidth: 680 }}>
        Major macro events that moved the entire market — documented with causes, index-level impact,
        and recovery data. All sourced from official and institutional references.
      </p>

      {/* ── Record callouts ── */}
      <RecordStrip />

      {/* ── Controls row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(({ label, value }) => {
            const active = filter === value
            const meta   = value !== 'all' ? TYPE_META[value] : null
            const count  = value === 'all' ? MARKET_EVENTS.length
                         : value === 'crash'  ? crashCount
                         : value === 'bear'   ? bearCount
                         : value === 'crisis' ? crisisCount
                         : bullCount
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                style={{
                  background: active ? (meta?.bg ?? C.accentM) : C.bg2,
                  border: `1px solid ${active ? (meta?.border ?? C.accentB) : C.border}`,
                  borderRadius: R.r99,
                  color: active ? (meta?.color ?? C.accent) : C.t3,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: active ? 700 : 400,
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {label}
                <span
                  style={{
                    background: active ? 'rgba(0,0,0,0.15)' : C.bg0,
                    borderRadius: R.r99,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '0 4px',
                    lineHeight: 1.6,
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Sort + decade jump */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sort toggle */}
          <div style={{ display: 'flex', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: 2, gap: 1 }}>
            {(['chronological', 'severity'] as SortMode[]).map((s) => {
              const active = sortMode === s
              return (
                <button
                  key={s}
                  onClick={() => setSortMode(s)}
                  style={{
                    background: active ? C.bg1 : 'transparent',
                    border: active ? `1px solid ${C.border}` : '1px solid transparent',
                    borderRadius: R.r6,
                    color: active ? C.t1 : C.t3,
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: active ? 700 : 400,
                    padding: '3px 10px',
                  }}
                >
                  {s === 'chronological' ? 'Timeline' : 'Most Severe'}
                </button>
              )
            })}
          </div>

          {/* Decade jump (only in timeline/chronological mode, desktop) */}
          {sortMode === 'chronological' && !isMobile && (
            <div style={{ display: 'flex', gap: 4 }}>
              {DECADES.map((d) => (
                <button
                  key={d}
                  onClick={() => jumpToYear(d, filtered)}
                  style={{
                    background: C.bg2,
                    border: `1px solid ${C.border}`,
                    borderRadius: R.r6,
                    color: C.t3,
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    fontFamily: C.mono,
                  }}
                >
                  '{String(d).slice(2)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: '7px 12px', marginBottom: 18, fontSize: 11, color: C.t4, lineHeight: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span>
          Index performance figures are approximate and based on widely published data.
          Educational content only — not investment advice. Sources cited per event.
        </span>
        <span
          style={{ color: C.accent, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'Screener' })}
        >
          Analyze a stock →
        </span>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.t3, fontSize: 14 }}>
          No events match this filter.
        </div>
      )}

      {/* ── Content: timeline or severity grid ── */}
      {filtered.length > 0 && sortMode === 'chronological' && (
        <Timeline events={filtered} />
      )}

      {filtered.length > 0 && sortMode === 'severity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((event) => (
            <div key={event.id} id={`event-${event.id}`}>
              <EventCard event={event} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
