export type RuntimeConfig = {
  sentryDsn: string
  posthogKey: string
  posthogHost: string
}

let cached: Promise<RuntimeConfig> | null = null

export function getRuntimeConfig(): Promise<RuntimeConfig> {
  if (!cached) {
    cached = fetch('/api/config')
      .then((r) => r.json())
      .catch(() => ({
        sentryDsn: '',
        posthogKey: '',
        posthogHost: 'https://eu.i.posthog.com',
      }))
  }
  return cached
}
