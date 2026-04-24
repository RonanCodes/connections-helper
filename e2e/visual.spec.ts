import { test, expect, type Page } from '@playwright/test'

const DESKTOP = { width: 1440, height: 900 } as const
const MOBILE = { width: 390, height: 844 } as const

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/how-it-works', name: 'how-it-works' },
  { path: '/?date=2026-04-12', name: 'home-dated' },
] as const

type Route = (typeof ROUTES)[number]
type Viewport = typeof DESKTOP | typeof MOBILE

async function prepare(page: Page, route: Route) {
  await page.goto(route.path, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h1', { state: 'visible', timeout: 15000 })
  // Freeze anything time- or network-dependent that would otherwise make
  // snapshots flake. Stats banner, fetched puzzle data, etc. should be
  // masked via the mask: [...] option below rather than hidden here.
  await page.addStyleTag({
    content: `
      *, *::before, *::after { animation: none !important; transition: none !important; }
    `,
  })
  // Give React a beat to settle after hydration — no networkidle because
  // PostHog/Sentry keep long-lived connections open.
  await page.waitForTimeout(500)
}

async function masksFor(page: Page) {
  // Dynamic content that would otherwise diff on every run.
  return [
    page.locator('[aria-live="polite"]'),
    page.locator('[role="status"]'),
  ]
}

for (const route of ROUTES) {
  for (const [size, viewport] of [
    ['desktop', DESKTOP],
    ['mobile', MOBILE],
  ] as const) {
    test(`visual: ${route.name} @ ${size}`, async ({ page }) => {
      await page.setViewportSize(viewport as Viewport)
      await prepare(page, route)
      await expect(page).toHaveScreenshot(`${route.name}-${size}.png`, {
        fullPage: true,
        mask: await masksFor(page),
      })
    })
  }
}
