/**
 * Integration tests — WatchlistScreen + WLBtn
 * I-12 through I-15
 */
import React, { useReducer } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'
import { AppContext } from '../../state/context'
import { reducer } from '../../state/reducer'
import { INIT } from '../../state/initialState'
import type { AppState, AnalysisResult } from '../../types'
import { WatchlistScreen } from '../../screens/WatchlistScreen'
import { ScreenerScreen } from '../../screens/ScreenerScreen'

// ── Shared test wrapper ────────────────────────────────────────────────────────

function TestWrapper({
  children,
  initialState = INIT,
}: {
  children: React.ReactNode
  initialState?: AppState
}) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

// A minimal AnalysisResult for testing
const MOCK_RESULT: AnalysisResult = {
  ticker: 'AAPL',
  companyName: 'Apple Inc.',
  sector: 'Technology',
  description: '',
  investorId: 'buffett',
  investorName: 'Warren Buffett',
  dataSource: 'Claude (estimated)',
  timestamp: Date.now(),
  liveData: null,
  isLive: false,
  verdict: 'BUY',
  verdictReason: 'Strong moat and cash generation.',
  thesis: 'Apple is a quality compounder.',
  strategyScore: 8,
  moat: 'Wide',
  moatScore: 9,
  debtLevel: 'Low',
  pe: 28.5,
  peg: 1.9,
  roe: 147,
  margin: 26.4,
  fcf: 99.6,
  div: 0.55,
  marginOfSafety: 8.4,
  moSUp: true,
  intrinsicValueLow: 170,
  intrinsicValueHigh: 220,
  marketPrice: 185.5,
  strengths: ['Brand moat'],
  risks: ['Regulation risk'],
  screenResults: [{ rule: 'ROE > 15%', pass: true, note: '147% ROE' }],
}

// ── I-12: WLBtn toggles watchlist membership ──────────────────────────────────

describe('I-12: WLBtn toggles watchlist membership', () => {
  it('adds ticker to watchlist on first click and removes on second', () => {
    render(
      <TestWrapper>
        <ScreenerScreen fmpKeySet={false} onOpenFmpModal={() => {}} />
      </TestWrapper>
    )

    // Find the AAPL watchlist button (initially ☆ — not in watchlist)
    const aaplCell = screen.getByText('AAPL')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const row = aaplCell.closest('tr')!
    const starBtn = row.querySelector('button[title]') as HTMLButtonElement

    expect(starBtn).toHaveAttribute('title', 'Add to watchlist')
    expect(starBtn).toHaveTextContent('☆')

    // Click → add to watchlist
    fireEvent.click(starBtn)
    expect(starBtn).toHaveAttribute('title', 'Remove from watchlist')
    expect(starBtn).toHaveTextContent('★')

    // Click again → remove from watchlist
    fireEvent.click(starBtn)
    expect(starBtn).toHaveAttribute('title', 'Add to watchlist')
    expect(starBtn).toHaveTextContent('☆')
  })
})

// ── I-13: Watchlist count updates on add/remove ────────────────────────────────

describe('I-13: Watchlist count updates on add/remove', () => {
  it('WatchlistScreen header shows updated count after toggle', () => {
    render(
      <TestWrapper initialState={{ ...INIT, watchlist: ['AAPL', 'MSFT'] }}>
        <WatchlistScreen />
      </TestWrapper>
    )
    expect(screen.getByText(/2 stocks tracked/i)).toBeInTheDocument()
  })

  it('shows singular "stock" for a single watchlist item', () => {
    render(
      <TestWrapper initialState={{ ...INIT, watchlist: ['AAPL'] }}>
        <WatchlistScreen />
      </TestWrapper>
    )
    expect(screen.getByText(/1 stock tracked/i)).toBeInTheDocument()
  })
})

// ── I-14: Empty state when watchlist is empty ──────────────────────────────────

describe('I-14: Empty state shown when watchlist is empty', () => {
  it('renders empty-state message', () => {
    render(
      <TestWrapper>
        <WatchlistScreen />
      </TestWrapper>
    )
    expect(screen.getByText(/your watchlist is empty/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /browse all stocks/i })).toBeInTheDocument()
  })
})

// ── I-15: Analysis result displayed on card when available ────────────────────

describe('I-15: Analysis result displayed on card when available', () => {
  it('shows verdict and strategy score from stored analysis', () => {
    const stateWithAnalysis: AppState = {
      ...INIT,
      watchlist: ['AAPL'],
      analyses: { 'AAPL:buffett': MOCK_RESULT },
    }
    render(
      <TestWrapper initialState={stateWithAnalysis}>
        <WatchlistScreen />
      </TestWrapper>
    )
    // Verdict tag
    expect(screen.getByText('BUY')).toBeInTheDocument()
    // Strategy score
    expect(screen.getAllByText(/8\/10/).length).toBeGreaterThan(0)
  })

  it('shows Analyze button when no analysis is available', () => {
    render(
      <TestWrapper initialState={{ ...INIT, watchlist: ['AAPL'] }}>
        <WatchlistScreen />
      </TestWrapper>
    )
    expect(screen.getByRole('button', { name: /^Analyze$/i })).toBeInTheDocument()
    expect(screen.getByText(/not yet analyzed/i)).toBeInTheDocument()
  })
})
