/**
 * Profile management service — server-backed via /api/profiles.
 *
 * Profiles (including encrypted tokens) are stored in SQLite on the server.
 * The active profile selection (per browser tab) remains in sessionStorage.
 *
 * One-time localStorage migration runs automatically on first load.
 */

import apiClient from './apiClient';

const ACTIVE_PROFILE_KEY = 'github_active_profile';
const MIGRATION_DONE_KEY = 'profiles_migrated_to_server_v1';

// ---------------------------------------------------------------------------
// Load / CRUD — all backed by the Express API
// ---------------------------------------------------------------------------

/**
 * Load all profiles from the server.
 * Returns an array of profile objects (tokenMask only — never the raw token).
 */
export const loadProfiles = async () => {
  try {
    const res = await apiClient.get('/profiles');
    return res.data;
  } catch (e) {
    console.error('Error loading profiles from server:', e);
    return [];
  }
};

/**
 * Add a new profile (validates the token against GitHub first).
 */
export const addProfile = async (profile) => {
  const isValid = await validateToken(profile.token);
  if (!isValid) throw new Error('Invalid GitHub token');

  const res = await apiClient.post('/profiles', {
    name:     profile.name,
    username: profile.username,
    token:    profile.token,
    source:   profile.source || 'local',
  });
  return res.data;
};

/**
 * Update a profile (pass token only when it has changed).
 */
export const updateProfile = async (id, updates) => {
  const res = await apiClient.put(`/profiles/${id}`, updates);
  return res.data;
};

/**
 * Delete a profile by ID.
 */
export const deleteProfile = async (profileId) => {
  await apiClient.delete(`/profiles/${profileId}`);

  const activeId = sessionStorage.getItem(ACTIVE_PROFILE_KEY);
  if (activeId === profileId) {
    sessionStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
};

// ---------------------------------------------------------------------------
// Active profile  (per-tab via sessionStorage)
// ---------------------------------------------------------------------------

/**
 * Resolve the active profile from a profiles array.
 * Falls back to the first profile if nothing is selected.
 */
export const getActiveProfile = (profiles = []) => {
  const activeId = sessionStorage.getItem(ACTIVE_PROFILE_KEY);
  if (!activeId) return profiles[0] || null;
  return profiles.find(p => p.id === activeId) || profiles[0] || null;
};

/**
 * Persist the active profile selection for this tab.
 */
export const setActiveProfile = (profileId) => {
  sessionStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
};

/**
 * Fetch the decrypted token for a profile from the server.
 * The raw token never touches browser storage.
 */
export const getActiveToken = async (profileId) => {
  if (!profileId) return null;
  try {
    const res = await apiClient.get(`/profiles/${profileId}/token`);
    return res.data.token || null;
  } catch (e) {
    console.error('Error fetching profile token:', e);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Token validation  (direct GitHub API call — token only in memory)
// ---------------------------------------------------------------------------

export const validateToken = async (token) => {
  if (!token || token.length < 10) return false;
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    return response.ok;
  } catch (e) {
    console.error('Token validation error:', e);
    return false;
  }
};

/**
 * Mask a token for display  (e.g. "ghp_••••abcd")
 */
export const maskToken = (token) => {
  if (!token || token.length < 8) return '••••';
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
};

// ---------------------------------------------------------------------------
// Cross-component change notification
// ---------------------------------------------------------------------------

export const onProfilesChange = (callback) => {
  const handler = () => callback();
  window.addEventListener('profilesUpdated', handler);
  return () => window.removeEventListener('profilesUpdated', handler);
};

export const notifyProfilesUpdated = () => {
  window.dispatchEvent(new CustomEvent('profilesUpdated'));
};

// ---------------------------------------------------------------------------
// One-time migration from localStorage  (silent, runs once)
// ---------------------------------------------------------------------------

export const migrateFromLocalStorage = async () => {
  if (localStorage.getItem(MIGRATION_DONE_KEY)) return;

  const raw = localStorage.getItem('github_profiles_v1');
  if (!raw) {
    localStorage.setItem(MIGRATION_DONE_KEY, '1');
    return;
  }

  try {
    const stored = JSON.parse(raw);
    for (const p of stored) {
      const token = p.token ? atob(p.token) : '';
      if (!token) continue;
      try {
        await apiClient.post('/profiles', {
          name:     p.name || p.username,
          username: p.username,
          token,
          source:   p.source || 'local',
        });
      } catch (err) {
        console.warn(`[migration] Profile migration failed for ${p.username}:`, err.message);
      }
    }
    localStorage.removeItem('github_profiles_v1');
    console.log('[migration] Profiles migrated from localStorage to server.');
  } catch (e) {
    console.error('[migration] Profile migration error:', e);
  }

  localStorage.setItem(MIGRATION_DONE_KEY, '1');
};
