<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { formatCurrency } from '../utils/format'

const store = useGameStore()
</script>

<template>
  <div class="result">
    <!-- Win -->
    <template v-if="store.lastResult?.won">
      <div class="result-win">
        <div class="result-icon">🎉</div>
        <h2 class="result-title">You Won!</h2>
        <div class="prize-amount">{{ formatCurrency(store.lastResult.prizeAmountCents / 100) }}</div>
        <div v-if="store.lastResult.prizeTierName" class="prize-tier">{{ store.lastResult.prizeTierName }}</div>
        <div class="balance-line">
          Balance updated to
          <strong>{{ formatCurrency(store.balance) }}</strong>
        </div>
      </div>

      <button class="btn-secondary" @click="store.backToLobby()">← Back to Lobby</button>
    </template>

    <!-- Loss -->
    <template v-else>
      <div class="result-loss">
        <h2 class="result-title">No prize this time</h2>
        <div class="balance-line">Balance: <strong>{{ formatCurrency(store.balance) }}</strong></div>
      </div>

      <!-- Second chance offer (first loss only) -->
      <div v-if="!store.secondChanceUsed" class="second-chance-offer">
        <div class="sc-badge">🎁 FREE SECOND CHANCE</div>
        <p class="sc-text">You get one free re-deal. A fresh card with new modifiers — no charge.</p>
        <button
          class="btn-primary"
          :disabled="store.loading"
          @click="store.claimSecondChance()"
        >
          {{ store.loading ? 'Dealing…' : 'Claim Free Card →' }}
        </button>
      </div>

      <p v-else class="no-more">No more free cards this session.</p>

      <p v-if="store.error" class="error-msg">{{ store.error }}</p>

      <button class="btn-secondary skip" @click="store.backToLobby()">
        {{ store.secondChanceUsed ? '← Back to Lobby' : '← Skip, Back to Lobby' }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.result {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-win,
.result-loss {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
}

.result-icon {
  font-size: 2.5rem;
}

.result-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #111827;
  margin: 0;
}

.prize-amount {
  font-size: 2.4rem;
  font-weight: 900;
  color: #16a34a;
}

.prize-tier {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.balance-line {
  font-size: 0.95rem;
  color: #6b7280;
}

.balance-line strong {
  color: #111827;
}

.second-chance-offer {
  border: 2px solid #d97706;
  border-radius: 12px;
  padding: 20px 22px;
  background: #fffbeb;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sc-badge {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #92400e;
}

.sc-text {
  margin: 0;
  font-size: 0.9rem;
  color: #78350f;
  line-height: 1.4;
}

.btn-primary {
  background: #d97706;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  align-self: flex-start;
}

.btn-primary:hover:not(:disabled) {
  background: #b45309;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-more {
  margin: 0;
  font-size: 0.88rem;
  color: #9ca3af;
  text-align: center;
}

.error-msg {
  margin: 0;
  font-size: 0.85rem;
  color: #ef4444;
  text-align: center;
}

.btn-secondary {
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  align-self: flex-end;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.skip {
  align-self: flex-end;
}
</style>
