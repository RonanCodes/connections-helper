import * as Sentry from '@sentry/react'

let initialised = false

export function initSentry() {
  if (initialised || typeof window === 'undefined') return
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn || !dsn.startsWith('https://')) {
    return
  }
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    environment: import.meta.env.MODE,
  })
  initialised = true
}

export { Sentry }
