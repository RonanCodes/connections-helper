import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const puzzles = sqliteTable('puzzles', {
  date: text('date').primaryKey(),
  data: text('data').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
})

export const definitions = sqliteTable('definitions', {
  word: text('word').primaryKey(),
  data: text('data').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
})

// NYT Connections Companion column has its own numbering + URL-date scheme,
// which drifts from the puzzle ID/date (companion is published the evening
// before, and occasional gaps mean companion_number != puzzle_id). We scrape
// the spotlight index and memoise the mapping here.
export const companions = sqliteTable('companions', {
  puzzleDate: text('puzzle_date').primaryKey(),
  companionNumber: integer('companion_number').notNull(),
  urlDate: text('url_date').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
})
