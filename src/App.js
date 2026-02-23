import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { loadProfiles, getActiveProfile, setActiveProfile, getActiveToken, onProfilesChange, migrateFromLocalStorage as migrateProfiles } from './services/profileService';
import { recordDailyUsage, migrateFromLocalStorage as migrateUsage } from './services/historicalDataService';

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

  // Track when data was last fetched — used by the auto-refresh timer and
  // the visibilitychange catch-up handler to avoid redundant fetches.
  const lastFetchTime = useRef(null);

  // Initialize theme and profiles on mount (async)
  useEffect(() => {
    const { mode, accent } = initializeTheme();
    setIsDarkMode(mode === 'dark');
    setSelectedAccent(accent);

    const init = async () => {
      // Run one-time migrations from localStorage → server
      await migrateProfiles();

      // Load profiles from server
      const loadedProfiles = await loadProfiles();
      setProfiles(loadedProfiles);
      const active = getActiveProfile(loadedProfiles);
      setActiveProfileState(active);

      // Migrate historical usage data for all known profile IDs
      if (loadedProfiles.length > 0) {
        await migrateUsage(loadedProfiles.map(p => p.id));
      }
    };

    init().catch(err => console.error('[App] init error:', err));

    // Listen for theme changes
    const handleThemeChange = () => {
      setIsDarkMode(getSavedMode() === 'dark');
    };

    window.addEventListener('storage', handleThemeChange);
    window.addEventListener('themeChange', handleThemeChange);

    // Listen for profile changes (modal creates/deletes)
    const unsubscribeProfiles = onProfilesChange(async () => {
      const updated = await loadProfiles();
      setProfiles(updated);
      setActiveProfileState(prev => {
        // Keep the same active profile if it still exists, else fall back
        const stillExists = updated.find(p => p.id === prev?.id);
        return stillExists || getActiveProfile(updated);
      });
    });

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('themeChange', handleThemeChange);
      unsubscribeProfiles();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Fetch decrypted token from server — never stored in the browser
      const token = await getActiveToken(activeProfile.id);

      const [summaryRaw, premiumRaw] = await Promise.all([
        getUsageSummary(activeProfile.username, token),
        getPremiumRequestUsage(activeProfile.username, token),
      ]);

      const summary = transformUsageSummary(summaryRaw);
      const premium = transformPremiumRequestData(premiumRaw);

      setSummaryData(summary);
      setPremiumData(premium);
      setLastUpdated(new Date());
      lastFetchTime.current = Date.now();

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
  // Use stable primitives (id, username) rather than the full object reference
  // so this callback — and the timer that depends on it — isn't recreated on
  // every profile-related state update.
  }, [activeProfile?.id, activeProfile?.username]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch and hourly auto-refresh
  useEffect(() => {
    if (activeProfile?.username) {
      fetchUsageData();
    }

    const AUTO_REFRESH_MS = 60 * 60 * 1000; // 60 minutes

    const autoRefreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && activeProfile?.username) {
        fetchUsageData();
      }
    }, AUTO_REFRESH_MS);

    // Catch-up handler: if a timer tick was missed while the tab was hidden,
    // fire a refresh as soon as the tab becomes visible again — but only if
    // it has been at least 60 minutes since the last successful fetch.
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        activeProfile?.username &&
        (lastFetchTime.current === null ||
          Date.now() - lastFetchTime.current >= AUTO_REFRESH_MS)
      ) {
        fetchUsageData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(autoRefreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeProfile?.username, fetchUsageData]);

  // Update "last updated" display every minute
  useEffect(() => {
    const displayUpdateInterval = setInterval(() => {
      setLastUpdated(prev => prev ? new Date(prev) : null);
    }, 60000);

    return () => clearInterval(displayUpdateInterval);
  }, []);

  const handleProfileChange = (profileId) => {
    setActiveProfile(profileId);
    const profile = profiles.find(p => p.id === profileId);
    setActiveProfileState(profile);
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

            {/* Top Row: Projection (60%) + Model Table (40%) */}
            <Row className="mb-2 g-2 equal-height-row">
              <Col xl={7} lg={12} className="mb-2 mb-xl-0">
                <ProjectionCard
                  className="h-100"
                  profileId={activeProfile?.id}
                  copilotUsage={premiumData?.totalRequests || summaryData.copilot?.totalRequests || 0}
                  copilotQuota={1500}
                  actionsUsage={summaryData.actions?.minutes || 0}
                  actionsQuota={3000}
                  title="Usage Projection"
                />
              </Col>
              <Col xl={5} lg={12}>
                <ModelBreakdownTable
                  className="h-100"
                  premiumData={premiumData}
                  copilotData={summaryData.copilot}
                />
              </Col>
            </Row>

            {/* Cost Summary */}
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

            {/* Available Models */}
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
            setActiveProfileState(getActiveProfile(updatedProfiles));
          }}
        />
      </Container>
    </div>
  );
}

export default App;
