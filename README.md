# Scratchee Demo Site

Vue 3 partner integration demo. Shows the complete Scratchee integration flow: real deal + play-token API calls via a thin proxy, mocked wallet only.

## Architecture

```
Browser (Vue 3)
  │
  │  POST /proxy/deal          ←─── Vite dev server proxies to Hono proxy (port 5175)
  │  POST /proxy/play-token    ←─── Hono adds Authorization header, forwards to real API
  │
Hono Proxy (server.ts, port 5175)
  │
  │  POST /api/integration/deal
  │  POST /api/integration/play-token
  │
Scratchee API (SCRATCHEE_API_URL)
```

**What's real:** deal, play-token, and all game calls (reveal/complete) via the embedded game-client.

**What's mocked:** wallet balance ($50 start), $5 purchase deduction, balance update on win.

## Setup

```bash
cp .env.example .env
# Edit .env — set SCRATCHEE_API_KEY and SCRATCHEE_API_URL for your environment
npm install
npm run dev   # starts Hono proxy (port 5175) + Vite dev server (port 5173)
```

Open [http://localhost:5173](http://localhost:5173).

## Environment Variables

| Variable | Side | Description |
|---|---|---|
| `SCRATCHEE_API_URL` | Server | Base URL of the Scratchee API |
| `SCRATCHEE_API_KEY` | Server | Integration API key (`sk_int_*`) — never sent to browser |
| `VITE_SCRATCHEE_API_URL` | Client | API URL passed to the embedded game-client for reveal/complete calls |
| `VITE_GAME_ID` | Client | Game UUID to deal cards from |

## Player Flow

1. **Lobby** — player sees the card offer ($5.00). Clicks "Buy Card".
2. **Deal** — `POST /proxy/deal` fetches a real card serial. Cosmetic modifiers are randomly assigned. "Play Card" button fetches a play token via `POST /proxy/play-token`.
3. **Play** — game loads in an iframe with `serial`, `token`, `api`, and modifier params. The game calls reveal/complete against the real API directly.
4. **Result** — win/loss comes from the game's postMessage. Win: balance updated. Loss: one free second-chance re-deal offered.
5. **Second chance** — a fresh card at no cost, one per session. After that, player returns to lobby.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start proxy server + Vite dev server concurrently |
| `npm run server` | Start proxy server only |
| `npm run build` | Type-check + production build |
