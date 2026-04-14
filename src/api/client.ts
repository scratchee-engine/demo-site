import type { CardModifiers } from '../types'

const THEMES = ['classic', 'gold', 'neon'] as const
const TEXTURES = ['silver', 'holographic', 'dark'] as const
const ARTS = ['stars', 'diamonds', 'coins'] as const
const ANIMS = ['fade', 'sparkle', 'explode'] as const

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomModifiers(): CardModifiers {
  return {
    theme: pick(THEMES),
    texture: pick(TEXTURES),
    art: pick(ARTS),
    anim: pick(ANIMS),
  }
}

export async function deal(gameId: string): Promise<{ serial: string }> {
  const res = await fetch('/proxy/deal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_id: gameId, count: 1 }),
  })
  if (!res.ok) throw new Error(`Deal failed (${res.status})`)
  const json = await res.json() as { data: { cards: Array<{ serial: string }> } }
  return { serial: json.data.cards[0].serial }
}

export async function getPlayToken(cardSerial: string): Promise<{ token: string }> {
  const res = await fetch('/proxy/play-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_serial: cardSerial }),
  })
  if (!res.ok) throw new Error(`Play token failed (${res.status})`)
  const json = await res.json() as { data: { token: string } }
  return { token: json.data.token }
}
