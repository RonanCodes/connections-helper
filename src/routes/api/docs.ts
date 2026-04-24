import { createFileRoute } from '@tanstack/react-router'

const html = `<!doctype html>
<html>
  <head>
    <title>Connections Helper API</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/openapi"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.52.6"></script>
  </body>
</html>
`

export const Route = createFileRoute('/api/docs')({
  server: {
    handlers: {
      GET: () =>
        new Response(html, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        }),
    },
  },
})
