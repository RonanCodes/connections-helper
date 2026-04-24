import { test, expect } from '@playwright/test'

// TODO: expand UI coverage. Earlier specs (date picker, reveal answers,
// localStorage persistence) were written against a previous UI and went stale
// after the redesign. Rewrite against current selectors as a follow-up.

test.describe('Connections Helper', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads the page with title', async ({ page }) => {
    await expect(page).toHaveTitle(/Connections Helper/)
    await expect(page.getByText('Connections Helper')).toBeVisible()
  })

  test('shows word definitions after loading', async ({ page }) => {
    await page.waitForSelector('.grid', { timeout: 15000 })
    const wordCards = page
      .locator('.rounded-xl')
      .filter({ hasText: /noun|verb|adjective|Definition/i })
    await expect(wordCards.first()).toBeVisible({ timeout: 15000 })
  })

  test('renders a non-empty body', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible()
  })
})
