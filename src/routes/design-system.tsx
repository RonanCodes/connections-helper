import { lazy, Suspense } from 'react'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { THEMES } from '@/lib/themes'
import type { Theme } from '@/lib/themes'

// Build-time gate. In production builds Vite replaces `import.meta.env.DEV`
// with `false`, the ternary evaluates to `null`, and Rollup drops the
// dynamic import (and the showcase chunk) from the bundle entirely.
const Showcase = import.meta.env.DEV
  ? lazy(() => import('@/components/design-system-showcase'))
  : null

export const Route = createFileRoute('/design-system')({
  component: DesignSystemRoute,
  validateSearch: (search: Record<string, unknown>) => {
    const raw = typeof search.theme === 'string' ? search.theme : undefined
    const theme = (THEMES as readonly string[]).includes(raw ?? '')
      ? (raw as Theme)
      : undefined
    return { theme }
  },
})

function DesignSystemRoute() {
  if (!Showcase) return <Navigate to="/" />
  return (
    <Suspense fallback={null}>
      <Showcase />
    </Suspense>
  )
}
