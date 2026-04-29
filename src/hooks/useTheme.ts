import { useSyncExternalStore, useCallback } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'stratalyx_theme'

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', mode)
  }
}

// ── Module-level singleton store ─────────────────────────────────────────────
// Every useTheme() caller subscribes to the same value. Without this, each
// component held its own useState copy of `mode`, so changing the theme on
// one screen left others (Navbar, AdminPanel, account picker highlight)
// stuck on a stale value — visually inconsistent UI even though the CSS
// vars on <html> had switched.
let currentMode: ThemeMode = (() => {
  if (typeof localStorage === 'undefined') return 'dark'
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  return saved ?? 'dark'
})()

const subscribers = new Set<() => void>()

function subscribe(cb: () => void): () => void {
  subscribers.add(cb)
  return () => { subscribers.delete(cb) }
}

function getSnapshot(): ThemeMode {
  return currentMode
}

function setMode(next: ThemeMode): void {
  if (next === currentMode) return
  currentMode = next
  try { localStorage.setItem(STORAGE_KEY, next) } catch { /* private mode / quota */ }
  applyTheme(next)
  for (const cb of subscribers) cb()
}

// Apply once on module load so the initial paint matches the persisted mode.
if (typeof document !== 'undefined') applyTheme(currentMode)

// Keep the picker UI honest when System mode is active and the OS toggles.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mql = window.matchMedia('(prefers-color-scheme: light)')
  const onChange = () => { if (currentMode === 'system') for (const cb of subscribers) cb() }
  if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange)
}

export function useTheme() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const setTheme = useCallback((next: ThemeMode) => { setMode(next) }, [])

  // Resolve what's actually rendered (for showing the active state in the UI)
  const resolved: 'dark' | 'light' = mode === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : mode

  return { mode, resolved, setTheme }
}
