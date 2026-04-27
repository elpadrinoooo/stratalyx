import { C, R } from '../constants/colors'

interface Props {
  label: string
  value: string
  color?: string
}

export function Kpi({ label, value, color }: Props) {
  return (
    <div
      style={{
        background: C.bg1,
        border: `1px solid ${C.border}`,
        borderRadius: R.r8,
        padding: '9px 13px',
      }}
    >
      <div
        style={{
          color: C.t3,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '.07em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: color ?? C.t1,
          fontWeight: 600,
          fontSize: 15,
          fontFamily: C.mono,
        }}
      >
        {value}
      </div>
    </div>
  )
}
