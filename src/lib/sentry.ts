import * as Sentry from '@sentry/react'
import { getRuntimeConfig } from './runtime-config'

let initialised = false
let initPromise: Promise<boolean> | null = null

export function initSentry(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const { sentryDsn } = await getRuntimeConfig()
      if (!sentryDsn || !sentryDsn.startsWith('https://')) {
        console.warn(
          '[sentry] init skipped: DSN missing or invalid (runtime-config fetch may have been blocked)',
        )
        return false
      }
      Sentry.init({
        dsn: sentryDsn,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1,
        environment: import.meta.env.MODE,
      })
      initialised = true
      console.info('[sentry] initialised', {
        environment: import.meta.env.MODE,
      })
      return true
    } catch (err) {
      console.error('[sentry] init failed', err)
      return false
    }
  })()

  return initPromise
}

export function isSentryReady() {
  return initialised
}

if (typeof window !== 'undefined') {
  initSentry()
  window.addEventListener('error', (e) => {
    console.error('[sentry] window.error', e.message, e.error)
  })
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[sentry] unhandledrejection', e.reason)
  })
}

export { Sentry }
