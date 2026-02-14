import { useState, useEffect } from 'react';
import {
  initializeTheme,
  applyGlowSpeed,
  applyPulseSpeed,
  toggleGlowEnabled,
  togglePulseEnabled,
} from '../services/themeService';

/**
 * Custom hook for managing all settings-related state
 * Encapsulates chart type, effects, and animation speeds
 */
export const useSettingsState = () => {
  // Chart type state with localStorage
  const [chartType, setChartType] = useState(() => {
    return localStorage.getItem('copilot-chart-type') || 'pie';
  });

  // Effects state
  const [glowEnabled, setGlowEnabled] = useState(false);
  const [pulseEnabled, setPulseEnabled] = useState(false);
  const [glowSpeed, setGlowSpeed] = useState('normal');
  const [pulseSpeed, setPulseSpeed] = useState('normal');

  // Accordion expand state
  const [glowExpanded, setGlowExpanded] = useState(false);
  const [pulseExpanded, setPulseExpanded] = useState(false);

  // Initialize settings on mount and set up listeners
  useEffect(() => {
    const { glowEnabled: savedGlowEnabled, pulseEnabled: savedPulseEnabled, glowSpeed: savedGlowSpeed, pulseSpeed: savedPulseSpeed } = initializeTheme();
    setGlowEnabled(savedGlowEnabled);
    setPulseEnabled(savedPulseEnabled);
    setGlowSpeed(savedGlowSpeed);
    setPulseSpeed(savedPulseSpeed);

    // Listen for glow enabled changes
    const handleGlowEnabledChange = (e) => {
      setGlowEnabled(e.detail.enabled);
    };

    // Listen for pulse enabled changes
    const handlePulseEnabledChange = (e) => {
      setPulseEnabled(e.detail.enabled);
    };

    // Listen for glow speed changes
    const handleGlowSpeedChange = (e) => {
      setGlowSpeed(e.detail.speed);
    };

    // Listen for pulse speed changes
    const handlePulseSpeedChange = (e) => {
      setPulseSpeed(e.detail.speed);
    };

    window.addEventListener('glowEnabledChange', handleGlowEnabledChange);
    window.addEventListener('pulseEnabledChange', handlePulseEnabledChange);
    window.addEventListener('glowSpeedChange', handleGlowSpeedChange);
    window.addEventListener('pulseSpeedChange', handlePulseSpeedChange);

    return () => {
      window.removeEventListener('glowEnabledChange', handleGlowEnabledChange);
      window.removeEventListener('pulseEnabledChange', handlePulseEnabledChange);
      window.removeEventListener('glowSpeedChange', handleGlowSpeedChange);
      window.removeEventListener('pulseSpeedChange', handlePulseSpeedChange);
    };
  }, []);

  // Handler functions
  const handleChartTypeChange = (type) => {
    setChartType(type);
    localStorage.setItem('copilot-chart-type', type);
  };

  const handleGlowEnabledToggle = () => {
    const newState = toggleGlowEnabled();
    setGlowEnabled(newState);
  };

  const handlePulseEnabledToggle = () => {
    const newState = togglePulseEnabled();
    setPulseEnabled(newState);
  };

  const handleGlowSpeedChange = (speedKey) => {
    applyGlowSpeed(speedKey);
    setGlowSpeed(speedKey);
  };

  const handlePulseSpeedChange = (speedKey) => {
    applyPulseSpeed(speedKey);
    setPulseSpeed(speedKey);
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

