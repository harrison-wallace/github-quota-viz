import React, { useMemo } from 'react';
import { Card, Row, Col, ProgressBar, Alert } from 'react-bootstrap';
import { FaChartLine, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { calculateBurnRate, projectEndOfMonthUsage, getDaysRemainingInMonth } from '../services/historicalDataService';

const ProjectionCard = ({ profileId, metric = 'copilot', currentUsage, quota = 1500, title = 'Projection' }) => {
  const burnRateData = useMemo(() => {
    return calculateBurnRate(profileId, metric, 7);
  }, [profileId, metric]);

  const projection = useMemo(() => {
    if (!burnRateData) return null;
    return projectEndOfMonthUsage(currentUsage, burnRateData.dailyRate, quota);
  }, [burnRateData, currentUsage, quota]);

  const daysRemaining = getDaysRemainingInMonth();

  if (!projection || !burnRateData) {
    return null;
  }

  const {
    projectedAdditionalUsage,
    projectedTotal,
    percentageOfQuota,
    willExceedQuota,
    usageHeadroom
  } = projection;

  const burnRatePercentPerDay = (burnRateData.dailyRate / quota) * 100;

  return (
    <Card className="usage-card projection-card">
      <Card.Header as="h5">
        <FaChartLine className="me-2" />
        {title}
      </Card.Header>
      <Card.Body>
        {/* Alert if exceeding quota */}
        {willExceedQuota && (
          <Alert variant="danger" className="mb-3">
            <Alert.Heading as="h6">
              <FaExclamationTriangle className="me-2" />
              Projected Overage
            </Alert.Heading>
            <small>
              Based on current usage patterns, you will exceed your quota by{' '}
              <strong>{(projectedTotal - quota).toFixed(0)}</strong> requests.
            </small>
          </Alert>
        )}

        {!willExceedQuota && (
          <Alert variant="success" className="mb-3">
            <Alert.Heading as="h6">
              <FaCheckCircle className="me-2" />
              On Track
            </Alert.Heading>
            <small>
              Based on current usage patterns, you will finish the month with{' '}
              <strong>{usageHeadroom.toFixed(0)}</strong> requests remaining.
            </small>
          </Alert>
        )}

        {/* Projection Stats */}
        <Row className="g-3 mb-4">
          <Col md={6}>
            <div className="stat-box">
              <div className="stat-label">Current Usage</div>
              <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
                {currentUsage.toFixed(0)}
              </div>
              <div className="stat-meta">
                {((currentUsage / quota) * 100).toFixed(1)}% of quota
              </div>
            </div>
          </Col>
          <Col md={6}>
            <div className="stat-box">
              <div className="stat-label">Burn Rate (7-day avg)</div>
              <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>
                {burnRateData.dailyRate.toFixed(1)}/day
              </div>
              <div className="stat-meta">
                {burnRatePercentPerDay.toFixed(2)}% of quota per day
              </div>
            </div>
          </Col>
        </Row>

        {/* Projected Usage */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-bold">Projected End-of-Month Usage</span>
            <span className="badge bg-secondary">{percentageOfQuota.toFixed(1)}%</span>
          </div>
          <ProgressBar
            now={Math.min(percentageOfQuota, 100)}
            variant={percentageOfQuota <= 75 ? 'success' : percentageOfQuota <= 90 ? 'warning' : 'danger'}
            style={{ height: '28px' }}
            label={`${projectedTotal.toFixed(0)} / ${quota}`}
          />
        </div>

        {/* Breakdown */}
        <Row className="g-3">
          <Col xs={6}>
            <div className="projection-stat">
              <div className="projection-label">Additional Usage</div>
              <div className="projection-value">
                {projectedAdditionalUsage.toFixed(0)}
              </div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="projection-stat">
              <div className="projection-label">Days Remaining</div>
              <div className="projection-value">
                {daysRemaining}
              </div>
            </div>
          </Col>
        </Row>

        {/* Details Table */}
        <div className="mt-4 pt-3 border-top">
          <table className="w-100" style={{ fontSize: '0.875rem' }}>
            <tbody>
              <tr>
                <td className="text-muted">Current</td>
                <td className="text-end fw-bold">{currentUsage.toFixed(0)}</td>
              </tr>
              <tr>
                <td className="text-muted">Projected to add</td>
                <td className="text-end fw-bold">{projectedAdditionalUsage.toFixed(0)}</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border-color)' }} className="fw-bold">
                <td>Projected Total</td>
                <td className="text-end">{projectedTotal.toFixed(0)}</td>
              </tr>
              <tr className="text-muted">
                <td>Quota</td>
                <td className="text-end">{quota}</td>
              </tr>
              <tr 
                style={{ 
                  borderTop: '1px solid var(--border-color)',
                  color: usageHeadroom > 0 ? 'var(--accent-success)' : 'var(--accent-danger)'
                }}
                className="fw-bold"
              >
                <td>{usageHeadroom > 0 ? 'Headroom' : 'Overage'}</td>
                <td className="text-end">{Math.abs(usageHeadroom).toFixed(0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ProjectionCard;
