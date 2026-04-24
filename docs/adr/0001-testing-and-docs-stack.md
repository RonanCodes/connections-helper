# ADR 0001: Testing and API-docs stack

- **Status**: Accepted
- **Date**: 2026-04-25
- **Context**: this repo is the reference implementation for Ronan's future TanStack Start + Cloudflare Workers projects. Decisions recorded here are meant to be copied into new projects by `/ro:new-tanstack-app`.

## Context

Before this session, CI ran format, lint, build and an empty `vitest` suite. Playwright specs existed but were orphaned. A `tests/integration/` folder existed but was excluded from every runner. There was no API contract, no API exploration tool, no generated docs. The goal was to lock in a production-grade testing and docs pattern that:

1. Works for a solo side-project shipping every 1-2 weeks.
2. Generalises to larger team projects without rework.
3. Doesn't cargo-cult enterprise defaults (arbitrary coverage thresholds, paranoid schema strictness, duplicate-contract maintenance).

## Decision

Six layers, each with a clear job. All six run on every PR.

### 1. Unit tests: Vitest

- File pattern: `src/**/*.test.{ts,tsx}`, `tests/unit/**/*.test.{ts,tsx}`.
- Environment: `jsdom` for component tests, `node` for pure-logic tests.
- No blanket coverage threshold. Unit tests exist to catch embarrassing regressions in business logic (puzzle parsing, fallback-chain composition, rate-limit key logic), not to satisfy a number.

### 2. Integration tests: Vitest against real upstreams

- Separate config `vitest.integration.config.ts`, `retry: 1`, 30s timeout.
- Script: `pnpm test:integration` wraps `start-server-and-test` to bring up `pnpm dev` before running.
- Tests hit live external APIs (NYT, Urban Dictionary, Wikipedia). Accept some flakiness as the cost of catching real breakage.
- Source-selection behaviour is _not_ asserted here: that belongs in unit tests.

### 3. End-to-end tests: Playwright

- Specs in `e2e/`. Chromium only (multi-browser not worth the CI cost yet).
- `webServer` spins up `pnpm dev` before the run; `reuseExistingServer: !CI`.
- CI retries 2x, local retries 0x.
- Visual regression lives in its own workflow, opt-in via `PLAYWRIGHT_VISUAL=1`.

### 4. API collection: Bruno

- Collection at `/bruno`. Plain-text `.bru` files committed next to the code they exercise.
- Three envs: `local` (localhost:3000), `production` (deployed), `mock` (Prism on :4010).
- Every public route has status + shape assertions. Bruno doubles as a clickable human-facing explorer and a CI contract check via `bru run`.
- Not a replacement for Playwright API specs. Playwright locks in request-response behaviour under test conditions; Bruno documents the contract for a human reader and verifies it survives a deploy.

### 5. API spec + docs: Zod → OpenAPI 3.1 → Scalar

- Zod schemas in `src/server/schemas.ts` describe every route's request and response shapes. Each schema carries a `description`; the three schemas a reader actually copies (`Puzzle`, `DefinitionResult`, `ErrorResponse`) also carry a realistic `example`.
- `@asteasolutions/zod-to-openapi` registers every path in `src/server/openapi.ts` and generates an OpenAPI 3.1 document at module load time, cached per-origin.
- `/api/openapi` serves the spec. Server URL is derived from the request origin so Scalar's Try-It-Out works locally without CORS issues.
- `/api/docs` serves Scalar from the jsDelivr CDN, version-pinned.
- Runtime validation reuses the same Zod schemas via a shared `validate()` helper. One source of truth for both docs and runtime behaviour.

### 6. Mock server for FE-dev fallback: Prism

- `pnpm mock` regenerates `openapi.json` (via a Node script that imports `buildOpenApiDocument` through `tsx`) and starts Prism on :4010.
- Run in _static_ mode, not `--dynamic`: schema examples in the spec produce realistic, deterministic responses.
- Use case is "backend is down, frontend keeps working." Not a contract-test driver.
- `bruno/environments/mock.bru` points at Prism so the same collection can be pointed at the mock manually.

## Decisions rejected

### No blanket coverage threshold in CI

Hard percentages (80%, 90%) make teams write tests for the number, not for the risk. Even serious teams don't enforce repo-wide coverage. Ratchet-style thresholds are slightly less cargo-culty but still solve a non-problem at this scale. If a number is ever needed, scope it to `src/server/**` and `src/lib/**` and start modest.

### No `.strict()` on Zod objects (yet)

Tightening `additionalProperties: false` as a blanket default risks rejecting callers that send extra fields (including your own frontend after a rushed commit). Only earns its keep when the API is consumed by a separate team or published externally. For a solo internal API, leave it off.

### No Redoc alongside Scalar

Briefly tried. Scalar's inline-expand of schemas in request/response panels covers most reader needs. Redoc adds a Models navigation with clickable refs, but most visitors arrive endpoint-focused, not surface-auditing. Two doc routes means two things to maintain and explain. Scalar wins on default vibe + Try-It-Out ergonomics.

### No `x-faker` schema hints or custom mock handlers

Too much spec maintenance for limited value. Prism's example-driven mode with a handful of realistic `example` values is enough.

### No shape-only `test:api:mock` CI job

This earns its keep on a team where FE verifies the contract against mocks while BE changes. Solo, the real `pnpm test:api` against the live server is authoritative.

## Consequences

### What this gives us

- Six CI gates per PR: quality-checks, Playwright e2e, integration, Bruno, Lighthouse, visual. Any failure blocks deploy.
- One OpenAPI spec, served from `/api/openapi`, feeds Scalar docs, Bruno mock env, Prism mock server, and any future SDK generator. Zero duplicate contracts.
- Zod used in three places (runtime validation, OpenAPI spec, type inference for handlers). Add or change a field once.
- Clean backfill path: when the project ever needs SDK generation or mock-driven contract tests, Prism and `openapi.json` are already there.

### What this costs

- Initial wiring is non-trivial: Zod schemas, OpenAPI registry, Scalar route, Prism script, Bruno folder, integration config, multiple CI jobs. `/ro:new-tanstack-app` absorbs this into the scaffold.
- Integration tests against live upstreams can flake. Mitigated by `retry: 1` + a separate CI job that fails loudly but doesn't block the whole suite.
- Bruno assertions are tuned for real-API responses; they won't pass against Prism's schema examples without a parallel shape-only variant. Accept that `test:api:mock` is deliberately absent.

## References

- Implementation landed across PR #11 (testing stack) and PR #16 (Prism mock server) on this repo.
- Reference implementation for the `/ro:new-tanstack-app` skill.
- Related llm-wiki concept: `api-spec-and-testing-tanstack-start` in `llm-wiki-research`.
