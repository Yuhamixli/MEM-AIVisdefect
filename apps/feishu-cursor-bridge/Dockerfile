# DaoCloud mirror: Synology often cannot reach registry-1.docker.io in CN
FROM docker.m.daocloud.io/library/node:22-bookworm-slim

# Invalidate DSM/docker layer cache when CACHEBUST changes
ARG CACHEBUST=1
RUN echo "cachebust=$CACHEBUST"

WORKDIR /app

# Native bits for @cursor/sdk (sqlite) — keep image lean but usable
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
# .npmrc → registry.npmmirror.com + longer fetch timeouts
RUN npm ci --no-audit --no-fund

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts

# Compile to dist/ so runtime does not depend on tsx or bind-mounted ./src
RUN npm run build \
  && npm prune --omit=dev \
  && test -f dist/index.js

ENV NODE_ENV=production
ENV CURSOR_RUNTIME=cloud
ENV HEALTH_PORT=8787
ENV RECENT_CHAT_LIMIT=40

EXPOSE 8787

# Watchdog keeps the Feishu WS child alive; logs → /app/.data/watchdog.log
CMD ["npm", "run", "watchdog"]
