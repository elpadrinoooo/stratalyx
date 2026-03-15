import React from 'react'
import { C, R } from '../constants/colors'
import { STOCKS } from '../constants/stocks'
import { INV, INVESTORS } from '../constants/investors'
import { useApp } from '../state/context'
import { useWatchlist } from '../hooks/useWatchlist'
import { Tag } from '../components/Tag'
import { WLBtn } from '../components/WLBtn'
import { ScoreBar } from '../components/ScoreBar'
import { LiveBadge } from '../components/LiveBadge'
import { ProviderModelBar } from '../components/ProviderModelBar'
import { pegColor, scColor, vColor } from '../engine/utils'

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

  if (watchlist.length === 0) {
    return (
      <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ margin: '0 0 2px', color: C.t1, fontSize: 18, fontWeight: 700 }}>Watchlist</h2>
            <div style={{ color: C.t3, fontSize: 14 }}>Track your favourite stocks</div>
          </div>
          <ProviderModelBar />
        </div>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>☆</div>
          <div style={{ fontSize: 16, color: C.t2, marginBottom: 6 }}>Your watchlist is empty</div>
          <div style={{ fontSize: 14, color: C.t3, marginBottom: 20 }}>
            Star any stock in the Screener to add it here.
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'Screener' })}
            style={{
              background: C.accent,
              color: '#fff',
              border: 'none',
              borderRadius: R.r8,
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Go to Screener
          </button>
        </div>
      </div>
    )
  }

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
          <h2 style={{ margin: '0 0 2px', color: C.t1, fontSize: 18, fontWeight: 700 }}>Watchlist</h2>
          <div style={{ color: C.t3, fontSize: 14 }}>{watchlist.length} stock{watchlist.length !== 1 ? 's' : ''} tracked</div>
        </div>
        <ProviderModelBar />
      </div>

      {/* Investor pills */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <WLBtn ticker={stock.ticker} inWatchlist={true} onToggle={toggle} />
                  {result && <Tag color={vColor(result.verdict)} small>{result.verdict}</Tag>}
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
