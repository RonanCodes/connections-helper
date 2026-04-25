import posthog from 'posthog-js'
import { getRuntimeConfig } from './runtime-config'

let initialised = false

const TEST_USER_FLAG = 'ch_test_user'
const TEST_USER_ID = 'test-user'

function consumeTestUserQuery() {
  const url = new URL(window.location.href)
  if (url.searchParams.get('testuser') !== '1') return
  window.localStorage.setItem(TEST_USER_FLAG, '1')
  url.searchParams.delete('testuser')
  window.history.replaceState({}, '', url.toString())
}

// Max-data config. Project has no auth and no PII — anything a visitor types
// into the page is already public (puzzle words). When auth is added, flip
// `maskAllInputs` back to true and narrow `session_recording.recordBody`.
export async function initPostHog() {
  if (initialised || typeof window === 'undefined') return
  const { posthogKey, posthogHost } = await getRuntimeConfig()
  if (!posthogKey.startsWith('phc_')) return
  consumeTestUserQuery()
  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: false,
      recordCrossOriginIframes: true,
    },
    enable_heatmaps: true,
    capture_performance: true,
    capture_exceptions: true,
  })
  if (window.localStorage.getItem(TEST_USER_FLAG) === '1') {
    posthog.identify(TEST_USER_ID, { $is_test_user: true })
  }
  initialised = true
}

export { posthog }

/**
 * Type-safe wrapper around posthog.capture. No-op until init resolves, so
 * handlers can fire events unconditionally without null-checking.
 */
export function track<TEvent extends keyof EventPayloads>(
  event: TEvent,
  ...props: EventPayloads[TEvent] extends undefined
    ? []
    : [EventPayloads[TEvent]]
): void {
  if (typeof window === 'undefined') return
  posthog.capture(event, props[0] as Record<string, unknown> | undefined)
}

export interface EventPayloads {
  share: {
    channel: 'x' | 'reddit' | 'whatsapp' | 'copy' | 'native'
    puzzle_id: number | null
    puzzle_date: string
  }
  hint_revealed: {
    puzzle_id: number | null
    puzzle_date: string
    category_index: number
  }
  category_revealed: {
    puzzle_id: number | null
    puzzle_date: string
    category_index: number
  }
  source_toggled: {
    puzzle_id: number | null
    puzzle_date: string
    word: string
    source: string
  }
  date_changed: {
    from: string
    to: string
    direction: 'prev' | 'next' | 'picker' | 'today'
  }
  puzzle_loaded: {
    puzzle_id: number | null
    puzzle_date: string
    cached: boolean
  }
  settings_opened: undefined
  theme_changed: { theme: string }
  cta_clicked: {
    cta: string
    location: string
  }
}
