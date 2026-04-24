import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const ErrorResponse = z
  .object({ error: z.string() })
  .openapi('ErrorResponse')

export const DateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
  .openapi({ example: '2024-06-15' })

export const WordParam = z
  .string()
  .min(1, 'Word parameter is required')
  .openapi({ example: 'apple' })

export const DefinitionSourceParam = z
  .enum([
    'merriam-webster',
    'wordnik',
    'dictionary',
    'datamuse',
    'wikipedia',
    'urban',
  ])
  .openapi({ example: 'dictionary' })

export const Definition = z
  .object({
    definition: z.string(),
    partOfSpeech: z.string().optional(),
    source: z.string().optional(),
  })
  .openapi('Definition')

export const DefinitionResult = z
  .object({
    definitions: z.array(Definition),
    source: z.string().optional(),
  })
  .openapi('DefinitionResult')

export const DefinitionsRequest = z
  .object({
    words: z.array(z.string()),
  })
  .openapi('DefinitionsRequest')

export const DefinitionsResponse = z
  .object({
    definitions: z.record(z.string(), DefinitionResult),
  })
  .openapi('DefinitionsResponse')

export const PuzzleCard = z
  .object({
    content: z.string().optional(),
    position: z.number(),
    image_url: z.string().optional(),
    image_alt_text: z.string().optional(),
  })
  .openapi('PuzzleCard')

export const PuzzleCategory = z
  .object({
    title: z.string(),
    cards: z.array(PuzzleCard),
  })
  .openapi('PuzzleCategory')

export const Puzzle = z
  .object({
    id: z.number(),
    print_date: z.string(),
    categories: z.array(PuzzleCategory),
  })
  .openapi('Puzzle')

export const Stats = z
  .object({
    puzzles: z.number(),
    definitions: z.number(),
  })
  .openapi('Stats')

export const Config = z
  .object({
    sentryDsn: z.string(),
    posthogKey: z.string(),
    posthogHost: z.string(),
  })
  .openapi('Config')

export const Companion = z
  .object({
    companionNumber: z.number().nullable(),
    urlDate: z.string().nullable(),
  })
  .openapi('Companion')
