import { C, R } from '../constants/colors'

interface Props {
  live: boolean
}

export function LiveBadge({ live }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: live ? C.gainBg : C.warnBg,
        border: `1px solid ${live ? C.gainB : C.warnB}`,
        borderRadius: R.r6,
        padding: '3px 9px',
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: live ? C.gain : C.warn,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          color: live ? C.gain : C.warn,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {live ? 'Live FMP Data' : 'AI Estimated'}
      </span>
    </div>
  )
}
