import React, { useState, useEffect } from 'react'
import { C, R } from '../constants/colors'
import { INVESTORS, INV } from '../constants/investors'
import { useApp } from '../state/context'
import { useWatchlist } from '../hooks/useWatchlist'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { useStockList } from '../hooks/useStockList'
import { Tag } from '../components/Tag'
import { WLBtn } from '../components/WLBtn'
import { pegColor, scColor } from '../engine/utils'
import type { Stock } from '../types'

interface Props {
  fmpKeySet: boolean
  onOpenFmpModal: () => void
}

export function ScreenerScreen({ fmpKeySet, onOpenFmpModal }: Props) {
  const { state, dispatch } = useApp()
  const { inWatchlist, toggle } = useWatchlist()
  const { stocks: allStocks, loading: stocksLoading, total: stocksTotal } = useStockList()
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('All')
  const [sortBy, setSortBy] = useState<'default' | 'score' | 'ticker'>('default')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 100
  const [welcomeDismissed, setWelcomeDismissed] = useState(() =>
    localStorage.getItem('stratalyx_welcomed') === '1'
  )
  const width = useWindowWidth()
  const isMobile = width <= 640

  const dismissWelcome = () => {
    localStorage.setItem('stratalyx_welcomed', '1')
    setWelcomeDismissed(true)
  }

  // Mark welcomed after first analysis runs
  useEffect(() => {
    if (Object.keys(state.analyses).length > 0) {
      localStorage.setItem('stratalyx_welcomed', '1')
      setWelcomeDismissed(true)
    }
  }, [state.analyses])

  const inv = INV[state.investor] ?? INVESTORS[0]

  const sectors = ['All', ...Array.from(new Set(allStocks.map((s) => s.sector).filter(Boolean))).sort()]

  const filtered: Stock[] = allStocks
    .filter((s) => {
      const q = search.toLowerCase()
      const matchesSearch = (
        s.ticker.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.sector && s.sector.toLowerCase().includes(q))
      )
      const matchesSector = sectorFilter === 'All' || s.sector === sectorFilter
      return matchesSearch && matchesSector
    })
    .sort((a, b) => {
      if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker)
      if (sortBy === 'score') {
        const ra = state.analyses[`${a.ticker}:${state.investor}`]
        const rb = state.analyses[`${b.ticker}:${state.investor}`]
        const sa = ra?.strategyScore ?? -1
        const sb = rb?.strategyScore ?? -1
        return sb - sa
      }
      return 0
    })

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [search, sectorFilter, sortBy])

  const paginated = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = paginated.length < filtered.length

  const openAnalyzer = (ticker: string) => {
    dispatch({ type: 'OPEN_MODAL', payload: ticker })
  }

  const labelStyle: React.CSSProperties = {
    color: C.t3,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    marginBottom: 8,
  }

  return (
    <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>

      {/* Page title — shown only after welcome dismissed */}
      {welcomeDismissed && (
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ margin: '0 0 2px', color: C.t1, fontSize: 22, fontWeight: 800 }}>Stock Screener</h1>
          <div style={{ color: C.t3, fontSize: 14 }}>Browse and analyse stocks through legendary investor frameworks</div>
        </div>
      )}

      {/* Welcome hero — shown on first visit until dismissed or first analysis runs */}
      {!welcomeDismissed && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,.12) 0%, rgba(16,185,129,.06) 100%)',
            border: `1px solid ${C.accentB}`,
            borderRadius: R.r12,
            padding: isMobile ? '16px 14px' : '20px 24px',
            marginBottom: 16,
            position: 'relative',
          }}
        >
          <button
            onClick={dismissWelcome}
            aria-label="Dismiss welcome"
            style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: C.t3, fontSize: 16, cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
          <div style={{ display: 'flex', gap: isMobile ? 10 : 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ color: C.accent, fontWeight: 800, fontSize: isMobile ? 16 : 18, marginBottom: 6 }}>
                Welcome to Stratalyx.ai
              </div>
              <div style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
                Analyse any stock through the lens of legendary investors — Buffett, Graham, Lynch and more — powered by AI. Pick a stock below and hit <strong style={{ color: C.t1 }}>Analyze</strong> to get started.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['AAPL', 'NVDA', 'TSLA'].map((t) => (
                  <button
                    key={t}
                    onClick={() => { dismissWelcome(); openAnalyzer(t) }}
                    style={{ background: C.accentM, border: `1px solid ${C.accentB}`, borderRadius: R.r8, color: C.accent, fontSize: 13, fontWeight: 700, padding: '6px 14px', cursor: 'pointer', fontFamily: C.mono }}
                  >
                    Try {t}
                  </button>
                ))}
              </div>
            </div>
            {!isMobile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
                {[
                  { icon: '🧠', text: '11 investor frameworks' },
                  { icon: '⚡', text: 'Live FMP financial data' },
                  { icon: '🤖', text: 'Multi-LLM: Gemini & Claude' },
                  { icon: '📊', text: 'Score, verdict & full thesis' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.t2, fontSize: 13 }}>
                    <span>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live data status strip — compact, shown after welcome is dismissed */}
      {welcomeDismissed && (
        fmpKeySet ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.gainBg, border: `1px solid ${C.gainB}`, borderRadius: R.r8, padding: '7px 12px', marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gain, flexShrink: 0 }} />
            <span style={{ color: C.gain, fontWeight: 700, fontSize: 13 }}>Live data active</span>
            <span style={{ color: C.t3, fontSize: 13 }}>— Real-time FMP financials injected into every analysis</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: '7px 12px', marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.t4, flexShrink: 0 }} />
            <span style={{ color: C.t3, fontSize: 13, flex: 1 }}>AI-estimated data mode · <button onClick={onOpenFmpModal} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Add FMP key for live financials</button></span>
          </div>
        )
      )}

      {/* Strategy selector */}
      <div style={labelStyle}>Investor Strategy</div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {INVESTORS.map((i) => {
          const active = i.id === state.investor
          return (
            <button
              key={i.id}
              onClick={() => dispatch({ type: 'SET_INVESTOR', payload: i.id })}
              style={{
                background: active ? i.color + '18' : C.bg2,
                color: active ? i.color : C.t2,
                border: `1px solid ${active ? i.color + '44' : C.border}`,
                borderRadius: R.r8,
                padding: '4px 10px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {i.shortName}
            </button>
          )
        })}
      </div>

      {/* Strategy banner */}
      <div
        style={{
          background: inv.color + '18',
          border: `1px solid ${inv.color}33`,
          borderRadius: R.r12,
          padding: '11px 14px',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: inv.color, fontWeight: 700, fontSize: 15 }}>{inv.name}</span>
              <span style={{ color: C.t3, fontWeight: 400, fontSize: 13, marginLeft: 8 }}>{inv.era}</span>
            </div>
            <div style={{ color: C.t2, fontSize: 13, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 8 }}>
              "{inv.tagline}"
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {inv.rules.slice(0, 4).map((r) => (
                <Tag key={r.id} color={inv.color} small>{r.label}</Tag>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search ticker or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = C.accent }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = C.border }}
          style={{
            flex: isMobile ? '1 1 100%' : '0 0 200px',
            background: C.bg2,
            color: C.t1,
            border: `1px solid ${C.border}`,
            borderRadius: R.r8,
            padding: '7px 12px',
            fontSize: 14,
            outline: 'none',
            fontFamily: C.sans,
            transition: 'border-color .15s',
          }}
        />
        {/* Sort control */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          style={{ background: C.bg2, color: C.t2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: '7px 10px', fontSize: 13, cursor: 'pointer', outline: 'none' }}
        >
          <option value="default">Sort: Default</option>
          <option value="score">Sort: Score ↓</option>
          <option value="ticker">Sort: Ticker A–Z</option>
        </select>
        <button
          onClick={() => openAnalyzer('')}
          style={{
            marginLeft: isMobile ? 0 : 'auto',
            flex: isMobile ? '1 1 100%' : undefined,
            background: C.accent,
            color: 'var(--c-fg-on-accent, #fff)',
            border: 'none',
            borderRadius: R.r8,
            padding: '7px 13px',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Analyze any stock
        </button>
      </div>

      {/* Sector filter chips */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
        {sectors.map((s) => (
          <button
            key={s}
            onClick={() => setSectorFilter(s)}
            style={{
              background: sectorFilter === s ? C.accentM : C.bg2,
              color: sectorFilter === s ? C.accent : C.t3,
              border: `1px solid ${sectorFilter === s ? C.accentB : C.border}`,
              borderRadius: R.r99,
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: sectorFilter === s ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Stock list */}
      <div
        style={{
          background: C.bg1,
          border: `1px solid ${C.border}`,
          borderRadius: R.r12,
          overflow: 'hidden',
        }}
      >
        {isMobile ? (
          /* ── Mobile card list ── */
          <div>
            {paginated.map((stock) => {
              const key = `${stock.ticker}:${state.investor}`
              const result = state.analyses[key]
              return (
                <div
                  key={stock.ticker}
                  style={{ borderBottom: `1px solid ${C.border}`, padding: '10px 14px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <WLBtn ticker={stock.ticker} inWatchlist={inWatchlist(stock.ticker)} onToggle={toggle} />
                      <span style={{ color: C.accent, fontWeight: 700, fontSize: 15, fontFamily: C.mono }}>{stock.ticker}</span>
                      <span style={{ color: C.t2, fontSize: 13 }}>{stock.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {result && <Tag color={pegColor(result.peg)} small>{result.strategyScore}/10</Tag>}
                      <button
                        onClick={() => openAnalyzer(stock.ticker)}
                        style={{ background: C.accentM, border: `1px solid ${C.accentB}`, borderRadius: R.r6, color: C.accent, fontSize: 12, fontWeight: 600, padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {result ? 'Re-analyze' : 'Analyze'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag color={C.t2} small>{stock.sector}</Tag>
                    <span style={{ color: C.t3, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.description}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Desktop table ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {[
                    { label: '', w: 40 },
                    { label: 'Ticker', w: 90 },
                    { label: 'Company', w: 180 },
                    { label: 'Sector', w: 160 },
                    { label: 'Description', w: undefined },
                    { label: 'Score', w: 80 },
                    { label: '', w: 110 },
                  ].map(({ label, w }, i) => (
                    <th
                      key={i}
                      onClick={label === 'Score' ? () => setSortBy(sortBy === 'score' ? 'default' : 'score') : undefined}
                      style={{
                        color: label === 'Score' && sortBy === 'score' ? C.accent : C.t3,
                        padding: '8px 10px',
                        textAlign: label === 'Score' ? 'center' : 'left',
                        fontWeight: 600,
                        fontSize: 11,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        borderBottom: `1px solid ${C.border}`,
                        background: C.bg1,
                        whiteSpace: 'nowrap',
                        width: w,
                        cursor: label === 'Score' ? 'pointer' : 'default',
                        userSelect: 'none',
                      }}
                    >
                      {label}{label === 'Score' && sortBy === 'score' ? ' ↓' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((stock) => {
                  const key = `${stock.ticker}:${state.investor}`
                  const result = state.analyses[key]
                  return (
                    <tr key={stock.ticker} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '8px 6px 8px 10px' }}>
                        <WLBtn ticker={stock.ticker} inWatchlist={inWatchlist(stock.ticker)} onToggle={toggle} />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ color: C.accent, fontWeight: 700, fontSize: 14, fontFamily: C.mono }}>{stock.ticker}</span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ color: C.t1, fontSize: 13 }}>{stock.name}</span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <Tag color={C.t2} small>{stock.sector}</Tag>
                      </td>
                      <td style={{ padding: '8px 10px', maxWidth: 260 }}>
                        <span style={{ color: C.t3, fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.description}</span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {result ? (
                          <span style={{ color: scColor(result.strategyScore), fontWeight: 700, fontSize: 14, fontFamily: C.mono }}>
                            {result.strategyScore}/10
                          </span>
                        ) : (
                          <span style={{ color: C.t4, fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => openAnalyzer(stock.ticker)}
                          style={{ background: result ? C.bg2 : C.accentM, border: `1px solid ${result ? C.border : C.accentB}`, borderRadius: R.r6, color: result ? C.t2 : C.accent, fontSize: 12, fontWeight: 600, padding: '3px 10px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                        >
                          {result ? 'Re-analyze' : 'Analyze'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
            <button
              onClick={() => setPage((p) => p + 1)}
              style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, color: C.t2, fontSize: 13, fontWeight: 600, padding: '7px 20px', cursor: 'pointer' }}
            >
              Load more ({filtered.length - paginated.length} remaining)
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '7px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          <span style={{ color: C.t3, fontSize: 12 }}>
            {stocksLoading && <span style={{ color: C.accent }}>Loading full market… </span>}
            Showing {paginated.length} of {filtered.length}
            {filtered.length !== stocksTotal ? ` filtered` : ''} · {stocksTotal.toLocaleString()} stocks total
            {search ? ` · matching "${search}"` : ''}
            {sectorFilter !== 'All' ? ` · ${sectorFilter}` : ''}
          </span>
          <span style={{ color: C.t4, fontSize: 11 }}>Educational only · Not financial advice</span>
        </div>
      </div>
    </div>
  )
}
