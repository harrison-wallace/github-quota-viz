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

// Storage event channel for cross-tab synchronization
const STORAGE_KEY_MODE = 'theme-mode';
const STORAGE_KEY_ACCENT = 'theme-accent';
const STORAGE_KEY_GLOW_ENABLED = 'glow-enabled';
const STORAGE_KEY_PULSE_ENABLED = 'pulse-enabled';
const STORAGE_KEY_ANIMATION_SPEED = 'animation-speed';
const STORAGE_KEY_GLOW_SPEED = 'glow-speed';
const STORAGE_KEY_PULSE_SPEED = 'pulse-speed';

/**
 * Apply dark/light mode to document
 * @param {string} mode - 'light' or 'dark'
 */
export const applyMode = (mode) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  
  // Store preference and notify other tabs
  localStorage.setItem(STORAGE_KEY_MODE, mode);
  
  // Dispatch storage event for same-tab listeners
  window.dispatchEvent(new CustomEvent('themeChange', { detail: { mode } }));
};

/**
 * Apply accent color theme
 * @param {string} accentName - Name of accent theme to apply
 */
export const applyAccentColor = (accentName) => {
  const accent = accentThemes[accentName] || accentThemes.ocean;
  const root = document.documentElement;
  
  Object.entries(accent).forEach(([key, value]) => {
    if (key !== 'name') {
      root.style.setProperty(`--accent-${key}`, value);
    }
  });
  
  // Store preference and notify other tabs
  localStorage.setItem(STORAGE_KEY_ACCENT, accentName);
  
  // Dispatch storage event for same-tab listeners
  window.dispatchEvent(new CustomEvent('themeChange', { detail: { accent: accentName } }));
};

/**
 * Apply animation speed
 * @param {string} speedKey - Key from animationSpeeds object
 */
export const applyAnimationSpeed = (speedKey) => {
  const speed = animationSpeeds[speedKey] || animationSpeeds.normal;
  const root = document.documentElement;
  root.style.setProperty('--animation-speed', speed.value);
  
  // Store preference and notify other tabs
  localStorage.setItem(STORAGE_KEY_ANIMATION_SPEED, speedKey);
  
  // Dispatch event for listeners
  window.dispatchEvent(new CustomEvent('animationSpeedChange', { detail: { speed: speedKey } }));
};

/**
 * Get saved animation speed from localStorage
 * @returns {string} - Speed key
 */
export const getSavedAnimationSpeed = () => {
  return localStorage.getItem(STORAGE_KEY_ANIMATION_SPEED) || 'normal';
};

/**
 * Get saved mode from localStorage
 * @returns {string} - 'light' or 'dark'
 */
export const getSavedMode = () => {
  const saved = localStorage.getItem(STORAGE_KEY_MODE);
  if (saved) return saved;
  
  // Check system preference if no saved value
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
};

/**
 * Get saved accent theme from localStorage
 * @returns {string} - Theme name
 */
export const getSavedAccent = () => {
  return localStorage.getItem(STORAGE_KEY_ACCENT) || 'ocean';
};

/**
 * Toggle glow effect
 * @returns {boolean} - New glow enabled state
 */
export const toggleGlowEnabled = () => {
  const currentState = getSavedGlowEnabled();
  const newState = !currentState;
  applyGlowEnabled(newState);
  return newState;
};

/**
 * Apply glow enabled state
 * @param {boolean} enabled - Whether to enable glow effect
 */
export const applyGlowEnabled = (enabled) => {
  localStorage.setItem(STORAGE_KEY_GLOW_ENABLED, enabled ? 'true' : 'false');
  
  // Dispatch event for listeners
  window.dispatchEvent(new CustomEvent('glowEnabledChange', { detail: { enabled } }));
};

/**
 * Get saved glow enabled state from localStorage
 * @returns {boolean} - Whether glow is enabled
 */
export const getSavedGlowEnabled = () => {
  const saved = localStorage.getItem(STORAGE_KEY_GLOW_ENABLED);
  return saved === 'true'; // Default to false
};

/**
 * Toggle pulse effect
 * @returns {boolean} - New pulse enabled state
 */
