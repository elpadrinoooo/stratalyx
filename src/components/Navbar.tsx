import React from 'react'
import { C, R } from '../constants/colors'
import { INVESTORS, INV } from '../constants/investors'
import { useApp } from '../state/context'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { useTheme, type ThemeMode } from '../hooks/useTheme'
import type { Screen } from '../types'

interface Props {
  fmpKeySet: boolean
  onOpenFmpModal: () => void
}

const SCREENS: { label: string; screen: Screen }[] = [
  { label: 'Screener',      screen: 'Screener' },
  { label: 'Strategies',    screen: 'Strategies' },
  { label: 'Watchlist',     screen: 'Watchlist' },
  { label: 'History',       screen: 'History' },
  { label: 'Comparisons',   screen: 'Comparisons' },
  { label: 'Market Events', screen: 'MarketEvents' },
]

const THEME_OPTIONS: { mode: ThemeMode; icon: string; label: string }[] = [
  { mode: 'light',  icon: '☀️', label: 'Light'  },
  { mode: 'dark',   icon: '🌙', label: 'Dark'   },
  { mode: 'system', icon: '💻', label: 'System' },
]

export function Navbar({ fmpKeySet, onOpenFmpModal }: Props) {
  const { state, dispatch } = useApp()
  const { mode: themeMode, setTheme } = useTheme()
  const inv = INV[state.investor] ?? INVESTORS[0]
  const width = useWindowWidth()
  const isMobile = width <= 640

  const watchlistCount = state.watchlist.length
  const historyCount   = Object.keys(state.analyses).length
  const compCount      = state.comparisons.length

  function badgeCount(screen: Screen): number {
    if (screen === 'Watchlist')   return watchlistCount
    if (screen === 'History')     return historyCount
    if (screen === 'Comparisons') return compCount
    return 0
  }

  const tabBtn = (screen: Screen, label: string): React.ReactNode => {
    const active = state.screen === screen
    const count  = badgeCount(screen)
    return (
      <button
        key={screen}
        onClick={() => dispatch({ type: 'SET_SCREEN', payload: screen })}
        aria-current={active ? 'page' : undefined}
        style={{
          background: active ? C.accentM : 'transparent',
          color:  active ? C.accent : C.t3,
          border: active ? `1px solid ${C.accentB}` : '1px solid transparent',
          fontWeight: active ? 600 : 400,
          borderRadius: R.r8,
          padding: '4px 11px',
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        {label}
        {count > 0 && (
          <span
            style={{
              background: C.accent,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: R.r99,
              padding: '1px 5px',
              minWidth: 14,
              textAlign: 'center',
            }}
          >
            {count}
          </span>
        )}
      </button>
    )
  }

  /** Three-segment theme toggle: Light / Dark / System */
  const themeToggle = (
    <div
      role="group"
      aria-label="Color theme"
      style={{
        display: 'flex',
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: R.r8,
        padding: 2,
        gap: 1,
      }}
    >
      {THEME_OPTIONS.map(({ mode, icon, label }) => {
        const active = themeMode === mode
        return (
          <button
            key={mode}
            onClick={() => setTheme(mode)}
            aria-pressed={active}
            title={`${label} mode`}
            style={{
              background: active ? C.bg1 : 'transparent',
              border: active ? `1px solid ${C.border}` : '1px solid transparent',
              borderRadius: R.r6,
              color: active ? C.t1 : C.t3,
              cursor: 'pointer',
              fontSize: isMobile ? 13 : 12,
              fontWeight: active ? 600 : 400,
              padding: isMobile ? '4px 6px' : '3px 7px',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              lineHeight: 1,
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: 12 }}>{icon}</span>
            {!isMobile && <span>{label}</span>}
          </button>
        )
      })}
    </div>
  )

  const logoBtn = (
    <button
      onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'Screener' })}
      aria-label="Stratalyx home"
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <div style={{ background: C.accent, borderRadius: R.r8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
        S
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: C.t1 }}>Stratalyx.ai</div>
    </button>
  )

  const fmpBtn = (
    <button
      onClick={onOpenFmpModal}
      aria-label={fmpKeySet ? 'Live data enabled — manage FMP key' : 'Add FMP API key for live data'}
      style={{ display: 'flex', alignItems: 'center', gap: 5, background: fmpKeySet ? C.gainBg : C.warnBg, border: `1px solid ${fmpKeySet ? C.gainB : C.warnB}`, borderRadius: R.r8, padding: '5px 9px', cursor: 'pointer' }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: fmpKeySet ? C.gain : C.warn }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: fmpKeySet ? C.gain : C.warn }}>
        {isMobile ? (fmpKeySet ? 'Live' : 'API Key') : (fmpKeySet ? 'Live Data' : 'Add API Key')}
      </span>
    </button>
  )

  const analyzeBtn = (
    <button
      onClick={() => dispatch({ type: 'OPEN_MODAL', payload: '' })}
      aria-label="Analyze stock"
      style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: R.r8, padding: isMobile ? '6px 10px' : '6px 13px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
    >
      {isMobile ? '+' : 'Analyze Stock'}
    </button>
  )

  if (isMobile) {
    return (
      <nav style={{ background: C.bg1, borderBottom: `1px solid ${C.border}` }} aria-label="Main navigation">
        {/* Row 1: logo + actions */}
        <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {logoBtn}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {themeToggle}
            {fmpBtn}
            {analyzeBtn}
          </div>
        </div>
        {/* Row 2: scrollable tab strip (scrollbar hidden) */}
        <div style={{ overflowX: 'auto', borderTop: `1px solid ${C.border44}`, scrollbarWidth: 'none' } as React.CSSProperties}>
          <div style={{ display: 'flex', gap: 2, padding: '5px 14px 6px', width: 'max-content' }}>
            {SCREENS.map(({ label, screen }) => tabBtn(screen, label))}
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav
      aria-label="Main navigation"
      style={{
        background: C.bg1,
        borderBottom: `1px solid ${C.border}`,
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      {/* LEFT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {logoBtn}
        <div>
          <div style={{ color: C.t3, fontSize: 12 }}>Multi-investor · Multi-LLM · Live Data</div>
        </div>

        {/* Divider */}
        <div style={{ height: 20, width: 1, background: C.border, margin: '0 4px' }} />

        {/* Nav tabs */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {SCREENS.map(({ label, screen }) => tabBtn(screen, label))}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {themeToggle}

        {fmpBtn}

        {/* Active investor pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: inv.color + '18', border: `1px solid ${inv.color}33`, borderRadius: R.r8, padding: '4px 9px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: inv.color }} />
          <span style={{ color: inv.color, fontSize: 12, fontWeight: 600 }}>{inv.shortName}</span>
        </div>

        {analyzeBtn}
      </div>
    </nav>
  )
}
