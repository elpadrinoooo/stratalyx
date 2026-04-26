import React from 'react'
import { Sun, Moon, Monitor, KeyRound, Plus, Sparkles } from 'lucide-react'
import { C, R } from '../constants/colors'
import { INVESTORS, INV } from '../constants/investors'
import { useApp } from '../state/context'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { useTheme, type ThemeMode } from '../hooks/useTheme'
import { useUsageInfo } from '../hooks/useUsageInfo'
import type { Screen } from '../types'

interface Props {
  fmpKeySet: boolean
  onOpenFmpModal: () => void
  onOpenAuthModal: () => void
}

interface ScreenLink { label: string; screen: Screen; admin?: boolean }

// Grouped IA: Discover (passive market-watching) · Analyze (active research) · Library (saved work)
const SCREEN_GROUPS: ScreenLink[][] = [
  [
    { label: 'Markets',       screen: 'Markets' },
    { label: 'News',          screen: 'News' },
    { label: 'Market Events', screen: 'MarketEvents' },
  ],
  [
    { label: 'Screener',     screen: 'Screener' },
    { label: 'Strategies',   screen: 'Strategies' },
    { label: 'Comparisons',  screen: 'Comparisons' },
  ],
  [
    { label: 'Watchlist',    screen: 'Watchlist' },
    { label: 'History',      screen: 'History' },
  ],
  [
    { label: 'Admin',        screen: 'Admin', admin: true },
  ],
]

const THEME_OPTIONS: { mode: ThemeMode; Icon: typeof Sun; label: string }[] = [
  { mode: 'light',  Icon: Sun,     label: 'Light'  },
  { mode: 'dark',   Icon: Moon,    label: 'Dark'   },
  { mode: 'system', Icon: Monitor, label: 'System' },
]

