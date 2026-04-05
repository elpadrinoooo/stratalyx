import React, { useState } from 'react'
import { C, R } from '../constants/colors'
import { INV } from '../constants/investors'
import { useApp } from '../state/context'
import { ScoreBar } from '../components/ScoreBar'
import { Tag } from '../components/Tag'
import { TickerLogo } from '../components/TickerLogo'
import { scColor, vColor, verdictLabel, fmtN, fmtB } from '../engine/utils'
import type { AnalysisResult } from '../types'

type Tab    = 'active' | 'archived'
type SortBy = 'date' | 'ticker' | 'divergence'

// ── helpers ─────────────────────────────────────────────────────────────────

function formatPrice(p: number): string {
  return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function consensusLabel(a: AnalysisResult, b: AnalysisResult): { label: string; color: string } {
  if (a.verdict === b.verdict) {
    const color = vColor(a.verdict)
    return { label: `Consensus: ${verdictLabel(a.verdict)}`, color }
  }
  const hasAvoid = a.verdict === 'AVOID' || b.verdict === 'AVOID'
  const hasBuy   = a.verdict === 'BUY'   || b.verdict === 'BUY'
  if (hasAvoid && hasBuy) return { label: 'Split: Strong Divergence', color: C.loss }
  return { label: 'Split: Mixed Signals', color: C.warn }
}

function MetricPill({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: R.r8,
        padding: '5px 10px',
        minWidth: 54,
      }}
    >
      <span style={{ color: C.t4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</span>
      <span style={{ color: C.t1, fontSize: 13, fontWeight: 700, fontFamily: C.mono, marginTop: 1 }}>{value}</span>
    </div>
  )
}

// ── main component ───────────────────────────────────────────────────────────

export function ComparisonsScreen() {
  const { state, dispatch } = useApp()
  const { comparisons, analyses } = state
  const [tab,    setTab]    = useState<Tab>('active')
  const [sortBy, setSortBy] = useState<SortBy>('date')

  // ── empty state (no comparisons at all) ──────────────────────────────────
  if (comparisons.length === 0) {
    const mockA = { name: 'Warren Buffett',  color: '#6366f1', verdict: 'BUY'  as const, score: 8 }
    const mockB = { name: 'Benjamin Graham', color: '#10b981', verdict: 'HOLD' as const, score: 5 }

    return (
      <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 4px', color: C.t1, fontSize: 22, fontWeight: 800 }}>Strategy Comparisons</h1>
          <div style={{ color: C.t3, fontSize: 14 }}>See how different legendary investors rate the same stock — side by side</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,480px) minmax(0,1fr)', gap: 32, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 17, color: C.t1, fontWeight: 700, marginBottom: 10 }}>How it works</div>
            {[
              { step: '1', title: 'Run an analysis', desc: 'Pick any stock and run an AI analysis with your chosen investor strategy.' },
              { step: '2', title: 'Compare with another investor', desc: 'Inside the Analyzer, use the "Compare with another strategy" section to run a second analysis.' },
              { step: '3', title: 'See the comparison', desc: 'Both verdicts, scores, and key metrics appear side by side here, with a score delta to highlight divergence.' },
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
              style={{ background: C.accent, color: 'var(--c-fg-on-accent, #fff)', border: 'none', borderRadius: R.r8, padding: '9px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 4 }}
            >
              Try it with AAPL →
            </button>
          </div>

          <div>
            <div style={{ color: C.t3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
              Example comparison
            </div>
            <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, padding: 16, opacity: 0.7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div>
                  <span style={{ color: C.accent, fontWeight: 700, fontSize: 16, fontFamily: C.mono }}>AAPL</span>
                  <span style={{ color: C.t3, fontSize: 13, marginLeft: 8 }}>Apple Inc.</span>
                </div>
                <Tag color={C.warn} small>Split: Mixed Signals</Tag>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {['PE: 28.4', 'PEG: 2.1', 'Margin: 26%', 'FCF: $90B'].map((m) => (
                  <span key={m} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r6, color: C.t3, fontSize: 11, padding: '2px 7px' }}>{m}</span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[mockA, mockB].map((m) => (
                  <div key={m.name} style={{ background: m.color + '18', border: `1px solid ${m.color}33`, borderRadius: R.r8, padding: 12 }}>
                    <div style={{ color: m.color, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{m.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: vColor(m.verdict), fontWeight: 700, fontSize: 13 }}>{verdictLabel(m.verdict)}</span>
                      <span style={{ color: C.t2, fontFamily: C.mono, fontSize: 13 }}>{m.score}/10</span>
                    </div>
                    <ScoreBar score={m.score} color={m.color} />
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

  // ── main view ─────────────────────────────────────────────────────────────
  const archivedSet = new Set(state.archivedComparisons)
  const active   = comparisons.filter((c) => !archivedSet.has(c.id))
  const archived = comparisons.filter((c) =>  archivedSet.has(c.id))
  const pool     = tab === 'active' ? active : archived

  // sort
  const sorted = [...pool].sort((x, y) => {
    if (sortBy === 'ticker') return x.ticker.localeCompare(y.ticker)
    if (sortBy === 'divergence') {
      const ra = x.investorIds.map((id) => analyses[`${x.ticker}:${id}`]).filter(Boolean)
      const rb = y.investorIds.map((id) => analyses[`${y.ticker}:${id}`]).filter(Boolean)
      const da = ra.length >= 2 ? Math.abs(ra[0].strategyScore - ra[1].strategyScore) : 0
      const db = rb.length >= 2 ? Math.abs(rb[0].strategyScore - rb[1].strategyScore) : 0
      return db - da
    }
    return y.timestamp - x.timestamp
  })

  return (
    <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: '0 0 2px', color: C.t1, fontSize: 22, fontWeight: 800 }}>Strategy Comparisons</h1>
          <div style={{ color: C.t3, fontSize: 13 }}>
            {active.length} active · {archived.length} archived
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Sort */}
          <div style={{ display: 'flex', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: 2, gap: 1 }}>
            {(['date', 'ticker', 'divergence'] as SortBy[]).map((s) => {
              const labels: Record<SortBy, string> = { date: 'Date', ticker: 'Ticker', divergence: 'Divergence' }
              const isActive = sortBy === s
              return (
                <button key={s} onClick={() => setSortBy(s)} style={{ background: isActive ? C.bg1 : 'transparent', border: isActive ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: R.r6, color: isActive ? C.t1 : C.t3, cursor: 'pointer', fontSize: 11, fontWeight: isActive ? 700 : 400, padding: '3px 9px' }}>
                  {labels[s]}
                </button>
              )
            })}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, padding: 2, gap: 1 }}>
            {(['active', 'archived'] as Tab[]).map((t) => {
              const count = t === 'active' ? active.length : archived.length
              const isActive = tab === t
              return (
                <button key={t} onClick={() => setTab(t)} style={{ background: isActive ? C.bg1 : 'transparent', border: isActive ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: R.r6, color: isActive ? C.t1 : C.t3, cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 400, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {t === 'active' ? 'Active' : 'Archived'}
                  <span style={{ background: isActive ? C.accentM : C.bg0, border: `1px solid ${isActive ? C.accentB : C.border}`, borderRadius: 10, color: isActive ? C.accent : C.t4, fontSize: 10, fontWeight: 700, padding: '1px 5px', lineHeight: 1.4 }}>{count}</span>
                </button>
              )
            })}
          </div>

          {tab === 'active' && active.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all active comparisons? Archived comparisons are not affected.')) {
                  active.forEach((c) => dispatch({ type: 'REMOVE_COMPARISON', payload: c.id }))
                }
              }}
              style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r8, color: C.t3, fontSize: 13, padding: '4px 10px', cursor: 'pointer' }}
            >
              Clear active
            </button>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.t3 }}>
          {tab === 'active' ? (
            <><div style={{ fontSize: 32, marginBottom: 10 }}>📂</div><div style={{ fontSize: 15, fontWeight: 600, color: C.t2, marginBottom: 4 }}>All comparisons archived</div><div style={{ fontSize: 13 }}>Switch to the Archived tab to view them.</div></>
          ) : (
            <><div style={{ fontSize: 32, marginBottom: 10 }}>🗄️</div><div style={{ fontSize: 15, fontWeight: 600, color: C.t2, marginBottom: 4 }}>No archived comparisons</div><div style={{ fontSize: 13 }}>Archive comparisons from the Active tab to tidy up your list.</div></>
          )}
        </div>
      )}

      {/* ── Comparison cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sorted.map((comp) => {
          const isArchived = archivedSet.has(comp.id)
          const results    = comp.investorIds.map((id) => analyses[`${comp.ticker}:${id}`]).filter(Boolean)

          // ── incomplete card ──
          if (results.length < 2) {
            const missingIds = comp.investorIds.filter((id) => !analyses[`${comp.ticker}:${id}`])
            return (
              <div key={comp.id} style={{ background: C.bg1, border: `1px solid ${C.warnB}`, borderRadius: R.r12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, opacity: isArchived ? 0.7 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: C.warn, fontSize: 16 }}>⚠</span>
                  <div>
                    <span style={{ color: C.t1, fontWeight: 600, fontSize: 14, fontFamily: C.mono }}>{comp.ticker}</span>
                    <span style={{ color: C.t3, fontSize: 13, marginLeft: 8 }}>Missing analysis for: {missingIds.map((id) => INV[id]?.shortName ?? id).join(', ')}</span>
                  </div>
                </div>
                <CompActions comp={comp} isArchived={isArchived} dispatch={dispatch} />
              </div>
            )
          }

          const [a, b]  = results
          const diff    = a.strategyScore - b.strategyScore
          const absDiff = Math.abs(diff)
          const consensus = consensusLabel(a, b)

          // shared metrics — use first result that has the value
          const pe     = a.pe     || b.pe
          const peg    = a.peg    || b.peg
          const margin = a.margin || b.margin
          const fcf    = a.fcf    || b.fcf
          const price  = a.marketPrice || b.marketPrice

          return (
            <div key={comp.id}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border88; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.18)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
              style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, overflow: 'hidden', opacity: isArchived ? 0.75 : 1, transition: 'border-color .15s, box-shadow .15s' }}>

              {/* ── Card header ── */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <TickerLogo ticker={comp.ticker} size={36} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{ color: C.accent, fontWeight: 800, fontSize: 18, fontFamily: C.mono, cursor: 'pointer' }}
                        onClick={() => dispatch({ type: 'OPEN_MODAL', payload: comp.ticker })}
                      >
                        {comp.ticker}
                      </span>
                      <span style={{ color: C.t2, fontSize: 14 }}>{a.companyName}</span>
                      {price > 0 && (
                        <span style={{ color: C.warn, fontWeight: 700, fontSize: 14, fontFamily: C.mono }}>{formatPrice(price)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Tag color={consensus.color} small>{consensus.label}</Tag>
                  <span style={{ color: C.t4, fontSize: 11 }}>{new Date(comp.timestamp).toLocaleDateString()}</span>
                  <CompShareButton ticker={comp.ticker} investorIds={comp.investorIds} />
                  <CompActions comp={comp} isArchived={isArchived} dispatch={dispatch} />
                </div>
              </div>

              {/* ── Shared financials ── */}
              {(pe || peg || margin || fcf) && (
                <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginRight: 4 }}>Financials</span>
                  {pe     > 0 && <MetricPill label="P/E"    value={fmtN(pe, 1)}          />}
                  {peg    > 0 && <MetricPill label="PEG"    value={fmtN(peg, 2)}         />}
                  {margin > 0 && <MetricPill label="Margin" value={`${fmtN(margin, 1)}%`}/>}
                  {fcf    !== 0 && <MetricPill label="FCF"  value={fmtB(fcf * 1e9)}      />}
                </div>
              )}

              {/* ── Divergence bar ── */}
              <div style={{ padding: '6px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', flexShrink: 0 }}>Score delta</span>
                <div style={{ flex: 1, background: C.bg2, borderRadius: R.r99, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(absDiff * 10, 100)}%`, background: absDiff > 3 ? C.warn : C.gain, borderRadius: R.r99, transition: 'width .4s' }} />
                </div>
                <span style={{ color: absDiff > 3 ? C.warn : C.t2, fontFamily: C.mono, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                </span>
              </div>

              {/* ── Investor columns ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {results.map((r, idx) => {
                  const inv = INV[r.investorId]
                  if (!inv) return null
                  const isFirst = idx === 0
                  return (
                    <div
                      key={r.investorId}
                      style={{
                        padding: 16,
                        borderRight: isFirst ? `1px solid ${C.border}` : undefined,
                      }}
                    >
                      {/* Investor name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: inv.color, flexShrink: 0 }} />
                        <span style={{ color: inv.color, fontWeight: 700, fontSize: 14 }}>{inv.name}</span>
                      </div>

                      {/* Verdict + score */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Tag color={vColor(r.verdict)} small>{verdictLabel(r.verdict)}</Tag>
                        <span style={{ color: C.t1, fontSize: 15, fontFamily: C.mono, fontWeight: 700 }}>{r.strategyScore}<span style={{ color: C.t4, fontWeight: 400, fontSize: 12 }}>/10</span></span>
                      </div>

                      {/* Score bar */}
                      <div style={{ marginBottom: 10 }}>
                        <ScoreBar score={r.strategyScore} color={scColor(r.strategyScore)} />
                      </div>

                      {/* IV range */}
                      {(r.intrinsicValueLow > 0 || r.intrinsicValueHigh > 0) && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                          {r.intrinsicValueLow  > 0 && <span style={{ background: C.gainBg, border: `1px solid ${C.gainB}`, borderRadius: R.r6, color: C.gain, fontSize: 11, fontWeight: 600, padding: '2px 7px', fontFamily: C.mono }}>IV Low {formatPrice(r.intrinsicValueLow)}</span>}
                          {r.intrinsicValueHigh > 0 && <span style={{ background: C.accentM, border: `1px solid ${C.accentB}`, borderRadius: R.r6, color: C.accent, fontSize: 11, fontWeight: 600, padding: '2px 7px', fontFamily: C.mono }}>IV High {formatPrice(r.intrinsicValueHigh)}</span>}
                        </div>
                      )}

                      {/* Verdict reason */}
                      {r.verdictReason && (
                        <div style={{ color: C.t3, fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>{r.verdictReason}</div>
                      )}

                      {/* Thesis snippet */}
                      {r.thesis && (
                        <div style={{ color: C.t2, fontSize: 12, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 8 }}>
                          {r.thesis}
                        </div>
                      )}

                      {/* Strengths / risks count */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {r.strengths?.length > 0 && (
                          <span style={{ background: C.gainBg, border: `1px solid ${C.gainB}`, borderRadius: R.r6, color: C.gain, fontSize: 10, fontWeight: 600, padding: '2px 7px' }}>
                            ↑ {r.strengths.length} strength{r.strengths.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {r.risks?.length > 0 && (
                          <span style={{ background: C.lossBg, border: `1px solid ${C.lossB}`, borderRadius: R.r6, color: C.loss, fontSize: 10, fontWeight: 600, padding: '2px 7px' }}>
                            ↓ {r.risks.length} risk{r.risks.length !== 1 ? 's' : ''}
                          </span>
                        )}
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

// ── Share button for a comparison card ──────────────────────────────────────
function CompShareButton({ ticker, investorIds }: { ticker: string; investorIds: string[] }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const url = `${window.location.origin}/share/comparison/${ticker}/${investorIds.join(',')}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      title="Copy shareable comparison link"
      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: R.r6, color: copied ? C.gain : C.t3, fontSize: 11, fontWeight: 600, padding: '3px 8px', cursor: 'pointer' }}
    >
      {copied ? '✓ Copied!' : '⬡ Share'}
    </button>
  )
}

// ── Inline action buttons ────────────────────────────────────────────────────
interface CompActionsProps {
  comp: { id: string; ticker: string }
  isArchived: boolean
  dispatch: (a: import('../types').Action) => void
}

function CompActions({ comp, isArchived, dispatch }: CompActionsProps) {
  return (
    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
      {!isArchived ? (
        <button onClick={() => { dispatch({ type: 'ARCHIVE_COMPARISON', payload: comp.id }); dispatch({ type: 'TOAST', payload: { message: `${comp.ticker} comparison archived`, type: 'info' } }) }} style={btnStyle(C.border, C.t3)}>
          Archive
        </button>
      ) : (
        <button onClick={() => { dispatch({ type: 'UNARCHIVE_COMPARISON', payload: comp.id }); dispatch({ type: 'TOAST', payload: { message: `${comp.ticker} comparison restored`, type: 'success' } }) }} style={btnStyle(C.accentB, C.accent)}>
          Restore
        </button>
      )}
      <button
        onClick={() => {
          if (confirm(`Delete ${comp.ticker} comparison? This cannot be undone.`)) {
            dispatch({ type: 'REMOVE_COMPARISON', payload: comp.id })
            dispatch({ type: 'UNARCHIVE_COMPARISON', payload: comp.id })
            dispatch({ type: 'TOAST', payload: { message: `${comp.ticker} comparison deleted`, type: 'info' } })
          }
        }}
        style={btnStyle(C.border, C.t4)}
      >
        Delete
      </button>
    </div>
  )
}

function btnStyle(border: string, color: string): React.CSSProperties {
  return { background: 'transparent', border: `1px solid ${border}`, borderRadius: R.r6, color, cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '4px 8px' }
}
