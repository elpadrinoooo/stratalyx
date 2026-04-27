import { useEffect } from 'react'
import { X } from 'lucide-react'
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
  const hasAction = !!toast.action

  // Toasts with an actionable undo get a longer window (5s) than plain notifications (3.5s).
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), hasAction ? 5000 : 3500)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss, hasAction])

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
        alignItems: 'center',
        minWidth: 200,
        maxWidth: 360,
        animation: 'toastIn .2s ease',
      }}
    >
      <span style={{ fontSize: 14, color: C.t2, flex: 1 }}>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onDismiss(toast.id) }}
          style={{
            background: 'transparent',
            border: 'none',
            color: c,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            padding: '2px 6px',
            flexShrink: 0,
            textTransform: 'uppercase',
            letterSpacing: '.04em',
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: C.t3,
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}
      >
        <X size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
