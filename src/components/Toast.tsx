import React, { useEffect } from 'react'
import { C, R } from '../constants/colors'
import type { Toast as ToastType } from '../types'

interface Props {
  toast: ToastType
  onDismiss: (id: string) => void
}

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('toast-anim')) {
  const s = document.createElement('style')
  s.id = 'toast-anim'
  s.textContent = '@keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}'
  document.head.appendChild(s)
}

function typeColor(type: ToastType['type']): string {
  if (type === 'success') return C.gain
  if (type === 'error')   return C.loss
  if (type === 'info')    return C.accent
  return C.warn
}

export function Toast({ toast, onDismiss }: Props) {
  const c = typeColor(toast.type)

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3500)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  return (
    <div
      style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${c}`,
        borderRadius: R.r8,
        padding: '9px 14px',
        display: 'flex',
        gap: 10,
        minWidth: 200,
        maxWidth: 300,
        animation: 'toastIn .2s ease',
      }}
    >
      <span style={{ fontSize: 14, color: C.t2, flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: C.t3,
          fontSize: 14,
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}
