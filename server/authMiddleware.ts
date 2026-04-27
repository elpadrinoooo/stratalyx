import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from './supabaseAdmin.js'

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string
      email: string
      tier: 'free' | 'pro'
      analysesThisMonth: number
      isAdmin: boolean
    }
  }
}

const IS_TEST = Boolean(process.env['JEST_WORKER_ID'])
const TEST_TOKEN_PREFIX = 'test-user:'

/**
 * Test-only escape hatch. When JEST_WORKER_ID is set and the Bearer token
 * starts with "test-user:", we parse the rest as `id:email:tier:isAdmin`
 * and synthesize req.user without touching Supabase. Production never sees
 * this path because JEST_WORKER_ID is only set by the Jest runner.
 */
function parseTestUser(token: string): Required<Request>['user'] | null {
  if (!IS_TEST || !token.startsWith(TEST_TOKEN_PREFIX)) return null
  const parts = token.slice(TEST_TOKEN_PREFIX.length).split(':')
  return {
    id:                parts[0] || 'test-user',
    email:             parts[1] || 'test@example.com',
    tier:              parts[2] === 'pro' ? 'pro' : 'free',
    analysesThisMonth: 0,
    isAdmin:           parts[3] === 'admin',
  }
}

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers['authorization']
  if (!auth?.startsWith('Bearer ')) { next(); return }

  const token = auth.slice(7)

  const testUser = parseTestUser(token)
  if (testUser) { req.user = testUser; next(); return }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) { next(); return }

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('tier, analyses_this_month, analyses_reset_at, is_admin')
      .eq('id', data.user.id)
      .single()

    if (profile) {
      const now = new Date()
      const resetAt = new Date(profile.analyses_reset_at as string)
      const needsReset =
        now.getFullYear() > resetAt.getFullYear() ||
        now.getMonth() > resetAt.getMonth()

      if (needsReset) {
        await supabaseAdmin
          .from('users')
          .update({
            analyses_this_month: 0,
            analyses_reset_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          })
          .eq('id', data.user.id)
        req.user = {
          id: data.user.id,
          email: data.user.email ?? '',
          tier: profile.tier as 'free' | 'pro',
          analysesThisMonth: 0,
          isAdmin: Boolean(profile.is_admin),
        }
      } else {
        req.user = {
          id: data.user.id,
          email: data.user.email ?? '',
          tier: profile.tier as 'free' | 'pro',
          analysesThisMonth: profile.analyses_this_month as number,
          isAdmin: Boolean(profile.is_admin),
        }
      }
    }
  } catch {
    // JWT invalid or Supabase down — proceed as anonymous
  }
  next()
}

/**
 * Reject requests without an authenticated user. Mount AFTER attachUser.
 * Logs every rejection with route/IP for the auth-failure observability
 * Phase 2 wants. Phase 5 will replace console.warn with structured pino.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.user) { next(); return }
  // Phase 5 will replace this with structured pino logging.
  console.warn(JSON.stringify({
    event: 'auth_rejected',
    route: req.originalUrl,
    ip:    req.ip,
    ts:    new Date().toISOString(),
    reason: req.headers['authorization'] ? 'invalid_token' : 'missing_token',
  }))
  res.status(401).json({ error: 'AUTH_REQUIRED' })
}
