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
