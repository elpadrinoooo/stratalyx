/* eslint-disable react-refresh/only-export-components */
import React, { useReducer } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { AppContext } from '../../state/context'
import { reducer } from '../../state/reducer'
import { INIT } from '../../state/initialState'
import type { AppState } from '../../types'

function TestProvider({
  children,
  initialState,
}: {
  children: React.ReactNode
  initialState: AppState
}) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function renderWithCtx(
  ui: React.ReactElement,
  stateOverrides: Partial<AppState> = {},
  renderOptions?: RenderOptions
) {
  const initialState: AppState = { ...INIT, ...stateOverrides }
  return render(
    <TestProvider initialState={initialState}>{ui}</TestProvider>,
    renderOptions
  )
}
