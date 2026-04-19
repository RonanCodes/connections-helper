import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { sql } from 'drizzle-orm'
import { createDb } from '../../db'
import { definitions, puzzles } from '../../db/schema'

export const Route = createFileRoute('/api/stats')({
  server: {
    handlers: {
      GET: async () => {
        const db = createDb(env.DB)
        const [puzzleRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(puzzles)
        const [definitionRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(definitions)
        return Response.json({
          puzzles: puzzleRow.count,
          definitions: definitionRow.count,
        })
      },
    },
  },
})
