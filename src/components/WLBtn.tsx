import React from 'react'
import { Star } from 'lucide-react'
import { C } from '../constants/colors'

interface Props {
  ticker: string
  inWatchlist: boolean
  onToggle: (ticker: string) => void
}

export function WLBtn({ ticker, inWatchlist, onToggle }: Props) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle(ticker)
      }}
      title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-label={inWatchlist ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
      aria-pressed={inWatchlist}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: inWatchlist ? C.warn : C.t3,
        padding: '4px 6px',
        lineHeight: 1,
        display: 'flex', alignItems: 'center',
      }}
    >
      <Star size={16} strokeWidth={2} fill={inWatchlist ? 'currentColor' : 'none'} aria-hidden />
    </button>
  )
}
