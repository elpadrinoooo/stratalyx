import React, { useState } from 'react'
import { C, R } from '../constants/colors'
import { INVESTORS } from '../constants/investors'
import { useApp } from '../state/context'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { Tag } from '../components/Tag'
import type { Investor } from '../types'

type StratTab = 'Overview' | 'Rules' | 'Formulas'

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderRadius: R.r8,
        padding: '7px 11px',
        minWidth: 90,
      }}
    >
      <div
        style={{
          color: C.t3,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: color ?? C.t1,
          fontWeight: 700,
          fontSize: 13,
          fontFamily: C.mono,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function InvestorCard({
  inv,
  active,
  onClick,
}: {
  inv: Investor
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? inv.color + '18' : C.bg1,
        border: `1px solid ${active ? inv.color + '55' : C.border}`,
        borderRadius: R.r12,
        padding: '12px 14px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        {/* Monogram avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: inv.color + '22',
            border: `2px solid ${inv.color}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: inv.color, fontWeight: 700, fontSize: 14 }}>{inv.avatar}</span>
        </div>
        <div>
          <div style={{ color: active ? inv.color : C.t1, fontWeight: 700, fontSize: 14 }}>
            {inv.name}
          </div>
          <div style={{ color: C.t3, fontSize: 12 }}>{inv.era}</div>
        </div>
      </div>
      <div style={{ color: C.t2, fontSize: 13, marginBottom: 6 }}>{inv.style}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {inv.rules.slice(0, 3).map((r) => (
          <Tag key={r.id} color={inv.color} small>{r.label}</Tag>
        ))}
      </div>
    </button>
  )
}

export function StrategiesScreen() {
  const { state, dispatch } = useApp()
  const [tab, setTab] = useState<StratTab>('Overview')
  const [expanded, setExpanded] = useState(false)
  const width = useWindowWidth()
  const isMobile = width <= 768

  const inv = INVESTORS.find((i) => i.id === state.investor) ?? INVESTORS[0]

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
        {/* LEFT SIDEBAR — hidden on mobile (replaced by pill row above) */}
        {!isMobile && (
        <div>
          <div
            style={{
              color: C.t3,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              marginBottom: 2,
              paddingLeft: 2,
            }}
          >
            {INVESTORS.length} Frameworks
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {INVESTORS.map((i) => (
              <InvestorCard
                key={i.id}
                inv={i}
                active={i.id === state.investor}
                onClick={() => dispatch({ type: 'SET_INVESTOR', payload: i.id })}
              />
            ))}
          </div>
        </div>
        )}

        {/* RIGHT DETAIL PANEL */}
        <div
          style={{
            background: C.bg1,
            border: `1px solid ${C.border}`,
            borderRadius: R.r16,
            overflow: 'hidden',
          }}
        >
          {/* HERO */}
          <div
            style={{
              background: inv.color + '18',
              borderBottom: `1px solid ${inv.color}33`,
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Avatar large */}
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: inv.color + '22',
                  border: `2px solid ${inv.color}44`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: inv.color, fontWeight: 700, fontSize: 26 }}>{inv.avatar}</span>
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ color: inv.color, fontWeight: 800, fontSize: 17 }}>{inv.name}</span>
                  <span style={{ color: C.t3, fontSize: 13 }}>{inv.era}</span>
                </div>
                <div style={{ color: C.t2, fontSize: 14, marginBottom: 8 }}>{inv.style}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  <Tag color={inv.color} small>Value</Tag>
                  <Tag color={inv.color} small>{inv.rules.length} Rules</Tag>
                  <Tag color={inv.color} small>{inv.equations.length} Formulas</Tag>
                </div>
                {/* Stat pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  <StatPill label="Era"   value={inv.era}   color={inv.color} />
                  <StatPill label="Style" value={inv.style.split(' / ')[0]} />
                  <StatPill label="Rules" value={`${inv.rules.length} criteria`} />
                </div>
              </div>

              {/* Use strategy button */}
              <button
                onClick={() => {
                  dispatch({ type: 'SET_INVESTOR', payload: inv.id })
                  dispatch({ type: 'SET_SCREEN', payload: 'Screener' })
                }}
                style={{
                  background: inv.color,
                  color: '#fff',
                  border: 'none',
                  borderRadius: R.r8,
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                Use strategy →
              </button>
            </div>
          </div>

          {/* QUOTE strip */}
          <div
            style={{
              padding: '10px 20px',
              borderBottom: `1px solid ${C.border}`,
              background: C.bg2,
              fontStyle: 'italic',
              color: C.t2,
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            "{inv.tagline}"
          </div>

          {/* AFFILIATION DISCLAIMER */}
          <div
            style={{
              padding: '7px 20px',
              background: C.bg1,
              borderBottom: `1px solid ${C.border}`,
              fontSize: 11,
              color: C.t4,
            }}
          >
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

          {/* CONTENT */}
          <div style={{ padding: '16px 20px' }}>
            {tab === 'Overview' && (
              <div>
                {/* Biography */}
                <div
                  style={{
                    color: inv.color,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '.09em',
                    marginBottom: 6,
                  }}
                >
                  Investment Philosophy
                </div>
                <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.8, margin: '0 0 16px' }}>
                  {inv.ctx.slice(0, 500)}
                  {inv.ctx.length > 500 ? '…' : ''}
                </p>

                {/* 2-column grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r10, padding: '13px 15px' }}>
                    <div style={{ color: inv.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6 }}>
                      Core Style
                    </div>
                    <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{inv.style}</p>
                  </div>
                  <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r10, padding: '13px 15px' }}>
                    <div style={{ color: inv.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6 }}>
                      Key Criteria
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {inv.rules.map((r) => (
                        <Tag key={r.id} color={inv.color} small>{r.label}</Tag>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expandable learn more */}
                <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: R.r10, overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpanded((x) => !x)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '11px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: C.t2, fontSize: 14, fontWeight: 600 }}>
                      📚 Full context prompt
                    </span>
                    <span style={{ color: C.t3, fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
                  </button>
                  {expanded && (
                    <div
                      style={{
                        padding: '0 14px 14px',
                        borderTop: `1px solid ${C.border}`,
                        paddingTop: 10,
                        color: C.t3,
                        fontSize: 13,
                        lineHeight: 1.8,
                      }}
                    >
                      {inv.ctx}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'Rules' && (
              <div>
                <div style={{ color: C.t3, fontSize: 13, marginBottom: 12 }}>
                  {inv.rules.length} screening rule{inv.rules.length !== 1 ? 's' : ''} applied during analysis
                </div>
                {inv.rules.map((rule, i) => (
                  <div
                    key={rule.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '9px 0',
                      borderBottom: i < inv.rules.length - 1 ? `1px solid ${C.border}88` : 'none',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: inv.color,
                        flexShrink: 0,
                        marginTop: 6,
                      }}
                    />
                    <div style={{ flex: '0 0 160px', minWidth: 0 }}>
                      <div style={{ color: C.t1, fontSize: 14, fontWeight: 600 }}>{rule.label}</div>
                      <div style={{ color: inv.color, fontSize: 13, fontFamily: C.mono, marginTop: 2 }}>
                        {rule.id}
                      </div>
                    </div>
                    <div style={{ color: C.t3, fontSize: 13, lineHeight: 1.65, flex: 1 }}>
                      {rule.description}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'Formulas' && (
              <div>
                <div style={{ color: C.t3, fontSize: 13, marginBottom: 12 }}>
                  Valuation formulas used by {inv.shortName}
                </div>
                {inv.equations.map((eq) => (
                  <div
                    key={eq.label}
                    style={{
                      background: C.bg3,
                      border: `1px solid ${C.border}`,
                      borderRadius: R.r10,
                      padding: '12px 14px',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        color: C.accent,
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '.07em',
                        marginBottom: 6,
                      }}
                    >
                      {eq.label}
                    </div>
                    <div
                      style={{
                        background: C.bg0,
                        borderRadius: R.r6,
                        padding: '7px 12px',
                        fontFamily: C.mono,
                        fontSize: 14,
                        color: C.warn,
                        marginBottom: 8,
                        wordBreak: 'break-word',
                      }}
                    >
                      {eq.formula}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
