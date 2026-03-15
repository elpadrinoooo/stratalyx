import React from 'react'
import { R } from '../constants/colors'

interface Props {
  color: string
  small?: boolean
  children: React.ReactNode
}

export function Tag({ color, small, children }: Props) {
  return (
    <span
      style={{
        background: color + '18',
        border: `1px solid ${color}38`,
        borderRadius: R.r99,
        color,
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        padding: small ? '1px 7px' : '3px 10px',
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
