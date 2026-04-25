import { getRuntimeConfig } from './runtime-config'

declare const __APP_RELEASE__: string

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
      const Sentry = await import('@sentry/react')
      Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.MODE,
        release:
          typeof __APP_RELEASE__ === 'string' ? __APP_RELEASE__ : undefined,
        sendDefaultPii: true,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllInputs: true,
            blockAllMedia: false,
          }),
        ],
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1,
      })
      initialised = true
      console.info('[sentry] initialised', {
        environment: import.meta.env.MODE,
        release: typeof __APP_RELEASE__ === 'string' ? __APP_RELEASE__ : null,
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
