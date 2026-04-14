<script setup lang="ts">
import type { CardModifiers } from '../types'

const { modifiers } = defineProps<{ modifiers: CardModifiers }>()

const labels: Record<keyof CardModifiers, string> = {
  theme: 'Theme',
  texture: 'Scratch',
  art: 'Card Art',
  anim: 'Animation',
}

const displayValue: Record<string, string> = {
  classic: 'Classic',
  gold: 'Gold',
  neon: 'Neon',
  silver: 'Silver',
  holographic: 'Holographic',
  dark: 'Dark',
  stars: 'Stars',
  diamonds: 'Diamonds',
  coins: 'Coins',
  fade: 'Fade',
  sparkle: 'Sparkle',
  explode: 'Explode',
}
</script>

<template>
  <div class="modifier-panel">
    <div class="modifier-header">CARD MODIFIERS</div>
    <div class="modifier-grid">
      <div v-for="key in (Object.keys(labels) as (keyof CardModifiers)[])" :key="key" class="modifier-row">
        <span class="modifier-label">{{ labels[key] }}</span>
        <span class="modifier-value">{{ displayValue[modifiers[key]] }}</span>
      </div>
    </div>
    <p class="modifier-note">Cosmetic only — outcome already determined by the game engine.</p>
  </div>
</template>

<style scoped>
.modifier-panel {
  border: 2px solid #374151;
  border-radius: 8px;
  overflow: hidden;
  background: #f9fafb;
}

.modifier-header {
  background: #374151;
  color: #f9fafb;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 6px 14px;
}

.modifier-grid {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modifier-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.modifier-label {
  color: #6b7280;
  font-weight: 500;
}

.modifier-value {
  font-weight: 700;
  color: #111827;
  background: #e5e7eb;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
}

.modifier-note {
  margin: 0;
  padding: 8px 14px;
  font-size: 0.75rem;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
</style>
