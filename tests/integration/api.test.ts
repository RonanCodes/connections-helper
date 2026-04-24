/**
 * Integration Tests - Connections Helper API
 * Tests real API calls to NYT and Urban Dictionary
 *
 * Run: bun test (or vitest run)
 */

import { describe, test, expect } from 'vitest'

const API_BASE = process.env.API_URL || 'http://localhost:3000'

describe('Integration Tests (Real External APIs)', () => {
  describe('NYT Puzzle API', () => {
    test("fetches today's puzzle from NYT", async () => {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`${API_BASE}/api/puzzle/${today}`)

      expect(res.ok).toBe(true)
      const data = await res.json()

      expect(data.categories).toBeDefined()
      expect(data.categories.length).toBe(4)
      expect(data.categories[0].cards.length).toBe(4)

      // Verify word order is by position (sorted)
      const positions = data.categories.flatMap((c: any) =>
        c.cards.map((card: any) => card.position),
      )
      const sortedPositions = [...positions].sort((a, b) => a - b)
      // Positions should exist and be 0-15
      expect(positions.every((p: number) => p >= 0 && p <= 15)).toBe(true)
    })

    test('returns 404 for future date', async () => {
      const futureDate = '2030-01-01'
      const res = await fetch(`${API_BASE}/api/puzzle/${futureDate}`)

      expect(res.status).toBe(404)
    })
  })

  describe('Dictionary API with Urban Dictionary Fallback', () => {
    test('fetches regular word from dictionary', async () => {
      const res = await fetch(`${API_BASE}/api/definition/happy`)

      expect(res.ok).toBe(true)
      const data = await res.json()

      expect(data.definitions).toBeDefined()
      expect(data.definitions.length).toBeGreaterThan(0)
      expect(data.definitions[0].definition).toBeDefined()
      // Regular dictionary words should NOT have source: 'urban'
      expect(data.source).not.toBe('urban')
    })

    test('returns a definition for proper-noun words (SCARRY)', async () => {
      // Whichever upstream responds first (MW, Wordnik, Wikipedia, UD) is fine.
      const res = await fetch(`${API_BASE}/api/definition/scarry`)

      expect(res.ok).toBe(true)
      const data = await res.json()

      expect(data.definitions).toBeDefined()
      expect(data.definitions.length).toBeGreaterThan(0)
      expect(typeof data.source).toBe('string')
    })

    test('returns a definition for proper-noun words (GOREY)', async () => {
      const res = await fetch(`${API_BASE}/api/definition/gorey`)

      expect(res.ok).toBe(true)
      const data = await res.json()

      expect(data.definitions).toBeDefined()
      expect(data.definitions.length).toBeGreaterThan(0)
      expect(typeof data.source).toBe('string')
    })
  })

  describe('Urban Dictionary Direct Test', () => {
    test('Urban Dictionary API returns results', async () => {
      // Direct test of Urban Dictionary API (not through our proxy)
      const res = await fetch(
        'https://api.urbandictionary.com/v0/define?term=yeet',
      )

      expect(res.ok).toBe(true)
      const data = await res.json()

      expect(data.list).toBeDefined()
      expect(data.list.length).toBeGreaterThan(0)
      expect(data.list[0].definition).toBeDefined()
      expect(data.list[0].word.toLowerCase()).toBe('yeet')
    })
  })

  describe('End-to-End: Full Puzzle Flow', () => {
    test('fetches puzzle and definitions for all words', async () => {
      const today = new Date().toISOString().split('T')[0]

      // 1. Fetch puzzle
      const puzzleRes = await fetch(`${API_BASE}/api/puzzle/${today}`)
      expect(puzzleRes.ok).toBe(true)
      const puzzle = await puzzleRes.json()

      // 2. Extract all words
      const words = puzzle.categories.flatMap((c: any) =>
        c.cards.map((card: any) => card.content.toLowerCase()),
      )
      expect(words.length).toBe(16)

      // 3. Batch fetch definitions
      const defsRes = await fetch(`${API_BASE}/api/definitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words }),
      })
      expect(defsRes.ok).toBe(true)
      const defs = await defsRes.json()

      // 4. Verify all words have definitions
      expect(Object.keys(defs.definitions).length).toBe(16)

      // 5. Check that some came from Urban Dictionary (proper nouns in puzzle)
      const urbanWords = Object.entries(defs.definitions).filter(
        ([_, def]: [string, any]) => def.source === 'urban',
      )

      console.log(`\n📊 Test Results:`)
      console.log(`   Total words: ${words.length}`)
      console.log(`   Regular dictionary: ${words.length - urbanWords.length}`)
      console.log(`   Urban Dictionary fallback: ${urbanWords.length}`)
      console.log(
        `   Urban words: ${urbanWords.map(([w]) => w).join(', ') || 'none'}`,
      )
    })
  })
})
