import { test, expect } from '@playwright/test'

test.describe('Navigation + SPA Routing', () => {
  test('root path renders lobby phase', async ({ page }) => {
    // Validates: default route renders Lobby view (phase === "lobby")
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Buy Card/ })).toBeVisible()
    // No deal, play, or result views visible
    await expect(page.getByRole('heading', { name: 'Your Card' })).not.toBeVisible()
    await expect(page.getByText('Scratch your card')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /You Won!|No prize this time/ })).not.toBeVisible()
  })

  test('arbitrary path serves SPA (no 404 from server)', async ({ page }) => {
    // Validates: server.ts catch-all serves index.html for client-side routing
    const res = await page.goto('/some/nonexistent/path')
    expect(res?.status()).toBe(200)
    // App root mount present
    await expect(page.locator('#app')).toBeAttached()
  })

  test('static assets serve correctly', async ({ request }) => {
    // Validates: vite-built JS/CSS bundles are served from /assets/
    const html = await request.get('/')
    const body = await html.text()

    const jsMatch = body.match(/src="(\/assets\/[^"]+\.js)"/)
    const cssMatch = body.match(/href="(\/assets\/[^"]+\.css)"/)

    if (jsMatch) {
      const jsRes = await request.get(jsMatch[1])
      expect(jsRes.status()).toBe(200)
      expect(jsRes.headers()['content-type']).toContain('javascript')
    }

    if (cssMatch) {
      const cssRes = await request.get(cssMatch[1])
      expect(cssRes.status()).toBe(200)
      expect(cssRes.headers()['content-type']).toContain('css')
    }
  })

  test('page title is set correctly', async ({ page }) => {
    // Validates: HTML <title> from index.html
    await page.goto('/')
    await expect(page).toHaveTitle('Scratchee Demo — Partner Site')
  })

  test('meta viewport is set for mobile', async ({ page }) => {
    // Validates: responsive viewport meta tag
    await page.goto('/')
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute('content', /width=device-width/)
  })
})
