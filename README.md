# Connections Helper 🧩

A self-hostable helper for the [NYT Connections](https://www.nytimes.com/games/connections) puzzle. Shows definitions for each word so you can look up an unfamiliar term without spoiling the categories.

- Fetches the daily puzzle from the public NYT endpoint
- Pulls definitions from Dictionary API, Datamuse, Urban Dictionary, Wiktionary
- Caches everything to a local SQLite file so repeat lookups are instant
- Hints / category reveal for when you're really stuck

Not affiliated with the New York Times.

## Stack

- [Bun](https://bun.sh) runtime
- [Hono](https://hono.dev) backend + static file serving
- [Vite](https://vitejs.dev) + React 19 frontend
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) components
- SQLite (via `bun:sqlite`) for the cache

## Local development

```bash
bun install
bun run dev:full
```

Opens the Vite dev server on [http://localhost:5181](http://localhost:5181) and the Hono backend on [http://localhost:3006](http://localhost:3006). Vite proxies `/api/*` to the backend.

SQLite `puzzles.db` is created on first request — no setup required.

## Deploy

### Fly.io (recommended)

```bash
fly launch --copy-config --no-deploy   # uses fly.toml in the repo
fly volumes create connections_data --size 1 --region lhr
fly deploy
```

Fly builds the Dockerfile remotely, mounts a 1GB volume at `/app/data`, and gives you an HTTPS URL. Free tier is enough for a small puzzle helper.

### Docker (any VPS)

```bash
docker run -d \
  --name connections-helper \
  --restart unless-stopped \
  -p 3006:3006 \
  -v connections_data:/app/data \
  ghcr.io/ronancodes/connections-helper:latest
```

Or with `docker-compose.yml` from the repo:

```bash
docker compose up -d
```

### Auto-update with Watchtower

If you're running on a VPS and want automatic updates when a new image is published:

```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 3600
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `PORT` | `3006` | HTTP port |
| `NODE_ENV` | - | Set to `production` to serve the built frontend from `dist/` |

## Development

```bash
bun run lint           # ESLint
bun run build          # Type-check + production build
bun test               # Vitest unit tests
bun run test:e2e       # Playwright e2e tests (needs app running)
```

## License

[MIT](./LICENSE)
