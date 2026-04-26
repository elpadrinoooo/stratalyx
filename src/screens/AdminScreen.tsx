import React, { Suspense } from 'react'
import { C } from '../constants/colors'
import { useApp } from '../state/context'

const AdminPanel = React.lazy(() => import('../admin/AdminPanel'))

export function AdminScreen() {
  const { state, dispatch } = useApp()

  if (!state.user) {
    return <Centered>Sign in to access the admin dashboard.</Centered>
  }
  if (!state.user.isAdmin) {
    return (
      <Centered>
        <div>You don&apos;t have admin access.</div>
        <button
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'Markets' })}
          style={{ marginTop: 12, background: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', fontFamily: C.sans, fontSize: 14 }}
        >
          ← Back to app
        </button>
      </Centered>
    )
  }

  return (
    <Suspense fallback={<Centered>Loading admin…</Centered>}>
      <AdminPanel />
    </Suspense>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      color: C.t2,
      fontFamily: C.sans,
      fontSize: 14,
      gap: 4,
    }}>
      {children}
    </div>
  )
}
