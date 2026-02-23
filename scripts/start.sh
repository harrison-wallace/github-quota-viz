#!/bin/sh
# Container entrypoint script
# Injects runtime env vars, starts Express API server + cron, then starts nginx

set -e

echo "=== GitHub Quota Viz Container Starting ==="
echo ""

# ── Runtime env var injection ────────────────────────────────────────────────
# Inject REACT_APP_API_KEY into the static env-config.js so the browser SPA
# can read it from window._env_.REACT_APP_API_KEY.
ENV_CONFIG="/usr/share/nginx/html/env-config.js"
API_KEY_VALUE="${REACT_APP_API_KEY:-}"

if [ -n "$API_KEY_VALUE" ]; then
    sed -i "s|REACT_APP_API_KEY: ''|REACT_APP_API_KEY: '${API_KEY_VALUE}'|g" "$ENV_CONFIG"
    echo "[$(date -Iseconds)] Injected REACT_APP_API_KEY into env-config.js"
else
    echo "[$(date -Iseconds)] Warning: REACT_APP_API_KEY is not set — API calls from the browser will fail"
fi

echo ""

# ── Data directory ───────────────────────────────────────────────────────────
mkdir -p /data

# ── Express API server ───────────────────────────────────────────────────────
echo "[$(date -Iseconds)] Starting Express API server..."
node /app/server/index.js &
EXPRESS_PID=$!

echo "[$(date -Iseconds)] Express server started with PID $EXPRESS_PID"

# Wait for Express to be ready (up to 10 seconds)
i=0
until curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge 20 ]; then
        echo "[$(date -Iseconds)] ERROR: Express API server failed to start within 10 seconds"
        exit 1
    fi
    sleep 0.5
done
echo "[$(date -Iseconds)] Express API server is ready"

# Background watchdog: restart container if Express exits unexpectedly
(
    while true; do
        if ! kill -0 "$EXPRESS_PID" 2>/dev/null; then
            echo "[$(date -Iseconds)] ERROR: Express API server (PID $EXPRESS_PID) exited. Terminating container."
            exit 1
        fi
        sleep 15
    done
) &

echo ""

# ── Initial models scrape ────────────────────────────────────────────────────
echo "[$(date -Iseconds)] Running initial models scrape..."
node /app/scripts/scrape-models.js || {
    echo "[$(date -Iseconds)] Warning: Initial scrape failed, will use fallback data"
}

echo ""

# ── Cron daemon ──────────────────────────────────────────────────────────────
echo "[$(date -Iseconds)] Starting cron daemon..."
CRON_LOG_LEVEL=2
crond -f -l "$CRON_LOG_LEVEL" &
CRON_PID=$!

echo "[$(date -Iseconds)] Cron started with PID $CRON_PID"

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

# ── nginx (foreground — PID 1 equivalent) ───────────────────────────────────
echo "[$(date -Iseconds)] Starting nginx..."
echo ""
exec nginx -g "daemon off;"
