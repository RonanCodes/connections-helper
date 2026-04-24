import { createFileRoute } from '@tanstack/react-router'
import { buildOpenApiDocument } from '../../server/openapi'

// One document per origin, built on first hit and memoised. Dev and prod
// hits produce different server URLs, so keying by origin avoids CORS issues
// when Scalar's "Try it" fires from a mismatched host.
const cache = new Map<string, unknown>()

function docFor(origin: string) {
  let doc = cache.get(origin)
  if (!doc) {
    doc = buildOpenApiDocument({ servers: [{ url: origin }] })
    cache.set(origin, doc)
  }
  return doc
}

export const Route = createFileRoute('/api/openapi')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin
        return Response.json(docFor(origin), {
          headers: {
            'cache-control': 'public, max-age=300, s-maxage=300',
          },
        })
      },
    },
  },
})
