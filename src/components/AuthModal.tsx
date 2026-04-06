import React, { useState } from 'react'
import { C, R } from '../constants/colors'
import { useAuth } from '../hooks/useAuth'

type View = 'signin' | 'signup' | 'reset'

interface Props {
  onClose: () => void
}

export function AuthModal({ onClose }: Props) {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth()
  const [view, setView] = useState<View>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [tosChecked, setTosChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const reset = () => { setError(null); setSuccess(null) }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    onClose()
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (!tosChecked) { setError('You must accept the Terms of Service to continue'); return }
    setLoading(true)
    const { error: err } = await signUp(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    setSuccess('Check your email to verify your account before analysing.')
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()
    setLoading(true)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) { setError(err); return }
    setSuccess('Password reset email sent — check your inbox.')
  }

  const handleGoogle = async () => {
    reset()
    setLoading(true)
    const { error: err } = await signInWithGoogle()
    setLoading(false)
    if (err) setError(err)
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
    width: '100%',
    padding: '10px 16px',
    background: C.accent,
    color: '#fff',
    border: 'none',
    borderRadius: R.r8,
    fontFamily: C.sans,
    fontSize: 14,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
  }

  const btnSecondary: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    background: C.bg1,
    color: C.t1,
    border: `1px solid ${C.border}`,
    borderRadius: R.r8,
    fontFamily: C.sans,
    fontSize: 14,
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  }

  const tabBtn = (v: View, label: string) => (
    <button
      onClick={() => { setView(v); reset() }}
      style={{
        padding: '6px 14px',
        background: view === v ? C.accent : 'transparent',
        color: view === v ? '#fff' : C.t2,
        border: 'none',
        borderRadius: R.r8,
        fontFamily: C.sans,
        fontSize: 13,
        cursor: 'pointer',
        fontWeight: view === v ? 600 : 400,
      }}
    >
      {label}
    </button>
  )

  return (
    <div
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in or create account"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: R.r16,
          padding: 28,
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 24px 80px rgba(0,0,0,.7)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: C.sans, fontWeight: 700, fontSize: 18, color: C.t1 }}>
            {view === 'reset' ? 'Reset Password' : 'Welcome to Stratalyx'}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.t3, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tab row */}
        {view !== 'reset' && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: C.bg1, borderRadius: R.r8, padding: 4 }}>
            {tabBtn('signin', 'Sign In')}
            {tabBtn('signup', 'Create Account')}
          </div>
        )}

        {/* Error / Success banners */}
        {error && (
          <div style={{ background: C.lossBg, border: `1px solid ${C.lossB}`, borderRadius: R.r8, padding: '10px 12px', marginBottom: 14, color: C.loss, fontFamily: C.sans, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: C.gainBg, border: `1px solid ${C.gainB}`, borderRadius: R.r8, padding: '10px 12px', marginBottom: 14, color: C.gain, fontFamily: C.sans, fontSize: 13 }}>
            {success}
          </div>
        )}

        {/* Sign In */}
        {view === 'signin' && !success && (
          <form onSubmit={(e) => { void handleSignIn(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" style={btnPrimary} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <button type="button" style={btnSecondary} disabled={loading} onClick={() => { void handleGoogle() }}>
              <GoogleIcon /> Continue with Google
            </button>
            <button type="button" onClick={() => { setView('reset'); reset() }} style={{ background: 'none', border: 'none', color: C.accent, fontFamily: C.sans, fontSize: 13, cursor: 'pointer', textAlign: 'right' }}>
              Forgot password?
            </button>
          </form>
        )}

        {/* Sign Up */}
        {view === 'signup' && !success && (
          <form onSubmit={(e) => { void handleSignUp(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            <input style={inputStyle} type="password" placeholder="Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            <input style={inputStyle} type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', fontFamily: C.sans, fontSize: 12, color: C.t3 }}>
              <input type="checkbox" checked={tosChecked} onChange={e => setTosChecked(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
              I agree to the Terms of Service and understand this tool provides AI-generated analysis for educational purposes only — not financial advice.
            </label>
            <button type="submit" style={btnPrimary} disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
            <button type="button" style={btnSecondary} disabled={loading} onClick={() => { void handleGoogle() }}>
              <GoogleIcon /> Continue with Google
            </button>
          </form>
        )}

        {/* Reset Password */}
        {view === 'reset' && !success && (
          <form onSubmit={(e) => { void handleReset(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={inputStyle} type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            <button type="submit" style={btnPrimary} disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Email'}
            </button>
            <button type="button" onClick={() => { setView('signin'); reset() }} style={{ background: 'none', border: 'none', color: C.accent, fontFamily: C.sans, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* Footer */}
        <p style={{ marginTop: 16, fontFamily: C.sans, fontSize: 11, color: C.t4, textAlign: 'center', lineHeight: 1.5 }}>
          Free tier: 3 analyses/month. Pro: unlimited.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}
