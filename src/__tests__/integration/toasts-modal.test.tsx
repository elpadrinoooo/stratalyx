/**
 * Integration tests — Toast rendering + modal open/close UI
 * I-32 through I-37
 */
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { renderWithCtx } from '../helpers/renderWithCtx'
import { Toasts } from '../../components/Toasts'
import type { AppState } from '../../types'
import { INIT } from '../../state/initialState'

// ── I-32: Toasts component renders nothing when empty ─────────────────────────

describe('I-32: Toasts renders nothing when no toasts in state', () => {
  it('returns null when toast list is empty', () => {
    const { container } = renderWithCtx(<Toasts />)
    expect(container.firstChild).toBeNull()
  })
})

// ── I-33: Toast message renders when added to state ───────────────────────────

describe('I-33: Toast message renders when state contains toasts', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('renders the toast message text', () => {
    const state: Partial<AppState> = {
      toasts: [{ id: 't1', message: 'Analysis complete', type: 'success' }],
    }
    renderWithCtx(<Toasts />, state)
    expect(screen.getByText('Analysis complete')).toBeInTheDocument()
  })

  it('renders multiple toasts when state has multiple', () => {
    const state: Partial<AppState> = {
      toasts: [
        { id: 't1', message: 'First toast', type: 'success' },
        { id: 't2', message: 'Second toast', type: 'error' },
      ],
    }
    renderWithCtx(<Toasts />, state)
    expect(screen.getByText('First toast')).toBeInTheDocument()
    expect(screen.getByText('Second toast')).toBeInTheDocument()
  })

  it('renders a notifications live region', () => {
    const state: Partial<AppState> = {
      toasts: [{ id: 't1', message: 'Hello', type: 'info' }],
    }
    renderWithCtx(<Toasts />, state)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

// ── I-34: Dismiss button removes a toast ─────────────────────────────────────

describe('I-34: Dismiss button removes the toast', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('clicking the dismiss button removes the toast from the screen', () => {
    const state: Partial<AppState> = {
      toasts: [{ id: 't1', message: 'Goodbye', type: 'info' }],
    }
    renderWithCtx(<Toasts />, state)
    expect(screen.getByText('Goodbye')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /dismiss notification/i }))
    expect(screen.queryByText('Goodbye')).not.toBeInTheDocument()
  })
})

// ── I-35: Toast auto-dismisses after 3500ms ────────────────────────────────────

describe('I-35: Toast auto-dismisses after 3500 ms', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('toast disappears after the auto-dismiss timeout', () => {
    const state: Partial<AppState> = {
      toasts: [{ id: 't1', message: 'Auto gone', type: 'success' }],
    }
    renderWithCtx(<Toasts />, state)
    expect(screen.getByText('Auto gone')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(3500)
    })

    expect(screen.queryByText('Auto gone')).not.toBeInTheDocument()
  })
})

// ── I-36: Toast dispatched via TOAST action appears in UI ────────────────────

describe('I-36: Dispatching TOAST action renders the message', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('a toast dispatched from within the tree appears in the Toasts panel', () => {
    // Render a button that dispatches TOAST and the Toasts component side by side
    function Trigger() {
      const { dispatch } = require('../../state/context').useApp() as { dispatch: (a: unknown) => void }
      return (
        <button
          onClick={() =>
            dispatch({ type: 'TOAST', payload: { message: 'Triggered!', type: 'success' } })
          }
        >
          Fire toast
        </button>
      )
    }

    renderWithCtx(
      <>
        <Trigger />
        <Toasts />
      </>
    )

    fireEvent.click(screen.getByRole('button', { name: /fire toast/i }))
    expect(screen.getByText('Triggered!')).toBeInTheDocument()
  })
})

// ── I-37: Modal open/close via dispatch ───────────────────────────────────────

describe('I-37: Modal state toggles correctly', () => {
  it('state starts with modal closed', () => {
    expect(INIT.modalOpen).toBe(false)
    expect(INIT.modalTicker).toBe('')
  })

  it('OPEN_MODAL sets ticker and opens modal in state', () => {
    const { reducer } = require('../../state/reducer') as typeof import('../../state/reducer')
    const state = reducer(INIT, { type: 'OPEN_MODAL', payload: 'TSLA' })
    expect(state.modalOpen).toBe(true)
    expect(state.modalTicker).toBe('TSLA')
  })

  it('CLOSE_MODAL resets modalOpen and modalTicker', () => {
    const { reducer } = require('../../state/reducer') as typeof import('../../state/reducer')
    const opened = reducer(INIT, { type: 'OPEN_MODAL', payload: 'TSLA' })
    const closed  = reducer(opened, { type: 'CLOSE_MODAL' })
    expect(closed.modalOpen).toBe(false)
    expect(closed.modalTicker).toBe('')
  })
})
