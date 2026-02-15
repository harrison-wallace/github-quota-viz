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
# Cron log level: 0 = no logging, higher values increase verbosity. 2 logs errors and basic info.
CRON_LOG_LEVEL=2
crond -f -l "$CRON_LOG_LEVEL" &
CRON_PID=$!

echo "[$(date -Iseconds)] Cron started with PID $CRON_PID"

# Background health check to ensure cron daemon stays running.
# If cron exits unexpectedly, log the event and terminate the container so it can be restarted.
(
    while true; do
        if ! kill -0 "$CRON_PID" 2>/dev/null; then
            echo "[$(date -Iseconds)] ERROR: Cron daemon (PID $CRON_PID) is no longer running. Exiting."
            exit 1
        fi
        sleep 60
    done
) &
echo ""

# Start nginx in foreground
echo "[$(date -Iseconds)] Starting nginx..."
echo ""
exec nginx -g "daemon off;"
