import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { createDb } from '../../db'
import { definitions } from '../../db/schema'
import { fetchDefinitionWithFallbacks } from '../../server/definition-fallbacks'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

export const Route = createFileRoute('/api/definition/$word')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const originalWord = params.word
        const word = originalWord.toLowerCase()
        if (word.trim().length === 0) {
          return Response.json(
            { error: 'Word parameter is required' },
            { status: 400 },
          )
        }

        const db = createDb(env.DB)
        const cached = await db
          .select()
          .from(definitions)
          .where(eq(definitions.word, word))
          .get()

        if (cached && Date.now() - cached.fetchedAt < THIRTY_DAYS) {
          const cachedData = JSON.parse(cached.data)
          if (!cachedData.definitions?.[0]?.definition?.includes('not found')) {
            return Response.json(cachedData)
          }
        }

        const result = await fetchDefinitionWithFallbacks(word, originalWord)
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
