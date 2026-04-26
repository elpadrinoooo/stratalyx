import React, { useEffect, useRef } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { C, R } from '../constants/colors'
import { supabase } from '../lib/supabase'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface Props {
  onClose: () => void
  /** When true, render the "set new password" form (called from password-reset email link). */
  recovery?: boolean
}

export function AuthModal({ onClose, recovery = false }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useFocusTrap(dialogRef)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Close modal once Supabase confirms a regular sign-in OR a password update.
  // (USER_UPDATED fires after the recovery flow successfully sets a new password.)
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && !recovery) onClose()
      if (event === 'USER_UPDATED' && recovery) onClose()
    })
    return () => { subscription.unsubscribe() }
  }, [onClose, recovery])

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      ref={dialogRef}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: C.sans, fontWeight: 700, fontSize: 18, color: C.t1 }}>
            {recovery ? 'Set a new password' : 'Welcome to Stratalyx'}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.t3, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <Auth
          supabaseClient={supabase}
          providers={[]}
          view={recovery ? 'update_password' : 'sign_in'}
          showLinks={!recovery}
          redirectTo={`${window.location.origin}/`}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand:                 'rgb(99,102,241)',
                  brandAccent:           'rgb(79,82,221)',
                  brandButtonText:       '#ffffff',
                  defaultButtonBackground:       'var(--c-bg1)',
                  defaultButtonBackgroundHover:  'var(--c-bg3)',
                  defaultButtonBorder:           'var(--c-border)',
                  defaultButtonText:             'var(--c-t1)',
                  dividerBackground:     'var(--c-border)',
                  inputBackground:       'var(--c-bg1)',
                  inputBorder:           'var(--c-border)',
                  inputBorderHover:      'var(--c-border-88)',
                  inputBorderFocus:      'rgb(99,102,241)',
                  inputText:             'var(--c-t1)',
                  inputLabelText:        'var(--c-t2)',
                  inputPlaceholder:      'var(--c-t4)',
                  messageText:           'var(--c-t2)',
                  messageTextDanger:     'var(--c-loss)',
                  anchorTextColor:       'var(--c-accent)',
                  anchorTextHoverColor:  'var(--c-accent)',
                },
                radii: { borderRadiusButton: '8px', buttonBorderRadius: '8px', inputBorderRadius: '8px' },
                fonts: { bodyFontFamily: C.sans, buttonFontFamily: C.sans, inputFontFamily: C.sans, labelFontFamily: C.sans },
              },
            },
          }}
        />

        <p style={{ marginTop: 16, fontFamily: C.sans, fontSize: 11, color: C.t4, textAlign: 'center', lineHeight: 1.5 }}>
          By continuing you agree this tool provides AI-generated analysis for educational purposes only — not financial advice.
          Free tier: 3 analyses/month. Pro: unlimited.
        </p>
      </div>
    </div>
  )
}
