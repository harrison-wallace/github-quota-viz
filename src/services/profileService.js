// Profile management service for GitHub tokens
// Supports multiple profiles with base64 encoding and per-tab active profile selection

const PROFILES_KEY = 'github_profiles_v1';

/**
 * Generate a UUID (with fallback for older browsers/insecure contexts)
 * @returns {string} UUID string
 */
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers or insecure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};
const ACTIVE_PROFILE_KEY = 'github_active_profile';

/**
 * Load all profiles from localStorage and env vars
 * @returns {Array} Array of profile objects with decoded tokens
 */
export const loadProfiles = () => {
  let profiles = [];
  
  // 1. Load from localStorage
  try {
    const stored = localStorage.getItem(PROFILES_KEY);
    if (stored) {
      profiles = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading profiles from localStorage:', e);
  }
  
  // 2. Load defaults from env if no profiles exist
  if (profiles.length === 0 && window._env_?.REACT_APP_DEFAULT_PROFILES) {
    try {
      const envProfiles = JSON.parse(window._env_.REACT_APP_DEFAULT_PROFILES);
      profiles = envProfiles.map(p => ({
        ...p,
        id: generateUUID(),
        source: 'env'
      }));
      // Save to localStorage so they're available immediately
      saveProfiles(profiles);
    } catch (e) {
      console.error('Error parsing REACT_APP_DEFAULT_PROFILES:', e);
    }
  }
  
  // 3. Decode tokens
  return profiles.map(p => ({
    ...p,
    token: p.token ? atob(p.token) : ''
  }));
};

/**
 * Save profiles to localStorage (with base64 encoded tokens)
 * @param {Array} profiles - Array of profile objects
 */
export const saveProfiles = (profiles) => {
  try {
    // Encode tokens before saving
    const encodedProfiles = profiles.map(p => ({
      ...p,
      token: p.token ? btoa(p.token) : ''
    }));
    localStorage.setItem(PROFILES_KEY, JSON.stringify(encodedProfiles));
  } catch (e) {
    console.error('Error saving profiles:', e);
  }
};

/**
 * Add a new profile
 * @param {Object} profile - Profile object with name, username, and token
 * @returns {Object} The saved profile with ID
 */
export const addProfile = async (profile) => {
  // Validate token first
  const isValid = await validateToken(profile.token);
  if (!isValid) {
    throw new Error('Invalid GitHub token');
  }
  
  const newProfile = {
    ...profile,
    id: generateUUID(),
    source: 'local',
    createdAt: new Date().toISOString()
  };
  
  const profiles = loadProfiles();
  profiles.push(newProfile);
  saveProfiles(profiles);
  
  return newProfile;
};

/**
 * Delete a profile by ID
 * @param {string} profileId - Profile ID to delete
 */
export const deleteProfile = (profileId) => {
  const profiles = loadProfiles();
  const filtered = profiles.filter(p => p.id !== profileId);
  saveProfiles(filtered);
  
  // If we deleted the active profile, clear it
  const activeId = sessionStorage.getItem(ACTIVE_PROFILE_KEY);
  if (activeId === profileId) {
    sessionStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
};

/**
 * Get the currently active profile (per-tab)
 * @returns {Object|null} Active profile or null
 */
export const getActiveProfile = () => {
  const activeId = sessionStorage.getItem(ACTIVE_PROFILE_KEY);
  if (!activeId) return null;
  
  const profiles = loadProfiles();
  return profiles.find(p => p.id === activeId) || profiles[0] || null;
};

/**
 * Set the active profile (per-tab)
 * @param {string} profileId - Profile ID to activate
 */
export const setActiveProfile = (profileId) => {
  sessionStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
};

/**
 * Get token for the active profile
 * @returns {string|null} Active profile token or null
 */
export const getActiveToken = () => {
  const activeProfile = getActiveProfile();
  return activeProfile?.token || null;
};

/**
 * Validate a GitHub token by making a test API call
 * @param {string} token - GitHub personal access token
 * @returns {Promise<boolean>} True if token is valid
 */
export const validateToken = async (token) => {
  if (!token || token.length < 10) return false;
  
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return response.ok;
  } catch (e) {
    console.error('Token validation error:', e);
    return false;
  }
};

/**
 * Mask a token for display (e.g., "ghp_••••abcd")
 * @param {string} token - Full token
 * @returns {string} Masked token
 */
export const maskToken = (token) => {
  if (!token || token.length < 8) return '••••';
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
};

/**
 * Listen for profile changes from other tabs
 * @param {Function} callback - Function to call when profiles change
 * @returns {Function} Cleanup function
 */
export const onProfilesChange = (callback) => {
  const handleStorageChange = (e) => {
    if (e.key === PROFILES_KEY) {
      callback(loadProfiles());
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
};
