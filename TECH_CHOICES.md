# Tech Choices

Why the stack is what it is. Each choice lists the alternatives considered and what tipped the decision.

## Framework: TanStack Start

**Chose:** [TanStack Start](https://tanstack.com/start) (React 19, SSR, file-based server routes)
**Over:** Next.js, Remix, SvelteKit, plain Vite SPA

- Type-safe router and server routes end-to-end, no codegen step, no manual route types
- Ships a single Worker artefact (SSR + API + static) instead of a split edge/node build
- No vendor-specific framework directives (`'use server'`, route handlers with magic exports)
- Vite-native, so the dev loop is the same one React devs already know

**Tradeoff:** Younger than Next/Remix; some edge cases around Vitest and the Cloudflare plugin need dedicated config (see `vitest.config.ts`).

## Runtime: Cloudflare Workers

**Chose:** Cloudflare Workers + D1
**Over:** Fly.io (Bun + Hono, the previous stack), Vercel, Railway, AWS Lambda

- Global edge by default; no region to pick
- D1 colocated with compute, so reads are sub-10ms from the worker
- Free tier covers this app's traffic; no idle cost
- `wrangler deploy` is the entire deploy pipeline: no Docker, no container registry, no health checks to configure
- `wrangler.jsonc` is the single source of truth for bindings (D1, vars, routes)

**Tradeoff:** 10ms CPU limit on the free plan (fine for this workload), and Node API compatibility is partial, so stick to the Workers runtime APIs.

## Database: D1 + Drizzle ORM

**Chose:** [D1](https://developers.cloudflare.com/d1/) (SQLite at the edge) with [Drizzle ORM](https://orm.drizzle.team)
**Over:** Turso, Neon, Postgres on Fly, KV-only

- SQLite is the right shape for a read-heavy cache (puzzles + definitions)
- D1 replicates reads globally; the app never needs write-after-read consistency across regions
- Drizzle gives typed queries without a separate migration runtime: `drizzle-kit` emits plain SQL that `wrangler d1 migrations apply` runs
- Schema-first: `src/db/schema.ts` is the source of truth; types flow from there

**Tradeoff:** No full-text search or JSON operators as rich as Postgres. Not needed here.

## Language: TypeScript (strict)

**Chose:** TypeScript with `strict` + `noUncheckedIndexedAccess`
**Over:** Plain JS, looser TS

- `noUncheckedIndexedAccess` catches `arr[i]` being possibly `undefined`, useful when iterating word lists and puzzle groups
- Zero `.js`/`.jsx` in `src/`; only config files at the root are JS (ESLint, Playwright, Vite configs)
- Wrangler generates literal-typed env bindings (`worker-configuration.d.ts`), so `env.SENTRY_DSN` is the exact shape declared in `wrangler.jsonc`

## Styling: Tailwind v4 + shadcn/ui (not SCSS)

**Chose:** Tailwind v4 + shadcn/ui primitives (which wrap Radix)
**Over:** SCSS, CSS Modules, styled-components, Emotion

- Tailwind v4 is CSS-first (`@import "tailwindcss"` in `src/styles.css`); no JS config file, no preprocessor build step
- Native CSS nesting in modern browsers covers the one thing SCSS used to give us
- Theme switching is CSS custom properties in `src/lib/themes/css/*.css` toggled via `data-theme`; no runtime JS theme system needed
- shadcn/ui is copy-in, not a dependency: components live in `src/components/ui/` and are edited directly

**Tradeoff:** None meaningful for this app. SCSS would be dead weight.

## Observability: Sentry + PostHog, runtime-injected

**Chose:** [Sentry](https://sentry.io) + [PostHog](https://posthog.com), keys served from `/api/config`
**Over:** Build-time `VITE_*` envvars, self-hosted telemetry

- Runtime injection means operators rotate keys without rebuilding; forks don't ship the origin project's keys
- Both tools are optional; empty env vars disable them cleanly
- PostHog covers product analytics + session replay; Sentry covers errors. Not worth running two heavier tools.

See [ARCHITECTURE.md](./ARCHITECTURE.md#runtime-config) for the full flow.

## Tests: Vitest + Playwright

**Chose:** Vitest (unit) + Playwright (e2e)
**Over:** Jest, Mocha, Cypress

- Vitest shares Vite's transform pipeline, so no separate Babel/ts-jest config
- Dedicated `vitest.config.ts` so the test runner doesn't load the Cloudflare Vite plugin (which doesn't play nicely with jsdom)
- Playwright for the golden-path e2e; kept minimal so CI stays fast

## CI / CD: GitHub Actions + Wrangler

**Chose:** GitHub Actions, single `ci.yml`, `environment: production` for deploy
**Over:** Cloudflare Pages auto-deploy, separate staging environment, Vercel

- One workflow file: lint → build → test on every push/PR, plus a gated `deploy` job on `main`
- `environment: production` gates deploy secrets so PR builds from forks can't read them
- `pnpm quality` is the same command locally and in CI; one thing to remember

## Package manager: pnpm

**Chose:** pnpm
**Over:** npm, yarn, bun

- Disk-efficient content-addressable store, fast installs
- Strict module resolution catches accidental transitive-dep imports
- `onlyBuiltDependencies` in `package.json` pins which packages can run install scripts (security)

## What's explicitly NOT in the stack

- **SCSS / CSS Modules**: Tailwind v4 + CSS custom properties covers it
- **State management (Redux, Zustand, Jotai)**: TanStack Router + React state is enough; server state lives server-side
- **tRPC / GraphQL**: TanStack Start server routes are typed end-to-end already
- **Docker**: Wrangler deploys directly; no container needed
- **Separate staging environment**: preview deployments per PR would be nice but aren't worth the complexity for a solo project
