# ADR 0003: k6 ad-hoc load testing

- **Status**: Accepted
- **Date**: 2026-04-25
- **Context**: Phase-3 launch plan ([`launch-plan-connections-helper`](../../../llm-wiki/vaults/llm-wiki-side-projects/wiki/concepts/launch-plan-connections-helper.md)) requires a 100-concurrent-user load test against `/api/*` before Product Hunt traffic arrives. Rate limiter shipped in 2026-04-24 but its under-load behaviour is unverified. CI does not currently exercise concurrency.

## Context

The app sits on Cloudflare Workers + D1 with an `API_RATE_LIMIT` Workers binding scoped per IP per route. Four hot endpoints with very different profiles:

| Endpoint                    | Cost                                                 | Limited                   |
| --------------------------- | ---------------------------------------------------- | ------------------------- |
| `GET /api/stats`            | 2 D1 count(\*) queries                               | No                        |
| `GET /api/puzzle/:date`     | D1 read; cold path fetches NYT                       | No                        |
| `GET /api/definition/:word` | D1 read + Workers cache + 5-source waterfall on miss | Yes (`definition` scope)  |
| `POST /api/definitions`     | Batch of the above, parallelised                     | Yes (`definitions` scope) |

Failure modes we want surfaced before launch:

1. D1 query plan degradation under concurrent reads (cold cache after deploy).
2. Workers isolate exhaustion / sub-request timeouts on the definition waterfall.
3. Rate-limiter false positives (legitimate users blocked) and false negatives (limiter doesn't engage).
4. NYT origin throttling on the cold-puzzle path.

Functional tests (Vitest, Playwright, Bruno) cover correctness at 1 RPS. None of them produce concurrency.

## Decision

Adopt **[k6](https://k6.io)** (Grafana Labs, Apache 2.0) as the ad-hoc load tester. Single script at `scripts/loadtest.js`; four `pnpm loadtest:*` profiles. Not in CI.

### Why k6 over the alternatives

| Tool                     | Verdict     | Reason                                                                                                                                                  |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **k6**                   | ✅ Chosen   | JS-scripted scenarios, built-in thresholds, custom metrics, SSE/WS support, stable since 2019. Fits a multi-endpoint mix with per-endpoint p95 budgets. |
| autocannon               | ❌          | `npx`-runnable but hammers one URL at a time; no built-in scenario weights. Good for spot-checking a single endpoint, not a launch readiness check.     |
| Artillery                | ❌          | Roughly equivalent feature set, but YAML-config and the JS-extension story is uglier. k6 is now the de-facto open-source standard.                      |
| wrk / hey                | ❌          | Single-URL hammers. Same problem as autocannon.                                                                                                         |
| Playwright `concurrency` | ❌          | Browser load. Way too heavy per VU; can't drive 100 concurrent connections from one machine.                                                            |
| k6 Cloud                 | ⚠️ Optional | Useful when we need multi-region egress IPs to stress past the per-IP limiter. Not the default.                                                         |

### Profile shape

Three profiles, switchable via `PROFILE` env var:

- **`smoke`** — 5 VUs / 35s. Sanity check that the script runs and the deployment is alive. Use after every deploy.
- **`standard`** — ramp 0→100 VUs over 30s, hold 100 for 60s, ramp down 30s. The 100-concurrent baseline from the launch plan.
- **`burst`** — ramp 0→200 VUs over 10s, hold 200 for 30s, ramp down 10s. Headroom test for PH-day spikes.

A 4th `chat`-style profile (low-VU long-duration) is documented in the ai-agent-stack research note but does not apply here — connections-helper has no streaming endpoints.

### Traffic mix

Weighted to roughly match real sessions, derived from PostHog event counts:

| Endpoint                             | Weight | Tag                    |
| ------------------------------------ | ------ | ---------------------- |
| `GET /api/stats`                     | 10%    | `endpoint:stats`       |
| `GET /api/puzzle/:date`              | 30%    | `endpoint:puzzle`      |
| `GET /api/definition/:word`          | 40%    | `endpoint:definition`  |
| `POST /api/definitions` (batch of 8) | 20%    | `endpoint:definitions` |

Per-endpoint p95 thresholds matching the cost profile (stats < 300ms, puzzle < 500ms, definition < 1500ms, definitions < 2000ms). The run exits non-zero if any threshold breaks.

### Rate-limiter handling

`/api/definition/*` and `/api/definitions` are limited per IP. From a single egress, 100 VUs hit the limit in seconds. This is **expected behaviour**, not a bug — the limiter is supposed to engage.

To keep this honest:

- Track `rate_limited` (429) as a separate Rate metric. It counts toward visibility but **not** toward the failure rate.
- The failure-rate threshold (`http_req_failed: rate<0.02`) only counts non-429 failures.
- A separate threshold (`rate_limited: rate<0.5`) flags when the limiter engages so aggressively that the test can't drive useful load — that's the signal to scale egress.
- Local runs bypass the limiter (the binding is unset on `localhost`), so `loadtest:local` measures raw throughput.
- For prod runs that need to stress past the limiter (e.g. simulating 100 unique-IP users), use k6 Cloud or a GH Actions matrix with multiple runners. Faking `CF-Connecting-IP` from outside Cloudflare doesn't work — the edge overwrites it.

### Output

- Stdout summary: total requests, failure rate, rate-limited rate, p50 / p95 / p99.
- `loadtest-summary.json` next to the script (gitignored, regenerated each run) for full per-tag breakdown.
- No CI integration, no PostHog / Sentry hookup. Ad-hoc by design.

### What lives in CI

Nothing k6-related. Reasons:

1. k6 is a system binary (`brew install k6`) — installing in every Action multiplies setup time across `e2e`, `integration`, `api-contract`, `deploy`.
2. Hammering prod on every push is bad citizenship, hammering localhost in CI is a bad signal (Workers dev is single-isolate; results don't predict prod).
3. The launch-readiness question is answered once per launch, not on every commit.

If we later want continuous load testing, run it on a cron schedule from a separate `.github/workflows/loadtest.yml` against staging — not in the main CI gate.

## Consequences

### Good

- Pre-launch perf risk has a concrete, reproducible answer.
- `pnpm loadtest:smoke` is cheap enough to run after every deploy and catches regressions in the rate limiter or D1 query plan.
- The script doubles as a regression spec — when we change endpoint shapes, the load test breaks loudly.
- Pattern transfers to future apps via `/ro:testing-stack install` (Layer 7), which scaffolds the same template.

### Bad

- Requires a one-time `brew install k6` for every contributor.
- Single-machine prod runs hit per-IP rate limits — full headroom validation needs k6 Cloud or multi-runner egress, which isn't free / set up.
- Ad-hoc means easy to forget. Tied to the launch plan checklist as a mitigation.

### Neutral

- Sample word + date lists in the script are static. Sufficient for load — a real cache-bust scenario would randomise dates outside the warmed range, which is a future improvement if D1 cold-path latency becomes the bottleneck.

## References

- [k6 docs](https://k6.io/docs/)
- ADR 0001: Testing and API-docs stack — k6 sits orthogonal to the six functional layers there.
- `launch-plan-connections-helper` v3 — the launch checklist that triggered this ADR.
- Research note: `[research:ai-agent-stack](obsidian://open?vault=llm-wiki-research&file=wiki%2Fconcepts%2Fai-agent-stack)` — Layer 6 covers k6 as a default in the canonical stack.
- `/ro:testing-stack` SKILL.md — Layer 7 scaffolds the same template into new apps.
