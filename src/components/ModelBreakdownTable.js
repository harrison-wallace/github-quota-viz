import React from 'react';
import { Card, Table } from 'react-bootstrap';
import { FaRobot } from 'react-icons/fa';

const CHART_COLORS = [
  'var(--chart-blue)',
  'var(--chart-green)',
  'var(--chart-orange)',
  'var(--chart-purple)',
  'var(--chart-cyan)'
];

const ModelBreakdownTable = ({ premiumData, copilotData, className = '' }) => {
  if (!premiumData && !copilotData) {
    return null;
  }

  const data = premiumData || copilotData;
  const models = premiumData?.models?.slice().sort((a, b) => b.requests - a.requests) || 
                 copilotData?.breakdown?.slice().sort((a, b) => b.requests - a.requests).map(item => ({
                   name: item.sku.replace('_', ' '),
                   requests: item.requests,
                   grossCost: item.grossCost,
                 })) || [];

  if (models.length === 0) {
    return null;
  }

  const totalRequests = data.totalRequests || 0;

  return (
    <Card className={`usage-card model-breakdown-card h-100 ${className}`}>
      <Card.Header as="h6" className="compact-header">
        <FaRobot className="me-2" />
        Models Used
      </Card.Header>
      <Card.Body className="p-0">
        <Table striped bordered hover size="sm" className="mb-0 compact-model-table">
          <thead>
            <tr>
              <th>Model</th>
              <th className="text-end">Requests</th>
              <th className="text-end">Cost</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model, idx) => {
              const percentage = totalRequests > 0 ? (model.requests / totalRequests) * 100 : 0;
              const color = CHART_COLORS[idx % CHART_COLORS.length];
              
              return (
                <tr key={idx}>
                  <td>
                    <div className="model-name-cell">
                      <div 
                        className="model-color-bar" 
                        style={{ 
                          width: `${Math.max(percentage, 3)}%`,
                          backgroundColor: color,
                          opacity: 0.7
                        }}
                      />
                      <span className="model-name">{model.name}</span>
                    </div>
                  </td>
                  <td className="text-end fw-bold">{model.requests.toFixed(0)}</td>
                  <td className="text-end text-muted">${model.grossCost.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-active">
              <td><strong>Total</strong></td>
              <td className="text-end"><strong>{totalRequests.toFixed(0)}</strong></td>
              <td className="text-end"><strong>${data.totalGrossCost?.toFixed(2) || '0.00'}</strong></td>
            </tr>
          </tfoot>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default ModelBreakdownTable;
