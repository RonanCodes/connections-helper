import posthog from 'posthog-js'
import { getRuntimeConfig } from './runtime-config'

let initialised = false

const TEST_USER_FLAG = 'ch_test_user'
const TEST_USER_ID = 'test-user'

function consumeTestUserQuery(): 'enabled' | 'disabled' | null {
  const url = new URL(window.location.href)
  const raw = url.searchParams.get('testuser')
  if (raw !== '1' && raw !== '0') return null
  url.searchParams.delete('testuser')
  window.history.replaceState({}, '', url.toString())
  if (raw === '1') {
    window.localStorage.setItem(TEST_USER_FLAG, '1')
    return 'enabled'
  }
  window.localStorage.removeItem(TEST_USER_FLAG)
  return 'disabled'
}

// Max-data config. Project has no auth and no PII — anything a visitor types
// into the page is already public (puzzle words). When auth is added, flip
// `maskAllInputs` back to true and narrow `session_recording.recordBody`.
export async function initPostHog() {
  if (initialised || typeof window === 'undefined') return
  // Consume ?testuser=1|0 BEFORE the PostHog gate. The flag has to work even
  // when runtime-config is blocked (local dev without secrets, ad-blockers
  // killing the request) so future loads can identify once PH does init.
  const testUserChange = consumeTestUserQuery()
  const { posthogKey, posthogHost } = await getRuntimeConfig()
  if (!posthogKey.startsWith('phc_')) return
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
  if (testUserChange === 'disabled') {
    // Break the current session's identified cookie so the user goes back
    // to anonymous immediately, not only after the cookie expires.
    posthog.reset()
  }
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
