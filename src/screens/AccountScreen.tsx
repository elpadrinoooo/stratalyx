import { useEffect } from 'react'
import { C, R } from '../constants/colors'
import { useApp } from '../state/context'
import { useUsageInfo } from '../hooks/useUsageInfo'
import { supabase } from '../lib/supabase'

export function AccountScreen() {
  const { state, dispatch } = useApp()
  const { usage, refetch } = useUsageInfo()

  useEffect(() => { refetch() }, [refetch])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'SET_USER', payload: null })
    dispatch({ type: 'SET_SCREEN', payload: 'Markets' })
  }

  if (!state.user) return null

  const { email, tier } = state.user

  const tierBadge = (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: R.r99,
      fontSize: 12,
      fontWeight: 700,
      fontFamily: C.sans,
      background: tier === 'pro' ? C.accentB : C.bg3,
      color: tier === 'pro' ? C.accent : C.t3,
      border: `1px solid ${tier === 'pro' ? C.accent : C.border}`,
    }}>
      {tier === 'pro' ? 'PRO' : 'FREE'}
    </span>
  )

  const usageLine = () => {
    if (!usage) return null
    if (usage.tier === 'pro') {
      return (
        <span style={{ fontFamily: C.sans, fontSize: 14, color: C.t3 }}>
          Unlimited analyses
        </span>
      )
    }
    const pct = usage.limit ? (usage.analysesThisMonth / usage.limit) * 100 : 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontFamily: C.sans, fontSize: 14, color: C.t2 }}>
          {usage.analysesThisMonth} / {usage.limit} analyses this month
        </span>
        <div style={{ height: 6, borderRadius: R.r99, background: C.bg3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            background: pct >= 100 ? C.loss : C.accent,
            borderRadius: R.r99,
            transition: 'width .3s',
          }} />
        </div>
        {usage.limitReached && (
          <span style={{ fontFamily: C.sans, fontSize: 12, color: C.loss }}>
            Monthly limit reached. Upgrade to Pro for unlimited analyses.
          </span>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '48px auto', padding: '0 16px' }}>
      <h1 style={{ fontFamily: C.sans, fontSize: 22, fontWeight: 700, color: C.t1, marginBottom: 24 }}>
        Account
      </h1>

      {/* Profile card */}
      <div style={{
        background: C.bg2,
        border: `1px solid ${C.border}`,
        borderRadius: R.r12,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: C.sans, fontSize: 15, color: C.t2 }}>{email}</span>
          {tierBadge}
        </div>

        {usageLine()}

        {tier === 'free' && (
          <div style={{
            background: C.accentB,
            border: `1px solid ${C.accentM}`,
            borderRadius: R.r8,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <span style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.accent }}>
              Upgrade to Pro — $19/month
            </span>
            <span style={{ fontFamily: C.sans, fontSize: 12, color: C.t3 }}>
              Unlimited analyses, priority support, and early access to new features.
            </span>
          </div>
        )}

        <button
          onClick={() => { void handleSignOut() }}
          style={{
            padding: '9px 16px',
            background: C.bg3,
            border: `1px solid ${C.border}`,
            borderRadius: R.r8,
            color: C.t2,
            fontFamily: C.sans,
            fontSize: 14,
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
