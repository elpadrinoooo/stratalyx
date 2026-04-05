import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import { C, R } from '../constants/colors'

type Range = '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y'

interface ChartPoint {
  t: number
  p: number
}

interface Props {
  ticker: string
  ivLow: number
  ivHigh: number
  currentPrice: number
}

const RANGES: { label: string; value: Range }[] = [
  { label: '1M',  value: '1mo' },
  { label: '3M',  value: '3mo' },
  { label: '6M',  value: '6mo' },
  { label: '1Y',  value: '1y'  },
  { label: '2Y',  value: '2y'  },
  { label: '5Y',  value: '5y'  },
]

function formatDate(ts: number, range: Range): string {
  const d = new Date(ts)
  if (range === '1mo' || range === '3mo') {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  if (range === '6mo' || range === '1y') {
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
  }
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
}

function formatPrice(p: number): string {
  return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: number
  range: Range
}

function CustomTooltip({ active, payload, label, range }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null
  return (
    <div
      style={{
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: R.r8,
        padding: '7px 11px',
        fontSize: 12,
        color: C.t1,
      }}
    >
      <div style={{ color: C.t3, marginBottom: 2 }}>{formatDate(label, range)}</div>
      <div style={{ fontWeight: 700, fontFamily: C.mono }}>{formatPrice(payload[0].value)}</div>
    </div>
  )
}

export function PriceChart({ ticker, ivLow, ivHigh, currentPrice }: Props) {
  const [range, setRange] = useState<Range>('1y')
  const [points, setPoints] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/history/${encodeURIComponent(ticker)}?range=${range}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load chart data')
        return r.json() as Promise<{ points: ChartPoint[] }>
      })
      .then((d) => { setPoints(d.points); setLoading(false) })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Chart unavailable')
        setLoading(false)
      })
  }, [ticker, range])

  const prices = points.map((p) => p.p)
  const minP   = prices.length ? Math.min(...prices) : 0
  const maxP   = prices.length ? Math.max(...prices) : 0
  const pad    = (maxP - minP) * 0.12 || 10
  const yMin   = Math.max(0, minP - pad)
  const yMax   = maxP + pad

  // Determine line colour based on price change over the period
  const first  = points[0]?.p ?? currentPrice
  const last   = points[points.length - 1]?.p ?? currentPrice
  const isUp   = last >= first
  const lineColor = isUp ? 'var(--c-gain)' : 'var(--c-loss)'

  const hasIV  = ivLow > 0 && ivHigh > 0

  return (
    <div
      style={{
        background: C.bg1,
        border: `1px solid ${C.border}`,
        borderRadius: R.r12,
        padding: '14px 16px 10px',
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ color: C.t3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>
            Price History
          </span>
          {currentPrice > 0 && (
            <span style={{ color: C.warn, fontWeight: 700, fontSize: 15, fontFamily: C.mono }}>
              {formatPrice(currentPrice)}
            </span>
          )}
          {currentPrice > 0 && first > 0 && (
            <span style={{ fontSize: 12, color: isUp ? C.gain : C.loss, fontWeight: 600 }}>
              {isUp ? '+' : ''}{(((last - first) / first) * 100).toFixed(2)}%
            </span>
          )}
        </div>

        {/* Range selector */}
        <div style={{ display: 'flex', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: 2, gap: 1 }}>
          {RANGES.map(({ label, value }) => {
            const active = range === value
            return (
              <button
                key={value}
                onClick={() => setRange(value)}
                style={{
                  background: active ? C.bg1 : 'transparent',
                  border: active ? `1px solid ${C.border}` : '1px solid transparent',
                  borderRadius: R.r6,
                  color: active ? C.t1 : C.t3,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: active ? 700 : 400,
                  padding: '3px 8px',
                  lineHeight: 1.4,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      {hasIV && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.t3 }}>
            <div style={{ width: 20, height: 2, background: 'var(--c-gain)', borderRadius: 1 }} />
            IV Conservative ({formatPrice(ivLow)})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.t3 }}>
            <div style={{ width: 20, height: 2, background: 'var(--c-accent)', borderRadius: 1, opacity: 0.7 }} />
            IV Optimistic ({formatPrice(ivHigh)})
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ height: 200, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.t3, fontSize: 13 }}>
            Loading chart…
          </div>
        )}
        {error && !loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.t3, fontSize: 13 }}>
            {error}
          </div>
        )}
        {!loading && !error && points.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`priceGrad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={lineColor} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--c-border)"
                strokeOpacity={0.5}
                vertical={false}
              />

              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={(v: number) => formatDate(v, range)}
                tick={{ fill: 'var(--c-t3)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={50}
              />

              <YAxis
                domain={[yMin, yMax]}
                tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
                tick={{ fill: 'var(--c-t3)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={52}
              />

              <Tooltip content={<CustomTooltip range={range} />} />

              {/* IV reference lines */}
              {hasIV && (
                <>
                  <ReferenceLine
                    y={ivLow}
                    stroke="var(--c-gain)"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={{ value: `IV Low $${ivLow.toFixed(0)}`, position: 'insideTopRight', fill: 'var(--c-gain)', fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={ivHigh}
                    stroke="var(--c-accent)"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                    label={{ value: `IV High $${ivHigh.toFixed(0)}`, position: 'insideTopRight', fill: 'var(--c-accent)', fontSize: 10 }}
                  />
                </>
              )}

              {/* Current price reference */}
              {currentPrice > 0 && (
                <ReferenceLine
                  y={currentPrice}
                  stroke="var(--c-warn)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              )}

              <Area
                type="monotone"
                dataKey="p"
                stroke={lineColor}
                strokeWidth={2}
                fill={`url(#priceGrad-${ticker})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
