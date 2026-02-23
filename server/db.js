'use strict';

/**
 * SQLite database initialisation and schema migrations.
 *
 * Database file lives at /data/quota.db (Docker volume mount).
 * Falls back to ./quota.db for local development when /data is not mounted.
 *
 * Encryption-key integrity check:
 *   On startup we read a known sentinel value from the `settings` table.
 *   If the DB already has profiles, we attempt to decrypt one. If it fails
 *   we log a clear warning and exit — preventing silent data corruption.
 */

const Database = require('better-sqlite3');
const crypto   = require('crypto');
const fs       = require('fs');
const path     = require('path');

// ---------------------------------------------------------------------------
// Resolve DB path
// ---------------------------------------------------------------------------
const DATA_DIR = fs.existsSync('/data') ? '/data' : path.join(__dirname, '..');
const DB_PATH  = path.join(DATA_DIR, 'quota.db');

let db;

function getDb() {
  if (!db) throw new Error('Database not initialised. Call initDb() first.');
  return db;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS profiles (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL,
    username   TEXT    NOT NULL,
    token_enc  TEXT    NOT NULL,
    iv         TEXT    NOT NULL,
    tag        TEXT    NOT NULL,
    source     TEXT    NOT NULL DEFAULT 'local',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usage_snapshots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  TEXT    NOT NULL,
    metric      TEXT    NOT NULL,
    value       REAL    NOT NULL,
    recorded_at INTEGER NOT NULL,
    date_str    TEXT    NOT NULL,
    raw_json    TEXT,
    UNIQUE(profile_id, metric, date_str)
  );

  CREATE INDEX IF NOT EXISTS idx_usage_profile_metric
    ON usage_snapshots(profile_id, metric, date_str);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schema_meta (
    version INTEGER PRIMARY KEY
  );
`;

// ---------------------------------------------------------------------------
// Encryption-key sentinel check
// ---------------------------------------------------------------------------

/**
 * On first run, store an encrypted sentinel so we can detect key rotation.
 * On subsequent runs, verify the sentinel decrypts correctly with the
 * current key. If it fails, warn loudly and exit.
 */
function checkEncryptionKey(encryptionKey) {
  const SENTINEL_KEY = '_enc_key_sentinel';

  const existingSentinel = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(SENTINEL_KEY);

  if (!existingSentinel) {
    // First run — store sentinel
    const plaintext = 'github-quota-viz-sentinel-ok';
    const iv        = crypto.randomBytes(12);
    const cipher    = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    let enc         = cipher.update(plaintext, 'utf8', 'hex');
    enc            += cipher.final('hex');
    const tag       = cipher.getAuthTag();

    const sentinelBlob = JSON.stringify({
      enc,
      iv:  iv.toString('hex'),
      tag: tag.toString('hex'),
    });

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run(SENTINEL_KEY, sentinelBlob);

    console.log('[db] Encryption key sentinel written.');
    return;
  }

  // Subsequent run — verify
  try {
    const blob    = JSON.parse(existingSentinel.value);
    const iv      = Buffer.from(blob.iv,  'hex');
    const tag     = Buffer.from(blob.tag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
    decipher.setAuthTag(tag);
    let dec  = decipher.update(blob.enc, 'hex', 'utf8');
    dec     += decipher.final('utf8');

    if (dec !== 'github-quota-viz-sentinel-ok') throw new Error('Sentinel mismatch');
    console.log('[db] Encryption key verified OK.');
  } catch (err) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║  FATAL: TOKEN_ENCRYPTION_KEY does not match the stored key.  ║');
    console.error('║  All stored GitHub tokens are now unreadable.                ║');
    console.error('║                                                              ║');
    console.error('║  Options:                                                    ║');
    console.error('║    1) Restore the original TOKEN_ENCRYPTION_KEY value.       ║');
    console.error('║    2) Delete /data/quota.db to start fresh (tokens lost).    ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function initDb(encryptionKey) {
  console.log(`[db] Opening database at ${DB_PATH}`);

  db = new Database(DB_PATH);

  // WAL mode for better concurrency (nginx + Express in same container)
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema
  db.exec(SCHEMA_SQL);

  // Track schema version (currently v1)
  const ver = db.prepare('SELECT version FROM schema_meta').get();
  if (!ver) {
    db.prepare('INSERT INTO schema_meta (version) VALUES (1)').run();
    console.log('[db] Schema initialised at version 1.');
  } else {
    console.log(`[db] Schema version: ${ver.version}`);
    // Future migrations go here with if (ver.version < N) blocks
  }

  // Verify encryption key integrity
  checkEncryptionKey(encryptionKey);

  console.log('[db] Ready.');
  return db;
}

module.exports = { initDb, getDb, DB_PATH };
