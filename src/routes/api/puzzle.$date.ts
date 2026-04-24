import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { createDb } from '../../db'
import { puzzles } from '../../db/schema'
import { DateParam } from '../../server/schemas'
import { validate } from '../../server/validate'

type NYTPuzzle = {
  id: number
  print_date: string
  categories: Array<{
    title: string
    cards: Array<{ content: string; position: number }>
  }>
}

export const Route = createFileRoute('/api/puzzle/$date')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const parsed = validate(DateParam, params.date)
        if (!parsed.ok) return parsed.response
        const date = parsed.data

        const db = createDb(env.DB)
        const cached = await db
          .select({ data: puzzles.data })
          .from(puzzles)
          .where(eq(puzzles.date, date))
          .get()

        if (cached) {
          return Response.json(JSON.parse(cached.data))
        }

        try {
          const res = await fetch(
            `https://www.nytimes.com/svc/connections/v2/${date}.json`,
          )
          if (!res.ok) {
            return Response.json(
              { error: 'Puzzle not found for this date' },
              { status: 404 },
            )
          }
          const puzzle = await res.json()
          await db
            .insert(puzzles)
            .values({
              date,
              data: JSON.stringify(puzzle),
              fetchedAt: Date.now(),
            })
            .onConflictDoUpdate({
              target: puzzles.date,
              set: { data: JSON.stringify(puzzle), fetchedAt: Date.now() },
            })
          return Response.json(puzzle)
        } catch (err) {
          console.error(`[GET /api/puzzle/${date}] Fetch error:`, err)
          return Response.json(
            { error: 'Failed to fetch puzzle' },
            { status: 500 },
          )
        }
      },
    },
  },
})
