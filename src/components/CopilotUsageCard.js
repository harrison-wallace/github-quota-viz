import React, { useState, useEffect } from 'react';
import { Card, Row, Col, ListGroup } from 'react-bootstrap';
import { FaRobot } from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Chart colors that work in both light and dark modes
const CHART_COLORS = [
  'var(--chart-blue)',
  'var(--chart-green)',
  'var(--chart-orange)',
  'var(--chart-purple)',
  'var(--chart-cyan)'
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '0.75rem',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {data.name}
        </p>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Requests: {data.value.toFixed(1)}
        </p>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Cost: ${data.cost.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

const CopilotUsageCard = ({ copilotData, premiumData, quota, chartType = 'pie' }) => {
  const [chartDims, setChartDims] = useState({ outerRadius: 100, innerRadius: 60, height: 280 });
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive chart sizing
  useEffect(() => {
    const updateChartDimensions = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setChartDims({ outerRadius: 50, innerRadius: 30, height: 220 });
        setIsMobile(true);
      } else if (width < 576) {
        setChartDims({ outerRadius: 65, innerRadius: 40, height: 240 });
        setIsMobile(false);
      } else if (width < 768) {
        setChartDims({ outerRadius: 80, innerRadius: 50, height: 260 });
        setIsMobile(false);
      } else {
        setChartDims({ outerRadius: 100, innerRadius: 60, height: 280 });
        setIsMobile(false);
      }
    };

    // Set initial dimensions
    updateChartDimensions();

    // Update on window resize
    window.addEventListener('resize', updateChartDimensions);
    return () => window.removeEventListener('resize', updateChartDimensions);
  }, []);

  if (!copilotData && !premiumData) {
    return (
      <Card className="usage-card h-100">
        <Card.Header as="h5">
          <FaRobot className="me-2" />
          GitHub Copilot Usage
        </Card.Header>
        <Card.Body>
          <div className="text-center text-muted py-4">
            <FaRobot size={48} className="mb-3" style={{ opacity: 0.3 }} />
            <p>No Copilot usage data available</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // Use premiumData if available, otherwise use copilotData from summary
  const data = premiumData || copilotData;
  const totalRequests = data.totalRequests || 0;
  const grossCost = data.totalGrossCost || 0;
  const netCost = data.totalNetCost || 0;
  const percentage = quota > 0 ? (totalRequests / quota) * 100 : 0;

  // Calculate month progress (days elapsed / total days in month)
  const getMonthProgress = () => {
    const now = new Date();
    const day = now.getDate();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return (day / totalDays) * 100;
  };

  const monthProgress = getMonthProgress();
  const usageAhead = percentage > monthProgress + 10; // 10% buffer

  // Prepare pie chart data (sorted by usage descending)
  const pieData = premiumData?.models?.slice().sort((a, b) => b.requests - a.requests).map(model => ({
    name: model.name,
    value: model.requests,
    cost: model.grossCost,
  })) || copilotData?.breakdown?.slice().sort((a, b) => b.requests - a.requests).map(item => ({
    name: item.sku.replace('_', ' '),
    value: item.requests,
    cost: item.grossCost,
  })) || [];

  return (
    <Card className="usage-card h-100">
      <Card.Header as="h5">
        <FaRobot className="me-2" />
        Copilot Premium Requests
      </Card.Header>
      <Card.Body>
        {/* Chart - Model Distribution */}
        {pieData.length > 0 && (
          <div className="mb-4">
            <ResponsiveContainer width="100%" height={chartDims.height}>
              {chartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={chartDims.outerRadius}
                    innerRadius={chartDims.innerRadius}
                    paddingAngle={2}
                    label={({ value }) => `${value.toFixed(0)}`}
                    labelLine={false}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        stroke="var(--bg-card)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  {!isMobile && (
                    <Legend 
                      verticalAlign="bottom"
                      height={chartDims.height < 250 ? 50 : 36}
                      iconType="circle"
                      wrapperStyle={{
                        paddingTop: '1rem',
                        fontSize: chartDims.height < 250 ? '0.75rem' : '0.875rem',
                        maxWidth: '100%'
                      }}
                    />
                  )}
                </PieChart>
              ) : (
                <BarChart 
                  data={pieData} 
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: 'var(--text-secondary)' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Requests">
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Progress Bar with Month Marker */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-bold" style={{ fontSize: '0.9375rem' }}>Requests Used</span>
            <div className="d-flex align-items-center gap-2">
              {/* Subtle pace indicator */}
              <span style={{
                fontSize: '0.75rem',
                color: usageAhead ? 'var(--accent-danger)' : 'var(--accent-success)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: usageAhead ? 'var(--accent-danger)' : 'var(--accent-success)',
                  display: 'inline-block'
                }} />
                {usageAhead ? 'Ahead' : 'On pace'}
              </span>
              <span className="badge bg-secondary">{percentage.toFixed(1)}%</span>
            </div>
          </div>
          <div style={{ position: 'relative', marginTop: '20px' }}>
            {/* Today label above the arrow */}
            <div style={{
              position: 'absolute',
              top: -20,
              left: `${monthProgress}%`,
              transform: 'translateX(-50%)',
              fontSize: '0.625rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              fontWeight: 500
            }}>
              Today
            </div>
            {/* Month progress marker (arrow pointing down) */}
            <div style={{
              position: 'absolute',
              top: -6,
              left: `${monthProgress}%`,
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `10px solid var(--text-primary)`,
              zIndex: 2
            }} title={`Month progress: ${monthProgress.toFixed(1)}% (Day ${Math.ceil(monthProgress * 30 / 100)})`} />
            {/* Progress bar container */}
            <div style={{ position: 'relative', height: '32px' }}>
              {/* Progress bar background with gradient */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '32px',
                background: `linear-gradient(90deg, var(--accent-success) 0%, var(--accent-warning) 50%, var(--accent-danger) 100%)`,
                borderRadius: '0.375rem',
                opacity: 0.2
              }} />
              {/* Actual progress fill */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${Math.min(percentage, 100)}%`,
                height: '32px',
                background: `linear-gradient(90deg, var(--accent-success) 0%, var(--accent-warning) ${monthProgress}%, var(--accent-danger) 100%)`,
                borderRadius: '0.375rem',
                transition: 'width 0.5s ease'
              }}>
                {/* Label inside progress bar */}
                <span style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap'
                }}>
                  {totalRequests.toFixed(0)} / {quota}
                </span>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="d-flex justify-content-between mt-1" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Stats */}
        <Row className="g-2 mb-3">
          <Col xs={4}>
            <div className="stat-box">
              <div className="stat-label">Total Requests</div>
              <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
                {totalRequests.toFixed(0)}
              </div>
            </div>
          </Col>
          <Col xs={4}>
            <div className="stat-box">
              <div className="stat-label">Would-be Cost</div>
              <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>
                ${grossCost.toFixed(2)}
              </div>
            </div>
          </Col>
          <Col xs={4}>
            <div className="stat-box" style={{ backgroundColor: 'var(--accent-success)', filter: 'brightness(0.85)', color: 'white' }}>
              <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Saved</div>
              <div className="stat-value" style={{ color: 'white' }}>
                ${(grossCost - netCost).toFixed(2)}
              </div>
            </div>
          </Col>
        </Row>

        {/* Model List */}
        {premiumData?.models && premiumData.models.length > 0 && (
          <ListGroup variant="flush" className="mt-3">
            {[...premiumData.models].sort((a, b) => b.requests - a.requests).map((model, idx) => (
              <ListGroup.Item 
                key={idx} 
                className="d-flex justify-content-between align-items-center px-2 py-2"
              >
                <div>
                  <div style={{ 
                    display: 'inline-block', 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%',
                    backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                    marginRight: '0.5rem'
                  }} />
                  <strong style={{ color: 'var(--text-primary)' }}>{model.name}</strong>
                  <br />
                  <small className="text-muted">{model.sku}</small>
                </div>
                <div className="text-end">
                  <div className="fw-bold" style={{ color: 'var(--text-primary)' }}>
                    {model.requests.toFixed(1)}
                  </div>
                  <small className="text-muted">${model.grossCost.toFixed(2)}</small>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}


      </Card.Body>
    </Card>
  );
};

export default CopilotUsageCard;
