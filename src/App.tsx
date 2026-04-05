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

const SESSION_KEY = 'stratalyx_fmp_key'

/** Parse a share hash like #/analysis/AAPL/buffett → { ticker, investorId } */
function parseShareHash(): { ticker: string; investorId: string } | null {
  const m = window.location.hash.match(/^#\/analysis\/([A-Z.]+)\/([a-z]+)$/i)
  if (!m) return null
  return { ticker: m[1].toUpperCase(), investorId: m[2].toLowerCase() }
}

function AppShell() {
  const { state, dispatch } = useApp()
  const [fmpKey, setFmpKey] = useState<string>(
    () => sessionStorage.getItem(SESSION_KEY) ?? ''
  )
  const [fmpModalOpen, setFmpModalOpen] = useState(false)
  const [shareBanner, setShareBanner] = useState(false)

  // Handle deep-link hash on first load
  useEffect(() => {
    const share = parseShareHash()
    if (share) {
      dispatch({ type: 'SET_INVESTOR', payload: share.investorId })
      dispatch({ type: 'OPEN_MODAL', payload: share.ticker })
      setShareBanner(true)
      // Clear hash so it doesn't re-trigger on navigate
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
      <Navbar fmpKeySet={!!fmpKey} onOpenFmpModal={() => setFmpModalOpen(true)} />

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
            <span style={{ color: C.warn, fontWeight: 700 }}>Shared analysis — educational use only. </span>
            This is an AI-generated framework analysis, not personalised investment advice.
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
        {screen === 'Screener'    && <ErrorBoundary><ScreenerScreen    fmpKeySet={!!fmpKey} onOpenFmpModal={() => setFmpModalOpen(true)} /></ErrorBoundary>}
        {screen === 'Strategies'  && <ErrorBoundary><StrategiesScreen /></ErrorBoundary>}
        {screen === 'Watchlist'   && <ErrorBoundary><WatchlistScreen /></ErrorBoundary>}
        {screen === 'History'     && <ErrorBoundary><HistoryScreen /></ErrorBoundary>}
        {screen === 'Comparisons'  && <ErrorBoundary><ComparisonsScreen /></ErrorBoundary>}
        {screen === 'MarketEvents' && <ErrorBoundary><MarketEventsScreen /></ErrorBoundary>}
        {screen === 'News'         && <ErrorBoundary><NewsScreen fmpKey={fmpKey} /></ErrorBoundary>}
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
