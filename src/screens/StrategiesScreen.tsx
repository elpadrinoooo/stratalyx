import { useState } from 'react'
import { C, R } from '../constants/colors'
import { INVESTORS } from '../constants/investors'
import { useApp } from '../state/context'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { Tag } from '../components/Tag'
import { Kpi } from '../components/Kpi'
import { ScoreBar } from '../components/ScoreBar'
import { sanitizeTicker, scColor, vColor, verdictLabel } from '../engine/utils'
import { INVESTOR_SOURCES, SOURCE_TYPE_META } from '../constants/investorSources'
import type { Investor } from '../types'

type StratTab = 'Overview' | 'Rules' | 'Formulas'

// ── helpers ──────────────────────────────────────────────────────────────────

/** Extract a quantitative threshold like "< 15", "> 1", "< 1.5" from a label string. */
function extractThreshold(label: string): { sign: '<' | '>'; value: string } | null {
  const m = label.match(/([<>])\s*([\d.]+%?)/)
  if (!m) return null
  return { sign: m[1] as '<' | '>', value: m[2] }
}

/** Split a formula string into variable terms for a glossary display. */
function formulaTerms(formula: string): string[] {
  return formula
    .split(/[+\-÷×−()/]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !/^\d/.test(t))
}

// ── sidebar card ─────────────────────────────────────────────────────────────

