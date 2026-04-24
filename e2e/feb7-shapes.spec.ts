import { test, expect } from '@playwright/test'

const BASE_URL = process.env.API_URL || 'http://localhost:3000'

test.describe('Feb 7th 2026 Special Edition - Shapes Puzzle', () => {
  test('API returns image-based puzzle data for 2026-02-07', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/puzzle/2026-02-07`)

    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.print_date).toBe('2026-02-07')
    expect(data.categories).toHaveLength(4)

    // Feb 7th special edition uses images (SVGs) instead of text content
    for (const category of data.categories) {
      expect(category.title).toBeTruthy()
      expect(category.cards).toHaveLength(4)

      for (const card of category.cards) {
        // Cards should have image_url and image_alt_text instead of content
        expect(card.image_url).toBeTruthy()
        expect(card.image_url).toContain('.svg')
        expect(card.image_alt_text).toBeTruthy()
        expect(typeof card.position).toBe('number')
      }
    }
  })

  test('Feb 7th puzzle has correct category titles', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/puzzle/2026-02-07`)
    const data = await response.json()

    const titles = data.categories.map((c: any) => c.title).sort()
    expect(titles).toContain('PIPS ON A DIE')
    expect(titles).toContain('SYMBOLS USED IN ARITHMETIC')
    expect(titles).toContain('PUNCTUATION MARKS')
  })

  test('Feb 7th puzzle cards have valid SVG image URLs', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/puzzle/2026-02-07`)
    const data = await response.json()

    const allCards = data.categories.flatMap((c: any) => c.cards)
    expect(allCards).toHaveLength(16)

    // All cards should reference the S3 assets bucket
    for (const card of allCards) {
      expect(card.image_url).toMatch(/^https:\/\/games-phoenix-assets.*\.svg$/)
    }

    // Verify known alt texts are present
    const altTexts = allCards.map((c: any) => c.image_alt_text)
    expect(altTexts).toContain('FIVE')
    expect(altTexts).toContain('PLUS')
    expect(altTexts).toContain('COLON')
    expect(altTexts).toContain('EQUALS')
  })

  test('definitions API handles image words gracefully', async ({
    request,
  }) => {
    // When image alt texts are sent as words, server should handle them
    const response = await request.post(`${BASE_URL}/api/definitions`, {
      data: { words: ['FIVE', 'PLUS', 'COLON', 'EQUALS'] },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.definitions).toBeDefined()
    // Should not crash - definitions might be empty or fallback but shouldn't error
  })

  test('definitions API handles empty/null words gracefully', async ({
    request,
  }) => {
    // Edge case: null/empty words should not crash the server
    const response = await request.post(`${BASE_URL}/api/definitions`, {
      data: { words: [null, undefined, '', 'HELLO'] },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.definitions).toBeDefined()
    // Should have definition for HELLO at minimum
    expect(data.definitions['hello']).toBeDefined()
  })

  test('Feb 7th puzzle loads without errors via full flow', async ({
    request,
  }) => {
    // Step 1: Load puzzle
    const puzzleRes = await request.get(`${BASE_URL}/api/puzzle/2026-02-07`)
    expect(puzzleRes.ok()).toBeTruthy()
    const puzzle = await puzzleRes.json()

    // Step 2: Extract words (alt texts for image puzzles)
    const words = puzzle.categories.flatMap((c: any) =>
      c.cards
        .map((card: any) => card.content || card.image_alt_text)
        .filter(Boolean),
    )
    expect(words.length).toBe(16)

    // Step 3: Fetch definitions (should not crash)
    const defRes = await request.post(`${BASE_URL}/api/definitions`, {
      data: { words },
    })
    expect(defRes.ok()).toBeTruthy()
    const defData = await defRes.json()
    expect(defData.definitions).toBeDefined()
    expect(typeof defData.definitions).toBe('object')
  })
})
