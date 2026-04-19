import { test, expect } from '@playwright/test'

test.describe('Play Flow (structural, without real cards)', () => {
  test('play view requires currentCard state to render game mount', async ({ page }) => {
    // Validates: Play.vue only renders game container when card state exists.
    // Without going through deal flow, the play phase won't activate —
    // this confirms the guard works.
    await page.goto('/')
    // Lobby should be showing, not play
    await expect(page.getByText('Scratch your card')).not.toBeVisible()
  })

  test('lobby renders buy button (Vue bundle mounted)', async ({ page }) => {
    // Validates: Vue app bundle loads and mounts successfully.
    // If the bundle or any imported component failed to build/load,
    // the Buy Card button would never appear.
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Buy Card/ })).toBeVisible({ timeout: 10_000 })
  })

  test('result view is not visible in initial state', async ({ page }) => {
    // Validates: Result.vue only renders in "result" phase
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'You Won!' })).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'No prize this time' })).not.toBeVisible()
  })

  test('game client script is bundled (Svelte import resolves)', async ({ page }) => {
    // Validates: @scratchee/game-client alias resolves in production build.
    // If the import failed, the entire Vue app would fail to mount.
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')
    // App mounted successfully = Svelte game client import resolved at build time
    await expect(page.locator('header')).toBeVisible()
    await expect(page.getByRole('button', { name: /Buy Card/ })).toBeVisible({ timeout: 10_000 })

    const importErrors = consoleErrors.filter(
      e => e.includes('game-client') || e.includes('Failed to resolve')
    )
    expect(importErrors).toHaveLength(0)
  })
})
