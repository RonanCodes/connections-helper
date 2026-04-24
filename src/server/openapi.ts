import { z } from 'zod'
import {
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi'
import {
  Companion,
  Config,
  DateParam,
  DefinitionResult,
  DefinitionSourceParam,
  DefinitionsRequest,
  DefinitionsResponse,
  ErrorResponse,
  Puzzle,
  Stats,
  WordParam,
} from './schemas'

const registry = new OpenAPIRegistry()

registry.registerPath({
  method: 'get',
  path: '/api/stats',
  summary: 'Row counts for puzzles and definitions tables',
  tags: ['stats'],
  responses: {
    200: {
      description: 'Current counts',
      content: { 'application/json': { schema: Stats } },
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/config',
  summary: 'Public runtime observability config',
  tags: ['config'],
  responses: {
    200: {
      description: 'Observability keys (may be empty strings)',
      content: { 'application/json': { schema: Config } },
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/puzzle/{date}',
  summary: 'NYT Connections puzzle for a given date',
  tags: ['puzzle'],
  request: {
    params: z.object({ date: DateParam }),
  },
  responses: {
    200: {
      description: 'Puzzle found',
      content: { 'application/json': { schema: Puzzle } },
    },
    400: {
      description: 'Invalid date format',
      content: { 'application/json': { schema: ErrorResponse } },
    },
    404: {
      description: 'Puzzle not found',
      content: { 'application/json': { schema: ErrorResponse } },
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/definition/{word}',
  summary: 'Definition for a single word with optional source selection',
  tags: ['definition'],
  request: {
    params: z.object({ word: WordParam }),
    query: z.object({ source: DefinitionSourceParam.optional() }),
  },
  responses: {
    200: {
      description: 'Definition result (may be empty if no source matched)',
      content: { 'application/json': { schema: DefinitionResult } },
    },
    400: {
      description: 'Invalid word or unknown source',
      content: { 'application/json': { schema: ErrorResponse } },
    },
    429: {
      description: 'Rate limited',
      content: { 'application/json': { schema: ErrorResponse } },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/definitions',
  summary: 'Batch definition lookup',
  tags: ['definition'],
  request: {
    body: {
      content: { 'application/json': { schema: DefinitionsRequest } },
    },
  },
  responses: {
    200: {
      description: 'Word-keyed definition results',
      content: { 'application/json': { schema: DefinitionsResponse } },
    },
    400: {
      description: 'Invalid body',
      content: { 'application/json': { schema: ErrorResponse } },
    },
    429: {
      description: 'Rate limited',
      content: { 'application/json': { schema: ErrorResponse } },
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/companion/{date}',
  summary: 'NYT Connections Companion number for a puzzle date',
  tags: ['puzzle'],
  request: {
    params: z.object({ date: DateParam }),
  },
  responses: {
    200: {
      description: 'Companion info',
      content: { 'application/json': { schema: Companion } },
    },
    400: {
      description: 'Invalid date format',
      content: { 'application/json': { schema: ErrorResponse } },
    },
  },
})

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions)
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Connections Helper API',
      version: '2.0.0',
      description:
        'Public API that powers connectionshelper.app. Provides the daily NYT Connections puzzle and multi-source word definitions.',
    },
    servers: [{ url: 'https://connectionshelper.app' }],
  })
}
