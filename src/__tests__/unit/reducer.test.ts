import { describe, it, expect } from '@jest/globals'
import { reducer } from '../../state/reducer'
import { INIT } from '../../state/initialState'
import type { AppState, AnalysisResult, Comparison } from '../../types'

const MOCK_RESULT: AnalysisResult = {
  ticker: 'AAPL',
  companyName: 'Apple Inc.',
  sector: 'Technology',
  description: '',
  investorId: 'buffett',
  investorName: 'Warren Buffett',
  strategyScore: 8,
  verdict: 'BUY',
  verdictReason: 'Strong moat',
  marketPrice: 185,
  intrinsicValueLow: 170,
  intrinsicValueHigh: 220,
  marginOfSafety: 8,
  moSUp: true,
  moat: 'Wide',
  moatScore: 9,
  screenResults: [],
  strengths: [],
  risks: [],
  thesis: '',
  roe: 147,
  pe: 28,
  peg: 1.9,
  margin: 26,
  debtLevel: 'Moderate',
  div: 0.55,
  fcf: 99,
  dataSource: 'Claude (estimated)',
  timestamp: 1000000,
  liveData: null,
  isLive: false,
}

const MOCK_COMPARISON: Comparison = {
  id: 'AAPL:buffett:lynch',
  ticker: 'AAPL',
  investorIds: ['buffett', 'lynch'],
  timestamp: 1000000,
}

function fresh(): AppState {
  return { ...INIT }
}

describe('reducer — navigation', () => {
  it('SET_SCREEN updates screen', () => {
    const state = reducer(fresh(), { type: 'SET_SCREEN', payload: 'Watchlist' })
    expect(state.screen).toBe('Watchlist')
  })
  it('SET_INVESTOR updates investor', () => {
    const state = reducer(fresh(), { type: 'SET_INVESTOR', payload: 'lynch' })
    expect(state.investor).toBe('lynch')
  })
  it('SET_PROVIDER updates provider', () => {
    const state = reducer(fresh(), { type: 'SET_PROVIDER', payload: 'openai' })
    expect(state.provider).toBe('openai')
  })
  it('SET_MODEL updates model', () => {
    const state = reducer(fresh(), { type: 'SET_MODEL', payload: 'gpt-4o' })
    expect(state.model).toBe('gpt-4o')
  })
})

describe('reducer — modal', () => {
  it('OPEN_MODAL sets modalOpen and modalTicker', () => {
    const state = reducer(fresh(), { type: 'OPEN_MODAL', payload: 'AAPL' })
    expect(state.modalOpen).toBe(true)
    expect(state.modalTicker).toBe('AAPL')
  })
  it('CLOSE_MODAL clears modalOpen and modalTicker', () => {
    const opened = reducer(fresh(), { type: 'OPEN_MODAL', payload: 'MSFT' })
    const closed = reducer(opened, { type: 'CLOSE_MODAL' })
    expect(closed.modalOpen).toBe(false)
    expect(closed.modalTicker).toBe('')
  })
})

describe('reducer — analyses', () => {
  it('SET_ANALYSIS stores result under TICKER:investorId key', () => {
    const state = reducer(fresh(), { type: 'SET_ANALYSIS', payload: MOCK_RESULT })
    expect(state.analyses['AAPL:buffett']).toEqual(MOCK_RESULT)
  })
  it('CLEAR_ANALYSIS removes a specific key', () => {
    const withResult = reducer(fresh(), { type: 'SET_ANALYSIS', payload: MOCK_RESULT })
    const cleared = reducer(withResult, { type: 'CLEAR_ANALYSIS', payload: 'AAPL:buffett' })
    expect(cleared.analyses['AAPL:buffett']).toBeUndefined()
  })
  it('CLEAR_ALL_ANALYSES empties analyses', () => {
    const withResult = reducer(fresh(), { type: 'SET_ANALYSIS', payload: MOCK_RESULT })
    const cleared = reducer(withResult, { type: 'CLEAR_ALL_ANALYSES' })
    expect(Object.keys(cleared.analyses)).toHaveLength(0)
  })
})

