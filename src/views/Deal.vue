<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import ModifierPanel from '../components/ModifierPanel.vue'

const store = useGameStore()
const ready = ref(false)

onMounted(() => {
  setTimeout(() => {
    ready.value = true
  }, 1000)
})
</script>

<template>
  <div class="deal">
    <button class="back-link" @click="store.backToLobby()">← Back</button>

    <div class="deal-header">
      <h2 v-if="store.currentCard?.isSecondChance" class="deal-title second-chance">
        Your Free Second Chance
      </h2>
      <h2 v-else class="deal-title">Your Card</h2>
    </div>

    <div v-if="!ready" class="dealing">
      <span class="dealing-text">Dealing your card</span>
      <span class="dots"><span>.</span><span>.</span><span>.</span></span>
    </div>

    <template v-else-if="store.currentCard">
      <div class="ready-badge">✓ Card ready!</div>

      <div class="serial-line">Serial: <code>{{ store.currentCard.serial }}</code></div>

      <ModifierPanel v-if="store.currentCard.modifiers" :modifiers="store.currentCard.modifiers" />

      <p v-if="store.error" class="error-msg">{{ store.error }}</p>

      <button
        class="btn-primary"
        :disabled="store.loading"
        @click="store.startPlay()"
      >
        {{ store.loading ? 'Starting game…' : 'Play Card →' }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.deal {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.back-link {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  text-align: left;
  width: fit-content;
}

.back-link:hover {
  color: #111827;
}

.deal-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.deal-title.second-chance {
  color: #d97706;
}

.dealing {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 1rem;
  color: #6b7280;
  padding: 32px 0;
}

.dealing-text {
  font-style: italic;
}

.dots span {
  display: inline-block;
  animation: blink 1.2s infinite;
  font-weight: 700;
  color: #4f46e5;
}

.dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}

.ready-badge {
  font-size: 0.9rem;
  font-weight: 700;
  color: #16a34a;
}

.serial-line {
  font-size: 0.82rem;
  color: #9ca3af;
}

.serial-line code {
  color: #374151;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.error-msg {
  margin: 0;
  font-size: 0.85rem;
  color: #ef4444;
}

.btn-primary {
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 14px 32px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  align-self: flex-end;
}

.btn-primary:hover:not(:disabled) {
  background: #4338ca;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
