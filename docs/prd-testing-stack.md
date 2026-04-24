# PRD: Production-grade testing stack

## Why

This project doubles as a rehearsal for production. CI currently only runs format, lint, build and an empty `vitest` suite. `/e2e` and `tests/integration` exist but don't run on PRs. There is no API contract documented and no API exploration tool. The goal is to lock in the testing and documentation patterns a real production service would have, without cargo-culting things that don't fit the size of the app.

## Scope

1. **Playwright in CI.** The existing `/e2e` suite runs on every PR against a local dev server.
2. **Integration tests in CI.** `tests/integration/api.test.ts` currently excluded from vitest. Give it its own runner and wire into CI.
3. **Bruno collection.** Committed `.bru` files for every public API route. Usable by a human in the Bruno app and by the `bru` CLI in CI.
4. **Zod + OpenAPI + Scalar.** Zod schemas for request and response shapes, runtime validation on handlers, auto-generated OpenAPI 3.1 spec served at `/api/openapi`, Scalar docs UI at `/api/docs`.

Out of scope:

- Coverage thresholds in CI (decided against; separate decision).
- Rewriting existing handlers beyond what Zod validation requires.
- Authentication on the docs route (public API, no secrets exposed).

## Routes in scope

| Method | Path                    | Purpose                                                   |
| ------ | ----------------------- | --------------------------------------------------------- |
| GET    | `/api/puzzle/:date`     | Fetch NYT puzzle for a date.                              |
| GET    | `/api/definition/:word` | Fetch a single word definition (with `?source=` variant). |
| POST   | `/api/definitions`      | Batch definition fetch.                                   |
| GET    | `/api/stats`            | Row counts for puzzles and definitions tables.            |
| GET    | `/api/companion/:date`  | Companion puzzle number.                                  |
| GET    | `/api/config`           | Public runtime config.                                    |

## Decisions

- **TanStack Start, not Hono.** File-route handlers stay as-is. Validation is a helper that wraps the handler body, not a framework swap.
- **Spec generation.** `@asteasolutions/zod-to-openapi`. Spec is built at module load time and served as a static JSON response. No per-request cost.
- **Docs UI.** Scalar loaded from CDN (`@scalar/api-reference`), mounted at `/api/docs` as a TanStack route that returns static HTML.
- **Integration test runner.** Vitest with a second config (`vitest.integration.config.ts`). Uses `start-server-and-test` to bring up `pnpm dev` before running.
- **Bruno CI run.** `bru run bruno --env ci` against localhost, also via `start-server-and-test`. Keeps Bruno as an extra contract check alongside Playwright API tests, not a replacement.

## Definition of done

- Push to a PR triggers: quality-checks, Playwright e2e, vitest integration, Bruno collection run, all green.
- `pnpm dev` serves `/api/openapi` and `/api/docs` locally.
- Zod schemas reject malformed requests with 400 and a readable error body.
- `docs/prd-testing-stack.md` and `docs/progress-testing-stack.md` are committed.
- One PR, task-by-task commits, ready to merge.
