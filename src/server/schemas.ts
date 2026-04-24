import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const ErrorResponse = z
  .object({ error: z.string() })
  .openapi('ErrorResponse', {
    description:
      'Standard error envelope returned for 400 (bad input), 404 (not found) and 429 (rate limited) responses.',
  })

export const DateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
  .openapi({
    example: '2024-06-15',
    description: 'ISO date in YYYY-MM-DD format.',
  })

export const WordParam = z
  .string()
  .min(1, 'Word parameter is required')
  .openapi({
    example: 'apple',
    description:
      'Word to define. Case-insensitive; the API lowercases before cache lookup.',
  })

export const DefinitionSourceParam = z
  .enum([
    'merriam-webster',
    'wordnik',
    'dictionary',
    'datamuse',
    'wikipedia',
    'urban',
  ])
  .openapi({
    example: 'dictionary',
    description:
      'Restrict lookup to a single upstream source. Omit to use the full fallback chain in priority order.',
  })

export const Definition = z
  .object({
    definition: z.string(),
    partOfSpeech: z.string().optional(),
    source: z.string().optional(),
  })
  .openapi('Definition', {
    description:
      'A single definition entry. `source` indicates which upstream produced it.',
  })

export const DefinitionResult = z
  .object({
    definitions: z.array(Definition),
    source: z.string().optional(),
  })
  .openapi('DefinitionResult', {
    description:
      'Result of a definition lookup. `definitions` may be empty when no upstream matched.',
  })

export const DefinitionsRequest = z
  .object({
    words: z.array(z.string()),
  })
  .openapi('DefinitionsRequest', {
    description:
      'Batch request body. `words` must be an array of strings; empty strings are tolerated and filtered server-side, but non-string items are rejected with 400.',
  })

export const DefinitionsResponse = z
  .object({
    definitions: z.record(z.string(), DefinitionResult),
  })
  .openapi('DefinitionsResponse', {
    description: 'Word-keyed map of definition results.',
  })

export const PuzzleCard = z
  .object({
    content: z.string().optional(),
    position: z.number(),
    image_url: z.string().optional(),
    image_alt_text: z.string().optional(),
  })
  .openapi('PuzzleCard', {
    description:
      'One of 16 cards in a puzzle. Text puzzles use `content`; image puzzles (e.g. the 2026-02-07 special edition) use `image_url` + `image_alt_text` instead.',
  })

export const PuzzleCategory = z
  .object({
    title: z.string(),
    cards: z.array(PuzzleCard),
  })
  .openapi('PuzzleCategory', {
    description: 'A category group of four related puzzle cards.',
  })

export const Puzzle = z
  .object({
    id: z.number(),
    print_date: z.string(),
    categories: z.array(PuzzleCategory),
  })
  .openapi('Puzzle', {
    description:
      'NYT Connections puzzle as returned by the NYT Connections V2 endpoint. Always has four categories of four cards each.',
  })

export const Stats = z
  .object({
    puzzles: z.number(),
    definitions: z.number(),
  })
  .openapi('Stats', {
    description: 'Row counts for the local puzzles and definitions caches.',
  })

export const Config = z
  .object({
    sentryDsn: z.string(),
    posthogKey: z.string(),
    posthogHost: z.string(),
  })
  .openapi('Config', {
    description:
      'Public observability keys exposed to the browser. All fields are strings; missing keys return as empty strings rather than being omitted.',
  })

export const Companion = z
  .object({
    companionNumber: z.number().nullable(),
    urlDate: z.string().nullable(),
  })
  .openapi('Companion', {
    description:
      'NYT Connections Companion metadata for a given puzzle date. `companionNumber` is the issue number; `urlDate` is the date component of the companion URL (one day before the puzzle date).',
  })
