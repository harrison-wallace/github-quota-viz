import axios from 'axios';
import { getActiveToken } from './profileService';

// Helper to get environment variables (runtime or build-time)
const getEnvVar = (key) => {
  return (window._env_ && window._env_[key]) || process.env[key] || '';
};

const API_BASE_URL = 'https://api.github.com';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  },
});

// Add auth token to each request
apiClient.interceptors.request.use((config) => {
  // Try profile token first, then fallback to env var
  const profileToken = getActiveToken();
  const envToken = getEnvVar('REACT_APP_GITHUB_TOKEN');
  const token = profileToken || envToken;
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

/**
 * Retry logic with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Initial delay in ms
 * @returns {Promise} - Result of the function
 */
const retryWithBackoff = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry on client errors (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      
      // Last attempt, throw error
      if (i === retries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const waitTime = delay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${retries} after ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

/**
 * Get premium request usage for a user
 * @param {string} username - GitHub username
 * @param {number} year - Year (default: current year)
 * @param {number} month - Month 1-12 (default: current month)
 * @returns {Promise<Object>} - Premium request usage data
 */
export const getPremiumRequestUsage = async (username, year = null, month = null) => {
  const params = {};
  if (year) params.year = year;
  if (month) params.month = month;
  
  return retryWithBackoff(async () => {
    const response = await apiClient.get(
      `/users/${username}/settings/billing/premium_request/usage`,
      { params }
    );
    return response.data;
  });
};

/**
 * Get detailed billing usage report for a user
 * @param {string} username - GitHub username
 * @param {number} year - Year (default: current year)
 * @param {number} month - Month 1-12 (default: current month)
 * @returns {Promise<Object>} - Billing usage data
 */
export const getBillingUsage = async (username, year = null, month = null) => {
  const params = {};
  if (year) params.year = year;
  if (month) params.month = month;
  
  return retryWithBackoff(async () => {
    const response = await apiClient.get(
      `/users/${username}/settings/billing/usage`,
      { params }
    );
    return response.data;
  });
};

/**
 * Get usage summary for a user (PRIMARY ENDPOINT)
 * @param {string} username - GitHub username
 * @param {number} year - Year (default: current year)
 * @param {number} month - Month 1-12 (default: current month)
 * @returns {Promise<Object>} - Usage summary data
 */
export const getUsageSummary = async (username, year = null, month = null) => {
  const params = {};
  if (year) params.year = year;
  if (month) params.month = month;
  
  return retryWithBackoff(async () => {
    const response = await apiClient.get(
      `/users/${username}/settings/billing/usage/summary`,
      { params }
    );
    return response.data;
  });
};

/**
 * Transform usage summary data for easier consumption
 * @param {Object} summaryData - Raw summary data from API
 * @returns {Object} - Transformed data
 */
export const transformUsageSummary = (summaryData) => {
  if (!summaryData || !summaryData.usageItems) {
    return null;
  }
  
  const actions = summaryData.usageItems.find(item => item.product === 'Actions');
  const copilot = summaryData.usageItems.filter(item => item.product === 'Copilot');
  const gitLfs = summaryData.usageItems.find(item => item.product === 'Git LFS');
  
  return {
    timePeriod: summaryData.timePeriod,
    user: summaryData.user,
    actions: {
      minutes: actions?.grossQuantity || 0,
      grossCost: actions?.grossAmount || 0,
      netCost: actions?.netAmount || 0,
      sku: actions?.sku || 'actions_linux',
      unitType: actions?.unitType || 'minutes',
    },
    copilot: {
      totalRequests: copilot.reduce((sum, item) => sum + item.grossQuantity, 0),
      totalGrossCost: copilot.reduce((sum, item) => sum + item.grossAmount, 0),
      totalNetCost: copilot.reduce((sum, item) => sum + item.netAmount, 0),
      breakdown: copilot.map(item => ({
        sku: item.sku,
        requests: item.grossQuantity,
        grossCost: item.grossAmount,
        netCost: item.netAmount,
        pricePerUnit: item.pricePerUnit,
      })),
    },
    gitLfs: {
      storage: gitLfs?.grossQuantity || 0,
      grossCost: gitLfs?.grossAmount || 0,
      netCost: gitLfs?.netAmount || 0,
      unitType: gitLfs?.unitType || 'gigabyte-hours',
    },
    totalGrossCost: summaryData.usageItems.reduce((sum, item) => sum + item.grossAmount, 0),
    totalNetCost: summaryData.usageItems.reduce((sum, item) => sum + item.netAmount, 0),
  };
};

/**
 * Transform premium request data for model breakdown
 * @param {Object} premiumData - Raw premium request data from API
 * @returns {Object} - Transformed data with model breakdown
 */
export const transformPremiumRequestData = (premiumData) => {
  if (!premiumData || !premiumData.usageItems) {
    return null;
  }
  
  return {
    timePeriod: premiumData.timePeriod,
    user: premiumData.user,
    models: premiumData.usageItems.map(item => ({
      name: item.model,
      sku: item.sku,
      requests: item.grossQuantity,
      grossCost: item.grossAmount,
      netCost: item.netAmount,
      pricePerUnit: item.pricePerUnit,
    })),
    totalRequests: premiumData.usageItems.reduce((sum, item) => sum + item.grossQuantity, 0),
    totalGrossCost: premiumData.usageItems.reduce((sum, item) => sum + item.grossAmount, 0),
    totalNetCost: premiumData.usageItems.reduce((sum, item) => sum + item.netAmount, 0),
  };
};

const githubApi = {
  getPremiumRequestUsage,
  getBillingUsage,
  getUsageSummary,
  transformUsageSummary,
  transformPremiumRequestData,
};

export default githubApi;
