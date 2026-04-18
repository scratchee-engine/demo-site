import { type Page, type TestInfo, expect } from '@playwright/test'

export const CARD_PRICE = 5
export const STARTING_BALANCE = 50

export async function getBalance(page: Page): Promise<number> {
  const header = page.locator('header')
  const text = await header.textContent()
  const match = text?.match(/\$(\d+\.\d{2})/)
  if (!match) throw new Error(`Could not parse balance from header: "${text}"`)
  return parseFloat(match[1])
}

export async function waitForGames(page: Page): Promise<void> {
  const select = page.locator('#game-select')
  await expect(select).toBeVisible({ timeout: 10_000 })
  const count = await select.locator('option').count()
  expect(count, 'At least one demo game must be configured via DEMO_GAMES env').toBeGreaterThan(0)
}

export async function buyCard(page: Page): Promise<string> {
  const buyBtn = page.getByRole('button', { name: /Buy Card/ })
  await expect(buyBtn).toBeEnabled({ timeout: 5_000 })
  await buyBtn.click()

  const heading = page.getByRole('heading', { name: 'Your Card' })
  try {
    await expect(heading).toBeVisible({ timeout: 10_000 })
  } catch {
    const errEl = page.getByText(/failed|error/i)
    if (await errEl.isVisible({ timeout: 1_000 }).catch(() => false)) {
      throw new Error(`Deal failed: ${await errEl.textContent()}`)
    }
    throw new Error('Deal phase did not appear — heading "Your Card" not found in DOM')
  }

  await expect(page.getByText('Card ready')).toBeVisible({ timeout: 5_000 })

  const serialLine = await page.getByText(/Serial:/).textContent()
  const match = serialLine?.match(/Serial:\s*(.+)/)
  if (!match) throw new Error(`Could not extract serial from: ${serialLine}`)
  return match[1].trim()
}

export async function playToResult(
  page: Page,
  testInfo?: TestInfo
): Promise<{ won: boolean; prizeAmountCents: number; prizeTierName: string | null }> {
  await expect(page.getByText('Card ready')).toBeVisible()

  const revealPromise = page.waitForResponse(
    r => (r.url().includes('/proxy/reveal/') || r.url().includes('/api/play/reveal/')) && r.status() === 200,
    { timeout: 20_000 }
  )

  await page.getByRole('button', { name: /Play Card/ }).click()
  await expect(page.getByText('Scratch your card')).toBeVisible({ timeout: 10_000 })

  const revealResp = await revealPromise
  const revealJson = await revealResp.json()
  const revealData = revealJson.data ?? revealJson

  const completePromise = page.waitForResponse(
    r => r.url().includes('/proxy/complete/') || r.url().includes('/api/play/complete/'),
    { timeout: 25_000 }
  ).catch(() => null)

  await simulateScratch(page)

  const completeResp = await completePromise

  if (completeResp && completeResp.status() === 200) {
    const json = await completeResp.json()
    const d = json.data ?? json
    await waitForResult(page)
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
  await waitForResult(page)
  return outcome
}

async function waitForResult(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: /You Won!|No prize this time/ })
  ).toBeVisible({ timeout: 10_000 })
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
  const result = await page.evaluate(async () => {
    const appEl = document.querySelector('#app') as any
    const app = appEl?.__vue_app__
    const pinia = app?.config?.globalProperties?.$pinia
    const store = pinia?._s?.get('game')
    const serial = store?.currentCard?.serial
    const token = store?.currentCard?.playToken
    if (!serial || !token) return null

    try {
      // 1. Call reveal first (idempotent - safe even if already revealed)
      const revealRes = await fetch(
        `/proxy/reveal/${serial}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )
      const revealText = await revealRes.text()
      console.log('REVEAL:', revealRes.status, revealText)

      // 2. Then complete (requires card in revealed state)
      const completeRes = await fetch(
        `/proxy/complete/${serial}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )
      const completeText = await completeRes.text()
      console.log('COMPLETE:', completeRes.status, completeText)

      if (!completeRes.ok) {
        console.error('Complete failed:', completeRes.status, completeText)
        return null
      }
      const json = JSON.parse(completeText)
      const data = json.data ?? json
      return {
        won: data.is_winner ?? false,
        prizeAmountCents: data.prize_amount_cents ?? 0,
        prizeTierName: data.prize_tier_name ?? null
      }
    } catch (err) {
      console.error('forceComplete error:', err)
      return null
    }
  })

  await page.evaluate((r) => {
    const appEl = document.querySelector('#app') as any
    const app = appEl?.__vue_app__
    const pinia = app?.config?.globalProperties?.$pinia
    const store = pinia?._s?.get('game')
    if (r) {
      store?.completeCard?.(r.won, r.prizeAmountCents, r.prizeTierName)
    }
  }, result)
}

export async function goBackToLobby(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /Back to Lobby/i })
  await expect(btn).toBeVisible({ timeout: 5_000 })
  await btn.click()
  await expect(page.getByRole('button', { name: /Buy Card/ })).toBeVisible({ timeout: 5_000 })
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
