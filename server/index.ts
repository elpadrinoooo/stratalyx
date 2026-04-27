/* eslint-disable no-console -- startup banner; Phase 5 replaces with pino */
import { app, ANTHROPIC_KEY, GOOGLE_KEY, FMP_KEY } from './app.js'

const PORT = Number(process.env['PORT'] ?? 3001)

app.listen(PORT, () => {
  console.log(`Stratalyx proxy server running on :${PORT}`)
  console.log(`  Claude: ${ANTHROPIC_KEY ? '✓ configured' : '✗ missing ANTHROPIC_API_KEY'}`)
  console.log(`  Gemini: ${GOOGLE_KEY ? '✓ configured' : '✗ missing GOOGLE_API_KEY'}`)
  console.log(`  FMP:    ${FMP_KEY ? '✓ configured' : '✗ missing FMP_API_KEY'}`)
})
