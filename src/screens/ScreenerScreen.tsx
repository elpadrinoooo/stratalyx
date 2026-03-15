import React, { useState } from 'react'
import { C, R } from '../constants/colors'
import { INVESTORS, INV } from '../constants/investors'
import { STOCKS } from '../constants/stocks'
import { useApp } from '../state/context'
import { useWatchlist } from '../hooks/useWatchlist'
import { Tag } from '../components/Tag'
import { WLBtn } from '../components/WLBtn'
import { ProviderModelBar } from '../components/ProviderModelBar'
import { pegColor } from '../engine/utils'
import type { Stock } from '../types'

interface Props {
  fmpKeySet: boolean
  onOpenFmpModal: () => void
}

export function ScreenerScreen({ fmpKeySet, onOpenFmpModal }: Props) {
  const { state, dispatch } = useApp()
  const { inWatchlist, toggle } = useWatchlist()
  const [search, setSearch] = useState('')

  const inv = INV[state.investor] ?? INVESTORS[0]

  const filtered: Stock[] = STOCKS.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.ticker.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q)
    )
  })

  const openAnalyzer = (ticker: string) => {
    dispatch({ type: 'OPEN_MODAL', payload: ticker })
  }

  const labelStyle: React.CSSProperties = {
    color: C.t3,
    fontSize: 9,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    marginBottom: 8,
  }

  return (
    <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>

      {/* FMP Banner */}
      {!fmpKeySet ? (
        <div
          style={{
            background: C.warnBg,
            border: `1px solid ${C.warnB}`,
            borderRadius: R.r10,
            padding: '10px 14px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 14 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <span style={{ color: C.warn, fontWeight: 700, fontSize: 12 }}>Enable Live Data — </span>
            <span style={{ color: C.t2, fontSize: 11 }}>
              Add a free Financial Modeling Prep key to inject real-time financials into every analysis.
            </span>
          </div>
          <button
            onClick={onOpenFmpModal}
            style={{
              background: C.warn,
              color: C.bg0,
              border: 'none',
              borderRadius: R.r8,
              padding: '5px 12px',
              fontWeight: 700,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Enable Live Data
          </button>
        </div>
      ) : (
        <div
          style={{
            background: C.gainBg,
            border: `1px solid ${C.gainB}`,
            borderRadius: R.r10,
            padding: '9px 14px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.gain }} />
          <span style={{ color: C.gain, fontWeight: 700, fontSize: 11 }}>Live data active</span>
          <span style={{ color: C.t2, fontSize: 11 }}>
            — Real-time FMP financials will be injected into every analysis.
          </span>
        </div>
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
                fontSize: 11,
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
              <span style={{ color: inv.color, fontWeight: 700, fontSize: 13 }}>{inv.name}</span>
              <span style={{ color: C.t3, fontWeight: 400, fontSize: 11, marginLeft: 8 }}>{inv.era}</span>
            </div>
            <div style={{ color: C.t2, fontSize: 11, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 8 }}>
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search ticker or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: 180,
            background: C.bg2,
            color: C.t1,
            border: `1px solid ${C.border}`,
            borderRadius: R.r8,
            padding: '7px 12px',
            fontSize: 12,
            outline: 'none',
            fontFamily: C.sans,
          }}
        />
        <ProviderModelBar />
        <button
          onClick={() => openAnalyzer('')}
          style={{
            marginLeft: 'auto',
            background: C.accent,
            color: '#fff',
            border: 'none',
            borderRadius: R.r8,
            padding: '7px 13px',
            fontWeight: 600,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Analyze any stock
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          background: C.bg1,
          border: `1px solid ${C.border}`,
          borderRadius: R.r12,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {['', 'Ticker', 'Company', 'Sector', 'Description', ''].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      color: C.t3,
                      padding: '8px 10px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: 9,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      borderBottom: `1px solid ${C.border}`,
                      background: C.bg1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((stock) => {
                const key = `${stock.ticker}:${state.investor}`
                const result = state.analyses[key]
                return (
                  <tr
                    key={stock.ticker}
                    style={{ borderBottom: `1px solid ${C.border}` }}
                  >
                    {/* Star */}
                    <td style={{ padding: '8px 6px 8px 10px' }}>
                      <WLBtn
                        ticker={stock.ticker}
                        inWatchlist={inWatchlist(stock.ticker)}
                        onToggle={toggle}
                      />
                    </td>
                    {/* Ticker */}
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ color: C.accent, fontWeight: 700, fontSize: 12, fontFamily: C.mono }}>
                        {stock.ticker}
                      </span>
                    </td>
                    {/* Company */}
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ color: C.t1, fontSize: 11 }}>{stock.name}</span>
                    </td>
                    {/* Sector */}
                    <td style={{ padding: '8px 10px' }}>
                      <Tag color={C.t2} small>{stock.sector}</Tag>
                    </td>
                    {/* Description */}
                    <td style={{ padding: '8px 10px', maxWidth: 300 }}>
                      <span style={{ color: C.t3, fontSize: 11 }}>{stock.description}</span>
                    </td>
                    {/* Score & analyze */}
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      {result && (
                        <Tag color={pegColor(result.peg)} small>
                          {result.strategyScore}/10
                        </Tag>
                      )}
                      <button
                        onClick={() => openAnalyzer(stock.ticker)}
                        style={{
                          marginLeft: result ? 6 : 0,
                          background: C.accentM,
                          border: `1px solid ${C.accentB}`,
                          borderRadius: R.r6,
                          color: C.accent,
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '3px 10px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
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

        {/* Footer */}
        <div
          style={{
            padding: '7px 14px',
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: C.t3, fontSize: 10 }}>
            {filtered.length} stock{filtered.length !== 1 ? 's' : ''}
            {search ? ` matching "${search}"` : ''}
          </span>
          <span style={{ color: C.t4, fontSize: 9 }}>Educational only · Not financial advice</span>
        </div>
      </div>
    </div>
  )
}
