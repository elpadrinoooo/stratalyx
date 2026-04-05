import React, { useState, useMemo, useCallback } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import { C, R } from '../constants/colors'
import { MARKET_EVENTS, type EventType, type MarketEvent } from '../constants/marketEvents'
import { useApp } from '../state/context'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { sanitizeTicker } from '../engine/utils'

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

// ── long-term market chart ────────────────────────────────────────────────────

/** Approximate DJIA closing values at key turning points 1900–2024 */
const LONG_TERM_DATA: { t: number; value: number }[] = [
  { t: new Date('1900-01-01').getTime(), value: 66   },
  { t: new Date('1906-01-19').getTime(), value: 103  },
  { t: new Date('1907-11-15').getTime(), value: 53   },
  { t: new Date('1916-11-21').getTime(), value: 110  },
  { t: new Date('1921-08-24').getTime(), value: 63   },
  { t: new Date('1929-09-03').getTime(), value: 381  },
  { t: new Date('1932-07-08').getTime(), value: 41   },
  { t: new Date('1937-03-10').getTime(), value: 194  },
  { t: new Date('1938-03-31').getTime(), value: 100  },
  { t: new Date('1942-04-28').getTime(), value: 93   },
  { t: new Date('1946-05-29').getTime(), value: 212  },
  { t: new Date('1966-01-18').getTime(), value: 995  },
  { t: new Date('1970-05-26').getTime(), value: 631  },
  { t: new Date('1973-01-11').getTime(), value: 1051 },
  { t: new Date('1974-10-04').getTime(), value: 570  },
  { t: new Date('1980-04-21').getTime(), value: 891  },
  { t: new Date('1982-08-12').getTime(), value: 776  },
  { t: new Date('1987-08-25').getTime(), value: 2722 },
  { t: new Date('1987-10-19').getTime(), value: 1739 },
  { t: new Date('1990-07-16').getTime(), value: 2999 },
  { t: new Date('1990-10-11').getTime(), value: 2365 },
  { t: new Date('1994-01-31').getTime(), value: 3978 },
  { t: new Date('1998-07-17').getTime(), value: 9338 },
  { t: new Date('1998-10-08').getTime(), value: 7539 },
  { t: new Date('2000-01-14').getTime(), value: 11722 },
  { t: new Date('2002-10-09').getTime(), value: 7286 },
  { t: new Date('2007-10-09').getTime(), value: 14164 },
  { t: new Date('2009-03-09').getTime(), value: 6547 },
  { t: new Date('2013-03-05').getTime(), value: 14254 },
  { t: new Date('2020-02-12').getTime(), value: 29551 },
  { t: new Date('2020-03-23').getTime(), value: 18591 },
  { t: new Date('2021-11-08').getTime(), value: 36432 },
  { t: new Date('2022-10-13').getTime(), value: 28725 },
  { t: new Date('2024-03-21').getTime(), value: 39511 },
]

function fmtYear(t: number) {
  return new Date(t).getFullYear().toString()
}

