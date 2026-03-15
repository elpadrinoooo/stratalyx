import { describe, it, expect, beforeEach } from '@jest/globals'
import { loadState, saveState } from '../../state/persist'
import { INIT } from '../../state/initialState'
import type { AppState, AnalysisResult } from '../../types'

const STORAGE_KEY = 'stratalyx_state_v2'

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

beforeEach(() => {
  localStorage.clear()
})

describe('loadState()', () => {
  it('returns INIT when nothing stored', () => {
    const state = loadState()
    expect(state).toEqual(INIT)
  })

  it('returns INIT when stored data is invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{')
    expect(loadState()).toEqual(INIT)
  })

  it('returns INIT when stored data is not an object', () => {
    localStorage.setItem(STORAGE_KEY, '"string"')
    expect(loadState()).toEqual(INIT)
  })

  it('restores analyses from localStorage', () => {
    const stored = { analyses: { 'AAPL:buffett': MOCK_RESULT }, comparisons: [], watchlist: [] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const state = loadState()
    expect(state.analyses['AAPL:buffett']).toEqual(MOCK_RESULT)
  })

  it('restores watchlist from localStorage', () => {
    const stored = { analyses: {}, comparisons: [], watchlist: ['AAPL', 'MSFT'] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const state = loadState()
    expect(state.watchlist).toEqual(['AAPL', 'MSFT'])
  })

  it('restores comparisons from localStorage', () => {
    const comp = { id: 'AAPL:buffett:lynch', ticker: 'AAPL', investorIds: ['buffett', 'lynch'], timestamp: 1000 }
    const stored = { analyses: {}, comparisons: [comp], watchlist: [] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const state = loadState()
    expect(state.comparisons).toEqual([comp])
  })

  it('uses INIT defaults for non-persisted fields', () => {
    const stored = { analyses: {}, comparisons: [], watchlist: ['AAPL'] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const state = loadState()
    expect(state.screen).toBe('Screener')
    expect(state.investor).toBe('buffett')
    expect(state.modalOpen).toBe(false)
    expect(state.toasts).toEqual([])
  })

  it('falls back to INIT.analyses when analyses is not an object', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analyses: 'bad', watchlist: [] }))
    expect(loadState().analyses).toEqual({})
  })

  it('falls back to INIT.watchlist when watchlist is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analyses: {}, watchlist: 'bad' }))
    expect(loadState().watchlist).toEqual([])
  })
})

describe('saveState()', () => {
  it('persists analyses, comparisons, and watchlist', () => {
    const state: AppState = {
      ...INIT,
      analyses: { 'AAPL:buffett': MOCK_RESULT },
      watchlist: ['AAPL'],
      comparisons: [{ id: 'x', ticker: 'AAPL', investorIds: ['buffett', 'lynch'], timestamp: 1 }],
    }
    saveState(state)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.analyses['AAPL:buffett'].ticker).toBe('AAPL')
    expect(parsed.watchlist).toEqual(['AAPL'])
    expect(parsed.comparisons).toHaveLength(1)
  })

  it('does not persist transient state (toasts, modalOpen, screen)', () => {
    const state: AppState = {
      ...INIT,
      toasts: [{ id: '1', message: 'test', type: 'info' }],
      modalOpen: true,
      screen: 'History',
    }
    saveState(state)
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(parsed.toasts).toBeUndefined()
    expect(parsed.modalOpen).toBeUndefined()
    expect(parsed.screen).toBeUndefined()
  })
})
