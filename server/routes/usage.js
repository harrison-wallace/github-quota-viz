'use strict';

/**
 * Usage snapshot routes
 *
 * POST /api/usage                      – record a daily usage snapshot (upsert)
 * GET  /api/usage/:profileId           – get all snapshots for a profile
 * GET  /api/usage/:profileId/:metric   – get snapshots for a specific metric
 * DELETE /api/usage/:profileId         – delete all history for a profile
 * GET  /api/usage/db-size              – return DB file size
 */

const express = require('express');
const fs      = require('fs');
const { getDb, DB_PATH } = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// DB size  (must be declared BEFORE /:profileId to avoid route shadowing)
// ---------------------------------------------------------------------------
router.get('/db-size', (req, res) => {
  try {
    const stat  = fs.statSync(DB_PATH);
    const bytes = stat.size;

    // Human-readable
    let human;
    if (bytes < 1024) {
      human = `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      human = `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      human = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      human = `${(bytes / (1024 * 1024 * 1024)).toFixed(3)} GB`;
    }

    // Row counts for context
    const db = getDb();
    const profileCount  = db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n;
    const snapshotCount = db.prepare('SELECT COUNT(*) AS n FROM usage_snapshots').get().n;

    res.json({ bytes, human, profiles: profileCount, snapshots: snapshotCount, path: DB_PATH });
  } catch (err) {
    console.error('[usage] db-size error:', err.message);
    res.status(500).json({ error: 'Failed to get DB size.' });
  }
});

// ---------------------------------------------------------------------------
// Record a snapshot (upsert — one record per profile/metric/day)
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  const { profileId, metric, value, date, rawJson } = req.body;

  if (!profileId || !metric || value === undefined || value === null) {
    return res.status(400).json({ error: 'profileId, metric and value are required.' });
  }

  try {
    const dateStr   = date ? String(date).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const recordedAt = Date.now();

    getDb().prepare(`
      INSERT INTO usage_snapshots (profile_id, metric, value, recorded_at, date_str, raw_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, metric, date_str)
      DO UPDATE SET value = excluded.value, recorded_at = excluded.recorded_at, raw_json = excluded.raw_json
    `).run(profileId, metric, value, recordedAt, dateStr, rawJson ? JSON.stringify(rawJson) : null);

    res.status(201).json({ success: true, dateStr });
  } catch (err) {
    console.error('[usage] POST error:', err.message);
    res.status(500).json({ error: 'Failed to record usage snapshot.' });
  }
});

// ---------------------------------------------------------------------------
// Batch record multiple snapshots
// ---------------------------------------------------------------------------
router.post('/batch', (req, res) => {
  const { snapshots } = req.body;
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return res.status(400).json({ error: 'snapshots array is required.' });
  }

  try {
    const stmt = getDb().prepare(`
      INSERT INTO usage_snapshots (profile_id, metric, value, recorded_at, date_str, raw_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, metric, date_str)
      DO UPDATE SET value = excluded.value, recorded_at = excluded.recorded_at
    `);

    const insert = getDb().transaction((items) => {
      for (const s of items) {
        const dateStr = s.date ? String(s.date).slice(0, 10) : new Date().toISOString().slice(0, 10);
        stmt.run(s.profileId, s.metric, s.value, s.timestamp || Date.now(), dateStr, null);
      }
    });

    insert(snapshots);
    res.status(201).json({ success: true, count: snapshots.length });
  } catch (err) {
    console.error('[usage] batch POST error:', err.message);
    res.status(500).json({ error: 'Failed to batch-record snapshots.' });
  }
});

// ---------------------------------------------------------------------------
// Get all snapshots for a profile (optionally filtered by metric)
// ---------------------------------------------------------------------------
router.get('/:profileId', (req, res) => {
  const { profileId } = req.params;
  const { metric, from, to, limit } = req.query;

  try {
    let sql    = 'SELECT * FROM usage_snapshots WHERE profile_id = ?';
    const args = [profileId];

    if (metric) { sql += ' AND metric = ?'; args.push(metric); }
    if (from)   { sql += ' AND date_str >= ?'; args.push(from); }
    if (to)     { sql += ' AND date_str <= ?'; args.push(to); }

    sql += ' ORDER BY date_str ASC';

    if (limit) { sql += ' LIMIT ?'; args.push(parseInt(limit, 10)); }

    const rows = getDb().prepare(sql).all(...args);
    res.json(rows);
  } catch (err) {
    console.error('[usage] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch usage data.' });
  }
});

// ---------------------------------------------------------------------------
// Get snapshots for a profile + specific metric
// ---------------------------------------------------------------------------
router.get('/:profileId/:metric', (req, res) => {
  const { profileId, metric } = req.params;
  const { from, to, limit, days } = req.query;

  try {
    let sql    = 'SELECT * FROM usage_snapshots WHERE profile_id = ? AND metric = ?';
    const args = [profileId, metric];

    if (days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(days, 10));
      sql += ' AND date_str >= ?';
      args.push(cutoff.toISOString().slice(0, 10));
    } else {
      if (from) { sql += ' AND date_str >= ?'; args.push(from); }
      if (to)   { sql += ' AND date_str <= ?'; args.push(to); }
    }

    sql += ' ORDER BY date_str ASC';
    if (limit) { sql += ' LIMIT ?'; args.push(parseInt(limit, 10)); }

    const rows = getDb().prepare(sql).all(...args);
    res.json(rows);
  } catch (err) {
    console.error('[usage] GET metric error:', err.message);
    res.status(500).json({ error: 'Failed to fetch usage data.' });
  }
});

// ---------------------------------------------------------------------------
// Delete all history for a profile
// ---------------------------------------------------------------------------
router.delete('/:profileId', (req, res) => {
  try {
    const result = getDb()
      .prepare('DELETE FROM usage_snapshots WHERE profile_id = ?')
      .run(req.params.profileId);
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    console.error('[usage] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete usage data.' });
  }
});

module.exports = router;
