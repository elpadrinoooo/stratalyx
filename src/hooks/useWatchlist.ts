import { useCallback } from 'react'
import { useApp } from '../state/context'

interface UseWatchlistReturn {
  watchlist: string[]
  inWatchlist: (ticker: string) => boolean
  toggle: (ticker: string) => void
}

export function useWatchlist(): UseWatchlistReturn {
  const { state, dispatch } = useApp()

  const inWatchlist = useCallback(
    (ticker: string) => state.watchlist.includes(ticker.toUpperCase()),
    [state.watchlist]
  )

  const toggle = useCallback((ticker: string) => {
    const t = ticker.toUpperCase()
    if (state.watchlist.includes(t)) {
      dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: t })
      dispatch({
        type: 'TOAST',
        payload: {
          message: `${t} removed from watchlist`,
          type: 'info',
          action: {
            label: 'Undo',
            onClick: () => dispatch({ type: 'ADD_TO_WATCHLIST', payload: t }),
          },
        },
      })
    } else {
      dispatch({ type: 'ADD_TO_WATCHLIST', payload: t })
      dispatch({ type: 'TOAST', payload: { message: `${t} added to watchlist`, type: 'success' } })
    }
  }, [state.watchlist, dispatch])

  return { watchlist: state.watchlist, inWatchlist, toggle }
}
