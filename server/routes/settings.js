'use strict';

/**
 * Settings routes  — simple key/value store backed by the `settings` table.
 *
 * GET  /api/settings          – get all settings (excluding internal _enc_ keys)
 * GET  /api/settings/:key     – get a single setting
 * PUT  /api/settings/:key     – upsert a setting
 * DELETE /api/settings/:key   – delete a setting
 */

const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// Internal-only keys that should never be exposed via the API
const RESERVED_PREFIX = '_enc_';

function isReserved(key) {
  return key.startsWith(RESERVED_PREFIX);
}

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const rows = getDb()
      .prepare("SELECT key, value FROM settings WHERE key NOT LIKE '_enc_%' ORDER BY key ASC")
      .all();

    // Parse JSON values where possible, return string otherwise
    const settings = {};
    rows.forEach(r => {
      try { settings[r.key] = JSON.parse(r.value); }
      catch { settings[r.key] = r.value; }
    });

    res.json(settings);
  } catch (err) {
    console.error('[settings] GET all error:', err.message);
    res.status(500).json({ error: 'Failed to load settings.' });
  }
});

// GET /api/settings/:key
router.get('/:key', (req, res) => {
  const { key } = req.params;
  if (isReserved(key)) return res.status(403).json({ error: 'Reserved key.' });

  try {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!row) return res.status(404).json({ error: 'Setting not found.' });

    let value;
    try { value = JSON.parse(row.value); }
    catch { value = row.value; }

    res.json({ key, value });
  } catch (err) {
    console.error('[settings] GET error:', err.message);
    res.status(500).json({ error: 'Failed to load setting.' });
  }
});

// PUT /api/settings/:key
router.put('/:key', (req, res) => {
  const { key } = req.params;
  if (isReserved(key)) return res.status(403).json({ error: 'Reserved key.' });

  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: 'value is required.' });

  try {
    const stored = typeof value === 'string' ? value : JSON.stringify(value);
    getDb()
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run(key, stored);

    res.json({ key, value });
  } catch (err) {
    console.error('[settings] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to save setting.' });
  }
});

// DELETE /api/settings/:key
router.delete('/:key', (req, res) => {
  const { key } = req.params;
  if (isReserved(key)) return res.status(403).json({ error: 'Reserved key.' });

  try {
    const result = getDb().prepare('DELETE FROM settings WHERE key = ?').run(key);
    if (result.changes === 0) return res.status(404).json({ error: 'Setting not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('[settings] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete setting.' });
  }
});

module.exports = router;
