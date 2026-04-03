# Multi-stage build
# Stage 1: build the React app and compile native Node addons (better-sqlite3)
FROM node:18-alpine AS builder

WORKDIR /app

# Native build deps for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install ALL dependencies (including devDeps for the React build)
COPY package*.json ./
RUN npm ci

# Build the React app
COPY public ./public
COPY src ./src
RUN npm run build

# Install production-only deps for the Express server (rebuilds native modules)
RUN npm ci --only=production

# ─────────────────────────────────────────────────────────────
# Stage 2: production image
FROM nginx:alpine

# Runtime deps: cron + curl only — Node 18 is copied from builder to match
# the ABI that better-sqlite3's native addon was compiled against.
RUN apk add --no-cache \
    dcron \
    curl

# Copy Node 18 runtime from builder (same binary better-sqlite3 was compiled with)
COPY --from=builder /usr/local/bin/node /usr/local/bin/node
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=builder /usr/local/bin/npm /usr/local/bin/npm

# Copy React build output
COPY --from=builder /app/build /usr/share/nginx/html

# Copy production node_modules (includes better-sqlite3 native binary from builder)
COPY --from=builder /app/node_modules /app/node_modules

# Copy application scripts and Express server
COPY scripts /app/scripts
COPY server  /app/server

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Persistent data directory for SQLite DB
RUN mkdir -p /data
VOLUME ["/data"]

# Cron job: scrape models every 24 hours at 02:00 UTC
# Use absolute path to node — dcron may not inherit a full PATH from the container environment.
RUN printf 'PATH=/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin\n0 2 * * * cd /app && /usr/local/bin/node scripts/scrape-models.js >> /var/log/cron.log 2>&1\n' > /etc/crontabs/root

# Log file for cron
RUN touch /var/log/cron.log

# Entrypoint
COPY scripts/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

ENTRYPOINT ["/start.sh"]