function LongTermChart() {
  const [hovered, setHovered] = useState<{ value: number; year: string } | null>(null)

  return (
    <div
      style={{
        background: C.bg1,
        border: `1px solid ${C.border}`,
        borderRadius: R.r12,
        padding: '16px 16px 10px',
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>
            Long-Term Market History
          </div>
          <div style={{ color: C.t1, fontSize: 14, fontWeight: 700 }}>
            Dow Jones Industrial Average — Approximate Reference (1900–2024)
          </div>
        </div>
        {hovered && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: C.t4, fontSize: 10, fontWeight: 600 }}>{hovered.year}</div>
            <div style={{ color: C.t1, fontSize: 15, fontWeight: 700, fontFamily: C.mono }}>
              {hovered.value.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart
          data={LONG_TERM_DATA}
          onMouseMove={(s) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = (s as any)?.activePayload?.[0]?.payload as { t: number; value: number } | undefined
            if (p) setHovered({ value: p.value, year: fmtYear(p.t) })
          }}
          onMouseLeave={() => setHovered(null)}
          margin={{ top: 4, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={fmtYear}
            tick={{ fill: C.t4, fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            ticks={[
              new Date('1900-01-01').getTime(),
              new Date('1920-01-01').getTime(),
              new Date('1940-01-01').getTime(),
              new Date('1960-01-01').getTime(),
              new Date('1980-01-01').getTime(),
              new Date('2000-01-01').getTime(),
              new Date('2020-01-01').getTime(),
            ]}
          />
          <YAxis
            tick={{ fill: C.t4, fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
            width={30}
          />
          <Tooltip
            content={() => null}
          />
          {/* Event reference lines */}
          {MARKET_EVENTS.map((e) => (
            <ReferenceLine
              key={e.id}
              x={new Date(e.date).getTime()}
              stroke={e.type === 'crash' || e.type === 'bear' ? 'var(--c-loss)' : e.type === 'bull' || e.type === 'recovery' ? 'var(--c-gain)' : 'var(--c-warn)'}
              strokeWidth={1}
              strokeDasharray="2 4"
              strokeOpacity={0.5}
            />
          ))}
          <Line
            type="monotone"
            dataKey="value"
            stroke={C.accent}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: C.accent }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
        {[
          { color: 'var(--c-loss)', label: 'Crash / Bear' },
          { color: 'var(--c-warn)', label: 'Crisis' },
          { color: 'var(--c-gain)', label: 'Bull / Recovery' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 14, height: 1, background: l.color, opacity: 0.7 }} />
            <span style={{ color: C.t4, fontSize: 10 }}>{l.label}</span>
          </div>
        ))}
        <span style={{ color: C.t4, fontSize: 10, marginLeft: 'auto' }}>
          Approximate reference data — not for trading use
        </span>
      </div>
    </div>
  )
}

// ── stock event scanner ───────────────────────────────────────────────────────

interface PricePoint { t: number; p: number }

function findPrice(points: PricePoint[], targetMs: number): number | null {
  if (!points.length) return null
  let best = points[0]
  let bestDiff = Math.abs(points[0].t - targetMs)
  for (const pt of points) {
    const diff = Math.abs(pt.t - targetMs)
    if (diff < bestDiff) { bestDiff = diff; best = pt }
  }
  return best.p
}

function pctChange(from: number | null, to: number | null): number | null {
  if (!from || !to) return null
  return ((to - from) / from) * 100
}

/** Staggered Y offsets for flowing event labels on the cross-analyze chart */
const LABEL_OFFSETS = [14, 28, 42, 56, 70, 84, 98]

interface EventLabelProps {
  viewBox?: { x: number; y: number; width: number; height: number }
  event: MarketEvent
  index: number
  color: string
}

function FlowingEventLabel({ viewBox, event, index, color }: EventLabelProps) {
  if (!viewBox) return null
  const x = viewBox.x + 4
  const y = LABEL_OFFSETS[index % LABEL_OFFSETS.length]
  return (
    <g>
      <line x1={viewBox.x} y1={y + 4} x2={viewBox.x} y2={viewBox.height} stroke={color} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="3 3" />
      <rect x={x} y={y - 10} width={Math.min(event.shortTitle.length * 6 + 8, 110)} height={13} rx={3} fill={color} fillOpacity={0.15} />
      <text x={x + 4} y={y} fill={color} fontSize={9} fontWeight={700} fontFamily="monospace">
        {event.shortTitle}
      </text>
    </g>
  )
}

function StockScanner() {
  const [input, setInput]     = useState('')
  const [ticker, setTicker]   = useState<string | null>(null)
  const [points, setPoints]   = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showChart, setShowChart] = useState(false)

  const handleScan = useCallback(() => {
    const t = sanitizeTicker(input)
    if (!t) return
    setTicker(t)
    setLoading(true)
    setError('')
    setPoints([])
    setShowChart(false)
    fetch(`/api/history/${encodeURIComponent(t)}?range=5y`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load data for ${t}`)
        return r.json() as Promise<{ points: PricePoint[] }>
      })
      .then((d) => { setPoints(d.points); setLoading(false) })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load data')
        setLoading(false)
      })
  }, [input])

  // Compute visible events (within the fetched date window)
  const { rows, visibleEvents, chartData } = useMemo(() => {
    if (!points.length) return { rows: [], visibleEvents: [], chartData: [] }
    const minT = points[0].t
    const maxT = points[points.length - 1].t
    const basePrice = points[0].p

    const inWindow = MARKET_EVENTS.filter((e) => {
      const t = new Date(e.date).getTime()
      return t >= minT && t <= maxT
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const tableRows = [...inWindow]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12)
      .map((e) => {
        const startT = new Date(e.date).getTime()
        const endT   = e.endDate ? new Date(e.endDate).getTime() : startT + 30 * 86_400_000
        const pStart = findPrice(points, startT)
        const pEnd   = findPrice(points, endT)
        const chg    = pctChange(pStart, pEnd)
        return { event: e, change: chg }
      })

    // Normalised chart data: index = 100 at first point
    const cd = points.map((pt) => ({
      t: pt.t,
      value: (pt.p / basePrice) * 100,
    }))

    return { rows: tableRows, visibleEvents: inWindow, chartData: cd }
  }, [points])

  const fmtChg = (v: number | null) => {
    if (v === null) return <span style={{ color: C.t4 }}>—</span>
    const c = v >= 0 ? 'var(--c-gain)' : 'var(--c-loss)'
    return <span style={{ color: c, fontFamily: C.mono, fontWeight: 700 }}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</span>
  }

  const isUp = chartData.length > 1 && chartData[chartData.length - 1].value >= 100
  const lineColor = isUp ? 'var(--c-gain)' : 'var(--c-loss)'

  return (
    <div
      style={{
        background: C.bg1,
        border: `1px solid ${C.border}`,
        borderRadius: R.r12,
        padding: '16px',
        marginTop: 24,
      }}
    >
      {/* Header */}
      <div style={{ color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
        Stock vs Events Scanner
      </div>
      <p style={{ margin: '0 0 12px', color: C.t3, fontSize: 13, lineHeight: 1.6 }}>
        Enter any ticker to compare its performance against S&P 500 and Nasdaq during major market events.
        Cross-analyze on a chart with all event markers overlaid.
      </p>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          placeholder="e.g. AAPL, MSFT, SPY, QQQ"
          style={{
            flex: 1,
            background: C.bg0,
            border: `1px solid ${C.border}`,
            borderRadius: R.r8,
            color: C.t1,
            fontSize: 14,
            fontFamily: C.mono,
            padding: '8px 12px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleScan}
          disabled={!input.trim() || loading}
          style={{
            background: C.accent,
            border: 'none',
            borderRadius: R.r8,
            color: '#fff',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            fontSize: 13,
            fontWeight: 700,
            padding: '8px 18px',
            opacity: input.trim() && !loading ? 1 : 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Loading…' : 'Scan'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: 'var(--c-loss)', fontSize: 13, marginBottom: 12 }}>{error}</div>
      )}

      {/* Results */}
      {rows.length > 0 && ticker && (
        <>
          {/* Toggle: Chart vs Table */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ color: C.t2, fontSize: 13, fontWeight: 600 }}>
              {ticker} — {visibleEvents.length} events in the last 5 years
            </div>
            <div style={{ display: 'flex', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: 2, gap: 1 }}>
              {[{ id: false, label: 'Table' }, { id: true, label: '📈 Cross-Analyze Chart' }].map(({ id, label }) => {
                const active = showChart === id
                return (
                  <button
                    key={String(id)}
                    onClick={() => setShowChart(id)}
                    style={{
                      background: active ? C.bg1 : 'transparent',
                      border: active ? `1px solid ${C.border}` : '1px solid transparent',
                      borderRadius: R.r6,
                      color: active ? C.t1 : C.t3,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: active ? 700 : 400,
                      padding: '4px 12px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Cross-Analyze Chart ── */}
          {showChart && (
            <div style={{ marginBottom: 16 }}>
              {/* Legend strip */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 20, height: 2, background: lineColor }} />
                  <span style={{ color: C.t3, fontSize: 11, fontWeight: 600 }}>{ticker} (indexed to 100)</span>
                </div>
                {[
                  { color: 'var(--c-loss)', label: 'Crash / Bear event' },
                  { color: 'var(--c-warn)', label: 'Crisis event' },
                  { color: 'var(--c-gain)', label: 'Bull / Recovery event' },
                ].map((l) => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 14, height: 1, background: l.color, opacity: 0.7 }} />
                    <span style={{ color: C.t4, fontSize: 10 }}>{l.label}</span>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 100, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scannerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={lineColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={lineColor} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                    tick={{ fill: C.t4, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    scale="time"
                  />
                  <YAxis
                    tick={{ fill: C.t4, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v.toFixed(0)}`}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={(t: any) => new Date(t as number).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [`${(v as number).toFixed(1)}`, ticker ?? '']}
                  />
                  {/* Flowing event reference lines */}
                  {visibleEvents.map((e, i) => {
                    const evtColor = e.type === 'crash' || e.type === 'bear'
                      ? 'var(--c-loss)'
                      : e.type === 'bull' || e.type === 'recovery'
                        ? 'var(--c-gain)'
                        : 'var(--c-warn)'
                    return (
                      <ReferenceLine
                        key={e.id}
                        x={new Date(e.date).getTime()}
                        stroke={evtColor}
                        strokeWidth={1.5}
                        strokeOpacity={0.7}
                        label={(props: { viewBox?: { x: number; y: number; width: number; height: number } }) => (
                          <FlowingEventLabel
                            viewBox={props.viewBox}
                            event={e}
                            index={i}
                            color={evtColor}
                          />
                        )}
                      />
                    )
                  })}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={lineColor}
                    strokeWidth={2}
                    fill="url(#scannerGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: lineColor }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div style={{ color: C.t4, fontSize: 10, marginTop: 4, textAlign: 'right' }}>
                Price normalised — {ticker} starts at index 100 · Dashed lines mark event start dates · Not investment advice
              </div>
            </div>
          )}

          {/* ── Performance Table ── */}
          {!showChart && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Event', 'Period', 'S&P 500', 'Nasdaq', ticker].map((h) => (
                      <th
                        key={h}
                        style={{
                          color: C.t4,
                          fontWeight: 700,
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '.06em',
                          textAlign: h === 'Event' || h === 'Period' ? 'left' : 'right',
                          padding: '4px 8px 8px',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ event: e, change }) => {
                    const meta = TYPE_META[e.type]
                    return (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '8px 8px', color: C.t1, fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                display: 'inline-block', width: 6, height: 6,
                                borderRadius: '50%', background: meta.color, flexShrink: 0,
                              }}
                            />
                            {e.title}
                          </div>
                        </td>
                        <td style={{ padding: '8px 8px', color: C.t4, fontSize: 11, whiteSpace: 'nowrap' }}>
                          {dateRange(e)}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                          {fmtChg(e.sp500 ?? null)}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                          {fmtChg(e.nasdaq ?? null)}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                          {fmtChg(change)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ color: C.t4, fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>
                {ticker} performance computed from Yahoo Finance price history.
                S&P 500 / Nasdaq figures are documented event-period returns. Not investment advice.
              </div>
            </div>
          )}
        </>
      )}

      {!rows.length && ticker && !loading && !error && (
        <div style={{ color: C.t3, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          No recent event data available for {ticker}. Try a US-listed ticker like AAPL, SPY, or QQQ.
        </div>
      )}
    </div>
  )
}

// ── decade jump nav ───────────────────────────────────────────────────────────

const DECADES = [1900, 1920, 1940, 1960, 1980, 2000, 2010, 2020]

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

      {/* ── Long-term reference chart ── */}
      <LongTermChart />

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

      {/* ── Stock vs Events Scanner ── */}
      <StockScanner />
    </div>
  )
}
