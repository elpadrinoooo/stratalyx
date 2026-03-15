import React from 'react'
import { C, R } from '../constants/colors'
import { PROVIDERS, PROV } from '../constants/providers'
import { useApp } from '../state/context'

export function ProviderModelBar() {
  const { state, dispatch } = useApp()
  const prov = PROV[state.provider] ?? PROVIDERS[0]
  const models = prov.models

  // Ensure selected model exists for this provider; fall back to first
  const modelId = models.some((m) => m.id === state.model)
    ? state.model
    : models[0].id

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = PROV[e.target.value]
    if (!newProv) return
    dispatch({ type: 'SET_PROVIDER', payload: newProv.id })
    dispatch({ type: 'SET_MODEL', payload: newProv.models[0].id })
  }

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'SET_MODEL', payload: e.target.value })
  }

  const selectStyle: React.CSSProperties = {
    background: C.bg2,
    color: C.t1,
    border: `1px solid ${C.border}`,
    borderRadius: R.r8,
    padding: '6px 10px',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <select value={state.provider} onChange={handleProviderChange} style={selectStyle}>
        {PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <select value={modelId} onChange={handleModelChange} style={selectStyle}>
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>

      <div
        style={{
          background: prov.color + '18',
          border: `1px solid ${prov.color}33`,
          borderRadius: R.r8,
          padding: '6px 10px',
          fontSize: 13,
          color: prov.color,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {prov.shortName}
      </div>
    </div>
  )
}
