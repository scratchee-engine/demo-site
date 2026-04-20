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
# Copy game-client package to a sibling of /app so the alias ../game-client resolves
# AND link node_modules so svelte subpath imports resolve during bundling
RUN mkdir -p /game-client
COPY --from=game-client-builder /game/package.json /game-client/package.json
COPY --from=game-client-builder /game/dist /game-client/dist
RUN ln -s /app/node_modules /game-client/node_modules
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=demo-builder /app/dist ./dist
COPY --from=demo-builder /app/server.ts ./
COPY --from=demo-builder /app/package.json ./
COPY --from=demo-builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "--import", "tsx", "server.ts"]
