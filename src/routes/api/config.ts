import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'

export const Route = createFileRoute('/api/config')({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            sentryDsn: env.SENTRY_DSN,
            posthogKey: env.POSTHOG_PROJECT_KEY,
            posthogHost: env.POSTHOG_INGEST_HOST,
          },
          {
            headers: {
              'cache-control': 'public, max-age=300, s-maxage=300',
            },
          },
        ),
    },
  },
})
