import posthog from 'posthog-js'
import { getRuntimeConfig } from './runtime-config'

declare const __APP_RELEASE__: string

let initialised = false

const TEST_USER_FLAG = 'ch_test_user'

type TestEnv = 'localhost' | 'ci' | 'manual'

// Distinct identity per environment so PostHog can tell local dev sessions
// apart from CI runs and manual opt-ins. Emails sit under the domain that
// the project's "Internal & Test Accounts" filter already excludes
// (Settings → Project → Internal & Test Accounts → "Email doesn't contain
// @ronanconnolly.dev"), so all three are filtered out by one rule.
const TEST_USER_PROFILES: Record<
  TestEnv,
  { id: string; email: string; name: string }
> = {
  localhost: {
    id: 'test-user-localhost',
    email: 'test-user-localhost@ronanconnolly.dev',
    name: 'Test User (localhost)',
  },
  ci: {
    id: 'test-user-ci',
    email: 'test-user-ci@ronanconnolly.dev',
    name: 'Test User (CI)',
  },
  manual: {
    id: 'test-user-manual',
    email: 'test-user-manual@ronanconnolly.dev',
    name: 'Test User (manual)',
  },
}

function detectAutoTestEnv(): 'localhost' | 'ci' | null {
  if (typeof window === 'undefined') return null
  // Playwright (and other webdrivers) set navigator.webdriver = true. CI
  // runs may hit a preview URL rather than localhost, so the webdriver
  // signal is what tells the two apart. Check it before hostname.
  if (typeof navigator !== 'undefined' && navigator.webdriver === true) {
    return 'ci'
  }
  const host = window.location.hostname
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost')
  ) {
    return 'localhost'
  }
  return null
}

function resolveTestEnv(stored: string | null): TestEnv | null {
  if (stored === 'localhost' || stored === 'ci' || stored === 'manual') {
    return stored
  }
  // Pre-existing '1' flag from older builds — treat as a manual opt-in.
  if (stored) return 'manual'
  return null
}

function consumeTestUserQuery(): 'enabled' | 'disabled' | null {
  const url = new URL(window.location.href)
  const raw = url.searchParams.get('testuser')
  if (raw !== '1' && raw !== '0') return null
  url.searchParams.delete('testuser')
  window.history.replaceState({}, '', url.toString())
  if (raw === '1') {
    window.localStorage.setItem(TEST_USER_FLAG, 'manual')
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
  const autoEnv = detectAutoTestEnv()
  // Auto-enable the test-user flag for localhost browsers and automated
  // runs. ?testuser=0 takes precedence and persists for the current load.
  if (autoEnv && testUserChange !== 'disabled') {
    window.localStorage.setItem(TEST_USER_FLAG, autoEnv)
  }
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
  // Stamp every event with the build SHA. Lets insights compare event
  // volume / error rates across releases without joining $session metadata.
  const release = typeof __APP_RELEASE__ === 'string' ? __APP_RELEASE__ : 'dev'
  posthog.register({ app_release: release })
  const env = resolveTestEnv(window.localStorage.getItem(TEST_USER_FLAG))
  if (env) {
    const profile = TEST_USER_PROFILES[env]
    posthog.identify(profile.id, {
      email: profile.email,
      name: profile.name,
      $is_test_user: true,
      test_env: env,
    })
    // Surfaces on every event, not just $identify, so filters and insights
    // can slice by env without joining person properties.
    posthog.register({ test_env: env })
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
