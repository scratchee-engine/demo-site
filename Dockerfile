FROM node:22-bookworm-slim AS game-client-builder

WORKDIR /game

RUN npm install -g pnpm@10.33.0

COPY game-client/package.json ./
RUN pnpm install

COPY game-client/ ./
RUN pnpm run prepare
RUN pnpm run build:lib

FROM node:22-alpine AS demo-builder

WORKDIR /app

COPY demo-site/package.json demo-site/package-lock.json ./
RUN npm ci

COPY demo-site/ ./
# Copy game-client library build to where vite.config.ts expects it
RUN mkdir -p /game/dist
COPY --from=game-client-builder /game/dist/game-client.js /game/dist/game-client.js
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=demo-builder /app/dist ./dist
COPY --from=demo-builder /app/server.ts ./
COPY --from=demo-builder /app/package.json ./
COPY --from=demo-builder /app/node_modules ./node_modules
COPY --from=demo-builder /app/public ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "--import", "tsx", "server.ts"]
