import 'dotenv/config'
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
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Integration routes need the API key
            if (req.url?.match(/^\/(proxy\/)?(deal|play-token|games)/)) {
              const apiKey = process.env.SCRATCHEE_API_KEY || 'sk_int_d3609da8d024cafa2d81cca8b30df5c8f24fa6735cce59cd7aa557715787185d'
              proxyReq.setHeader('Authorization', `Bearer ${apiKey}`)
            }
            // Play routes (reveal, complete) pass through browser's Authorization header
            // (already forwarded by Vite proxy)
          })
        },
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
