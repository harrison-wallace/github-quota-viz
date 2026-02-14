import React from 'react';
import { Card, ProgressBar, Row, Col } from 'react-bootstrap';
import { FaTerminal, FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';

const ActionsUsageCard = ({ actionsData, quota }) => {
  if (!actionsData) {
    return null;
  }

  const minutesUsed = actionsData.minutes || 0;
  const grossCost = actionsData.grossCost || 0;
  const netCost = actionsData.netCost || 0;
  const percentage = quota > 0 ? (minutesUsed / quota) * 100 : 0;

  const getVariant = (pct) => {
    if (pct < 70) return 'success';
    if (pct < 90) return 'warning';
    return 'danger';
  };

  const getStatusIcon = (pct) => {
    if (pct < 70) return <FaCheckCircle style={{ color: 'var(--accent-success)' }} />;
    if (pct < 90) return <FaExclamationTriangle style={{ color: 'var(--accent-warning)' }} />;
    return <FaTimesCircle style={{ color: 'var(--accent-danger)' }} />;
  };

  const getStatusMessage = (pct) => {
    if (pct < 70) return 'Healthy usage';
    if (pct < 90) return 'Approaching quota limit';
    return 'Quota exceeded - additional charges may apply';
  };

  return (
    <Card className="usage-card h-100">
      <Card.Header as="h5">
        <FaTerminal className="me-2" />
        GitHub Actions Usage
      </Card.Header>
      <Card.Body>
        {/* Large Progress Visualization (Main Focus) */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="mb-1" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Minutes Used
              </h6>
              <small className="text-muted d-flex align-items-center gap-2">
                {getStatusIcon(percentage)}
                {getStatusMessage(percentage)}
              </small>
            </div>
            <div className="text-end">
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {percentage.toFixed(1)}%
              </div>
              <small className="text-muted">{minutesUsed.toFixed(1)} / {quota}</small>
            </div>
          </div>
          
          <ProgressBar 
            now={percentage > 100 ? 100 : percentage} 
            variant={getVariant(percentage)}
            style={{ height: '48px', fontSize: '1rem', fontWeight: 600 }}
            animated={percentage > 90}
            striped={percentage > 90}
          >
            <ProgressBar 
              variant={getVariant(percentage)}
              now={percentage > 100 ? 100 : percentage}
              label={percentage > 5 ? `${minutesUsed.toFixed(0)} min` : ''}
            />
          </ProgressBar>

          {percentage > 100 && (
            <div className="mt-2">
              <small style={{ color: 'var(--accent-danger)', fontWeight: 500 }}>
                ⚠️ Exceeded quota by {(minutesUsed - quota).toFixed(1)} minutes
              </small>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <Row className="g-2 mt-3">
          <Col xs={6}>
            <div className="stat-box">
              <div className="stat-label">Minutes Used</div>
              <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
                {minutesUsed.toFixed(1)}
              </div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="stat-box">
              <div className="stat-label">Quota</div>
              <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>
                {quota}
              </div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="stat-box">
              <div className="stat-label">Gross Cost</div>
              <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>
                ${grossCost.toFixed(2)}
              </div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="stat-box">
              <div className="stat-label">Net Cost</div>
              <div className="stat-value text-success">
                ${netCost.toFixed(2)}
              </div>
            </div>
          </Col>
        </Row>

        {/* SKU Info */}
        {actionsData.sku && (
          <div className="mt-3 p-2 rounded" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-light)' }}>
            <small style={{ color: 'var(--text-secondary)' }}>
              <strong>SKU:</strong> {actionsData.sku.replace('_', ' ').toUpperCase()}
            </small>
          </div>
        )}

        {/* Savings Badge */}
        {grossCost > 0 && netCost === 0 && (
          <div className="mt-3 text-center">
            <span className="badge" style={{
              backgroundColor: 'var(--accent-success)',
              color: 'white',
              fontSize: '0.9375rem',
              padding: '0.625rem 1.25rem'
            }}>
              💰 Saved ${grossCost.toFixed(2)} with subscription
            </span>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ActionsUsageCard;
