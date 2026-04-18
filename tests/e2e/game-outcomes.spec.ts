import { test, expect } from '@playwright/test'
import {
  getBalance, waitForGames, buyCard, playToResult, goBackToLobby,
  CARD_PRICE, STARTING_BALANCE,
} from './helpers'

test.describe('Game Outcomes — wins, losses, and balance', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGames(page)
  })

  test('loss shows "No prize" and balance stays at post-purchase level', async ({ page }) => {
    const before = await getBalance(page)
    await buyCard(page)
    const afterBuy = await getBalance(page)
    expect(afterBuy).toBeCloseTo(before - CARD_PRICE, 2)

    const result = await playToResult(page, test.info())

    if (!result.won) {
      await expect(page.getByRole('heading', { name: 'No prize this time' })).toBeVisible()
      expect(await getBalance(page)).toBeCloseTo(afterBuy, 2)
    } else {
      await expect(page.getByRole('heading', { name: 'You Won!' })).toBeVisible()
      expect(await getBalance(page)).toBeCloseTo(
        afterBuy + result.prizeAmountCents / 100, 2
      )
    }
  })

  test('losses do not return balance across multiple plays', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      if ((await getBalance(page)) < CARD_PRICE) break

      const before = await getBalance(page)
      await buyCard(page)
      const afterBuy = await getBalance(page)
      expect(afterBuy).toBeCloseTo(before - CARD_PRICE, 2)

      const result = await playToResult(page, test.info())
      const afterPlay = await getBalance(page)
      const storeBalance = await page.evaluate(() => {
        const appEl = document.querySelector('#app') as any
        return appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('game')?.balance ?? 0
      })

      if (!result.won) {
        expect(result.won).toBe(false)
        expect(afterPlay, `Loss on card ${i + 1} must not increase balance`).toBeCloseTo(afterBuy, 2)
        expect(storeBalance).toBeCloseTo(afterBuy, 2)
      } else {
        expect(result.won).toBe(true)
        expect(result.prizeAmountCents).toBeGreaterThan(0)
        expect(afterPlay).toBeCloseTo(afterBuy + result.prizeAmountCents / 100, 2)
        expect(storeBalance).toBeCloseTo(afterBuy + result.prizeAmountCents / 100, 2)
      }

      await goBackToLobby(page)
    }
  })

  test('win shows prize amount and increases balance', async ({ page }) => {
    let foundWin = false

    for (let i = 0; i < 20 && !foundWin; i++) {
      if ((await getBalance(page)) < CARD_PRICE) break

      await buyCard(page)
      const afterBuy = await getBalance(page)
      const result = await playToResult(page, test.info())

      if (result.won) {
        foundWin = true

        expect(result.won).toBe(true)
        expect(result.prizeAmountCents).toBeGreaterThan(0)

        const afterWin = await getBalance(page)
        const storeBalance = await page.evaluate(() => {
          const appEl = document.querySelector('#app') as any
          return appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('game')?.balance ?? 0
        })

        expect(afterWin).toBeCloseTo(afterBuy + result.prizeAmountCents / 100, 2)
        expect(storeBalance).toBeCloseTo(afterBuy + result.prizeAmountCents / 100, 2)
      }

      await goBackToLobby(page)
    }

    if (!foundWin) {
      test.info().annotations.push({
        type: 'warning',
        description: 'No winning card found in 20 attempts — game may have very few winners',
      })
    }
  })

  test('win result displays prize tier name', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      if ((await getBalance(page)) < CARD_PRICE) break

      await buyCard(page)
      const result = await playToResult(page, test.info())

      if (result.won && result.prizeTierName) {
        expect(result.won).toBe(true)
        expect(result.prizeTierName).toBeTruthy()
        expect(typeof result.prizeTierName).toBe('string')

        const storeResult = await page.evaluate(() => {
          const appEl = document.querySelector('#app') as any
          return appEl?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('game')?.lastResult ?? null
        })

        expect(storeResult).not.toBeNull()
        expect(storeResult.won).toBe(true)
        expect(storeResult.prizeTierName).toBe(result.prizeTierName)
        return
      }

      await goBackToLobby(page)
    }

    test.info().annotations.push({
      type: 'warning',
      description: 'No win with prize tier name found — could not verify tier display',
    })
  })

  test('result page shows current balance', async ({ page }) => {
    await buyCard(page)
    await playToResult(page, test.info())

    const balanceLine = page.locator('.result').getByText(/Balance/)
    await expect(balanceLine).toBeVisible()

    const headerBalance = await getBalance(page)
    const lineText = await balanceLine.textContent()
    const match = lineText?.match(/\$(\d+\.\d{2})/)
    if (match) {
      expect(parseFloat(match[1])).toBeCloseTo(headerBalance, 2)
    }
  })
})
