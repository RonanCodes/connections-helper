# syntax=docker/dockerfile:1.7
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
COPY server ./server

RUN bun run build


FROM oven/bun:1-slim AS runtime
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile || bun install --production

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server

RUN mkdir -p /app/data
VOLUME ["/app/data"]

ENV NODE_ENV=production
ENV PORT=3006
EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3006/api/stats || exit 1

CMD ["bun", "run", "server/index.ts"]
