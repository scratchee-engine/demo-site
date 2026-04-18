import { test, expect } from '@playwright/test'
import {
  getBalance, waitForGames, buyCard, playToResult, goBackToLobby,
  parseSerial, CARD_PRICE, STARTING_BALANCE,
} from './helpers'

test.describe('Card Purchase — dealing and balance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGames(page)
  })

  test('buying a card decreases balance by $5', async ({ page }) => {
    const before = await getBalance(page)
    expect(before).toBe(STARTING_BALANCE)

    await buyCard(page)

    const after = await getBalance(page)
    expect(after).toBeCloseTo(before - CARD_PRICE, 2)
  })

  test('buying multiple cards decreases balance cumulatively', async ({ page }) => {
    test.setTimeout(120_000)

    for (let i = 0; i < 3; i++) {
      const expected = STARTING_BALANCE - CARD_PRICE * i
      expect(await getBalance(page)).toBeCloseTo(expected, 2)

      await buyCard(page)
      expect(await getBalance(page)).toBeCloseTo(expected - CARD_PRICE, 2)

      await playToResult(page, test.info())
      await goBackToLobby(page)
    }
  })

  test('header balance updates immediately on purchase', async ({ page }) => {
    await buyCard(page)
    await expect(page.locator('.balance-amount')).toHaveText('$45.00')
  })

  test('deal failure refunds balance', async ({ page }) => {
    await page.route('**/proxy/deal', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INTERNAL', message: 'Test error' } }),
      })
    )

    const before = await getBalance(page)
    await page.locator('.btn-primary').click()

    await expect(page.locator('.error-msg')).toBeVisible({ timeout: 5_000 })
    expect(await getBalance(page)).toBeCloseTo(before, 2)
  })

  test('buy button disabled when balance insufficient', async ({ page }) => {
    await page.evaluate(() => {
      const appEl = document.querySelector('#app') as any
      const store = appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('game')
      if (store) store.balance = 3
    })

    await expect(page.locator('.balance-amount')).toHaveText('$3.00')
    await expect(page.locator('.btn-primary')).toBeDisabled()
    await expect(page.locator('.insufficient')).toBeVisible()
    await expect(page.locator('.insufficient')).toHaveText('Insufficient balance')
  })
})

test.describe('Sequential card allocation', () => {
  test('consecutive deals return sequential card positions', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/')
    await waitForGames(page)

    const serials: string[] = []
    for (let i = 0; i < 3; i++) {
      const serial = await buyCard(page)
      serials.push(serial)
      await playToResult(page, test.info())
      await goBackToLobby(page)
    }

    const parsed = serials.map(parseSerial)

    for (let i = 0; i < parsed.length; i++) {
      expect(parsed[i].series).toBe(parsed[0].series)
      expect(parsed[i].game).toBe(parsed[0].game)
    }

    for (let i = 1; i < parsed.length; i++) {
      const prevCard = parseInt(parsed[i - 1].card, 10)
      const currCard = parseInt(parsed[i].card, 10)
      const prevRoll = parseInt(parsed[i - 1].roll, 10)
      const currRoll = parseInt(parsed[i].roll, 10)

      if (currRoll === prevRoll) {
        expect(currCard, `Card ${i + 1} should follow card ${i} within same roll`).toBe(prevCard + 1)
      } else {
        expect(currRoll, `Roll should increment when card position resets`).toBe(prevRoll + 1)
        expect(currCard, `First card in new roll should be position 1`).toBe(1)
      }
    }
  })

  test('card serial has valid 4-part format', async ({ page }) => {
    await page.goto('/')
    await waitForGames(page)

    const serial = await buyCard(page)
    const parts = serial.split('-')
    expect(parts).toHaveLength(4)
    for (const part of parts) {
      expect(part).toMatch(/^\d+$/)
    }
  })
})
