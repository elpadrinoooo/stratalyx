import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { AppProvider } from './context/AppContext'
import { useApp } from './state/context'
import { C } from './constants/colors'
import { Navbar } from './components/Navbar'
import { Toasts } from './components/Toasts'
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
import { supabase } from './lib/supabase'

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
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authRecoveryMode, setAuthRecoveryMode] = useState(false)
  const [shareBanner, setShareBanner] = useState<'analysis' | 'comparison' | false>(false)

  // Handle deep-link on first load (share URL, /admin path, or ?admin=1)
  useEffect(() => {
    // Admin shortcut — both /admin and ?admin=1 land you on the admin screen.
    const isAdminPath  = window.location.pathname.replace(/\/$/, '') === '/admin'
    const isAdminParam = new URLSearchParams(window.location.search).get('admin') === '1'
    if (isAdminPath || isAdminParam) {
      dispatch({ type: 'SET_SCREEN', payload: 'Admin' })
      // Strip ?admin=1 if present, but keep /admin path AND any hash so react-admin's
      // HashRouter can deep-link into /admin#/users, /admin#/analyses, etc.
      const newPath = isAdminPath ? '/admin' : '/'
      history.replaceState(null, '', newPath + window.location.hash)
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

  // Password-recovery deep link: when the user clicks the email link, supabase
  // sets a session and fires PASSWORD_RECOVERY. Open the auth modal in
  // "set new password" mode so the user can finish the flow.
  useEffect(() => {
    // Detect on initial load (the hash is parsed by supabase-js before this runs)
    if (window.location.hash.includes('type=recovery')) {
      setAuthRecoveryMode(true)
      setAuthModalOpen(true)
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthRecoveryMode(true)
        setAuthModalOpen(true)
      }
    })
    return () => { subscription.unsubscribe() }
  }, [])

  // Surface the auth modal when the analyzer (or any feature) reports a 401.
  useEffect(() => {
    const onRequestAuth = () => {
      if (!state.user) setAuthModalOpen(true)
    }
    window.addEventListener('stratalyx:request-auth', onRequestAuth)
    return () => window.removeEventListener('stratalyx:request-auth', onRequestAuth)
  }, [state.user])

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
      <a
        href="#main"
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '8px 14px',
          background: C.accent,
          color: '#fff',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: C.sans,
          textDecoration: 'none',
          zIndex: 10001,
          transform: 'translateY(-150%)',
          transition: 'transform .15s',
        }}
        onFocus={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        onBlur={e => { e.currentTarget.style.transform = 'translateY(-150%)' }}
      >
        Skip to content
      </a>

      <Navbar onOpenAuthModal={() => setAuthModalOpen(true)} />

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
            style={{ background: 'none', border: 'none', color: C.t3, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}

      <main id="main" tabIndex={-1}>
        {screen === 'Markets'     && <ErrorBoundary><MarketsScreen /></ErrorBoundary>}
        {screen === 'Screener'    && <ErrorBoundary><ScreenerScreen /></ErrorBoundary>}
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
          <AnalyzerModal />
        </ErrorBoundary>
      )}

      {authModalOpen && (
        <AuthModal
          recovery={authRecoveryMode}
          onClose={() => {
            setAuthModalOpen(false)
            if (authRecoveryMode) {
              setAuthRecoveryMode(false)
              // Strip the recovery hash so a refresh doesn't re-open the modal
              history.replaceState(null, '', window.location.pathname + window.location.search)
            }
          }}
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
