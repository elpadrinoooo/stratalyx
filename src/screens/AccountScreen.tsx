import { useState } from 'react'
import { C, R } from '../constants/colors'
import { useApp } from '../state/context'
import { useUsageInfo } from '../hooks/useUsageInfo'
import { supabase } from '../lib/supabase'

export function AccountScreen() {
  const { state, dispatch } = useApp()
  const { usage } = useUsageInfo()

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
    <div style={{ maxWidth: 480, margin: '48px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontFamily: C.sans, fontSize: 22, fontWeight: 700, color: C.t1, margin: 0 }}>
        Account
      </h1>

      {/* Profile card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: C.sans, fontSize: 15, color: C.t2 }}>{email}</span>
          {tierBadge}
        </div>
        {usageLine()}
        {tier === 'free' && (
          <div style={{
            background: C.accentM,
            border: `1px solid ${C.accentB}`,
            borderRadius: R.r8,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.accent }}>
                Pro tier — coming soon
              </span>
              <span style={{
                fontFamily: C.sans, fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
                background: C.bg2, border: `1px solid ${C.border}`, color: C.t2,
                padding: '2px 8px', borderRadius: R.r99, textTransform: 'uppercase',
              }}>
                Beta
              </span>
            </div>
            <span style={{ fontFamily: C.sans, fontSize: 12, color: C.t2 }}>
              Unlimited analyses, priority support, and early access to new features. Billing
              isn&apos;t live yet — we&apos;ll email you the moment Pro opens up.
            </span>
          </div>
        )}
      </Card>

      <ChangeEmailCard currentEmail={email} />
      <ChangePasswordCard />

      <Card>
        <SectionLabel>Session</SectionLabel>
        <button
          onClick={() => { void handleSignOut() }}
          style={btnSecondary}
        >
          Sign Out
        </button>
      </Card>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: C.bg2,
      border: `1px solid ${C.border}`,
      borderRadius: R.r12,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.t2, textTransform: 'uppercase', letterSpacing: '.04em' }}>
      {children}
    </span>
  )
}

function ChangeEmailCard({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!email || email === currentEmail) return
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ email })
    setLoading(false)
    if (error) {
      setMsg({ type: 'err', text: error.message })
    } else {
      setMsg({ type: 'ok', text: 'Confirmation email sent — click the link to confirm the change.' })
      setEmail('')
    }
  }

  return (
    <Card>
      <SectionLabel>Change email</SectionLabel>
      <form onSubmit={(e) => { void submit(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="new-email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <button type="submit" disabled={loading || !email} style={{ ...btnPrimary, opacity: (loading || !email) ? 0.6 : 1 }}>
          {loading ? 'Sending…' : 'Send confirmation email'}
        </button>
        {msg && <Banner type={msg.type}>{msg.text}</Banner>}
      </form>
    </Card>
  )
}

function ChangePasswordCard() {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (pw.length < 8) { setMsg({ type: 'err', text: 'Password must be at least 8 characters' }); return }
    if (pw !== confirm) { setMsg({ type: 'err', text: 'Passwords do not match' }); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setLoading(false)
    if (error) {
      setMsg({ type: 'err', text: error.message })
    } else {
      setMsg({ type: 'ok', text: 'Password updated.' })
      setPw(''); setConfirm('')
    }
  }

  return (
    <Card>
      <SectionLabel>Change password</SectionLabel>
      <form onSubmit={(e) => { void submit(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="password"
          placeholder="New password (min 8 chars)"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
          minLength={8}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          style={inputStyle}
        />
        <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
        {msg && <Banner type={msg.type}>{msg.text}</Banner>}
      </form>
    </Card>
  )
}

function Banner({ type, children }: { type: 'ok' | 'err'; children: React.ReactNode }) {
  const isOk = type === 'ok'
  return (
    <div style={{
      background: isOk ? C.gainBg : C.lossBg,
      border: `1px solid ${isOk ? C.gainB : C.lossB}`,
      borderRadius: R.r8,
      padding: '10px 12px',
      color: isOk ? C.gain : C.loss,
      fontFamily: C.sans,
      fontSize: 13,
    }}>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: C.bg1,
  border: `1px solid ${C.border}`,
  borderRadius: R.r8,
  color: C.t1,
  fontFamily: C.sans,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  padding: '10px 16px',
  background: C.accent,
  color: '#fff',
  border: 'none',
  borderRadius: R.r8,
  fontFamily: C.sans,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  alignSelf: 'flex-start',
}

const btnSecondary: React.CSSProperties = {
  padding: '9px 16px',
  background: C.bg3,
  border: `1px solid ${C.border}`,
  borderRadius: R.r8,
  color: C.t2,
  fontFamily: C.sans,
  fontSize: 14,
  cursor: 'pointer',
  alignSelf: 'flex-start',
}
