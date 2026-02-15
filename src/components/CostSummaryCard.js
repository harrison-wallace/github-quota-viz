import React, { useState } from 'react';
import { Card, Row, Col, Table, Alert, Collapse } from 'react-bootstrap';
import { FaDollarSign, FaTerminal, FaRobot, FaDatabase, FaChevronDown } from 'react-icons/fa';

const CostSummaryCard = ({ summaryData }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!summaryData) {
    return null;
  }

  const totalGross = summaryData.totalGrossCost || 0;
  const totalNet = summaryData.totalNetCost || 0;
  const savings = totalGross - totalNet;
  
  const { timePeriod, actions, copilot, gitLfs } = summaryData;

  return (
    <Card className="usage-card">
      <Card.Header 
        as="div"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        className="d-flex justify-content-between align-items-center"
      >
        <div className="d-flex align-items-center gap-2">
          <FaDollarSign />
          <span>Cost Summary - {timePeriod?.month ? `${timePeriod.year}/${timePeriod.month}` : timePeriod?.year}</span>
        </div>
        <FaChevronDown 
          className={`collapse-icon ${isExpanded ? '' : 'collapsed'}`}
          style={{ fontSize: '0.875rem', transition: 'transform 0.3s ease' }}
        />
      </Card.Header>
      
      <Collapse in={isExpanded}>
        <Card.Body>
          {/* Summary Metrics */}
          <Row className="mb-4 cost-summary-row">
            <Col xs="auto" md={4} className="text-center mb-3 mb-md-0 cost-summary-metric">
              <div className="display-6 text-muted">${totalGross.toFixed(2)}</div>
              <div className="text-muted small">Gross Cost</div>
            </Col>
            <Col xs="auto" md={4} className="text-center mb-3 mb-md-0 cost-summary-metric">
              <div className="display-6 text-success">${totalNet.toFixed(2)}</div>
              <div className="text-muted small">Net Cost</div>
            </Col>
            <Col xs="auto" md={4} className="text-center cost-summary-metric">
              <div className="display-6" style={{ color: 'var(--accent-primary)' }}>
                ${savings.toFixed(2)}
              </div>
              <div className="text-muted small">Savings</div>
            </Col>
          </Row>

          {/* Detailed Breakdown Table */}
          <Table striped bordered hover size="sm" className="mb-3">
            <thead>
              <tr>
                <th>Product</th>
                <th>Usage</th>
                <th>Gross</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {actions && actions.minutes > 0 && (
                <tr>
                  <td>
                    <FaTerminal className="me-2" />
                    Actions
                  </td>
                  <td>{actions.minutes.toFixed(1)} min</td>
                  <td>${actions.grossCost.toFixed(2)}</td>
                  <td className="text-success fw-bold">${actions.netCost.toFixed(2)}</td>
                </tr>
              )}
              {copilot && copilot.totalRequests > 0 && (
                <tr>
                  <td>
                    <FaRobot className="me-2" />
                    Copilot
                  </td>
                  <td>{copilot.totalRequests.toFixed(0)} req</td>
                  <td>${copilot.totalGrossCost.toFixed(2)}</td>
                  <td className="text-success fw-bold">${copilot.totalNetCost.toFixed(2)}</td>
                </tr>
              )}
              {gitLfs && gitLfs.storage > 0 && (
                <tr>
                  <td>
                    <FaDatabase className="me-2" />
                    Git LFS
                  </td>
                  <td>{gitLfs.storage.toFixed(1)} GB-hrs</td>
                  <td>${gitLfs.grossCost.toFixed(2)}</td>
                  <td className="text-success fw-bold">${gitLfs.netCost.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="table-active">
                <td><strong>Total</strong></td>
                <td>-</td>
                <td><strong>${totalGross.toFixed(2)}</strong></td>
                <td className="text-success"><strong>${totalNet.toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </Table>

          {/* Info Alert */}
          {totalNet === 0 && totalGross > 0 && (
            <Alert variant="info" className="mb-0">
              <Alert.Heading as="h6">
                <FaDollarSign className="me-2" />
                100% Cost Coverage
              </Alert.Heading>
              <small>
                All costs shown are $0 (net) because they're covered by your GitHub subscription plan.
                Your subscription is saving you <strong>${savings.toFixed(2)}</strong> this billing period!
              </small>
            </Alert>
          )}

          {totalNet > 0 && (
            <Alert variant="warning" className="mb-0">
              <Alert.Heading as="h6">
                ⚠️ Overage Charges
              </Alert.Heading>
              <small>
                You have <strong>${totalNet.toFixed(2)}</strong> in charges beyond your included quota.
                Your subscription covered <strong>${savings.toFixed(2)}</strong> of your total usage.
              </small>
            </Alert>
          )}
        </Card.Body>
      </Collapse>
    </Card>
  );
};

export default CostSummaryCard;
