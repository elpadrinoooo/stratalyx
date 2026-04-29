/* eslint-disable no-console -- startup banner; Phase 5 replaces with pino */
// Sentry MUST be imported first — its v8 auto-instrumentation patches Node
// internals at require time and will miss anything loaded before this line.
import './sentry.js'
import { app, ANTHROPIC_KEY, GOOGLE_KEY, FMP_KEY } from './app.js'
import { Sentry } from './sentry.js'

// Wire Sentry's Express error handler AFTER all routes are registered.
// Sentry.setupExpressErrorHandler attaches a middleware that captures
// any error reaching the Express error pipeline and forwards it to Sentry.
Sentry.setupExpressErrorHandler(app)

const PORT = Number(process.env['PORT'] ?? 3001)

app.listen(PORT, () => {
  console.log(`Stratalyx proxy server running on :${PORT}`)
  console.log(`  Claude: ${ANTHROPIC_KEY ? '✓ configured' : '✗ missing ANTHROPIC_API_KEY'}`)
  console.log(`  Gemini: ${GOOGLE_KEY ? '✓ configured' : '✗ missing GOOGLE_API_KEY'}`)
  console.log(`  FMP:    ${FMP_KEY ? '✓ configured' : '✗ missing FMP_API_KEY'}`)
})
