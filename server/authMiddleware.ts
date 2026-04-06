import type { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from './supabaseAdmin.js'

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string
      email: string
      tier: 'free' | 'pro'
      analysesThisMonth: number
    }
  }
}

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers['authorization']
  if (!auth?.startsWith('Bearer ')) { next(); return }

  const token = auth.slice(7)
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) { next(); return }

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('tier, analyses_this_month, analyses_reset_at')
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
        }
      } else {
        req.user = {
          id: data.user.id,
          email: data.user.email ?? '',
          tier: profile.tier as 'free' | 'pro',
          analysesThisMonth: profile.analyses_this_month as number,
        }
      }
    }
  } catch {
    // JWT invalid or Supabase down — proceed as anonymous
  }
  next()
}
