import React, { useEffect, useRef, useState } from 'react'
import { C } from '../constants/colors'

interface Props {
  size?: number
}

export function Spinner({ size = 20 }: Props) {
  const [deg, setDeg] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    ref.current = setInterval(() => {
      setDeg((d) => (d + 12) % 360)
    }, 30)
    return () => {
      if (ref.current !== null) clearInterval(ref.current)
    }
  }, [])

  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid ${C.border}`,
        borderTopColor: C.accent,
        borderRadius: '50%',
        transform: `rotate(${deg}deg)`,
        flexShrink: 0,
      }}
    />
  )
}