export function Navbar({ fmpKeySet, onOpenFmpModal, onOpenAuthModal }: Props) {
  const { state, dispatch } = useApp()
  const { mode: themeMode, setTheme } = useTheme()
  const inv = INV[state.investor] ?? INVESTORS[0]
  const width = useWindowWidth()
  const isMobile = width <= 640

  const watchlistCount = state.watchlist.length
  const historyCount   = Object.keys(state.analyses).length
  const compCount      = state.comparisons.length

  // Re-fetch usage whenever a new analysis lands so the pill stays in sync.
  const { usage } = useUsageInfo(historyCount)

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
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = C.bg2; (e.currentTarget as HTMLButtonElement).style.color = C.t2 } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = C.t3 } }}
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
          transition: 'background .15s, color .15s',
        }}
      >
        {label}
        {count > 0 && (
          <span
            style={{
              background: C.accent,
              color: 'var(--c-fg-on-accent, #fff)',
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
      {THEME_OPTIONS.map(({ mode, Icon, label }) => {
        const active = themeMode === mode
        return (
          <button
            key={mode}
            onClick={() => setTheme(mode)}
            aria-pressed={active}
            aria-label={`${label} mode`}
            title={`${label} mode`}
            style={{
              background: active ? C.bg1 : 'transparent',
              border: active ? `1px solid ${C.border}` : '1px solid transparent',
              borderRadius: R.r6,
              color: active ? C.t1 : C.t3,
              cursor: 'pointer',
              fontSize: isMobile ? 13 : 12,
              fontWeight: active ? 600 : 400,
              padding: isMobile ? '5px 7px' : '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              lineHeight: 1,
              transition: 'background 0.15s',
            }}
          >
            <Icon size={14} strokeWidth={2} aria-hidden />
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
      <div style={{ background: C.accent, borderRadius: R.r8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--c-fg-on-accent, #fff)', flexShrink: 0 }}>
        S
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: C.t1 }}>Stratalyx.ai</div>
    </button>
  )

  const fmpBtn = (
    <button
      onClick={onOpenFmpModal}
      aria-label={fmpKeySet ? 'Live data enabled — manage FMP key' : 'Add FMP API key for live data'}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      style={{ display: 'flex', alignItems: 'center', gap: 5, background: fmpKeySet ? C.gainBg : C.warnBg, border: `1px solid ${fmpKeySet ? C.gainB : C.warnB}`, borderRadius: R.r8, padding: '5px 9px', cursor: 'pointer', transition: 'opacity .15s' }}
    >
      <KeyRound size={12} strokeWidth={2.2} color={fmpKeySet ? 'var(--c-gain)' : 'var(--c-warn)'} aria-hidden />
      <span style={{ fontSize: 12, fontWeight: 600, color: fmpKeySet ? C.gain : C.warn }}>
        {isMobile ? (fmpKeySet ? 'Live' : 'API Key') : (fmpKeySet ? 'Live Data' : 'Add API Key')}
      </span>
    </button>
  )

  // Auth button: shows nothing during load, Sign In when logged out, user pill when logged in
  const authBtn: React.ReactNode = state.authLoading ? null : state.user ? (
    <button
      onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'Account' })}
      aria-label="Account"
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: R.r8,
        padding: '4px 9px',
        cursor: 'pointer',
        transition: 'opacity .15s',
      }}
    >
      <div style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: C.accent,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}>
        {state.user.email[0]?.toUpperCase() ?? '?'}
      </div>
      {!isMobile && (
        <span style={{ fontSize: 12, fontWeight: 600, color: state.user.tier === 'pro' ? C.accent : C.t2 }}>
          {state.user.tier === 'pro' ? 'Pro' : 'Free'}
        </span>
      )}
    </button>
  ) : (
    <button
      onClick={onOpenAuthModal}
      aria-label="Sign in"
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      style={{
        background: C.bg2,
        color: C.t2,
        border: `1px solid ${C.border}`,
        borderRadius: R.r8,
        padding: isMobile ? '5px 9px' : '5px 12px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity .15s',
      }}
    >
      Sign In
    </button>
  )

  // Usage pill — only for signed-in free users with usage data loaded.
  // Color escalates: subtle (0-1 used) → amber (last one) → red (limit hit).
  const usagePill: React.ReactNode = (state.user && usage && usage.tier === 'free' && usage.limit) ? (() => {
    const used = usage.analysesThisMonth
    const limit = usage.limit ?? 3
    const remaining = Math.max(0, limit - used)
    const tone = remaining === 0 ? 'loss' : remaining === 1 ? 'warn' : 'neutral'
    const fg = tone === 'loss' ? C.loss : tone === 'warn' ? C.warn : C.t2
    const bg = tone === 'loss' ? C.lossBg : tone === 'warn' ? C.warnBg : C.bg2
    const bd = tone === 'loss' ? C.lossB : tone === 'warn' ? C.warnB : C.border
    return (
      <button
        onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'Account' })}
        aria-label={`${used} of ${limit} free analyses used this month — view account`}
        title="Free tier usage — click to view account"
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: bg, border: `1px solid ${bd}`,
          borderRadius: R.r8,
          padding: '4px 9px',
          cursor: 'pointer', transition: 'opacity .15s',
          fontFamily: C.sans,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: fg, fontFamily: C.mono }}>
          {used}/{limit}
        </span>
        {!isMobile && (
          <span style={{ fontSize: 11, color: fg, opacity: 0.85 }}>
            {remaining === 0 ? 'limit reached' : `free ${remaining === 1 ? 'left' : 'this mo'}`}
          </span>
        )}
      </button>
    )
  })() : null

  const analyzeBtn = (
    <button
      onClick={() => dispatch({ type: 'OPEN_MODAL', payload: '' })}
      aria-label="Analyze stock"
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      style={{ background: C.accent, color: 'var(--c-fg-on-accent, #fff)', border: 'none', borderRadius: R.r8, padding: isMobile ? '6px 9px' : '6px 13px', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'opacity .15s', display: 'flex', alignItems: 'center', gap: 5 }}
    >
      {isMobile ? <Plus size={16} strokeWidth={2.5} aria-hidden /> : <><Sparkles size={14} strokeWidth={2} aria-hidden /> Analyze Stock</>}
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
            {usagePill}
            {authBtn}
            {analyzeBtn}
          </div>
        </div>
        {/* Row 2: scrollable tab strip (scrollbar hidden) */}
        <div style={{ overflowX: 'auto', borderTop: `1px solid ${C.border44}`, scrollbarWidth: 'none' } as React.CSSProperties}>
          <div style={{ display: 'flex', gap: 2, padding: '5px 14px 6px', width: 'max-content', alignItems: 'center' }}>
            {SCREEN_GROUPS
              .map(group => group.filter(s => !s.admin || state.user?.isAdmin))
              .filter(group => group.length > 0)
              .map((group, gi, arr) => (
                <React.Fragment key={gi}>
                  {group.map(({ label, screen }) => tabBtn(screen, label))}
                  {gi < arr.length - 1 && (
                    <div aria-hidden style={{ width: 1, height: 16, background: C.border, margin: '0 4px', flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
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

        {/* Nav tabs (grouped: Discover · Analyze · Library · Admin) */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          {SCREEN_GROUPS
            .map(group => group.filter(s => !s.admin || state.user?.isAdmin))
            .filter(group => group.length > 0)
            .map((group, gi, arr) => (
              <React.Fragment key={gi}>
                {group.map(({ label, screen }) => tabBtn(screen, label))}
                {gi < arr.length - 1 && (
                  <div aria-hidden style={{ width: 1, height: 16, background: C.border, margin: '0 4px', flexShrink: 0 }} />
                )}
              </React.Fragment>
            ))}
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

        {usagePill}

        {authBtn}

        {analyzeBtn}
      </div>
    </nav>
  )
}
