import React, { useState } from 'react'
import { C, R } from '../constants/colors'
import { STOCKS } from '../constants/stocks'
import { INV, INVESTORS } from '../constants/investors'
import { useApp } from '../state/context'
import { useWatchlist } from '../hooks/useWatchlist'
import { Tag } from '../components/Tag'
import { WLBtn } from '../components/WLBtn'
import { ScoreBar } from '../components/ScoreBar'
import { LiveBadge } from '../components/LiveBadge'
import { TickerLogo } from '../components/TickerLogo'
import { pegColor, scColor, vColor, verdictLabel } from '../engine/utils'

export function WatchlistScreen() {
  const { state, dispatch } = useApp()
  const { watchlist, toggle } = useWatchlist()
  const inv = INV[state.investor] ?? INVESTORS[0]

  const watchedStocks = STOCKS.filter((s) => watchlist.includes(s.ticker))
    .concat(
      // Include any tickers in watchlist not in STOCKS
      watchlist
        .filter((t) => !STOCKS.find((s) => s.ticker === t))
        .map((t) => ({ ticker: t, name: t, sector: '', description: '' }))
    )

  // Must be declared before any early return to satisfy Rules of Hooks
  const [showAllInvestors, setShowAllInvestors] = useState(false)

  const SUGGESTED = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'BRK.B', 'AMZN']
  const suggestedStocks = STOCKS.filter((s) => SUGGESTED.includes(s.ticker)).slice(0, 6)

  if (watchlist.length === 0) {
    return (
      <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 4px', color: C.t1, fontSize: 22, fontWeight: 800 }}>Watchlist</h1>
          <div style={{ color: C.t3, fontSize: 14 }}>Track and analyse your favourite stocks in one place</div>
        </div>

        {/* Empty state hero */}
        <div style={{ textAlign: 'center', padding: '32px 0 24px', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>☆</div>
          <div style={{ fontSize: 18, color: C.t1, fontWeight: 700, marginBottom: 6 }}>Your watchlist is empty</div>
          <div style={{ fontSize: 14, color: C.t3, marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
            Star stocks to track them here, or start with one of these popular picks:
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'Screener' })}
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: R.r8, color: C.t2, fontSize: 13, padding: '6px 14px', cursor: 'pointer' }}
          >
            Browse all stocks →
          </button>
        </div>

        {/* Suggested stocks */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: C.t3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            Popular stocks to get started
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
            {suggestedStocks.map((stock) => (
              <div
                key={stock.ticker}
                style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
              >
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <TickerLogo ticker={stock.ticker} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ color: C.accent, fontWeight: 700, fontSize: 15, fontFamily: C.mono }}>{stock.ticker}</span>
                      <Tag color={C.t3} small>{stock.sector}</Tag>
                    </div>
                    <div style={{ color: C.t2, fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => toggle(stock.ticker)}
                    title="Add to watchlist"
                    style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r6, color: C.t2, fontSize: 13, padding: '4px 9px', cursor: 'pointer' }}
                  >
                    ☆
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'OPEN_MODAL', payload: stock.ticker })}
                    style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: R.r6, fontSize: 12, fontWeight: 600, padding: '4px 10px', cursor: 'pointer' }}
                  >
                    Analyze
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const PILL_LIMIT = 8

  const labelStyle: React.CSSProperties = {
    color: C.t3,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
  }

  return (
    <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: '0 0 2px', color: C.t1, fontSize: 22, fontWeight: 800 }}>Watchlist</h1>
          <div style={{ color: C.t3, fontSize: 14 }}>{watchlist.length} stock{watchlist.length !== 1 ? 's' : ''} tracked</div>
        </div>
      </div>

      {/* Investor pills */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(showAllInvestors ? INVESTORS : INVESTORS.slice(0, PILL_LIMIT)).map((i) => {
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
          {INVESTORS.length > PILL_LIMIT && (
            <button
              onClick={() => setShowAllInvestors((x) => !x)}
              style={{
                background: 'none',
                border: `1px dashed ${C.border}`,
                borderRadius: R.r8,
                color: C.t3,
                fontSize: 12,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              {showAllInvestors ? `− Hide` : `+${INVESTORS.length - PILL_LIMIT} more`}
            </button>
          )}
        </div>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
        {watchedStocks.map((stock) => {
          const key = `${stock.ticker}:${state.investor}`
          const result = state.analyses[key]
          return (
            <div
              key={stock.ticker}
              style={{
                background: C.bg1,
                border: `1px solid ${C.border}`,
                borderRadius: R.r12,
                overflow: 'hidden',
              }}
            >
              {/* Card header */}
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TickerLogo ticker={stock.ticker} size={36} />
                  <div>
                    <span style={{ color: C.accent, fontWeight: 700, fontSize: 17, fontFamily: C.mono }}>
                      {stock.ticker}
                    </span>
                    {result?.moat && (
                      <span style={{ marginLeft: 6 }}>
                        <Tag color={C.gain} small>{result.moat}</Tag>
                      </span>
                    )}
                    <div style={{ color: C.t2, fontSize: 13, marginTop: 2 }}>{stock.name}</div>
                    {stock.sector && <div style={{ color: C.t3, fontSize: 12, marginTop: 1 }}>{stock.sector}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <WLBtn ticker={stock.ticker} inWatchlist={true} onToggle={toggle} />
                  {result && <Tag color={vColor(result.verdict)} small>{verdictLabel(result.verdict)}</Tag>}
                </div>
              </div>

              {/* Metrics strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: `1px solid ${C.border}` }}>
                {[
                  { label: 'P/E',  value: result ? result.pe.toFixed(1)     : '—', color: C.t1 },
                  { label: 'PEG',  value: result ? result.peg.toFixed(1)    : '—', color: result ? pegColor(result.peg) : C.t3 },
                  { label: 'Div',  value: result ? result.div.toFixed(1)+'%': '—', color: result ? C.gain : C.t3 },
                  { label: 'Score',value: result ? `${result.strategyScore}/10` : '—', color: result ? scColor(result.strategyScore) : C.t3 },
                ].map(({ label, value, color }, i) => (
                  <div
                    key={label}
                    style={{
                      padding: '8px 10px',
                      borderRight: i < 3 ? `1px solid ${C.border}` : 'none',
                    }}
                  >
                    <div style={{ ...labelStyle, marginBottom: 2 }}>{label}</div>
                    <div style={{ color, fontSize: 13, fontFamily: C.mono, fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Analysis section */}
              {result ? (
                <div style={{ padding: '12px 14px' }}>
                  {result.isLive && <div style={{ marginBottom: 8 }}><LiveBadge live={true} /></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: C.t3, fontSize: 12, fontWeight: 600 }}>Strategy score</span>
                    <span style={{ color: C.t2, fontSize: 12, fontFamily: C.mono }}>{result.strategyScore}/10</span>
                  </div>
                  <ScoreBar score={result.strategyScore} color={scColor(result.strategyScore)} />
                  <div style={{ color: C.t3, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
                    {result.verdictReason}
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'OPEN_MODAL', payload: stock.ticker })}
                    style={{
                      marginTop: 10,
                      width: '100%',
                      background: C.accentM,
                      border: `1px solid ${C.accentB}`,
                      borderRadius: R.r8,
                      color: C.accent,
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '6px 0',
                      cursor: 'pointer',
                    }}
                  >
                    Re-analyze
                  </button>
                </div>
              ) : (
                <div style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ color: C.t3, fontSize: 13, marginBottom: 10 }}>
                    Not yet analyzed with {inv.shortName}
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'OPEN_MODAL', payload: stock.ticker })}
                    style={{
                      width: '100%',
                      background: C.accent,
                      color: '#fff',
                      border: 'none',
                      borderRadius: R.r8,
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '7px 0',
                      cursor: 'pointer',
                    }}
                  >
                    Analyze
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
