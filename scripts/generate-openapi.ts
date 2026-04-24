/**
 * Dump the OpenAPI 3.1 document to openapi.json at repo root.
 *
 * Needed so Prism can serve mocks without a running dev server (the whole point
 * of the mock workflow: backend down, frontend still works).
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildOpenApiDocument } from '../src/server/openapi'

const doc = buildOpenApiDocument({
  servers: [{ url: 'http://localhost:4010', description: 'Prism mock' }],
})

const out = resolve(import.meta.dirname, '..', 'openapi.json')
writeFileSync(out, JSON.stringify(doc, null, 2) + '\n')
console.log(`Wrote ${out}`)
