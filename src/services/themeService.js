// Accent color themes (work with both light and dark modes)
export const accentThemes = {
  default: {
    name: 'Default',
    primary: '#2196F3',
    primaryHover: '#1976D2',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    info: '#00BCD4',
  },
  ocean: {
    name: 'Ocean Blue',
    primary: '#0077be',
    primaryHover: '#005a8f',
    success: '#2ecc71',
    warning: '#f39c12',
    danger: '#e74c3c',
    info: '#3498db',
  },
  sunset: {
    name: 'Sunset',
    primary: '#ff6b6b',
    primaryHover: '#fa5252',
    success: '#51cf66',
    warning: '#ffd43b',
    danger: '#ff6b6b',
    info: '#74c0fc',
  },
  forest: {
    name: 'Forest',
    primary: '#2d6a4f',
    primaryHover: '#1b4332',
    success: '#40916c',
    warning: '#f4a261',
    danger: '#e76f51',
    info: '#4ea8de',
  },
  purple: {
    name: 'Purple Haze',
    primary: '#7209b7',
    primaryHover: '#5a0694',
    success: '#06d6a0',
    warning: '#ffd60a',
    danger: '#ef476f',
    info: '#4cc9f0',
  },
};

// Animation speed options
export const animationSpeeds = {
  slow: { name: 'Slow', value: '5s' },
  normal: { name: 'Normal', value: '2s' },
  fast: { name: 'Fast', value: '1s' },
  ultraFast: { name: 'Ultra Fast', value: '0.5s' },
};

// localStorage keys — used as an immediate local cache so CSS applies before
// the async API response arrives (no flash of unstyled content).
const STORAGE_KEY_MODE           = 'theme-mode';
const STORAGE_KEY_ACCENT         = 'theme-accent';
const STORAGE_KEY_GLOW_ENABLED   = 'glow-enabled';
const STORAGE_KEY_PULSE_ENABLED  = 'pulse-enabled';
const STORAGE_KEY_ANIMATION_SPEED = 'animation-speed';
const STORAGE_KEY_GLOW_SPEED     = 'glow-speed';
const STORAGE_KEY_PULSE_SPEED    = 'pulse-speed';

// ---------------------------------------------------------------------------
// Helpers to get/set via the server settings API.
// These are fire-and-forget writes; reads are used only during async hydration.
// ---------------------------------------------------------------------------

/**
 * Save a setting to the server (fire-and-forget — never blocks the UI).
 */
const saveSettingToServer = (key, value) => {
  // Dynamic import to avoid circular deps; apiClient is set up after this module loads.
  import('./apiClient').then(({ default: apiClient }) => {
    apiClient.put(`/settings/${key}`, { value: String(value) }).catch(() => {
      // Non-fatal — localStorage is the fallback
    });
  });
};

/**
 * Load all settings from the server and apply them.
 * Call once during app init after the API is reachable.
 * Returns a promise that resolves when settings have been applied.
 */
export const hydrateThemeFromServer = async () => {
  try {
    const { default: apiClient } = await import('./apiClient');
    const res = await apiClient.get('/settings');
    const rows = res.data; // [{key, value}, ...]
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));

    // Apply each setting that exists on the server, updating localStorage cache too.
    if (map[STORAGE_KEY_MODE])            { localStorage.setItem(STORAGE_KEY_MODE, map[STORAGE_KEY_MODE]); applyMode(map[STORAGE_KEY_MODE]); }
    if (map[STORAGE_KEY_ACCENT])          { localStorage.setItem(STORAGE_KEY_ACCENT, map[STORAGE_KEY_ACCENT]); applyAccentColor(map[STORAGE_KEY_ACCENT]); }
    if (map[STORAGE_KEY_GLOW_ENABLED])    { const v = map[STORAGE_KEY_GLOW_ENABLED] === 'true'; localStorage.setItem(STORAGE_KEY_GLOW_ENABLED, String(v)); applyGlowEnabled(v); }
    if (map[STORAGE_KEY_PULSE_ENABLED])   { const v = map[STORAGE_KEY_PULSE_ENABLED] === 'true'; localStorage.setItem(STORAGE_KEY_PULSE_ENABLED, String(v)); applyPulseEnabled(v); }
    if (map[STORAGE_KEY_ANIMATION_SPEED]) { localStorage.setItem(STORAGE_KEY_ANIMATION_SPEED, map[STORAGE_KEY_ANIMATION_SPEED]); applyAnimationSpeed(map[STORAGE_KEY_ANIMATION_SPEED]); }
    if (map[STORAGE_KEY_GLOW_SPEED])      { localStorage.setItem(STORAGE_KEY_GLOW_SPEED, map[STORAGE_KEY_GLOW_SPEED]); applyGlowSpeed(map[STORAGE_KEY_GLOW_SPEED]); }
    if (map[STORAGE_KEY_PULSE_SPEED])     { localStorage.setItem(STORAGE_KEY_PULSE_SPEED, map[STORAGE_KEY_PULSE_SPEED]); applyPulseSpeed(map[STORAGE_KEY_PULSE_SPEED]); }

    return map;
  } catch (e) {
    // Server not reachable — silently fall back to localStorage values
    console.warn('[themeService] Could not hydrate settings from server:', e.message);
    return {};
  }
};

