/**
 * Historical usage data service — server-backed via /api/usage.
 *
 * No 90-day cap. All history lives in SQLite.
 * One-time migration of existing localStorage data runs via migrateFromLocalStorage().
 *
 * Pure-computation helpers (calculateBurnRate, projectEndOfMonthUsage,
 * getActivityByDayOfWeek, getDailyActivityData) are unchanged — they operate
 * on the data arrays returned by getHistoricalData().
 */

import apiClient from './apiClient';

const MIGRATION_DONE_KEY = 'usage_migrated_to_server_v1';

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Record (or update) a daily usage snapshot for a profile + metric.
 */
export const recordDailyUsage = async (profileId, metric, value, date = new Date()) => {
  if (!profileId || !metric) return null;

  const dateStr = date.toISOString().split('T')[0];

  try {
    await apiClient.post('/usage', { profileId, metric, value, date: dateStr });
    return { date: dateStr, value };
  } catch (e) {
    console.error('[history] recordDailyUsage error:', e);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Get historical snapshots for a profile + metric.
 * @param {string} profileId
 * @param {string} metric        'copilot' | 'actions' | …
 * @param {number|null} days     Limit to last N days.  Null = all history.
 * @returns {Promise<Array>}     [{date_str, value, recorded_at, …}, …]
 */
export const getHistoricalData = async (profileId, metric, days = null) => {
  if (!profileId || !metric) return [];

  try {
    const params = {};
    if (days) params.days = days;

    const res = await apiClient.get(`/usage/${profileId}/${metric}`, { params });
    // Normalise to the shape the rest of the app expects: { date, value }
    return res.data.map(r => ({
      date:      r.date_str,
      value:     r.value,
      timestamp: r.recorded_at,
    }));
  } catch (e) {
    console.error('[history] getHistoricalData error:', e);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Pure computation helpers  (unchanged from original)
// ---------------------------------------------------------------------------

export const calculateBurnRate = (history, days = 7) => {
  // Accept either an array directly, or fall through to return null
  if (!Array.isArray(history) || history.length < 2) return null;

  const recent = history.slice(-Math.max(days + 1, 2));
  if (recent.length < 2) return null;

  const oldestValue    = recent[0].value;
  const newestValue    = recent[recent.length - 1].value;
  const totalDaysData  = Math.max(1, recent.length - 1);
  const totalBurned    = newestValue - oldestValue;
  const dailyBurnRate  = totalBurned / totalDaysData;

  return {
    dailyRate:   dailyBurnRate,
    totalBurned,
    daysOfData:  totalDaysData,
    startDate:   recent[0].date,
    endDate:     recent[recent.length - 1].date,
    startValue:  oldestValue,
    endValue:    newestValue,
  };
};

export const getDaysRemainingInMonth = () => {
  const now      = new Date();
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
};

export const projectEndOfMonthUsage = (currentUsage, burnRate, quotaLimit = null) => {
  const daysRemaining           = getDaysRemainingInMonth();
  const projectedAdditionalUsage = burnRate * daysRemaining;
  const projectedTotal           = currentUsage + projectedAdditionalUsage;

  return {
    currentUsage,
    projectedAdditionalUsage,
    projectedTotal,
    daysRemaining,
    quotaLimit,
    percentageOfQuota: quotaLimit ? (projectedTotal / quotaLimit) * 100 : null,
    willExceedQuota:   quotaLimit ? projectedTotal > quotaLimit : false,
    usageHeadroom:     quotaLimit ? quotaLimit - projectedTotal : null,
  };
};

export const getActivityByDayOfWeek = (history) => {
  if (!history || history.length === 0) return {};

  const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const activityByDay  = Object.fromEntries(dayOfWeekNames.map(d => [d, []]));

  history.forEach(entry => {
    const dayName = dayOfWeekNames[new Date(entry.date).getDay()];
    activityByDay[dayName].push(entry.value);
  });

  const stats = {};
  dayOfWeekNames.forEach(day => {
    const values = activityByDay[day];
    if (values.length > 0) {
      stats[day] = {
        totalUsage:   values.reduce((a, b) => a + b, 0),
        averageUsage: values.reduce((a, b) => a + b, 0) / values.length,
        count:        values.length,
        maxUsage:     Math.max(...values),
        minUsage:     Math.min(...values),
      };
    } else {
      stats[day] = { totalUsage: 0, averageUsage: 0, count: 0, maxUsage: 0, minUsage: 0 };
    }
  });

  return stats;
};

export const getDailyActivityData = (history, weeks = 12) => {
  const today     = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - weeks * 7);

  const allDates = [];
  const current  = new Date(startDate);
  while (current <= today) {
    allDates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const historyMap = {};
  (history || []).forEach(h => { historyMap[h.date] = h.value; });

  const weeksData   = [];
  let currentWeek   = [];
  let weekStartDate = null;

  allDates.forEach((date, index) => {
    if (!weekStartDate) weekStartDate = new Date(date);

    const dateStr   = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    currentWeek.push({
      date:      dateStr,
      dateObj:   new Date(date),
      dayOfWeek,
      dayName:   ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      value:     historyMap[dateStr] || 0,
      isToday:   dateStr === today.toISOString().split('T')[0],
    });

    if (dayOfWeek === 6 || index === allDates.length - 1) {
      weeksData.push({ weekStart: weekStartDate.toISOString().split('T')[0], days: currentWeek });
      currentWeek   = [];
      weekStartDate = null;
    }
  });

  return weeksData;
};

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export const clearHistoricalData = async (profileId) => {
  try {
    await apiClient.delete(`/usage/${profileId}`);
  } catch (e) {
    console.error('[history] clearHistoricalData error:', e);
  }
};

export const exportHistoricalData = async (profileId) => {
  const [copilot, actions] = await Promise.all([
    getHistoricalData(profileId, 'copilot'),
    getHistoricalData(profileId, 'actions'),
  ]);
  return { copilot, actions };
};

// ---------------------------------------------------------------------------
// One-time migration from localStorage  (silent, runs once)
// ---------------------------------------------------------------------------

export const migrateFromLocalStorage = async (profileIds = []) => {
  if (localStorage.getItem(MIGRATION_DONE_KEY)) return;

  const metrics = ['copilot', 'actions'];
  const snapshots = [];

  for (const profileId of profileIds) {
    for (const metric of metrics) {
      const key = `usage-history-${profileId}-${metric}`;
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const entries = JSON.parse(raw);
        entries.forEach(e => {
          snapshots.push({
            profileId,
            metric,
            value:     e.value,
            date:      e.date,
            timestamp: e.timestamp || Date.now(),
          });
        });
        localStorage.removeItem(key);
      } catch { /* ignore parse errors */ }
    }
  }

  if (snapshots.length > 0) {
    try {
      await apiClient.post('/usage/batch', { snapshots });
      console.log(`[migration] Migrated ${snapshots.length} usage snapshots from localStorage.`);
    } catch (e) {
      console.error('[migration] Usage migration error:', e);
    }
  }

  localStorage.setItem(MIGRATION_DONE_KEY, '1');
};