describe('reducer — comparisons', () => {
  it('ADD_COMPARISON prepends comparison', () => {
    const state = reducer(fresh(), { type: 'ADD_COMPARISON', payload: MOCK_COMPARISON })
    expect(state.comparisons).toHaveLength(1)
    expect(state.comparisons[0]).toEqual(MOCK_COMPARISON)
  })
  it('ADD_COMPARISON replaces existing same-id comparison', () => {
    const s1 = reducer(fresh(), { type: 'ADD_COMPARISON', payload: MOCK_COMPARISON })
    const updated = { ...MOCK_COMPARISON, timestamp: 2000000 }
    const s2 = reducer(s1, { type: 'ADD_COMPARISON', payload: updated })
    expect(s2.comparisons).toHaveLength(1)
    expect(s2.comparisons[0].timestamp).toBe(2000000)
  })
  it('REMOVE_COMPARISON removes by id', () => {
    const s1 = reducer(fresh(), { type: 'ADD_COMPARISON', payload: MOCK_COMPARISON })
    const s2 = reducer(s1, { type: 'REMOVE_COMPARISON', payload: MOCK_COMPARISON.id })
    expect(s2.comparisons).toHaveLength(0)
  })
  it('CLEAR_COMPARISONS empties comparisons', () => {
    const s1 = reducer(fresh(), { type: 'ADD_COMPARISON', payload: MOCK_COMPARISON })
    const s2 = reducer(s1, { type: 'CLEAR_COMPARISONS' })
    expect(s2.comparisons).toHaveLength(0)
  })
})

describe('reducer — watchlist', () => {
  it('ADD_TO_WATCHLIST adds a ticker', () => {
    const state = reducer(fresh(), { type: 'ADD_TO_WATCHLIST', payload: 'AAPL' })
    expect(state.watchlist).toContain('AAPL')
  })
  it('ADD_TO_WATCHLIST does not duplicate', () => {
    const s1 = reducer(fresh(), { type: 'ADD_TO_WATCHLIST', payload: 'AAPL' })
    const s2 = reducer(s1, { type: 'ADD_TO_WATCHLIST', payload: 'AAPL' })
    expect(s2.watchlist.filter((t) => t === 'AAPL')).toHaveLength(1)
  })
  it('REMOVE_FROM_WATCHLIST removes a ticker', () => {
    const s1 = reducer(fresh(), { type: 'ADD_TO_WATCHLIST', payload: 'AAPL' })
    const s2 = reducer(s1, { type: 'REMOVE_FROM_WATCHLIST', payload: 'AAPL' })
    expect(s2.watchlist).not.toContain('AAPL')
  })
})

describe('reducer — toasts', () => {
  it('TOAST appends a toast with a unique id', () => {
    const state = reducer(fresh(), {
      type: 'TOAST',
      payload: { message: 'Hello', type: 'success' },
    })
    expect(state.toasts).toHaveLength(1)
    expect(state.toasts[0].message).toBe('Hello')
    expect(state.toasts[0].type).toBe('success')
    expect(state.toasts[0].id).toBeTruthy()
  })
  it('DISMISS_TOAST removes by id', () => {
    const s1 = reducer(fresh(), {
      type: 'TOAST',
      payload: { message: 'Hello', type: 'info' },
    })
    const id = s1.toasts[0].id
    const s2 = reducer(s1, { type: 'DISMISS_TOAST', payload: id })
    expect(s2.toasts).toHaveLength(0)
  })
})

describe('reducer — unknown action', () => {
  it('returns state unchanged for unknown action', () => {
    // @ts-expect-error — testing unknown action handling
    const state = reducer(fresh(), { type: 'UNKNOWN_ACTION' })
    expect(state).toEqual(INIT)
  })
})
