import React, { useState } from 'react'
import {
  Mail, Lock, LogOut, Sun, Moon, Monitor, BarChart3, Star,
  ArrowLeftRight, Archive, Sparkles, ShieldCheck,
} from 'lucide-react'
import { C, R } from '../constants/colors'
import { useApp } from '../state/context'
import { useUsageInfo } from '../hooks/useUsageInfo'
import { useTheme, type ThemeMode } from '../hooks/useTheme'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { supabase } from '../lib/supabase'
import { Button } from '../components/Button'

// ── Account screen ──────────────────────────────────────────────────────────
export function AccountScreen() {
  const { state, dispatch } = useApp()
  const { usage } = useUsageInfo()
  const width = useWindowWidth()
  const isCompact = width <= 768

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'SET_USER', payload: null })
    dispatch({ type: 'SET_SCREEN', payload: 'Markets' })
  }

  if (!state.user) return null
  const { email, tier, isAdmin } = state.user

  const stats = {
    analyses: Object.keys(state.analyses).length,
    watchlist: state.watchlist.length,
    comparisons: state.comparisons.length,
    archived: state.archived.length,
  }

  return (
    <div style={{
      maxWidth: 920, margin: '32px auto', padding: '0 18px',
      display: 'flex', flexDirection: 'column', gap: 18,
      fontFamily: C.sans,
    }}>
      <ProfileHeader email={email} tier={tier} isAdmin={isAdmin} />

      <UsageCard usage={usage} tier={tier} />

      <StatsGrid stats={stats} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr',
        gap: 16,
      }}>
        <SettingsColumn currentEmail={email} />
        <PreferencesColumn onSignOut={() => { void handleSignOut() }} />
      </div>
    </div>
  )
}

