import { useState, useEffect } from 'react';
import {
  initializeTheme,
  setGlowSpeed,
  setPulseSpeed,
  toggleGlowEnabled,
  togglePulseEnabled,
} from '../services/themeService';
import apiClient from '../services/apiClient';

const CHART_TYPE_SETTING_KEY = 'copilot-chart-type';

/**
 * Custom hook for managing all settings-related state.
 * Theme/effect values are initialised synchronously from localStorage (no flicker),
 * then the server is queried for the authoritative values.
 * All mutations are persisted to the server via /api/settings.
 */
export const useSettingsState = () => {
  // Chart type — initialise from localStorage cache, hydrate from server
  const [chartType, setChartType] = useState(() => {
    return localStorage.getItem(CHART_TYPE_SETTING_KEY) || 'pie';
  });

  // Effects state
  const [glowEnabled, setGlowEnabled] = useState(false);
  const [pulseEnabled, setPulseEnabled] = useState(false);
  const [glowSpeed, setGlowSpeedState] = useState('normal');
  const [pulseSpeed, setPulseSpeedState] = useState('normal');

  // Accordion expand state (UI-only, not persisted)
  const [glowExpanded, setGlowExpanded] = useState(false);
  const [pulseExpanded, setPulseExpanded] = useState(false);

  // Hydrate settings from server on mount
  useEffect(() => {
    const { glowEnabled: savedGlow, pulseEnabled: savedPulse, glowSpeed: savedGlowSpeed, pulseSpeed: savedPulseSpeed } = initializeTheme();
    setGlowEnabled(savedGlow);
    setPulseEnabled(savedPulse);
    setGlowSpeedState(savedGlowSpeed);
    setPulseSpeedState(savedPulseSpeed);

    // Async hydration from server — overwrites localStorage defaults if server has values
    apiClient.get('/settings').then(res => {
      const map = Object.fromEntries(res.data.map(r => [r.key, r.value]));

      if (map['glow-enabled']  !== undefined) setGlowEnabled(map['glow-enabled'] === 'true');
      if (map['pulse-enabled'] !== undefined) setPulseEnabled(map['pulse-enabled'] === 'true');
      if (map['glow-speed'])   setGlowSpeedState(map['glow-speed']);
      if (map['pulse-speed'])  setPulseSpeedState(map['pulse-speed']);
      if (map[CHART_TYPE_SETTING_KEY]) {
        setChartType(map[CHART_TYPE_SETTING_KEY]);
        localStorage.setItem(CHART_TYPE_SETTING_KEY, map[CHART_TYPE_SETTING_KEY]);
      }
    }).catch(() => {
      // Non-fatal — localStorage values are already applied
    });

    // Listen for DOM events dispatched by themeService
    const handleGlowEnabled  = (e) => setGlowEnabled(e.detail.enabled);
    const handlePulseEnabled = (e) => setPulseEnabled(e.detail.enabled);
    const handleGlowSpeed    = (e) => setGlowSpeedState(e.detail.speed);
    const handlePulseSpeed   = (e) => setPulseSpeedState(e.detail.speed);

    window.addEventListener('glowEnabledChange',  handleGlowEnabled);
    window.addEventListener('pulseEnabledChange', handlePulseEnabled);
    window.addEventListener('glowSpeedChange',    handleGlowSpeed);
    window.addEventListener('pulseSpeedChange',   handlePulseSpeed);

    return () => {
      window.removeEventListener('glowEnabledChange',  handleGlowEnabled);
      window.removeEventListener('pulseEnabledChange', handlePulseEnabled);
      window.removeEventListener('glowSpeedChange',    handleGlowSpeed);
      window.removeEventListener('pulseSpeedChange',   handlePulseSpeed);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Handler functions — apply to DOM + persist to server
  // ---------------------------------------------------------------------------

  const handleChartTypeChange = (type) => {
    setChartType(type);
    localStorage.setItem(CHART_TYPE_SETTING_KEY, type);
    apiClient.put(`/settings/${CHART_TYPE_SETTING_KEY}`, { value: type }).catch(() => {});
  };

  const handleGlowEnabledToggle = () => {
    const newState = toggleGlowEnabled(); // applies to DOM + updates localStorage
    setGlowEnabled(newState);
  };

  const handlePulseEnabledToggle = () => {
    const newState = togglePulseEnabled();
    setPulseEnabled(newState);
  };

  const handleGlowSpeedChange = (speedKey) => {
    setGlowSpeed(speedKey); // themeService: applies CSS + persists to server
    setGlowSpeedState(speedKey);
  };

  const handlePulseSpeedChange = (speedKey) => {
    setPulseSpeed(speedKey);
    setPulseSpeedState(speedKey);
  };

  return {
    // State
    chartType,
    glowEnabled,
    pulseEnabled,
    glowSpeed,
    pulseSpeed,
    glowExpanded,
    pulseExpanded,
    // Handlers
    handleChartTypeChange,
    handleGlowEnabledToggle,
    handlePulseEnabledToggle,
    handleGlowSpeedChange,
    handlePulseSpeedChange,
    setGlowExpanded,
    setPulseExpanded,
  };
};
