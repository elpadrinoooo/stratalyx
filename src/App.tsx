import React, { useEffect, useState } from 'react'
import { AppProvider } from './context/AppContext'
import { useApp } from './state/context'
import { C } from './constants/colors'
import { Navbar } from './components/Navbar'
import { Toasts } from './components/Toasts'
import { FmpKeyModal } from './components/FmpKeyModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AnalyzerModal } from './screens/AnalyzerModal'
import { ScreenerScreen } from './screens/ScreenerScreen'
import { StrategiesScreen } from './screens/StrategiesScreen'
import { WatchlistScreen } from './screens/WatchlistScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { ComparisonsScreen } from './screens/ComparisonsScreen'
import { MarketEventsScreen } from './screens/MarketEventsScreen'
import { NewsScreen } from './screens/NewsScreen'
import { MarketsScreen } from './screens/MarketsScreen'
import { AdminScreen } from './screens/AdminScreen'
import { AccountScreen } from './screens/AccountScreen'
import { AuthModal } from './components/AuthModal'

const SESSION_KEY = 'stratalyx_fmp_key'

/** Detect analysis share from server-injected globals, query params, or legacy hash */
function parseShareSource(): { ticker: string; investorId: string } | null {
  // Injected by Express /share/:ticker/:investorId route (production)
  const wt = (window as { __SHARE_TICKER__?: string }).__SHARE_TICKER__
  const wi = (window as { __SHARE_INVESTOR__?: string }).__SHARE_INVESTOR__
  if (wt && wi) return { ticker: wt, investorId: wi }

  // Dev fallback: ?share=AAPL/buffett
  const sp = new URLSearchParams(window.location.search).get('share')
  if (sp) {
    const [t, i] = sp.split('/')
    if (t && i) return { ticker: t.toUpperCase(), investorId: i.toLowerCase() }
  }

  // Legacy hash support (backward compat)
  const m = window.location.hash.match(/^#\/analysis\/([A-Za-z0-9.]+)\/([A-Za-z]+)$/)
  if (m) return { ticker: m[1].toUpperCase(), investorId: m[2].toLowerCase() }

  return null
}

/** Detect comparison share from server-injected global or query param */
function parseComparisonShare(): { ticker: string; investorIds: string[] } | null {
  // Injected by Express /share/comparison/:ticker/:investors route (production)
  const wc = (window as { __SHARE_COMPARISON__?: { ticker: string; investors: string } }).__SHARE_COMPARISON__
  if (wc?.ticker && wc?.investors) {
    const ids = wc.investors.split(',').filter(Boolean)
    if (ids.length >= 2) return { ticker: wc.ticker, investorIds: ids }
  }

  // Dev fallback: ?comparison=AAPL/buffett,graham
  const cp = new URLSearchParams(window.location.search).get('comparison')
  if (cp) {
    const [t, inv] = cp.split('/')
    const ids = (inv ?? '').split(',').filter(Boolean)
    if (t && ids.length >= 2) return { ticker: t.toUpperCase(), investorIds: ids }
  }

  return null
}

function AppShell() {
  const { state, dispatch } = useApp()
  const [fmpKey, setFmpKey] = useState<string>(
    () => sessionStorage.getItem(SESSION_KEY) ?? ''
  )
  const [fmpModalOpen, setFmpModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [shareBanner, setShareBanner] = useState<'analysis' | 'comparison' | false>(false)

  // Handle deep-link on first load (share URL or ?admin=1)
  useEffect(() => {
    // Admin shortcut: ?admin=1
    if (new URLSearchParams(window.location.search).get('admin') === '1') {
      dispatch({ type: 'SET_SCREEN', payload: 'Admin' })
      history.replaceState(null, '', window.location.pathname)
      return
    }

    // Comparison share link — navigate to Comparisons screen and open analyzer for the ticker
    const comp = parseComparisonShare()
    if (comp) {
      dispatch({ type: 'SET_SCREEN', payload: 'Comparisons' })
      dispatch({ type: 'SET_INVESTOR', payload: comp.investorIds[0] })
      dispatch({ type: 'OPEN_MODAL', payload: comp.ticker })
      setShareBanner('comparison')
      history.replaceState(null, '', window.location.pathname)
      return
    }

    const share = parseShareSource()
    if (share) {
      dispatch({ type: 'SET_INVESTOR', payload: share.investorId })
      dispatch({ type: 'OPEN_MODAL', payload: share.ticker })
      setShareBanner('analysis')
      history.replaceState(null, '', window.location.pathname)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  // Cmd/Ctrl+K → open analyzer modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!state.modalOpen) {
          dispatch({ type: 'OPEN_MODAL', payload: '' })
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state.modalOpen, dispatch])

  function handleSaveFmpKey(key: string) {
    setFmpKey(key)
    if (key) {
      sessionStorage.setItem(SESSION_KEY, key)
    } else {
      sessionStorage.removeItem(SESSION_KEY)
    }
    setFmpModalOpen(false)
    dispatch({
      type: 'TOAST',
      payload: {
        message: key ? 'FMP API key saved — live data enabled' : 'FMP API key cleared',
        type: key ? 'success' : 'info',
      },
    })
  }

  const screen = state.screen

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg0,
        color: C.t1,
        fontFamily: C.sans,
      }}
    >
      <Navbar fmpKeySet={!!fmpKey} onOpenFmpModal={() => setFmpModalOpen(true)} onOpenAuthModal={() => setAuthModalOpen(true)} />

      {shareBanner && (
        <div
          style={{
            background: C.warnBg,
            borderBottom: `1px solid ${C.warnB}`,
            padding: '9px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 13,
            color: C.t2,
          }}
        >
          <span>
            <span style={{ color: C.warn, fontWeight: 700 }}>
              {shareBanner === 'comparison' ? 'Shared comparison — ' : 'Shared analysis — '}educational use only.{' '}
            </span>
            {shareBanner === 'comparison'
              ? 'Run analyses with your chosen strategies to see results side by side. '
              : 'This is an AI-generated framework analysis, not personalised investment advice. '}
            Always consult a qualified financial adviser before making investment decisions.
          </span>
          <button
            onClick={() => setShareBanner(false)}
            aria-label="Dismiss disclaimer"
            style={{ background: 'none', border: 'none', color: C.t3, fontSize: 16, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}

      <main>
        {screen === 'Markets'     && <ErrorBoundary><MarketsScreen fmpKey={fmpKey} onOpenFmpModal={() => setFmpModalOpen(true)} /></ErrorBoundary>}
        {screen === 'Screener'    && <ErrorBoundary><ScreenerScreen    fmpKeySet={!!fmpKey} onOpenFmpModal={() => setFmpModalOpen(true)} /></ErrorBoundary>}
        {screen === 'Strategies'  && <ErrorBoundary><StrategiesScreen /></ErrorBoundary>}
        {screen === 'Watchlist'   && <ErrorBoundary><WatchlistScreen /></ErrorBoundary>}
        {screen === 'History'     && <ErrorBoundary><HistoryScreen /></ErrorBoundary>}
        {screen === 'Comparisons'  && <ErrorBoundary><ComparisonsScreen /></ErrorBoundary>}
        {screen === 'MarketEvents' && <ErrorBoundary><MarketEventsScreen /></ErrorBoundary>}
        {screen === 'News'         && <ErrorBoundary><NewsScreen /></ErrorBoundary>}
        {screen === 'Admin'        && <ErrorBoundary><AdminScreen /></ErrorBoundary>}
        {screen === 'Account'      && <ErrorBoundary><AccountScreen /></ErrorBoundary>}
      </main>

      {state.modalOpen && (
        <ErrorBoundary>
          <AnalyzerModal fmpKey={fmpKey} />
        </ErrorBoundary>
      )}

      {fmpModalOpen && (
        <FmpKeyModal
          currentKey={fmpKey}
          onSave={handleSaveFmpKey}
          onClose={() => setFmpModalOpen(false)}
        />
      )}

      {authModalOpen && (
        <AuthModal onClose={() => setAuthModalOpen(false)} />
      )}

      <Toasts />

      {/* GLOBAL DISCLAIMER FOOTER */}
      <footer
        style={{
          borderTop: `1px solid ${C.border}`,
          padding: '10px 24px',
          textAlign: 'center',
          fontSize: 11,
          color: C.t4,
          lineHeight: 1.6,
        }}
      >
        Stratalyx applies publicly documented investment frameworks for educational purposes only.
        All outputs are AI-generated and do not constitute personalised investment advice or a
        recommendation to buy or sell any security. Stratalyx is not a registered investment
        adviser. Always consult a qualified financial adviser before making investment decisions.
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
