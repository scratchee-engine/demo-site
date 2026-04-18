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
        await expect(page.getByText('FREE SECOND CHANCE')).toBeVisible()
        await expect(page.getByText(/free re-deal/)).toBeVisible()

        const claimBtn = page.getByRole('button', { name: /Claim Free Card/ })
        await expect(claimBtn).toBeVisible()
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

        await page.getByRole('button', { name: /Claim Free Card/ }).click()

        await expect(
          page.getByRole('heading', { name: 'Your Free Second Chance' })
        ).toBeVisible({ timeout: 10_000 })

        expect(await getBalance(page), 'Balance must not decrease for free card').toBeCloseTo(
          balanceBefore, 2
        )

        await expect(page.getByText('Card ready')).toBeVisible({ timeout: 5_000 })

        const serialLine = await page.getByText(/Serial:/).textContent()
        expect(serialLine, 'Second chance card must have a serial').toBeTruthy()
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

        await page.getByRole('button', { name: /Claim Free Card/ }).click()
        await expect(
          page.getByRole('heading', { name: 'Your Free Second Chance' })
        ).toBeVisible({ timeout: 10_000 })
        await expect(page.getByText('Card ready')).toBeVisible({ timeout: 5_000 })

        const scResult = await playToResult(page, test.info())
        const balanceAfter = await getBalance(page)

        if (scResult.won) {
          expect(balanceAfter).toBeCloseTo(
            balanceBefore + scResult.prizeAmountCents / 100, 2
          )
          await expect(page.getByRole('heading', { name: 'You Won!' })).toBeVisible()
        } else {
          expect(balanceAfter).toBeCloseTo(balanceBefore, 2)
          await expect(page.getByRole('heading', { name: 'No prize this time' })).toBeVisible()
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
        await expect(page.getByText('FREE SECOND CHANCE')).toBeVisible()
        await page.getByRole('button', { name: /Claim Free Card/ }).click()

        await expect(
          page.getByRole('heading', { name: 'Your Free Second Chance' })
        ).toBeVisible({ timeout: 10_000 })
        await expect(page.getByText('Card ready')).toBeVisible({ timeout: 5_000 })

        const scResult = await playToResult(page, test.info())
        usedSC = true

        if (!scResult.won) {
          await expect(page.getByText('FREE SECOND CHANCE')).not.toBeVisible()
          await expect(page.getByText('No more free cards this session.')).toBeVisible()
          return
        }

        await goBackToLobby(page)
        continue
      }

      if (!result.won && usedSC) {
        await expect(page.getByText('FREE SECOND CHANCE')).not.toBeVisible()
        await expect(page.getByText('No more free cards this session.')).toBeVisible()
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
        await expect(page.getByText('FREE SECOND CHANCE')).toBeVisible()

        const skipBtn = page.getByRole('button', { name: /Skip.*Back to Lobby/i })
        await expect(skipBtn).toBeVisible()
        await skipBtn.click()

        await expect(page.getByRole('button', { name: /Buy Card/ })).toBeVisible({ timeout: 5_000 })

        for (let j = 0; j < 20; j++) {
          if ((await getBalance(page)) < CARD_PRICE) break

          await buyCard(page)
          const result2 = await playToResult(page, test.info())

          if (!result2.won) {
            await expect(
              page.getByText('FREE SECOND CHANCE'),
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

  test('back button text changes after second chance used', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      if ((await getBalance(page)) < CARD_PRICE) break

      await buyCard(page)
      const result = await playToResult(page, test.info())

      if (!result.won) {
        await expect(page.getByRole('button', { name: /Skip.*Back to Lobby/i })).toBeVisible()

        await page.getByRole('button', { name: /Claim Free Card/ }).click()
        await expect(
          page.getByRole('heading', { name: 'Your Free Second Chance' })
        ).toBeVisible({ timeout: 10_000 })
        await expect(page.getByText('Card ready')).toBeVisible({ timeout: 5_000 })

        const scResult = await playToResult(page, test.info())

        if (!scResult.won) {
          const backBtn = page.getByRole('button', { name: /Back to Lobby/i })
          await expect(backBtn).toBeVisible()
          const btnText = await backBtn.textContent()
          expect(btnText).not.toMatch(/Skip/)
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
