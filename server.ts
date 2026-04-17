import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'fs'
import { join } from 'path'

const API_URL = process.env.SCRATCHEE_API_URL ?? 'http://localhost:3000'
const API_KEY = process.env.SCRATCHEE_API_KEY ?? ''
const ALLOWED_ORIGIN = process.env.PROXY_ALLOWED_ORIGIN ?? 'http://localhost:5173'
const PORT = parseInt(process.env.PORT ?? '5175', 10)

// Parse comma-separated game IDs from env
const DEMO_GAMES = (process.env.DEMO_GAMES ?? '').split(',').filter(g => g.trim()).map(g => g.trim())

const app = new Hono()

app.use('/proxy/*', cors({ origin: ALLOWED_ORIGIN }))

async function proxyPost(path: string, body: string): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body,
  })
}

app.post('/proxy/deal', async (c) => {
  const body = await c.req.text()
  const upstream = await proxyPost('/api/integration/deal', body)
  const data = await upstream.json()
  return new Response(JSON.stringify(data), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
})

app.post('/proxy/play-token', async (c) => {
  const body = await c.req.text()
  const upstream = await proxyPost('/api/integration/play-token', body)
  const data = await upstream.json()
  return new Response(JSON.stringify(data), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
})

app.get('/proxy/games', (c) => {
  if (DEMO_GAMES.length === 0) {
    return c.json({ error: 'No games configured. Set DEMO_GAMES env var.' }, 500)
  }
  return c.json({
    data: DEMO_GAMES.map(id => ({ id, name: `Game ${id.slice(0, 8)}` }))
  })
})

app.get('/proxy/health', (c) => {
  return c.json({ status: 'ok' })
})

app.use('/assets/*', serveStatic({ root: './dist' }))
app.use('/*', serveStatic({ root: './dist' }))

app.get('/*', (c) => {
  const html = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf-8')
  return c.html(html)
})

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Demo site server running on http://localhost:${PORT}`)
})
