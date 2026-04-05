/**
 * Integration tests — ScreenerScreen
 * I-07 through I-11
 */
import React, { useReducer, act } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'
import { AppContext, useApp } from '../../state/context'
import { reducer } from '../../state/reducer'
import { INIT } from '../../state/initialState'
import { STOCKS } from '../../constants/stocks'
import { ScreenerScreen } from '../../screens/ScreenerScreen'

// ── Shared test wrapper ────────────────────────────────────────────────────────

function TestWrapper({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INIT)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

function StateDisplay() {
  const { state } = useApp()
  return (
    <>
      <div data-testid="investor">{state.investor}</div>
      <div data-testid="modal-open">{state.modalOpen ? 'open' : 'closed'}</div>
      <div data-testid="modal-ticker">{state.modalTicker}</div>
    </>
  )
}

// Wraps in act() to flush the async useStockList fetch (fails → setLoading(false))
// so React state updates are not reported as out-of-act warnings.
async function renderScreener(fmpKeySet = false) {
  let utils!: ReturnType<typeof render>
  await act(async () => {
    utils = render(
      <TestWrapper>
        <ScreenerScreen fmpKeySet={fmpKeySet} onOpenFmpModal={() => {}} />
        <StateDisplay />
      </TestWrapper>
    )
  })
  return utils
}

// ── I-07: Stock screener renders stocks ───────────────────────────────────────

describe('I-07: ScreenerScreen renders all demo stocks', () => {
  it('renders first-page stocks and shows total count', async () => {
    await renderScreener()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.getByText('NVDA')).toBeInTheDocument()
    // Footer shows total stock count
    expect(screen.getByText(new RegExp(`${STOCKS.length}`))).toBeInTheDocument()
  })
})

// ── I-08: Filter by ticker ────────────────────────────────────────────────────

describe('I-08: Search filters by ticker', () => {
  it('shows only matching ticker after search', async () => {
    await renderScreener()
    const input = screen.getByPlaceholderText(/search ticker/i)
    fireEvent.change(input, { target: { value: 'AAPL' } })
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument()
    expect(screen.queryByText('NVDA')).not.toBeInTheDocument()
  })
})

// ── I-09: Filter by company name ──────────────────────────────────────────────

describe('I-09: Search filters by company name', () => {
  it('shows only Apple after searching "Apple"', async () => {
    await renderScreener()
    const input = screen.getByPlaceholderText(/search ticker/i)
    fireEvent.change(input, { target: { value: 'Apple' } })
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument()
  })

  it('shows only Visa after searching "Visa"', async () => {
    await renderScreener()
    const input = screen.getByPlaceholderText(/search ticker/i)
    fireEvent.change(input, { target: { value: 'Visa' } })
    expect(screen.getByText('V')).toBeInTheDocument()
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
  })
})

// ── I-10: Clicking Analyze opens modal with ticker ────────────────────────────

describe('I-10: Clicking Analyze opens modal with correct ticker', () => {
  it('opens modal with AAPL when its Analyze button is clicked', async () => {
    await renderScreener()
    const aaplCell = screen.getByText('AAPL')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const row = aaplCell.closest('tr')!
    const analyzeBtn = within(row).getByRole('button', { name: /Analyze/i })
    fireEvent.click(analyzeBtn)
    expect(screen.getByTestId('modal-open')).toHaveTextContent('open')
    expect(screen.getByTestId('modal-ticker')).toHaveTextContent('AAPL')
  })
})

// ── I-11: Investor pill updates active investor ────────────────────────────────

describe('I-11: Investor pill updates active investor in state', () => {
  it('default investor is buffett and strategy banner shows his name', async () => {
    await renderScreener()
    expect(screen.getByTestId('investor')).toHaveTextContent('buffett')
    expect(screen.getByText('Warren Buffett')).toBeInTheDocument()
  })

  it('clicking Lynch pill changes active investor to lynch', async () => {
    await renderScreener()
    const lynchPill = screen.getByRole('button', { name: /Lynch/i })
    fireEvent.click(lynchPill)
    expect(screen.getByTestId('investor')).toHaveTextContent('lynch')
  })
})
