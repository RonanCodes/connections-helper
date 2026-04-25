import type * as SentryReact from '@sentry/react'
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
          Sentry.feedbackIntegration({
            colorScheme: 'system',
            showBranding: false,
          }),
        ],
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1,
      })
      initialised = true
      void linkPostHog(Sentry)
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

// Tag every Sentry event with the PostHog distinct_id and a deep link to the
// session replay. Lets you pivot from a Sentry issue straight to "what was
// this user doing right before it broke" in PostHog.
async function linkPostHog(Sentry: typeof SentryReact): Promise<void> {
  try {
    const { initPostHog, posthog } = await import('./posthog')
    await initPostHog()
    const distinctId =
      typeof posthog.get_distinct_id === 'function'
        ? posthog.get_distinct_id()
        : null
    if (distinctId) Sentry.setUser({ id: distinctId })
    const sessionUrl =
      typeof posthog.get_session_replay_url === 'function'
        ? posthog.get_session_replay_url()
        : null
    if (sessionUrl) Sentry.setTag('posthog.session_url', sessionUrl)
  } catch (err) {
    console.warn('[sentry] posthog cross-link skipped', err)
  }
}
