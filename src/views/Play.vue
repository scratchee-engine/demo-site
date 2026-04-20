<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { mount, unmount } from 'svelte'
import { useGameStore } from '../stores/game'
import GameClient from '@scratchee/game-client'

const SCRATCHEE_API_URL = import.meta.env.VITE_SCRATCHEE_API_URL ?? ''
const ASSET_PACK_ID = 'b3fffd00-78ef-4858-b438-2f03dd7565aa'

const store = useGameStore()
const containerRef = ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let svelteApp: any = null

async function handleReveal() {
  const card = store.currentCard
  if (!card || !card.playToken) throw new Error('No card or play token')
  const res = await fetch(`${SCRATCHEE_API_URL}/api/play/reveal/${card.serial}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${card.playToken}` },
  })
  if (!res.ok) throw new Error(`Reveal failed (${res.status})`)
  const json = await res.json()
  return json.data
}

async function handleComplete(result: { won: boolean; prizeAmountCents?: number; prizeTierName?: string | null }) {
  const card = store.currentCard
  if (card && card.playToken) {
    try {
      await fetch(`${SCRATCHEE_API_URL}/api/play/complete/${card.serial}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${card.playToken}` },
      })
    } catch (err) {
      console.error('Complete API failed:', err)
    }
  }
  const prizeAmountCents = result.won
    ? (typeof result.prizeAmountCents === 'number' && isFinite(result.prizeAmountCents) && result.prizeAmountCents >= 0
        ? result.prizeAmountCents
        : 0)
    : 0
  const prizeTierName = typeof result.prizeTierName === 'string' ? result.prizeTierName : null
  store.completeCard(result.won, prizeAmountCents, prizeTierName)
}

onMounted(async () => {
  const card = store.currentCard
  if (!containerRef.value || !card || !card.playToken) return

  const packRes = await fetch(`${SCRATCHEE_API_URL}/api/asset-packs/${ASSET_PACK_ID}/resolve`)
  const packData = await packRes.json()

  svelteApp = mount(GameClient, {
    target: containerRef.value,
    props: {
      serial: card.serial,
      assetPack: packData.data,
      onReveal: handleReveal,
      onComplete: handleComplete,
    },
  })
})

onUnmounted(() => {
  if (svelteApp) {
    unmount(svelteApp)
    svelteApp = null
  }
})
</script>

<template>
  <div class="play">
    <div class="play-header">
      <div class="play-title">Scratch your card</div>
      <div class="play-serial">Card #{{ store.currentCard?.serial }}</div>
    </div>

    <div class="game-container">
      <div ref="containerRef" class="game-mount"></div>
    </div>
  </div>
</template>

<style scoped>
.play {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.play-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
}

.play-serial {
  font-size: 0.82rem;
  color: #9ca3af;
  font-family: monospace;
  margin-top: 2px;
}

.game-container {
  border-radius: 12px;
  overflow: hidden;
  contain: content;
  isolation: isolate;
}

.game-mount {
  width: 100%;
}
</style>
