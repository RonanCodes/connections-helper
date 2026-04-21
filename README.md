# Connections Helper 🧩

A self-hostable helper for the [NYT Connections](https://www.nytimes.com/games/connections) puzzle. Shows definitions for each word so you can look up an unfamiliar term without spoiling the categories.

- Fetches the daily puzzle from the public NYT endpoint
- Pulls definitions from Dictionary API, Datamuse, Wiktionary, Urban Dictionary
- Caches puzzles + definitions to Cloudflare D1 so repeat lookups are instant
- Hints / category reveal for when you're really stuck

Live instance: [connections-helper.ronanconnolly.dev](https://connections-helper.ronanconnolly.dev)

Not affiliated with the New York Times.

## Stack

- [TanStack Start](https://tanstack.com/start): full-stack React with file-based server routes + SSR
- [Cloudflare Workers](https://workers.cloudflare.com) runtime, [D1](https://developers.cloudflare.com/d1/) (SQLite at the edge) for caching
- [Drizzle ORM](https://orm.drizzle.team) for typed D1 access
- [Vite](https://vitejs.dev) + React 19
- [Tailwind CSS 4](https://tailwindcss.com) + Radix UI primitives
- [Sentry](https://sentry.io) + [PostHog](https://posthog.com) for errors & analytics (both optional)

See [TECH_CHOICES.md](./TECH_CHOICES.md) for why each piece of the stack was picked (and what was rejected).

## Local development

```bash
pnpm install
pnpm db:migrate:local   # applies drizzle migrations to local D1
pnpm dev                # Vite + Wrangler dev on http://localhost:3000
```

Server routes under `src/routes/api/*` run inside the local Workers runtime and talk to a local SQLite file that Wrangler provisions at `.wrangler/state/`.

## Deploy (Cloudflare Workers + D1)

One-time setup:

```bash
pnpm wrangler d1 create connections_helper_db
# copy the returned database_id into wrangler.jsonc
pnpm db:migrate:remote
```

Every deploy:

```bash
pnpm deploy   # runs vite build + wrangler deploy
```

Optional: attach a custom domain via the Cloudflare dashboard or API:

```bash
curl -X PUT -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains" \
  -H "Content-Type: application/json" \
  -d '{"environment":"production","hostname":"connections-helper.example.com","service":"connections-helper","zone_id":"<zone-id>"}'
```

## Configuration

Runtime D1 binding is declared in `wrangler.jsonc`; no secrets needed for core app.

Observability keys are **injected at runtime**, not built into the bundle. The server exposes them via `GET /api/config`, and the browser fetches that on load before initialising Sentry / PostHog. Keys are public by design (they ship to browsers), but keeping them out of the bundle means operators can rotate without rebuilds and forks don't ship your keys.

| Env var               | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `SENTRY_DSN`          | Sentry project DSN. Empty ⇒ Sentry disabled.              |
| `POSTHOG_PROJECT_KEY` | PostHog `phc_…` project key. Empty ⇒ PostHog disabled.    |
| `POSTHOG_INGEST_HOST` | PostHog ingest host (default `https://eu.i.posthog.com`). |

**Local dev:** create `.dev.vars` (gitignored) with the keys. Wrangler loads it automatically.
**CI deploys:** set as GitHub Actions secrets; the workflow passes them to `wrangler deploy --var`.
**Manual deploys:** edit the `vars` block in `wrangler.jsonc`, or pass `--var KEY:value` at deploy time.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full runtime-config flow.

## Continuous deployment

`.github/workflows/ci.yml` runs on every push/PR: `pnpm install → lint → build → test`. On green, the `deploy` job (push to `main` only) applies pending D1 migrations and runs `wrangler deploy`, pulling observability keys from repo secrets.

Required repo secrets:

- `CLOUDFLARE_API_TOKEN`: Workers + D1 permissions
- `CLOUDFLARE_ACCOUNT_ID`
- `SENTRY_DSN`
- `POSTHOG_PROJECT_KEY`

Optional repo variable: `POSTHOG_INGEST_HOST` (defaults to `https://eu.i.posthog.com`).

## Scripts

```bash
pnpm dev                # dev server
pnpm build              # production bundle
pnpm deploy             # build + wrangler deploy
pnpm lint               # ESLint
pnpm format             # prettier --check
pnpm check              # prettier --write + eslint --fix
pnpm test               # Vitest unit tests
pnpm test:e2e           # Playwright e2e tests (needs app running)
pnpm quality            # format + lint + build + test (what CI runs)
pnpm db:generate        # emit drizzle migrations from schema changes
pnpm db:migrate:local   # apply migrations to local D1
pnpm db:migrate:remote  # apply migrations to remote D1
```

## License

[MIT](./LICENSE)
