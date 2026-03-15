import React from 'react'
import { Toast } from './Toast'
import { useApp } from '../state/context'

export function Toasts() {
  const { state, dispatch } = useApp()

  if (state.toasts.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'flex-end',
      }}
    >
      {state.toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={(id) => dispatch({ type: 'DISMISS_TOAST', payload: id })}
        />
      ))}
    </div>
  )
}
