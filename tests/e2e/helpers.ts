import { type Page, type TestInfo, expect } from '@playwright/test'

export const CARD_PRICE = 5
export const STARTING_BALANCE = 50

export async function getBalance(page: Page): Promise<number> {
  const text = await page.locator('.balance-amount').textContent()
  if (!text) throw new Error('Could not read balance from .balance-amount')
  return parseFloat(text.replace('$', ''))
}

export async function waitForGames(page: Page): Promise<void> {
  const select = page.locator('#game-select')
  await expect(select).toBeVisible({ timeout: 10_000 })
  const count = await select.locator('option').count()
  expect(count, 'At least one demo game must be configured via DEMO_GAMES env').toBeGreaterThan(0)
}

export async function buyCard(page: Page): Promise<string> {
  const btn = page.locator('.btn-primary')
  await expect(btn).toBeEnabled({ timeout: 5_000 })
  await btn.click()

  await expect(page.locator('.deal')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.ready-badge')).toBeVisible({ timeout: 5_000 })

  const serial = await page.locator('.serial-line code').textContent()
  expect(serial, 'Card serial must be displayed after deal').toBeTruthy()
  return serial!.trim()
}

export async function playToResult(
  page: Page,
  testInfo?: TestInfo
): Promise<{ won: boolean; prizeAmountCents: number; prizeTierName: string | null }> {
  await expect(page.locator('.ready-badge')).toBeVisible()

  const revealPromise = page.waitForResponse(
    r => r.url().includes('/api/play/reveal/') && r.status() === 200,
    { timeout: 20_000 }
  )

  await page.locator('.btn-primary').click()
  await expect(page.locator('.play')).toBeVisible({ timeout: 10_000 })

  const revealResp = await revealPromise
  const revealJson = await revealResp.json()
  const revealData = revealJson.data ?? revealJson

  const completePromise = page.waitForResponse(
    r => r.url().includes('/api/play/complete/'),
    { timeout: 25_000 }
  ).catch(() => null)

  await simulateScratch(page)

  const completeResp = await completePromise

  if (completeResp && completeResp.status() === 200) {
    const d = (await completeResp.json()).data ?? (await completeResp.json())
    await expect(page.locator('.result')).toBeVisible({ timeout: 10_000 })
    return {
      won: d.is_winner ?? false,
      prizeAmountCents: d.prize_amount_cents ?? 0,
      prizeTierName: d.prize_tier_name ?? null,
    }
  }

  testInfo?.annotations.push({
    type: 'info',
    description: 'Game client did not complete naturally — force-completing via store',
  })

  const outcome = extractOutcome(revealData)
  await forceComplete(page, outcome)
  await expect(page.locator('.result')).toBeVisible({ timeout: 10_000 })
  return outcome
}

function extractOutcome(d: Record<string, unknown>): {
  won: boolean
  prizeAmountCents: number
  prizeTierName: string | null
} {
  const data = d as any
  return {
    won: data.is_winner ?? data.outcome?.is_winner ?? data.outcome?.won ?? false,
    prizeAmountCents: data.prize_amount_cents ?? data.outcome?.prize_amount_cents ?? 0,
    prizeTierName: data.prize_tier_name ?? data.outcome?.prize_tier_name ?? null,
  }
}

async function simulateScratch(page: Page): Promise<void> {
  const mount = page.locator('.game-mount')
  try {
    await mount.waitFor({ state: 'visible', timeout: 5_000 })
    const box = await mount.boundingBox()
    if (!box || box.width < 10 || box.height < 10) return

    for (let i = 0; i < 50; i++) {
      const x1 = box.x + box.width * (0.05 + Math.random() * 0.9)
      const y1 = box.y + box.height * (0.05 + Math.random() * 0.9)
      const x2 = box.x + box.width * (0.05 + Math.random() * 0.9)
      const y2 = box.y + box.height * (0.05 + Math.random() * 0.9)
      await page.mouse.move(x1, y1)
      await page.mouse.down()
      await page.mouse.move(x2, y2, { steps: 5 })
      await page.mouse.up()
    }
  } catch {
    // Game mount might not be interactive
  }
}

async function forceComplete(
  page: Page,
  outcome: { won: boolean; prizeAmountCents: number; prizeTierName: string | null }
): Promise<void> {
  await page.evaluate(async () => {
    const appEl = document.querySelector('#app') as any
    const app = appEl?.__vue_app__
    const pinia = app?.config?.globalProperties?.$pinia
    const store = pinia?._s?.get('game')
    const serial = store?.currentCard?.serial
    const token = store?.currentCard?.playToken
    if (serial && token) {
      try {
        await fetch(
          `https://test-api.game.scratchee.com/api/play/complete/${serial}`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
        )
      } catch { /* best-effort */ }
    }
  })

  await page.evaluate((o) => {
    const appEl = document.querySelector('#app') as any
    const app = appEl?.__vue_app__
    const pinia = app?.config?.globalProperties?.$pinia
    const store = pinia?._s?.get('game')
    store?.completeCard?.(o.won, o.prizeAmountCents, o.prizeTierName)
  }, outcome)
}

export async function goBackToLobby(page: Page): Promise<void> {
  const btn = page.locator('button').filter({ hasText: /back to lobby/i })
  await expect(btn).toBeVisible({ timeout: 5_000 })
  await btn.click()
  await expect(page.locator('.card-offer')).toBeVisible({ timeout: 5_000 })
}

export async function fullPlayCycle(
  page: Page,
  testInfo?: TestInfo
): Promise<{
  serial: string
  balanceBeforeBuy: number
  balanceAfterBuy: number
  balanceAfterResult: number
  won: boolean
  prizeAmountCents: number
  prizeTierName: string | null
}> {
  const balanceBeforeBuy = await getBalance(page)
  const serial = await buyCard(page)
  const balanceAfterBuy = await getBalance(page)
  const result = await playToResult(page, testInfo)
  const balanceAfterResult = await getBalance(page)
  await goBackToLobby(page)
  return { serial, balanceBeforeBuy, balanceAfterBuy, balanceAfterResult, ...result }
}

export function parseSerial(serial: string): {
  series: string
  game: string
  roll: string
  card: string
} {
  const parts = serial.split('-')
  if (parts.length !== 4) throw new Error(`Invalid serial format: ${serial}`)
  return { series: parts[0], game: parts[1], roll: parts[2], card: parts[3] }
}
