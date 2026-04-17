<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import { formatCurrency } from '../utils/format'

const store = useGameStore()

const artSymbols: Record<string, string> = {
  stars: '★',
  diamonds: '◆',
  coins: '●',
}

onMounted(() => {
  store.loadGames()
})
</script>

<template>
  <div class="lobby">
    <div class="card-offer">
      <div class="offer-title">Scratch Card</div>
      <div class="offer-subtitle">Match any winning number to win!</div>

      <div v-if="store.availableGames.length > 0" class="game-selector">
        <label for="game-select" class="game-label">Select a game:</label>
        <select
          id="game-select"
          v-model="store.selectedGameId"
          class="game-select"
        >
          <option
            v-for="game in store.availableGames"
            :key="game.id"
            :value="game.id"
          >
            {{ game.name }}
          </option>
        </select>
      </div>

      <div class="offer-price">$5.00</div>
      <button
        class="btn-primary"
        :disabled="store.balance < 5 || store.loading || !store.selectedGameId"
        @click="store.buyCard()"
      >
        {{ store.loading ? 'Dealing…' : 'Buy Card — $5' }}
      </button>
      <p v-if="store.balance < 5" class="insufficient">Insufficient balance</p>
      <p v-if="!store.selectedGameId && store.availableGames.length > 0" class="error-msg">
        Please select a game
      </p>
      <p v-if="store.error" class="error-msg">{{ store.error }}</p>
    </div>

    <div v-if="store.history.length > 0" class="history">
      <div class="history-title">Recent plays</div>
      <ul class="history-list">
        <li
          v-for="(entry, i) in store.history"
          :key="i"
          class="history-item"
          :class="entry.won ? 'history-win' : 'history-loss'"
        >
          <span class="history-outcome">
            {{ entry.won ? `Win ${formatCurrency(entry.prizeAmountCents / 100)}` : 'No prize' }}
          </span>
          <span class="history-modifiers">
            {{ entry.modifiers.theme.charAt(0).toUpperCase() + entry.modifiers.theme.slice(1) }}
            {{ artSymbols[entry.modifiers.art] }}
            {{ entry.modifiers.anim }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.lobby {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card-offer {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 28px 24px;
  text-align: center;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
}

.offer-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}

.offer-subtitle {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 16px;
}

.game-selector {
  margin-bottom: 16px;
  text-align: left;
}

.game-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.game-select {
  width: 100%;
  padding: 10px 12px;
  font-size: 0.95rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  cursor: pointer;
  transition: border-color 0.15s;
}

.game-select:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.offer-price {
  font-size: 2rem;
  font-weight: 800;
  color: #111827;
  margin-bottom: 20px;
}

.btn-primary {
  display: inline-block;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 32px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: #4338ca;
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.insufficient {
  margin: 10px 0 0;
  font-size: 0.82rem;
  color: #ef4444;
}

.error-msg {
  margin: 10px 0 0;
  font-size: 0.82rem;
  color: #ef4444;
}

.history {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px 20px;
}

.history-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
  margin-bottom: 10px;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
  padding: 6px 0;
  border-bottom: 1px solid #f3f4f6;
}

.history-item:last-child {
  border-bottom: none;
}

.history-win .history-outcome {
  font-weight: 700;
  color: #16a34a;
}

.history-loss .history-outcome {
  font-weight: 500;
  color: #6b7280;
}

.history-modifiers {
  font-size: 0.8rem;
  color: #9ca3af;
}
</style>
