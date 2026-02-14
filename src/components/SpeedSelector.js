import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { animationSpeeds } from '../services/themeService';

/**
 * Reusable component for selecting animation speed
 */
export const SpeedSelector = ({ currentSpeed, onSpeedChange, label, className = '' }) => {
  return (
    <>
      <Dropdown.Header className={className}>{label}</Dropdown.Header>
      {Object.entries(animationSpeeds).map(([key, speed]) => (
        <Dropdown.Item
          key={key}
          active={currentSpeed === key}
          onClick={() => onSpeedChange(key)}
          className="settings-speed-item"
        >
          {speed.name}
        </Dropdown.Item>
      ))}
    </>
  );
};

export default SpeedSelector;
