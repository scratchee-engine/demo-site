declare module '@scratchee/game-client' {
  import type { Component } from 'svelte'

  export interface CompleteResult {
    won: boolean
    prizeAmountCents?: number
    prizeTierName?: string
  }

  export interface GameClientProps {
    serial: string
    token: string
    api: string
    onComplete: (result: CompleteResult) => void
  }

  const GameClient: Component<GameClientProps>
  export default GameClient
}
