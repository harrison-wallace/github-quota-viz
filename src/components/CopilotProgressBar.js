import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import { getSavedGlowEnabled, getSavedPulseEnabled } from '../services/themeService';

const CopilotProgressBar = ({ currentUsage, quota = 1500 }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [effectsEnabled, setEffectsEnabled] = useState(false);

  useEffect(() => {
    const updateMobileStatus = () => {
      setIsMobile(window.innerWidth < 576);
    };
    updateMobileStatus();
    window.addEventListener('resize', updateMobileStatus);
    return () => window.removeEventListener('resize', updateMobileStatus);
  }, []);

  useEffect(() => {
    const glowEnabled = getSavedGlowEnabled();
    const pulseEnabled = getSavedPulseEnabled();
    setEffectsEnabled(glowEnabled || pulseEnabled);

    const handleGlowEnabledChange = (e) => {
      const pulseEnabled = getSavedPulseEnabled();
      setEffectsEnabled(e.detail.enabled || pulseEnabled);
    };

    const handlePulseEnabledChange = (e) => {
      const glowEnabled = getSavedGlowEnabled();
      setEffectsEnabled(glowEnabled || e.detail.enabled);
    };

    window.addEventListener('glowEnabledChange', handleGlowEnabledChange);
    window.addEventListener('pulseEnabledChange', handlePulseEnabledChange);
    return () => {
      window.removeEventListener('glowEnabledChange', handleGlowEnabledChange);
      window.removeEventListener('pulseEnabledChange', handlePulseEnabledChange);
    };
  }, []);

  const percentage = quota > 0 ? (currentUsage / quota) * 100 : 0;

  // Calculate month progress (days elapsed / total days in month)
  const getMonthProgress = () => {
    const now = new Date();
    const day = now.getDate();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return (day / totalDays) * 100;
  };

  const monthProgress = getMonthProgress();
  const usageAhead = percentage > monthProgress + 10; // 10% buffer

  return (
    <Card className="usage-card progress-bar-card">
      <Card.Body className="py-3 px-3">
        <div style={{ position: 'relative', marginTop: isMobile ? '16px' : '20px' }}>
          {/* Today label above the arrow */}
          <div style={{
            position: 'absolute',
            top: isMobile ? -18 : -20,
            left: `${monthProgress}%`,
            transform: 'translateX(-50%)',
            fontSize: isMobile ? '0.6rem' : '0.625rem',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            fontWeight: 500,
            pointerEvents: 'none'
          }}>
            Today
          </div>
          {/* Month progress marker (arrow pointing down) */}
          <div style={{
            position: 'absolute',
            top: isMobile ? -5 : -6,
            left: `${monthProgress}%`,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: isMobile ? '5px solid transparent' : '6px solid transparent',
            borderRight: isMobile ? '5px solid transparent' : '6px solid transparent',
            borderTop: isMobile ? `8px solid var(--text-primary)` : `10px solid var(--text-primary)`,
            zIndex: 2,
            pointerEvents: 'none'
          }} title={`Month progress: ${monthProgress.toFixed(1)}% (Day ${Math.ceil(monthProgress * 30 / 100)})`} />
          {/* Progress bar container */}
          <div style={{ position: 'relative', height: isMobile ? '32px' : '40px' }}>
            {/* Progress bar background with gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: isMobile ? '32px' : '40px',
              background: `linear-gradient(90deg, var(--accent-success) 0%, var(--accent-warning) 50%, var(--accent-danger) 100%)`,
              borderRadius: '0.5rem',
              opacity: 0.2
            }} />
            {/* Actual progress fill */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${Math.min(percentage, 100)}%`,
              height: isMobile ? '32px' : '40px',
              background: `linear-gradient(90deg, var(--accent-success) 0%, var(--accent-warning) ${monthProgress}%, var(--accent-danger) 100%)`,
              borderRadius: '0.5rem',
              transition: 'width 0.5s ease',
              animation: effectsEnabled ? `glowPulse var(--animation-speed) ease-in-out infinite` : 'none',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: isMobile ? '0.5rem' : '0.75rem',
              paddingRight: isMobile ? '0.5rem' : '0.75rem',
              gap: isMobile ? '0.5rem' : '0.75rem'
            }}>
              {/* Left side: Pace indicator and percentage */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0.35rem' : '0.5rem',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                <span style={{
                  fontSize: isMobile ? '0.65rem' : '0.75rem',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontWeight: 600
                }}>
                  <span style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    display: 'inline-block',
                    flexShrink: 0
                  }} />
                  {usageAhead ? 'Ahead' : 'On pace'}
                </span>
                <span style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  color: 'white',
                  fontWeight: 600,
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Legend */}
        {!isMobile && (
          <div className="d-flex justify-content-between mt-1" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>0%</span>
            <span>100%</span>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default CopilotProgressBar;
