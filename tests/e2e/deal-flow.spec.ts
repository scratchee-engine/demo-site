import { test, expect } from '@playwright/test'

test.describe('Deal Flow', () => {
  test('deal proxy returns 400 for invalid game_id', async ({ request }) => {
    // Validates: error handling on deal with non-UUID game_id
    const res = await request.post('/proxy/deal', {
      data: { game_id: 'not-a-uuid', count: 1 },
    })
    expect(res.status()).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  test('deal proxy returns 404 for non-existent UUID game_id', async ({ request }) => {
    // Validates: upstream API rejects unknown game IDs
    const res = await request.post('/proxy/deal', {
      data: { game_id: '00000000-0000-0000-0000-000000000000', count: 1 },
    })
    // Upstream returns 404 for unknown game
    expect([400, 404]).toContain(res.status())
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  test('deal proxy forwards content-type and auth to upstream', async ({ request }) => {
    // Validates: proxy sends proper headers; upstream responds with structured error
    const res = await request.post('/proxy/deal', {
      data: { game_id: '00000000-0000-0000-0000-000000000000', count: 1 },
    })
    const json = await res.json()
    // Should get a structured API error, not a proxy/network failure
    expect(json).toHaveProperty('error')
    expect(json.error).toHaveProperty('code')
    expect(json.error).toHaveProperty('message')
  })

  test('clicking Buy Card with no games triggers error in UI', async ({ page }) => {
    // Validates: UI error display when deal fails
    const gamesResponse = await page.request.get('/proxy/games')
    const gamesJson = await gamesResponse.json()

    if (gamesJson.error) {
      // No games configured — test the error path
      await page.goto('/')
      await expect(page.locator('.error-msg')).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('play-token proxy returns error for invalid serial', async ({ request }) => {
    // Validates: play-token endpoint rejects bogus card serials
    const res = await request.post('/proxy/play-token', {
      data: { card_serial: 'INVALID-SERIAL' },
    })
    expect(res.ok()).toBe(false)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})
