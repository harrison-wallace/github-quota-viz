import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Alert, Button, Dropdown, DropdownButton } from 'react-bootstrap';
import { FaGithub, FaPalette, FaSync, FaMoon, FaSun, FaCog, FaUser } from 'react-icons/fa';
import ActionsUsageCard from './components/ActionsUsageCard';
import CopilotUsageCard from './components/CopilotUsageCard';
import CostSummaryCard from './components/CostSummaryCard';
import ProjectionCard from './components/ProjectionCard';
import { LoadingSkeleton } from './components/SkeletonCard';
import ProfileModal from './components/ProfileModal';
import EffectsAccordionSection from './components/EffectsAccordionSection';
import { LazyLoadWrapper, LazyLoadCardSkeleton } from './hooks/useLazyLoad';
import { useSettingsState } from './hooks/useSettingsState';
import { getUsageSummary, getPremiumRequestUsage, transformUsageSummary, transformPremiumRequestData } from './services/githubApi';
import { accentThemes, initializeTheme, applyAccentColor, toggleMode, getSavedMode } from './services/themeService';
import { loadProfiles, getActiveProfile, setActiveProfile, onProfilesChange, maskToken } from './services/profileService';
import { recordDailyUsage } from './services/historicalDataService';

const ACCENT_THEMES = Object.keys(accentThemes).map(key => ({
  id: key,
  name: accentThemes[key].name
}));

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [premiumData, setPremiumData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedAccent, setSelectedAccent] = useState('ocean');

  // Settings state using custom hook
  const {
    chartType,
    glowEnabled,
    pulseEnabled,
    glowSpeed,
    pulseSpeed,
    glowExpanded,
    pulseExpanded,
    handleChartTypeChange,
    handleGlowEnabledToggle,
    handlePulseEnabledToggle,
    handleGlowSpeedChange,
    handlePulseSpeedChange,
    setGlowExpanded,
    setPulseExpanded,
  } = useSettingsState();

  // Profile state
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfileState] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Initialize theme and profiles on mount
  useEffect(() => {
    const { mode, accent } = initializeTheme();
    setIsDarkMode(mode === 'dark');
    setSelectedAccent(accent);

    // Load profiles
    const loadedProfiles = loadProfiles();
    setProfiles(loadedProfiles);
    const active = getActiveProfile();
    setActiveProfileState(active);

    // Listen for theme changes from other tabs
    const handleThemeChange = () => {
      setIsDarkMode(getSavedMode() === 'dark');
    };

    window.addEventListener('storage', handleThemeChange);
    window.addEventListener('themeChange', handleThemeChange);

    // Listen for profile changes from other tabs
    const unsubscribeProfiles = onProfilesChange((updatedProfiles) => {
      setProfiles(updatedProfiles);
    });

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('themeChange', handleThemeChange);
      unsubscribeProfiles();
    };
  }, []);

  const fetchUsageData = useCallback(async () => {
    if (!activeProfile) {
      setError('Please select a profile');
      return;
    }
    
    if (!activeProfile.username) {
      setError('Selected profile has no username configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [summaryRaw, premiumRaw] = await Promise.all([
        getUsageSummary(activeProfile.username),
        getPremiumRequestUsage(activeProfile.username)
      ]);

      const summary = transformUsageSummary(summaryRaw);
      const premium = transformPremiumRequestData(premiumRaw);

      setSummaryData(summary);
      setPremiumData(premium);
      setLastUpdated(new Date());

      // Record daily usage for historical tracking
      if (activeProfile.id && summary) {
        recordDailyUsage(activeProfile.id, 'copilot', premium?.totalRequests || summary.copilot?.totalRequests || 0);
        recordDailyUsage(activeProfile.id, 'actions', summary.actions?.minutes || 0);
      }
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError(err.message || 'Failed to fetch usage data. Please check your GitHub token and username.');
      setSummaryData(null);
      setPremiumData(null);
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  // Initial fetch and hourly auto-refresh
  useEffect(() => {
    if (activeProfile?.username) {
      fetchUsageData();
    }

    // Set up hourly auto-refresh
    const autoRefreshInterval = setInterval(() => {
      // Only refresh if the tab is visible
      if (document.visibilityState === 'visible' && activeProfile?.username) {
        fetchUsageData();
      }
    }, 60 * 60 * 1000); // 1 hour in milliseconds

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeProfile?.username) {
        // Tab is now visible - auto-refresh will continue if needed
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(autoRefreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeProfile?.username, fetchUsageData]); // Depend on active profile username

  // Update display every minute to show fresh "last updated" time
  useEffect(() => {
    const displayUpdateInterval = setInterval(() => {
      // Force component to re-render by setting a dummy state
      // This updates the "last updated" text display
      setLastUpdated(prev => prev ? new Date(prev) : null);
    }, 60000); // Update every minute

    return () => {
      clearInterval(displayUpdateInterval);
    };
  }, []);

  const handleProfileChange = (profileId) => {
    setActiveProfile(profileId);  // Save to sessionStorage via profileService
    const profile = profiles.find(p => p.id === profileId);
    setActiveProfileState(profile);
    
    // Refresh data with new profile
    if (profile?.username) {
      fetchUsageData();
    }
  };

  const handleAccentChange = (accentId) => {
    applyAccentColor(accentId);
    setSelectedAccent(accentId);
  };

  const handleDarkModeToggle = () => {
    const newMode = toggleMode();
    setIsDarkMode(newMode === 'dark');
  };

  const handleRefresh = () => {
    if (activeProfile?.username) {
      fetchUsageData();
    }
  };

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

  return (
    <div className="app-container">
      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <FaGithub size={32} style={{ color: 'var(--accent-primary)' }} />
                    <h1 className="mb-0">GitHub Usage Dashboard</h1>
                  </div>
                  {lastUpdated && (
                    <small className="text-muted" style={{ marginLeft: '2.5rem' }}>
                      Last updated {getLastUpdatedText()} • Auto-refresh every hour
                    </small>
                  )}
                </div>
              </div>
              
               <div className="d-flex gap-2 align-items-center flex-wrap" style={{ width: '100%' }}>
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleRefresh}
                    disabled={loading || !activeProfile?.username}
                    title="Refresh data manually"
                    style={{ flexShrink: 0 }}
                  >
                    <FaSync className={loading ? 'spinning' : ''} />
                  </Button>

                  <Button
                    variant="outline-secondary"
                    onClick={handleDarkModeToggle}
                    title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                    style={{ flexShrink: 0 }}
                  >
                    {isDarkMode ? <FaSun /> : <FaMoon />}
                  </Button>

                  {/* Profile Selector */}
                  {profiles.length === 0 ? (
                    <Button
                      variant="outline-primary"
                      onClick={() => setShowProfileModal(true)}
                      style={{ flexShrink: 0 }}
                    >
                      <FaUser className="me-1" /> Add Profile
                    </Button>
                  ) : (
                    <DropdownButton
                      variant="outline-secondary"
                      title={<><FaUser /> {activeProfile?.name || 'Profile'}</>}
                      id="profile-dropdown"
                      style={{ flexShrink: 0 }}
                    >
                       {profiles.map(profile => (
                         <Dropdown.Item
                           key={profile.id}
                           active={activeProfile?.id === profile.id}
                           onClick={() => handleProfileChange(profile.id)}
                         >
                           <div className="d-flex flex-column">
                             <span><strong>{profile.name}</strong></span>
                             <small className="text-muted">@{profile.username} • {maskToken(profile.token)}</small>
                           </div>
                         </Dropdown.Item>
                       ))}
                       <Dropdown.Divider />
                       <Dropdown.Item onClick={() => setShowProfileModal(true)}>
                         + Add/Manage Profiles
                       </Dropdown.Item>
                    </DropdownButton>
                  )}

                   <DropdownButton
                    variant="outline-secondary"
                    title={<><FaPalette /> Theme</>}
                    id="theme-dropdown"
                    style={{ flexShrink: 0 }}
                  >
                    {ACCENT_THEMES.map(theme => (
                      <Dropdown.Item
                        key={theme.id}
                        active={selectedAccent === theme.id}
                        onClick={() => handleAccentChange(theme.id)}
                      >
                        {theme.name}
                      </Dropdown.Item>
                    ))}
                  </DropdownButton>

                    <DropdownButton
                     variant="outline-secondary"
                     title={<><FaCog /> Settings</>}
                     id="settings-dropdown"
                     style={{ flexShrink: 0 }}
                    >
                     <Dropdown.Header>Chart Type</Dropdown.Header>
                     <Dropdown.Item
                       active={chartType === 'pie'}
                       onClick={() => handleChartTypeChange('pie')}
                     >
                       Pie Chart
                     </Dropdown.Item>
                     <Dropdown.Item
                       active={chartType === 'bar-horizontal'}
                       onClick={() => handleChartTypeChange('bar-horizontal')}
                     >
                       Bar Chart
                     </Dropdown.Item>
                     <Dropdown.Divider />
                     <Dropdown.Header>Progress Bar Effects</Dropdown.Header>
                     
                     <EffectsAccordionSection
                       title="Glow"
                       isEnabled={glowEnabled}
                       onToggle={handleGlowEnabledToggle}
                       speed={glowSpeed}
                       onSpeedChange={handleGlowSpeedChange}
                       isExpanded={glowExpanded}
                       onExpandToggle={() => setGlowExpanded(!glowExpanded)}
                     />
                     
                     <EffectsAccordionSection
                       title="Pulse"
                       isEnabled={pulseEnabled}
                       onToggle={handlePulseEnabledToggle}
                       speed={pulseSpeed}
                       onSpeedChange={handlePulseSpeedChange}
                       isExpanded={pulseExpanded}
                       onExpandToggle={() => setPulseExpanded(!pulseExpanded)}
                     />
                    </DropdownButton>
                </div>
            </div>
          </Col>
        </Row>

        {error && (
          <Row className="mb-3">
            <Col>
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                <Alert.Heading>Error</Alert.Heading>
                {error}
              </Alert>
            </Col>
          </Row>
        )}

        {loading && (
          <LoadingSkeleton />
        )}

        {!loading && summaryData && (
          <>
            {/* Copilot Projection - Top Priority */}
            <Row className="mb-3">
              <Col lg={8} className="mx-auto">
                <LazyLoadWrapper 
                  placeholder={<LazyLoadCardSkeleton title="Projection" />}
                  rootMargin="200px"
                >
                  <ProjectionCard
                    profileId={activeProfile?.id}
                    metric="copilot"
                    currentUsage={premiumData?.totalRequests || summaryData.copilot?.totalRequests || 0}
                    quota={1500}
                    title="Copilot Projection"
                  />
                </LazyLoadWrapper>
              </Col>
            </Row>

            {/* Copilot Pie Chart - Centered at Top */}
            <Row className="mb-3">
              <Col lg={8} className="mx-auto">
                <LazyLoadWrapper 
                  placeholder={<LazyLoadCardSkeleton title="Copilot Usage" />}
                  rootMargin="200px"
                >
                  <CopilotUsageCard 
                    premiumData={premiumData} 
                    copilotData={summaryData.copilot}
                    quota={1500}
                    chartType={chartType}
                  />
                </LazyLoadWrapper>
              </Col>
            </Row>

            {/* Cost Summary Below */}
            <Row className="mb-3">
              <Col>
                <LazyLoadWrapper 
                  placeholder={<LazyLoadCardSkeleton title="Cost Summary" />}
                  rootMargin="300px"
                >
                  <CostSummaryCard summaryData={summaryData} premiumData={premiumData} />
                </LazyLoadWrapper>
              </Col>
            </Row>

            {/* Actions Projection */}
            <Row className="mb-3">
              <Col lg={8} className="mx-auto">
                <LazyLoadWrapper 
                  placeholder={<LazyLoadCardSkeleton title="Actions Projection" />}
                  rootMargin="300px"
                >
                  <ProjectionCard
                    profileId={activeProfile?.id}
                    metric="actions"
                    currentUsage={summaryData.actions?.minutes || 0}
                    quota={3000}
                    title="Actions Projection"
                  />
                </LazyLoadWrapper>
              </Col>
            </Row>

            {/* Actions Usage */}
            <Row className="mb-3">
              <Col lg={8} className="mx-auto">
                <LazyLoadWrapper 
                  placeholder={<LazyLoadCardSkeleton title="Actions Usage" />}
                  rootMargin="300px"
                >
                  <ActionsUsageCard 
                    actionsData={summaryData.actions}
                    quota={3000}
                  />
                </LazyLoadWrapper>
              </Col>
            </Row>
          </>
        )}

         {!loading && !summaryData && !error && activeProfile && (
           <Row>
             <Col className="text-center text-muted py-5">
               <p>No data available. Click "Refresh" to load usage data.</p>
             </Col>
           </Row>
         )}
 
         {!loading && !summaryData && !error && !activeProfile && (
           <Row>
             <Col className="text-center text-muted py-5">
               <FaGithub size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
               <p>Please add a GitHub profile to view usage data.</p>
               <Button 
                 variant="primary" 
                 onClick={() => setShowProfileModal(true)}
                 className="mt-3"
               >
                 <FaUser className="me-2" />
                 Add Profile
               </Button>
             </Col>
           </Row>
         )}

        {/* Profile Management Modal */}
        <ProfileModal
          show={showProfileModal}
          onHide={() => setShowProfileModal(false)}
          profiles={profiles}
          onProfilesUpdated={(updatedProfiles) => {
            setProfiles(updatedProfiles);
            const active = getActiveProfile();
            setActiveProfileState(active);
          }}
        />
      </Container>
    </div>
  );
}

export default App;
