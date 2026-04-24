# ADR 0002: GitHub workflow hygiene (branch protection, squash merges, commit conventions, hooks)

- **Status**: Accepted
- **Date**: 2026-04-25
- **Context**: this repo is the reference implementation for Ronan's future TanStack Start + Cloudflare Workers projects. Decisions recorded here are meant to be copied into new projects by `/ro:new-tanstack-app`.

## Context

Before this session:

- `main` was unprotected. Any push landed directly. CI could fail and nobody was stopped.
- Merge strategy was mixed: some PRs squash-merged, some landed as merge commits. Main's history was inconsistent.
- No commit-message validation. Emoji + conventional format was documented in `CLAUDE.md` but not enforced, so drift was inevitable.
- Formatting was checked in CI (`prettier --check`), but there was no pre-commit formatting hook. Drift between local and CI was common.
- Hooks lived in `.githooks/` (custom path) with a lone `pre-push` quality-check. Fine, but didn't match the convention the rest of Ronan's projects are converging on (husky).

Goal: lock in one coherent GitHub workflow pattern that other new projects can adopt verbatim.

## Decision

Four changes, one story.

### 1. Branch protection on `main` (classic protection rules)

Applied via `PUT /repos/:owner/:repo/branches/main/protection`:

- `required_status_checks.strict: true` — PR branch must be up to date with `main` before merging.
- `required_status_checks.contexts`: the 8 non-deploy CI jobs:
  - Quality checks (format + lint + build + test)
  - Playwright e2e
  - Integration tests (real external APIs)
  - API contract (Bruno)
  - Playwright visual diff
  - Accessibility + performance budget
  - Secret scan (gitleaks + trufflehog)
  - Dependency audit (pnpm)
- `enforce_admins: true` — rules apply to the repo owner too. The point of protection is to catch your own mistakes.
- `required_linear_history: true` — no merge commits on main.
- `allow_force_pushes: false`, `allow_deletions: false` — main can't be rewritten or deleted.
- `required_pull_request_reviews: null` — solo repo, requiring a reviewer would break the flow.

### 2. Squash-only merges at the repo level

Applied via `PATCH /repos/:owner/:repo`:

- `allow_squash_merge: true`
- `allow_merge_commit: false`
- `allow_rebase_merge: false`
- `delete_branch_on_merge: true`
- `squash_merge_commit_title: PR_TITLE` — main's log shows the PR title verbatim.
- `squash_merge_commit_message: PR_BODY` — PR body becomes the commit body, so context travels with the commit.

### 3. Commit message enforcement (commitlint)

- Format: `<emoji> <type>(<scope>)?: <subject>` per `CLAUDE.md`.
- Enforced locally via `commitlint.config.mjs` + a `commit-msg` git hook.
- Custom parser-preset + two custom rules:
  - `emoji-allowed` — must be one of the 10 mapped emojis.
  - `emoji-type-matches` — emoji must match its canonical type (✨ ↔ feat, 🐛 ↔ fix, etc.).
- `type-enum` restricted to the 10 types in the map.
- Ignores: merge commits, reverts, `fixup!`/`squash!` prefixes.

### 4. Hooks via husky + lint-staged

- Migrated from custom `.githooks/` to `.husky/`. Matches the convention the rest of the new-project stack uses.
- `pre-commit`: `pnpm exec lint-staged` → `prettier --write` on staged files. Eliminates the class of "CI fails on formatting" PRs.
- `commit-msg`: `pnpm exec commitlint --edit "$1"`.
- `pre-push`: existing `pnpm quality-checks` (format + lint + build + test + audit). Can be bypassed with `SKIP_QUALITY_CHECKS=1 git push --no-verify` for true emergencies.
- `prepare` script is now `husky` (bootstraps `.husky/_/` on `pnpm install`).
- New `format:write` script (`prettier --write .`) for one-shot repo-wide formatting. Intended as the "set the baseline once, then let the hook keep you there" command.

## Why squash-only

Surveyed the shape of recent `main` history across 18 flagship TS/JS projects (commits ending in `(#NNN)` with one parent = squash; two-parent "Merge pull request #N" = merge commit):

| Strategy                  | Projects                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Squash only** (14)      | TypeScript, next.js, React, Vite, Astro, Svelte, tRPC, Prettier, ESLint, Playwright, TanStack Query, TailwindCSS, Vue core, Hono |
| Mostly squash, some merge | vscode, create-t3-app                                                                                                            |
| Mixed / inconsistent      | drizzle-orm, shadcn-ui                                                                                                           |

