import posthog from 'posthog-js'

let initialised = false

export function initPostHog() {
  if (initialised || typeof window === 'undefined') return
  const key = import.meta.env.VITE_POSTHOG_PROJECT_API_KEY as
    | string
    | undefined
  if (!key || !key.startsWith('phc_')) {
    return
  }
  posthog.init(key, {
    api_host:
      (import.meta.env.VITE_POSTHOG_INGEST_HOST as string | undefined) ??
      'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  })
  initialised = true
}

export { posthog }
