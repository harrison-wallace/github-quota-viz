import React, { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import { FaFire } from 'react-icons/fa';
import { getDailyActivityData, getActivityByDayOfWeek } from '../services/historicalDataService';
import './ActivityGraph.css';

const ActivityGraph = ({ profileId, metric = 'copilot', title = 'Usage Activity', weeks = 12 }) => {
  const activityData = useMemo(() => {
    return getDailyActivityData(profileId, metric, weeks);
  }, [profileId, metric, weeks]);

  const dayOfWeekStats = useMemo(() => {
    return getActivityByDayOfWeek(profileId, metric, weeks);
  }, [profileId, metric, weeks]);

  if (!activityData || activityData.length === 0) {
    return null;
  }

  // Find max value for color intensity scaling
  const maxValue = Math.max(
    ...activityData.flatMap(week => week.days.map(day => day.value)),
    1
  );

  // Determine color intensity (0-4 scale for GitHub-like colors)
  const getColorIntensity = (value, max) => {
    if (value === 0) return 0;
    if (value <= max * 0.25) return 1;
    if (value <= max * 0.5) return 2;
    if (value <= max * 0.75) return 3;
    return 4;
  };

  // Day of week labels
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate heaviest day
  const heaviestDay = Object.entries(dayOfWeekStats).reduce((max, [day, stats]) => {
    return stats.totalUsage > (max.stats?.totalUsage || 0) ? { day, stats } : max;
  }, {});

  return (
    <Card className="usage-card activity-graph-card">
      <Card.Header as="h5">
        <FaFire className="me-2" />
        {title}
      </Card.Header>
      <Card.Body>
        {/* Legend */}
        <div className="activity-legend mb-4">
          <div className="legend-item">
            <small className="text-muted me-3">Less</small>
            {[0, 1, 2, 3, 4].map(intensity => (
              <div
                key={intensity}
                className={`legend-box intensity-${intensity}`}
                title={`Intensity ${intensity}`}
              />
            ))}
            <small className="text-muted ms-3">More</small>
          </div>
        </div>

        {/* Activity Graph */}
        <div className="activity-graph-container">
          <div className="day-labels">
            {dayLabels.map((label, idx) => (
              <div key={idx} className="day-label">
                {label}
              </div>
            ))}
          </div>

          <div className="weeks-grid">
            {activityData.map((week, weekIdx) => (
              <div key={weekIdx} className="week-column">
                {week.days.map((day, dayIdx) => {
                  const intensity = getColorIntensity(day.value, maxValue);
                  return (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      className={`activity-day intensity-${intensity} ${day.isToday ? 'today' : ''}`}
                      title={`${day.dateObj.toLocaleDateString()}: ${day.value} requests`}
                    >
                      <span className="activity-value">{day.value > 0 ? day.value : ''}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Day of Week Stats */}
        {heaviestDay.day && (
          <div className="mt-4 pt-3 border-top">
            <div className="row g-2">
              {dayLabels.map(day => {
                const stats = dayOfWeekStats[day];
                const isHeaviest = heaviestDay.day === day;
                return (
                  <div key={day} className="col-6 col-lg-3">
                    <div className={`day-stat-box ${isHeaviest ? 'heaviest' : ''}`}>
                      <div className="day-stat-label">{day}</div>
                      <div className="day-stat-value">
                        {stats.averageUsage.toFixed(0)}
                      </div>
                      <div className="day-stat-meta">
                        {stats.count} days
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        {heaviestDay.day && (
          <div className="mt-3 p-3 bg-light rounded">
            <small className="text-muted">
              <strong>Heaviest day:</strong> {heaviestDay.day} with average {heaviestDay.stats.averageUsage.toFixed(0)} requests
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ActivityGraph;
