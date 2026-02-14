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

// Storage event channel for cross-tab synchronization
const STORAGE_KEY_MODE = 'theme-mode';
const STORAGE_KEY_ACCENT = 'theme-accent';

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
  
  applyMode(savedMode);
  applyAccentColor(savedAccent);
  
  // Listen for storage events from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY_MODE && e.newValue) {
      applyMode(e.newValue);
    } else if (e.key === STORAGE_KEY_ACCENT && e.newValue) {
      applyAccentColor(e.newValue);
    }
  });
  
  return { mode: savedMode, accent: savedAccent };
};

const themeService = {
  accentThemes,
  applyMode,
  applyAccentColor,
  getSavedMode,
  getSavedAccent,
  toggleMode,
  initializeTheme,
};

export default themeService;
