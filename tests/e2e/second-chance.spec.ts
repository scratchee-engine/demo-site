import { test, expect } from '@playwright/test'
import {
  getBalance, waitForGames, buyCard, playToResult, goBackToLobby,
  CARD_PRICE,
} from './helpers'

test.describe('Second Chance Cards', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForGames(page)
  })

  test('second chance offered after first loss', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      if ((await getBalance(page)) < CARD_PRICE) break

      await buyCard(page)
      const result = await playToResult(page, test.info())

      if (!result.won) {
        await expect(page.locator('.second-chance-offer')).toBeVisible()
        await expect(page.locator('.sc-badge')).toContainText('FREE SECOND CHANCE')
        await expect(page.locator('.sc-text')).toContainText('free re-deal')

        const claimBtn = page.locator('.second-chance-offer .btn-primary')
        await expect(claimBtn).toBeVisible()
        await expect(claimBtn).toContainText('Claim Free Card')
        return
      }

      await goBackToLobby(page)
    }

    test.fail(true, 'All cards were winners — could not test second chance offer')
  })

  test('claiming second chance deals a free card (no balance charge)', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      if ((await getBalance(page)) < CARD_PRICE) break

      await buyCard(page)
      const result = await playToResult(page, test.info())

      if (!result.won) {
        const balanceBefore = await getBalance(page)

        await page.locator('.second-chance-offer .btn-primary').click()

        await expect(page.locator('.deal')).toBeVisible({ timeout: 10_000 })
        await expect(page.locator('.deal-title.second-chance')).toBeVisible()
        await expect(page.locator('.deal-title.second-chance')).toHaveText('Your Free Second Chance')

        expect(await getBalance(page), 'Balance must not decrease for free card').toBeCloseTo(
          balanceBefore, 2
        )

        await expect(page.locator('.ready-badge')).toBeVisible({ timeout: 5_000 })
        const serial = await page.locator('.serial-line code').textContent()
        expect(serial, 'Second chance card must have a serial').toBeTruthy()
        return
      }

      await goBackToLobby(page)
    }

    test.fail(true, 'Could not trigger second chance — all cards were winners')
  })

  test('second chance card plays through to result', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      if ((await getBalance(page)) < CARD_PRICE) break

      await buyCard(page)
      const result = await playToResult(page, test.info())

      if (!result.won) {
        const balanceBefore = await getBalance(page)

        await page.locator('.second-chance-offer .btn-primary').click()
        await expect(page.locator('.deal')).toBeVisible({ timeout: 10_000 })
        await expect(page.locator('.ready-badge')).toBeVisible({ timeout: 5_000 })

        const scResult = await playToResult(page, test.info())
        const balanceAfter = await getBalance(page)

        if (scResult.won) {
          expect(balanceAfter).toBeCloseTo(
            balanceBefore + scResult.prizeAmountCents / 100, 2
          )
          await expect(page.locator('.result-win')).toBeVisible()
        } else {
          expect(balanceAfter).toBeCloseTo(balanceBefore, 2)
          await expect(page.locator('.result-loss')).toBeVisible()
        }
        return
      }

      await goBackToLobby(page)
    }

    test.fail(true, 'Could not trigger second chance play — all cards were winners')
  })

  test('second chance is single-use per session', async ({ page }) => {
    let usedSC = false

    for (let i = 0; i < 20; i++) {
      if ((await getBalance(page)) < CARD_PRICE) break

      await buyCard(page)
      const result = await playToResult(page, test.info())

      if (!result.won && !usedSC) {
        await expect(page.locator('.second-chance-offer')).toBeVisible()
        await page.locator('.second-chance-offer .btn-primary').click()

        await expect(page.locator('.deal')).toBeVisible({ timeout: 10_000 })
        await expect(page.locator('.ready-badge')).toBeVisible({ timeout: 5_000 })

        const scResult = await playToResult(page, test.info())
        usedSC = true

        if (!scResult.won) {
          await expect(page.locator('.second-chance-offer')).not.toBeVisible()
          await expect(page.locator('.no-more')).toBeVisible()
          await expect(page.locator('.no-more')).toHaveText('No more free cards this session.')
          return
        }

        await goBackToLobby(page)
        continue
      }

      if (!result.won && usedSC) {
        await expect(page.locator('.second-chance-offer')).not.toBeVisible()
        await expect(page.locator('.no-more')).toBeVisible()
        return
      }

      await goBackToLobby(page)
    }

    if (!usedSC) {
      test.fail(true, 'Could not get any losses to verify single-use constraint')
    }
  })

  test('skipping second chance preserves the offer for next loss', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      if ((await getBalance(page)) < CARD_PRICE) break

      await buyCard(page)
      const result = await playToResult(page, test.info())

      if (!result.won) {
        await expect(page.locator('.second-chance-offer')).toBeVisible()

        const skipBtn = page.locator('.btn-secondary.skip')
        await expect(skipBtn).toBeVisible()
        await expect(skipBtn).toContainText('Skip, Back to Lobby')
        await skipBtn.click()

        await expect(page.locator('.card-offer')).toBeVisible({ timeout: 5_000 })

        for (let j = 0; j < 20; j++) {
          if ((await getBalance(page)) < CARD_PRICE) break

          await buyCard(page)
          const result2 = await playToResult(page, test.info())

          if (!result2.won) {
            await expect(
              page.locator('.second-chance-offer'),
              'Second chance should still be available after skip'
            ).toBeVisible()
            return
          }

          await goBackToLobby(page)
        }

        test.info().annotations.push({
          type: 'warning',
          description: 'Could not get a second loss to verify skip-then-reoffer',
        })
        return
      }

      await goBackToLobby(page)
    }

    test.fail(true, 'Could not trigger any losses')
  })

  test('loss result "Back to Lobby" button text changes after second chance used', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      if ((await getBalance(page)) < CARD_PRICE) break

      await buyCard(page)
      const result = await playToResult(page, test.info())

      if (!result.won) {
        const backBtnBefore = page.locator('.btn-secondary.skip')
        await expect(backBtnBefore).toContainText('Skip, Back to Lobby')

        await page.locator('.second-chance-offer .btn-primary').click()
        await expect(page.locator('.deal')).toBeVisible({ timeout: 10_000 })
        await expect(page.locator('.ready-badge')).toBeVisible({ timeout: 5_000 })

        const scResult = await playToResult(page, test.info())

        if (!scResult.won) {
          const backBtnAfter = page.locator('.btn-secondary')
          await expect(backBtnAfter).toContainText('Back to Lobby')
          await expect(backBtnAfter).not.toContainText('Skip')
          return
        }

        await goBackToLobby(page)
        continue
      }

      await goBackToLobby(page)
    }

    test.info().annotations.push({
      type: 'warning',
      description: 'Could not verify button text change — insufficient losses',
    })
  })
})
