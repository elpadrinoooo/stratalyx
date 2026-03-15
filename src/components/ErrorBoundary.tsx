import React from 'react'
import { C, R } from '../constants/colors'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          style={{
            padding: 24,
            margin: 16,
            background: C.lossBg,
            border: `1px solid ${C.lossB}`,
            borderRadius: R.r12,
            textAlign: 'center',
          }}
        >
          <div style={{ color: C.loss, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ color: C.t3, fontSize: 12, fontFamily: C.mono, marginBottom: 12 }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              background: C.bg3,
              border: `1px solid ${C.border}`,
              borderRadius: R.r8,
              color: C.t2,
              fontSize: 11,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
