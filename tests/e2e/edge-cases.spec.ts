import { test, expect } from '@playwright/test'
import {
  getBalance, waitForGames, buyCard,
  STARTING_BALANCE,
} from './helpers'

test.describe('Edge Cases', () => {
  test('page refresh resets balance to starting amount', async ({ page }) => {
    await page.goto('/')
    await waitForGames(page)

    await buyCard(page)
    expect(await getBalance(page)).not.toBe(STARTING_BALANCE)

    await page.reload()
    await waitForGames(page)

    expect(await getBalance(page)).toBe(STARTING_BALANCE)
  })

  test('refresh during deal phase returns to lobby', async ({ page }) => {
    await page.goto('/')
    await waitForGames(page)

    await buyCard(page)
    await expect(page.getByRole('heading', { name: 'Your Card' })).toBeVisible()

    await page.reload()

    await expect(page.getByRole('button', { name: /Buy Card/ })).toBeVisible({ timeout: 10_000 })
    expect(await getBalance(page)).toBe(STARTING_BALANCE)
  })

  test('refresh during play phase returns to lobby', async ({ page }) => {
    await page.goto('/')
    await waitForGames(page)

    await buyCard(page)

    page.waitForResponse(
      r => r.url().includes('/api/play/reveal/'),
      { timeout: 20_000 }
    ).catch(() => null)

    await page.getByRole('button', { name: /Play Card/ }).click()
    await expect(page.getByText('Scratch your card')).toBeVisible({ timeout: 10_000 })

    await page.reload()

    await expect(page.getByRole('button', { name: /Buy Card/ })).toBeVisible({ timeout: 10_000 })
    expect(await getBalance(page)).toBe(STARTING_BALANCE)
  })

  test('back button in deal phase returns to lobby', async ({ page }) => {
    await page.goto('/')
    await waitForGames(page)

    await buyCard(page)
    await expect(page.getByRole('heading', { name: 'Your Card' })).toBeVisible()

    await page.getByRole('button', { name: '← Back' }).click()
    await expect(page.getByRole('button', { name: /Buy Card/ })).toBeVisible({ timeout: 5_000 })
  })

  test('play-token proxy rejects invalid serial', async ({ request }) => {
    const res = await request.post('/proxy/play-token', {
      data: { card_serial: 'FAKE-000-000-00' },
    })
    expect(res.ok()).toBe(false)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  test('deal proxy rejects non-existent game ID', async ({ request }) => {
    const res = await request.post('/proxy/deal', {
      data: { game_id: '00000000-0000-0000-0000-000000000000', count: 1 },
    })
    expect(res.ok()).toBe(false)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  test('deal proxy rejects invalid game_id format', async ({ request }) => {
    const res = await request.post('/proxy/deal', {
      data: { game_id: 'not-a-uuid', count: 1 },
    })
    expect(res.status()).toBe(400)
  })

  test('error message displays when deal fails', async ({ page }) => {
    await page.goto('/')
    await waitForGames(page)

    await page.route('**/proxy/deal', route =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'VALIDATION_ERROR', message: 'Game is not active' },
        }),
      })
    )

    await page.getByRole('button', { name: /Buy Card/ }).click()
    await expect(page.getByText(/failed|error/i)).toBeVisible({ timeout: 5_000 })
  })

  test('loading state shown while dealing', async ({ page }) => {
    await page.goto('/')
    await waitForGames(page)

    await page.route('**/proxy/deal', async route => {
      await new Promise(r => setTimeout(r, 2_000))
      await route.continue()
    })

    const btn = page.getByRole('button', { name: /Buy Card/ })
    await btn.click()

    await expect(page.getByRole('button', { name: /Dealing/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Dealing/ })).toBeDisabled()
  })

  test('balance formats correctly for edge amounts', async ({ page }) => {
    await page.goto('/')

    expect(await getBalance(page)).toBe(STARTING_BALANCE)

    for (const [input, expected] of [
      [0, 0],
      [100.5, 100.5],
      [0.01, 0.01],
    ] as const) {
      await page.evaluate((val) => {
        const appEl = document.querySelector('#app') as any
        const store = appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('game')
        if (store) store.balance = val
      }, input)

      expect(await getBalance(page)).toBeCloseTo(expected, 2)
    }
  })

  test('no game selected disables buy button', async ({ page }) => {
    await page.goto('/')

    const gamesRes = await page.request.get('/proxy/games')
    const gamesJson = await gamesRes.json()

    if (gamesJson.data && gamesJson.data.length > 0) {
      await page.evaluate(() => {
        const appEl = document.querySelector('#app') as any
        const store = appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('game')
        if (store) store.selectedGameId = null
      })

      await expect(page.getByRole('button', { name: /Buy Card/ })).toBeDisabled()
    }
  })
})
