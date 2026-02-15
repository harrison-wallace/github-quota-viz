import React, { useState, useEffect } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { FaRobot } from 'react-icons/fa';


const CopilotUsageCard = ({ copilotData, premiumData, quota }) => {
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive sizing
  useEffect(() => {
    const updateMobileStatus = () => {
      setIsMobile(window.innerWidth < 576);
    };
    updateMobileStatus();
    window.addEventListener('resize', updateMobileStatus);
    return () => window.removeEventListener('resize', updateMobileStatus);
  }, []);

  if (!copilotData && !premiumData) {
    return null;
  }

  // Use premiumData if available, otherwise use copilotData from summary
  const data = premiumData || copilotData;
  const totalRequests = data.totalRequests || 0;
  const grossCost = data.totalGrossCost || 0;

  const requestsLeft = quota - totalRequests;
  const isOverQuota = requestsLeft < 0;

  return (
    <Card className="usage-card copilot-stats-card">
      <Card.Header as="h6" className="compact-header">
        <FaRobot className="me-2" />
        Copilot Usage Stats
      </Card.Header>
      <Card.Body className="compact-body">
        {/* Stats Grid */}
        <Row className="g-2">
          <Col xs={6} md={3}>
            <div className="stat-box compact-stat-box">
              <div className="stat-label" style={{ fontSize: isMobile ? '0.65rem' : '0.75rem', marginBottom: isMobile ? '0.25rem' : '0.5rem' }}>
                Total Requests
              </div>
              <div className="stat-value" style={{ color: 'var(--accent-primary)', fontSize: isMobile ? '1.25rem' : '1.5rem' }}>
                {totalRequests.toFixed(0)}
              </div>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-box compact-stat-box">
              <div className="stat-label" style={{ fontSize: isMobile ? '0.65rem' : '0.75rem', marginBottom: isMobile ? '0.25rem' : '0.5rem' }}>
                Would-be Cost
              </div>
              <div className="stat-value" style={{ color: 'var(--accent-warning)', fontSize: isMobile ? '1.25rem' : '1.5rem' }}>
                ${grossCost.toFixed(2)}
              </div>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div 
              className="stat-box compact-stat-box" 
              style={{ 
                backgroundColor: isOverQuota ? 'var(--accent-danger)' : 'var(--accent-success)', 
                filter: 'brightness(0.85)', 
                color: 'white'
              }}
            >
              <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)', fontSize: isMobile ? '0.65rem' : '0.75rem', marginBottom: isMobile ? '0.25rem' : '0.5rem' }}>
                Requests Left
              </div>
              <div className="stat-value" style={{ color: 'white', fontSize: isMobile ? '1.25rem' : '1.5rem' }}>
                {isOverQuota ? `+${Math.abs(requestsLeft).toFixed(0)}` : requestsLeft.toFixed(0)}
              </div>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-box compact-stat-box">
              <div className="stat-label" style={{ fontSize: isMobile ? '0.65rem' : '0.75rem', marginBottom: isMobile ? '0.25rem' : '0.5rem' }}>
                Quota
              </div>
              <div className="stat-value" style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '1.25rem' : '1.5rem' }}>
                {quota}
              </div>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default CopilotUsageCard;
