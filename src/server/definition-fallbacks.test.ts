import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fetchDefinitionWithFallbacks } from './definition-fallbacks'

type FetchResponse = {
  ok: boolean
  status?: number
  json: () => Promise<unknown>
}

type FetchHandler = (
  url: string,
) => FetchResponse | Promise<FetchResponse> | null

function mockFetch(handler: FetchHandler) {
  const fn = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString()
    const result = await handler(url)
    if (result === null) {
      return { ok: false, status: 404, json: async () => ({}) } as Response
    }
    return {
      ok: result.ok,
      status: result.status ?? (result.ok ? 200 : 500),
      json: result.json,
    } as Response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const MW_OK = {
  ok: true,
  json: async () => [
    {
      shortdef: ['a round fruit'],
      fl: 'noun',
    },
  ],
}

const WORDNIK_OK = {
  ok: true,
  json: async () => [
    { text: 'a definition from wordnik', partOfSpeech: 'noun' },
  ],
}

const DICT_OK = {
  ok: true,
  json: async () => [
    {
      meanings: [
        {
          partOfSpeech: 'noun',
          definitions: [{ definition: 'a dictionary entry' }],
        },
      ],
    },
  ],
}

const DATAMUSE_EMPTY = { ok: true, json: async () => [] }

const WIKI_MISS = {
  ok: false,
  status: 404,
  json: async () => ({}),
}

const UD_OK = {
  ok: true,
  json: async () => ({ list: [{ definition: 'slang definition', word: 'x' }] }),
}

const UD_EMPTY = { ok: true, json: async () => ({ list: [] }) }

describe('fetchDefinitionWithFallbacks', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns Merriam-Webster result when MW key is set and MW responds', async () => {
    const calls: Array<string> = []
    mockFetch((url) => {
      calls.push(url)
      if (url.includes('dictionaryapi.com')) return MW_OK
      return null
    })

    const result = await fetchDefinitionWithFallbacks('apple', 'apple', {
      merriamWebsterApiKey: 'mw-key',
      wordnikApiKey: 'wn-key',
    })

    expect(result).not.toBeNull()
    expect(result?.definitions[0]?.definition).toBe('a round fruit')
    // Short-circuits after MW hit.
    expect(calls.length).toBe(1)
    expect(calls[0]).toContain('dictionaryapi.com')
  })

  test('skips MW when key is missing, then Wordnik when key is missing, lands on Dictionary API', async () => {
    const calls: Array<string> = []
    mockFetch((url) => {
      calls.push(url)
      if (url.includes('api.dictionaryapi.dev')) return DICT_OK
      return null
    })

    const result = await fetchDefinitionWithFallbacks('apple', 'apple')

    expect(result).not.toBeNull()
    expect(result?.definitions[0]?.definition).toBe('a dictionary entry')
    // No MW or Wordnik URL should appear without keys.
    expect(calls.some((u) => u.includes('dictionaryapi.com'))).toBe(false)
    expect(calls.some((u) => u.includes('api.wordnik.com'))).toBe(false)
    expect(calls.some((u) => u.includes('api.dictionaryapi.dev'))).toBe(true)
  })

  test('falls through to Wordnik when MW has a key but returns no match', async () => {
    mockFetch((url) => {
      if (url.includes('dictionaryapi.com')) {
        return { ok: true, json: async () => ['suggestion1'] }
      }
      if (url.includes('api.wordnik.com')) return WORDNIK_OK
      return null
    })

    const result = await fetchDefinitionWithFallbacks('apple', 'apple', {
      merriamWebsterApiKey: 'mw-key',
      wordnikApiKey: 'wn-key',
    })

    expect(result).not.toBeNull()
    expect(result?.definitions[0]?.definition).toBe('a definition from wordnik')
  })

  test('falls all the way to Urban Dictionary when nothing else matches', async () => {
    const calls: Array<string> = []
    mockFetch((url) => {
      calls.push(url)
      if (url.includes('api.datamuse.com')) return DATAMUSE_EMPTY
      if (url.includes('wikipedia.org')) return WIKI_MISS
      if (url.includes('urbandictionary.com')) return UD_OK
      return null
    })

    const result = await fetchDefinitionWithFallbacks('yeet', 'yeet', {
      merriamWebsterApiKey: 'mw-key',
      wordnikApiKey: 'wn-key',
    })

    expect(result).not.toBeNull()
    expect(result?.definitions[0]?.definition).toBe('slang definition')
    expect(result?.source).toBe('urban')

    // Order check: MW → Wordnik → Dictionary → Datamuse → Wikipedia → Urban.
    const order = [
      'dictionaryapi.com',
      'api.wordnik.com',
      'api.dictionaryapi.dev',
      'api.datamuse.com',
      'wikipedia.org',
      'urbandictionary.com',
    ]
    let cursor = 0
    for (const expected of order) {
      const found = calls.findIndex(
        (u, i) => i >= cursor && u.includes(expected),
      )
      expect(found, `expected ${expected} in order`).toBeGreaterThanOrEqual(
        cursor,
      )
      cursor = found + 1
    }
  })

  test('returns null when every source misses', async () => {
    mockFetch(() => null)

    const result = await fetchDefinitionWithFallbacks('xyzabc', 'xyzabc', {
      merriamWebsterApiKey: 'mw-key',
      wordnikApiKey: 'wn-key',
    })

    expect(result).toBeNull()
  })

  test('handles empty arrays from Urban Dictionary gracefully', async () => {
    mockFetch((url) => {
      if (url.includes('urbandictionary.com')) return UD_EMPTY
      return null
    })

    const result = await fetchDefinitionWithFallbacks('xyzabc', 'xyzabc')

    expect(result).toBeNull()
  })
})
