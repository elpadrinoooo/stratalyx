import { C, R } from '../constants/colors'
import { useApp } from '../state/context'

const SUGGESTED = ['AAPL', 'NVDA', 'MSFT', 'TSLA'] as const

/**
 * First-run activation nudge. Shows only when the user has zero analyses
 * in their local store. Disappears the moment they run their first one,
 * which is the activation event we care about.
 */
export function FirstAnalysisCTA() {
  const { state, dispatch } = useApp()

  if (Object.keys(state.analyses).length > 0) return null

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.accentM} 0%, ${C.bg1} 100%)`,
        border: `1px solid ${C.accentB}`,
        borderRadius: R.r12,
        padding: '20px 22px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 18,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 280px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Get started in 30 seconds
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 4 }}>
          Run your first AI analysis
        </div>
        <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.5 }}>
          Pick a ticker and an investor strategy — Stratalyx scores it against the framework in seconds.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SUGGESTED.map(ticker => (
          <button
            key={ticker}
            onClick={() => dispatch({ type: 'OPEN_MODAL', payload: ticker })}
            onMouseEnter={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = C.bg1; e.currentTarget.style.color = C.accent }}
            style={{
              background: C.bg1,
              border: `1px solid ${C.accentB}`,
              borderRadius: R.r8,
              color: C.accent,
              cursor: 'pointer',
              fontFamily: C.mono,
              fontSize: 13,
              fontWeight: 700,
              padding: '8px 16px',
              transition: 'background .15s, color .15s',
            }}
          >
            {ticker}
          </button>
        ))}
        <button
          onClick={() => dispatch({ type: 'OPEN_MODAL', payload: '' })}
          style={{
            background: C.accent,
            border: `1px solid ${C.accent}`,
            borderRadius: R.r8,
            color: '#fff',
            cursor: 'pointer',
            fontFamily: C.sans,
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 16px',
          }}
        >
          Search ticker →
        </button>
      </div>
    </div>
  )
}
