## Codebase Patterns (connections-helper)

This is the durable knowledge surface for the local factory running on this repo. Read at every iteration start; the orchestrator harvests new learnings into this file at session close. Worker-scratch files under `.ralph/sessions/` are ephemeral.

### Local factory hooks

- This repo participates in the **local factory** (`/ro:ralph`, `/ro:planner-worker`, `/ro:matt-pocock-coding-workflow`, `/ro:night-shift`, `/ro:day-shift`). See `~/Dev/ronan-skills/skills/ralph/SKILL.md` § "Run artefacts (the canonical shape)".
- Artefact shape:
  - `.ralph/patterns.md` (this file), committed, durable, harvested at session close.
  - `.ralph/<phase>.session.md`, committed, per-session aggregate.
  - `.ralph/sessions/<session-id>/<worker-id>.md`, gitignored worker scratch.
  - `.ralph/<phase>.json` (PRD), committed.
- The companion **remote factory** is the Factory app (tracked separately) that will run equivalent loops as a cloud service.

### Stack snapshot

- TanStack Start on Cloudflare Workers with D1 + Drizzle.
- Routes are file-based under `src/routes/`.
- API routes in `src/routes/api/` use `createFileRoute` with `server.handlers.GET/POST`.
- Production origin is `https://connectionshelper.app` (from `wrangler.jsonc` `custom_domain` routes).
- File-routes with literal dots use the `[.]` escape: `src/routes/sitemap[.]xml.ts` produces `/sitemap.xml`.
- Route tree is auto-generated at `src/routeTree.gen.ts`, inspect it to confirm new routes registered.
- PostHog is wired via `src/lib/posthog.ts` with a typed `track()` wrapper + `EventPayloads` union. Keep new event payloads minimal so multiple callers can reuse the same handle (see `cta_clicked: { cta, location }`).

### TanStack Start head() and routing

- Route-level `head()` overrides merge with root head; only override what's route-specific (title, description, url, canonical). Leave charset, viewport, og:type, twitter:card inherited from `__root.tsx`.
- `head({ match })` can read `match.search`, but you must declare `validateSearch` to get a typed search object. A cast is still required because TS doesn't flow the validator's return type into `match.search` at `head()` call time.
- Return `{}` from `head()` when there's nothing to override, TanStack merges partial head results so the root tags still apply.
- TanStack Start head API for inline scripts: `scripts: [{ type, children }]` where `children` is the stringified content (e.g. JSON-LD).
- TanStack Start has no explicit client entry, client-only effects (PostHog init, SW registration, install prompt) live inside `App.tsx` `useEffect`. Reuse that pattern for any new browser-only wiring.

### Cloudflare Workers gotchas

- workerd blocks `WebAssembly.instantiate(bytes)` (dynamic code gen) in both dev and prod. The default `satori` entry hits this path. Fix: use `satori/standalone` which exposes `init(WebAssembly.Module)` so you can feed a pre-compiled module imported via vite. Same pattern applies to `@resvg/resvg-wasm`'s `initWasm()`.
- Font assets: `?url` imports return a URL string; fetching against `url.origin` works because vite dev and the CF asset pipeline both serve bundled `/src/assets/...` paths as the binary. Avoid `?arraybuffer` imports, they inline the bytes and blow up the worker bundle.
- Worker bundle size budget: CF Workers limit is 10MB compressed. Current load (resvg wasm ~2.5MB, fonts ~600KB, yoga wasm) leaves headroom but any further WASM additions need size budgeting.
- `vite preview` doesn't work for TanStack Start on CF Workers because worker handlers aren't bound. LHCI and any tool that needs `/api/*` responses must run against `pnpm dev` (wrangler + vite).

### Accessibility patterns

- `vitest-axe` + `expect.extend(axeMatchers)` is wired via `src/test/setup.ts` and `vitest.config.ts` `setupFiles`. Use `expectNoA11yViolations(container)` from `src/test/axe-helper.ts`.
- For Radix dialogs in unit tests, assert on `baseElement` not `container`, content portals outside the test container.
- `@axe-core/playwright` covers full-page a11y. It rejects unknown rule IDs with `unknown rule X in options.rules`. Only pass _rule_ IDs (e.g. `button-name`), NOT _check_ IDs (e.g. `implicit-label`) which appear inside `any: [...]` arrays on a violation.
- Baseline ratchet pattern: keep a `BASELINED_RULES` list with a comment linking each rule to its future fix story. Remove entries one at a time. CI stays useful today and drives toward zero-violation.
- Tooltip-only labelling fails axe `button-name`. `aria-label` on the button itself is required; `TooltipContent` is decorative from axe's perspective.
- React 19 lets refs be passed as plain props, no `forwardRef` dance is needed for focus-management refs.
- The `wasOpenRef` pattern (remember was-open across renders) is the cleanest way to avoid focusing the trigger on first mount. Without it, focus moves to the trigger button on initial page load, which is jarring.
- Prefer Radix primitives over hand-rolled popovers when focus matters, Radix Dialog already handles focus trap, initial focus, and focus return.
- `role="menu"` + `role="menuitem"` on a popup is correct when items _perform actions_ (copy, share). If they were nav links, `role="listbox"` or plain nav would be right. axe + NVDA both accept menu/menuitem here.

