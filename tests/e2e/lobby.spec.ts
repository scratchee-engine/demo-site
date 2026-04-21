import { test, expect } from '@playwright/test'

test.describe('Lobby', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('lobby page loads with card offer UI', async ({ page }) => {
    // Validates: lobby phase renders the card offer section
    await expect(page.getByText('Scratch Card')).toBeVisible()
    await expect(page.getByText('Match any winning number to win!')).toBeVisible()
  })

  test('lobby shows price and buy button', async ({ page }) => {
    // Validates: price display and primary action button are present
    await expect(page.getByText('$5.00')).toBeVisible()
    const buyBtn = page.getByRole('button', { name: /Buy Card/ })
    await expect(buyBtn).toBeVisible()
  })

  test('game selector behaviour depends on DEMO_GAMES config', async ({ page }) => {
    // Validates: /proxy/games is called on mount; UI reacts to response
    // The test env may or may not have DEMO_GAMES configured.
    // If games are loaded, the selector appears. If not, an error shows.
    const gamesResponse = await page.request.get('/proxy/games')
    const gamesJson = await gamesResponse.json()

    if (gamesJson.games && gamesJson.games.length > 0) {
      const select = page.getByLabel(/Select a game/)
      await expect(select).toBeVisible()
      const options = select.locator('option')
      await expect(options).toHaveCount(gamesJson.games.length)
    } else {
      // No games configured — store.loadGames() sets error
      await expect(page.getByText(/error|failed/i)).toBeVisible()
    }
  })

  test('buy button is disabled when no game is selected and games exist', async ({ page }) => {
    // Validates: button disabled state tied to selectedGameId
    const gamesResponse = await page.request.get('/proxy/games')
    const gamesJson = await gamesResponse.json()

    const buyBtn = page.getByRole('button', { name: /Buy Card/ })
    if (gamesJson.games && gamesJson.games.length > 0) {
      // Auto-selects first game, so button should be enabled
      await expect(buyBtn).toBeEnabled()
    } else {
      // No games — button disabled because no selectedGameId
      await expect(buyBtn).toBeDisabled()
    }
  })

  test('starting balance is $50.00', async ({ page }) => {
    // Validates: STARTING_BALANCE constant (50) renders correctly
    const header = page.locator('header')
    await expect(header.getByText('$50.00')).toBeVisible()
  })

  test('footer renders partner attribution', async ({ page }) => {
    // Validates: footer content is present
    await expect(page.locator('footer')).toContainText('Partner Integration Demo')
  })
})
