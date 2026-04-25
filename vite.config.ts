import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { readFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Inline binary files as ArrayBuffer. Lets server code bundle font bytes
// directly (e.g. /api/og inlining Inter-*.ttf) without needing a network
// fetch at runtime — workers can't fetch their own origin reliably.
function arrayBufferLoader(): Plugin {
  const SUFFIX = '?arraybuffer'
  return {
    name: 'arraybuffer-loader',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!source.endsWith(SUFFIX)) return
      const bare = source.slice(0, -SUFFIX.length)
      const resolved = await this.resolve(bare, importer, { skipSelf: true })
      if (resolved) return resolved.id + SUFFIX
    },
    async load(id) {
      if (!id.endsWith(SUFFIX)) return
      const file = id.slice(0, -SUFFIX.length)
      const bytes = await readFile(file)
      const encoded = bytes.toString('base64')
      return `
        const base64 = ${JSON.stringify(encoded)};
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        export default bytes.buffer;
      `
    },
  }
}

const release = (() => {
  if (process.env.VITE_RELEASE) return process.env.VITE_RELEASE
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
})()

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const sentryPlugin = sentryAuthToken
  ? sentryVitePlugin({
      org: process.env.SENTRY_ORG ?? 'ronan-connolly',
      project: process.env.SENTRY_PROJECT ?? 'connections-helper',
      authToken: sentryAuthToken,
      url: process.env.SENTRY_REGION_URL ?? 'https://de.sentry.io',
      release: { name: release },
      sourcemaps: {
        filesToDeleteAfterUpload: ['**/*.map'],
      },
    })
  : null

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  define: {
    __APP_RELEASE__: JSON.stringify(release),
  },
  build: { sourcemap: true },
  plugins: [
    arrayBufferLoader(),
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    ...(sentryPlugin ? [sentryPlugin] : []),
  ],
})

export default config
