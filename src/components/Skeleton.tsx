import { C, R } from '../constants/colors'

interface Props {
  h?: number
}

export function Skeleton({ h = 14 }: Props) {
  return (
    <div
      style={{
        height: h,
        background: C.bg3,
        borderRadius: R.r4,
        opacity: 0.6,
      }}
    />
  )
}
