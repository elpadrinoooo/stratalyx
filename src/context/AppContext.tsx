import React, { useReducer, useEffect } from 'react'
import { AppContext } from '../state/context'
import { reducer } from '../state/reducer'
import { loadState, saveState } from '../state/persist'

interface Props {
  children: React.ReactNode
  initialState?: ReturnType<typeof loadState>
}

export function AppProvider({ children, initialState }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState ?? loadState())

  useEffect(() => {
    saveState(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only persist when data fields change, not transient UI state
  }, [state.analyses, state.comparisons, state.watchlist])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}