// ── Profile header (avatar + identity) ──────────────────────────────────────
function ProfileHeader({ email, tier, isAdmin }: { email: string; tier: 'free' | 'pro'; isAdmin: boolean }) {
  const initial = (email[0] ?? '?').toUpperCase()
  return (
    <div style={{
      background: C.bg2,
      border: `1px solid ${C.border}`,
      borderRadius: R.r16,
      padding: 22,
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      flexWrap: 'wrap',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: `linear-gradient(135deg, ${C.accent}, ${C.accentB})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 28, fontWeight: 700,
        boxShadow: `0 4px 16px ${C.accentM}`,
        flexShrink: 0,
      }}>
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.t3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
          Signed in
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.t1, wordBreak: 'break-all', lineHeight: 1.3 }}>
          {email}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <Pill icon={tier === 'pro' ? <Sparkles size={11} strokeWidth={2.4} aria-hidden /> : null}
                color={tier === 'pro' ? C.accent : C.t2}
                bg={tier === 'pro' ? C.accentM : C.bg3}
                border={tier === 'pro' ? C.accentB : C.border}>
            {tier === 'pro' ? 'PRO' : 'FREE TIER'}
          </Pill>
          {isAdmin && (
            <Pill icon={<ShieldCheck size={11} strokeWidth={2.4} aria-hidden />}
                  color={C.warn} bg={C.warnBg} border={C.warnB}>
              ADMIN
            </Pill>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Usage card ──────────────────────────────────────────────────────────────
function UsageCard({ usage, tier }: { usage: ReturnType<typeof useUsageInfo>['usage']; tier: 'free' | 'pro' }) {
  if (tier === 'pro') {
    return (
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <SectionLabel>This month</SectionLabel>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.t1, marginTop: 4 }}>
              Unlimited <span style={{ color: C.t3, fontSize: 15, fontWeight: 500 }}>analyses</span>
            </div>
            <div style={{ fontSize: 13, color: C.t2, marginTop: 4 }}>
              Pro members run as many strategy analyses as they want — no monthly cap.
            </div>
          </div>
          <Pill icon={<Sparkles size={11} strokeWidth={2.4} aria-hidden />} color={C.accent} bg={C.accentM} border={C.accentB}>
            PRO BENEFIT
          </Pill>
        </div>
      </Card>
    )
  }

  // Free tier
  const used = usage?.analysesThisMonth ?? 0
  const limit = usage?.limit ?? 3
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const remaining = Math.max(0, limit - used)
  const reached = usage?.limitReached ?? false
  const barColor = reached ? C.loss : pct >= 67 ? C.warn : C.accent

  // The free tier resets at the start of each calendar month — show days remaining.
  const now = new Date()
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const msPerDay = 86_400_000
  const daysUntilReset = Math.max(1, Math.ceil((nextReset.getTime() - now.getTime()) / msPerDay))

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <SectionLabel>This month</SectionLabel>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.t1, marginTop: 4, fontFamily: C.mono }}>
            {used} <span style={{ color: C.t3, fontSize: 18 }}>/ {limit}</span>
            <span style={{ color: C.t3, fontSize: 14, fontWeight: 500, fontFamily: C.sans, marginLeft: 6 }}>analyses used</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.t2 }}>
            {remaining} {remaining === 1 ? 'analysis' : 'analyses'} left
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
            Resets in {daysUntilReset} {daysUntilReset === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>
      <div style={{ height: 8, borderRadius: R.r99, background: C.bg3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: barColor,
          borderRadius: R.r99,
          transition: 'width .35s ease, background .2s',
        }} />
      </div>
      {reached && (
        <Banner type="warn" style={{ marginTop: 12 }}>
          You&rsquo;ve hit the free monthly cap. Upgrade to Pro for unlimited analyses (coming soon).
        </Banner>
      )}
      <ProUpsell />
    </Card>
  )
}

function ProUpsell() {
  return (
    <div style={{
      marginTop: 12,
      background: `linear-gradient(135deg, ${C.accentM} 0%, transparent 100%)`,
      border: `1px solid ${C.accentB}`,
      borderRadius: R.r10,
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
        <Sparkles size={18} strokeWidth={2} color="var(--c-accent)" aria-hidden />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>Pro tier — coming soon</div>
          <div style={{ fontSize: 12, color: C.t2, marginTop: 2 }}>
            Unlimited analyses, priority support, and early access. We&rsquo;ll email you the moment it opens.
          </div>
        </div>
      </div>
      <Pill color={C.t2} bg={C.bg2} border={C.border}>BETA</Pill>
    </div>
  )
}

// ── Stats grid ──────────────────────────────────────────────────────────────
interface Stats { analyses: number; watchlist: number; comparisons: number; archived: number }
function StatsGrid({ stats }: { stats: Stats }) {
  const items = [
    { label: 'Analyses run',   value: stats.analyses,    Icon: BarChart3,       color: C.accent },
    { label: 'Watchlist',      value: stats.watchlist,   Icon: Star,            color: C.warn },
    { label: 'Comparisons',    value: stats.comparisons, Icon: ArrowLeftRight,  color: C.gain },
    { label: 'Archived',       value: stats.archived,    Icon: Archive,         color: C.t3 },
  ]
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 10,
    }}>
      {items.map(({ label, value, Icon, color }) => (
        <div key={label} style={{
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: R.r10,
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {label}
            </span>
            <Icon size={14} strokeWidth={2} color={color} aria-hidden />
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.t1, fontFamily: C.mono, lineHeight: 1 }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Settings column (email + password) ──────────────────────────────────────
function SettingsColumn({ currentEmail }: { currentEmail: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ChangeEmailCard currentEmail={currentEmail} />
      <ChangePasswordCard />
    </div>
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
    if (error) setMsg({ type: 'err', text: error.message })
    else {
      setMsg({
        type: 'ok',
        text: 'Confirmation links sent to both your current address and the new one — click both links to complete the change.',
      })
      setEmail('')
    }
  }

  return (
    <Card>
      <CardHeader Icon={Mail} title="Email address" subtitle={currentEmail} />
      <form onSubmit={(e) => { void submit(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="email"
          placeholder="new-email@example.com"
          aria-label="New email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <div>
          <Button type="submit" variant="primary" size="sm" disabled={loading || !email} loading={loading}>
            {loading ? 'Sending…' : 'Send confirmation email'}
          </Button>
        </div>
        {msg && <Banner type={msg.type === 'ok' ? 'ok' : 'err'}>{msg.text}</Banner>}
      </form>
    </Card>
  )
}

function ChangePasswordCard() {
  const { state } = useApp()
  const email = state.user?.email ?? ''
  const [currentPw, setCurrentPw] = useState('')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!currentPw)            { setMsg({ type: 'err', text: 'Enter your current password' }); return }
    if (pw.length < 8)         { setMsg({ type: 'err', text: 'New password must be at least 8 characters' }); return }
    if (pw !== confirm)        { setMsg({ type: 'err', text: 'Passwords do not match' }); return }
    if (pw === currentPw)      { setMsg({ type: 'err', text: 'New password must differ from current' }); return }
    if (!email)                { setMsg({ type: 'err', text: 'Missing email — try refreshing the page' }); return }

    setLoading(true)

    // Verify the current password by re-attempting sign-in. Supabase's "Require
    // current password when updating" setting rejects updateUser() without proof
    // of current credentials. signInWithPassword refreshes the session in place
    // — no sign-out side effect.
    const verify = await supabase.auth.signInWithPassword({ email, password: currentPw })
    if (verify.error) {
      setLoading(false)
      setMsg({ type: 'err', text: 'Current password is incorrect' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: pw })
    setLoading(false)
    if (error) {
      // Supabase returns the precise rejection (length / strength / HIBP leak).
      setMsg({ type: 'err', text: error.message })
    } else {
      setMsg({ type: 'ok', text: 'Password updated.' })
      setCurrentPw(''); setPw(''); setConfirm('')
    }
  }

  return (
    <Card>
      <CardHeader Icon={Lock} title="Password" subtitle="Min 8 characters · current password required" />
      <form onSubmit={(e) => { void submit(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="password"
          placeholder="Current password"
          aria-label="Current password"
          autoComplete="current-password"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="New password"
          aria-label="New password (minimum 8 characters)"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
          minLength={8}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          aria-label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          style={inputStyle}
        />
        <div>
          <Button type="submit" variant="primary" size="sm" disabled={loading} loading={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </div>
        {msg && <Banner type={msg.type === 'ok' ? 'ok' : 'err'}>{msg.text}</Banner>}
      </form>
    </Card>
  )
}

// ── Preferences column (theme + sign out) ───────────────────────────────────
function PreferencesColumn({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ThemeCard />
      <SessionCard onSignOut={onSignOut} />
    </div>
  )
}

function ThemeCard() {
  const { mode, setTheme } = useTheme()
  const opts: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { id: 'light',  label: 'Light',  Icon: Sun },
    { id: 'dark',   label: 'Dark',   Icon: Moon },
    { id: 'system', label: 'System', Icon: Monitor },
  ]
  return (
    <Card>
      <CardHeader Icon={Sun} title="Appearance" subtitle="Color theme" />
      <div
        role="group"
        aria-label="Color theme"
        style={{
          display: 'flex',
          background: C.bg1,
          border: `1px solid ${C.border}`,
          borderRadius: R.r8,
          padding: 2,
          alignSelf: 'flex-start',
        }}
      >
        {opts.map(({ id, label, Icon }) => {
          const active = mode === id
          return (
            <button
              key={id}
              onClick={() => setTheme(id)}
              aria-pressed={active}
              aria-label={`${label} mode`}
              title={`${label} mode`}
              style={{
                background: active ? C.bg3 : 'transparent',
                border: 'none',
                borderRadius: R.r6,
                color: active ? C.t1 : C.t3,
                cursor: 'pointer',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                fontFamily: C.sans,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'background .15s, color .15s',
              }}
            >
              <Icon size={13} strokeWidth={2} aria-hidden />
              {label}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function SessionCard({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Card>
      <CardHeader Icon={LogOut} title="Sign out" subtitle="Ends your session on this device" />
      <div>
        <Button variant="destructive" size="sm" icon={<LogOut size={14} strokeWidth={2} aria-hidden />} onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </Card>
  )
}

// ── Shared atoms ────────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: C.bg2,
      border: `1px solid ${C.border}`,
      borderRadius: R.r12,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {children}
    </div>
  )
}

function CardHeader({ Icon, title, subtitle }: { Icon: typeof Sun; title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: R.r8,
        background: C.bg3, border: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={15} strokeWidth={2} color="var(--c-t2)" aria-hidden />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.t3, marginTop: 2, wordBreak: 'break-all' }}>{subtitle}</div>}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: C.sans, fontSize: 11, fontWeight: 700, color: C.t3,
      textTransform: 'uppercase', letterSpacing: '.07em',
    }}>
      {children}
    </span>
  )
}

function Pill({ children, color, bg, border, icon }: {
  children: React.ReactNode; color: string; bg: string; border: string; icon?: React.ReactNode
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px',
      borderRadius: R.r99,
      fontSize: 11, fontWeight: 700, letterSpacing: '.05em',
      background: bg, color, border: `1px solid ${border}`,
      fontFamily: C.sans,
    }}>
      {icon}
      {children}
    </span>
  )
}

function Banner({ type, children, style }: { type: 'ok' | 'err' | 'warn'; children: React.ReactNode; style?: React.CSSProperties }) {
  const palette = type === 'ok'
    ? { bg: C.gainBg, bd: C.gainB, fg: C.gain }
    : type === 'warn'
      ? { bg: C.warnBg, bd: C.warnB, fg: C.warn }
      : { bg: C.lossBg, bd: C.lossB, fg: C.loss }
  return (
    <div style={{
      background: palette.bg,
      border: `1px solid ${palette.bd}`,
      borderRadius: R.r8,
      padding: '9px 12px',
      color: palette.fg,
      fontFamily: C.sans,
      fontSize: 13,
      ...style,
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
