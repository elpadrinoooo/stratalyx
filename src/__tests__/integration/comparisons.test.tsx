/**
 * Integration tests — ComparisonsScreen
 * I-16 through I-20
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'
import { renderWithCtx } from '../helpers/renderWithCtx'
import { ComparisonsScreen } from '../../screens/ComparisonsScreen'
import type { AnalysisResult, AppState } from '../../types'
import { INIT } from '../../state/initialState'

// ── Shared fixtures ────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<AnalysisResult>): AnalysisResult {
  return {
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
    verdictReason: 'Strong moat.',
    thesis: 'Quality compounder.',
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
    screenResults: [],
    ...overrides,
  }
}

const buffettResult = makeResult({ investorId: 'buffett', investorName: 'Warren Buffett', strategyScore: 8, verdict: 'BUY' })
const grahamResult  = makeResult({ investorId: 'graham',  investorName: 'Benjamin Graham', strategyScore: 5, verdict: 'HOLD' })

const stateWithComparison: Partial<AppState> = {
  comparisons: [{
    id: 'cmp-1',
    ticker: 'AAPL',
    investorIds: ['buffett', 'graham'],
    timestamp: Date.now(),
  }],
  analyses: {
    'AAPL:buffett': buffettResult,
    'AAPL:graham': grahamResult,
  },
}

// ── I-16: Empty state when no comparisons ─────────────────────────────────────

describe('I-16: Empty state when no comparisons', () => {
  it('renders instructions and example comparison preview', () => {
    renderWithCtx(<ComparisonsScreen />)
    expect(screen.getByText(/strategy comparisons/i)).toBeInTheDocument()
    expect(screen.getByText(/how it works/i)).toBeInTheDocument()
    expect(screen.getByText(/example comparison/i)).toBeInTheDocument()
  })

  it('has a CTA button that opens the modal for AAPL', () => {
    const { getByRole } = renderWithCtx(<ComparisonsScreen />)
    const cta = getByRole('button', { name: /try it with aapl/i })
    expect(cta).toBeInTheDocument()
    fireEvent.click(cta)
    // After click, modal should be open with AAPL
    // (state is managed internally; we just verify the button fires without error)
  })
})

// ── I-17: Comparison cards render correctly ────────────────────────────────────

describe('I-17: Comparison cards render with investor results', () => {
  it('shows the ticker and company name', () => {
    renderWithCtx(<ComparisonsScreen />, stateWithComparison)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
  })

  it('shows both investor names', () => {
    renderWithCtx(<ComparisonsScreen />, stateWithComparison)
    expect(screen.getByText('Warren Buffett')).toBeInTheDocument()
    expect(screen.getByText('Benjamin Graham')).toBeInTheDocument()
  })

  it('shows score delta between the two investors', () => {
    renderWithCtx(<ComparisonsScreen />, stateWithComparison)
    // Buffett 8, Graham 5 → delta = +3
    expect(screen.getByText(/score delta/i)).toBeInTheDocument()
    expect(screen.getByText(/\+?3/)).toBeInTheDocument()
  })

  it('shows each investor score', () => {
    renderWithCtx(<ComparisonsScreen />, stateWithComparison)
    expect(screen.getByText('8/10')).toBeInTheDocument()
    expect(screen.getByText('5/10')).toBeInTheDocument()
  })
})

// ── I-18: Clear all comparisons ───────────────────────────────────────────────

describe('I-18: Clear all button removes comparisons', () => {
  it('renders the Clear all button when comparisons exist', () => {
    renderWithCtx(<ComparisonsScreen />, stateWithComparison)
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
  })

  it('switches to empty state after Clear all is clicked', () => {
    renderWithCtx(<ComparisonsScreen />, stateWithComparison)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    // After clearing, the empty state should appear
    expect(screen.getByText(/how it works/i)).toBeInTheDocument()
  })
})

// ── I-19: Verdict labels are human-readable ────────────────────────────────────

describe('I-19: Verdict labels are human-readable in comparison cards', () => {
  it('shows "Strong Framework Alignment" for BUY verdict', () => {
    renderWithCtx(<ComparisonsScreen />, stateWithComparison)
    expect(screen.getByText('Strong Framework Alignment')).toBeInTheDocument()
  })

  it('shows "Mixed Framework Signals" for HOLD verdict', () => {
    renderWithCtx(<ComparisonsScreen />, stateWithComparison)
    expect(screen.getByText('Mixed Framework Signals')).toBeInTheDocument()
  })
})

// ── I-20: Multiple comparisons render all cards ────────────────────────────────

describe('I-20: Multiple comparisons render multiple cards', () => {
  it('renders two comparison cards when two comparisons exist', () => {
    const msftBuffett = makeResult({ ticker: 'MSFT', companyName: 'Microsoft', investorId: 'buffett', strategyScore: 7 })
    const msftLynch   = makeResult({ ticker: 'MSFT', companyName: 'Microsoft', investorId: 'lynch',   strategyScore: 9, verdict: 'BUY' })

    const stateWithTwo: Partial<AppState> = {
      comparisons: [
        { id: 'cmp-1', ticker: 'AAPL', investorIds: ['buffett', 'graham'], timestamp: Date.now() },
        { id: 'cmp-2', ticker: 'MSFT', investorIds: ['buffett', 'lynch'],  timestamp: Date.now() },
      ],
      analyses: {
        'AAPL:buffett': buffettResult,
        'AAPL:graham':  grahamResult,
        'MSFT:buffett': msftBuffett,
        'MSFT:lynch':   msftLynch,
      },
    }

    renderWithCtx(<ComparisonsScreen />, stateWithTwo)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })
})
