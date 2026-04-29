import React, { useState, useEffect } from 'react'
import { C, R } from '../constants/colors'
import { INVESTORS, INV } from '../constants/investors'
import { useApp } from '../state/context'
import { useWatchlist } from '../hooks/useWatchlist'
import { track } from '../lib/analytics'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { useStockList } from '../hooks/useStockList'
import { useMarketSnapshot, type SnapshotRow } from '../hooks/useMarketSnapshot'
import { Tag } from '../components/Tag'
import { WLBtn } from '../components/WLBtn'
import { Skeleton } from '../components/Skeleton'
import { pegColor, scColor } from '../engine/utils'
import type { Stock } from '../types'

export function ScreenerScreen() {
  const { state, dispatch } = useApp()
  const { inWatchlist, toggle } = useWatchlist()
  const { stocks: allStocks, loading: stocksLoading, total: stocksTotal } = useStockList()
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('All')
  // 'default' / 'score' / 'ticker' filter the cached static list. The three
  // 'live-*' modes swap to /api/market-snapshot data refreshed every 60s.
  type SortMode = 'default' | 'score' | 'ticker' | 'live-gainers' | 'live-losers' | 'live-active'
  const [sortBy, setSortBy] = useState<SortMode>('default')
  const isLiveMode = sortBy === 'live-gainers' || sortBy === 'live-losers' || sortBy === 'live-active'
  const { state: snapshotState } = useMarketSnapshot(isLiveMode)
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
      // One-time UI flag flip in response to external state — not a render loop.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWelcomeDismissed(true)
    }
  }, [state.analyses])

  const inv = INV[state.investor] ?? INVESTORS[0]

  // Live-mode rows from /api/market-snapshot — picked by which sort mode is active.
  // We track them as Stock[] so the existing render code stays unchanged; price
  // and change% live in a parallel map keyed by ticker.
  const liveRows: SnapshotRow[] = (() => {
    if (snapshotState.kind !== 'ready' && snapshotState.kind !== 'error') return []
    const data = snapshotState.kind === 'ready' ? snapshotState.data : snapshotState.data
    if (!data) return []
    if (sortBy === 'live-gainers') return data.gainers
    if (sortBy === 'live-losers')  return data.losers
    if (sortBy === 'live-active')  return data.mostActive
    return []
  })()
  // Index live data by ticker for the price/change% column lookup.
  const liveByTicker = new Map(liveRows.map((r) => [r.symbol, r]))
  const liveAsStocks: Stock[] = liveRows.map((r) => ({
    ticker: r.symbol,
    name:   r.name,
    sector: '',
    description: '',
  }))

  // Sector filter only makes sense for the static catalog — live rows don't
  // carry sector metadata. Hide the chips in live mode (handled in JSX below).
  const sectors = ['All', ...Array.from(new Set(allStocks.map((s) => s.sector).filter(Boolean))).sort()]

  const baseList: Stock[] = isLiveMode ? liveAsStocks : allStocks
  const filtered: Stock[] = baseList
    .filter((s) => {
      const q = search.toLowerCase()
      const matchesSearch = (
        s.ticker.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.sector && s.sector.toLowerCase().includes(q))
      )
      // Sector filter is a no-op for live rows (sector unknown).
      const matchesSector = isLiveMode || sectorFilter === 'All' || s.sector === sectorFilter
      return matchesSearch && matchesSector
    })
    .sort((a, b) => {
      // Live modes preserve the FMP-returned order (already ranked by % change
      // / volume). Don't re-sort or you'd undo the ranking.
      if (isLiveMode) return 0
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

  // Reset to page 1 when filters change — derives pagination from filter state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
                  { icon: '🧠', text: '22 investor frameworks' },
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
        state.user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.gainBg, border: `1px solid ${C.gainB}`, borderRadius: R.r8, padding: '7px 12px', marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gain, flexShrink: 0 }} />
            <span style={{ color: C.gain, fontWeight: 700, fontSize: 13 }}>Live data active</span>
            <span style={{ color: C.t3, fontSize: 13 }}>— Real-time FMP financials injected into every analysis</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: '7px 12px', marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.t4, flexShrink: 0 }} />
            <span style={{ color: C.t3, fontSize: 13, flex: 1 }}>AI-estimated data mode · <button onClick={() => window.dispatchEvent(new CustomEvent('stratalyx:request-auth'))} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Sign in for live financials</button></span>
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
              onClick={() => { track('framework_selected', { investor_id: i.id }); dispatch({ type: 'SET_INVESTOR', payload: i.id }) }}
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
          aria-label="Filter screener by ticker or company"
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
          onChange={(e) => setSortBy(e.target.value as SortMode)}
          style={{ background: C.bg2, color: C.t2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: '7px 10px', fontSize: 13, cursor: 'pointer', outline: 'none' }}
        >
          <optgroup label="Catalog">
            <option value="default">Sort: Default</option>
            <option value="score">Sort: Score ↓</option>
            <option value="ticker">Sort: Ticker A–Z</option>
          </optgroup>
          <optgroup label="Live · 1-min refresh">
            <option value="live-gainers">Top Gainers</option>
            <option value="live-losers">Top Losers</option>
            <option value="live-active">Most Active</option>
          </optgroup>
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

      {/* Sector filter chips — hidden in live mode (FMP movers don't carry sector) */}
      {!isLiveMode && (
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
      )}

      {/* Live-mode status strip — auto-refresh every 60s, surface unauth + errors */}
      {isLiveMode && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            background: snapshotState.kind === 'error'  ? C.lossBg
                      : snapshotState.kind === 'unauth' ? C.bg1
                      : C.gainBg,
            border: `1px solid ${
              snapshotState.kind === 'error'  ? C.lossB
            : snapshotState.kind === 'unauth' ? C.border
            : C.gainB}`,
            borderRadius: R.r8, padding: '7px 12px', marginBottom: 12,
          }}
        >
          {snapshotState.kind === 'unauth' ? (
            <span style={{ color: C.t3, fontSize: 13 }}>
              Sign in to unlock live market data —{' '}
              <button onClick={() => window.dispatchEvent(new CustomEvent('stratalyx:request-auth'))}
                style={{ background: 'none', border: 'none', color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                sign in
              </button>
            </span>
          ) : snapshotState.kind === 'loading' ? (
            <span style={{ color: C.accent, fontSize: 13, fontWeight: 600 }}>Loading live market data…</span>
          ) : (
            <>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: snapshotState.kind === 'error' ? C.loss : C.gain, flexShrink: 0 }} />
              <span style={{ color: snapshotState.kind === 'error' ? C.loss : C.gain, fontSize: 13, fontWeight: 700 }}>
                {snapshotState.kind === 'error' ? 'Live data error' : 'Live'}
              </span>
              <span style={{ color: C.t3, fontSize: 12 }}>
                · refreshes every 60s
                {('lastUpdated' in snapshotState && snapshotState.lastUpdated)
                  ? ` · last update ${snapshotState.lastUpdated.toLocaleTimeString()}`
                  : ''}
                {snapshotState.kind === 'error' ? ` · ${snapshotState.message}` : ''}
              </span>
            </>
          )}
        </div>
      )}

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
              const live = liveByTicker.get(stock.ticker)
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
                      {live && (
                        <span style={{ fontSize: 12, fontFamily: C.mono, color: live.changesPercentage >= 0 ? C.gain : C.loss, fontWeight: 700 }}>
                          {live.changesPercentage >= 0 ? '+' : ''}{live.changesPercentage.toFixed(2)}%
                        </span>
                      )}
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
                    {live ? (
                      <span style={{ color: C.t2, fontSize: 12, fontFamily: C.mono }}>${live.price.toFixed(2)}</span>
                    ) : (
                      <Tag color={C.t2} small>{stock.sector}</Tag>
                    )}
                    {!live && <span style={{ color: C.t3, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.description}</span>}
                  </div>
                </div>
              )
            })}
            {stocksLoading && Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} style={{ borderBottom: `1px solid ${C.border}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Skeleton h={14} />
                </div>
                <Skeleton h={10} />
              </div>
            ))}
          </div>
        ) : (
          /* ── Desktop table ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {(isLiveMode
                    ? [
                        { label: '', w: 40 },
                        { label: 'Ticker', w: 90 },
                        { label: 'Company', w: 240 },
                        { label: 'Price', w: 100 },
                        { label: 'Change %', w: 110 },
                        { label: 'Score', w: 80 },
                        { label: '', w: 110 },
                      ]
                    : [
                        { label: '', w: 40 },
                        { label: 'Ticker', w: 90 },
                        { label: 'Company', w: 180 },
                        { label: 'Sector', w: 160 },
                        { label: 'Description', w: undefined },
                        { label: 'Score', w: 80 },
                        { label: '', w: 110 },
                      ]
                  ).map(({ label, w }, i) => (
                    <th
                      key={i}
                      onClick={label === 'Score' && !isLiveMode ? () => setSortBy(sortBy === 'score' ? 'default' : 'score') : undefined}
                      style={{
                        color: label === 'Score' && sortBy === 'score' ? C.accent : C.t3,
                        padding: '8px 10px',
                        textAlign: (label === 'Score' || label === 'Price' || label === 'Change %') ? 'center' : 'left',
                        fontWeight: 600,
                        fontSize: 11,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        borderBottom: `1px solid ${C.border}`,
                        background: C.bg1,
                        whiteSpace: 'nowrap',
                        width: w,
                        cursor: label === 'Score' && !isLiveMode ? 'pointer' : 'default',
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
                  const live = liveByTicker.get(stock.ticker)
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
                      {isLiveMode ? (
                        <>
                          <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span style={{ color: C.t1, fontSize: 13, fontFamily: C.mono }}>
                              {live ? `$${live.price.toFixed(2)}` : '—'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {live ? (
                              <span style={{ color: live.changesPercentage >= 0 ? C.gain : C.loss, fontWeight: 700, fontSize: 13, fontFamily: C.mono }}>
                                {live.changesPercentage >= 0 ? '+' : ''}{live.changesPercentage.toFixed(2)}%
                              </span>
                            ) : (
                              <span style={{ color: C.t4, fontSize: 13 }}>—</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '8px 10px' }}>
                            <Tag color={C.t2} small>{stock.sector}</Tag>
                          </td>
                          <td style={{ padding: '8px 10px', maxWidth: 260 }}>
                            <span style={{ color: C.t3, fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.description}</span>
                          </td>
                        </>
                      )}
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
                {stocksLoading && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px 6px 10px 10px' }}><Skeleton h={16} /></td>
                    <td style={{ padding: '10px 10px' }}><Skeleton h={14} /></td>
                    <td style={{ padding: '10px 10px' }}><Skeleton h={14} /></td>
                    <td style={{ padding: '10px 10px' }}><Skeleton h={14} /></td>
                    <td style={{ padding: '10px 10px' }}><Skeleton h={14} /></td>
                    <td style={{ padding: '10px 10px' }}><Skeleton h={14} /></td>
                    <td style={{ padding: '10px 10px' }}><Skeleton h={14} /></td>
                  </tr>
                ))}
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
