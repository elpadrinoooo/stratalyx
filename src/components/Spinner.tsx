import { C } from '../constants/colors'

interface Props {
  size?: number
  label?: string
}

// Inject CSS keyframes once on module load
const STYLE_ID = 'stratalyx-spinner-keyframes'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes stratalyx-spin {
      to { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)
}

export function Spinner({ size = 20, label = 'Loading' }: Props) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        width: size,
        height: size,
        border: `2px solid ${C.border}`,
        borderTopColor: C.accent,
        borderRadius: '50%',
        animation: 'stratalyx-spin 0.8s linear infinite',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {label}
      </span>
    </div>
  )
}
