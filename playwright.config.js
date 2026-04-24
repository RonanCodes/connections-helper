import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Visual tests live in their own workflow (.github/workflows/visual-regression.yml)
  // because baselines are platform-scoped. Opt in via PLAYWRIGHT_VISUAL=1.
  testIgnore: process.env.PLAYWRIGHT_VISUAL === '1' ? undefined : ['**/visual.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'en-GB',
    timezoneId: 'Europe/Amsterdam',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
