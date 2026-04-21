# Architecture

High-level view of how the pieces fit together. Diagrams use Mermaid; GitHub renders them natively.

## Request path

The app is a single Cloudflare Worker that both serves the SSR-rendered React UI and hosts the API. D1 acts as a cache so repeat puzzle/definition lookups never hit the upstream APIs.

```mermaid
flowchart LR
  subgraph Browser
    UI[React UI<br/>TanStack Router]
  end

  subgraph CF[Cloudflare Edge]
    W[Worker<br/>TanStack Start SSR]
    D1[(D1<br/>connections_helper_db)]
    W -->|Drizzle| D1
  end

  subgraph Upstream
    NYT[NYT Connections API]
    DICT[Dictionary APIs<br/>Dictionary / Datamuse<br/>Wiktionary / Urban]
  end

  UI -->|"GET /"| W
  UI -->|"GET /api/puzzle/:date"| W
  UI -->|"POST /api/definitions"| W
  UI -->|"GET /api/config"| W
  W -. miss .-> NYT
  W -. miss .-> DICT
  NYT --> W
  DICT --> W
```

**Cache semantics**

- `puzzles` table: keyed by `YYYY-MM-DD`. Cache-forever (NYT puzzles are immutable once published).
- `definitions` table: keyed by `word`. 30-day TTL on the endpoint (`fetchedAt` column drives expiry).
- Client never talks to NYT or dictionary APIs directly; the Worker is the only egress point.

## Runtime config flow

Observability keys (Sentry DSN, PostHog key) are not compiled into the bundle. They live as Cloudflare Worker `vars`, are exposed via a small server endpoint, and the client fetches them once on load before initialising the SDKs.

```mermaid
sequenceDiagram
  participant Browser
  participant Worker
  participant CF as Cloudflare env

  Browser->>Worker: GET /
  Worker-->>Browser: SSR HTML (no keys inlined)
  Browser->>Browser: hydrate React
  Browser->>Worker: GET /api/config
  Worker->>CF: read env.SENTRY_DSN / env.POSTHOG_PROJECT_KEY
  CF-->>Worker: values
  Worker-->>Browser: { sentryDsn, posthogKey, posthogHost }
  Note over Browser: initSentry() / initPostHog()<br/>memoised; one fetch per session
```

Why not build-time (`VITE_*`)?

- Rotating keys doesn't require a rebuild.
- CI can build without any observability secrets.
- Forks of the repo don't accidentally ship the upstream maintainer's keys.

Trade-off: the first page load does one extra fetch to `/api/config` before analytics initialise. For a puzzle helper, that's fine; we don't need first-paint analytics.

## Deploy pipeline

```mermaid
flowchart LR
  Dev[Developer<br/>push to main] --> GH[GitHub]
  GH --> CI{CI job<br/>lint + build + test}
  CI -- fail --> Stop[block deploy]
  CI -- pass --> Deploy[deploy job]
  Deploy --> Mig[wrangler d1 migrations apply --remote]
  Mig --> Dep[wrangler deploy --var ...]
  Dep --> CFW[Cloudflare Worker]
  Dep --> CFD[(D1 schema updated)]
  subgraph Secrets[GitHub Actions secrets]
    S1[CLOUDFLARE_API_TOKEN]
    S2[CLOUDFLARE_ACCOUNT_ID]
    S3[SENTRY_DSN]
    S4[POSTHOG_PROJECT_KEY]
  end
  Secrets -.-> Deploy
```

The `deploy` job is gated on the `test` job (lint + build + Vitest) passing, and only runs on push to `main` (never on PRs). D1 migrations are applied before the new Worker version goes live; if a migration fails, the old Worker keeps serving.

## Observability

```mermaid
flowchart LR
  subgraph Browser
    APP[React app]
    SDK1[Sentry SDK]
    SDK2[PostHog SDK]
    APP --> SDK1
    APP --> SDK2
  end

  SDK1 -->|errors + traces| Sentry[Sentry<br/>ingest.de.sentry.io]
  SDK2 -->|events + pageviews| PH[PostHog<br/>eu.i.posthog.com]

  subgraph UR[UptimeRobot]
    Mon[5-min check on<br/>/api/stats]
  end

  Mon -->|HTTP probe| CFW[Cloudflare Worker]
  CFW -. alerts .-> Email[on-call email]
```

- **Sentry:** unhandled errors + 10% trace sampling, full replay on error.
- **PostHog:** autocapture + pageviews, `person_profiles: 'identified_only'`.
- **UptimeRobot:** 5-minute probe of `/api/stats` (which touches D1); alerts on failure.

## Project layout

```
src/
  routes/
    __root.tsx              TanStack root shell: head meta, favicon, theme script
    index.tsx               Home: ClientOnly wrapper around <App />
    api/
      config.ts             GET: runtime observability config
      puzzle.$date.ts       GET: cached puzzle by YYYY-MM-DD
      definition.$word.ts   GET: cached single-word definition
      definitions.ts        POST: batch definitions
      stats.ts              GET: cache sizes (UptimeRobot probe target)
  db/
    schema.ts               Drizzle schema: puzzles, definitions
    index.ts                createDb(d1) → Drizzle client
  server/
    definition-fallbacks.ts Chain: Dictionary → Datamuse → Wiktionary → Urban
  lib/
    runtime-config.ts       Client-side memoised /api/config fetch
    sentry.ts               Sentry init (runtime-keyed)
    posthog.ts              PostHog init (runtime-keyed)
    themes/                 Theme CSS + setTheme/setMode/cycleTheme
  App.tsx                   Legacy React app: main UI
  components/               shadcn-ish + DatePicker
drizzle/                    Generated SQL migrations
wrangler.jsonc              Worker config: D1 binding + vars
.github/workflows/ci.yml    Single workflow: test → deploy
```
