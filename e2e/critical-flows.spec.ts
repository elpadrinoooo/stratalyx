/**
 * E2E tests — Critical user flows (Playwright)
 *
 * Requires dev server running at http://localhost:5173
 * Run: npx playwright test e2e/critical-flows.spec.ts
 */
import { test, expect } from '@playwright/test'

/** Pre-dismiss the welcome modal and clear persisted state */
async function freshVisit(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('stratalyx_welcomed', '1')
    localStorage.removeItem('stratalyx_state_v2')
  })
  await page.goto('/')
}

/** Nav tab buttons — scoped to the main navigation to avoid WLBtn conflicts.
 *  Uses a regex so badge counts ("Watchlist 1") still match. */
function navTab(page: import('@playwright/test').Page, name: string) {
  return page.getByRole('navigation', { name: 'Main navigation' })
             .getByRole('button', { name: new RegExp(`^${name}`) })
}

// ── E-01: Screener renders and search works ───────────────────────────────────

test.describe('E-01: Screener renders and search works', () => {
  test.beforeEach(async ({ page }) => {
    await freshVisit(page)
  })

  test('displays navbar with logo and all tab buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Stratalyx home' })).toBeVisible()
    for (const tab of ['Screener', 'Strategies', 'Watchlist', 'History', 'Comparisons']) {
      await expect(navTab(page, tab)).toBeVisible()
    }
  })

  test('renders demo stocks on the screener', async ({ page }) => {
    await expect(page.getByText('AAPL')).toBeVisible()
    await expect(page.getByText('MSFT')).toBeVisible()
    await expect(page.getByText('NVDA')).toBeVisible()
  })

  test('filters stocks by ticker via search input', async ({ page }) => {
    await page.getByPlaceholder(/search ticker/i).fill('AAPL')
    await expect(page.getByRole('cell', { name: 'AAPL', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'MSFT', exact: true })).not.toBeVisible()
  })

  test('filters stocks by company name', async ({ page }) => {
    await page.getByPlaceholder(/search ticker/i).fill('Apple')
    await expect(page.getByRole('cell', { name: 'AAPL', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'MSFT', exact: true })).not.toBeVisible()
  })
})

// ── E-02: Navigation between screens ─────────────────────────────────────────

test.describe('E-02: Navigation between screens', () => {
  test.beforeEach(async ({ page }) => {
    await freshVisit(page)
  })

  test('navigates to Strategies and shows Warren Buffett', async ({ page }) => {
    await navTab(page, 'Strategies').click()
    await expect(page.getByText('Warren Buffett').first()).toBeVisible()
  })

  test('navigates to Watchlist and shows empty state', async ({ page }) => {
    await navTab(page, 'Watchlist').click()
    await expect(page.getByText(/your watchlist is empty/i)).toBeVisible()
  })

  test('navigates to History and shows empty state', async ({ page }) => {
    await navTab(page, 'History').click()
    await expect(page.getByText(/no analyses yet/i)).toBeVisible()
  })

  test('navigates to Comparisons and shows empty state', async ({ page }) => {
    await navTab(page, 'Comparisons').click()
    await expect(page.getByText(/how it works/i)).toBeVisible()
    await expect(page.getByText('Strategy Comparisons')).toBeVisible()
  })
})

// ── E-03: Analyzer Modal lifecycle ───────────────────────────────────────────

