import posthog from 'posthog-js'
import { getRuntimeConfig } from './runtime-config'

let initialised = false

export async function initPostHog() {
  if (initialised || typeof window === 'undefined') return
  const { posthogKey, posthogHost } = await getRuntimeConfig()
  if (!posthogKey.startsWith('phc_')) return
  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  })
  initialised = true
}

export { posthog }
