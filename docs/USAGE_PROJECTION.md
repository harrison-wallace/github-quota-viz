# Usage Projection & Burn Rate Calculation

## Overview

The Usage Projection card estimates end-of-month usage based on a 7-day rolling burn rate calculated from daily snapshots stored in SQLite. This document explains how the system works and how it handles quota resets.

## Key Concepts

### Billing Period
GitHub resets quotas on a calendar-month basis:
- **Start**: 1st of each month at 00:00 UTC
- **End**: Last day of the month at 23:59:59 UTC
- Both **Copilot Premium Requests** and **GitHub Actions minutes** follow this schedule

### Burn Rate
The burn rate represents average daily usage over a rolling 7-day window.

**Formula:**
```
burn_rate = (newest_value - oldest_value) / number_of_days_in_window
```

Example:
- Day 1 usage: 10 requests
- Day 8 usage: 80 requests
- Burn rate: (80 - 10) / 7 = 10 requests/day

### Projection
End-of-month projection combines current usage with projected additional usage based on burn rate and remaining days.

**Formula:**
```
projected_eom = current_usage + (burn_rate × days_remaining)
```

Example (assuming 8 days into March, 23 days remaining):
- Current usage: 80 requests
- Burn rate: 10 requests/day
- Projected additional: 10 × 23 = 230 requests
- Projected EOM: 80 + 230 = 310 requests

## How It Works

### Data Flow

```
GitHub API
  ↓
App.js (fetches usage every hour)
  ↓
historicalDataService.recordDailyUsage()
  ↓
SQLite: usage_snapshots table
  ↓
ProjectionCard (fetches 30 days of history)
  ↓
calculateBurnRate() (filters by current month)
  ↓
projectEndOfMonthUsage() (calculates projection)
  ↓
UI displays projection with color-coded alerts
```

### Month-Based Filtering

As of v2.1.0, burn rate calculation is **month-aware** to handle quota resets correctly:

1. **Month Start Detection**: Calculates 1st of current month at 00:00 UTC
2. **History Filtering**: Only data points from current month are used for burn rate calculation
3. **Fallback Logic**: If current month has < 2 data points (early in month):
   - Falls back to last 7 days of available historical data
   - Returns `isLimited: true` flag
4. **All History Preserved**: Database keeps all snapshots indefinitely for year-over-year analysis

**Why?** Before the fix, after a quota reset:
- Old month data (high usage) + new month data (low usage) = negative burn rate
- Negative burn rate → negative projections (clearly wrong)

### Example: Post-Reset Scenario

**Before Fix (Broken):**
- Feb 28: 1480 requests used
- Mar 1: 20 requests used
- Burn rate (last 7 days): (20 - 1480) / ~7 = -188.6/day ❌
- Projection: Negative values ❌

**After Fix (Correct):**
- March only data: [0, 10, 15, 20] (only current month)
- Burn rate: (20 - 0) / 3 = 6.7/day ✓
- Projection: 20 + (6.7 × 30) ≈ 221 requests by EOM ✓

## Components Involved

### `calculateBurnRate(history, days = 7, monthStart = null)`
Located in: `src/services/historicalDataService.js`

**Parameters:**
- `history`: Array of {date, value} snapshots
- `days`: Rolling window size (default: 7)
- `monthStart`: Start of billing month (auto-calculated if not provided)

**Returns:**
```javascript
{
  dailyRate,        // Average requests/minutes per day
  totalBurned,      // Total consumed in window
  daysOfData,       // Number of days in calculation
  startDate,        // Date of oldest point in window
  endDate,          // Date of newest point in window
  startValue,       // Usage at window start
  endValue,         // Usage at window end
  isLimited         // true if using fallback data
}
```

**Logging:** Detailed logs are printed to browser console for debugging:
```
[calculateBurnRate] Month filter: 2026-03-01 | Current month data: 12 points | Window: 8 points (7 days) | Burn rate: 6.67/day
```

### `projectEndOfMonthUsage(currentUsage, burnRate, quotaLimit = null)`
Located in: `src/services/historicalDataService.js`

**Returns:**
```javascript
{
  projectedTotal,       // Total usage at EOM
  percentageOfQuota,    // How much of quota will be used (%)
  willExceedQuota,      // true if projection > quota
  usageHeadroom,        // Remaining requests/minutes at EOM
  ...
}
```

### `ProjectionCard.js`
Located in: `src/components/ProjectionCard.js`

**Responsibilities:**
1. Fetches 30 days of historical data for both Copilot and Actions
2. Calculates current month start date
3. Calls `calculateBurnRate()` with month start parameter
4. Calls `projectEndOfMonthUsage()` for projections
5. Renders alerts:
   - 🔴 **Projected Overage** (red) if usage will exceed quota
   - 🟢 **On Track** (green) if usage is within quota
   - ℹ️ **Projections Unavailable** (blue) if insufficient data

## Handling Edge Cases

### Early in the Month (< 2 data points)
If today is March 2 and only 1 data point exists in March:
- `currentMonthHistory.length < 2`
- Fallback: Use last 7 days of available data
- Return `isLimited: true` (indicating limited data)
- UI message: "Insufficient historical data. Check back after 2+ days of usage."

### Month Change During 7-Day Window
Example: Today is Mar 3, looking at last 7 days:
- Feb 25–Feb 28: Excluded (previous month)
- Mar 1–Mar 3: Included (current month)
- Actual window: 3 days (auto-adjusted)

### No Data at All
Returns `null` → UI displays "Projections Unavailable"

## Testing the Fix

### To verify month-based filtering works:

1. **Check browser console** for logs when ProjectionCard loads:
   ```
   [calculateBurnRate] Month filter: 2026-03-01 | ...
   ```

2. **Add a profile** and wait 2+ days of data collection

3. **Verify projection is positive** (no negative numbers)

4. **After month ends**, check that March data is separate from April projections

### Database Query
```sql
SELECT date_str, value FROM usage_snapshots 
WHERE profile_id = '<your-profile-id>' 
  AND metric = 'copilot' 
ORDER BY date_str DESC 
LIMIT 30;
```

This shows all stored history. Current month filtering happens in the app, not the database.

## Troubleshooting

### Projections still showing negative values
- Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
- Check browser console for `[calculateBurnRate]` logs
- Ensure you're running v2.1.0 or later

### "Projections Unavailable" appears
- Check browser console for error messages
- Wait until there are 2+ data points in the current month
- Refresh the page

### Burn rate doesn't match expectations
- Remember: only current-month data is used
- Early in the month, the window is smaller than 7 days
- Check console logs to see actual window size and number of days

## Implementation Details

### Date Format
All dates in the database are stored as ISO 8601 strings: `YYYY-MM-DD`

Filter comparison:
```javascript
const monthStartStr = '2026-03-01';  // 1st of current month
const currentMonthHistory = history.filter(entry => entry.date >= monthStartStr);
```

This is string-safe because ISO format is lexicographically sorted.

### Time Zone Note
All calculations use the browser's local time. However, GitHub's API returns UTC times. The mismatch is negligible for daily burn rate calculations, as we group by date (YYYY-MM-DD), not by specific hour.

For highest accuracy in multi-timezone deployments, all dates should be handled as UTC.

## Version History

| Version | Change |
|---------|--------|
| v2.1.0+ | Month-aware burn rate filtering (this document) |
| v2.0.0+ | SQLite storage, unlimited history |
| v1.x    | localStorage-based, 90-day cap |