test.describe('E-03: Analyzer Modal lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await freshVisit(page)
  })

  test('opens modal via "Analyze Stock" button', async ({ page }) => {
    await page.getByRole('button', { name: 'Analyze Stock' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Strategy Analyzer')).toBeVisible()
  })

  test('opens modal via Ctrl+K shortcut', async ({ page }) => {
    await page.locator('body').click()  // ensure page has focus
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('closes modal on Escape key', async ({ page }) => {
    await page.getByRole('button', { name: 'Analyze Stock' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('closes modal via Close button', async ({ page }) => {
    await page.getByRole('button', { name: 'Analyze Stock' }).click()
    await page.getByRole('button', { name: /close analyzer modal/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('pre-fills ticker when Analyze is clicked from screener row', async ({ page }) => {
    const aaplRow = page.locator('tr', { has: page.getByText('AAPL') }).first()
    await aaplRow.getByRole('button', { name: /Analyze/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const input = page.getByRole('dialog').getByRole('textbox').first()
    await expect(input).toHaveValue('AAPL')
  })
})

// ── E-04: Watchlist toggle ────────────────────────────────────────────────────

test.describe('E-04: Watchlist toggle', () => {
  test.beforeEach(async ({ page }) => {
    await freshVisit(page)
  })

  test('adds a stock to watchlist via star button', async ({ page }) => {
    const aaplRow = page.locator('tr', { has: page.getByText('AAPL') }).first()
    await aaplRow.locator('button[title="Add to watchlist"]').click()
    await expect(aaplRow.locator('button[title="Remove from watchlist"]')).toBeVisible()
    await expect(aaplRow.locator('button[title="Remove from watchlist"]')).toContainText('★')
  })

  test('watchlist screen shows stock after it is starred', async ({ page }) => {
    const aaplRow = page.locator('tr', { has: page.getByText('AAPL') }).first()
    await aaplRow.locator('button[title="Add to watchlist"]').click()
    await navTab(page, 'Watchlist').click()
    await expect(page.getByText(/your watchlist is empty/i)).not.toBeVisible()
    await expect(page.getByText('AAPL').first()).toBeVisible()
  })

  test('removing star from watchlist screen removes the stock', async ({ page }) => {
    const aaplRow = page.locator('tr', { has: page.getByText('AAPL') }).first()
    await aaplRow.locator('button[title="Add to watchlist"]').click()
    await navTab(page, 'Watchlist').click()
    // Wait for the AAPL watchlist card to be present before clicking remove
    await expect(page.getByRole('button', { name: 'Remove AAPL from watchlist' })).toBeVisible()
    await page.getByRole('button', { name: 'Remove AAPL from watchlist' }).click()
    await expect(page.getByText(/your watchlist is empty/i)).toBeVisible({ timeout: 10000 })
  })
})

// ── E-05: Investor strategy selection ────────────────────────────────────────

test.describe('E-05: Investor strategy selection on Screener', () => {
  test.beforeEach(async ({ page }) => {
    await freshVisit(page)
  })

  test('default investor is Warren Buffett', async ({ page }) => {
    await expect(page.getByText('Warren Buffett')).toBeVisible()
  })

  test('clicking Graham pill shows Benjamin Graham', async ({ page }) => {
    await page.getByRole('button', { name: /Graham/, exact: false }).first().click()
    await expect(page.getByText('Benjamin Graham')).toBeVisible()
  })

  test('clicking Lynch pill shows Peter Lynch', async ({ page }) => {
    await page.getByRole('button', { name: /Lynch/, exact: false }).first().click()
    await expect(page.getByText('Peter Lynch')).toBeVisible()
  })
})

// ── E-06: Strategies screen tab switching ────────────────────────────────────

test.describe('E-06: Strategies screen tab switching', () => {
  test.beforeEach(async ({ page }) => {
    await freshVisit(page)
    await navTab(page, 'Strategies').click()
  })

  test('Rules tab shows screening rules', async ({ page }) => {
    await page.getByRole('button', { name: 'Rules', exact: true }).click()
    await expect(page.getByText(/screening rule/i)).toBeVisible()
  })

  test('Formulas tab shows valuation formulas', async ({ page }) => {
    await page.getByRole('button', { name: 'Formulas', exact: true }).click()
    await expect(page.getByText(/valuation formulas/i)).toBeVisible()
  })

  test('clicking a different investor updates the detail panel', async ({ page }) => {
    // Click Graham's sidebar card
    const grahamCard = page.getByRole('button', { name: /Benjamin Graham/ }).first()
    await grahamCard.click()
    // Graham's tagline is "Margin of safety above all else"
    await expect(page.getByText(/margin of safety above all else/i)).toBeVisible()
  })
})

// ── E-07: Deep link #/analysis/TICKER/investor ────────────────────────────────

test.describe('E-07: Deep link opens analyzer modal', () => {
  test('navigating to #/analysis/AAPL/buffett opens modal pre-filled', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('stratalyx_welcomed', '1')
    })
    await page.goto('/#/analysis/AAPL/buffett')
    await expect(page.getByRole('dialog')).toBeVisible()
    const input = page.getByRole('dialog').getByRole('textbox').first()
    await expect(input).toHaveValue('AAPL')
  })
})
