<script setup lang="ts">
import { useGameStore } from './stores/game'
import { formatCurrency } from './utils/format'
import Lobby from './views/Lobby.vue'
import Deal from './views/Deal.vue'
import Play from './views/Play.vue'
import Result from './views/Result.vue'

const store = useGameStore()
</script>

<template>
  <div class="site">
    <header class="site-header">
      <div class="site-brand">🎴 Scratchee Demo</div>
      <div class="site-balance">
        <span class="balance-label">Balance</span>
        <span class="balance-amount">{{ formatCurrency(store.balance) }}</span>
      </div>
    </header>

    <main class="site-main">
      <Lobby v-if="store.phase === 'lobby'" />
      <Deal v-else-if="store.phase === 'deal'" />
      <Play v-else-if="store.phase === 'play'" />
      <Result v-else-if="store.phase === 'result'" />
    </main>

    <footer class="site-footer">
      Partner Integration Demo — Scratchee API
    </footer>
  </div>
</template>

<style>
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f3f4f6;
  color: #111827;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
.site {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 10;
}

.site-brand {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
}

.site-balance {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 14px;
}

.balance-label {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

.balance-amount {
  font-size: 1.05rem;
  font-weight: 800;
  color: #111827;
}

.site-main {
  flex: 1;
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 20px;
}

.site-footer {
  text-align: center;
  padding: 16px;
  font-size: 0.78rem;
  color: #9ca3af;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
</style>
