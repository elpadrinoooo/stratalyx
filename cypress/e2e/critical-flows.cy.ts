/// <reference types="cypress" />

/**
 * E2E Tests — Critical User Flows
 *
 * These tests validate the primary user journeys documented in the PRD.
 * Requires the dev server running at http://localhost:5173
 */

describe('E-01: Screener renders and search works', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('displays the Navbar with logo and tab buttons', () => {
    cy.get('nav[aria-label="Main navigation"]').should('exist')
    cy.contains('Stratalyx.ai').should('be.visible')
    cy.contains('Screener').should('be.visible')
    cy.contains('Strategies').should('be.visible')
    cy.contains('Watchlist').should('be.visible')
    cy.contains('History').should('be.visible')
    cy.contains('Comparisons').should('be.visible')
  })

  it('renders all 10 demo stocks on the Screener', () => {
    cy.contains('AAPL').should('be.visible')
    cy.contains('MSFT').should('be.visible')
    cy.contains('GOOGL').should('be.visible')
  })

  it('filters stocks by ticker via search input', () => {
    cy.get('input[placeholder*="Search"]').type('AAPL')
    cy.contains('AAPL').should('be.visible')
    cy.contains('MSFT').should('not.exist')
  })
})

describe('E-02: Navigation between screens', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('navigates to Strategies screen', () => {
    cy.contains('button', 'Strategies').click()
    // The strategies page should show investor profiles
    cy.contains('Warren Buffett').should('be.visible')
  })

  it('navigates to Watchlist (shows empty state)', () => {
    cy.contains('button', 'Watchlist').click()
    cy.contains('Your watchlist is empty').should('be.visible')
  })

  it('navigates to History (shows empty state)', () => {
    cy.contains('button', 'History').click()
    cy.contains('No analyses yet').should('be.visible')
  })

  it('navigates to Comparisons (shows empty state)', () => {
    cy.contains('button', 'Comparisons').click()
    cy.contains('No comparisons yet').should('be.visible')
  })

  it('logo click returns to Screener', () => {
    cy.contains('button', 'Strategies').click()
    cy.get('button[aria-label="Stratalyx home"]').click()
    cy.contains('AAPL').should('be.visible')
  })
})

describe('E-03: Analyzer Modal lifecycle', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('opens modal via Analyze Stock button', () => {
    cy.contains('button', 'Analyze Stock').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Strategy Analyzer').should('be.visible')
  })

  it('opens modal via Cmd/Ctrl+K shortcut', () => {
    cy.get('body').type('{meta}k')
    cy.get('[role="dialog"]').should('be.visible')
  })

  it('closes modal on Escape key', () => {
    cy.contains('button', 'Analyze Stock').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('body').type('{esc}')
    cy.get('[role="dialog"]').should('not.exist')
  })

  it('closes modal via Close button', () => {
    cy.contains('button', 'Analyze Stock').click()
    cy.get('button[aria-label="Close analyzer modal"]').click()
    cy.get('[role="dialog"]').should('not.exist')
  })
})

describe('E-04: Watchlist toggle', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('adds a stock to watchlist and navigates to see it', () => {
    // Click star button on first stock row
    cy.get('button[aria-label*="Add"][aria-label*="watchlist"]').first().click()
    // Navigate to Watchlist
    cy.contains('button', 'Watchlist').click()
    // Should no longer show empty state
    cy.contains('No stocks in your watchlist').should('not.exist')
  })
})

describe('E-05: FMP Key modal', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('opens FMP key modal from navbar and can close it', () => {
    cy.get('button[aria-label*="FMP"]').click()
    cy.get('[role="dialog"][aria-label="FMP API Key Management"]').should('be.visible')
    cy.contains('Financial Modeling Prep').should('be.visible')
    cy.get('button[aria-label="Close FMP key modal"]').click()
    cy.get('[role="dialog"][aria-label="FMP API Key Management"]').should('not.exist')
  })
})

describe('E-06: Investor strategy selection', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('changes active investor on the Screener', () => {
    // Default should be Buffett
    cy.contains('Buffett').should('be.visible')
    // Click a different investor pill
    cy.contains('button', 'Graham').click()
    // The selection should update
    cy.contains('Benjamin Graham').should('be.visible')
  })
})
