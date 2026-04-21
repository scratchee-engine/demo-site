import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Phase, CurrentCard, HistoryEntry, GameResult } from '../types'
import { deal, getPlayToken } from '../api/client'

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
  const selectedGameId = ref<string | null>(null)
  const availableGames = ref<Array<{ id: string; name: string }>>([])

  async function loadGames() {
    try {
      const res = await fetch('/proxy/games')
      if (!res.ok) throw new Error('Failed to load games')
      const json = await res.json() as { games: Array<{ id: string; name: string }> }
      availableGames.value = json.games
      if (json.games.length > 0 && !selectedGameId.value) {
        selectedGameId.value = json.games[0].id
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not load games'
    }
  }

  async function buyCard() {
    if (!selectedGameId.value) {
      error.value = 'No game selected'
      return
    }
    loading.value = true
    error.value = null
    balance.value -= CARD_PRICE
    try {
      const { serial } = await deal(selectedGameId.value)
      currentCard.value = {
        serial,
        playToken: null,
        cardData: null,
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
    if (!selectedGameId.value) {
      error.value = 'No game selected'
      return
    }
    loading.value = true
    error.value = null
    try {
      const { serial } = await deal(selectedGameId.value)
      secondChanceUsed.value = true
      currentCard.value = {
        serial,
        playToken: null,
        cardData: null,
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
    selectedGameId,
    availableGames,
    loadGames,
    buyCard,
    startPlay,
    completeCard,
    backToLobby,
    claimSecondChance,
  }
})