### Vitest config

- `resolve: { tsconfigPaths: true }` is a Vite 8 flag but doesn't always resolve `@/` at test-time. Add explicit `resolve.alias` for `@/*` and `#/*` in `vitest.config.ts`. Keeps vitest decoupled from the vite.config.ts plugin chain.
- `pnpm run lint` includes `public/` by default. Add `public/**` to `eslint.config.js` ignores to stop @typescript-eslint complaining about files (like `sw.js`) that aren't part of the TS project.

### Playwright

- Do NOT use `page.waitForLoadState('networkidle')` on this app, PostHog + Sentry open long-lived connections that never settle and the call times out at 30s on every test. Use `{ waitUntil: 'domcontentloaded' }` + a targeted `waitForSelector`.
- Visual regression baselines are platform-suffixed by Playwright (`-{project}-{os}.png`). macOS and Linux baselines coexist as siblings. First Linux CI run generates `-chromium-linux.png` siblings that become the CI-authoritative set; macOS PNGs stay valid for local runs.
- Animation disabling needs BOTH config (`reducedMotion: 'reduce'` + `animations: 'disabled'`) AND a runtime `addStyleTag({ content: '* { animation: none !important; transition: none !important; }' })` to catch element-scoped animations that ignore `prefers-reduced-motion`.
- Mask dynamic regions via `mask: [locator]` rather than CSS-hiding them, the masked area gets overlaid with a solid colour block so any layout shift is still visible in the diff.
- Visual tests are opt-in via `PLAYWRIGHT_VISUAL=1`; `playwright.config.js` uses `testIgnore: process.env.PLAYWRIGHT_VISUAL === '1' ? undefined : ['**/visual.spec.ts']`. This keeps the standard `e2e` CI job green on Linux without needing chromium-linux baselines yet. `pnpm test:visual` and `pnpm test:visual:update` set the flag.

### CI workflows

- `actions/upload-artifact@v4` exposes `outputs.artifact-url`, a direct download link. Use it in PR comments so reviewers don't have to hunt the Actions tab.
- `actions/github-script@v7` is the cleanest way to comment on a PR from a workflow. `permissions: pull-requests: write` is required at the job level.
- Lighthouse CI: `startServerReadyPattern` matches against stdout; vite prints `Local: http://localhost:3000/` when ready. Without this pattern LHCI falls back to polling HTTP and sometimes races.
- LHCI performance assertion should be `warn` not `error` because dev-mode builds are always slower than prod. Run a separate nightly LHCI against the deployed prod URL if you want a true perf gate.
- LHCI auto-upload target `temporary-public-storage` returns a per-report URL good for ~7 days, fine for PR reviewers. Wire `LHCI_GITHUB_APP_TOKEN` for permanent storage.

### Service worker + PWA

- Versioning via a `CACHE` const (e.g. `'conn-v1'`) is the deploy lever, bump to `'conn-v2'` to force clients to drop all old caches.
- Strategy: network-first for HTML (navigate mode or `text/html` accept) with cached `/` fallback; cache-first for static asset extensions; skip `/api/*` and non-GET.
- Maskable icon background should be the brand colour, not white, so Android adaptive masks show brand not negative space.
- `beforeinstallprompt` fires once per eligible session and only in Chromium. Expect zero renders on Safari/Firefox. Use `sessionStorage` visit-count gating so casuals don't see it on first visit, and persist dismissal to `localStorage`.

### SEO / OG / share assets

- Dynamic sitemap (TanStack route returning urlset XML) beats `public/sitemap.xml` because it reflects the last 365 days from today without redeploying.
- Use absolute URLs for `og:image` and `rel=canonical`, crawlers prefer them.
- Cap OG image query string length (e.g. 80-char title cap in `parseParams`). Twitter caches per URL so long titles create N distinct cache keys.
- GitHub blob URLs (`github.com/.../raw/...`) redirect to an HTML page when the path doesn't exist; curl follows redirects silently and you end up with a fake TTF that is actually HTML. `file <path>` is the one-second check, always run it before using a downloaded font.
