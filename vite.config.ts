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
      '/proxy': {
        target: 'https://test-api.game.scratchee.com',
        changeOrigin: true,
        rewrite: (path) => {
          // /proxy/deal → /api/integration/deal
          // /proxy/play-token → /api/integration/play-token
          // /proxy/games → /api/integration/games
          if (path.match(/^\/proxy\/(deal|play-token|games)/)) {
            return path.replace(/^\/proxy/, '/api/integration')
          }
          // /proxy/reveal/:serial → /api/play/reveal/:serial
          // /proxy/complete/:serial → /api/play/complete/:serial
          if (path.match(/^\/proxy\/(reveal|complete)/)) {
            return path.replace(/^\/proxy/, '/api/play')
          }
          return path
        },
      },
    },
  },
})
