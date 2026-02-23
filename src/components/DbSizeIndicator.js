/**
 * DbSizeIndicator — shows SQLite database file size, profile count and
 * snapshot count. Polls every 5 minutes. Intended for the settings panel.
 */

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function DbSizeIndicator() {
  const [info, setInfo]     = useState(null);
  const [error, setError]   = useState(false);

  const fetchSize = useCallback(async () => {
    try {
      const res = await apiClient.get('/usage/db-size');
      setInfo(res.data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchSize();
    const id = setInterval(fetchSize, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchSize]);

  if (error) {
    return (
      <small className="text-muted d-block">
        DB size: unavailable
      </small>
    );
  }

  if (!info) {
    return (
      <small className="text-muted d-block">
        DB size: loading…
      </small>
    );
  }

  return (
    <small className="text-muted d-block" title={`Path: ${info.path}`}>
      DB: <strong>{info.human}</strong>
      {' · '}
      {info.profiles} profile{info.profiles !== 1 ? 's' : ''}
      {' · '}
      {info.snapshots.toLocaleString()} snapshot{info.snapshots !== 1 ? 's' : ''}
    </small>
  );
}
