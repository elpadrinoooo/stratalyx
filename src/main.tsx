import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSentry } from './lib/sentry'
import { initAnalytics } from './lib/analytics'

// Initialize observability BEFORE React renders so early-lifecycle errors and
// pageview-equivalent events are captured. Both no-op when their respective
// env vars (VITE_SENTRY_DSN, VITE_POSTHOG_KEY) are unset.
initSentry()
initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
