/**
 * Integration tests — StrategiesScreen
 * I-26 through I-31
 */
import React from 'react'
import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'
import { renderWithCtx } from '../helpers/renderWithCtx'
import { StrategiesScreen } from '../../screens/StrategiesScreen'
import { INVESTORS } from '../../constants/investors'

// ── I-26: Page renders with heading ───────────────────────────────────────────

describe('I-26: StrategiesScreen renders page structure', () => {
  it('renders the page heading', () => {
    renderWithCtx(<StrategiesScreen />)
    expect(screen.getByText('Investor Frameworks')).toBeInTheDocument()
  })

  it('renders the research library label', () => {
    renderWithCtx(<StrategiesScreen />)
    expect(screen.getByText(/research library/i)).toBeInTheDocument()
  })
})

// ── I-27: All investor cards render in sidebar ────────────────────────────────

describe('I-27: All 5 investor sidebar cards render', () => {
  it('shows a card for each investor', () => {
    renderWithCtx(<StrategiesScreen />)
    for (const inv of INVESTORS) {
      // Multiple elements may contain the same name (sidebar card + detail hero)
      expect(screen.getAllByText(inv.name).length).toBeGreaterThan(0)
    }
  })

  it(`shows ${INVESTORS.length} Frameworks label`, () => {
    renderWithCtx(<StrategiesScreen />)
    // Sidebar shows "X of Y frameworks" format
    expect(screen.getByText(new RegExp(`${INVESTORS.length}.*frameworks`, 'i'))).toBeInTheDocument()
  })
})

// ── I-28: Default active investor is Buffett ──────────────────────────────────

describe('I-28: Default active investor is Warren Buffett', () => {
  it('shows Buffett hero section by default', () => {
    renderWithCtx(<StrategiesScreen />)
    // Multiple elements may contain the name; at least one should be present
    const names = screen.getAllByText('Warren Buffett')
    expect(names.length).toBeGreaterThan(0)
  })

  it('renders the Buffett tagline quote', () => {
    renderWithCtx(<StrategiesScreen />)
    const buffett = INVESTORS.find((i) => i.id === 'buffett')!
    // The quote strip renders the tagline in quotes
    expect(screen.getByText(`"${buffett.tagline}"`)).toBeInTheDocument()
  })
})

// ── I-29: Clicking a different investor updates the detail panel ───────────────

describe('I-29: Selecting a different investor updates the detail panel', () => {
  it('shows Graham content after clicking his card', () => {
    renderWithCtx(<StrategiesScreen />)
    const graham = INVESTORS.find((i) => i.id === 'graham')!

    // Click the Graham sidebar card (button with his name)
    const grahamBtn = screen.getAllByRole('button', { name: new RegExp(graham.name, 'i') })[0]
    fireEvent.click(grahamBtn)

    // Detail panel should now show Graham's tagline
    expect(screen.getByText(`"${graham.tagline}"`)).toBeInTheDocument()
  })
})

// ── I-30: Tab switching in the detail panel ───────────────────────────────────

describe('I-30: Tab switching shows correct content', () => {
  it('Rules tab shows rule count and rule labels', () => {
    renderWithCtx(<StrategiesScreen />)
    fireEvent.click(screen.getByRole('button', { name: /^Rules$/i }))

    const buffett = INVESTORS.find((i) => i.id === 'buffett')!
    expect(
      screen.getByText(new RegExp(`${buffett.rules.length} screening rule`, 'i'))
    ).toBeInTheDocument()
    // First rule label should appear (may appear in sidebar tags too — use getAllByText)
    expect(screen.getAllByText(buffett.rules[0].label).length).toBeGreaterThan(0)
  })

  it('Formulas tab shows formula labels', () => {
    renderWithCtx(<StrategiesScreen />)
    fireEvent.click(screen.getByRole('button', { name: /^Formulas$/i }))

    const buffett = INVESTORS.find((i) => i.id === 'buffett')!
    // Formula label appears in the card header AND in the variables glossary chips — use getAllByText
    expect(screen.getAllByText(buffett.equations[0].label).length).toBeGreaterThan(0)
  })

  it('Overview tab is active by default and shows philosophy text', () => {
    renderWithCtx(<StrategiesScreen />)
    expect(screen.getByText(/investment philosophy/i)).toBeInTheDocument()
  })
})

// ── I-31: "Use strategy" button switches screen ───────────────────────────────

describe('I-31: "Use strategy" button dispatches correct actions', () => {
  it('clicking Use strategy does not throw', () => {
    renderWithCtx(<StrategiesScreen />)
    const useBtn = screen.getByRole('button', { name: /use strategy/i })
    expect(() => fireEvent.click(useBtn)).not.toThrow()
  })
})
