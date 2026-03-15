import { createContext, useContext } from 'react'
import type { AppState, Action } from '../types'
import { INIT } from './initialState'

export interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const AppContext = createContext<AppContextValue>({
  state: INIT,
  dispatch: () => undefined,
})

export function useApp(): AppContextValue {
  return useContext(AppContext)
}
