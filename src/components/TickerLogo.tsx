import React, { useState } from 'react'
import { C } from '../constants/colors'

interface Props {
  ticker: string
  size?: number
  style?: React.CSSProperties
}

/**
 * Stock logo fetched from Financial Modelling Prep's free image endpoint.
 * Falls back to a colored monogram badge on error.
 */
export function TickerLogo({ ticker, size = 28, style }: Props) {
  const [err, setErr] = useState(false)

  if (err) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: C.accentM,
          border: `1px solid ${C.accentB}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.accent,
          fontSize: Math.round(size * 0.38),
          fontWeight: 800,
          fontFamily: C.mono,
          flexShrink: 0,
          letterSpacing: '-0.03em',
          ...style,
        }}
      >
        {ticker.slice(0, 2)}
      </div>
    )
  }

  return (
    <img
      src={`https://financialmodelingprep.com/image-stock/${encodeURIComponent(ticker)}.png`}
      alt={ticker}
      width={size}
      height={size}
      style={{
        borderRadius: '50%',
        objectFit: 'contain',
        background: '#fff',
        flexShrink: 0,
        border: `1px solid ${C.border}`,
        display: 'block',
        ...style,
      }}
      onError={() => setErr(true)}
    />
  )
}
