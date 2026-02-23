'use strict';

/**
 * Express API server — runs on port 3001 inside the Docker container.
 * nginx proxies /api/* to this process.
 *
 * Required environment variables:
 *   API_SECRET_KEY        – arbitrary secret (32+ chars recommended)
 *   TOKEN_ENCRYPTION_KEY  – exactly 64 hex chars (32 bytes) for AES-256-GCM
 */

const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const { initDb } = require('./db');

// ---------------------------------------------------------------------------
// Validate required env vars before doing anything else
// ---------------------------------------------------------------------------
const requiredEnv = ['API_SECRET_KEY', 'TOKEN_ENCRYPTION_KEY'];
const missing = requiredEnv.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[server] FATAL: Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.TOKEN_ENCRYPTION_KEY.length !== 64) {
  console.error('[server] FATAL: TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Initialise DB (also runs encryption-key sentinel check — may exit on failure)
// ---------------------------------------------------------------------------
const encKey = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex');
initDb(encKey);

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

// Security headers
app.use(helmet({
  // CSP is handled by nginx for the SPA; we only serve JSON here
  contentSecurityPolicy: false,
}));

// Only allow requests from localhost (nginx proxy) — belt-and-suspenders
app.use(cors({
  origin: ['http://localhost', 'http://127.0.0.1'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
}));

app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// Auth middleware (applied to all /api/* routes)
// ---------------------------------------------------------------------------
const apiKeyAuth = require('./middleware/auth');

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
const profilesRouter  = require('./routes/profiles');
const usageRouter     = require('./routes/usage');
const settingsRouter  = require('./routes/settings');

app.use('/api/profiles', apiKeyAuth, profilesRouter);
app.use('/api/usage',    apiKeyAuth, usageRouter);
app.use('/api/settings', apiKeyAuth, settingsRouter);

// Health check — unauthenticated, used by nginx and Jenkins
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.API_PORT || '3001', 10);

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[server] API listening on 127.0.0.1:${PORT}`);
});

module.exports = app; // exported for testing