function InvestorCard({
  inv,
  active,
  count,
  onClick,
}: {
  inv: Investor
  active: boolean
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = C.bg2; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,.12)' } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = C.bg1; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' } }}
      style={{
        background: active ? inv.color + '18' : C.bg1,
        border: `1px solid ${active ? inv.color + '55' : C.border}`,
        borderRadius: R.r12,
        padding: '11px 13px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'background .15s, box-shadow .15s',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 7 }}>
        {/* Monogram avatar */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: inv.color + '22',
            border: `2px solid ${inv.color}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: inv.color, fontWeight: 700, fontSize: 13 }}>{inv.avatar}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: active ? inv.color : C.t1, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.name}</span>
            {count > 0 && (
              <span style={{ background: inv.color + '22', border: `1px solid ${inv.color}44`, borderRadius: R.r99, color: inv.color, fontSize: 9, fontWeight: 700, padding: '1px 5px', flexShrink: 0, lineHeight: 1.5 }}>
                {count}
              </span>
            )}
          </div>
          <div style={{ color: C.t4, fontSize: 11 }}>{inv.era}</div>
        </div>
      </div>
      <div style={{ color: C.t3, fontSize: 12, marginBottom: 5 }}>{inv.style}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {inv.rules.slice(0, 3).map((r) => (
          <Tag key={r.id} color={inv.color} small>{r.label}</Tag>
        ))}
      </div>
    </button>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function StrategiesScreen() {
  const { state, dispatch } = useApp()
  const [tab, setTab]             = useState<StratTab>('Overview')
  const [search, setSearch]       = useState('')
  const [quickTicker, setQuickTicker] = useState('')
  const width   = useWindowWidth()
  const isMobile = width <= 768

  const inv = INVESTORS.find((i) => i.id === state.investor) ?? INVESTORS[0]

  // Per-investor analysis counts
  const allAnalyses = Object.values(state.analyses)
  function countFor(id: string) {
    return allAnalyses.filter((a) => a.investorId === id).length
  }

  // Recent analyses for the selected investor
  const recentAnalyses = allAnalyses
    .filter((a) => a.investorId === inv.id)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3)

  const invCount = countFor(inv.id)

  // Filtered sidebar list
  const q = search.toLowerCase()
  const filteredInvestors = q
    ? INVESTORS.filter((i) => i.name.toLowerCase().includes(q) || i.style.toLowerCase().includes(q) || i.shortName.toLowerCase().includes(q))
    : INVESTORS

  function handleQuickAnalyze() {
    const ticker = sanitizeTicker(quickTicker)
    if (!ticker) return
    dispatch({ type: 'SET_INVESTOR', payload: inv.id })
    dispatch({ type: 'OPEN_MODAL', payload: ticker })
    setQuickTicker('')
  }

  return (
    <div style={{ padding: 18, maxWidth: 1440, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ color: C.accent, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>
        Research Library
      </div>
      <h1 style={{ margin: '0 0 4px', color: C.t1, fontSize: 22, fontWeight: 800 }}>
        Investor Frameworks
      </h1>
      <p style={{ margin: '0 0 16px', color: C.t2, fontSize: 14, lineHeight: 1.6 }}>
        Explore the documented investment philosophies of legendary investors. Select a framework to
        apply it to your stock analysis.
      </p>

      {/* Mobile: horizontal pill selector */}
      {isMobile && (
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 6, width: 'max-content', paddingBottom: 4 }}>
            {INVESTORS.map((i) => {
              const active = i.id === state.investor
              return (
                <button
                  key={i.id}
                  onClick={() => dispatch({ type: 'SET_INVESTOR', payload: i.id })}
                  style={{
                    background: active ? i.color + '18' : C.bg2,
                    color: active ? i.color : C.t2,
                    border: `1px solid ${active ? i.color + '55' : C.border}`,
                    borderRadius: R.r8,
                    padding: '5px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {i.shortName}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Layout: two-column on desktop, single column on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: 14, alignItems: 'start' }}>

        {/* ── LEFT SIDEBAR ── */}
        {!isMobile && (
          <div>
            {/* Search */}
            <input
              type="text"
              placeholder="Search frameworks…"
              aria-label="Search investor frameworks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: C.bg2,
                border: `1px solid ${C.border}`,
                borderRadius: R.r8,
                color: C.t1,
                fontSize: 13,
                padding: '7px 10px',
                marginBottom: 8,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ color: C.t4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6, paddingLeft: 2 }}>
              {filteredInvestors.length} of {INVESTORS.length} frameworks
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredInvestors.map((i) => (
                <InvestorCard
                  key={i.id}
                  inv={i}
                  active={i.id === state.investor}
                  count={countFor(i.id)}
                  onClick={() => dispatch({ type: 'SET_INVESTOR', payload: i.id })}
                />
              ))}
              {filteredInvestors.length === 0 && (
                <div style={{ color: C.t4, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                  No frameworks match "{search}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RIGHT DETAIL PANEL ── */}
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.border}`,
            borderRadius: R.r16,
            overflow: 'hidden',
          }}
        >
          {/* HERO */}
          <div style={{ background: inv.color + '18', borderBottom: `1px solid ${inv.color}33`, padding: '18px 20px' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: inv.color + '22',
                  border: `2px solid ${inv.color}44`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: inv.color, fontWeight: 700, fontSize: 24 }}>{inv.avatar}</span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 2, flexWrap: 'wrap' }}>
                  <span style={{ color: inv.color, fontWeight: 800, fontSize: 18 }}>{inv.name}</span>
                  <span style={{ color: C.t3, fontSize: 13 }}>{inv.era}</span>
                </div>
                <div style={{ color: C.t2, fontSize: 14, marginBottom: 8 }}>{inv.style}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  <Tag color={inv.color} small>Value</Tag>
                  <Tag color={inv.color} small>{inv.rules.length} Rules</Tag>
                  <Tag color={inv.color} small>{inv.equations.length} Formulas</Tag>
                </div>
                {/* Dynamic KPI row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <Kpi label="Analyses run" value={invCount > 0 ? String(invCount) : '—'} color={invCount > 0 ? inv.color : C.t4} />
                  <Kpi label="Rules"         value={String(inv.rules.length)} />
                  <Kpi label="Formulas"      value={String(inv.equations.length)} />
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  dispatch({ type: 'SET_INVESTOR', payload: inv.id })
                  dispatch({ type: 'SET_SCREEN', payload: 'Screener' })
                }}
                style={{
                  background: inv.color,
                  color: 'var(--c-fg-on-accent, #fff)',
                  border: 'none',
                  borderRadius: R.r8,
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                Use strategy →
              </button>
            </div>
          </div>

          {/* QUOTE strip */}
          <div style={{ padding: '10px 20px', borderBottom: `1px solid ${C.border}`, background: C.bg2, fontStyle: 'italic', color: C.t2, fontSize: 14, lineHeight: 1.7 }}>
            "{inv.tagline}"
          </div>

          {/* DISCLAIMER */}
          <div style={{ padding: '7px 20px', background: C.bg1, borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.t4 }}>
            Framework criteria are based on publicly documented writings, letters, and interviews.
            Not affiliated with or endorsed by {inv.name} or their firm.
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
            {(['Overview', 'Rules', 'Formulas'] as StratTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: tab === t ? `2px solid ${inv.color}` : '2px solid transparent',
                  color: tab === t ? inv.color : C.t3,
                  fontWeight: tab === t ? 600 : 400,
                  padding: '10px 20px',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div style={{ padding: '16px 20px' }}>

            {/* ── OVERVIEW ── */}
            {tab === 'Overview' && (
              <div>
                {/* Philosophy */}
                <div style={{ color: inv.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6 }}>
                  Investment Philosophy
                </div>
                <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.8, margin: '0 0 16px' }}>
                  {inv.ctx}
                </p>

                {/* 2-column grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r10, padding: '13px 15px' }}>
                    <div style={{ color: inv.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6 }}>Core Style</div>
                    <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{inv.style}</p>
                  </div>
                  <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r10, padding: '13px 15px' }}>
                    <div style={{ color: inv.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6 }}>Key Criteria</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {inv.rules.map((r) => (
                        <Tag key={r.id} color={inv.color} small>{r.label}</Tag>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent analyses */}
                {recentAnalyses.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: inv.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 8 }}>
                      Recent Analyses with this Framework
                    </div>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                      {recentAnalyses.map((r) => (
                        <div
                          key={`${r.ticker}:${r.investorId}`}
                          onClick={() => dispatch({ type: 'OPEN_MODAL', payload: r.ticker })}
                          style={{
                            background: C.bg2,
                            border: `1px solid ${C.border}`,
                            borderRadius: R.r10,
                            padding: '10px 13px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            minWidth: 150,
                          }}
                        >
                          <div style={{ color: C.accent, fontWeight: 700, fontSize: 15, fontFamily: C.mono, marginBottom: 4 }}>{r.ticker}</div>
                          <div style={{ marginBottom: 6 }}>
                            <Tag color={vColor(r.verdict)} small>{verdictLabel(r.verdict)}</Tag>
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <ScoreBar score={r.strategyScore} color={scColor(r.strategyScore)} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: C.t3, fontSize: 11 }}>{r.strategyScore}/10</span>
                            <span style={{ color: C.t4, fontSize: 10 }}>{new Date(r.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sources */}
                {INVESTOR_SOURCES[inv.id]?.length > 0 && (
                  <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r10, padding: '13px 15px', marginBottom: 12 }}>
                    <div style={{ color: C.t4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
                      Primary Sources
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {INVESTOR_SOURCES[inv.id].map((s, i) => {
                        const meta = SOURCE_TYPE_META[s.type]
                        const inner = (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 8,
                              padding: '8px 10px',
                              background: s.url ? C.bg1 : C.bg2,
                              border: `1px solid ${s.url ? C.accentB : C.border}`,
                              borderRadius: R.r6,
                              textDecoration: 'none',
                              transition: 'border-color .15s',
                            }}
                          >
                            <span style={{ fontSize: 13, flexShrink: 0, marginTop: 2 }}>{meta.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
                                <span style={{ color: s.url ? 'var(--c-accent)' : C.t2, fontSize: 13, lineHeight: 1.4, fontWeight: s.url ? 600 : 400 }}>
                                  {s.title}
                                </span>
                                {s.url && (
                                  <span style={{ color: 'var(--c-accent)', fontSize: 11, flexShrink: 0, opacity: 0.7 }}>↗</span>
                                )}
                              </div>
                              {s.note && (
                                <div style={{ color: C.t3, fontSize: 12, lineHeight: 1.55, marginTop: 3 }}>
                                  {s.note}
                                </div>
                              )}
                            </div>
                            <span
                              style={{
                                background: C.bg2,
                                border: `1px solid ${C.border}`,
                                borderRadius: R.r4,
                                color: C.t4,
                                fontSize: 9,
                                fontWeight: 700,
                                padding: '1px 5px',
                                textTransform: 'uppercase',
                                letterSpacing: '.05em',
                                flexShrink: 0,
                                alignSelf: 'flex-start',
                                marginTop: 2,
                              }}
                            >
                              {meta.label}
                            </span>
                          </div>
                        )
                        return s.url ? (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                            {inner}
                          </a>
                        ) : (
                          <div key={i}>{inner}</div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Analyze CTA */}
                <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r10, padding: '13px 15px' }}>
                  <div style={{ color: C.t2, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Analyze a stock with {inv.shortName}'s framework
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="e.g. AAPL"
                      aria-label="Ticker to analyze with this framework"
                      value={quickTicker}
                      onChange={(e) => setQuickTicker(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleQuickAnalyze()}
                      maxLength={10}
                      style={{
                        flex: 1,
                        background: C.bg1,
                        border: `1px solid ${C.border}`,
                        borderRadius: R.r6,
                        color: C.t1,
                        fontFamily: C.mono,
                        fontSize: 14,
                        fontWeight: 600,
                        padding: '6px 10px',
                        outline: 'none',
                        textTransform: 'uppercase',
                      }}
                    />
                    <button
                      onClick={handleQuickAnalyze}
                      disabled={!quickTicker.trim()}
                      style={{
                        background: quickTicker.trim() ? inv.color : C.bg3,
                        color: quickTicker.trim() ? 'var(--c-fg-on-accent, #fff)' : C.t4,
                        border: 'none',
                        borderRadius: R.r6,
                        padding: '6px 14px',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: quickTicker.trim() ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap',
                        transition: 'background .15s',
                      }}
                    >
                      Analyze →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── RULES ── */}
            {tab === 'Rules' && (
              <div>
                <div style={{ color: C.t3, fontSize: 13, marginBottom: 14 }}>
                  {inv.rules.length} screening rule{inv.rules.length !== 1 ? 's' : ''} applied during analysis
                </div>
                {inv.rules.map((rule, i) => {
                  const threshold = extractThreshold(rule.label)
                  return (
                    <div
                      key={rule.id}
                      style={{
                        display: 'flex',
                        gap: 14,
                        padding: '10px 0',
                        borderBottom: i < inv.rules.length - 1 ? `1px solid ${C.border88}` : 'none',
                        alignItems: 'flex-start',
                      }}
                    >
                      {/* Numbered badge */}
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: inv.color + '22',
                          border: `1.5px solid ${inv.color}44`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        <span style={{ color: inv.color, fontWeight: 700, fontSize: 11 }}>{i + 1}</span>
                      </div>

                      <div style={{ flex: '0 0 180px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ color: C.t1, fontSize: 14, fontWeight: 600 }}>{rule.label}</span>
                          {threshold && (
                            <span
                              style={{
                                background: threshold.sign === '>' ? 'var(--c-gainBg)' : 'var(--c-lossBg)',
                                border: `1px solid ${threshold.sign === '>' ? 'var(--c-gainB)' : 'var(--c-lossB)'}`,
                                borderRadius: R.r4,
                                color: threshold.sign === '>' ? C.gain : C.loss,
                                fontSize: 10,
                                fontWeight: 700,
                                fontFamily: C.mono,
                                padding: '1px 5px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {threshold.sign} {threshold.value}
                            </span>
                          )}
                        </div>
                        <div style={{ color: inv.color, fontSize: 12, fontFamily: C.mono, marginTop: 2 }}>
                          {rule.id}
                        </div>
                      </div>

                      <div style={{ color: C.t3, fontSize: 13, lineHeight: 1.65, flex: 1 }}>
                        {rule.description}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── FORMULAS ── */}
            {tab === 'Formulas' && (
              <div>
                <div style={{ color: C.t3, fontSize: 13, marginBottom: 14 }}>
                  Valuation formulas used by {inv.shortName}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  {inv.equations.map((eq) => {
                    const terms = formulaTerms(eq.formula)
                    return (
                      <div
                        key={eq.label}
                        style={{
                          background: C.bg3,
                          border: `1px solid ${C.border}`,
                          borderRadius: R.r10,
                          padding: '14px 15px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        {/* Label */}
                        <div style={{ color: inv.color, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>
                          {eq.label}
                        </div>

                        {/* Formula */}
                        <div
                          style={{
                            background: C.bg0,
                            borderRadius: R.r6,
                            padding: '8px 12px',
                            fontFamily: C.mono,
                            fontSize: 13,
                            color: C.warn,
                            lineHeight: 1.6,
                            wordBreak: 'break-word',
                          }}
                        >
                          {eq.formula}
                        </div>

                        {/* Variables glossary */}
                        {terms.length > 0 && (
                          <div>
                            <div style={{ color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Variables</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {terms.map((term) => (
                                <span
                                  key={term}
                                  style={{
                                    background: C.bg2,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: R.r4,
                                    color: C.t3,
                                    fontSize: 11,
                                    fontFamily: C.mono,
                                    padding: '2px 6px',
                                  }}
                                >
                                  {term}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
