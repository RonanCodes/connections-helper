import { createFileRoute, ClientOnly } from '@tanstack/react-router'
import App from '../App'
import { ErrorBoundary } from '../lib/error-boundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const SITE_ORIGIN = 'https://connectionshelper.app'

export const Route = createFileRoute('/')({
  component: Home,
  validateSearch: (search: Record<string, unknown>) => {
    const raw = typeof search.date === 'string' ? search.date : undefined
    const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined
    return { date }
  },
  head: ({ match }) => {
    const date = (match.search as { date?: string } | undefined)?.date
    if (!date) return {}
    const title = `Connections for ${date}`
    const ogImage = `${SITE_ORIGIN}/api/og?date=${date}&title=${encodeURIComponent(title)}`
    const url = `${SITE_ORIGIN}/?date=${date}`
    return {
      meta: [
        { property: 'og:title', content: title },
        { property: 'og:url', content: url },
        { property: 'og:image', content: ogImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:image', content: ogImage },
      ],
      links: [{ rel: 'canonical', href: url }],
    }
  },
})

function ErrorFallback({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-3">
        <div className="text-4xl">🧩💥</div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground break-words">{message}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
        <div className="flex justify-between items-center mb-4 min-h-9">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <Card
              key={i}
              className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2"
              style={{
                animationDelay: `${i * 30}ms`,
                animationFillMode: 'backwards',
              }}
            >
              <CardHeader className="pb-0">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col items-start gap-1">
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-4 w-14 rounded-md" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Skeleton className="h-10 w-[72px] rounded-md" />
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <Skeleton className="h-10 w-10 rounded-md" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow">
                <div className="space-y-2 flex-grow">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function Home() {
  return (
    <ClientOnly fallback={<LoadingFallback />}>
      <ErrorBoundary
        fallback={({ error }) => <ErrorFallback error={error} />}
        onError={(error) => {
          console.error('[sentry] ErrorBoundary caught', error)
        }}
      >
        <App />
      </ErrorBoundary>
    </ClientOnly>
  )
}
