/**
 * Service for managing historical usage data
 * Stores daily snapshots to enable trend analysis
 */

const STORAGE_KEY_PREFIX = 'usage-history-';
const HISTORY_RETENTION_DAYS = 90;

/**
 * Get storage key for a specific profile and metric
 */
const getStorageKey = (profileId, metric) => `${STORAGE_KEY_PREFIX}${profileId}-${metric}`;

/**
 * Record daily usage snapshot
 */
export const recordDailyUsage = (profileId, metric, value, date = new Date()) => {
  if (!profileId || !metric) return null;

  const key = getStorageKey(profileId, metric);
  let history = JSON.parse(localStorage.getItem(key) || '[]');

  // Format date as YYYY-MM-DD for consistency
  const dateStr = date.toISOString().split('T')[0];

  // Check if entry for today already exists
  const existingIndex = history.findIndex(h => h.date === dateStr);

  const entry = {
    date: dateStr,
    value: value,
    timestamp: new Date().getTime()
  };

  if (existingIndex >= 0) {
    history[existingIndex] = entry;
  } else {
    history.push(entry);
  }

  // Keep only last 90 days
  history = history.filter(h => {
    const historyDate = new Date(h.date);
    const daysDiff = Math.floor((new Date() - historyDate) / (1000 * 60 * 60 * 24));
    return daysDiff < HISTORY_RETENTION_DAYS;
  });

  localStorage.setItem(key, JSON.stringify(history));
  return entry;
};

/**
 * Get historical usage data
 */
export const getHistoricalData = (profileId, metric, days = 30) => {
  if (!profileId || !metric) return [];

  const key = getStorageKey(profileId, metric);
  const history = JSON.parse(localStorage.getItem(key) || '[]');

  // Filter to last N days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return history.filter(h => new Date(h.date) >= cutoffDate).sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * Calculate daily burn rate for a metric
 * Returns average daily consumption rate
 */
export const calculateBurnRate = (profileId, metric, days = 7) => {
  const history = getHistoricalData(profileId, metric, days);

  if (history.length < 2) return null;

  const oldestValue = history[0].value;
  const newestValue = history[history.length - 1].value;
  const totalDaysData = Math.max(1, history.length - 1);

  const totalBurned = newestValue - oldestValue;
  const dailyBurnRate = totalBurned / totalDaysData;

  return {
    dailyRate: dailyBurnRate,
    totalBurned,
    daysOfData: totalDaysData,
    startDate: history[0].date,
    endDate: history[history.length - 1].date,
    startValue: oldestValue,
    endValue: newestValue
  };
};

/**
 * Calculate days remaining in month
 */
export const getDaysRemainingInMonth = () => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const dayOfMonth = now.getDate();
  return daysInMonth - dayOfMonth;
};

/**
 * Project end-of-month usage based on current burn rate
 */
export const projectEndOfMonthUsage = (currentUsage, burnRate, quotaLimit = null) => {
  const daysRemaining = getDaysRemainingInMonth();
  const projectedAdditionalUsage = burnRate * daysRemaining;
  const projectedTotal = currentUsage + projectedAdditionalUsage;

  const result = {
    currentUsage,
    projectedAdditionalUsage,
    projectedTotal,
    daysRemaining,
    quotaLimit,
    percentageOfQuota: quotaLimit ? (projectedTotal / quotaLimit) * 100 : null,
    willExceedQuota: quotaLimit ? projectedTotal > quotaLimit : false,
    usageHeadroom: quotaLimit ? quotaLimit - projectedTotal : null
  };

  return result;
};

/**
 * Get activity by day of week
 * Returns breakdown like GitHub's contribution graph
 */
export const getActivityByDayOfWeek = (profileId, metric, weeks = 12) => {
  const history = getHistoricalData(profileId, metric, weeks * 7);

  if (history.length === 0) return {};

  // Group by day of week
  const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const activityByDay = {
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: []
  };

  history.forEach(entry => {
    const date = new Date(entry.date);
    const dayName = dayOfWeekNames[date.getDay()];
    activityByDay[dayName].push(entry.value);
  });

  // Calculate stats for each day
  const stats = {};
  dayOfWeekNames.forEach(day => {
    const values = activityByDay[day];
    if (values.length > 0) {
      stats[day] = {
        totalUsage: values.reduce((a, b) => a + b, 0),
        averageUsage: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
        maxUsage: Math.max(...values),
        minUsage: Math.min(...values)
      };
    } else {
      stats[day] = {
        totalUsage: 0,
        averageUsage: 0,
        count: 0,
        maxUsage: 0,
        minUsage: 0
      };
    }
  });

  return stats;
};

/**
 * Get daily usage data formatted for activity heatmap/graph
 */
export const getDailyActivityData = (profileId, metric, weeks = 12) => {
  const history = getHistoricalData(profileId, metric, weeks * 7);
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - weeks * 7);

  // Create array of all dates in range
  const allDates = [];
  const current = new Date(startDate);
  while (current <= today) {
    allDates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // Map to history
  const historyMap = {};
  history.forEach(h => {
    historyMap[h.date] = h.value;
  });

  // Create activity data grouped by week
  const weeks_data = [];
  let currentWeek = [];
  let weekStartDate = null;

  allDates.forEach((date, index) => {
    if (!weekStartDate) {
      weekStartDate = new Date(date);
    }

    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    currentWeek.push({
      date: dateStr,
      dateObj: new Date(date),
      dayOfWeek: dayOfWeek,
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      value: historyMap[dateStr] || 0,
      isToday: dateStr === today.toISOString().split('T')[0]
    });

    // Add week when we hit Saturday or the last day
    if (dayOfWeek === 6 || index === allDates.length - 1) {
      weeks_data.push({
        weekStart: weekStartDate.toISOString().split('T')[0],
        days: currentWeek
      });
      currentWeek = [];
      weekStartDate = null;
    }
  });

  return weeks_data;
};

/**
 * Clear all historical data for a profile
 */
export const clearHistoricalData = (profileId) => {
  const metrics = ['actions', 'copilot'];
  metrics.forEach(metric => {
    const key = getStorageKey(profileId, metric);
    localStorage.removeItem(key);
  });
};

/**
 * Export historical data as JSON
 */
export const exportHistoricalData = (profileId) => {
  const metrics = ['actions', 'copilot'];
  const data = {};

  metrics.forEach(metric => {
    data[metric] = getHistoricalData(profileId, metric, 90);
  });

  return data;
};
