import { test, expect, type Page } from '@playwright/test'

const DESKTOP = { width: 1440, height: 900 } as const
const MOBILE = { width: 390, height: 844 } as const

// Fixture for a fully-stubbed home render. Shape matches NYTPuzzle in
// src/routes/api/puzzle.$date.ts so the App treats it as a real puzzle.
const PUZZLE_FIXTURE = {
  id: 999,
  print_date: '2026-04-25',
  categories: [
    {
      title: 'Test Category One',
      cards: [
        { content: 'ALPHA', position: 0 },
        { content: 'BRAVO', position: 1 },
        { content: 'CHARLIE', position: 2 },
        { content: 'DELTA', position: 3 },
      ],
    },
    {
      title: 'Test Category Two',
      cards: [
        { content: 'ECHO', position: 4 },
        { content: 'FOXTROT', position: 5 },
        { content: 'GOLF', position: 6 },
        { content: 'HOTEL', position: 7 },
      ],
    },
    {
      title: 'Test Category Three',
      cards: [
        { content: 'INDIA', position: 8 },
        { content: 'JULIET', position: 9 },
        { content: 'KILO', position: 10 },
        { content: 'LIMA', position: 11 },
      ],
    },
    {
      title: 'Test Category Four',
      cards: [
        { content: 'MIKE', position: 12 },
        { content: 'NOVEMBER', position: 13 },
        { content: 'OSCAR', position: 14 },
        { content: 'PAPA', position: 15 },
      ],
    },
  ],
}

type Route = { path: string; name: string; stubPuzzle?: boolean }
type Viewport = typeof DESKTOP | typeof MOBILE

const ROUTES: ReadonlyArray<Route> = [
  { path: '/how-it-works', name: 'how-it-works' },
  { path: '/?date=2026-04-25', name: 'home', stubPuzzle: true },
]

function definitionsPayload(words: Array<string>) {
  return {
    definitions: Object.fromEntries(
      words.map((w) => [
        w.toLowerCase(),
        {
          definitions: [
            {
              definition: `Fixed test definition for ${w.toLowerCase()}.`,
              partOfSpeech: 'noun',
              source: 'merriam-webster',
            },
          ],
        },
      ]),
    ),
  }
}

async function stubPuzzleApis(page: Page) {
  await page.route('**/api/puzzle/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(PUZZLE_FIXTURE),
    })
  })
  await page.route('**/api/definitions', async (route) => {
    const body = route.request().postDataJSON() as {
      words?: Array<string>
    } | null
    const words = body?.words ?? []
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(definitionsPayload(words)),
    })
  })
  await page.route('**/api/companion/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'https://example.test/companion',
        companionNumber: 42,
      }),
    })
  })
  // Any single-definition lookups triggered by source switching.
  await page.route('**/api/definition/**', async (route) => {
    const url = new URL(route.request().url())
    const word = decodeURIComponent(url.pathname.split('/').pop() ?? 'word')
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        definitions: [
          {
            definition: `Fixed test definition for ${word.toLowerCase()}.`,
            partOfSpeech: 'noun',
          },
        ],
      }),
    })
  })
}

async function prepare(page: Page, route: Route) {
  if (route.stubPuzzle) await stubPuzzleApis(page)
  await page.goto(route.path, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h1', { state: 'visible', timeout: 15000 })
  if (route.stubPuzzle) {
    // Confirm the puzzle grid rendered real cards, not skeletons, before we snapshot.
    await page.getByText('ALPHA', { exact: true }).waitFor({ timeout: 15000 })
  }
  // Freeze anything time- or network-dependent that would otherwise make
  // snapshots flake. Stats banner, fetched puzzle data, etc. should be
  // masked via the mask: [...] option below rather than hidden here.
  await page.addStyleTag({
    content: `
      *, *::before, *::after { animation: none !important; transition: none !important; }
    `,
  })
  // Give React a beat to settle after hydration. No networkidle because
  // PostHog/Sentry keep long-lived connections open.
  await page.waitForTimeout(500)
}

async function masksFor(page: Page) {
  // Dynamic content that would otherwise diff on every run.
  return [page.locator('[aria-live="polite"]'), page.locator('[role="status"]')]
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
