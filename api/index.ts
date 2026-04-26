// Vercel serverless wrapper around the Express app.
// vercel.json rewrites /api/(.*) → /api/index, but the original URL is preserved
// in req.url, so we strip /api before handing off so existing routes (/health,
// /claude, /fmp/*) still match. Routes that don't share the /api prefix
// (/share/*, /og-default.png) match without modification.
import type { IncomingMessage, ServerResponse } from 'http'
import { app } from '../server/app.js'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.url) {
    if (req.url === '/api' || req.url === '/api/') {
      req.url = '/'
    } else if (req.url.startsWith('/api/')) {
      req.url = req.url.slice(4)
    }
  }
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res)
}
