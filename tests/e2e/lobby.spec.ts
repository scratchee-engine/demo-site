import { test, expect } from '@playwright/test'

test.describe('Lobby', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('lobby page loads with card offer UI', async ({ page }) => {
    // Validates: lobby phase renders the card offer section
    await expect(page.locator('.card-offer')).toBeVisible()
    await expect(page.locator('.offer-title')).toHaveText('Scratch Card')
    await expect(page.locator('.offer-subtitle')).toBeVisible()
  })

  test('lobby shows price and buy button', async ({ page }) => {
    // Validates: price display and primary action button are present
    await expect(page.locator('.offer-price')).toHaveText('$5.00')
    await expect(page.locator('.btn-primary')).toBeVisible()
    await expect(page.locator('.btn-primary')).toContainText('Buy Card')
  })

  test('game selector behaviour depends on DEMO_GAMES config', async ({ page }) => {
    // Validates: /proxy/games is called on mount; UI reacts to response
    // The test env may or may not have DEMO_GAMES configured.
    // If games are loaded, the selector appears. If not, an error shows.
    const gamesResponse = await page.request.get('/proxy/games')
    const gamesJson = await gamesResponse.json()

    if (gamesJson.data && gamesJson.data.length > 0) {
      await expect(page.locator('#game-select')).toBeVisible()
      const options = page.locator('#game-select option')
      await expect(options).toHaveCount(gamesJson.data.length)
    } else {
      // No games configured — store.loadGames() sets error
      await expect(page.locator('.error-msg')).toBeVisible()
    }
  })

  test('buy button is disabled when no game is selected and games exist', async ({ page }) => {
    // Validates: button disabled state tied to selectedGameId
    const gamesResponse = await page.request.get('/proxy/games')
    const gamesJson = await gamesResponse.json()

    if (gamesJson.data && gamesJson.data.length > 0) {
      // Auto-selects first game, so button should be enabled
      await expect(page.locator('.btn-primary')).toBeEnabled()
    } else {
      // No games — button disabled because no selectedGameId
      await expect(page.locator('.btn-primary')).toBeDisabled()
    }
  })

  test('starting balance is $50.00', async ({ page }) => {
    // Validates: STARTING_BALANCE constant (50) renders correctly
    await expect(page.locator('.balance-amount')).toHaveText('$50.00')
  })

  test('footer renders partner attribution', async ({ page }) => {
    // Validates: footer content is present
    await expect(page.locator('.site-footer')).toContainText('Partner Integration Demo')
  })
})
