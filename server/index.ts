import { Database } from 'bun:sqlite'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'

const app = new Hono()
const PORT = parseInt(process.env.PORT || '3006')

const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/puzzles.db' : 'puzzles.db'
const db = new Database(dbPath)
db.run(`
  CREATE TABLE IF NOT EXISTS puzzles (
    date TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  )
`)
db.run(`
  CREATE TABLE IF NOT EXISTS definitions (
    word TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  )
`)

interface NYTPuzzle {
  id: number
  print_date: string
  categories: {
    title: string
    cards: { content: string; position: number }[]
  }[]
}

// Global error handler - catch anything that slips through
app.onError((err, c) => {
  console.error(`[${c.req.method} ${c.req.path}] Unhandled error:`, err)
  return c.json({ error: 'Internal server error' }, 500)
})

// CORS for API routes
app.use('/api/*', cors())

// Get puzzle by date (with caching)
app.get('/api/puzzle/:date', async (c) => {
  try {
    const date = c.req.param('date')
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400)
    }
    
    // Check cache first
    const cached = db.query('SELECT data FROM puzzles WHERE date = ?').get(date) as { data: string } | null
    if (cached) {
      return c.json(JSON.parse(cached.data))
    }
    
    // Fetch from NYT
    try {
      const res = await fetch(`https://www.nytimes.com/svc/connections/v2/${date}.json`)
      if (!res.ok) {
        return c.json({ error: 'Puzzle not found for this date' }, 404)
      }
      
      const puzzle = await res.json() as NYTPuzzle
      
      // Cache in database
      db.run(
        'INSERT OR REPLACE INTO puzzles (date, data, fetched_at) VALUES (?, ?, ?)',
        [date, JSON.stringify(puzzle), Date.now()]
      )
      
      
      return c.json(puzzle)
    } catch (err) {
      console.error(`[GET /api/puzzle/${date}] Fetch error:`, err)
      return c.json({ error: 'Failed to fetch puzzle' }, 500)
    }
  } catch (err) {
    console.error('[GET /api/puzzle/:date] Unhandled error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Helper: Try Wikipedia for proper nouns
async function tryWikipedia(word: string): Promise<{ definition: string; source: string } | null> {
  try {
    const searchRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`)
    if (searchRes.ok) {
      const data = await searchRes.json()
      if (data.extract && data.extract.length > 10) {
        // Get first sentence or two
        const extract = data.extract.split('. ').slice(0, 2).join('. ') + '.'
        return { definition: extract, source: 'wikipedia' }
      }
    }
  } catch {}
  return null
}

// Helper: Try Urban Dictionary
async function tryUrbanDictionary(word: string): Promise<Array<{ definition: string; partOfSpeech?: string; source?: string }> | null> {
  try {
    const urbanRes = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`)
    if (urbanRes.ok) {
      const urbanData = await urbanRes.json()
      if (urbanData.list && urbanData.list.length > 0) {
        return urbanData.list
          .sort((a: any, b: any) => b.thumbs_up - a.thumbs_up)
          .slice(0, 3)
          .map((d: any) => ({
            definition: d.definition.replace(/\[|\]/g, ''),
            partOfSpeech: 'slang',
            source: 'urban'
          }))
      }
    }
  } catch {}
  return null
}

// Helper: Try Datamuse for related words/meanings
async function tryDatamuse(word: string): Promise<{ definition: string; source: string } | null> {
  try {
    const res = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`)
    if (res.ok) {
      const data = await res.json()
      if (data[0]?.defs && data[0].defs.length > 0) {
        const def = data[0].defs[0]
        // Datamuse format: "n\tdefinition" where n is part of speech
        const parts = def.split('\t')
        return {
          definition: parts[1] || parts[0],
          source: 'datamuse'
        }
      }
    }
  } catch {}
  return null
}

// Helper: Generate a smart fallback definition
function generateFallback(word: string): { definition: string; source: string } {
  if (!word || word.trim().length === 0) {
    return { definition: 'Unknown word or term.', source: 'inferred' }
  }
  const original = word
  word = word.toLowerCase()
  
  // Check for common suffixes
  if (word.endsWith('er')) {
    const base = word.slice(0, -2)
    return { definition: `One who ${base}s or something that ${base}s.`, source: 'inferred' }
  }
  if (word.endsWith('ing')) {
    const base = word.slice(0, -3)
    return { definition: `The act of ${base}ing; present participle of ${base}.`, source: 'inferred' }
  }
  if (word.endsWith('tion') || word.endsWith('sion')) {
    return { definition: `A state, action, or process.`, source: 'inferred' }
  }
  if (word.endsWith('ness')) {
    const base = word.slice(0, -4)
    return { definition: `The quality or state of being ${base}.`, source: 'inferred' }
  }
  if (word.endsWith('ly')) {
    const base = word.slice(0, -2)
    return { definition: `In a ${base} manner; adverb form.`, source: 'inferred' }
  }
  
  // If first letter is capitalized in original, likely proper noun
  if (original[0] === original[0].toUpperCase()) {
    return { definition: `Proper noun - may refer to a person, place, brand, or cultural reference.`, source: 'inferred' }
  }
  
  return { definition: `Word or term - context needed for specific meaning.`, source: 'inferred' }
}

// Get definition for a word (with caching) - returns ALL definitions with multiple fallbacks
app.get('/api/definition/:word', async (c) => {
  try {
    const word = c.req.param('word').toLowerCase()
    const originalWord = c.req.param('word')
    
    if (!word || word.trim().length === 0) {
      return c.json({ error: 'Word parameter is required' }, 400)
    }
    
    // Check cache first (cache for 30 days)
    const cached = db.query('SELECT data, fetched_at FROM definitions WHERE word = ?').get(word) as { data: string; fetched_at: number } | null
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
    
    if (cached && (Date.now() - cached.fetched_at) < THIRTY_DAYS) {
      const cachedData = JSON.parse(cached.data)
      // Skip cache if it's a "not found" result - try again with better fallbacks
      if (!cachedData.definitions?.[0]?.definition?.includes('not found')) {
        return c.json(cachedData)
      }
    }
    
    let result: { definitions: Array<{ definition: string; partOfSpeech?: string; source?: string }>; source?: string }
    
    try {
      // 1. Try Free Dictionary API first
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
      
      if (res.ok) {
        const data = await res.json()
        const allDefinitions: Array<{ definition: string; partOfSpeech?: string; source?: string }> = []
        
        for (const entry of data) {
          for (const meaning of entry.meanings || []) {
            for (const def of meaning.definitions || []) {
              if (def.definition) {
                allDefinitions.push({
                  definition: def.definition,
                  partOfSpeech: meaning.partOfSpeech,
                  source: 'dictionary'
                })
              }
            }
          }
        }
        
        if (allDefinitions.length > 0) {
          result = { definitions: allDefinitions, source: 'dictionary' }
        }
      }
      
      // 2. If no dictionary result, try Datamuse
      if (!result!) {
        const datamuseResult = await tryDatamuse(word)
        if (datamuseResult) {
          result = { definitions: [{ ...datamuseResult, partOfSpeech: undefined }], source: 'datamuse' }
        }
      }
      
      // 3. Try Wikipedia for proper nouns
      if (!result!) {
        const wikiResult = await tryWikipedia(originalWord)
        if (wikiResult) {
          result = { definitions: [{ definition: wikiResult.definition, partOfSpeech: 'proper noun', source: 'wikipedia' }], source: 'wikipedia' }
        }
      }
      
      // 4. Try Urban Dictionary
      if (!result!) {
        const urbanResult = await tryUrbanDictionary(word)
        if (urbanResult && urbanResult.length > 0) {
          result = { definitions: urbanResult, source: 'urban' }
        }
      }
      
      // 5. Generate smart fallback
      if (!result!) {
        const fallback = generateFallback(originalWord)
        result = { definitions: [{ definition: fallback.definition, source: fallback.source }], source: fallback.source }
      }
      
      // Cache in database
      db.run(
        'INSERT OR REPLACE INTO definitions (word, data, fetched_at) VALUES (?, ?, ?)',
        [word, JSON.stringify(result), Date.now()]
      )
      
      return c.json(result)
    } catch (err) {
      console.error(`[GET /api/definition/${word}] Lookup error:`, err)
      // Even on error, return something useful
      const fallback = generateFallback(originalWord)
      return c.json({ definitions: [{ definition: fallback.definition, source: fallback.source }], source: fallback.source })
    }
  } catch (err) {
    console.error('[GET /api/definition/:word] Unhandled error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Helper: Fetch single definition with all fallbacks
async function fetchDefinitionWithFallbacks(word: string, originalWord: string): Promise<{ definitions: Array<{ definition: string; partOfSpeech?: string; source?: string }>; source?: string }> {
  // 1. Try Free Dictionary API
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    if (res.ok) {
      const data = await res.json()
      const allDefinitions: Array<{ definition: string; partOfSpeech?: string; source?: string }> = []
      
      for (const entry of data) {
        for (const meaning of entry.meanings || []) {
          for (const def of meaning.definitions || []) {
            if (def.definition) {
              allDefinitions.push({
                definition: def.definition,
                partOfSpeech: meaning.partOfSpeech,
                source: 'dictionary'
              })
            }
          }
        }
      }
      
      if (allDefinitions.length > 0) {
        return { definitions: allDefinitions, source: 'dictionary' }
      }
    }
  } catch {}
  
  // 2. Try Datamuse
  const datamuseResult = await tryDatamuse(word)
  if (datamuseResult) {
    return { definitions: [{ ...datamuseResult, partOfSpeech: undefined }], source: 'datamuse' }
  }
  
  // 3. Try Wikipedia
  const wikiResult = await tryWikipedia(originalWord)
  if (wikiResult) {
    return { definitions: [{ definition: wikiResult.definition, partOfSpeech: 'proper noun', source: 'wikipedia' }], source: 'wikipedia' }
  }
  
  // 4. Try Urban Dictionary
  const urbanResult = await tryUrbanDictionary(word)
  if (urbanResult && urbanResult.length > 0) {
    return { definitions: urbanResult, source: 'urban' }
  }
  
  // 5. Smart fallback
  const fallback = generateFallback(originalWord)
  return { definitions: [{ definition: fallback.definition, source: fallback.source }], source: fallback.source }
}

// Batch get definitions for multiple words - returns ALL definitions with fallbacks
app.post('/api/definitions', async (c) => {
  let body: { words?: string[] }
  try {
    body = await c.req.json()
  } catch (err) {
    console.error('[POST /api/definitions] Invalid JSON body:', err)
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  
  if (!body || !Array.isArray(body.words)) {
    return c.json({ error: 'Request body must contain a "words" array' }, 400)
  }
  
  const originalWords = (body.words || []).filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
  const words = originalWords.map(w => w.toLowerCase())
  
  if (words.length === 0) {
    return c.json({ definitions: {} })
  }
  
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  const results: Record<string, { definitions: Array<{ definition: string; partOfSpeech?: string; source?: string }>; source?: string }> = {}
  const uncached: Array<{ word: string; original: string }> = []
  
  // Check cache for all words
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const original = originalWords[i]
    const cached = db.query('SELECT data, fetched_at FROM definitions WHERE word = ?').get(word) as { data: string; fetched_at: number } | null
    
    if (cached && (Date.now() - cached.fetched_at) < THIRTY_DAYS) {
      const cachedData = JSON.parse(cached.data)
      // Skip cache if it's a "not found" result
      if (!cachedData.definitions?.[0]?.definition?.includes('not found')) {
        results[word] = cachedData
        continue
      }
    }
    uncached.push({ word, original })
  }
  
  // Fetch uncached words in parallel
  try {
    await Promise.all(uncached.map(async ({ word, original }) => {
      const result = await fetchDefinitionWithFallbacks(word, original)
      
      // Cache in database
      db.run(
        'INSERT OR REPLACE INTO definitions (word, data, fetched_at) VALUES (?, ?, ?)',
        [word, JSON.stringify(result), Date.now()]
      )
      
      results[word] = result
    }))
  } catch (err) {
    console.error(`[POST /api/definitions] Batch fetch error (${uncached.length} words):`, err)
    // Return whatever we have so far rather than failing completely
  }
  
  return c.json({ definitions: results })
})

// Get stats
app.get('/api/stats', (c) => {
  try {
    const puzzleCount = db.query('SELECT COUNT(*) as count FROM puzzles').get() as { count: number }
    const definitionCount = db.query('SELECT COUNT(*) as count FROM definitions').get() as { count: number }
    
    return c.json({
      puzzles: puzzleCount.count,
      definitions: definitionCount.count,
    })
  } catch (err) {
    console.error('[GET /api/stats] Database error:', err)
    return c.json({ error: 'Failed to retrieve stats' }, 500)
  }
})

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

// Start server
console.log(`🧩 Connections Helper API running on http://localhost:${PORT}`)
export default {
  port: PORT,
  fetch: app.fetch,
}
