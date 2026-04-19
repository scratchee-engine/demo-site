import { test, expect } from '@playwright/test'

test.describe('Health + Infrastructure', () => {
  test('/proxy/health returns 200 with status ok', async ({ request }) => {
    const res = await request.get('/proxy/health')
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })

  test('root returns 200 and serves the Vue SPA shell', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.status()).toBe(200)
    await expect(page.locator('#app')).toBeAttached()
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('footer')).toBeVisible()
  })

  test('SPA shell renders header brand and balance', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Scratchee Demo')).toBeVisible()
    const header = page.locator('header')
    await expect(header.getByText('Balance')).toBeVisible()
    await expect(header.getByText(/\$\d+\.\d{2}/)).toBeVisible()
  })
})
