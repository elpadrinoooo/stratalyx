import React, { useState } from 'react'
import { C, R } from '../constants/colors'

interface Props {
  currentKey: string
  onSave: (key: string) => void
  onClose: () => void
}

export function FmpKeyModal({ currentKey, onSave, onClose }: Props) {
  const [value, setValue] = useState(currentKey)

  // Lock body scroll while open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="FMP API Key Management"
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
          padding: 24,
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 24px 80px rgba(0,0,0,.7)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: C.t1, marginBottom: 3 }}>
              🔑 Financial Modeling Prep API Key
            </div>
            <div style={{ color: C.t3, fontSize: 13 }}>
              Free tier · 250 API calls/day · Real-time stock data
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close FMP key modal"
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.bg2; (e.currentTarget as HTMLButtonElement).style.color = C.t1 }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.bg3; (e.currentTarget as HTMLButtonElement).style.color = C.t2 }}
            style={{
              background: C.bg3,
              border: `1px solid ${C.border}`,
              borderRadius: R.r6,
              color: C.t2,
              padding: '5px 9px',
              cursor: 'pointer',
              fontSize: 14,
              transition: 'background .12s, color .12s',
            }}
          >
            ✕
          </button>
        </div>

        {/* Info panel */}
        <div
          style={{
            background: C.gainBg,
            border: `1px solid ${C.gainB}`,
            borderRadius: R.r8,
            padding: '10px 13px',
            marginBottom: 14,
            fontSize: 13,
            color: C.t2,
            lineHeight: 1.7,
          }}
        >
          <div style={{ color: C.gain, fontWeight: 700, marginBottom: 4 }}>
            What this unlocks:
          </div>
          Real-time stock price, P/E ratio, PEG, dividend yield, free cash flow, revenue, net income,
          debt levels, and ROE — all sourced live from Financial Modeling Prep and injected directly
          into the AI prompt for more accurate analysis.
        </div>

        {/* Link */}
        <div style={{ color: C.t3, fontSize: 12, marginBottom: 6 }}>
          Get a free key at{' '}
          <a
            href="https://financialmodelingprep.com/register"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.accent }}
          >
            financialmodelingprep.com/register
          </a>
        </div>

        {/* Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste your FMP API key here…"
          onFocus={e => { (e.target as HTMLInputElement).style.border = `1px solid ${C.accent}` }}
          onBlur={e => { (e.target as HTMLInputElement).style.border = `1px solid ${C.border}` }}
          style={{
            width: '100%',
            background: C.bg3,
            color: C.t1,
            border: `1px solid ${C.border}`,
            borderRadius: R.r8,
            padding: '9px 12px',
            fontSize: 15,
            fontFamily: C.mono,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color .15s',
          }}
        />

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => onSave(value.trim())}
            style={{
              flex: 1,
              background: C.accent,
              color: 'var(--c-fg-on-accent, #fff)',
              border: 'none',
              borderRadius: R.r8,
              padding: '9px 0',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {value.trim() ? 'Save & Enable Live Data' : 'Clear Key'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: C.bg3,
              border: `1px solid ${C.border}`,
              borderRadius: R.r8,
              color: C.t2,
              padding: '9px 16px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>

        {/* Disclaimer */}
        <div style={{ color: C.t4, fontSize: 11, marginTop: 10, textAlign: 'center' }}>
          Key stored in session memory only — forwarded securely to the backend proxy when fetching live data.
        </div>
      </div>
    </div>
  )
}
