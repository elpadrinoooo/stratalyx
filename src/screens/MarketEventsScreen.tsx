import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Brush,
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span style={{ color: C.t4, fontSize: 10, fontWeight: 600, width: 52, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: C.bg2, borderRadius: R.r99, height: 7, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ height: '100%', width: pctWidth, background: color, borderRadius: R.r99, transition: 'width .5s ease' }} />
      </div>
      <span style={{ color, fontFamily: C.mono, fontSize: 12, fontWeight: 700, width: 48, textAlign: 'right', flexShrink: 0 }}>
        {pct(value)}
      </span>
    </div>
  )
}

// ── event card ────────────────────────────────────────────────────────────────

function EventCard({ event, onScanClick }: { event: MarketEvent; onScanClick?: () => void }) {
  const [open, setOpen]             = useState(false)
  const [hovered, setHovered]       = useState(false)
  const [causeExpanded, setCauseExp] = useState(false)
  const meta     = TYPE_META[event.type]
  const duration = durationLabel(event)

  // Truncate cause to first sentence for scannability
  const dotIdx    = event.cause.indexOf('. ')
  const causeShort = dotIdx > 0 ? event.cause.slice(0, dotIdx + 1) : event.cause
  const causeHasMore = causeShort.length < event.cause.length - 5

  // Primary index figure shown as large callout
  const primaryPct = event.sp500 ?? event.dow ?? event.nasdaq

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.bg1,
        border: `1px solid ${hovered ? meta.border : C.border}`,
        borderLeft: `4px solid ${meta.color}`,
        borderRadius: R.r12,
        overflow: 'hidden',
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: hovered ? `0 4px 16px rgba(0,0,0,.18)` : 'none',
      }}
    >
      <div style={{ padding: '14px 16px' }}>
        {/* Header: badges + title + big % callout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
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
            <h3 style={{ margin: 0, color: C.t1, fontSize: 17, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-.01em' }}>
              {event.title}
            </h3>
          </div>

          {/* Big % callout */}
          {primaryPct !== undefined && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                color: pctColor(primaryPct),
                fontFamily: C.mono,
                fontSize: 24,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-.02em',
              }}>
                {pct(primaryPct)}
              </div>
              <div style={{ color: C.t4, fontSize: 9, marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {event.sp500 !== undefined ? 'S&P 500' : event.dow !== undefined ? 'Dow Jones' : 'Nasdaq'}
              </div>
            </div>
          )}
        </div>

        {/* Performance bars */}
        {(event.sp500 !== undefined || event.nasdaq !== undefined || event.dow !== undefined) && (
          <div
            style={{
              background: C.bg2,
              border: `1px solid ${C.border}`,
              borderRadius: R.r8,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
              marginBottom: 12,
            }}
          >
            <PerfBar value={event.sp500}  label="S&P 500" />
            <PerfBar value={event.nasdaq} label="Nasdaq"  />
            <PerfBar value={event.dow}    label="Dow"     />
          </div>
        )}

        {/* Cause — first sentence preview with Read more */}
        <p style={{ margin: '0 0 12px', color: C.t3, fontSize: 13, lineHeight: 1.7 }}>
          {causeExpanded || !causeHasMore ? event.cause : causeShort}
          {causeHasMore && !causeExpanded && (
            <span
              onClick={(e) => { e.stopPropagation(); setCauseExp(true) }}
              style={{ color: C.accent, cursor: 'pointer', marginLeft: 5, fontWeight: 600, fontSize: 12 }}
            >
              Read more
            </span>
          )}
        </p>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {onScanClick && (
            <button
              onClick={onScanClick}
              style={{
                background: C.accentM,
                border: `1px solid ${C.accentB}`,
                borderRadius: R.r6,
                color: C.accent,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                padding: '5px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 12 }}>📈</span>
              Scan a stock vs this event
            </button>
          )}
        </div>

        {/* Full-width chevron toggle */}
        <button
          onClick={() => setOpen((x) => !x)}
          style={{
            background: open ? meta.bg : C.bg2,
            border: `1px solid ${open ? meta.border : C.border}`,
            borderRadius: R.r8,
            color: open ? meta.color : C.t3,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            transition: 'color .15s, background .15s, border-color .15s',
            letterSpacing: '.02em',
          }}
        >
          <span>{open ? 'Hide details' : 'Full details'}</span>
          <span style={{ fontSize: 13, transition: 'transform .2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▾
          </span>
        </button>

        {/* Expanded panel */}
        {open && (
          <div
            style={{
              marginTop: 12,
              borderTop: `1px solid ${C.border}`,
              paddingTop: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div>
              <div style={{ color: meta.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 3, height: 10, background: meta.color, borderRadius: 2 }} />
                Market Impact
              </div>
              <p style={{ margin: 0, color: C.t2, fontSize: 13, lineHeight: 1.75 }}>{event.impact}</p>
            </div>

            <div>
              <div style={{ color: 'var(--c-gain)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 3, height: 10, background: 'var(--c-gain)', borderRadius: 2 }} />
                Recovery
              </div>
              <p style={{ margin: 0, color: C.t2, fontSize: 13, lineHeight: 1.75 }}>{event.recovery}</p>
            </div>

            {event.sources.length > 0 && (
              <div>
                <div style={{ color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 8 }}>
                  Sources
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {event.sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: C.accent, fontSize: 12, textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 7,
                        background: C.bg2, border: `1px solid ${C.border}`,
                        borderRadius: R.r6, padding: '5px 10px',
                      }}
                    >
                      <span style={{ fontSize: 11, opacity: 0.6 }}>↗</span>
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

  const ICONS = ['↘', '↗', '⚡']

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
      {records.map((r, i) => (
        <div
          key={r.label}
          style={{
            background: C.bg1,
            border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${r.color}`,
            borderRadius: R.r10,
            padding: '12px 16px',
            flex: '1 1 160px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>
              {r.label}
            </div>
            <span style={{ color: r.color, fontSize: 14, lineHeight: 1, opacity: 0.7 }}>{ICONS[i]}</span>
          </div>
          <div style={{ color: r.color, fontSize: 26, fontWeight: 800, fontFamily: C.mono, lineHeight: 1.15 }}>
            {r.value}
          </div>
          <div style={{ color: C.t3, fontSize: 11, fontWeight: 500 }}>{r.sub}</div>
        </div>
      ))}
    </div>
  )
}


// ── timeline ──────────────────────────────────────────────────────────────────

function Timeline({ events, isMobile, onScanClick }: { events: MarketEvent[]; isMobile: boolean; onScanClick: () => void }) {
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

  // Mobile: flat cards, no spine
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.map((e) => (
          <div key={e.id} id={`event-${e.id}`}>
            <EventCard event={e} onScanClick={onScanClick} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 60 }}>
      {/* Vertical spine */}
      <div
        style={{
          position: 'absolute',
          left: 26,
          top: 8,
          bottom: 8,
          width: 3,
          background: C.accentB,
          borderRadius: 2,
        }}
      />

      {byYear.map(([year, evts]) => (
        <div key={year} style={{ marginBottom: 28 }}>
          {/* Year badge */}
          <div style={{ position: 'relative', marginBottom: 12, height: 24 }}>
            <div
              style={{
                position: 'absolute',
                left: -46,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 40,
                height: 22,
                background: C.bg2,
                border: `1px solid ${C.accentB}`,
                borderRadius: R.r4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: C.accent,
                fontFamily: C.mono,
                letterSpacing: '-.02em',
              }}
            >
              {year}
            </div>
            <div
              style={{
                position: 'absolute',
                left: -6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 6,
                height: 1,
                background: C.accentB,
              }}
            />
          </div>

          {/* Cards for this year */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {evts.map((e) => {
              const meta = TYPE_META[e.type]
              return (
                <div key={e.id} id={`event-${e.id}`} style={{ position: 'relative' }}>
                  {/* Dot on spine */}
                  <div
                    style={{
                      position: 'absolute',
                      left: -40,
                      top: 18,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: meta.color,
                      border: `3px solid ${C.bg0}`,
                      boxShadow: `0 0 0 1px ${meta.color}`,
                      zIndex: 1,
                    }}
                  />
                  {/* Horizontal connector */}
                  <div
                    style={{
                      position: 'absolute',
                      left: -26,
                      top: 24,
                      width: 26,
                      height: 1,
                      background: meta.color,
                      opacity: 0.4,
                    }}
                  />
                  <EventCard event={e} onScanClick={onScanClick} />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── combined timeline chart ───────────────────────────────────────────────────

/**
 * Approximate turning-point series for DJIA, S&P 500, and Nasdaq Composite.
 * Rows are key highs/lows so each crash/bull renders as a clear spike or dip.
 * All three series extended to early 2026.
 */

// ── DJIA ──────────────────────────────────────────────────────────────────────
const DJIA_RAW: { t: number; value: number }[] = [
  { t: new Date('1900-01-01').getTime(), value: 66 },
  { t: new Date('1903-11-09').getTime(), value: 42 },
  { t: new Date('1906-01-19').getTime(), value: 103 },
  { t: new Date('1907-11-15').getTime(), value: 53 },
  { t: new Date('1909-10-15').getTime(), value: 100 },
  { t: new Date('1916-11-21').getTime(), value: 110 },
  { t: new Date('1917-12-19').getTime(), value: 65 },
  { t: new Date('1919-11-03').getTime(), value: 119 },
  { t: new Date('1921-08-24').getTime(), value: 63 },
  { t: new Date('1925-02-10').getTime(), value: 159 },
  { t: new Date('1928-01-03').getTime(), value: 300 },
  { t: new Date('1929-09-03').getTime(), value: 381 },
  { t: new Date('1929-11-13').getTime(), value: 198 },
  { t: new Date('1930-04-17').getTime(), value: 279 },
  { t: new Date('1931-07-08').getTime(), value: 145 },
  { t: new Date('1932-07-08').getTime(), value: 41 },
  { t: new Date('1933-07-18').getTime(), value: 111 },
  { t: new Date('1934-07-26').getTime(), value: 85 },
  { t: new Date('1937-03-10').getTime(), value: 194 },
  { t: new Date('1938-03-31').getTime(), value: 98 },
  { t: new Date('1939-09-12').getTime(), value: 155 },
  { t: new Date('1942-04-28').getTime(), value: 92 },
  { t: new Date('1945-12-10').getTime(), value: 192 },
  { t: new Date('1946-05-29').getTime(), value: 212 },
  { t: new Date('1949-06-13').getTime(), value: 161 },
  { t: new Date('1953-09-14').getTime(), value: 255 },
  { t: new Date('1956-04-06').getTime(), value: 521 },
  { t: new Date('1957-10-22').getTime(), value: 420 },
  { t: new Date('1961-12-12').getTime(), value: 734 },
  { t: new Date('1966-01-18').getTime(), value: 995 },
  { t: new Date('1966-10-07').getTime(), value: 744 },
  { t: new Date('1968-12-03').getTime(), value: 985 },
  { t: new Date('1970-05-26').getTime(), value: 631 },
  { t: new Date('1972-01-11').getTime(), value: 889 },
  { t: new Date('1973-01-11').getTime(), value: 1051 },
  { t: new Date('1974-10-04').getTime(), value: 570 },
  { t: new Date('1976-09-21').getTime(), value: 1015 },
  { t: new Date('1980-02-13').getTime(), value: 891 },
  { t: new Date('1980-08-12').getTime(), value: 730 },
  { t: new Date('1981-04-27').getTime(), value: 1024 },
  { t: new Date('1982-08-12').getTime(), value: 776 },
  { t: new Date('1985-01-14').getTime(), value: 1286 },
  { t: new Date('1987-08-25').getTime(), value: 2722 },
  { t: new Date('1987-10-19').getTime(), value: 1739 },
  { t: new Date('1989-07-17').getTime(), value: 2660 },
  { t: new Date('1990-07-16').getTime(), value: 2999 },
  { t: new Date('1990-10-11').getTime(), value: 2365 },
  { t: new Date('1991-12-31').getTime(), value: 3169 },
  { t: new Date('1994-01-31').getTime(), value: 3978 },
  { t: new Date('1994-04-04').getTime(), value: 3593 },
  { t: new Date('1996-01-10').getTime(), value: 5395 },
  { t: new Date('1997-08-06').getTime(), value: 8259 },
  { t: new Date('1998-07-17').getTime(), value: 9338 },
  { t: new Date('1998-10-08').getTime(), value: 7539 },
  { t: new Date('1999-12-31').getTime(), value: 11497 },
  { t: new Date('2000-01-14').getTime(), value: 11722 },
  { t: new Date('2001-09-21').getTime(), value: 8236 },
  { t: new Date('2002-10-09').getTime(), value: 7286 },
  { t: new Date('2003-10-27').getTime(), value: 9801 },
  { t: new Date('2006-05-10').getTime(), value: 11642 },
  { t: new Date('2007-10-09').getTime(), value: 14164 },
  { t: new Date('2008-09-29').getTime(), value: 10365 },
  { t: new Date('2009-03-09').getTime(), value: 6547 },
  { t: new Date('2010-04-26').getTime(), value: 11205 },
  { t: new Date('2011-10-03').getTime(), value: 10655 },
  { t: new Date('2013-03-05').getTime(), value: 14254 },
  { t: new Date('2015-08-25').getTime(), value: 15666 },
  { t: new Date('2016-02-11').getTime(), value: 15660 },
  { t: new Date('2018-01-26').getTime(), value: 26616 },
  { t: new Date('2018-12-26').getTime(), value: 21792 },
  { t: new Date('2019-12-27').getTime(), value: 28645 },
  { t: new Date('2020-02-12').getTime(), value: 29551 },
  { t: new Date('2020-03-23').getTime(), value: 18591 },
  { t: new Date('2020-11-09').getTime(), value: 29157 },
  { t: new Date('2021-11-08').getTime(), value: 36432 },
  { t: new Date('2022-10-13').getTime(), value: 28725 },
  { t: new Date('2023-07-19').getTime(), value: 35630 },
  { t: new Date('2024-03-21').getTime(), value: 39511 },
  { t: new Date('2024-07-17').getTime(), value: 41198 },
  { t: new Date('2024-08-05').getTime(), value: 38703 },
  { t: new Date('2024-11-11').getTime(), value: 43910 },
  { t: new Date('2025-01-20').getTime(), value: 43309 },
  { t: new Date('2025-04-07').getTime(), value: 37965 },
  { t: new Date('2026-01-01').getTime(), value: 41500 },
]

// ── S&P 500 (data available from 1928; widely tracked from 1950) ──────────────
const SP500_RAW: { t: number; value: number }[] = [
  { t: new Date('1950-01-03').getTime(), value: 17 },
  { t: new Date('1953-09-14').getTime(), value: 22 },
  { t: new Date('1956-08-02').getTime(), value: 49 },
  { t: new Date('1957-10-22').getTime(), value: 39 },
  { t: new Date('1961-12-12').getTime(), value: 72 },
  { t: new Date('1966-01-18').getTime(), value: 94 },
  { t: new Date('1966-10-07').getTime(), value: 74 },
  { t: new Date('1968-11-29').getTime(), value: 108 },
  { t: new Date('1970-05-26').getTime(), value: 69 },
  { t: new Date('1972-12-11').getTime(), value: 119 },
  { t: new Date('1974-10-03').getTime(), value: 62 },
  { t: new Date('1976-09-21').getTime(), value: 107 },
  { t: new Date('1980-11-28').getTime(), value: 141 },
  { t: new Date('1982-08-12').getTime(), value: 103 },
  { t: new Date('1987-08-25').getTime(), value: 336 },
  { t: new Date('1987-12-04').getTime(), value: 224 },
  { t: new Date('1989-10-09').getTime(), value: 360 },
  { t: new Date('1990-10-11').getTime(), value: 296 },
  { t: new Date('1994-02-02').getTime(), value: 482 },
  { t: new Date('1994-04-04').getTime(), value: 438 },
  { t: new Date('1996-01-10').getTime(), value: 616 },
  { t: new Date('1998-07-17').getTime(), value: 1186 },
  { t: new Date('1998-10-08').getTime(), value: 923 },
  { t: new Date('2000-03-24').getTime(), value: 1552 },
  { t: new Date('2002-10-09').getTime(), value: 777 },
  { t: new Date('2003-10-27').getTime(), value: 1050 },
  { t: new Date('2007-10-09').getTime(), value: 1565 },
  { t: new Date('2009-03-09').getTime(), value: 677 },
  { t: new Date('2010-04-26').getTime(), value: 1217 },
  { t: new Date('2011-10-03').getTime(), value: 1099 },
  { t: new Date('2013-03-28').getTime(), value: 1569 },
  { t: new Date('2015-08-25').getTime(), value: 1867 },
  { t: new Date('2016-02-11').getTime(), value: 1829 },
  { t: new Date('2018-01-26').getTime(), value: 2873 },
  { t: new Date('2018-12-26').getTime(), value: 2351 },
  { t: new Date('2019-12-27').getTime(), value: 3240 },
  { t: new Date('2020-02-19').getTime(), value: 3386 },
  { t: new Date('2020-03-23').getTime(), value: 2237 },
  { t: new Date('2020-11-09').getTime(), value: 3572 },
  { t: new Date('2021-12-29').getTime(), value: 4793 },
  { t: new Date('2022-10-12').getTime(), value: 3578 },
  { t: new Date('2023-07-27').getTime(), value: 4588 },
  { t: new Date('2024-03-21').getTime(), value: 5224 },
  { t: new Date('2024-07-16').getTime(), value: 5667 },
  { t: new Date('2024-08-05').getTime(), value: 5186 },
  { t: new Date('2024-11-11').getTime(), value: 5893 },
  { t: new Date('2025-01-23').getTime(), value: 6118 },
  { t: new Date('2025-04-07').getTime(), value: 5074 },
  { t: new Date('2026-01-01').getTime(), value: 5500 },
]

// ── Nasdaq Composite (launched Feb 1971) ─────────────────────────────────────
const NASDAQ_RAW: { t: number; value: number }[] = [
  { t: new Date('1971-02-08').getTime(), value: 100 },
  { t: new Date('1972-12-11').getTime(), value: 135 },
  { t: new Date('1974-10-03').getTime(), value: 55 },
  { t: new Date('1976-09-21').getTime(), value: 98 },
  { t: new Date('1980-01-14').getTime(), value: 210 },
  { t: new Date('1980-04-21').getTime(), value: 132 },
  { t: new Date('1981-05-29').getTime(), value: 224 },
  { t: new Date('1982-08-12').getTime(), value: 159 },
  { t: new Date('1987-08-26').getTime(), value: 455 },
  { t: new Date('1987-12-04').getTime(), value: 291 },
  { t: new Date('1990-07-16').getTime(), value: 469 },
  { t: new Date('1990-10-16').getTime(), value: 326 },
  { t: new Date('1994-02-01').getTime(), value: 800 },
  { t: new Date('1994-04-14').getTime(), value: 693 },
  { t: new Date('1996-01-10').getTime(), value: 990 },
  { t: new Date('1998-07-20').getTime(), value: 2014 },
  { t: new Date('1998-10-08').getTime(), value: 1419 },
  { t: new Date('2000-03-10').getTime(), value: 5048 },
  { t: new Date('2002-10-09').getTime(), value: 1114 },
  { t: new Date('2004-01-26').getTime(), value: 2153 },
  { t: new Date('2007-10-31').getTime(), value: 2859 },
  { t: new Date('2008-11-21').getTime(), value: 1295 },
  { t: new Date('2009-03-09').getTime(), value: 1268 },
  { t: new Date('2010-04-26').getTime(), value: 2535 },
  { t: new Date('2011-10-04').getTime(), value: 2299 },
  { t: new Date('2015-07-20').getTime(), value: 5231 },
  { t: new Date('2016-02-11').getTime(), value: 4267 },
  { t: new Date('2018-08-30').getTime(), value: 8109 },
  { t: new Date('2018-12-26').getTime(), value: 6193 },
  { t: new Date('2019-12-27').getTime(), value: 9022 },
  { t: new Date('2020-02-19').getTime(), value: 9838 },
  { t: new Date('2020-03-23').getTime(), value: 6879 },
  { t: new Date('2021-11-19').getTime(), value: 16057 },
  { t: new Date('2022-12-28').getTime(), value: 10939 },
  { t: new Date('2023-07-19').getTime(), value: 14358 },
  { t: new Date('2024-03-21').getTime(), value: 16428 },
  { t: new Date('2024-07-10').getTime(), value: 18647 },
  { t: new Date('2024-08-05').getTime(), value: 16195 },
  { t: new Date('2024-12-26').getTime(), value: 19310 },
  { t: new Date('2025-01-24').getTime(), value: 21784 },
  { t: new Date('2025-04-07').getTime(), value: 15267 },
  { t: new Date('2026-01-01').getTime(), value: 17800 },
]

/**
 * Merge all three series onto a unified sorted timestamp array.
 * Missing values for a series at a given timestamp are left as null
 * (Recharts connectNulls will interpolate across them).
 */
function nearestValue(raw: { t: number; value: number }[], targetT: number): number | null {
  if (!raw.length) return null
  let best = raw[0], bestDiff = Math.abs(raw[0].t - targetT)
  for (const pt of raw) {
    const d = Math.abs(pt.t - targetT)
    if (d < bestDiff) { bestDiff = d; best = pt }
  }
  // Only use if within 18 months (don't bridge huge gaps)
  return bestDiff < 1.5 * 365 * 86_400_000 ? best.value : null
}

// All unique timestamps from all three series, sorted
const ALL_TIMESTAMPS = [...new Set([
  ...DJIA_RAW.map(d => d.t),
  ...SP500_RAW.map(d => d.t),
  ...NASDAQ_RAW.map(d => d.t),
])].sort((a, b) => a - b)

const LONG_TERM_DATA: { t: number; value: number; sp500: number | null; nasdaq: number | null }[] =
  ALL_TIMESTAMPS.map(t => ({
    t,
    value:  nearestValue(DJIA_RAW,   t) ?? DJIA_RAW.find(d => d.t === t)?.value ?? (DJIA_RAW.find(d => d.t === t)?.value ?? null) as unknown as number,
    sp500:  nearestValue(SP500_RAW,  t),
    nasdaq: nearestValue(NASDAQ_RAW, t),
  })).filter(d => d.value !== null)

function fmtYear(t: number) {
  return new Date(t).getFullYear().toString()
}

/** Find nearest data-array index for a given date string */
function dateToIdx(dateStr: string): number {
  const target = new Date(dateStr).getTime()
  let best = 0, bestDiff = Infinity
  LONG_TERM_DATA.forEach((d, i) => {
    const diff = Math.abs(d.t - target)
    if (diff < bestDiff) { bestDiff = diff; best = i }
  })
  return best
}

/** Recent timeframes — always end at the latest data point */
const RECENT_TF = [
  { id: '5y',  label: '5Y',  si: dateToIdx('2019-01-01'), ei: LONG_TERM_DATA.length - 1 },
  { id: '10y', label: '10Y', si: dateToIdx('2014-01-01'), ei: LONG_TERM_DATA.length - 1 },
  { id: '20y', label: '20Y', si: dateToIdx('2004-01-01'), ei: LONG_TERM_DATA.length - 1 },
  { id: '50y', label: '50Y', si: dateToIdx('1974-01-01'), ei: LONG_TERM_DATA.length - 1 },
  { id: 'all', label: 'All', si: 0,                       ei: LONG_TERM_DATA.length - 1 },
]

/** Historical era zoom windows */
const ERA_PRESETS = [
  { id: 'era1', label: '1920s–40s', si: dateToIdx('1919-11-03'), ei: dateToIdx('1946-05-29') },
  { id: 'era2', label: '1960s–80s', si: dateToIdx('1961-12-12'), ei: dateToIdx('1989-07-17') },
  { id: 'era3', label: '2000s–10s', si: dateToIdx('1999-12-31'), ei: dateToIdx('2013-03-05') },
]

const ALL_PRESETS = [...RECENT_TF, ...ERA_PRESETS]

function CombinedTimelineChart({
  visibleIds,
  onSelect,
}: {
  visibleIds: Set<string>
  onSelect: (id: string) => void
}) {
  const [hoveredId, setHoveredId]    = useState<string | null>(null)
  const [chartHov, setChartHov]      = useState<{ t: number; value: number } | null>(null)
  const [activePreset, setActivePreset] = useState<string>('all')
  const [brushSI, setBrushSI]        = useState(0)
  const [brushEI, setBrushEI]        = useState(LONG_TERM_DATA.length - 1)
  const [logScale, setLogScale]      = useState(false)
  const containerRef                  = useRef<HTMLDivElement>(null)
  const [innerW, setInnerW]          = useState(700)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setInnerW(e.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const id = 'evt-pulse-style'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = `@keyframes evtPulse{0%{transform:translate(-50%,-50%) scale(1);opacity:.7}100%{transform:translate(-50%,-50%) scale(3.8);opacity:0}}`
    document.head.appendChild(s)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  function applyPreset(id: string) {
    const p = ALL_PRESETS.find(z => z.id === id)
    if (!p) return
    setActivePreset(id)
    setBrushSI(p.si)
    setBrushEI(p.ei)
  }

  // Visible time range from brush
  const tMin = LONG_TERM_DATA[brushSI].t
  const tMax = LONG_TERM_DATA[brushEI].t

  // Chart geometry — MUST match AreaChart margin + YAxis width
  const ML      = 10 + 34  // margin.left(10) + YAxis width(34) = 44
  const MR      = 10
  const MB      = 62        // brush(~30) + x-axis labels(~15) + gaps
  const CHART_H = 310

  const dataW  = Math.max(1, innerW - ML - MR)
  const xFor   = (t: number) => ML + ((t - tMin) / Math.max(1, tMax - tMin)) * dataW

  // Only show dots for events in the current zoom window
  const inRangeEvents = MARKET_EVENTS.filter(e => {
    const t = new Date(e.date).getTime()
    return t >= tMin && t <= tMax
  })

  // Dynamic x-axis ticks based on visible span
  const xTicks = useMemo(() => {
    const startY = new Date(tMin).getFullYear()
    const endY   = new Date(tMax).getFullYear()
    const span   = endY - startY
    const step   = span <= 15 ? 3 : span <= 30 ? 5 : span <= 60 ? 10 : 20
    const years: number[] = []
    for (let y = Math.ceil(startY / step) * step; y <= endY; y += step) {
      years.push(new Date(`${y}-01-01`).getTime())
    }
    return years
  }, [tMin, tMax])

  const hoveredEvent = hoveredId ? MARKET_EVENTS.find(e => e.id === hoveredId) ?? null : null
  const hoveredX     = hoveredEvent ? xFor(new Date(hoveredEvent.date).getTime()) : 0

  // Period stats derived from the visible slice
  const visibleSlice = LONG_TERM_DATA.slice(brushSI, brushEI + 1)
  const vStart       = visibleSlice[0]?.value ?? 1
  const vEnd         = visibleSlice[visibleSlice.length - 1]?.value ?? 1
  const periodRet    = ((vEnd - vStart) / vStart) * 100
  const peak         = visibleSlice.length > 0 ? visibleSlice.reduce((a, b) => b.value > a.value ? b : a) : { t: 0, value: 0 }
  const trough       = visibleSlice.length > 0 ? visibleSlice.reduce((a, b) => b.value < a.value ? b : a) : { t: 0, value: 0 }

  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, padding: '16px 16px 10px', marginBottom: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>
            Long-Term Market History · Hover dots · Click to jump
          </div>
          <div style={{ color: C.t1, fontSize: 15, fontWeight: 700 }}>
            DJIA · S&P 500 · Nasdaq
            <span style={{ color: C.t3, fontSize: 12, fontWeight: 400, marginLeft: 8 }}>Approximate turning-point data, 1900–2026</span>
          </div>
        </div>
        {/* Live hover readout */}
        <div style={{ textAlign: 'right', minWidth: 100 }}>
          {chartHov ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <div style={{ color: C.t4, fontSize: 10 }}>
                {new Date(chartHov.t).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </div>
              <div style={{ color: C.t1, fontSize: 20, fontWeight: 800, fontFamily: C.mono, lineHeight: 1 }}>
                {chartHov.value.toLocaleString()}
              </div>
              <div style={{ color: C.t4, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.05em' }}>DJIA (hover)</div>
            </div>
          ) : hoveredEvent ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <div style={{ color: TYPE_META[hoveredEvent.type].color, fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{hoveredEvent.shortTitle}</div>
              <div style={{ color: C.t4, fontSize: 11 }}>
                {new Date(hoveredEvent.date).getFullYear()}
                {hoveredEvent.sp500 !== undefined && ` · ${pct(hoveredEvent.sp500)} S&P`}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Toolbar: timeframes + historical eras + log scale ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Recent timeframes */}
        <div style={{ display: 'flex', gap: 4 }}>
          {RECENT_TF.map(z => {
            const active = activePreset === z.id
            return (
              <button key={z.id} onClick={() => applyPreset(z.id)} style={{
                background: active ? C.accentM : C.bg2,
                border: `1px solid ${active ? C.accentB : C.border}`,
                borderRadius: R.r6, color: active ? C.accent : C.t3,
                cursor: 'pointer', fontSize: 11, fontWeight: active ? 700 : 500,
                padding: '3px 10px', transition: 'all .1s',
              }}>{z.label}</button>
            )
          })}
        </div>
        <div style={{ width: 1, height: 16, background: C.border, flexShrink: 0 }} />
        {/* Historical eras */}
        <div style={{ display: 'flex', gap: 3 }}>
          {ERA_PRESETS.map(z => {
            const active = activePreset === z.id
            return (
              <button key={z.id} onClick={() => applyPreset(z.id)} style={{
                background: active ? C.bg2 : 'transparent',
                border: `1px solid ${active ? C.border : 'transparent'}`,
                borderRadius: R.r6, color: active ? C.t2 : C.t4,
                cursor: 'pointer', fontSize: 10, fontWeight: active ? 600 : 400,
                padding: '3px 8px',
              }}>{z.label}</button>
            )
          })}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
          <span style={{ color: C.t4, fontSize: 10 }}>
            {new Date(tMin).getFullYear()}–{new Date(tMax).getFullYear()}
          </span>
          <button onClick={() => setLogScale(x => !x)} title="Equalises relative % moves across eras" style={{
            background: logScale ? C.accentM : C.bg2,
            border: `1px solid ${logScale ? C.accentB : C.border}`,
            borderRadius: R.r6, color: logScale ? C.accent : C.t3,
            cursor: 'pointer', fontSize: 11, fontWeight: logScale ? 700 : 400, padding: '3px 9px',
          }}>Log</button>
        </div>
      </div>

      {/* ── Period stats strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
        {[
          {
            label: 'Period Return',
            value: `${periodRet > 0 ? '+' : ''}${periodRet.toFixed(1)}%`,
            color: periodRet >= 0 ? 'var(--c-gain)' : 'var(--c-loss)',
            sub: `${new Date(tMin).getFullYear()} → ${new Date(tMax).getFullYear()}`,
          },
          {
            label: 'DJIA High',
            value: peak.value >= 1000 ? `${(peak.value / 1000).toFixed(1)}k` : peak.value.toLocaleString(),
            color: 'var(--c-gain)',
            sub: `${new Date(peak.t).getFullYear()} (Dow)`,
          },
          {
            label: 'DJIA Low',
            value: trough.value >= 1000 ? `${(trough.value / 1000).toFixed(1)}k` : trough.value.toLocaleString(),
            color: 'var(--c-loss)',
            sub: `${new Date(trough.t).getFullYear()} (Dow)`,
          },
          {
            label: 'Events Visible',
            value: inRangeEvents.length.toString(),
            color: C.accent,
            sub: `of ${MARKET_EVENTS.length} total`,
          },
        ].map(s => (
          <div key={s.label} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: '8px 10px' }}>
            <div style={{ color: C.t4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 16, fontWeight: 800, fontFamily: C.mono, lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ color: C.t4, fontSize: 10, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Chart + dot overlay ── */}
      <div ref={containerRef} style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={CHART_H}>
          <ComposedChart
            data={LONG_TERM_DATA}
            onMouseMove={(s) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = (s as any)?.activePayload?.[0]?.payload as { t: number; value: number } | undefined
              if (p) setChartHov(p)
            }}
            onMouseLeave={() => setChartHov(null)}
            margin={{ top: 8, right: MR, left: 10, bottom: MB }}
          >
            <defs>
              <linearGradient id="ltGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.accent} stopOpacity={0.12} />
                <stop offset="95%" stopColor={C.accent} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={fmtYear}
              tick={{ fill: C.t4, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              ticks={xTicks}
            />
            <YAxis
              tick={{ fill: C.t4, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
              width={34}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              scale={logScale ? ('log' as any) : 'linear'}
              domain={logScale ? [1, 'auto'] : undefined}
              allowDataOverflow={false}
            />
            <Tooltip content={() => null} />
            {/* Event reference lines — hovered one lights up */}
            {MARKET_EVENTS.map((e) => {
              const isHov    = hoveredId === e.id
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
                  strokeWidth={isHov ? 2 : 1}
                  strokeDasharray={isHov ? undefined : '2 4'}
                  strokeOpacity={isHov ? 0.85 : 0.35}
                />
              )
            })}
            {/* DJIA — primary area */}
            <Area
              type="monotone"
              dataKey="value"
              name="DJIA"
              stroke={C.accent}
              strokeWidth={2}
              fill="url(#ltGrad)"
              dot={false}
              activeDot={{ r: 4, fill: C.accent, strokeWidth: 0 }}
              connectNulls
            />
            {/* S&P 500 */}
            <Line
              type="monotone"
              dataKey="sp500"
              name="S&P 500"
              stroke="#4ADE80"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#4ADE80', strokeWidth: 0 }}
              connectNulls
            />
            {/* Nasdaq Composite */}
            <Line
              type="monotone"
              dataKey="nasdaq"
              name="Nasdaq"
              stroke="#F97316"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#F97316', strokeWidth: 0 }}
              connectNulls
            />
            {/* Interactive brush — drag handles to zoom */}
            <Brush
              dataKey="t"
              height={28}
              stroke={C.border}
              fill={C.bg0}
              startIndex={brushSI}
              endIndex={brushEI}
              onChange={(range) => {
                const { startIndex: si, endIndex: ei } = range as { startIndex?: number; endIndex?: number }
                if (typeof si === 'number' && typeof ei === 'number') {
                  setBrushSI(si)
                  setBrushEI(ei)
                  setActivePreset('') // clear preset highlight on manual drag
                }
              }}
              tickFormatter={fmtYear}
              travellerWidth={8}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Event dots — aligned to x-axis baseline (above brush) */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: MB, height: 0, pointerEvents: 'none' }}>
          {inRangeEvents.map((e) => {
            const meta  = TYPE_META[e.type]
            const isVis = visibleIds.has(e.id)
            const isHov = hoveredId === e.id
            const x     = xFor(new Date(e.date).getTime())
            return (
              <div
                key={e.id}
                onMouseEnter={() => setHoveredId(e.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelect(e.id)}
                title={e.title}
                style={{
                  position: 'absolute',
                  left: x,
                  top: 0,
                  transform: `translate(-50%, -50%) scale(${isHov ? 2.2 : 1})`,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: isVis ? meta.color : C.bg2,
                  border: `2px solid ${isVis ? meta.color : C.border}`,
                  cursor: 'pointer',
                  transition: 'transform .2s cubic-bezier(.4,0,.2,1), box-shadow .2s, opacity .15s',
                  opacity: isVis ? 1 : 0.18,
                  zIndex: isHov ? 10 : 2,
                  boxShadow: isHov ? `0 0 0 5px ${meta.bg}, 0 4px 14px rgba(0,0,0,.35)` : 'none',
                  pointerEvents: 'auto',
                }}
              >
                {isHov && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      border: `2px solid ${meta.color}`,
                      animation: 'evtPulse .85s ease-out infinite',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Flowing tooltip */}
        {hoveredEvent && (
          <div
            style={{
              position: 'absolute',
              left: hoveredX,
              bottom: MB + 18,
              transform: 'translateX(-50%)',
              transition: 'left .18s cubic-bezier(.4,0,.2,1)',
              zIndex: 20,
              pointerEvents: 'none',
              minWidth: 130,
              maxWidth: 190,
            }}
          >
            <div
              style={{
                background: C.bg1,
                border: `1px solid ${TYPE_META[hoveredEvent.type].border}`,
                borderRadius: R.r8,
                padding: '8px 10px',
                boxShadow: `0 6px 24px rgba(0,0,0,.35), 0 0 0 1px ${TYPE_META[hoveredEvent.type].border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <span
                  style={{
                    background: TYPE_META[hoveredEvent.type].bg,
                    border: `1px solid ${TYPE_META[hoveredEvent.type].border}`,
                    borderRadius: R.r99,
                    color: TYPE_META[hoveredEvent.type].color,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 6px',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em',
                  }}
                >
                  {TYPE_META[hoveredEvent.type].label}
                </span>
                <span style={{ color: C.t4, fontSize: 10, fontFamily: C.mono }}>
                  {new Date(hoveredEvent.date).getFullYear()}
                </span>
              </div>
              <div style={{ color: C.t1, fontSize: 12, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>
                {hoveredEvent.shortTitle}
              </div>
              {(hoveredEvent.sp500 ?? hoveredEvent.dow) !== undefined && (
                <div style={{ color: pctColor(hoveredEvent.sp500 ?? hoveredEvent.dow), fontFamily: C.mono, fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
                  {pct(hoveredEvent.sp500 ?? hoveredEvent.dow)}
                  <span style={{ color: C.t4, fontSize: 9, fontWeight: 400, marginLeft: 3 }}>
                    {hoveredEvent.sp500 !== undefined ? 'S&P' : 'Dow'}
                  </span>
                </div>
              )}
              <div style={{ color: C.t4, fontSize: 10, fontStyle: 'italic' }}>Click to jump ↓</div>
            </div>
            <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${TYPE_META[hoveredEvent.type].border}`, margin: '0 auto' }} />
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Index lines */}
        {[
          { color: C.accent,   label: 'DJIA',    dash: false },
          { color: '#4ADE80',  label: 'S&P 500', dash: false },
          { color: '#F97316',  label: 'Nasdaq',  dash: false },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 18, height: 2, background: l.color, borderRadius: 1 }} />
            <span style={{ color: C.t3, fontSize: 10, fontWeight: 600 }}>{l.label}</span>
          </div>
        ))}
        <div style={{ width: 1, height: 12, background: C.border }} />
        {/* Event type dots */}
        {[
          { color: 'var(--c-loss)', label: 'Crash / Bear' },
          { color: 'var(--c-warn)', label: 'Crisis' },
          { color: 'var(--c-gain)', label: 'Bull / Recovery' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
            <span style={{ color: C.t4, fontSize: 10 }}>{l.label}</span>
          </div>
        ))}
        <span style={{ color: C.t4, fontSize: 10, marginLeft: 'auto', fontStyle: 'italic' }}>
          Drag brush to zoom · Approximate reference
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

type ScanRange = '1y' | '2y' | '3y' | '5y'

interface IndexPoints { spy: PricePoint[]; dia: PricePoint[]; qqq: PricePoint[] }

/** Align an index price series to the given timestamps using sorted pointer */
function alignSeries(pts: PricePoint[], timestamps: number[]): (number | null)[] {
  if (!pts.length) return timestamps.map(() => null)
  const sorted = [...pts].sort((a, b) => a.t - b.t)
  const out: (number | null)[] = []
  let j = 0
  for (const ts of timestamps) {
    while (j < sorted.length - 1 && Math.abs(sorted[j + 1].t - ts) <= Math.abs(sorted[j].t - ts)) j++
    out.push(sorted[j].p)
  }
  return out
}

function StockScanner() {
  const [input, setInput]       = useState('')
  const [ticker, setTicker]     = useState<string | null>(null)
  const [points, setPoints]     = useState<PricePoint[]>([])
  const [idxPts, setIdxPts]     = useState<IndexPoints>({ spy: [], dia: [], qqq: [] })
  const [range, setRange]       = useState<ScanRange>('5y')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showChart, setShowChart] = useState(false)

  const doFetch = useCallback((t: string, r: ScanRange) => {
    setLoading(true)
    setError('')
    setPoints([])
    setIdxPts({ spy: [], dia: [], qqq: [] })
    setShowChart(false)

    const fetchTicker = fetch(`/api/history/${encodeURIComponent(t)}?range=${r}`)
      .then(res => { if (!res.ok) throw new Error(`Could not load data for ${t}`); return res.json() as Promise<{ points: PricePoint[] }> })
    const fetchSpy = fetch(`/api/history/SPY?range=${r}`).then(res => res.ok ? res.json() as Promise<{ points: PricePoint[] }> : { points: [] }).catch(() => ({ points: [] as PricePoint[] }))
    const fetchDia = fetch(`/api/history/DIA?range=${r}`).then(res => res.ok ? res.json() as Promise<{ points: PricePoint[] }> : { points: [] }).catch(() => ({ points: [] as PricePoint[] }))
    const fetchQqq = fetch(`/api/history/QQQ?range=${r}`).then(res => res.ok ? res.json() as Promise<{ points: PricePoint[] }> : { points: [] }).catch(() => ({ points: [] as PricePoint[] }))

    Promise.all([fetchTicker, fetchSpy, fetchDia, fetchQqq])
      .then(([main, spy, dia, qqq]) => {
        setPoints(main.points)
        setIdxPts({ spy: spy.points, dia: dia.points, qqq: qqq.points })
        setLoading(false)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load data')
        setLoading(false)
      })
  }, [])

  const handleScan = useCallback(() => {
    const t = sanitizeTicker(input)
    if (!t) return
    setTicker(t)
    doFetch(t, range)
  }, [input, range, doFetch])

  const handleRangeChange = useCallback((newRange: ScanRange) => {
    setRange(newRange)
    if (ticker) doFetch(ticker, newRange)
  }, [ticker, doFetch])

  // Compute visible events and chart data
  const { rows, visibleEvents, chartData, stats } = useMemo(() => {
    if (!points.length) return { rows: [], visibleEvents: [], chartData: [], stats: null }
    const minT      = points[0].t
    const maxT      = points[points.length - 1].t
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
        return { event: e, change: pctChange(pStart, pEnd) }
      })

    // Normalised to 100 at first point
    const normPts = points.map(pt => ({ t: pt.t, norm: (pt.p / basePrice) * 100 }))

    // Align index series to main ticker timestamps
    const timestamps = points.map(p => p.t)
    const spyAligned = alignSeries(idxPts.spy, timestamps)
    const diaAligned = alignSeries(idxPts.dia, timestamps)
    const qqqAligned = alignSeries(idxPts.qqq, timestamps)

    // Normalize indices to 100 at their own first-window price
    const spyBase = spyAligned.find(v => v !== null) ?? null
    const diaBase = diaAligned.find(v => v !== null) ?? null
    const qqqBase = qqqAligned.find(v => v !== null) ?? null

    const cd = normPts.map((pt, i) => ({
      t:     pt.t,
      value: pt.norm,
      spy:   spyBase && spyAligned[i] != null ? ((spyAligned[i] as number) / spyBase) * 100 : null,
      dia:   diaBase && diaAligned[i] != null ? ((diaAligned[i] as number) / diaBase) * 100 : null,
      qqq:   qqqBase && qqqAligned[i] != null ? ((qqqAligned[i] as number) / qqqBase) * 100 : null,
    }))

    // Stats
    const values    = normPts.map(p => p.norm)
    const totalRet  = values[values.length - 1] - 100
    let peak        = 100, maxGain = 0, maxDraw = 0
    for (const v of values) {
      if (v > peak) peak = v
      const gain = v - 100
      if (gain > maxGain) maxGain = gain
      const draw = ((peak - v) / peak) * 100
      if (draw > maxDraw) maxDraw = draw
    }

    return { rows: tableRows, visibleEvents: inWindow, chartData: cd, stats: { totalRet, maxGain, maxDraw, evtCount: inWindow.length } }
  }, [points, idxPts])

  const fmtChg = (v: number | null) => {
    if (v === null) return <span style={{ color: C.t4 }}>—</span>
    const c = v >= 0 ? 'var(--c-gain)' : 'var(--c-loss)'
    return <span style={{ color: c, fontFamily: C.mono, fontWeight: 700 }}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</span>
  }

  const isUp      = chartData.length > 1 && chartData[chartData.length - 1].value >= 100
  const lineColor = isUp ? 'var(--c-gain)' : 'var(--c-loss)'

  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, padding: '16px', marginTop: 24 }}>
      {/* Header */}
      <div style={{ color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
        Stock vs Events Cross-Analyzer
      </div>
      <p style={{ margin: '0 0 12px', color: C.t3, fontSize: 13, lineHeight: 1.6 }}>
        Enter any ticker to overlay it against S&P 500, Dow Jones, and Nasdaq — all normalised to 100 — with market events overlaid.
      </p>

      {/* Input row + timeframes */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          placeholder="e.g. AAPL, TSLA, BRK.B"
          aria-label="Tickers to scan for market events"
          style={{ flex: 1, minWidth: 140, background: C.bg0, border: `1px solid ${C.border}`, borderRadius: R.r8, color: C.t1, fontSize: 14, fontFamily: C.mono, padding: '8px 12px', outline: 'none' }}
        />
        <button
          onClick={handleScan}
          disabled={!input.trim() || loading}
          style={{ background: C.accent, border: 'none', borderRadius: R.r8, color: 'var(--c-fg-on-accent, #fff)', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, padding: '8px 18px', opacity: input.trim() && !loading ? 1 : 0.5, whiteSpace: 'nowrap' }}
        >
          {loading ? 'Loading…' : 'Scan'}
        </button>
        {/* Timeframe buttons */}
        <div style={{ display: 'flex', gap: 3 }}>
          {(['1y','2y','3y','5y'] as ScanRange[]).map(r => {
            const active = range === r
            return (
              <button key={r} onClick={() => handleRangeChange(r)} style={{ background: active ? C.accentM : C.bg2, border: `1px solid ${active ? C.accentB : C.border}`, borderRadius: R.r6, color: active ? C.accent : C.t3, cursor: 'pointer', fontSize: 11, fontWeight: active ? 700 : 500, padding: '5px 10px' }}>
                {r.toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>

      {error && <div style={{ color: 'var(--c-loss)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {/* Stats strip — shown once loaded */}
      {stats && ticker && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Total Return', value: `${stats.totalRet > 0 ? '+' : ''}${stats.totalRet.toFixed(1)}%`, color: stats.totalRet >= 0 ? 'var(--c-gain)' : 'var(--c-loss)', sub: `${ticker} · ${range.toUpperCase()}` },
            { label: 'Max Gain',     value: `+${stats.maxGain.toFixed(1)}%`,  color: 'var(--c-gain)', sub: 'vs period open' },
            { label: 'Max Drawdown', value: `-${stats.maxDraw.toFixed(1)}%`,  color: 'var(--c-loss)', sub: 'peak-to-trough' },
            { label: 'Events in Period', value: stats.evtCount.toString(),    color: C.accent,        sub: `of ${MARKET_EVENTS.length} total` },
          ].map(s => (
            <div key={s.label} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: '8px 10px' }}>
              <div style={{ color: C.t4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 16, fontWeight: 800, fontFamily: C.mono, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ color: C.t4, fontSize: 10, marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {rows.length > 0 && ticker && (
        <>
          {/* Toggle: Chart vs Table */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ color: C.t2, fontSize: 13, fontWeight: 600 }}>
              {ticker} — {visibleEvents.length} event{visibleEvents.length !== 1 ? 's' : ''} in the last {range.toUpperCase()}
            </div>
            <div style={{ display: 'flex', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: 2, gap: 1 }}>
              {[{ id: false, label: 'Table' }, { id: true, label: 'Cross-Analyze Chart' }].map(({ id, label }) => {
                const active = showChart === id
                return (
                  <button key={String(id)} onClick={() => setShowChart(id)} style={{ background: active ? C.bg1 : 'transparent', border: active ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: R.r6, color: active ? C.t1 : C.t3, cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400, padding: '4px 12px', whiteSpace: 'nowrap' }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Cross-Analyze Chart ── */}
          {showChart && (
            <div style={{ marginBottom: 16 }}>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { color: lineColor,   label: ticker,        dash: false, width: 2 },
                  { color: '#4A9EFF',   label: 'SPY (S&P 500)', dash: false, width: 1.5 },
                  { color: '#F59E0B',   label: 'DIA (Dow)',    dash: false, width: 1.5 },
                  { color: '#A855F7',   label: 'QQQ (Nasdaq)', dash: false, width: 1.5 },
                ].map((l) => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width={20} height={4}><line x1={0} y1={2} x2={20} y2={2} stroke={l.color} strokeWidth={l.width} /></svg>
                    <span style={{ color: C.t3, fontSize: 11, fontWeight: 600, fontFamily: C.mono }}>{l.label}</span>
                  </div>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {[
                    { color: 'var(--c-loss)', label: 'Crash/Bear' },
                    { color: 'var(--c-warn)', label: 'Crisis' },
                    { color: 'var(--c-gain)', label: 'Bull/Recovery' },
                  ].map((l) => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 1, height: 12, background: l.color, opacity: 0.7 }} />
                      <span style={{ color: C.t4, fontSize: 9 }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 100, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scannerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={lineColor} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={lineColor} stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="t" type="number" domain={['dataMin','dataMax']} scale="time" tickFormatter={(t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })} tick={{ fill: C.t4, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.t4, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v.toFixed(0)}`} width={32} />
                  <ReferenceLine y={100} stroke={C.border} strokeDasharray="4 4" strokeOpacity={0.6} />
                  <Tooltip
                    contentStyle={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={(t: any) => new Date(t as number).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, name: any) => {
                      if (v == null) return [null, name]
                      const num = v as number
                      const ret = num - 100
                      return [`${num.toFixed(1)} (${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%)`, name]
                    }}
                  />
                  {/* Event reference lines */}
                  {visibleEvents.map((e, i) => {
                    const evtColor = e.type === 'crash' || e.type === 'bear' ? 'var(--c-loss)' : e.type === 'bull' || e.type === 'recovery' ? 'var(--c-gain)' : 'var(--c-warn)'
                    return (
                      <ReferenceLine
                        key={e.id}
                        x={new Date(e.date).getTime()}
                        stroke={evtColor}
                        strokeWidth={1.5}
                        strokeOpacity={0.65}
                        label={(props: { viewBox?: { x: number; y: number; width: number; height: number } }) => (
                          <FlowingEventLabel viewBox={props.viewBox} event={e} index={i} color={evtColor} />
                        )}
                      />
                    )
                  })}
                  {/* Ticker area (filled) */}
                  <Area type="monotone" dataKey="value" name={ticker ?? ''} stroke={lineColor} strokeWidth={2} fill="url(#scannerGrad)" dot={false} activeDot={{ r: 4, fill: lineColor }} />
                  {/* Index overlays */}
                  <Line type="monotone" dataKey="spy" name="SPY (S&P 500)" stroke="#4A9EFF" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="dia" name="DIA (Dow)" stroke="#F59E0B" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="qqq" name="QQQ (Nasdaq)" stroke="#A855F7" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} connectNulls />
                </AreaChart>
              </ResponsiveContainer>

              <div style={{ color: C.t4, fontSize: 10, marginTop: 4, textAlign: 'right' }}>
                All series normalised to 100 at period open · Dashed line = breakeven · Not investment advice
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
                      <th key={h} style={{ color: C.t4, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: h === 'Event' || h === 'Period' ? 'left' : 'right', padding: '4px 8px 8px' }}>
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
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                            {e.title}
                          </div>
                        </td>
                        <td style={{ padding: '8px 8px', color: C.t4, fontSize: 11, whiteSpace: 'nowrap' }}>{dateRange(e)}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>{fmtChg(e.sp500 ?? null)}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>{fmtChg(e.nasdaq ?? null)}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>{fmtChg(change)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ color: C.t4, fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>
                {ticker} performance from Yahoo Finance price history · S&P 500 / Nasdaq figures are documented event-period returns · Not investment advice
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

  const [filter,      setFilter]      = useState<Filter>('all')
  const [sortMode,    setSortMode]    = useState<SortMode>('chronological')
  const [search,      setSearch]      = useState('')
  const [showBackTop, setShowBackTop] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)

  // Back-to-top trigger
  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 500)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToScanner = useCallback(() => {
    scannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollToEvent = useCallback((id: string) => {
    const el = document.getElementById(`event-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Brief highlight flash
      el.style.outline = `2px solid ${TYPE_META[MARKET_EVENTS.find(e => e.id === id)?.type ?? 'crash'].color}`
      el.style.outlineOffset = '2px'
      setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = '' }, 1400)
    }
  }, [])

  const chronological = useMemo(
    () => [...MARKET_EVENTS].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    []
  )

  const filtered = useMemo(() => {
    let base = filter === 'all' ? chronological : chronological.filter((e) => e.type === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      base = base.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        e.shortTitle.toLowerCase().includes(q) ||
        e.cause.toLowerCase().includes(q)
      )
    }
    if (sortMode === 'severity') {
      return [...base].sort((a, b) => Math.abs(b.sp500 ?? 0) - Math.abs(a.sp500 ?? 0))
    }
    return base
  }, [filter, sortMode, chronological, search])

  const visibleIds = useMemo(() => new Set(filtered.map((e) => e.id)), [filtered])

  const crashCount  = MARKET_EVENTS.filter((e) => e.type === 'crash').length
  const bearCount   = MARKET_EVENTS.filter((e) => e.type === 'bear').length
  const crisisCount = MARKET_EVENTS.filter((e) => e.type === 'crisis').length
  const bullCount   = MARKET_EVENTS.filter((e) => e.type === 'bull' || e.type === 'recovery').length

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 6 }}>
          Research Library
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          <h1 style={{ margin: 0, color: C.t1, fontSize: isMobile ? 20 : 28, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.1 }}>
            Market Events
          </h1>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {[
              { count: MARKET_EVENTS.filter(e => e.type === 'crash').length,  label: 'Crashes',   color: 'var(--c-loss)' },
              { count: MARKET_EVENTS.filter(e => e.type === 'bear').length,   label: 'Bears',     color: 'var(--c-warn)' },
              { count: MARKET_EVENTS.filter(e => e.type === 'crisis').length, label: 'Crises',    color: 'var(--c-warn)' },
              { count: MARKET_EVENTS.filter(e => e.type === 'bull' || e.type === 'recovery').length, label: 'Bull Runs', color: 'var(--c-gain)' },
            ].map((s) => (
              <div
                key={s.label}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: '4px 10px' }}
              >
                <span style={{ color: s.color, fontFamily: C.mono, fontWeight: 800, fontSize: 15, lineHeight: 1 }}>{s.count}</span>
                <span style={{ color: C.t4, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 1 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ margin: 0, color: C.t3, fontSize: 13, lineHeight: 1.65, maxWidth: 640 }}>
          {MARKET_EVENTS.length} major macro events from 1907 to today — documented with causes, index-level impact,
          and recovery data, sourced from official and institutional references.
        </p>
      </div>

      {/* ── Combined timeline chart + event dots ── */}
      <CombinedTimelineChart visibleIds={visibleIds} onSelect={scrollToEvent} />

      {/* ── Record callouts ── */}
      <RecordStrip />

      {/* ── Controls row — sticky ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: C.bg0,
        borderBottom: `1px solid ${C.border}`,
        marginBottom: 18,
        marginLeft: -18,
        marginRight: -18,
        paddingLeft: 18,
        paddingRight: 18,
        paddingTop: 10,
        paddingBottom: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        {/* Left cluster: filter chips + results count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
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
                  onClick={() => { setFilter(value); setSearch('') }}
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
                    transition: 'background .12s, border-color .12s, color .12s',
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

          {/* Results count feedback */}
          <span style={{ color: C.t4, fontSize: 11, whiteSpace: 'nowrap' }}>
            {filtered.length === MARKET_EVENTS.length
              ? `${filtered.length} events`
              : `${filtered.length} of ${MARKET_EVENTS.length}`}
          </span>
        </div>

        {/* Right cluster: search + sort + decade jump */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} strokeWidth={2} color="var(--c-t4)" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} aria-hidden />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setFilter('all') }}
              onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
              placeholder={isMobile ? 'Search…' : 'Search events…'}
              aria-label="Search events"
              style={{
                background: C.bg1,
                border: `1px solid ${search ? C.accentB : C.border}`,
                borderRadius: R.r99,
                color: C.t1,
                fontSize: 12,
                padding: '5px 28px 5px 28px',
                outline: 'none',
                width: isMobile ? 110 : 150,
                transition: 'border-color .15s',
              }}
            />
            {search && (
              <span
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: C.t4, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
              >
                ×
              </span>
            )}
          </div>
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
        <Timeline events={filtered} isMobile={isMobile} onScanClick={scrollToScanner} />
      )}

      {filtered.length > 0 && sortMode === 'severity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((event) => (
            <div key={event.id} id={`event-${event.id}`}>
              <EventCard event={event} onScanClick={scrollToScanner} />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '56px 20px', background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <div style={{ color: C.t2, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No events found</div>
          <div style={{ color: C.t3, fontSize: 13, marginBottom: 16 }}>
            {search ? `No events match "${search}"` : 'No events match this filter'}
          </div>
          <button
            onClick={() => { setFilter('all'); setSearch('') }}
            style={{
              background: C.accentM, border: `1px solid ${C.accentB}`,
              borderRadius: R.r8, color: C.accent,
              cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '7px 18px',
            }}
          >
            Reset filters
          </button>
        </div>
      )}

      {/* ── Stock vs Events Scanner ── */}
      <div ref={scannerRef}>
        <StockScanner />
      </div>

      {/* ── Back to top button ── */}
      {showBackTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Back to top"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 200,
            background: C.accent,
            border: 'none',
            borderRadius: '50%',
            width: 42,
            height: 42,
            color: 'var(--c-fg-on-accent, #fff)',
            cursor: 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 18px rgba(0,0,0,.35)',
          }}
        >
          ↑
        </button>
      )}
    </div>
  )
}
