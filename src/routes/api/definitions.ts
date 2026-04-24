import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { inArray } from 'drizzle-orm'
import { createDb } from '../../db'
import { definitions } from '../../db/schema'
import { fetchDefinitionWithFallbacks } from '../../server/definition-fallbacks'
import type { DefinitionResult } from '../../server/definition-fallbacks'
import { rateLimitByIp } from '../../server/rate-limit'
import { DefinitionsRequest } from '../../server/schemas'
import { jsonError, validate } from '../../server/validate'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

export const Route = createFileRoute('/api/definitions')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const limited = await rateLimitByIp(request, 'definitions')
        if (limited) return limited

        let raw: unknown
        try {
          raw = await request.json()
        } catch {
          return jsonError('Invalid JSON body')
        }

        const parsed = validate(DefinitionsRequest, raw)
        if (!parsed.ok) return parsed.response

        const originalWords = parsed.data.words.filter(
          (w): w is string => typeof w === 'string' && w.trim().length > 0,
        )
        const words = originalWords.map((w) => w.toLowerCase())
        if (words.length === 0) {
          return Response.json({ definitions: {} })
        }

        const db = createDb(env.DB)
        const results: Record<string, DefinitionResult> = {}
        const cachedRows = await db
          .select()
          .from(definitions)
          .where(inArray(definitions.word, words))
          .all()

        const cacheByWord = new Map(cachedRows.map((r) => [r.word, r]))
        const uncached: Array<{ word: string; original: string }> = []

        for (let i = 0; i < words.length; i++) {
          const word = words[i]
          const original = originalWords[i]
          const cached = cacheByWord.get(word)
          if (cached && Date.now() - cached.fetchedAt < THIRTY_DAYS) {
            const cachedData = JSON.parse(cached.data) as DefinitionResult
            if (!cachedData.definitions[0]?.definition?.includes('not found')) {
              results[word] = cachedData
              continue
            }
          }
          uncached.push({ word, original })
        }

        await Promise.all(
          uncached.map(async ({ word, original }) => {
            const result = await fetchDefinitionWithFallbacks(word, original, {
              wordnikApiKey: env.WORDNIK_API_KEY,
              merriamWebsterApiKey: env.MERRIAM_WEBSTER_API_KEY,
            })
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
            results[word] = result
          }),
        )

        return Response.json({ definitions: results })
      },
    },
  },
})
