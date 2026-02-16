import React, { useMemo } from 'react';
import { Card, ProgressBar, Alert } from 'react-bootstrap';
import { FaChartLine, FaExclamationTriangle, FaCheckCircle, FaRobot, FaTerminal } from 'react-icons/fa';
import { calculateBurnRate, projectEndOfMonthUsage, getDaysRemainingInMonth } from '../services/historicalDataService';

const ProjectionCard = ({ 
  profileId, 
  copilotUsage, 
  copilotQuota = 1500,
  actionsUsage,
  actionsQuota = 3000,
  title = 'Usage Projection',
  className = ''
}) => {
  const copilotBurnRate = useMemo(() => {
    return calculateBurnRate(profileId, 'copilot', 7);
  }, [profileId]);

  const actionsBurnRate = useMemo(() => {
    return calculateBurnRate(profileId, 'actions', 7);
  }, [profileId]);

  const copilotProjection = useMemo(() => {
    if (!copilotBurnRate) return null;
    return projectEndOfMonthUsage(copilotUsage, copilotBurnRate.dailyRate, copilotQuota);
  }, [copilotBurnRate, copilotUsage, copilotQuota]);

  const actionsProjection = useMemo(() => {
    if (!actionsBurnRate) return null;
    return projectEndOfMonthUsage(actionsUsage, actionsBurnRate.dailyRate, actionsQuota);
  }, [actionsBurnRate, actionsUsage, actionsQuota]);

  const daysRemaining = getDaysRemainingInMonth();

  const {
    projectedTotal: copilotProjectedTotal,
    percentageOfQuota: copilotPercentage,
    willExceedQuota: copilotWillExceed,
    usageHeadroom: copilotHeadroom
  } = copilotProjection || {};

  const copilotCurrentRemaining = copilotQuota - copilotUsage;

  return (
    <Card className={`usage-card projection-card compact-projection-card h-100 ${className}`}>
      <Card.Header as="h6" className="compact-header">
        <FaChartLine className="me-2" />
        {title}
      </Card.Header>
      <Card.Body className="compact-body">
        {/* Current Status Section - Always Visible */}
        <div className="mb-3 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '0.875rem' }}>
            <span className="text-secondary">Current Usage:</span>
            <span className="fw-bold">{copilotUsage.toFixed(0)} / {copilotQuota}</span>
          </div>
          <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '0.875rem' }}>
            <span className="text-secondary">Requests Remaining:</span>
            <span className="fw-bold" style={{ color: 'var(--accent-success)' }}>{copilotCurrentRemaining.toFixed(0)}</span>
          </div>
        </div>

        {/* Projections Section - Conditional */}
        {copilotBurnRate && copilotProjection ? (
          <>
            {/* Copilot Alert */}
            {copilotWillExceed && (
              <Alert variant="danger" className="mb-2 py-2 px-2 compact-alert">
                <div className="d-flex align-items-center">
                  <FaExclamationTriangle className="me-2" style={{ fontSize: '0.875rem' }} />
                  <div>
                    <strong style={{ fontSize: '0.8125rem' }}>Projected Overage</strong>
                    <div style={{ fontSize: '0.75rem' }}>
                      Will exceed quota by <strong>{(copilotProjectedTotal - copilotQuota).toFixed(0)}</strong> requests at EOM
                    </div>
                  </div>
                </div>
              </Alert>
            )}

            {!copilotWillExceed && (
              <Alert variant="success" className="mb-2 py-2 px-2 compact-alert">
                <div className="d-flex align-items-center">
                  <FaCheckCircle className="me-2" style={{ fontSize: '0.875rem' }} />
                  <div style={{ fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                    <strong style={{ fontSize: '0.8125rem' }}>On Track</strong>
                    <span style={{ whiteSpace: 'nowrap' }}>Projected: {copilotHeadroom.toFixed(0)} requests remaining at EOM</span>
                  </div>
                </div>
              </Alert>
            )}

            {/* Copilot Projected Usage Progress Bar */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.8125rem' }}>
                <span className="fw-bold">
                  <FaRobot className="me-1" style={{ fontSize: '0.75rem' }} />
                  Projected EOM Usage
                </span>
              </div>
              <div className="projection-progress">
                <ProgressBar
                  now={Math.min(copilotPercentage, 100)}
                  variant={copilotPercentage <= 75 ? 'success' : copilotPercentage <= 90 ? 'warning' : 'danger'}
                  className="projection-progress-bar"
                  label=""
                  srOnly
                  aria-valuetext={`${copilotProjectedTotal.toFixed(0)} of ${copilotQuota}`}
                />
                <div className="projection-progress-overlay">
                  <span className="projection-progress-usage">
                    {copilotProjectedTotal.toFixed(0)} / {copilotQuota}
                  </span>
                  <span className="projection-progress-percent">
                    {copilotPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <Alert variant="info" className="mb-3 py-2 px-2 compact-alert">
            <div className="d-flex align-items-start">
              <FaChartLine className="me-2 mt-1" style={{ fontSize: '0.875rem' }} />
              <div>
                <strong style={{ fontSize: '0.8125rem' }}>Projections Unavailable</strong>
                <div style={{ fontSize: '0.75rem' }}>
                  Insufficient historical data. Check back after 2+ days of usage for EOM projections.
                </div>
              </div>
            </div>
          </Alert>
        )}

        {/* Actions Projected Usage Progress Bar */}
        {actionsProjection && actionsBurnRate && (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.8125rem' }}>
              <span className="fw-bold">
                <FaTerminal className="me-1" style={{ fontSize: '0.75rem' }} />
                Actions Projected EOM
              </span>
            </div>
            <div className="projection-progress">
              <ProgressBar
                now={Math.min(actionsProjection.percentageOfQuota, 100)}
                variant={actionsProjection.percentageOfQuota <= 75 ? 'success' : actionsProjection.percentageOfQuota <= 90 ? 'warning' : 'danger'}
                className="projection-progress-bar"
                label=""
                srOnly
                aria-valuetext={`${actionsProjection.projectedTotal.toFixed(0)} of ${actionsQuota}`}
              />
              <div className="projection-progress-overlay">
                <span className="projection-progress-usage">
                  {actionsProjection.projectedTotal.toFixed(0)} / {actionsQuota}
                </span>
                <span className="projection-progress-percent">
                  {actionsProjection.percentageOfQuota.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Compact Inline Stats - 3 columns x 2 rows grid */}
        <div className="compact-stats-grid-combined projection-stats-grid">
          {/* Row 1: Copilot Stats */}
          <div className="compact-stat-item">
            <span className="compact-stat-label">
              <FaRobot className="me-1" style={{ fontSize: '0.65rem' }} />
              Current Usage
            </span>
            <span className="compact-stat-value" style={{ color: 'var(--accent-primary)' }}>
              {copilotUsage.toFixed(0)}
            </span>
          </div>
          <div className="compact-stat-item">
            <span className="compact-stat-label">
              <FaRobot className="me-1" style={{ fontSize: '0.65rem' }} />
              Burn Rate
            </span>
            <span className="compact-stat-value" style={{ color: copilotBurnRate ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
              {copilotBurnRate ? `${copilotBurnRate.dailyRate.toFixed(1)}/d` : '...'}
            </span>
          </div>
          <div className="compact-stat-item">
            <span className="compact-stat-label">
              <FaRobot className="me-1" style={{ fontSize: '0.65rem' }} />
              Proj. EOM
            </span>
            <span className="compact-stat-value" style={{ color: copilotProjection ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {copilotProjection ? copilotProjectedTotal.toFixed(0) : '...'}
            </span>
          </div>
          
          {/* Row 2: Actions Stats */}
          <div className="compact-stat-item">
            <span className="compact-stat-label">
              <FaTerminal className="me-1" style={{ fontSize: '0.65rem' }} />
              Actions Current
            </span>
            <span className="compact-stat-value" style={{ color: 'var(--accent-info)' }}>
              {actionsUsage ? actionsUsage.toFixed(0) : '0'}
            </span>
          </div>
          <div className="compact-stat-item">
            <span className="compact-stat-label">
              <FaTerminal className="me-1" style={{ fontSize: '0.65rem' }} />
              Projected +
            </span>
            <span className="compact-stat-value" style={{ color: actionsProjection ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {actionsProjection ? actionsProjection.projectedAdditionalUsage.toFixed(0) : '...'}
            </span>
          </div>
          <div className="compact-stat-item">
            <span className="compact-stat-label">
              <FaTerminal className="me-1" style={{ fontSize: '0.65rem' }} />
              Burn Rate
            </span>
            <span className="compact-stat-value" style={{ color: actionsBurnRate ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
              {actionsBurnRate ? `${actionsBurnRate.dailyRate.toFixed(1)}/d` : '...'}
            </span>
          </div>
          
          {/* Days Remaining - Spans full width */}
          <div className="compact-stat-item" style={{ gridColumn: 'span 3' }}>
            <span className="compact-stat-label">Days Left in Month</span>
            <span className="compact-stat-value" style={{ color: 'var(--text-secondary)' }}>
              {daysRemaining}
            </span>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ProjectionCard;
