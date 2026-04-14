export interface CardModifiers {
  theme: 'classic' | 'gold' | 'neon'
  texture: 'silver' | 'holographic' | 'dark'
  art: 'stars' | 'diamonds' | 'coins'
  anim: 'fade' | 'sparkle' | 'explode'
}

export interface CurrentCard {
  serial: string
  playToken: string | null
  modifiers: CardModifiers
  isSecondChance: boolean
}

export interface GameResult {
  won: boolean
  prizeAmountCents: number
  prizeTierName: string | null
}

export interface HistoryEntry {
  won: boolean
  prizeAmountCents: number
  modifiers: CardModifiers
}

export type Phase = 'lobby' | 'deal' | 'play' | 'result'
