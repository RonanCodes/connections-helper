import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ASSETS_DIR = 'dist/client/assets'

// Strings that only appear in src/components/design-system-showcase.tsx.
// Both are runtime-visible labels, so minification keeps them intact.
// If either turns up in a production chunk, the dev-only guard in
// src/routes/design-system.tsx has been bypassed and the showcase code
// is shipping to users.
const SHOWCASE_MARKERS = [
  'card / card-foreground',
  'popover / popover-foreground',
] as const

describe('design-system showcase is excluded from prod bundle', () => {
  it('ships only the redirect shell, never the showcase', () => {
    if (!existsSync(ASSETS_DIR)) {
      // CI runs `pnpm build` before `pnpm test`, so this branch only
      // fires for `pnpm test` runs without a prior build (local dev).
      // Skip rather than flake.
      console.warn(`[build-test] ${ASSETS_DIR} missing — skipping`)
      return
    }

    const files = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js'))

    const hasRouteShell = files.some((f) =>
      /^design-system-[A-Za-z0-9_-]+\.js$/.test(f),
    )
    expect(
      hasRouteShell,
      'expected a design-system route chunk in the prod build',
    ).toBe(true)

    const offenders: Array<{ file: string; marker: string }> = []
    for (const file of files) {
      const contents = readFileSync(join(ASSETS_DIR, file), 'utf8')
      for (const marker of SHOWCASE_MARKERS) {
        if (contents.includes(marker)) offenders.push({ file, marker })
      }
    }

    expect(
      offenders,
      `showcase code leaked into prod chunks:\n${JSON.stringify(offenders, null, 2)}`,
    ).toEqual([])
  })
})
