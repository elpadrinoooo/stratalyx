import React, { useState } from 'react'
import { C } from '../constants/colors'
import { getLogo } from '../engine/utils'

interface Props {
  name: string
  size?: number
}

export function Avatar({ name, size = 40 }: Props) {
  const [errored, setErrored] = useState(false)
  const monogram = name ? name[0].toUpperCase() : '?'

  if (errored) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: C.bg3,
          border: `2px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ color: C.t3, fontSize: size * 0.35, fontWeight: 700 }}>
          {monogram}
        </span>
      </div>
    )
  }

  return (
    <img
      src={getLogo(name)}
      alt={name}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        border: `2px solid ${C.border}`,
        flexShrink: 0,
        display: 'block',
      }}
    />
  )
}
