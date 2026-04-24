# Progress: production-grade testing stack

Track per-task status and notes. Update after each commit.

## Task 1: Playwright in CI

- [x] Fix port mismatch in `playwright.config.js` (5181 → 3000, `bun run dev` → `pnpm dev`, startup timeout 120s).
- [x] Change `e2e/api.spec.ts` + `e2e/feb7-shapes.spec.ts` default `BASE_URL` to `http://localhost:3000`.
- [x] Add `e2e` job to `.github/workflows/ci.yml` with Playwright browsers + D1 migrations + report artifact.
- [x] Update `deploy` job to depend on `[test, e2e]`.
- [x] Confirm locally: `pnpm test:e2e` green (18/18).

Notes:

- Trimmed 5 stale UI tests in `e2e/connections.spec.ts` that were written against the pre-redesign UI (selectors like `input[type="date"]` and "Reveal Answers" no longer match). Kept 3 stable specs. Follow-up task: rewrite UI coverage against current selectors.
- **Follow-up done:** UI coverage rewritten against current selectors. New specs cover title, date-picker popover open, `Unlock Hints` ↔ `Lock Hints` toggle, settings button, definition rendering, and localStorage persistence after picking a date. 21/21 full e2e green.
- One API test (`handles unknown words gracefully`) was relaxed: the former "Inferred" fallback was removed from `definition.$word.ts` but the test still expected a fallback definition. Now it only asserts the response shape, not presence of a fallback.

## Task 2: Integration tests

- [x] Add `vitest.integration.config.ts` (node env, 30s timeout, retry:1, scoped to `tests/integration/**`).
- [x] Fix `tests/integration/api.test.ts` default port (3006 → 3000).
- [x] Add `start-server-and-test` dev dep + `pnpm test:integration` script.
- [x] Add `integration` CI job (needs `test`, gates `deploy`).
- [x] Confirm locally: `pnpm test:integration` green (7/7).

Notes:

- Two SCARRY/GOREY assertions were hard-coded to `source === 'urban'`. After the Merriam-Webster key was added, MW answers both, so these now assert only that some source responds. Source-selection logic belongs in unit tests, not live integration tests.
- **Follow-up done:** `src/server/definition-fallbacks.test.ts` adds 6 unit tests covering the chain order (MW → Wordnik → Dictionary → Datamuse → Wikipedia → Urban), short-circuit on first hit, key-absence skipping for MW/Wordnik, all-miss returning null, and empty-array handling from Urban Dictionary. Uses `vi.stubGlobal('fetch', ...)` to keep the real composition under test.

## Task 3: Bruno collection

- [x] Install `@usebruno/cli` as a dev dep.
- [x] Create `bruno/` collection covering stats, puzzle (valid / malformed / not-found), definition (happy / by-source / unknown-source), definitions batch (valid / empty / invalid), config.
- [x] Commit `bruno.json` + `environments/local.bru` + `environments/production.bru`.
- [x] Add assertions on status + body shape + domain-specific tests (e.g. 4 categories × 4 cards).
- [x] Add `pnpm test:api` + `pnpm test:api:prod` scripts. Local variant uses `start-server-and-test`.
- [x] Add `api-contract` CI job (needs `test`, gates `deploy`).
- [x] Confirm locally: `pnpm test:api` green (11/11 requests, 9/9 tests, 22/22 assertions).

Notes:

- Bruno's built-in assertion set does not include `isObject`; used chai `to.be.an("object")` in `tests { }` blocks instead.
- `bru run` must execute from the collection root, so the script does `cd bruno && bru run . -r`.
- `test:api:prod` runs the same collection against `connectionshelper.app` for post-deploy smoke verification.

## Task 4: Zod + OpenAPI + Scalar

- [x] Install `zod` 4.3 and `@asteasolutions/zod-to-openapi` 8.5.
- [x] `src/server/schemas.ts` covers every in-scope route (request params, query, body; response shapes; shared `ErrorResponse`).
- [x] `src/server/validate.ts` with `validate()` + `jsonError()` helpers.
- [x] Wire validation into `/api/puzzle/:date`, `/api/definition/:word`, `/api/definitions`. Replaces regex + hand-rolled type checks.
- [x] `src/server/openapi.ts` registers all six paths and assembles an OpenAPI 3.1 document at module load.
- [x] Serve spec at `/api/openapi` (TanStack file-routing treats `.` as a path separator, so the filename-literal `.json` path isn't viable; kept the content JSON and dropped the suffix).
- [x] `/api/docs` route returns HTML that loads Scalar from CDN and points at `/api/openapi`.
- [x] Confirm locally: spec lists all six paths and eleven component schemas; `/api/docs` serves HTML.
- [x] Updated `e2e/feb7-shapes.spec.ts` for the stricter contract (null/undefined in `words` now returns 400 instead of being silently filtered).

Notes:

- Path is `/api/openapi`, not `/api/openapi.json`. Documented in the PRD.
- Error message for `/api/definitions` with a missing `words` key changed slightly (from hand-written string to Zod's `Invalid input: expected array, received undefined`). Still a 400, still `{ error: string }` shape. Existing Bruno and e2e assertions are content-agnostic so all pass.
