import { useState, useEffect, useCallback } from 'react'

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

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    return saved ?? 'dark'
  })

  // Apply on mount and whenever mode changes
  useEffect(() => {
    applyTheme(mode)
  }, [mode])

  const setTheme = useCallback((next: ThemeMode) => {
    setMode(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  // Resolve what's actually rendered (for showing the active state in the UI)
  const resolved: 'dark' | 'light' = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : mode

  return { mode, resolved, setTheme }
}
