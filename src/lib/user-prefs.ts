const PREFERRED_SOURCE_KEY = 'ch-preferred-source'
const ENABLED_SOURCES_KEY = 'ch-enabled-sources'

export const PREFERRED_SOURCE_AUTO = 'auto' as const
export const DEFAULT_PREFERRED_SOURCE = 'merriam-webster'
export const DEFAULT_ENABLED_SOURCES = [
  'merriam-webster',
  'dictionary',
  'urban',
] as const
export const MAX_ENABLED_SOURCES = 4
export type PreferredSource = string

export function getPreferredSource(): PreferredSource {
  if (typeof window === 'undefined') return DEFAULT_PREFERRED_SOURCE
  return localStorage.getItem(PREFERRED_SOURCE_KEY) ?? DEFAULT_PREFERRED_SOURCE
}

export function setPreferredSource(value: PreferredSource): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PREFERRED_SOURCE_KEY, value)
  window.dispatchEvent(new CustomEvent('ch-preferred-source-change'))
}

function defaultEnabled(allKeys: ReadonlyArray<string>): Set<string> {
  const filtered = DEFAULT_ENABLED_SOURCES.filter((k) => allKeys.includes(k))
  if (filtered.length === 0) {
    return new Set(allKeys.slice(0, MAX_ENABLED_SOURCES))
  }
  return new Set(filtered.slice(0, MAX_ENABLED_SOURCES))
}

export function getEnabledSources(allKeys: ReadonlyArray<string>): Set<string> {
  if (typeof window === 'undefined') return defaultEnabled(allKeys)
  const raw = localStorage.getItem(ENABLED_SOURCES_KEY)
  if (!raw) return defaultEnabled(allKeys)
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return defaultEnabled(allKeys)
    const filtered = parsed.filter(
      (k): k is string => typeof k === 'string' && allKeys.includes(k),
    )
    if (filtered.length === 0) return defaultEnabled(allKeys)
    return new Set(filtered.slice(0, MAX_ENABLED_SOURCES))
  } catch {
    return defaultEnabled(allKeys)
  }
}

export function setEnabledSources(
  enabled: ReadonlyArray<string>,
  allKeys: ReadonlyArray<string>,
): void {
  if (typeof window === 'undefined') return
  const filtered = enabled
    .filter((k) => allKeys.includes(k))
    .slice(0, MAX_ENABLED_SOURCES)
  if (filtered.length === 0) return
  localStorage.setItem(ENABLED_SOURCES_KEY, JSON.stringify(filtered))
  window.dispatchEvent(new CustomEvent('ch-enabled-sources-change'))
}

export function toggleSourceEnabled(
  key: string,
  allKeys: ReadonlyArray<string>,
): boolean {
  const current = getEnabledSources(allKeys)
  if (current.has(key)) {
    if (current.size <= 1) return false
    current.delete(key)
  } else {
    if (current.size >= MAX_ENABLED_SOURCES) return false
    current.add(key)
  }
  setEnabledSources(Array.from(current), allKeys)
  return true
}
