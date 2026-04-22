import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { createDb } from '../../db'
import { definitions } from '../../db/schema'
import {
  fetchDefinitionWithFallbacks,
  tryMerriamWebster,
  tryWordnik,
  tryDictionaryApi,
  tryDatamuse,
  tryWikipedia,
  tryUrbanDictionary,
} from '../../server/definition-fallbacks'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

const SINGLE_SOURCE_FETCHERS: Record<
  string,
  (
    word: string,
    originalWord: string,
    opts: { wordnikApiKey?: string; merriamWebsterApiKey?: string },
  ) => Promise<{ definitions: Array<{ definition: string }> } | null>
> = {
  'merriam-webster': (w, _o, opts) =>
    tryMerriamWebster(w, opts.merriamWebsterApiKey),
  wordnik: (w, _o, opts) => tryWordnik(w, opts.wordnikApiKey),
  dictionary: (w) => tryDictionaryApi(w),
  datamuse: (w) => tryDatamuse(w),
  wikipedia: (_w, o) => tryWikipedia(o),
  urban: (w) => tryUrbanDictionary(w),
}

export const Route = createFileRoute('/api/definition/$word')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const originalWord = params.word
        const word = originalWord.toLowerCase()
        if (word.trim().length === 0) {
          return Response.json(
            { error: 'Word parameter is required' },
            { status: 400 },
          )
        }

        const url = new URL(request.url)
        const source = url.searchParams.get('source')

        if (source) {
          if (!(source in SINGLE_SOURCE_FETCHERS)) {
            return Response.json(
              { error: `Unknown source: ${source}` },
              { status: 400 },
            )
          }

          // Cloudflare's Workers runtime exposes `caches.default`, but the DOM
          // lib typings (which win in TS resolution) only declare the standard
          // CacheStorage methods. Cast through the Workers-specific shape.
          const cache = (caches as unknown as { default: Cache }).default
          const cacheKey = new Request(request.url, { method: 'GET' })
          const cached = await cache.match(cacheKey)
          if (cached) return cached

          const fetcher = SINGLE_SOURCE_FETCHERS[source]
          const result = await fetcher(word, originalWord, {
            wordnikApiKey: env.WORDNIK_API_KEY,
            merriamWebsterApiKey: env.MERRIAM_WEBSTER_API_KEY,
          })
          const body = result ?? { definitions: [], source }
          const response = new Response(JSON.stringify(body), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=2592000',
            },
          })
          await cache.put(cacheKey, response.clone())
          return response
        }

        const db = createDb(env.DB)
        const cached = await db
          .select()
          .from(definitions)
          .where(eq(definitions.word, word))
          .get()

        if (cached && Date.now() - cached.fetchedAt < THIRTY_DAYS) {
          const cachedData = JSON.parse(cached.data)
          const firstDef = cachedData.definitions?.[0]
          // Skip cache for legacy inferred fallbacks and empty results
          // (both predate the Inferred removal); re-fetch to try upstream sources again.
          const isLegacyInferred =
            firstDef?.source === 'inferred' ||
            firstDef?.definition?.includes('not found')
          const isEmpty = !firstDef
          if (!isLegacyInferred && !isEmpty) {
            return Response.json(cachedData)
          }
        }

        const result = (await fetchDefinitionWithFallbacks(word, originalWord, {
          wordnikApiKey: env.WORDNIK_API_KEY,
          merriamWebsterApiKey: env.MERRIAM_WEBSTER_API_KEY,
        })) ?? { definitions: [] }
        await db
          .insert(definitions)
          .values({
            word,
            data: JSON.stringify(result),
            fetchedAt: Date.now(),
          })
          .onConflictDoUpdate({
            target: definitions.word,
            set: { data: JSON.stringify(result), fetchedAt: Date.now() },
          })

        return Response.json(result)
      },
    },
  },
})