export const togglePulseEnabled = () => {
  const currentState = getSavedPulseEnabled();
  const newState = !currentState;
  applyPulseEnabled(newState);
  return newState;
};

/**
 * Apply pulse enabled state
 * @param {boolean} enabled - Whether to enable pulse effect
 */
export const applyPulseEnabled = (enabled) => {
  localStorage.setItem(STORAGE_KEY_PULSE_ENABLED, enabled ? 'true' : 'false');
  
  // Dispatch event for listeners
  window.dispatchEvent(new CustomEvent('pulseEnabledChange', { detail: { enabled } }));
};

/**
 * Get saved pulse enabled state from localStorage
 * @returns {boolean} - Whether pulse is enabled
 */
export const getSavedPulseEnabled = () => {
  const saved = localStorage.getItem(STORAGE_KEY_PULSE_ENABLED);
  return saved === 'true'; // Default to false
};

/**
 * Apply glow animation speed
 * @param {string} speedKey - Key from animationSpeeds object
 */
export const applyGlowSpeed = (speedKey) => {
  localStorage.setItem(STORAGE_KEY_GLOW_SPEED, speedKey);
  window.dispatchEvent(new CustomEvent('glowSpeedChange', { detail: { speed: speedKey } }));
};

/**
 * Get saved glow speed from localStorage
 * @returns {string} - Speed key
 */
export const getSavedGlowSpeed = () => {
  return localStorage.getItem(STORAGE_KEY_GLOW_SPEED) || 'normal';
};

/**
 * Apply pulse animation speed
 * @param {string} speedKey - Key from animationSpeeds object
 */
export const applyPulseSpeed = (speedKey) => {
  localStorage.setItem(STORAGE_KEY_PULSE_SPEED, speedKey);
  window.dispatchEvent(new CustomEvent('pulseSpeedChange', { detail: { speed: speedKey } }));
};

/**
 * Get saved pulse speed from localStorage
 * @returns {string} - Speed key
 */
export const getSavedPulseSpeed = () => {
  return localStorage.getItem(STORAGE_KEY_PULSE_SPEED) || 'normal';
};

/**
 * Toggle between light and dark mode
 * @returns {string} - New mode
 */
export const toggleMode = () => {
  const currentMode = getSavedMode();
  const newMode = currentMode === 'light' ? 'dark' : 'light';
  applyMode(newMode);
  return newMode;
};

/**
 * Initialize theme system on app load
 */
export const initializeTheme = () => {
  const savedMode = getSavedMode();
  const savedAccent = getSavedAccent();
  const savedGlowEnabled = getSavedGlowEnabled();
  const savedPulseEnabled = getSavedPulseEnabled();
  const savedSpeed = getSavedAnimationSpeed();
  const savedGlowSpeed = getSavedGlowSpeed();
  const savedPulseSpeed = getSavedPulseSpeed();
  
  applyMode(savedMode);
  applyAccentColor(savedAccent);
  applyAnimationSpeed(savedSpeed);
  
  // Listen for storage events from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY_MODE && e.newValue) {
      applyMode(e.newValue);
    } else if (e.key === STORAGE_KEY_ACCENT && e.newValue) {
      applyAccentColor(e.newValue);
    } else if (e.key === STORAGE_KEY_GLOW_ENABLED && e.newValue !== null) {
      applyGlowEnabled(e.newValue === 'true');
    } else if (e.key === STORAGE_KEY_PULSE_ENABLED && e.newValue !== null) {
      applyPulseEnabled(e.newValue === 'true');
    } else if (e.key === STORAGE_KEY_ANIMATION_SPEED && e.newValue) {
      applyAnimationSpeed(e.newValue);
    } else if (e.key === STORAGE_KEY_GLOW_SPEED && e.newValue) {
      applyGlowSpeed(e.newValue);
    } else if (e.key === STORAGE_KEY_PULSE_SPEED && e.newValue) {
      applyPulseSpeed(e.newValue);
    }
  });
  
  return { 
    mode: savedMode, 
    accent: savedAccent, 
    glowEnabled: savedGlowEnabled,
    pulseEnabled: savedPulseEnabled,
    speed: savedSpeed, 
    glowSpeed: savedGlowSpeed, 
    pulseSpeed: savedPulseSpeed 
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
};

export default themeService;
