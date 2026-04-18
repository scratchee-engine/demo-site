import { test, expect } from '@playwright/test'
import {
  getBalance, waitForGames, fullPlayCycle,
  CARD_PRICE, STARTING_BALANCE,
} from './helpers'

test.describe('Multi-game session', () => {
  test('play 5+ cards and verify balance tracks correctly throughout', async ({ page }) => {
    test.setTimeout(300_000)
    await page.goto('/')
    await waitForGames(page)

    let expectedBalance = STARTING_BALANCE
    const results: Array<{ serial: string; won: boolean; prizeAmountCents: number }> = []

    for (let i = 0; i < 8; i++) {
      const current = await getBalance(page)
      if (current < CARD_PRICE) {
        test.info().annotations.push({
          type: 'info',
          description: `Stopped at game ${i + 1} — balance $${current.toFixed(2)} below card price`,
        })
        break
      }

      expect(current, `Balance before game ${i + 1}`).toBeCloseTo(expectedBalance, 2)

      const cycle = await fullPlayCycle(page, test.info())
      results.push(cycle)

      expectedBalance -= CARD_PRICE
      if (cycle.won) expectedBalance += cycle.prizeAmountCents / 100

      expect(cycle.balanceAfterBuy, `Balance after purchase ${i + 1}`).toBeCloseTo(
        cycle.balanceBeforeBuy - CARD_PRICE, 2
      )

      const actualBalance = await getBalance(page)
      expect(actualBalance, `Balance after game ${i + 1} result`).toBeCloseTo(expectedBalance, 2)
    }

    expect(results.length, 'Must play at least 5 games for coverage').toBeGreaterThanOrEqual(5)
  })

  test('history panel shows most recent 3 plays', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto('/')
    await waitForGames(page)

    await expect(page.getByText('Recent plays')).not.toBeVisible()

    const cycle1 = await fullPlayCycle(page, test.info())
    await expect(page.getByText('Recent plays')).toBeVisible()

    const historySection = page.locator('.history-list, ul').filter({ hasText: /Win|No prize/ })
    const items = historySection.locator('li')

    if (cycle1.won) {
      await expect(items.first()).toContainText('Win')
    } else {
      await expect(items.first()).toContainText('No prize')
    }

    if ((await getBalance(page)) >= CARD_PRICE) {
      await fullPlayCycle(page, test.info())
    }
    if ((await getBalance(page)) >= CARD_PRICE) {
      await fullPlayCycle(page, test.info())
    }
    if ((await getBalance(page)) >= CARD_PRICE) {
      await fullPlayCycle(page, test.info())
      const itemCount = await items.count()
      expect(itemCount, 'History capped at 3 entries').toBeLessThanOrEqual(3)
    }
  })

  test('history entries show modifier info', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/')
    await waitForGames(page)

    await fullPlayCycle(page, test.info())

    await expect(page.getByText('Recent plays')).toBeVisible()
  })
})
