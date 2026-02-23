// Runtime environment variables — injected by start.sh at container startup.
// For local development, set REACT_APP_API_KEY in your environment or .env.local.
window._env_ = window._env_ || {};
window._env_.REACT_APP_API_KEY = window._env_.REACT_APP_API_KEY || '';
