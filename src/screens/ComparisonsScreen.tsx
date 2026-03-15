import React from 'react'
import { C, R } from '../constants/colors'
import { INV } from '../constants/investors'
import { useApp } from '../state/context'
import { ScoreBar } from '../components/ScoreBar'
import { scColor, vColor } from '../engine/utils'

export function ComparisonsScreen() {
  const { state, dispatch } = useApp()
  const { comparisons, analyses } = state

  if (comparisons.length === 0) {
    return (
      <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 14px', color: C.t1, fontSize: 18, fontWeight: 700 }}>
          Strategy Comparisons
        </h2>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 14, color: C.t2, marginBottom: 6 }}>No comparisons yet</div>
          <div style={{ fontSize: 12, color: C.t3 }}>
            Use the "vs" feature in the Analyzer to compare investor frameworks.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, color: C.t1, fontSize: 18, fontWeight: 700 }}>Strategy Comparisons</h2>
        <button
          onClick={() => dispatch({ type: 'CLEAR_COMPARISONS' })}
          style={{
            background: C.bg2,
            border: `1px solid ${C.border}`,
            borderRadius: R.r8,
            color: C.t3,
            fontSize: 11,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          Clear all
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {comparisons.map((comp) => {
          const results = comp.investorIds
            .map((id) => analyses[`${comp.ticker}:${id}`])
            .filter(Boolean)

          if (results.length < 2) return null

          const [a, b] = results
          const diff   = a.strategyScore - b.strategyScore
          const absDiff = Math.abs(diff)

          return (
            <div
              key={comp.id}
              style={{
                background: C.bg1,
                border: `1px solid ${C.border}`,
                borderRadius: R.r12,
                padding: 14,
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
                <div>
                  <span style={{ color: C.accent, fontWeight: 700, fontSize: 14, fontFamily: C.mono }}>
                    {comp.ticker}
                  </span>
                  <span style={{ color: C.t3, fontSize: 11, marginLeft: 8 }}>
                    {a.companyName}
                  </span>
                </div>
                <span
                  style={{
                    color: absDiff > 3 ? C.warn : C.t2,
                    fontFamily: C.mono,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Score delta: {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                </span>
              </div>

              {/* Two-column investor cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {results.map((r) => {
                  const inv = INV[r.investorId]
                  if (!inv) return null
                  return (
                    <div
                      key={r.investorId}
                      style={{
                        background: inv.color + '18',
                        border: `1px solid ${inv.color}33`,
                        borderRadius: R.r8,
                        padding: 12,
                      }}
                    >
                      <div style={{ color: inv.color, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
                        {inv.name}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ color: vColor(r.verdict), fontWeight: 700, fontSize: 13 }}>
                          {r.verdict}
                        </span>
                        <span style={{ color: C.t2, fontSize: 12, fontFamily: C.mono }}>
                          {r.strategyScore}/10
                        </span>
                      </div>
                      <ScoreBar score={r.strategyScore} color={scColor(r.strategyScore)} />
                      <div style={{ color: C.t3, fontSize: 10, marginTop: 6 }}>
                        {r.verdictReason}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
