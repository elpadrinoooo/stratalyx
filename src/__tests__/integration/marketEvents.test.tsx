/**
 * Integration tests — MarketEventsScreen
 * I-32 through I-36
 */
import React from 'react'
import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'
import { renderWithCtx } from '../helpers/renderWithCtx'
import { MarketEventsScreen } from '../../screens/MarketEventsScreen'
import { MARKET_EVENTS } from '../../constants/marketEvents'

// ── I-32: Page structure ──────────────────────────────────────────────────────

describe('I-32: MarketEventsScreen renders page structure', () => {
  it('renders the page heading', () => {
    renderWithCtx(<MarketEventsScreen />)
    expect(screen.getByText('Market Events')).toBeInTheDocument()
  })

  it('renders the Research Library label', () => {
    renderWithCtx(<MarketEventsScreen />)
    expect(screen.getByText(/research library/i)).toBeInTheDocument()
  })

  it('renders record callout strip', () => {
    renderWithCtx(<MarketEventsScreen />)
    expect(screen.getAllByText(/worst s&p 500 drawdown/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/largest s&p 500 bull run/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/fastest bear market/i).length).toBeGreaterThan(0)
  })
})

// ── I-33: All events render ───────────────────────────────────────────────────

describe('I-33: All market events render in timeline mode', () => {
  it('shows all event titles', () => {
    renderWithCtx(<MarketEventsScreen />)
    for (const event of MARKET_EVENTS) {
      expect(screen.getByText(event.title)).toBeInTheDocument()
    }
  })

  it('shows performance bars section for events with S&P data', () => {
    renderWithCtx(<MarketEventsScreen />)
    // At least one "S&P 500" label should appear
    expect(screen.getAllByText('S&P 500').length).toBeGreaterThan(0)
  })
})

// ── I-34: Filter chips work ───────────────────────────────────────────────────

describe('I-34: Filter chips filter events by type', () => {
  it('renders all filter chips', () => {
    renderWithCtx(<MarketEventsScreen />)
    expect(screen.getByRole('button', { name: /^All$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Crashes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Bears/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Bull Runs/i })).toBeInTheDocument()
  })

  it('filtering to Crashes hides non-crash events', () => {
    renderWithCtx(<MarketEventsScreen />)
    fireEvent.click(screen.getByRole('button', { name: /^Crashes/i }))

    const crashes = MARKET_EVENTS.filter((e) => e.type === 'crash')
    const nonCrashes = MARKET_EVENTS.filter((e) => e.type !== 'crash')

    // Crash events should still be present
    expect(screen.getByText(crashes[0].title)).toBeInTheDocument()

    // Non-crash events should not be present
    const hiddenEvent = nonCrashes.find((e) => e.type === 'bull')
    if (hiddenEvent) {
      expect(screen.queryByText(hiddenEvent.title)).not.toBeInTheDocument()
    }
  })
})

// ── I-35: Sort toggle works ───────────────────────────────────────────────────

describe('I-35: Sort toggle switches between Timeline and Most Severe', () => {
  it('renders sort toggle buttons', () => {
    renderWithCtx(<MarketEventsScreen />)
    expect(screen.getByRole('button', { name: /timeline/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /most severe/i })).toBeInTheDocument()
  })

  it('switching to Most Severe does not crash and still shows events', () => {
    renderWithCtx(<MarketEventsScreen />)
    fireEvent.click(screen.getByRole('button', { name: /most severe/i }))
    // Events should still render
    expect(screen.getAllByText(/crash|bear|bull|crisis/i).length).toBeGreaterThan(0)
  })
})

// ── I-36: Expand / collapse works ─────────────────────────────────────────────

describe('I-36: Event cards expand to show full details', () => {
  it('shows "Full details" button on cards', () => {
    renderWithCtx(<MarketEventsScreen />)
    const expandBtns = screen.getAllByRole('button', { name: /full details/i })
    expect(expandBtns.length).toBeGreaterThan(0)
  })

  it('clicking Full details reveals Market Impact section', () => {
    renderWithCtx(<MarketEventsScreen />)
    const firstBtn = screen.getAllByRole('button', { name: /full details/i })[0]
    fireEvent.click(firstBtn)
    expect(screen.getByText(/market impact/i)).toBeInTheDocument()
  })
})
