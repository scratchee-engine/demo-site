import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@scratchee/game-client': path.resolve(__dirname, '../game-client/dist/game-client.js'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/proxy': 'http://localhost:5175',
    },
  },
})
