import { createFileRoute, ClientOnly } from '@tanstack/react-router'
import App from '../App'
import { Sentry } from '../lib/sentry'

export const Route = createFileRoute('/')({ component: Home })

function ErrorFallback({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-3">
        <div className="text-4xl">🧩💥</div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground break-words">{message}</p>
        <button
          className="px-4 py-2 rounded-md border text-sm"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    </div>
  )
}

function Home() {
  return (
    <ClientOnly fallback={<div className="p-8 text-slate-500">Loading…</div>}>
      <Sentry.ErrorBoundary
        fallback={({ error }) => <ErrorFallback error={error} />}
        onError={(error) => {
          console.error('[sentry] ErrorBoundary caught', error)
        }}
      >
        <App />
      </Sentry.ErrorBoundary>
    </ClientOnly>
  )
}
