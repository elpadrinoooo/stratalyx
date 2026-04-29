/**
 * @jest-environment jsdom
 *
 * The analytics module must NEVER throw, regardless of init state. A missing
 * env var must produce a silent no-op — not a boot crash, not a console
 * error. These tests lock that contract in.
 *
 * We don't test PostHog itself (that's their job). We test the wrapper:
 * uninitialized track/identify/reset are silent, and post-init calls reach
 * posthog-js without mangling the payload.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock posthog-js so we can spy on capture/identify without real network calls.
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: jest.fn((_key: string, opts: { loaded?: () => void }) => { opts.loaded?.() }),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const posthog = require('posthog-js').default as {
  init:     jest.MockedFunction<(key: string, opts: { loaded?: () => void }) => void>
  capture:  jest.MockedFunction<(event: string, props: Record<string, unknown>) => void>
  identify: jest.MockedFunction<(id: string, traits: Record<string, unknown>) => void>
  reset:    jest.MockedFunction<() => void>
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const analytics = require('../../lib/analytics') as typeof import('../../lib/analytics')

beforeEach(() => {
  posthog.init.mockClear()
  posthog.capture.mockClear()
  posthog.identify.mockClear()
  posthog.reset.mockClear()
  analytics.__resetForTests()
})

describe('analytics — no-op contract', () => {
  it('initAnalytics() is a no-op when VITE_POSTHOG_KEY is unset', () => {
    // import.meta.env in jsdom test env has no POSTHOG key by default
    analytics.initAnalytics()
    expect(posthog.init).not.toHaveBeenCalled()
  })

  it('track() before init does not throw and does not call posthog', () => {
    expect(() => analytics.track('analysis_run', {
      ticker: 'AAPL', investor_id: 'buffett',
      provider: 'anthropic', model: 'claude-haiku-4-5-20251001', success: true,
    })).not.toThrow()
    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it('identify() before init does not throw and does not call posthog', () => {
    expect(() => analytics.identify('user-123', { tier: 'free' })).not.toThrow()
    expect(posthog.identify).not.toHaveBeenCalled()
  })

  it('resetAnalytics() before init does not throw and does not call posthog', () => {
    expect(() => analytics.resetAnalytics()).not.toThrow()
    expect(posthog.reset).not.toHaveBeenCalled()
  })
})

describe('analytics — when initialized (key present)', () => {
  beforeEach(() => {
    // initAnalytics accepts an explicit key for tests — same path as prod
    // except we don't need import.meta.env (Jest runs in CommonJS).
    analytics.initAnalytics({ key: 'phc_test' })
  })

  it('forwards track() calls to posthog.capture with the right shape', () => {
    analytics.track('share_link_copied', { kind: 'analysis', ticker: 'NVDA' })
    expect(posthog.capture).toHaveBeenCalledWith('share_link_copied', { kind: 'analysis', ticker: 'NVDA' })
  })

  it('forwards identify() to posthog.identify with traits', () => {
    analytics.identify('user-abc', { tier: 'pro', isAdmin: true })
    expect(posthog.identify).toHaveBeenCalledWith('user-abc', { tier: 'pro', isAdmin: true })
  })

  it('initAnalytics is idempotent — second call does not re-init', () => {
    posthog.init.mockClear()
    analytics.initAnalytics()
    expect(posthog.init).not.toHaveBeenCalled()
  })

  it('swallows posthog errors so analytics never crashes the app', () => {
    posthog.capture.mockImplementationOnce(() => { throw new Error('network down') })
    expect(() => analytics.track('ticker_searched', { ticker: 'AAPL' })).not.toThrow()
  })
})
