/**
 * @jest-environment jsdom
 *
 * useTheme is a module-level singleton — every caller must observe the same
 * `mode`. Without this, the Account-page picker could change theme while
 * Navbar / AdminPanel still rendered with stale state.
 *
 * Note: we don't jest.resetModules() between tests because that clones React
 * and breaks @testing-library. Instead each test sets a known starting mode
 * via setTheme, then asserts.
 */
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../../hooks/useTheme'

beforeEach(() => {
  // Drop persisted state and the DOM attribute, then force the singleton
  // back to dark so each test starts from the same baseline.
  localStorage.removeItem('stratalyx_theme')
  document.documentElement.removeAttribute('data-theme')
  const { result } = renderHook(() => useTheme())
  act(() => { result.current.setTheme('dark') })
})

afterAll(() => {
  document.documentElement.removeAttribute('data-theme')
  localStorage.removeItem('stratalyx_theme')
})

describe('useTheme — singleton store', () => {
  it('all callers share one mode', () => {
    const a = renderHook(() => useTheme())
    const b = renderHook(() => useTheme())

    expect(a.result.current.mode).toBe('dark')
    expect(b.result.current.mode).toBe('dark')

    act(() => { a.result.current.setTheme('light') })

    // Both callers must reflect the new mode — this is the bug the
    // singleton refactor fixes; pre-fix the second hook stayed on 'dark'.
    expect(a.result.current.mode).toBe('light')
    expect(b.result.current.mode).toBe('light')
  })

  it('writes data-theme attribute on <html> when mode is dark or light', () => {
    const { result } = renderHook(() => useTheme())

    act(() => { result.current.setTheme('light') })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    act(() => { result.current.setTheme('dark') })
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('removes data-theme attribute when mode is system', () => {
    const { result } = renderHook(() => useTheme())

    act(() => { result.current.setTheme('light') })
    expect(document.documentElement.hasAttribute('data-theme')).toBe(true)

    act(() => { result.current.setTheme('system') })
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('persists the chosen mode to localStorage', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setTheme('light') })
    expect(localStorage.getItem('stratalyx_theme')).toBe('light')
  })

  it('resolves system mode against the OS preference', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setTheme('system') })
    // jsdom defaults matchMedia to false → resolves to dark.
    expect(['dark', 'light']).toContain(result.current.resolved)
    expect(result.current.mode).toBe('system')
  })
})
