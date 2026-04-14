import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'

const API_URL = process.env.SCRATCHEE_API_URL ?? 'http://localhost:3000'
const API_KEY = process.env.SCRATCHEE_API_KEY ?? ''
const ALLOWED_ORIGIN = process.env.PROXY_ALLOWED_ORIGIN ?? 'http://localhost:5173'
const PORT = 5175

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

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`)
})
