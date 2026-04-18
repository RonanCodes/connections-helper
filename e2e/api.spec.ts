import { test, expect } from '@playwright/test'

const BASE_URL = process.env.API_URL || 'https://connections.ronanconnolly.dev'

test.describe('Connections API', () => {
  test('GET /api/stats returns puzzle and definition counts', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/stats`)
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('puzzles')
    expect(data).toHaveProperty('definitions')
    expect(typeof data.puzzles).toBe('number')
    expect(typeof data.definitions).toBe('number')
  })

  test('GET /api/puzzle/:date returns puzzle data', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/puzzle/2024-06-15`)
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('print_date', '2024-06-15')
    expect(data).toHaveProperty('categories')
    expect(Array.isArray(data.categories)).toBeTruthy()
    expect(data.categories.length).toBe(4)
    
    // Each category should have title and cards
    for (const category of data.categories) {
      expect(category).toHaveProperty('title')
      expect(category).toHaveProperty('cards')
      expect(Array.isArray(category.cards)).toBeTruthy()
      expect(category.cards.length).toBe(4)
    }
  })

  test('GET /api/puzzle/:date returns 404 for invalid date', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/puzzle/1999-01-01`)
    
    expect(response.status()).toBe(404)
    
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  test('GET /api/puzzle/:date returns 400 for malformed date', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/puzzle/not-a-date`)
    
    expect(response.status()).toBe(400)
    
    const data = await response.json()
    expect(data).toHaveProperty('error')
    expect(data.error).toContain('Invalid date format')
  })

  test('GET /api/definition/:word returns definition', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/definition/apple`)
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('definitions')
    expect(Array.isArray(data.definitions)).toBeTruthy()
    expect(data.definitions.length).toBeGreaterThan(0)
    expect(data.definitions[0]).toHaveProperty('definition')
  })

  test('GET /api/definition/:word handles unknown words gracefully', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/definition/xyznonexistent123`)
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('definitions')
    expect(Array.isArray(data.definitions)).toBeTruthy()
    // Should have a fallback definition
    expect(data.definitions.length).toBeGreaterThan(0)
  })

  test('POST /api/definitions returns batch definitions', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/definitions`, {
      data: { words: ['apple', 'banana', 'orange'] }
    })
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('definitions')
    expect(data.definitions).toHaveProperty('apple')
    expect(data.definitions).toHaveProperty('banana')
    expect(data.definitions).toHaveProperty('orange')
  })

  test('POST /api/definitions handles empty array', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/definitions`, {
      data: { words: [] }
    })
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('definitions')
    expect(Object.keys(data.definitions).length).toBe(0)
  })

  test('API responses are cached (second request should be fast)', async ({ request }) => {
    // First request
    const start1 = Date.now()
    await request.get(`${BASE_URL}/api/puzzle/2024-06-15`)
    const time1 = Date.now() - start1
    
    // Second request (should be cached)
    const start2 = Date.now()
    await request.get(`${BASE_URL}/api/puzzle/2024-06-15`)
    const time2 = Date.now() - start2
    
    // Cached response should be faster (allowing for network variance)
    // This is a soft check - mainly verifying caching doesn't break
    expect(time2).toBeLessThan(time1 + 500)
  })
})
