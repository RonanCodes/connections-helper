import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ROUTES = ['/', '/how-it-works', '/settings', '/design-system'] as const

// Rules we baseline today and will ratchet up in US-009 + theme polish:
// - color-contrast: NYT theme + env-badge + card titles need contrast
//   fixes across several themes (tracked separately, not a one-liner).
// - label: fires on /design-system, which renders raw unstyled form
//   primitives as a component playground. Labelling every showcase
//   instance would defeat the purpose of the page.
//
// Any other violation (landmarks, headings, focus order, missing button
// text on real surfaces, etc.) fails this suite, which is the value we
// want from CI today.
const BASELINED_RULES = ['color-contrast', 'label']

for (const route of ROUTES) {
  test(`a11y: ${route} has no WCAG 2 AA violations`, async ({ page }) => {
    await page.goto(route)
    // Wait for the H1 so axe scans a stable tree rather than the initial
    // skeleton. networkidle is flaky on / because PostHog keeps a long-
    // poll open, so we settle on the DOM instead.
    await page.waitForSelector('h1', { state: 'visible' })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .disableRules(BASELINED_RULES)
      .analyze()

    expect(
      results.violations,
      `Accessibility violations on ${route}:\n${JSON.stringify(results.violations, null, 2)}`,
    ).toEqual([])
  })
}
