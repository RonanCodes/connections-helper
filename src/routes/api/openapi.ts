import { createFileRoute } from '@tanstack/react-router'
import { buildOpenApiDocument } from '../../server/openapi'

const document = buildOpenApiDocument()

export const Route = createFileRoute('/api/openapi')({
  server: {
    handlers: {
      GET: () =>
        Response.json(document, {
          headers: {
            'cache-control': 'public, max-age=300, s-maxage=300',
          },
        }),
    },
  },
})
