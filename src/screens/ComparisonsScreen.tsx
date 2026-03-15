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
    // Mock data for visual preview
    const mockA = { name: 'Warren Buffett', color: '#6366f1', verdict: 'Strong Buy', score: 8 }
    const mockB = { name: 'Benjamin Graham', color: '#10b981', verdict: 'Hold', score: 5 }

    return (
      <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 4px', color: C.t1, fontSize: 22, fontWeight: 800 }}>Strategy Comparisons</h1>
          <div style={{ color: C.t3, fontSize: 14 }}>See how different legendary investors rate the same stock — side by side</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,480px) minmax(0,1fr)', gap: 32, alignItems: 'flex-start' }}>
          {/* Left: instructions */}
          <div>
            <div style={{ fontSize: 17, color: C.t1, fontWeight: 700, marginBottom: 10 }}>How it works</div>
            {[
              { step: '1', title: 'Run an analysis', desc: 'Pick any stock and run an AI analysis with your chosen investor strategy.' },
              { step: '2', title: 'Click "vs" another investor', desc: 'Inside the Analyzer, use the "Compare with another strategy" section to run a second analysis.' },
              { step: '3', title: 'See the comparison', desc: 'Both verdicts and scores appear side by side here, with a score delta to highlight divergence.' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accentM, border: `1px solid ${C.accentB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.accent, fontWeight: 700, fontSize: 13 }}>
                  {step}
                </div>
                <div>
                  <div style={{ color: C.t1, fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{title}</div>
                  <div style={{ color: C.t3, fontSize: 13, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
            <button
              onClick={() => dispatch({ type: 'OPEN_MODAL', payload: 'AAPL' })}
              style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: R.r8, padding: '9px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 4 }}
            >
              Try it with AAPL →
            </button>
          </div>

          {/* Right: visual preview */}
          <div>
            <div style={{ color: C.t3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
              Example comparison
            </div>
            <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, padding: 16, opacity: 0.7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ color: C.accent, fontWeight: 700, fontSize: 16, fontFamily: C.mono }}>AAPL</span>
                  <span style={{ color: C.t3, fontSize: 13, marginLeft: 8 }}>Apple Inc.</span>
                </div>
                <span style={{ color: C.warn, fontFamily: C.mono, fontWeight: 600, fontSize: 14 }}>
                  Score delta: +{mockA.score - mockB.score}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[mockA, mockB].map((m) => (
                  <div key={m.name} style={{ background: m.color + '18', border: `1px solid ${m.color}33`, borderRadius: R.r8, padding: 12 }}>
                    <div style={{ color: m.color, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{m.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: m.verdict === 'Strong Buy' ? '#10b981' : '#f59e0b', fontWeight: 700, fontSize: 14 }}>{m.verdict}</span>
                      <span style={{ color: C.t2, fontFamily: C.mono, fontSize: 14 }}>{m.score}/10</span>
                    </div>
                    <div style={{ height: 6, background: C.bg2, borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${m.score * 10}%`, background: m.color, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ color: C.t4, fontSize: 11, textAlign: 'center', marginTop: 6 }}>Preview only · Run a real comparison to see your results</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h1 style={{ margin: 0, color: C.t1, fontSize: 22, fontWeight: 800 }}>Strategy Comparisons</h1>
        <button
          onClick={() => dispatch({ type: 'CLEAR_COMPARISONS' })}
          style={{
            background: C.bg2,
            border: `1px solid ${C.border}`,
            borderRadius: R.r8,
            color: C.t3,
            fontSize: 13,
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
                  <span style={{ color: C.accent, fontWeight: 700, fontSize: 16, fontFamily: C.mono }}>
                    {comp.ticker}
                  </span>
                  <span style={{ color: C.t3, fontSize: 13, marginLeft: 8 }}>
                    {a.companyName}
                  </span>
                </div>
                <span
                  style={{
                    color: absDiff > 3 ? C.warn : C.t2,
                    fontFamily: C.mono,
                    fontWeight: 600,
                    fontSize: 14,
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
                      <div style={{ color: inv.color, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
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
                        <span style={{ color: vColor(r.verdict), fontWeight: 700, fontSize: 15 }}>
                          {r.verdict}
                        </span>
                        <span style={{ color: C.t2, fontSize: 14, fontFamily: C.mono }}>
                          {r.strategyScore}/10
                        </span>
                      </div>
                      <ScoreBar score={r.strategyScore} color={scColor(r.strategyScore)} />
                      <div style={{ color: C.t3, fontSize: 12, marginTop: 6 }}>
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
