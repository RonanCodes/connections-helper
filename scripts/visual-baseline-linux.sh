#!/usr/bin/env bash
# Regenerate Linux visual baselines using the official Playwright Docker image.
#
# Run this after any visual change so CI (which runs on ubuntu-latest) has
# *-chromium-linux.png baselines alongside the macOS *-chromium-darwin.png set.
# The Playwright image tag is pinned to whatever @playwright/test version the
# repo is on, so the browser + OS combination matches the CI runner.
#
# Requirements:
#   - Docker Desktop running
#   - @playwright/test installed (i.e. pnpm install has been run)

set -euo pipefail

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is not running. Start Docker Desktop and retry." >&2
  exit 1
fi

if [ ! -f node_modules/@playwright/test/package.json ]; then
  echo "Error: @playwright/test not installed. Run 'pnpm install' first." >&2
  exit 1
fi

PW_VERSION=$(node -p "require('./node_modules/@playwright/test/package.json').version")
IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}-noble"

echo "==> Using Playwright image: ${IMAGE}"
echo "==> Regenerating Linux baselines..."
echo "    - repo mounted read-write at /work"
echo "    - /work/node_modules is a named volume (host node_modules untouched)"
echo "    - /work/.wrangler is a tmpfs overlay (host .wrangler untouched, container sees empty D1 so state matches CI)"

docker run --rm \
  -v "${PWD}":/work \
  -v playwright-baseline-node-modules:/work/node_modules \
  --mount type=tmpfs,destination=/work/.wrangler \
  -w /work \
  --ipc=host \
  -e CI=1 \
  "${IMAGE}" \
  bash -c '
    set -euo pipefail
    corepack enable
    pnpm install --frozen-lockfile
    pnpm db:migrate:local
    pnpm test:visual:update
  '

echo "==> Done. New baselines:"
ls -1 e2e/visual.spec.ts-snapshots/*-chromium-linux.png 2>/dev/null || {
  echo "No *-chromium-linux.png files were produced. Something went wrong." >&2
  exit 1
}

echo
echo "==> Next steps:"
echo "    git add e2e/visual.spec.ts-snapshots/"
echo "    git commit -m '🧪 test: refresh Linux visual baselines'"
