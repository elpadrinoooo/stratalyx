/// <reference types="cypress" />

/**
 * E2E test that actually runs a stock analysis through the Gemini API.
 * This tests the full flow: open modal → type ticker → click Analyze → wait for result.
 */
describe('Analysis E2E — Gemini integration', () => {
  beforeEach(() => {
    // Clear localStorage to ensure fresh state with google/gemini defaults
    cy.clearLocalStorage()
    cy.visit('/')
  })

  it('runs a full AAPL analysis via Gemini and displays results', () => {
    // 1. Open the analyzer modal
    cy.contains('button', 'Analyze Stock').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Strategy Analyzer').should('be.visible')

    // 2. Verify default provider is Google/Gemini
    cy.get('[role="dialog"]').within(() => {
      cy.get('select').first().should('have.value', 'google')
    })

    // 3. Type ticker and click Analyze
    cy.get('[role="dialog"] input[type="text"]').clear().type('AAPL')
    cy.get('[role="dialog"]').contains('button', 'Analyze').click()

    // 4. Should show loading state
    cy.contains('Analyzing…').should('be.visible')

    // 5. Wait for result (Gemini takes 10-30s with thinking model)
    cy.contains('Analyzing…', { timeout: 60000 }).should('not.exist')

    // 6. Should show result — check for key elements
    // The verdict badge (BUY / HOLD / AVOID) should appear
    cy.get('[role="dialog"]').within(() => {
      cy.contains(/BUY|HOLD|AVOID/, { timeout: 5000 }).should('be.visible')
    })

    // 7. Should NOT show an error
    cy.get('[role="dialog"]').within(() => {
      cy.contains('LLM response did not contain valid JSON').should('not.exist')
      cy.contains('LLM API error').should('not.exist')
      cy.contains('Anthropic API error').should('not.exist')
    })
  })
})
