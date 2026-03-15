import React from 'react'
import { C, R } from '../constants/colors'
import { INV } from '../constants/investors'
import { useApp } from '../state/context'
import { Tag } from '../components/Tag'
import { ScoreBar } from '../components/ScoreBar'
import { LiveBadge } from '../components/LiveBadge'
import { scColor, vColor } from '../engine/utils'

export function HistoryScreen() {
  const { state, dispatch } = useApp()
  const analyses = Object.values(state.analyses)

  if (analyses.length === 0) {
    return (
      <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 14px', color: C.t1, fontSize: 18, fontWeight: 700 }}>
          Analysis History
        </h2>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 14, color: C.t2, marginBottom: 6 }}>No analyses yet</div>
          <div style={{ fontSize: 12, color: C.t3 }}>
            Run your first analysis from the Screener or the Analyze button.
          </div>
        </div>
      </div>
    )
  }

  const sorted = [...analyses].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 14px', color: C.t1, fontSize: 18, fontWeight: 700 }}>
        Analysis History
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
          gap: 10,
        }}
      >
        {sorted.map((result) => {
          const inv = INV[result.investorId]
          const date = new Date(result.timestamp).toLocaleDateString()
          return (
            <div
              key={`${result.ticker}:${result.investorId}`}
              onClick={() => dispatch({ type: 'OPEN_MODAL', payload: result.ticker })}
              style={{
                background: C.bg1,
                border: `1px solid ${C.border}`,
                borderRadius: R.r12,
                padding: 14,
                cursor: 'pointer',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ color: C.accent, fontWeight: 700, fontSize: 14, fontFamily: C.mono }}>
                    {result.ticker}
                  </div>
                  <div style={{ color: C.t3, fontSize: 10, marginTop: 2 }}>{result.companyName}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <Tag color={vColor(result.verdict)} small>{result.verdict}</Tag>
                  <LiveBadge live={result.isLive} />
                </div>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                {inv && <Tag color={inv.color} small>{inv.shortName}</Tag>}
              </div>

              {/* Score bar */}
              <ScoreBar score={result.strategyScore} color={scColor(result.strategyScore)} />

              {/* Bottom row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ color: C.t3, fontSize: 10 }}>Score {result.strategyScore}/10</span>
                <span style={{ color: C.t4, fontSize: 9 }}>{date}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