// ---------------------------------------------------------------------------
// DOM application helpers (synchronous — safe to call before first paint)
// ---------------------------------------------------------------------------

export const applyMode = (mode) => {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem(STORAGE_KEY_MODE, mode);
  window.dispatchEvent(new CustomEvent('themeChange', { detail: { mode } }));
};

export const applyAccentColor = (accentName) => {
  const accent = accentThemes[accentName] || accentThemes.ocean;
  const root = document.documentElement;
  Object.entries(accent).forEach(([key, value]) => {
    if (key !== 'name') root.style.setProperty(`--accent-${key}`, value);
  });
  localStorage.setItem(STORAGE_KEY_ACCENT, accentName);
  window.dispatchEvent(new CustomEvent('themeChange', { detail: { accent: accentName } }));
};

export const applyAnimationSpeed = (speedKey) => {
  const speed = animationSpeeds[speedKey] || animationSpeeds.normal;
  document.documentElement.style.setProperty('--animation-speed', speed.value);
  localStorage.setItem(STORAGE_KEY_ANIMATION_SPEED, speedKey);
  window.dispatchEvent(new CustomEvent('animationSpeedChange', { detail: { speed: speedKey } }));
};

export const applyGlowEnabled = (enabled) => {
  localStorage.setItem(STORAGE_KEY_GLOW_ENABLED, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('glowEnabledChange', { detail: { enabled } }));
};

export const applyPulseEnabled = (enabled) => {
  localStorage.setItem(STORAGE_KEY_PULSE_ENABLED, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('pulseEnabledChange', { detail: { enabled } }));
};

export const applyGlowSpeed = (speedKey) => {
  localStorage.setItem(STORAGE_KEY_GLOW_SPEED, speedKey);
  window.dispatchEvent(new CustomEvent('glowSpeedChange', { detail: { speed: speedKey } }));
};

export const applyPulseSpeed = (speedKey) => {
  localStorage.setItem(STORAGE_KEY_PULSE_SPEED, speedKey);
  window.dispatchEvent(new CustomEvent('pulseSpeedChange', { detail: { speed: speedKey } }));
};

// ---------------------------------------------------------------------------
// Getters (from localStorage cache for synchronous reads)
// ---------------------------------------------------------------------------

export const getSavedMode = () => {
  const saved = localStorage.getItem(STORAGE_KEY_MODE);
  if (saved) return saved;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
};

export const getSavedAccent = () => localStorage.getItem(STORAGE_KEY_ACCENT) || 'ocean';
export const getSavedAnimationSpeed = () => localStorage.getItem(STORAGE_KEY_ANIMATION_SPEED) || 'normal';
export const getSavedGlowEnabled = () => localStorage.getItem(STORAGE_KEY_GLOW_ENABLED) === 'true';
export const getSavedPulseEnabled = () => localStorage.getItem(STORAGE_KEY_PULSE_ENABLED) === 'true';
export const getSavedGlowSpeed = () => localStorage.getItem(STORAGE_KEY_GLOW_SPEED) || 'normal';
export const getSavedPulseSpeed = () => localStorage.getItem(STORAGE_KEY_PULSE_SPEED) || 'normal';

// ---------------------------------------------------------------------------
// Mutators — apply immediately + persist to server
// ---------------------------------------------------------------------------

