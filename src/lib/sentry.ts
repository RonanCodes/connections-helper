import * as Sentry from '@sentry/react'
import { getRuntimeConfig } from './runtime-config'

let initialised = false

export async function initSentry() {
  if (initialised || typeof window === 'undefined') return
  const { sentryDsn } = await getRuntimeConfig()
  if (!sentryDsn.startsWith('https://')) return
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    environment: import.meta.env.MODE,
  })
  initialised = true
}

export { Sentry }
