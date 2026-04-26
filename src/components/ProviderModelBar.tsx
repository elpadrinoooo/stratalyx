import React, { useEffect } from 'react'
import { C, R } from '../constants/colors'
import { PROVIDERS } from '../constants/providers'
import { useApp } from '../state/context'
import { useUsageInfo } from '../hooks/useUsageInfo'

export function ProviderModelBar() {
  const { state, dispatch } = useApp()
  const { usage } = useUsageInfo()

  // Filter PROVIDERS / models by the admin-controlled allowlist from /api/user/me.
  // Falls back to "everything" when usage hasn't loaded yet (anon path) or when
  // the API didn't include the field (older backend).
  const enabledProviderIds = usage?.enabledProviders ?? PROVIDERS.map(p => p.id)
  const enabledModelMap    = usage?.enabledModels ?? null

  const visibleProviders = PROVIDERS
    .filter(p => enabledProviderIds.includes(p.id))
    .map(p => {
      const allowed = enabledModelMap?.[p.id]
      const models = allowed ? p.models.filter(m => allowed.includes(m.id)) : p.models
      return { ...p, models }
    })
    .filter(p => p.models.length > 0)

  const fallback = visibleProviders[0] ?? PROVIDERS[0]
  const prov = visibleProviders.find(p => p.id === state.provider) ?? fallback
  const models = prov.models

  // Ensure selected model exists for this provider; fall back to first
  const modelId = models.some((m) => m.id === state.model)
    ? state.model
    : models[0]?.id ?? state.model

  // Auto-correct app state if the admin disables what the user previously had selected.
  useEffect(() => {
    if (prov.id !== state.provider) dispatch({ type: 'SET_PROVIDER', payload: prov.id })
    if (modelId !== state.model)     dispatch({ type: 'SET_MODEL',    payload: modelId })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only realign when allowlist changes
  }, [prov.id, modelId])

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = visibleProviders.find(p => p.id === e.target.value)
    if (!newProv || newProv.models.length === 0) return
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
      <select value={prov.id} onChange={handleProviderChange} style={selectStyle}>
        {visibleProviders.map((p) => (
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
