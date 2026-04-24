import { test, expect, type Page } from '@playwright/test'

async function waitForPuzzleLoaded(page: Page) {
  // Once the puzzle resolves, the Unlock Hints / Lock Hints button appears.
  await expect(
    page.getByRole('button', { name: /Unlock Hints|Lock Hints/ }),
  ).toBeVisible({ timeout: 20000 })
}

test.describe('Connections Helper UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads with the correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Connections Helper/)
    await expect(page.getByText('Connections Helper')).toBeVisible()
  })

  test('shows the date picker trigger and opens a calendar popover', async ({
    page,
  }) => {
    await waitForPuzzleLoaded(page)

    // DatePicker renders a button containing the formatted date (e.g. "23 Apr 2026").
    const trigger = page
      .getByRole('button', { name: /\d+\s+[A-Za-z]{3}\s+\d{4}/ })
      .first()
    await expect(trigger).toBeVisible()

    await trigger.click()

    // react-day-picker mounts a grid with role="grid" once the popover opens.
    await expect(page.getByRole('grid')).toBeVisible()
  })

  test('toggles Unlock Hints ↔ Lock Hints', async ({ page }) => {
    await waitForPuzzleLoaded(page)

    const unlock = page.getByRole('button', { name: 'Unlock Hints' })
    await expect(unlock).toBeVisible()
    await unlock.click()

    await expect(page.getByRole('button', { name: 'Lock Hints' })).toBeVisible()
  })

  test('surfaces the settings button', async ({ page }) => {
    await waitForPuzzleLoaded(page)
    await expect(
      page.getByRole('button', { name: 'Open settings' }),
    ).toBeVisible()
  })

  test('renders definition content for the loaded puzzle', async ({ page }) => {
    await waitForPuzzleLoaded(page)
    await page.waitForSelector('.grid', { timeout: 15000 })
    const wordCards = page
      .locator('.rounded-xl')
      .filter({ hasText: /noun|verb|adjective|Definition/i })
    await expect(wordCards.first()).toBeVisible({ timeout: 15000 })
  })

  test('persists selected date in localStorage after picking one', async ({
    page,
  }) => {
    await waitForPuzzleLoaded(page)

    // Not set until the user picks a date. Open the picker, confirm "Today".
    await page
      .getByRole('button', { name: /\d+\s+[A-Za-z]{3}\s+\d{4}/ })
      .first()
      .click()
    await expect(page.getByRole('grid')).toBeVisible()
    // The calendar popover's footer "Today" button: only the enabled one.
    // A disabled "Today" button also exists elsewhere in the header.
    await page
      .locator('button:not([disabled])')
      .filter({ hasText: /^Today$/ })
      .click()

    const saved = await page.evaluate(() =>
      localStorage.getItem('connections-date'),
    )
    expect(saved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