export const toggleMode = () => {
  const newMode = getSavedMode() === 'light' ? 'dark' : 'light';
  applyMode(newMode);
  saveSettingToServer(STORAGE_KEY_MODE, newMode);
  return newMode;
};

export const toggleGlowEnabled = () => {
  const newState = !getSavedGlowEnabled();
  applyGlowEnabled(newState);
  saveSettingToServer(STORAGE_KEY_GLOW_ENABLED, newState);
  return newState;
};

export const togglePulseEnabled = () => {
  const newState = !getSavedPulseEnabled();
  applyPulseEnabled(newState);
  saveSettingToServer(STORAGE_KEY_PULSE_ENABLED, newState);
  return newState;
};

// Wrapped versions that also persist to server
export const setAccentColor = (accentName) => {
  applyAccentColor(accentName);
  saveSettingToServer(STORAGE_KEY_ACCENT, accentName);
};

export const setGlowSpeed = (speedKey) => {
  applyGlowSpeed(speedKey);
  saveSettingToServer(STORAGE_KEY_GLOW_SPEED, speedKey);
};

export const setPulseSpeed = (speedKey) => {
  applyPulseSpeed(speedKey);
  saveSettingToServer(STORAGE_KEY_PULSE_SPEED, speedKey);
};

export const setAnimationSpeed = (speedKey) => {
  applyAnimationSpeed(speedKey);
  saveSettingToServer(STORAGE_KEY_ANIMATION_SPEED, speedKey);
};

// ---------------------------------------------------------------------------
// initializeTheme — synchronous, applies localStorage cache immediately.
// Call hydrateThemeFromServer() afterwards (async) to sync with SQLite.
// ---------------------------------------------------------------------------

export const initializeTheme = () => {
  const savedMode         = getSavedMode();
  const savedAccent       = getSavedAccent();
  const savedGlowEnabled  = getSavedGlowEnabled();
  const savedPulseEnabled = getSavedPulseEnabled();
  const savedSpeed        = getSavedAnimationSpeed();
  const savedGlowSpeed    = getSavedGlowSpeed();
  const savedPulseSpeed   = getSavedPulseSpeed();

  applyMode(savedMode);
  applyAccentColor(savedAccent);
  applyAnimationSpeed(savedSpeed);

  // Listen for storage events from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY_MODE && e.newValue)                            applyMode(e.newValue);
    else if (e.key === STORAGE_KEY_ACCENT && e.newValue)                     applyAccentColor(e.newValue);
    else if (e.key === STORAGE_KEY_GLOW_ENABLED && e.newValue !== null)      applyGlowEnabled(e.newValue === 'true');
    else if (e.key === STORAGE_KEY_PULSE_ENABLED && e.newValue !== null)     applyPulseEnabled(e.newValue === 'true');
    else if (e.key === STORAGE_KEY_ANIMATION_SPEED && e.newValue)            applyAnimationSpeed(e.newValue);
    else if (e.key === STORAGE_KEY_GLOW_SPEED && e.newValue)                 applyGlowSpeed(e.newValue);
    else if (e.key === STORAGE_KEY_PULSE_SPEED && e.newValue)                applyPulseSpeed(e.newValue);
  });

  return {
    mode:         savedMode,
    accent:       savedAccent,
    glowEnabled:  savedGlowEnabled,
    pulseEnabled: savedPulseEnabled,
    speed:        savedSpeed,
    glowSpeed:    savedGlowSpeed,
    pulseSpeed:   savedPulseSpeed,
  };
};

const themeService = {
  accentThemes,
  animationSpeeds,
  applyMode,
  applyAccentColor,
  applyAnimationSpeed,
  applyGlowSpeed,
  applyPulseSpeed,
  getSavedMode,
  getSavedAccent,
  getSavedAnimationSpeed,
  getSavedGlowSpeed,
  getSavedPulseSpeed,
  toggleMode,
  toggleGlowEnabled,
  applyGlowEnabled,
  getSavedGlowEnabled,
  togglePulseEnabled,
  applyPulseEnabled,
  getSavedPulseEnabled,
  initializeTheme,
  hydrateThemeFromServer,
  setAccentColor,
  setGlowSpeed,
  setPulseSpeed,
  setAnimationSpeed,
};

export default themeService;
