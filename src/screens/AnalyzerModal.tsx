import React, { useState, useEffect, useRef, useCallback } from 'react'
import { C, R } from '../constants/colors'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { INVESTORS, INV } from '../constants/investors'
import { PROV } from '../constants/providers'
import { useApp } from '../state/context'
import { useAnalysis } from '../hooks/useAnalysis'
import { Tag } from '../components/Tag'
import { Kpi } from '../components/Kpi'
import { ScoreBar } from '../components/ScoreBar'
import { Spinner } from '../components/Spinner'
import { Skeleton } from '../components/Skeleton'
import { LiveBadge } from '../components/LiveBadge'
import { ProviderModelBar } from '../components/ProviderModelBar'
import { scColor, vColor, vBg, pegColor, fmtPct, fmtN } from '../engine/utils'
import type { AnalysisResult } from '../types'

interface Props {
  fmpKey: string
}

export function AnalyzerModal({ fmpKey }: Props) {
  const { state, dispatch } = useApp()
  const { phase, error, run } = useAnalysis()
  const [ticker, setTicker] = useState(state.modalTicker)
  const inputRef = useRef<HTMLInputElement>(null)
  const width = useWindowWidth()
  const isMobile = width <= 640

  // Comparison state
  const [compPhase, setCompPhase]   = useState<'idle' | 'running' | 'done'>('idle')
  const [compInvId, setCompInvId]   = useState<string | null>(null)
  const [compError, setCompError]   = useState('')

  const dialogRef = useRef<HTMLDivElement>(null)
  const inv  = INV[state.investor] ?? INVESTORS[0]
  const prov = PROV[state.provider]
  const key  = `${ticker.toUpperCase()}:${state.investor}`
  const result: AnalysisResult | undefined = state.analyses[key]

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Focus trap — keep Tab within modal
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = dialog!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [phase])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'CLOSE_MODAL' })
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [dispatch])

  const handleAnalyze = useCallback(() => {
    if (!ticker.trim()) return
    run(ticker.trim(), fmpKey)
  }, [ticker, fmpKey, run])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAnalyze()
  }

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) dispatch({ type: 'CLOSE_MODAL' })
  }

  // Run comparison with another investor
  const runComparison = async (altInvId: string) => {
    const sym = ticker.trim().toUpperCase()
    if (!sym) return
    const altInv = INV[altInvId]
    if (!altInv) return

    setCompInvId(altInvId)
    setCompPhase('running')
    setCompError('')

    // Check cache first
    const altKey = `${sym}:${altInvId}`
    if (state.analyses[altKey]) {
      // Already have it — register comparison
      const id = `${sym}:${state.investor}:${altInvId}`
      dispatch({
        type: 'ADD_COMPARISON',
        payload: { id, ticker: sym, investorIds: [state.investor, altInvId], timestamp: Date.now() },
      })
      setCompPhase('done')
      return
    }

    try {
      // Import dynamically to avoid circular deps in test
      const { runAnalysis } = await import('../engine/analyze')
      const altResult = await runAnalysis({
        ticker: sym,
        investor: altInv,
        provider: state.provider,
        model: state.model,
        fmpKey: fmpKey || null,
      })
      dispatch({ type: 'SET_ANALYSIS', payload: altResult })

      const id = `${sym}:${state.investor}:${altInvId}`
      dispatch({
        type: 'ADD_COMPARISON',
        payload: { id, ticker: sym, investorIds: [state.investor, altInvId], timestamp: Date.now() },
      })
      setCompPhase('done')
    } catch (err) {
      setCompError(err instanceof Error ? err.message : 'Comparison failed')
      setCompPhase('idle')
    }
  }

  const labelStyle: React.CSSProperties = {
    color: C.t3,
    fontSize: 9,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    marginBottom: 10,
  }

  return (
    <div
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Strategy Analyzer"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,.8)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: isMobile ? '8px 8px 40px' : '32px 16px 60px',
        overflowY: 'auto',
      }}
    >
      <div
        ref={dialogRef}
        style={{
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: R.r16,
          width: '100%',
          maxWidth: 900,
          boxShadow: '0 24px 80px rgba(0,0,0,.7)',
          overflow: 'hidden',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.t1 }}>Strategy Analyzer</span>
            {!isMobile && (
              <span style={{ color: C.t3, fontSize: 11 }}>
                {inv.name} · {prov?.shortName ?? ''} · {state.model}
              </span>
            )}
            {result && <LiveBadge live={result.isLive} />}
          </div>
          <button
            onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
            aria-label="Close analyzer modal"
            style={{
              background: C.bg3,
              border: `1px solid ${C.border}`,
              borderRadius: R.r6,
              color: C.t2,
              padding: '5px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: 18, maxHeight: '82vh', overflowY: 'auto', overflowX: 'hidden' }}>

          {/* SETTINGS PANEL */}
          <div
            style={{
              background: C.bg1,
              border: `1px solid ${C.border}`,
              borderRadius: R.r12,
              padding: '12px 14px',
              marginBottom: 14,
            }}
          >
            <div style={labelStyle}>Analysis settings</div>

            {/* Investor row */}
            <div style={{ color: C.t3, fontSize: 10, marginBottom: 6 }}>Investor strategy</div>
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

            {/* Provider/Model row */}
            <div style={{ marginTop: 10 }}>
              <div style={{ color: C.t3, fontSize: 10, marginBottom: 6 }}>Model</div>
              <ProviderModelBar />
            </div>
          </div>

          {/* SEARCH ROW */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              ref={inputRef}
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="Enter any ticker — NVDA, TSLA, BRK.B, PLTR…"
              style={{
                flex: 1,
                background: C.bg2,
                color: C.t1,
                border: `1px solid ${C.border}`,
                borderRadius: R.r8,
                padding: '8px 12px',
                fontSize: 13,
                outline: 'none',
                fontFamily: C.sans,
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={phase === 'running' || !ticker.trim()}
              style={{
                background: C.accent,
                color: '#fff',
                border: 'none',
                borderRadius: R.r8,
                padding: '8px 18px',
                fontWeight: 600,
                fontSize: 13,
                cursor: phase === 'running' || !ticker.trim() ? 'not-allowed' : 'pointer',
                opacity: phase === 'running' || !ticker.trim() ? 0.5 : 1,
              }}
            >
              {phase === 'running' ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>

          {/* LOADING BANNER */}
          {phase === 'running' && (
            <div
              style={{
                background: C.accentM,
                border: `1px solid ${C.accentB}`,
                borderRadius: R.r8,
                padding: '8px 14px',
                marginBottom: 14,
                fontSize: 12,
                color: C.accent,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Spinner size={14} />
              Fetching live data and running {inv.shortName} analysis…
            </div>
          )}

          {/* ERROR BANNER */}
          {phase === 'error' && error && (
            <div
              style={{
                background: C.lossBg,
                border: `1px solid ${C.lossB}`,
                color: C.loss,
                borderRadius: R.r8,
                padding: '9px 14px',
                marginBottom: 14,
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          {/* SKELETON (loading but no result yet) */}
          {phase === 'running' && !result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton h={80} />
              <Skeleton h={50} />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 8 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} h={52} />
                ))}
              </div>
              <Skeleton h={90} />
            </div>
          )}

          {/* ── RESULT SECTION ── */}
          {result && (
            <ResultSection
              result={result}
              inv={inv}
              state={state}
              dispatch={dispatch}
              compPhase={compPhase}
              compInvId={compInvId}
              compError={compError}
              onRunComparison={runComparison}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── ResultSection — separated for readability ─────────────────────────────────

interface ResultSectionProps {
  result: AnalysisResult
  inv: ReturnType<typeof INV[string]>
  state: ReturnType<typeof useApp>['state']
  dispatch: ReturnType<typeof useApp>['dispatch']
  compPhase: 'idle' | 'running' | 'done'
  compInvId: string | null
  compError: string
  onRunComparison: (id: string) => void
}

function ResultSection({
  result,
  inv,
  state,
  compPhase,
  compInvId,
  compError,
  onRunComparison,
}: ResultSectionProps) {
  const [showLiveData, setShowLiveData] = useState(false)

  if (!inv) return null

  const labelStyle: React.CSSProperties = {
    color: C.t3,
    fontSize: 9,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    marginBottom: 6,
  }

  // Live data metrics to display
  const liveMetrics = result.liveData ? [
    { label: 'Revenue',      value: result.liveData.income[0]?.revenue         ? `$${(result.liveData.income[0].revenue / 1e9).toFixed(1)}B`  : '—', desc: 'Annual revenue' },
    { label: 'Net Income',   value: result.liveData.income[0]?.netIncome        ? `$${(result.liveData.income[0].netIncome / 1e9).toFixed(1)}B` : '—', desc: 'Net income' },
    { label: 'Market Price', value: result.liveData.quote?.price               ? `$${result.liveData.quote.price.toFixed(2)}`                  : '—', desc: 'Current share price' },
    { label: 'Market Cap',   value: result.liveData.profile?.mktCap            ? `$${(result.liveData.profile.mktCap / 1e9).toFixed(1)}B`      : '—', desc: 'Market capitalisation' },
    { label: 'P/E Ratio',    value: result.liveData.ratios?.peRatioTTM          ? result.liveData.ratios.peRatioTTM.toFixed(1)                  : '—', desc: 'Price / Earnings (TTM)' },
    { label: 'ROE TTM',      value: result.liveData.ratios?.returnOnEquityTTM   ? fmtPct(result.liveData.ratios.returnOnEquityTTM * 100, 1)     : '—', desc: 'Return on equity (TTM)' },
  ] : []

  const altInvestors = INVESTORS.filter((i) => i.id !== state.investor).slice(0, 5)
  const compKey  = compInvId ? `${result.ticker}:${compInvId}` : null
  const compResult = compKey ? state.analyses[compKey] : undefined
  const compInv  = compInvId ? INV[compInvId] : null

  return (
    <div>
      {/* LIVE DATA PANEL */}
      {result.liveData && (
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.gainB}`,
            borderRadius: R.r12,
            marginBottom: 12,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setShowLiveData((x) => !x)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '12px 14px',
              cursor: 'pointer',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.gain }} />
              <span style={{ color: C.gain, fontWeight: 700, fontSize: 12 }}>
                Live Financial Data — {result.companyName}
              </span>
            </div>
            <span style={{ color: C.t3, fontSize: 10 }}>
              FMP · {new Date(result.timestamp).toLocaleDateString()} · {showLiveData ? 'Hide' : 'Show'} details ▾
            </span>
          </button>
          {showLiveData && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
                gap: 6,
                padding: '12px 14px',
              }}
            >
              {liveMetrics.map(({ label, value, desc }) => (
                <div
                  key={label}
                  style={{ background: C.bg2, borderRadius: R.r6, padding: '7px 10px' }}
                >
                  <div style={{ color: C.t3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>
                    {label}
                  </div>
                  <div style={{ color: C.t1, fontWeight: 600, fontSize: 13, fontFamily: C.mono }}>
                    {value}
                  </div>
                  <div style={{ color: C.t4, fontSize: 9, marginTop: 2 }}>{desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HERO CARD */}
      <div
        style={{
          background: C.bg1,
          border: `1px solid ${C.border}`,
          borderRadius: R.r12,
          padding: 16,
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* LEFT */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ color: C.accent, fontWeight: 800, fontSize: 20, fontFamily: C.mono }}>
              {result.ticker}
            </span>
            <span style={{ color: C.t1, fontSize: 13 }}>{result.companyName}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            {result.sector && <Tag color={C.t2} small>{result.sector}</Tag>}
            <LiveBadge live={result.isLive} />
          </div>
          {result.description && (
            <p style={{ color: C.t3, fontSize: 11, margin: '0 0 8px' }}>{result.description}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: C.t3, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Strategy score</span>
            <span style={{ color: C.t2, fontSize: 10, fontFamily: C.mono }}>{result.strategyScore}/10</span>
          </div>
          <ScoreBar score={result.strategyScore} color={scColor(result.strategyScore)} />
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div
            style={{
              background: vBg(result.verdict),
              border: `1px solid ${vColor(result.verdict)}44`,
              borderRadius: R.r8,
              padding: '6px 18px',
            }}
          >
            <span style={{ color: vColor(result.verdict), fontWeight: 800, fontSize: 15 }}>
              {result.verdict}
            </span>
          </div>
          {result.marketPrice > 0 && (
            <span style={{ color: C.warn, fontWeight: 700, fontSize: 20, fontFamily: C.mono }}>
              ${fmtN(result.marketPrice, 2)}
            </span>
          )}
          {result.intrinsicValueLow > 0 && (
            <span style={{ color: C.t3, fontSize: 10, textAlign: 'right' }}>
              IV: ${fmtN(result.intrinsicValueLow, 0)}–${fmtN(result.intrinsicValueHigh, 0)}
            </span>
          )}
          {result.marginOfSafety !== 0 && (
            <Tag color={result.moSUp ? C.gain : C.loss} small>
              MoS: {result.marginOfSafety > 0 ? '+' : ''}{fmtN(result.marginOfSafety, 0)}%
            </Tag>
          )}
          <p style={{ color: C.t3, fontSize: 10, textAlign: 'right', maxWidth: 200, margin: 0 }}>
            {result.verdictReason}
          </p>
        </div>
      </div>

      {/* IV STRIP */}
      {result.intrinsicValueLow > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
          <Kpi label="IV Conservative" value={`$${fmtN(result.intrinsicValueLow, 0)}`} color={C.t2} />
          <Kpi label="IV Optimistic"   value={`$${fmtN(result.intrinsicValueHigh, 0)}`} color={C.gain} />
          <Kpi label="Market Price"    value={result.marketPrice > 0 ? `$${fmtN(result.marketPrice, 2)}` : '—'} color={C.warn} />
        </div>
      )}

      {/* SCREEN RESULTS */}
      {result.screenResults.length > 0 && (
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.border}`,
            borderRadius: R.r12,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div style={labelStyle}>
            {inv.name} screening rules · {result.isLive ? 'Live data applied' : 'AI estimated'}
          </div>
          {result.screenResults.map((sr, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 0',
                borderBottom: i < result.screenResults.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
            >
              <span style={{ color: sr.pass ? C.gain : C.loss, fontSize: 12, flexShrink: 0 }}>
                {sr.pass ? '✓' : '✗'}
              </span>
              <span style={{ color: C.t1, fontSize: 12, fontWeight: 500, minWidth: 70 }}>{sr.rule}</span>
              <span style={{ color: C.t3, fontSize: 11, flex: 1 }}>{sr.note}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
        <Kpi label="ROE"         value={fmtPct(result.roe, 1)}      color={result.roe > 15 ? C.gain : C.warn} />
        <Kpi label="P/E"         value={fmtN(result.pe, 1)}          color={C.t1} />
        <Kpi label="PEG"         value={fmtN(result.peg, 2)}         color={pegColor(result.peg)} />
        <Kpi label="Dividend"    value={fmtPct(result.div, 1)}       color={result.div > 0 ? C.gain : C.t3} />
        <Kpi label="Net Margin"  value={fmtPct(result.margin, 1)}    color={result.margin > 15 ? C.gain : C.warn} />
        <Kpi label="Debt Level"  value={result.debtLevel || '—'}     color={result.debtLevel === 'Low' ? C.gain : result.debtLevel === 'High' ? C.loss : C.warn} />
        <Kpi label="FCF"         value={result.fcf > 0 ? `$${(result.fcf / 1e9).toFixed(1)}B` : '—'} color={C.t3} />
        <Kpi label="Moat Score"  value={`${result.moatScore}/10`}    color={scColor(result.moatScore)} />
      </div>

      {/* MOAT PANEL */}
      {result.moat && (
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.border}`,
            borderRadius: R.r12,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div style={labelStyle}>Moat assessment</div>
          <p style={{ color: C.t1, fontSize: 12, lineHeight: 1.65, margin: '0 0 8px' }}>{result.moat}</p>
          <ScoreBar score={result.moatScore} color={C.accent} />
        </div>
      )}

      {/* STRENGTHS / RISKS */}
      {(result.strengths.length > 0 || result.risks.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {/* Strengths */}
          <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, padding: 13 }}>
            <div style={{ ...labelStyle, color: C.gain }}>Strengths</div>
            {result.strengths.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 7,
                  padding: '5px 0',
                  borderBottom: i < result.strengths.length - 1 ? `1px solid ${C.border}` : 'none',
                }}
              >
                <span style={{ color: C.gain, fontSize: 11, flexShrink: 0 }}>›</span>
                <span style={{ color: C.t2, fontSize: 11, lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>

          {/* Risks */}
          <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, padding: 13 }}>
            <div style={{ ...labelStyle, color: C.loss }}>Risks</div>
            {result.risks.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 7,
                  padding: '5px 0',
                  borderBottom: i < result.risks.length - 1 ? `1px solid ${C.border}` : 'none',
                }}
              >
                <span style={{ color: C.loss, fontSize: 11, flexShrink: 0 }}>›</span>
                <span style={{ color: C.t2, fontSize: 11, lineHeight: 1.5 }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* THESIS */}
      {result.thesis && (
        <div
          style={{
            background: inv.color + '18',
            border: `1px solid ${inv.color}33`,
            borderRadius: R.r12,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div style={{ ...labelStyle, color: inv.color }}>
            {inv.name} thesis · {result.isLive ? 'Based on live financial data' : 'AI estimated'}
          </div>
          <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
            "{result.thesis}"
          </p>
        </div>
      )}

      {/* COMPARISON SECTION */}
      <div
        style={{
          background: C.bg1,
          border: `1px solid ${C.border}`,
          borderRadius: R.r12,
          padding: 14,
        }}
      >
        <div style={labelStyle}>Compare with another strategy</div>

        {compPhase === 'idle' && (
          <>
            {compError && (
              <div style={{ color: C.loss, fontSize: 11, marginBottom: 8 }}>{compError}</div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {altInvestors.map((alt) => (
                <button
                  key={alt.id}
                  onClick={() => onRunComparison(alt.id)}
                  style={{
                    background: alt.color + '18',
                    border: `1px solid ${alt.color}33`,
                    borderRadius: R.r8,
                    color: alt.color,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 12px',
                    cursor: 'pointer',
                  }}
                >
                  vs {alt.shortName}
                </button>
              ))}
            </div>
          </>
        )}

        {compPhase === 'running' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.accent, fontSize: 12 }}>
            <Spinner size={14} />
            Running comparison…
          </div>
        )}

        {compPhase === 'done' && compResult && compInv && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {/* Current investor */}
              <div style={{ background: inv.color + '18', border: `1px solid ${inv.color}33`, borderRadius: R.r8, padding: 12 }}>
                <div style={{ color: inv.color, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{inv.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: vColor(result.verdict), fontWeight: 700, fontSize: 13 }}>{result.verdict}</span>
                  <span style={{ color: C.t2, fontSize: 12, fontFamily: C.mono }}>{result.strategyScore}/10</span>
                </div>
                <ScoreBar score={result.strategyScore} color={scColor(result.strategyScore)} />
              </div>
              {/* Alt investor */}
              <div style={{ background: compInv.color + '18', border: `1px solid ${compInv.color}33`, borderRadius: R.r8, padding: 12 }}>
                <div style={{ color: compInv.color, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{compInv.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: vColor(compResult.verdict), fontWeight: 700, fontSize: 13 }}>{compResult.verdict}</span>
                  <span style={{ color: C.t2, fontSize: 12, fontFamily: C.mono }}>{compResult.strategyScore}/10</span>
                </div>
                <ScoreBar score={compResult.strategyScore} color={scColor(compResult.strategyScore)} />
              </div>
            </div>
            {/* Score delta */}
            {(() => {
              const scoreDiff = result.strategyScore - compResult.strategyScore
              const absScoreDiff = Math.abs(scoreDiff)
              return (
                <div style={{ textAlign: 'center', fontSize: 11, color: C.t3 }}>
                  Score delta: <span style={{ fontFamily: C.mono, color: absScoreDiff > 3 ? C.warn : C.t2, fontWeight: 700 }}>
                    {scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(0)}
                  </span>
                  {absScoreDiff > 3 && (
                    <span style={{ color: C.warn, fontSize: 10, marginLeft: 6 }}>
                      ⚠ Significant divergence
                    </span>
                  )}
                </div>
              )
            })()}
            {/* Run another */}
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => { setCompPhase('idle'); setCompInvId(null) }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.accent,
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ← Compare another strategy
              </button>
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ color: C.t4, fontSize: 9, textAlign: 'right', marginTop: 10 }}>
        Educational only · Not financial advice · Data source: {result.dataSource}
      </div>
    </div>
  )
}
