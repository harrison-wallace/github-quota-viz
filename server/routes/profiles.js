'use strict';

/**
 * Profiles routes
 *
 * GET    /api/profiles          – list all profiles (tokens masked)
 * POST   /api/profiles          – create a new profile
 * PUT    /api/profiles/:id      – update an existing profile
 * DELETE /api/profiles/:id      – delete a profile
 *
 * GitHub PATs are stored AES-256-GCM encrypted.
 * The raw token is NEVER returned by any endpoint after creation.
 */

const express = require('express');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEncKey() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }
  return Buffer.from(hex, 'hex');
}

function encryptToken(plaintext) {
  const key    = getEncKey();
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc      = cipher.update(plaintext, 'utf8', 'hex');
  enc         += cipher.final('hex');
  const tag    = cipher.getAuthTag();
  return {
    token_enc: enc,
    iv:        iv.toString('hex'),
    tag:       tag.toString('hex'),
  };
}

function decryptToken(token_enc, ivHex, tagHex) {
  const key      = getEncKey();
  const iv       = Buffer.from(ivHex,  'hex');
  const tag      = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let dec  = decipher.update(token_enc, 'hex', 'utf8');
  dec     += decipher.final('utf8');
  return dec;
}

function maskToken(token) {
  if (!token || token.length < 8) return '••••';
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}

function rowToProfile(row, includeToken = false) {
  const profile = {
    id:         row.id,
    name:       row.name,
    username:   row.username,
    source:     row.source,
    createdAt:  new Date(row.created_at).toISOString(),
    tokenMask:  '',
  };

  try {
    const plain    = decryptToken(row.token_enc, row.iv, row.tag);
    profile.tokenMask = maskToken(plain);
    if (includeToken) profile.token = plain;
  } catch {
    profile.tokenMask = '(unreadable)';
    if (includeToken) profile.token = '';
  }

  return profile;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/profiles
router.get('/', (req, res) => {
  try {
    const rows = getDb().prepare('SELECT * FROM profiles ORDER BY created_at ASC').all();
    res.json(rows.map(r => rowToProfile(r)));
  } catch (err) {
    console.error('[profiles] GET error:', err.message);
    res.status(500).json({ error: 'Failed to load profiles.' });
  }
});

// GET /api/profiles/:id/token  – returns decrypted token for this profile
// Used by the frontend apiClient to make GitHub API calls via the server.
router.get('/:id/token', (req, res) => {
  try {
    const row = getDb()
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(req.params.id);

    if (!row) return res.status(404).json({ error: 'Profile not found.' });

    const plain = decryptToken(row.token_enc, row.iv, row.tag);
    res.json({ token: plain });
  } catch (err) {
    console.error('[profiles] token fetch error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve token.' });
  }
});

// POST /api/profiles
router.post('/', (req, res) => {
  const { name, username, token, source } = req.body;

  if (!name || !username || !token) {
    return res.status(400).json({ error: 'name, username and token are required.' });
  }

  try {
    const { token_enc, iv, tag } = encryptToken(token);
    const id = uuidv4();
    const now = Date.now();

    getDb().prepare(
      'INSERT INTO profiles (id, name, username, token_enc, iv, tag, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, name, username, token_enc, iv, tag, source || 'local', now);

    const row = getDb().prepare('SELECT * FROM profiles WHERE id = ?').get(id);
    res.status(201).json(rowToProfile(row));
  } catch (err) {
    console.error('[profiles] POST error:', err.message);
    res.status(500).json({ error: 'Failed to create profile.' });
  }
});

// PUT /api/profiles/:id
router.put('/:id', (req, res) => {
  const { name, username, token } = req.body;
  const { id } = req.params;

  try {
    const existing = getDb().prepare('SELECT * FROM profiles WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Profile not found.' });

    let token_enc = existing.token_enc;
    let iv        = existing.iv;
    let tag       = existing.tag;

    if (token) {
      ({ token_enc, iv, tag } = encryptToken(token));
    }

    getDb().prepare(
      'UPDATE profiles SET name = ?, username = ?, token_enc = ?, iv = ?, tag = ? WHERE id = ?'
    ).run(name || existing.name, username || existing.username, token_enc, iv, tag, id);

    const updated = getDb().prepare('SELECT * FROM profiles WHERE id = ?').get(id);
    res.json(rowToProfile(updated));
  } catch (err) {
    console.error('[profiles] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// DELETE /api/profiles/:id
router.delete('/:id', (req, res) => {
  try {
    const result = getDb().prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Profile not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('[profiles] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete profile.' });
  }
});

module.exports = router;
