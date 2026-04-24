# Progress: production-grade testing stack

Track per-task status and notes. Update after each commit.

## Task 1: Playwright in CI

- [ ] Fix port mismatch in `playwright.config.js` (config uses 5181, dev runs on 3000).
- [ ] Change `e2e/api.spec.ts` default `BASE_URL` to use Playwright `baseURL` (localhost), not the deployed URL.
- [ ] Add `e2e` job to `.github/workflows/ci.yml` that installs Playwright browsers and runs `pnpm test:e2e`.
- [ ] Confirm locally: `pnpm test:e2e` green.

Notes:

## Task 2: Integration tests

- [ ] Add `vitest.integration.config.ts` that includes only `tests/integration/**`.
- [ ] Fix `tests/integration/api.test.ts` default port (currently 3006, should be 3000).
- [ ] Add `pnpm test:integration` script wrapping `start-server-and-test`.
- [ ] Add `integration` CI job.
- [ ] Confirm locally: `pnpm test:integration` green.

Notes:

## Task 3: Bruno collection

- [ ] Install `@usebruno/cli` as a dev dep.
- [ ] Create `bruno/` collection with requests for every in-scope route.
- [ ] Commit `bruno.json`, environment files (`local`, `ci`, `production`).
- [ ] Add assertions on status + response shape for each request.
- [ ] Add `pnpm test:api` script using `start-server-and-test` + `bru run`.
- [ ] Add `api-contract` CI job.
- [ ] Confirm locally: `pnpm test:api` green.

Notes:

## Task 4: Zod + OpenAPI + Scalar

- [ ] Install `zod` and `@asteasolutions/zod-to-openapi`.
- [ ] Create `src/server/schemas.ts` with request + response schemas for every in-scope route.
- [ ] Add `validateJson` and `validateParams` helpers in `src/server/validate.ts`.
- [ ] Wire validation into every route handler, replacing hand-rolled regex / type checks.
- [ ] Create `src/server/openapi.ts` that registers every route and builds the document.
- [ ] Add `/api/openapi.json` TanStack route.
- [ ] Add `/api/docs` route serving Scalar HTML.
- [ ] Confirm locally: `curl /api/openapi.json` returns valid JSON; `/api/docs` renders.
- [ ] Update Bruno + integration tests if validation tightens any error shapes.

Notes:
