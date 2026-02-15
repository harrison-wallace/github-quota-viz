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
  title = 'Usage Projection' 
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

  if (!copilotProjection || !copilotBurnRate) {
    return null;
  }

  const {
    projectedAdditionalUsage: copilotProjectedAdd,
    projectedTotal: copilotProjectedTotal,
    percentageOfQuota: copilotPercentage,
    willExceedQuota: copilotWillExceed,
    usageHeadroom: copilotHeadroom
  } = copilotProjection;

  return (
    <Card className="usage-card projection-card compact-projection-card h-100">
      <Card.Header as="h6" className="compact-header">
        <FaChartLine className="me-2" />
        {title}
      </Card.Header>
      <Card.Body className="compact-body">
        {/* Copilot Alert */}
        {copilotWillExceed && (
          <Alert variant="danger" className="mb-2 py-2 px-2 compact-alert">
            <div className="d-flex align-items-center">
              <FaExclamationTriangle className="me-2" style={{ fontSize: '0.875rem' }} />
              <div>
                <strong style={{ fontSize: '0.8125rem' }}>Copilot Projected Overage</strong>
                <div style={{ fontSize: '0.75rem' }}>
                  Will exceed quota by <strong>{(copilotProjectedTotal - copilotQuota).toFixed(0)}</strong> requests
                </div>
              </div>
            </div>
          </Alert>
        )}

        {!copilotWillExceed && (
          <Alert variant="success" className="mb-2 py-2 px-2 compact-alert">
            <div className="d-flex align-items-center">
              <FaCheckCircle className="me-2" style={{ fontSize: '0.875rem' }} />
              <div>
                <strong style={{ fontSize: '0.8125rem' }}>Copilot On Track</strong>
                <div style={{ fontSize: '0.75rem' }}>
                  <strong>{copilotHeadroom.toFixed(0)}</strong> requests remaining
                </div>
              </div>
            </div>
          </Alert>
        )}

        {/* Copilot Projected Usage Progress Bar */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.8125rem' }}>
            <span className="fw-bold">
              <FaRobot className="me-1" style={{ fontSize: '0.75rem' }} />
              Copilot Projected EOM
            </span>
            <span className="badge bg-secondary" style={{ fontSize: '0.75rem' }}>{copilotPercentage.toFixed(1)}%</span>
          </div>
          <ProgressBar
            now={Math.min(copilotPercentage, 100)}
            variant={copilotPercentage <= 75 ? 'success' : copilotPercentage <= 90 ? 'warning' : 'danger'}
            style={{ height: '24px', fontSize: '0.8125rem' }}
            label={`${copilotProjectedTotal.toFixed(0)} / ${copilotQuota}`}
          />
        </div>

        {/* Actions Projected Usage Progress Bar */}
        {actionsProjection && actionsBurnRate && (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.8125rem' }}>
              <span className="fw-bold">
                <FaTerminal className="me-1" style={{ fontSize: '0.75rem' }} />
                Actions Projected EOM
              </span>
              <span className="badge bg-secondary" style={{ fontSize: '0.75rem' }}>{actionsProjection.percentageOfQuota.toFixed(1)}%</span>
            </div>
            <ProgressBar
              now={Math.min(actionsProjection.percentageOfQuota, 100)}
              variant={actionsProjection.percentageOfQuota <= 75 ? 'success' : actionsProjection.percentageOfQuota <= 90 ? 'warning' : 'danger'}
              style={{ height: '24px', fontSize: '0.8125rem' }}
              label={`${actionsProjection.projectedTotal.toFixed(0)} / ${actionsQuota}`}
            />
          </div>
        )}

        {/* Compact Inline Stats - 3 columns for Copilot, 3 for Actions */}
        <div className="compact-stats-grid-combined">
          {/* Copilot Stats */}
          <div className="compact-stat-item">
            <span className="compact-stat-label">
              <FaRobot className="me-1" style={{ fontSize: '0.65rem' }} />
              Copilot Current
            </span>
            <span className="compact-stat-value" style={{ color: 'var(--accent-primary)' }}>
              {copilotUsage.toFixed(0)}
            </span>
          </div>
          <div className="compact-stat-item">
            <span className="compact-stat-label">
              <FaRobot className="me-1" style={{ fontSize: '0.65rem' }} />
              Projected +
            </span>
            <span className="compact-stat-value" style={{ color: 'var(--text-primary)' }}>
              {copilotProjectedAdd.toFixed(0)}
            </span>
          </div>
          <div className="compact-stat-item">
            <span className="compact-stat-label">
              <FaRobot className="me-1" style={{ fontSize: '0.65rem' }} />
              Burn Rate
            </span>
            <span className="compact-stat-value" style={{ color: 'var(--accent-warning)' }}>
              {copilotBurnRate.dailyRate.toFixed(1)}/d
            </span>
          </div>
          
          {/* Actions Stats */}
          {actionsProjection && actionsBurnRate && (
            <>
              <div className="compact-stat-item">
                <span className="compact-stat-label">
                  <FaTerminal className="me-1" style={{ fontSize: '0.65rem' }} />
                  Actions Current
                </span>
                <span className="compact-stat-value" style={{ color: 'var(--accent-info)' }}>
                  {actionsUsage.toFixed(0)}
                </span>
              </div>
              <div className="compact-stat-item">
                <span className="compact-stat-label">
                  <FaTerminal className="me-1" style={{ fontSize: '0.65rem' }} />
                  Projected +
                </span>
                <span className="compact-stat-value" style={{ color: 'var(--text-primary)' }}>
                  {actionsProjection.projectedAdditionalUsage.toFixed(0)}
                </span>
              </div>
              <div className="compact-stat-item">
                <span className="compact-stat-label">
                  <FaTerminal className="me-1" style={{ fontSize: '0.65rem' }} />
                  Burn Rate
                </span>
                <span className="compact-stat-value" style={{ color: 'var(--accent-warning)' }}>
                  {actionsBurnRate.dailyRate.toFixed(1)}/d
                </span>
              </div>
            </>
          )}
          
          {/* Days Remaining - Spans full width */}
          <div className="compact-stat-item" style={{ gridColumn: actionsProjection ? 'span 3' : 'span 2' }}>
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
