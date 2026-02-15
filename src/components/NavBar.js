import React, { useState } from 'react';
import { FaGithub, FaPalette, FaSync, FaMoon, FaSun, FaCog, FaUser, FaBars, FaTimes } from 'react-icons/fa';
import { Button, Dropdown, DropdownButton } from 'react-bootstrap';

function NavBar({
  loading,
  isDarkMode,
  activeProfile,
  profiles,
  selectedAccent,
  lastUpdated,
  glowEnabled,
  pulseEnabled,
  glowSpeed,
  pulseSpeed,
  glowExpanded,
  pulseExpanded,
  onDarkModeToggle,
  onRefresh,
  onProfileChange,
  onAccentChange,
  onShowProfileModal,
  onGlowEnabledToggle,
  onPulseEnabledToggle,
  onGlowSpeedChange,
  onPulseSpeedChange,
  onSetGlowExpanded,
  onSetPulseExpanded,
  accentThemes,
  EffectsAccordionSection
}) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Format last updated time
  const getLastUpdatedText = () => {
    if (!lastUpdated) return '';
    
    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return lastUpdated.toLocaleString();
  };

  const closeMobileMenu = () => setShowMobileMenu(false);

  const ACCENT_THEMES = Object.keys(accentThemes).map(key => ({
    id: key,
    name: accentThemes[key].name
  }));

  return (
    <nav className="navbar-compact">
      <div className="navbar-content">
        {/* Left Section - Control Buttons */}
        <div className="navbar-section navbar-left">
          <Button 
            className="btn-navbar-icon navbar-btn"
            onClick={onRefresh}
            disabled={loading || !activeProfile?.username}
            title="Refresh data manually"
          >
            <FaSync className={loading ? 'spinning' : ''} />
          </Button>

          <Button
            className="btn-navbar-icon navbar-btn"
            onClick={onDarkModeToggle}
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            {isDarkMode ? <FaSun /> : <FaMoon />}
          </Button>

          {/* Profile Selector */}
          {profiles.length === 0 ? (
            <Button
              className="btn-navbar-icon navbar-btn"
              onClick={onShowProfileModal}
              title="Add Profile"
            >
              <FaUser />
            </Button>
          ) : (
            <DropdownButton
              className="btn-navbar-icon navbar-dropdown"
              title={<FaUser />}
              id="profile-dropdown"
            >
              {profiles.map(profile => (
                <Dropdown.Item
                  key={profile.id}
                  active={activeProfile?.id === profile.id}
                  onClick={() => {
                    onProfileChange(profile.id);
                    closeMobileMenu();
                  }}
                >
                  <div className="dropdown-profile-item">
                    <span><strong>{profile.name}</strong></span>
                  </div>
                </Dropdown.Item>
              ))}
              <Dropdown.Divider />
              <Dropdown.Item onClick={() => {
                onShowProfileModal();
                closeMobileMenu();
              }}>
                + Add/Manage Profiles
              </Dropdown.Item>
            </DropdownButton>
          )}

          <DropdownButton
            className="btn-navbar-icon navbar-dropdown"
            title={<FaPalette />}
            id="theme-dropdown"
          >
            {ACCENT_THEMES.map(theme => (
              <Dropdown.Item
                key={theme.id}
                active={selectedAccent === theme.id}
                onClick={() => {
                  onAccentChange(theme.id);
                  closeMobileMenu();
                }}
              >
                {theme.name}
              </Dropdown.Item>
            ))}
          </DropdownButton>

          <DropdownButton
            className="btn-navbar-icon navbar-dropdown"
            title={<FaCog />}
            id="settings-dropdown"
          >
            <Dropdown.Header>Progress Bar Effects</Dropdown.Header>
            
            <EffectsAccordionSection
              title="Glow"
              isEnabled={glowEnabled}
              onToggle={onGlowEnabledToggle}
              speed={glowSpeed}
              onSpeedChange={onGlowSpeedChange}
              isExpanded={glowExpanded}
              onExpandToggle={() => onSetGlowExpanded(!glowExpanded)}
            />
            
            <EffectsAccordionSection
              title="Pulse"
              isEnabled={pulseEnabled}
              onToggle={onPulseEnabledToggle}
              speed={pulseSpeed}
              onSpeedChange={onPulseSpeedChange}
              isExpanded={pulseExpanded}
              onExpandToggle={() => onSetPulseExpanded(!pulseExpanded)}
            />
          </DropdownButton>
        </div>

        {/* Center Section - Title */}
        <div className="navbar-section navbar-center">
          <div className="navbar-title-wrapper">
            <FaGithub className="navbar-icon" />
            <h1 className="navbar-title">GitHub Usage</h1>
          </div>
        </div>

        {/* Right Section - Last Updated & Mobile Menu Toggle */}
        <div className="navbar-section navbar-right">
          {lastUpdated && (
            <div className="navbar-updated">
              <small>{getLastUpdatedText()}</small>
            </div>
          )}
          
          {/* Mobile Menu Toggle - Hidden on Desktop */}
          <Button
            className="btn-navbar-icon navbar-hamburger"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            title="Menu"
          >
            {showMobileMenu ? <FaTimes /> : <FaBars />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu - Shown on Small Screens */}
      {showMobileMenu && (
        <div className="navbar-mobile-menu">
          <div className="mobile-menu-item">
            <Button 
              className="btn-navbar-icon"
              onClick={() => {
                onRefresh();
                closeMobileMenu();
              }}
              disabled={loading || !activeProfile?.username}
            >
              <FaSync className={loading ? 'spinning' : ''} /> Refresh
            </Button>
          </div>

          <div className="mobile-menu-item">
            <Button
              className="btn-navbar-icon"
              onClick={() => {
                onDarkModeToggle();
                closeMobileMenu();
              }}
            >
              {isDarkMode ? <FaSun /> : <FaMoon />} {isDarkMode ? 'Light' : 'Dark'} Mode
            </Button>
          </div>

          <div className="mobile-menu-item">
            {profiles.length > 0 ? (
              <DropdownButton
                variant="outline-secondary"
                title={<><FaUser /> {activeProfile?.name || 'Profile'}</>}
                id="mobile-profile-dropdown"
                onClick={(event) => event.stopPropagation()}
              >
                {profiles.map(profile => (
                  <Dropdown.Item
                    key={profile.id}
                    active={activeProfile?.id === profile.id}
                    onClick={() => {
                      onProfileChange(profile.id);
                      closeMobileMenu();
                    }}
                  >
                    {profile.name}
                  </Dropdown.Item>
                ))}
                <Dropdown.Divider />
                <Dropdown.Item onClick={() => {
                  onShowProfileModal();
                  closeMobileMenu();
                }}>
                  + Add/Manage Profiles
                </Dropdown.Item>
              </DropdownButton>
            ) : (
              <Button
                variant="outline-secondary"
                onClick={() => {
                  onShowProfileModal();
                  closeMobileMenu();
                }}
              >
                <FaUser /> Add Profile
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default NavBar;