The ecosystem has converged. The only projects still using merge commits are the less disciplined outliers. For a solo portfolio project, squash-only gives:

- One PR, one commit, one revert. `git revert <sha>` undoes a whole feature.
- `git bisect` on main always lands on a reviewed unit, not a WIP commit.
- Cleaner release notes: `git log main --oneline` reads as a changelog.
- Stacked PR tools (Graphite, git-town, ghstack, spr) all assume this model.

Trade-off: the intermediate commits on a PR branch get flattened into one. That's fine — GitHub keeps them on the PR page forever. Main doesn't need to relitigate the process.

## Stacked PRs under this model

Squash + linear history doesn't break stacked PRs, but it changes the rebase step. When PR A squash-merges, its original commits are replaced by a new single commit with a different SHA. Any branch B built on A now has A's old commits in its history. Fix:

```sh
git checkout branch-b
git fetch origin
git rebase origin/main
git push --force-with-lease
```

Git drops A's commits (same content is now in main via the squash) and replays only B's. Feature branches are still allowed to be force-pushed — protection only applies to `main`.

Codified as the `/ro:stacked-prs` skill so the workflow is one command, not a remembered recipe.

## Decisions rejected

### No required PR review

Solo repo. Requiring an approval would mean creating a second GitHub identity or leaving every PR stuck waiting for a review that's never coming. If a second contributor ever joins, revisit.

### No admin bypass

The escape hatch is `git push --no-verify` (pre-push) or a manual `git commit --no-verify` (commit-msg), both of which are local and intentional. A branch-protection-level admin bypass makes it too easy to land something that skipped CI at 2am.

### No merge-commit option kept "just in case"

Keeping merge commits enabled as a rarely-used option means one day someone picks it by accident from the GitHub dropdown and main history diverges. Disable it outright.

### No rebase-merge

Rebase-merge replays every PR commit onto main. Main then gets every WIP / "fix typo" commit from the PR. All the squash-merge benefits are lost. If a stacked PR workflow needs rebase semantics, it can do it client-side via `git rebase`.

### Commitlint: strict emoji+type over loose conventional

`@commitlint/config-conventional` would be easier to set up but doesn't enforce the emoji requirement that's already documented in `CLAUDE.md`. Half-enforcing a convention is worse than not enforcing it: it legitimises the drift. Going strict matches the `CLAUDE.md` rule exactly.

### CI job to validate PR titles: deferred

Since squash-merge uses `PR_TITLE` as the commit message on main, an invalid PR title would pollute main. Could add a GitHub Action to run commitlint on `pull_request.title`. Not added yet because: (a) the local hook already catches Ronan's own commits before they become PR titles, (b) dependabot and other bots produce non-compliant titles that would need a big allowlist. Add when the cost of bad PR titles outweighs the setup cost.

### `strict: true` on required status checks

Adds friction: B must rebase onto current main to merge. For a low-PR-velocity project this is cheap and worth it (prevents merging stale branches whose checks no longer reflect what main looks like). Drop if it ever becomes painful.

## Consequences

### What this gives us

- Main is a clean, single-parent log where every commit is a reviewed PR with all checks green.
- Commits have a predictable emoji+type format so tooling (changelog generators, release-please-style automation) can parse them later.
- Local commits that would fail CI formatting now can't happen: prettier auto-fixes staged files on commit.
- Onboarding a future collaborator is "`git clone` + `pnpm install`" — husky's `prepare` script wires the hooks, no manual `git config` dance.

### What this costs

- Adds `@commitlint/cli`, `husky`, `lint-staged` as devDependencies. ~5MB install footprint, no runtime cost.
- Local commits are slightly slower (~200ms for commitlint, ~300ms for lint-staged on a typical PR's staged files).
- First-time setup for a contributor who skips `pnpm install` and tries to commit: hooks won't fire. Documented in README.
- Non-emergency `--no-verify` becomes a red flag in PR review. Anyone using it should have a reason and mention it.

## References

- Implementation landed in this session (2026-04-25).
- Sibling skills: `/ro:stacked-prs` (the stacked-PR rebase workflow), `/ro:gh-ship` (branch-to-merge-to-deploy flow). Both assume this protection + squash model.
- Reference implementation for `/ro:new-tanstack-app` step 5 (code hygiene) and a new step 16 (GitHub branch protection).
- Related llm-wiki concept: `github-repo-hygiene` in `llm-wiki-research`.
