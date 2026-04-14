import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Phase, CurrentCard, HistoryEntry, GameResult } from '../types'
import { deal, getPlayToken, randomModifiers } from '../api/client'

const STARTING_BALANCE = 50
const CARD_PRICE = 5

export const useGameStore = defineStore('game', () => {
  const balance = ref(STARTING_BALANCE)
  const phase = ref<Phase>('lobby')
  const currentCard = ref<CurrentCard | null>(null)
  const lastResult = ref<GameResult | null>(null)
  const secondChanceUsed = ref(false)
  const history = ref<HistoryEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const GAME_ID = import.meta.env.VITE_GAME_ID as string

  async function buyCard() {
    loading.value = true
    error.value = null
    balance.value -= CARD_PRICE
    try {
      const { serial } = await deal(GAME_ID)
      currentCard.value = {
        serial,
        playToken: null,
        modifiers: randomModifiers(),
        isSecondChance: false,
      }
      phase.value = 'deal'
    } catch (e) {
      balance.value += CARD_PRICE
      error.value = e instanceof Error ? e.message : 'Deal failed. Try again.'
    } finally {
      loading.value = false
    }
  }

  async function startPlay() {
    if (!currentCard.value) return
    loading.value = true
    error.value = null
    try {
      const { token } = await getPlayToken(currentCard.value.serial)
      currentCard.value = { ...currentCard.value, playToken: token }
      phase.value = 'play'
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not start game. Try again.'
    } finally {
      loading.value = false
    }
  }

  function completeCard(won: boolean, prizeAmountCents: number, prizeTierName: string | null) {
    lastResult.value = { won, prizeAmountCents, prizeTierName }
    if (won) {
      balance.value += prizeAmountCents / 100
    }
    if (currentCard.value) {
      history.value.unshift({
        won,
        prizeAmountCents,
        modifiers: currentCard.value.modifiers,
      })
      if (history.value.length > 3) {
        history.value.pop()
      }
    }
    phase.value = 'result'
  }

  async function claimSecondChance() {
    loading.value = true
    error.value = null
    try {
      const { serial } = await deal(GAME_ID)
      secondChanceUsed.value = true
      currentCard.value = {
        serial,
        playToken: null,
        modifiers: randomModifiers(),
        isSecondChance: true,
      }
      phase.value = 'deal'
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Second chance deal failed.'
    } finally {
      loading.value = false
    }
  }

  function backToLobby() {
    currentCard.value = null
    lastResult.value = null
    error.value = null
    phase.value = 'lobby'
  }

  return {
    balance,
    phase,
    currentCard,
    lastResult,
    secondChanceUsed,
    history,
    loading,
    error,
    buyCard,
    startPlay,
    completeCard,
    backToLobby,
    claimSecondChance,
  }
})
