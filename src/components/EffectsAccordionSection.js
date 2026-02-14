import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { FaChevronDown } from 'react-icons/fa';
import { animationSpeeds } from '../services/themeService';

/**
 * Accordion section for nested dropdown items
 * Allows expanding/collapsing a section with a header and content
 */
export const EffectsAccordionSection = ({
  title,
  isEnabled,
  onToggle,
  speed,
  onSpeedChange,
  isExpanded,
  onExpandToggle,
}) => {
  // Prevent dropdown from closing when clicking inside accordion
  const handleItemClick = (e) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* Section Header with Toggle */}
      <Dropdown.Item
        className="effects-accordion-header"
        onClick={(e) => {
          handleItemClick(e);
          onExpandToggle();
        }}
      >
        <div className="effects-accordion-header-content">
          <FaChevronDown 
            className={`effects-accordion-chevron ${isExpanded ? 'expanded' : ''}`}
            size={12}
          />
          <span className="effects-accordion-title">{title}</span>
          <span className={`effects-accordion-status ${isEnabled ? 'enabled' : 'disabled'}`}>
            {isEnabled ? '● On' : '○ Off'}
          </span>
        </div>
      </Dropdown.Item>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="effects-accordion-content" onClick={handleItemClick}>
          {/* Toggle Button */}
          <div 
            className="effects-accordion-toggle"
            onClick={(e) => {
              handleItemClick(e);
              onToggle();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleItemClick(e);
                onToggle();
              }
            }}
          >
            <span className={`effects-accordion-toggle-text ${isEnabled ? 'active' : ''}`}>
              {isEnabled ? '✓ Enabled' : 'Disabled'}
            </span>
          </div>

          {/* Speed Selector */}
          <div className="effects-accordion-speed-section">
            <div className="effects-accordion-speed-label">
              {title} Speed
            </div>
            {Object.entries(animationSpeeds).map(([key, speedObj]) => (
              <div
                key={key}
                className={`effects-accordion-speed-item ${speed === key ? 'active' : ''}`}
                onClick={(e) => {
                  handleItemClick(e);
                  onSpeedChange(key);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleItemClick(e);
                    onSpeedChange(key);
                  }
                }}
              >
                {speedObj.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default EffectsAccordionSection;
