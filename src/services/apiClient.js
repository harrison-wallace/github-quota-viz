/**
 * Axios instance for all /api/* calls to the local Express server.
 *
 * The API key is injected at container start into window._env_.REACT_APP_API_KEY
 * via env-config.js.  Falls back to the CRA build-time env var for local dev.
 */

import axios from 'axios';

const getApiKey = () => {
  return (window._env_ && window._env_.REACT_APP_API_KEY) ||
         process.env.REACT_APP_API_KEY ||
         '';
};

const apiClient = axios.create({
  // In production everything goes through nginx on the same origin.
  // In local CRA dev (port 3000) we proxy to port 3001 via package.json "proxy".
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach the API key to every request
apiClient.interceptors.request.use((config) => {
  const key = getApiKey();
  if (key) config.headers['X-API-Key'] = key;
  return config;
});

export default apiClient;
