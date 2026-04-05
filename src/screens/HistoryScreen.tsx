import React, { useState } from 'react'
import { C, R } from '../constants/colors'
import { INV } from '../constants/investors'
import { useApp } from '../state/context'
import { Tag } from '../components/Tag'
import { ScoreBar } from '../components/ScoreBar'
import { LiveBadge } from '../components/LiveBadge'
import { scColor, vColor, verdictLabel } from '../engine/utils'

type Tab = 'active' | 'archived'

export function HistoryScreen() {
  const { state, dispatch } = useApp()
  const [tab, setTab] = useState<Tab>('active')

  const allAnalyses = Object.entries(state.analyses)
  const archivedSet = new Set(state.archived)

  const active   = allAnalyses.filter(([k]) => !archivedSet.has(k)).map(([, v]) => v)
  const archived = allAnalyses.filter(([k]) =>  archivedSet.has(k)).map(([, v]) => v)
  const list     = tab === 'active' ? active : archived
  const sorted   = [...list].sort((a, b) => b.timestamp - a.timestamp)

  const isEmpty = allAnalyses.length === 0

  function archiveKey(result: { ticker: string; investorId: string }) {
    return `${result.ticker}:${result.investorId}`
  }

  if (isEmpty) {
    return (
      <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 4px', color: C.t1, fontSize: 22, fontWeight: 800 }}>Analysis History</h1>
          <div style={{ color: C.t3, fontSize: 14 }}>Every AI analysis you run is saved here for quick reference</div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 18, color: C.t1, fontWeight: 700, marginBottom: 8 }}>No analyses yet</div>
          <div style={{ fontSize: 14, color: C.t3, marginBottom: 6, maxWidth: 380, margin: '0 auto 6px' }}>
            Run your first AI analysis and it will appear here. Each analysis is saved so you can revisit and compare over time.
          </div>
          <div style={{ fontSize: 13, color: C.t4, marginBottom: 24 }}>Try: AAPL, MSFT, NVDA, TSLA, BRK.B</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['AAPL', 'NVDA', 'MSFT'].map((ticker) => (
              <button
                key={ticker}
                onClick={() => dispatch({ type: 'OPEN_MODAL', payload: ticker })}
                style={{ background: C.accentM, border: `1px solid ${C.accentB}`, borderRadius: R.r8, color: C.accent, fontSize: 13, fontWeight: 700, padding: '8px 18px', cursor: 'pointer', fontFamily: C.mono }}
              >
                Analyze {ticker}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ margin: 0, color: C.t1, fontSize: 22, fontWeight: 800 }}>Analysis History</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: 2, gap: 1 }}>
          {(['active', 'archived'] as Tab[]).map((t) => {
            const count = t === 'active' ? active.length : archived.length
            const isActive = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: isActive ? C.bg1 : 'transparent',
                  border: isActive ? `1px solid ${C.border}` : '1px solid transparent',
                  borderRadius: R.r6,
                  color: isActive ? C.t1 : C.t3,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 400,
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {t === 'active' ? 'Active' : 'Archived'}
                <span
                  style={{
                    background: isActive ? C.accentM : C.bg0,
                    border: `1px solid ${isActive ? C.accentB : C.border}`,
                    borderRadius: 10,
                    color: isActive ? C.accent : C.t4,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 5px',
                    lineHeight: 1.4,
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Empty state for current tab */}
      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.t3 }}>
          {tab === 'active' ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.t2, marginBottom: 4 }}>All analyses archived</div>
              <div style={{ fontSize: 13 }}>Switch to the Archived tab to view them.</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🗄️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.t2, marginBottom: 4 }}>No archived analyses</div>
              <div style={{ fontSize: 13 }}>Archive analyses from the Active tab to tidy up your history.</div>
            </>
          )}
        </div>
      )}

      {/* Grid */}
      {sorted.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
            gap: 10,
          }}
        >
          {sorted.map((result) => {
            const key = archiveKey(result)
            const inv = INV[result.investorId]
            const date = new Date(result.timestamp).toLocaleDateString()
            const isArchived = archivedSet.has(key)

            return (
              <div
                key={key}
                style={{
                  background: C.bg1,
                  border: `1px solid ${C.border}`,
                  borderRadius: R.r12,
                  padding: 14,
                  opacity: isArchived ? 0.7 : 1,
                  position: 'relative',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => dispatch({ type: 'OPEN_MODAL', payload: result.ticker })}
                  >
                    <div style={{ color: C.accent, fontWeight: 700, fontSize: 16, fontFamily: C.mono }}>
                      {result.ticker}
                    </div>
                    <div style={{ color: C.t3, fontSize: 12, marginTop: 2 }}>{result.companyName}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Tag color={vColor(result.verdict)} small>{verdictLabel(result.verdict)}</Tag>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ color: C.t3, fontSize: 12 }}>Score {result.strategyScore}/10</span>
                  <span style={{ color: C.t4, fontSize: 11 }}>{date}</span>
                </div>

                {/* Archive / Restore button */}
                <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 8, display: 'flex', gap: 6 }}>
                  {!isArchived ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        dispatch({ type: 'ARCHIVE_ANALYSIS', payload: key })
                        dispatch({ type: 'TOAST', payload: { message: `${result.ticker} archived`, type: 'info' } })
                      }}
                      title="Move to archive"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: `1px solid ${C.border}`,
                        borderRadius: R.r6,
                        color: C.t3,
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 8px',
                      }}
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        dispatch({ type: 'UNARCHIVE_ANALYSIS', payload: key })
                        dispatch({ type: 'TOAST', payload: { message: `${result.ticker} restored`, type: 'success' } })
                      }}
                      title="Restore to active"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: `1px solid ${C.accentB}`,
                        borderRadius: R.r6,
                        color: C.accent,
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 8px',
                      }}
                    >
                      Restore
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Delete ${result.ticker} (${inv?.shortName ?? result.investorId}) analysis? This cannot be undone.`)) {
                        dispatch({ type: 'CLEAR_ANALYSIS', payload: key })
                        dispatch({ type: 'UNARCHIVE_ANALYSIS', payload: key })
                        dispatch({ type: 'TOAST', payload: { message: `${result.ticker} analysis deleted`, type: 'info' } })
                      }
                    }}
                    title="Delete permanently"
                    style={{
                      background: 'transparent',
                      border: `1px solid ${C.border}`,
                      borderRadius: R.r6,
                      color: C.t4,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 8px',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
