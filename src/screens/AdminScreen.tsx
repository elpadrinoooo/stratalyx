import React, { useState, useEffect, useCallback } from 'react'
import { C, R } from '../constants/colors'
import { useApp } from '../state/context'

export const ADMIN_SESSION_KEY = 'stratalyx_admin_pass'

type AffiliateMap = Record<string, string>

// ── helpers ──────────────────────────────────────────────────────────────────

function makeAuthHeader(pass: string): string {
  return 'Basic ' + btoa(`:${pass}`)
}

async function fetchAffiliate(pass: string): Promise<AffiliateMap> {
  const res = await fetch('/api/admin/affiliate', {
    headers: { Authorization: makeAuthHeader(pass) },
  })
  if (res.status === 401) throw new Error('Unauthorized')
  if (res.status === 503) throw new Error('Admin not configured — set ADMIN_PASSWORD in .env')
  if (!res.ok) throw new Error(`Server error ${res.status}`)
  return res.json() as Promise<AffiliateMap>
}

async function saveAffiliate(pass: string, map: AffiliateMap): Promise<void> {
  const res = await fetch('/api/admin/affiliate', {
    method: 'PUT',
    headers: {
      Authorization: makeAuthHeader(pass),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(map),
  })
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) throw new Error(`Server error ${res.status}`)
}

// ── sub-components ────────────────────────────────────────────────────────────

function Row({
  domain, param, onChange, onDelete,
}: {
  domain: string; param: string
  onChange: (d: string, p: string) => void
  onDelete: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
      <input
        value={domain}
        onChange={e => onChange(e.target.value, param)}
        placeholder="domain.com"
        style={inputStyle}
      />
      <span style={{ color: C.t3, fontSize: 13 }}>→</span>
      <input
        value={param}
        onChange={e => onChange(domain, e.target.value)}
        placeholder="?ref=stratalyx"
        style={{ ...inputStyle, flex: 2 }}
      />
      <button
        onClick={onDelete}
        style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: R.r6, color: C.t4, fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
      >
        ✕
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  flex: 1, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: R.r6,
  color: C.t1, fontSize: 13, padding: '5px 9px', outline: 'none', fontFamily: C.mono,
}

// ── main screen ───────────────────────────────────────────────────────────────

export function AdminScreen() {
  const { dispatch } = useApp()

  const [pass,       setPass]       = useState<string>(() => sessionStorage.getItem(ADMIN_SESSION_KEY) ?? '')
  const [loginInput, setLoginInput] = useState('')
  const [authed,     setAuthed]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [saved,      setSaved]      = useState(false)

  // Affiliate map as array of [domain, param] pairs for ordered editing
  const [rows, setRows] = useState<Array<[string, string]>>([])

  const load = useCallback(async (p: string) => {
    setLoading(true); setError('')
    try {
      const map = await fetchAffiliate(p)
      setRows(Object.entries(map))
      setAuthed(true)
      sessionStorage.setItem(ADMIN_SESSION_KEY, p)
    } catch (e) {
      setError(String(e))
      setAuthed(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Try stored password on mount
  useEffect(() => {
    if (pass) load(pass)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const p = loginInput.trim()
    if (!p) return
    setPass(p)
    await load(p)
  }

  async function handleSave() {
    setLoading(true); setError(''); setSaved(false)
    try {
      const map: AffiliateMap = {}
      rows.forEach(([d, p]) => { if (d.trim()) map[d.trim()] = p.trim() })
      await saveAffiliate(pass, map)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function updateRow(i: number, domain: string, param: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? [domain, param] : r))
  }

  function deleteRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  function addRow() {
    setRows(prev => [...prev, ['', '']])
  }

  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: R.r8, cursor: 'pointer',
    fontSize: 13, fontWeight: 700, padding: '7px 16px',
  }

  // ── login ──
  if (!authed) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
        <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, padding: 28 }}>
          <h2 style={{ margin: '0 0 6px', color: C.t1, fontSize: 18, fontWeight: 800 }}>Admin</h2>
          <p style={{ margin: '0 0 20px', color: C.t3, fontSize: 13 }}>Enter your admin password to continue.</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={loginInput}
              onChange={e => setLoginInput(e.target.value)}
              placeholder="Password"
              autoFocus
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
            />
            {error && (
              <div style={{ background: C.lossBg, border: `1px solid ${C.lossB}`, borderRadius: R.r8, color: C.loss, fontSize: 12, padding: '7px 10px', marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={loading} style={{ ...btnBase, background: C.accent, color: '#fff', flex: 1 }}>
                {loading ? 'Checking…' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'Markets' })}
                style={{ ...btnBase, background: C.bg2, color: C.t3, border: `1px solid ${C.border}` }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ── dashboard ──
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 3px', color: C.t1, fontSize: 22, fontWeight: 800 }}>Admin Dashboard</h1>
          <p style={{ margin: 0, color: C.t3, fontSize: 13 }}>Manage affiliate link codes for all source URLs</p>
        </div>
        <button
          onClick={() => { setAuthed(false); setPass(''); sessionStorage.removeItem(ADMIN_SESSION_KEY) }}
          style={{ ...btnBase, background: C.bg2, color: C.t3, border: `1px solid ${C.border}` }}
        >
          Sign out
        </button>
      </div>

      {/* Affiliate editor */}
      <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: R.r12, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ color: C.t1, fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Affiliate Codes</div>
            <div style={{ color: C.t3, fontSize: 12 }}>
              Domain → suffix appended to outbound links. Leave suffix empty to pass through with no tracking.
            </div>
          </div>
          <button
            onClick={() => load(pass)}
            disabled={loading}
            style={{ ...btnBase, background: C.bg2, color: C.t3, border: `1px solid ${C.border}`, fontSize: 12 }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Column headers */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, paddingRight: 32 }}>
          <span style={{ flex: 1, color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>Domain</span>
          <span style={{ flex: 2, color: C.t4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginLeft: 20 }}>Affiliate suffix</span>
        </div>

        {rows.map(([domain, param], i) => (
          <Row
            key={i}
            domain={domain}
            param={param}
            onChange={(d, p) => updateRow(i, d, p)}
            onDelete={() => deleteRow(i)}
          />
        ))}

        <button
          onClick={addRow}
          style={{ background: 'none', border: `1px dashed ${C.border}`, borderRadius: R.r8, color: C.t3, fontSize: 12, padding: '6px 14px', cursor: 'pointer', width: '100%', marginTop: 4 }}
        >
          + Add domain
        </button>
      </div>

      {error && (
        <div style={{ background: C.lossBg, border: `1px solid ${C.lossB}`, borderRadius: R.r8, color: C.loss, fontSize: 12, padding: '8px 12px', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{ ...btnBase, background: C.accent, color: '#fff', minWidth: 120 }}
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span style={{ color: C.gain, fontSize: 13, fontWeight: 600 }}>✓ Saved successfully</span>
        )}
        <button
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'Markets' })}
          style={{ ...btnBase, background: C.bg2, color: C.t3, border: `1px solid ${C.border}`, marginLeft: 'auto' }}
        >
          ← Back to app
        </button>
      </div>

      <p style={{ color: C.t4, fontSize: 11, marginTop: 20 }}>
        Changes are written to <code style={{ fontFamily: C.mono }}>server/affiliate.json</code> and take effect immediately — no restart needed.
      </p>
    </div>
  )
}
