import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Alert, Button } from 'react-bootstrap';
import { FaGithub, FaUser } from 'react-icons/fa';
import CopilotProgressBar from './components/CopilotProgressBar';
import ModelBreakdownTable from './components/ModelBreakdownTable';
import CostSummaryCard from './components/CostSummaryCard';
import AvailableModelsCard from './components/AvailableModelsCard';
import ProjectionCard from './components/ProjectionCard';
import { LoadingSkeleton } from './components/SkeletonCard';
import ProfileModal from './components/ProfileModal';
import NavBar from './components/NavBar';
import EffectsAccordionSection from './components/EffectsAccordionSection';
import { LazyLoadWrapper, LazyLoadCardSkeleton } from './hooks/useLazyLoad';
import { useSettingsState } from './hooks/useSettingsState';
import { getUsageSummary, getPremiumRequestUsage, transformUsageSummary, transformPremiumRequestData } from './services/githubApi';
import { accentThemes, initializeTheme, applyAccentColor, toggleMode, getSavedMode } from './services/themeService';
import { loadProfiles, getActiveProfile, setActiveProfile, onProfilesChange } from './services/profileService';
import { recordDailyUsage } from './services/historicalDataService';

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
    glowEnabled,
    pulseEnabled,
    glowSpeed,
    pulseSpeed,
    glowExpanded,
    pulseExpanded,
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

  return (
    <div className="app-container">
      <NavBar
        loading={loading}
        isDarkMode={isDarkMode}
        activeProfile={activeProfile}
        profiles={profiles}
        selectedAccent={selectedAccent}
        lastUpdated={lastUpdated}
        glowEnabled={glowEnabled}
        pulseEnabled={pulseEnabled}
        glowSpeed={glowSpeed}
        pulseSpeed={pulseSpeed}
        glowExpanded={glowExpanded}
        pulseExpanded={pulseExpanded}
        onDarkModeToggle={handleDarkModeToggle}
        onRefresh={handleRefresh}
        onProfileChange={handleProfileChange}
        onAccentChange={handleAccentChange}
        onShowProfileModal={() => setShowProfileModal(true)}
        onGlowEnabledToggle={handleGlowEnabledToggle}
        onPulseEnabledToggle={handlePulseEnabledToggle}
        onGlowSpeedChange={handleGlowSpeedChange}
        onPulseSpeedChange={handlePulseSpeedChange}
        onSetGlowExpanded={setGlowExpanded}
        onSetPulseExpanded={setPulseExpanded}
        accentThemes={accentThemes}
        EffectsAccordionSection={EffectsAccordionSection}
      />

      <Container fluid className="pt-2 pb-4">

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
            {/* Progress Bar - Full Width */}
            <Row className="mb-2">
              <Col>
                <LazyLoadWrapper 
                  placeholder={<LazyLoadCardSkeleton title="Usage Progress" />}
                  rootMargin="200px"
                >
                  <CopilotProgressBar
                    currentUsage={premiumData?.totalRequests || summaryData.copilot?.totalRequests || 0}
                    quota={1500}
                  />
                </LazyLoadWrapper>
              </Col>
            </Row>

            {/* Top Row: Projection (60%) + Model Table (40%) - Side by side on large screens */}
            <Row className="mb-2 g-2">
              <Col xl={7} lg={12} className="mb-2 mb-xl-0">
                <LazyLoadWrapper 
                  placeholder={<LazyLoadCardSkeleton title="Projection" />}
                  rootMargin="200px"
                >
                  <ProjectionCard
                    className="h-100"
                    profileId={activeProfile?.id}
                    copilotUsage={premiumData?.totalRequests || summaryData.copilot?.totalRequests || 0}
                    copilotQuota={1500}
                    actionsUsage={summaryData.actions?.minutes || 0}
                    actionsQuota={3000}
                    title="Usage Projection"
                  />
                </LazyLoadWrapper>
              </Col>
              <Col xl={5} lg={12}>
                <LazyLoadWrapper 
                  placeholder={<LazyLoadCardSkeleton title="Models Used" />}
                  rootMargin="200px"
                >
                  <ModelBreakdownTable
                    className="h-100"
                    premiumData={premiumData}
                    copilotData={summaryData.copilot}
                  />
                </LazyLoadWrapper>
              </Col>
            </Row>

            {/* Cost Summary Below */}
            <Row className="mb-2">
              <Col>
                <LazyLoadWrapper 
                  placeholder={<LazyLoadCardSkeleton title="Cost Summary" />}
                  rootMargin="300px"
                >
                  <CostSummaryCard summaryData={summaryData} premiumData={premiumData} />
                </LazyLoadWrapper>
              </Col>
            </Row>

            {/* Available Models Below Cost Summary */}
            <Row className="mb-2">
              <Col>
                <LazyLoadWrapper 
                  placeholder={<LazyLoadCardSkeleton title="Available Models" />}
                  rootMargin="300px"
                >
                  <AvailableModelsCard />
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
