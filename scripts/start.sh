#!/bin/sh
# Container entrypoint script
# Starts cron daemon, runs initial scrape, then starts nginx

set -e

echo "=== GitHub Quota Viz Container Starting ==="
echo ""

# Ensure models directory exists
mkdir -p /usr/share/nginx/html

# Run initial models scrape
echo "[$(date -Iseconds)] Running initial models scrape..."
node /app/scripts/scrape-models.js || {
    echo "[$(date -Iseconds)] Warning: Initial scrape failed, will use fallback data"
}

echo ""

# Start cron daemon
echo "[$(date -Iseconds)] Starting cron daemon..."
crond -f -l 2 &
CRON_PID=$!

echo "[$(date -Iseconds)] Cron started with PID $CRON_PID"
echo ""

# Start nginx in foreground
echo "[$(date -Iseconds)] Starting nginx..."
echo ""
exec nginx -g "daemon off;"
