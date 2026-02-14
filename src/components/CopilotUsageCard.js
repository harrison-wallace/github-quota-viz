import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Button } from 'react-bootstrap';
import { FaRobot, FaEye, FaEyeSlash } from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { getSavedGlowEnabled, getSavedPulseEnabled } from '../services/themeService';

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

const CopilotUsageCard = ({ copilotData, premiumData, quota, chartType = 'bar', onToggleVisibility }) => {
  const [chartDims, setChartDims] = useState({ outerRadius: 100, innerRadius: 60, height: 280 });
  const [isMobile, setIsMobile] = useState(false);
  const [effectsEnabled, setEffectsEnabled] = useState(false);
  const [showActionsUsage, setShowActionsUsage] = useState(true);

  // Handle responsive chart sizing
  useEffect(() => {
    const updateChartDimensions = () => {
      const width = window.innerWidth;
      if (width < 380) {
        setChartDims({ outerRadius: 45, innerRadius: 27, height: 200 });
        setIsMobile(true);
      } else if (width < 480) {
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

  // Listen for effects changes
  useEffect(() => {
    // Check if either glow or pulse is enabled
    const glowEnabled = getSavedGlowEnabled();
    const pulseEnabled = getSavedPulseEnabled();
    setEffectsEnabled(glowEnabled || pulseEnabled);

    const handleGlowEnabledChange = (e) => {
      const pulseEnabled = getSavedPulseEnabled();
      setEffectsEnabled(e.detail.enabled || pulseEnabled);
    };

    const handlePulseEnabledChange = (e) => {
      const glowEnabled = getSavedGlowEnabled();
      setEffectsEnabled(glowEnabled || e.detail.enabled);
    };

    window.addEventListener('glowEnabledChange', handleGlowEnabledChange);
    window.addEventListener('pulseEnabledChange', handlePulseEnabledChange);
    return () => {
      window.removeEventListener('glowEnabledChange', handleGlowEnabledChange);
      window.removeEventListener('pulseEnabledChange', handlePulseEnabledChange);
    };
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
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaRobot />
          GitHub Copilot Usage
        </h5>
        {onToggleVisibility && (
          <Button 
            variant="link" 
            size="sm" 
            onClick={() => {
              setShowActionsUsage(!showActionsUsage);
              onToggleVisibility(!showActionsUsage);
            }}
            title={showActionsUsage ? 'Hide Actions Usage' : 'Show Actions Usage'}
            style={{ padding: 0, color: 'var(--text-secondary)' }}
          >
            {showActionsUsage ? <FaEye /> : <FaEyeSlash />}
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {/* Chart - Model Distribution */}
        {pieData.length > 0 && (
          <div className="mb-4" style={{ marginBottom: isMobile ? '0.75rem' : '1rem', marginTop: isMobile ? '0.5rem' : '1rem' }}>
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
                       height={chartDims.height < 250 ? 40 : 36}
                       iconType="circle"
                       wrapperStyle={{
                         paddingTop: isMobile ? '0.5rem' : '1rem',
                         fontSize: chartDims.height < 250 ? '0.75rem' : '0.875rem',
                         maxWidth: '100%',
                         display: 'flex',
                         flexWrap: 'wrap',
                         justifyContent: 'center',
                         gap: '0.5rem'
                       }}
                     />
                   )}
                </PieChart>
                ) : (
                  <BarChart 
                    data={pieData} 
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis 
                      type="number" 
                      tick={{ fill: 'var(--text-secondary)', fontSize: isMobile ? 10 : 12 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name"
                      tick={false}
                      width={0}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Requests">
                      <LabelList 
                        dataKey="name"
                        position="insideLeft"
                        fill="white"
                        fontSize={16}
                        fontWeight={600}
                      />
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
         <div className="mb-3" style={{ marginTop: isMobile ? '0.5rem' : '1rem' }}>
          <div style={{ position: 'relative', marginTop: isMobile ? '16px' : '20px' }}>
            {/* Today label above the arrow */}
            <div style={{
              position: 'absolute',
              top: isMobile ? -18 : -20,
              left: `${monthProgress}%`,
              transform: 'translateX(-50%)',
              fontSize: isMobile ? '0.6rem' : '0.625rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              fontWeight: 500,
              pointerEvents: 'none'
            }}>
              Today
            </div>
            {/* Month progress marker (arrow pointing down) */}
            <div style={{
              position: 'absolute',
              top: isMobile ? -5 : -6,
              left: `${monthProgress}%`,
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: isMobile ? '5px solid transparent' : '6px solid transparent',
              borderRight: isMobile ? '5px solid transparent' : '6px solid transparent',
              borderTop: isMobile ? `8px solid var(--text-primary)` : `10px solid var(--text-primary)`,
              zIndex: 2,
              pointerEvents: 'none'
            }} title={`Month progress: ${monthProgress.toFixed(1)}% (Day ${Math.ceil(monthProgress * 30 / 100)})`} />
            {/* Progress bar container */}
            <div style={{ position: 'relative', height: isMobile ? '28px' : '32px' }}>
              {/* Progress bar background with gradient */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: isMobile ? '28px' : '32px',
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
                height: isMobile ? '28px' : '32px',
                background: `linear-gradient(90deg, var(--accent-success) 0%, var(--accent-warning) ${monthProgress}%, var(--accent-danger) 100%)`,
                borderRadius: '0.375rem',
                transition: 'width 0.5s ease',
                animation: effectsEnabled ? `glowPulse var(--animation-speed) ease-in-out infinite` : 'none',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: isMobile ? '0.5rem' : '0.75rem',
                paddingRight: isMobile ? '0.5rem' : '0.75rem',
                gap: isMobile ? '0.5rem' : '0.75rem'
              }}>
                 {/* Left side: Pace indicator and percentage */}
                 <div style={{
                   display: 'flex',
                   alignItems: 'center',
                   gap: isMobile ? '0.35rem' : '0.5rem',
                   whiteSpace: 'nowrap',
                   flexShrink: 0
                 }}>
                   <span style={{
                     fontSize: isMobile ? '0.65rem' : '0.7rem',
                     color: 'white',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '0.25rem',
                     fontWeight: 600
                   }}>
                     <span style={{
                       width: '5px',
                       height: '5px',
                       borderRadius: '50%',
                       backgroundColor: 'white',
                       display: 'inline-block',
                       flexShrink: 0
                     }} />
                     {usageAhead ? 'Ahead' : 'On pace'}
                   </span>
                   <span style={{
                     fontSize: isMobile ? '0.7rem' : '0.75rem',
                     color: 'white',
                     fontWeight: 600,
                     textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                   }}>
                     {percentage.toFixed(1)}%
                   </span>
                  </div>
                  
                  {/* Spacer to push count to the right */}
                  <div style={{ flex: 1 }} />
                 </div>
             </div>
           </div>
          {/* Legend */}
          <div className="d-flex justify-content-between mt-1" style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', color: 'var(--text-secondary)' }}>
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Stats */}
        <Row className="g-2 mb-3" style={{ margin: isMobile ? '-0.25rem' : '0' }}>
          <Col xs={4} style={{ padding: isMobile ? '0.25rem' : '0.5rem' }}>
            <div className="stat-box" style={{ 
              padding: isMobile ? '0.5rem' : '1.25rem',
              minHeight: isMobile ? 'auto' : '100%'
            }}>
              <div className="stat-label" style={{ fontSize: isMobile ? '0.6rem' : '0.8125rem', marginBottom: isMobile ? '0.375rem' : '0.625rem' }}>Total Requests</div>
              <div className="stat-value" style={{ color: 'var(--accent-primary)', fontSize: isMobile ? '1rem' : '1.75rem' }}>
                {totalRequests.toFixed(0)}
              </div>
            </div>
          </Col>
          <Col xs={4} style={{ padding: isMobile ? '0.25rem' : '0.5rem' }}>
            <div className="stat-box" style={{ 
              padding: isMobile ? '0.5rem' : '1.25rem',
              minHeight: isMobile ? 'auto' : '100%'
            }}>
              <div className="stat-label" style={{ fontSize: isMobile ? '0.6rem' : '0.8125rem', marginBottom: isMobile ? '0.375rem' : '0.625rem' }}>Would-be Cost</div>
              <div className="stat-value" style={{ color: 'var(--accent-warning)', fontSize: isMobile ? '1rem' : '1.75rem' }}>
                ${grossCost.toFixed(2)}
              </div>
            </div>
          </Col>
          <Col xs={4} style={{ padding: isMobile ? '0.25rem' : '0.5rem' }}>
            {(() => {
              const requestsLeft = quota - totalRequests;
              const isOverQuota = requestsLeft < 0;
              const displayValue = isOverQuota 
                ? `+${Math.abs(requestsLeft).toFixed(0)}`
                : `${requestsLeft.toFixed(0)}`;
              
              return (
                <div className="stat-box" style={{ 
                  backgroundColor: isOverQuota ? 'var(--accent-danger)' : 'var(--accent-success)', 
                  filter: 'brightness(0.85)', 
                  color: 'white',
                  padding: isMobile ? '0.5rem' : '1.25rem',
                  minHeight: isMobile ? 'auto' : '100%'
                }}>
                  <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)', fontSize: isMobile ? '0.6rem' : '0.8125rem', marginBottom: isMobile ? '0.375rem' : '0.625rem' }}>Requests Left</div>
                  <div className="stat-value" style={{ color: 'white', fontSize: isMobile ? '1rem' : '1.75rem' }}>
                    {displayValue}
                  </div>
                </div>
              );
            })()}
          </Col>
        </Row>

        {/* Model Table */}
        {premiumData?.models && premiumData.models.length > 0 && (
          <Table striped bordered hover size="sm" className="mt-3 mb-0">
            <thead>
              <tr>
                <th>Model</th>
                <th className="text-end">Requests</th>
                <th className="text-end">Cost</th>
              </tr>
            </thead>
            <tbody>
              {[...premiumData.models].sort((a, b) => b.requests - a.requests).map((model, idx) => (
                <tr key={idx}>
                  <td>{model.name}</td>
                  <td className="text-end">{model.requests.toFixed(1)}</td>
                  <td className="text-end">${model.grossCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}


      </Card.Body>
    </Card>
  );
};

export default CopilotUsageCard;
