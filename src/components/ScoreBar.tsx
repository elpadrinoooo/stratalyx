import React from 'react'
import { C, R } from '../constants/colors'

interface Props {
  score: number
  color: string
  max?: number
}

export function ScoreBar({ score, color, max = 10 }: Props) {
  const pct = `${((score / max) * 100).toFixed(1)}%`
  return (
    <div
      style={{
        background: C.bg2,
        borderRadius: R.r99,
        height: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: color,
          height: '100%',
          width: pct,
          transition: 'width .5s',
        }}
      />
    </div>
  )
}
