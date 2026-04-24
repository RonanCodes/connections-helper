import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { readFile } from 'node:fs/promises'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

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

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    arrayBufferLoader(),
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
