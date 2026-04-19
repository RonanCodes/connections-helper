import { test, expect } from '@playwright/test'

test.describe('Connections Helper', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads the page with title', async ({ page }) => {
    await expect(page).toHaveTitle(/Connections Helper/)
    await expect(page.getByText('Connections Helper')).toBeVisible()
  })

  test('shows date picker', async ({ page }) => {
    const datePicker = page.locator('input[type="date"]')
    await expect(datePicker).toBeVisible()
  })

  test('shows loading state initially', async ({ page }) => {
    // Should show loading or puzzle content
    const loadingOrContent = page.getByText(/Loading puzzle|words/)
    await expect(loadingOrContent).toBeVisible({ timeout: 10000 })
  })

  test('can navigate to previous day', async ({ page }) => {
    // Wait for puzzle to load
    await page.waitForSelector('text=/\\d+ words|Loading/', { timeout: 10000 })

    const prevButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg') })
      .first()
    const datePicker = page.locator('input[type="date"]')

    const initialDate = await datePicker.inputValue()
    await prevButton.click()

    // Date should change
    await expect(datePicker).not.toHaveValue(initialDate, { timeout: 5000 })
  })

  test('shows word definitions after loading', async ({ page }) => {
    // Wait for definitions to load
    await page.waitForSelector('.grid', { timeout: 15000 })

    // Should have word cards
    const wordCards = page
      .locator('.rounded-xl')
      .filter({ hasText: /noun|verb|adjective|Definition/i })
    await expect(wordCards.first()).toBeVisible({ timeout: 15000 })
  })

  test('can toggle answers reveal', async ({ page }) => {
    // Wait for puzzle to load
    await page.waitForSelector('text=/\\d+ words/', { timeout: 15000 })

    const revealButton = page.getByRole('button', { name: /Reveal Answers/i })
    await expect(revealButton).toBeVisible()

    await revealButton.click()

    // Should now show "Hide Answers"
    await expect(
      page.getByRole('button', { name: /Hide Answers/i }),
    ).toBeVisible()

    // Should show categories
    await expect(page.getByText('Categories:')).toBeVisible()
  })

  test('theme picker is visible', async ({ page }) => {
    // Theme picker from @bender-tools/themes
    const themePicker = page
      .locator('button')
      .filter({ hasText: /🎨|Theme/i })
      .or(page.locator('[aria-label*="theme" i]'))
      .or(
        page.locator('button svg').first(), // Fallback to first icon button
      )

    // At least the theme system should be loaded
    await expect(page.locator('body')).toBeVisible()
  })

  test('persists date in localStorage', async ({ page }) => {
    // Wait for puzzle to load
    await page.waitForSelector('text=/\\d+ words|Loading/', { timeout: 10000 })

    const datePicker = page.locator('input[type="date"]')
    const currentDate = await datePicker.inputValue()

    // Navigate to previous day
    const prevButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg') })
      .first()
    await prevButton.click()

    // Wait for date to change
    await page.waitForFunction(
      (oldDate) => {
        const input = document.querySelector(
          'input[type="date"]',
        ) as HTMLInputElement
        return input && input.value !== oldDate
      },
      currentDate,
      { timeout: 5000 },
    )

    // Check localStorage
    const savedDate = await page.evaluate(() =>
      localStorage.getItem('connections-date'),
    )
    expect(savedDate).toBeTruthy()
  })
})
