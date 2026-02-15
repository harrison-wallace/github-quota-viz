import React from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initializeTheme } from './services/themeService';

// Suppress extension-related script errors in development
if (process.env.NODE_ENV === 'development') {
  const originalOnError = window.onerror;
  window.onerror = function(msg, url, line, col, error) {
    // Filter out "Script error" from extensions
    if (msg === 'Script error.' || !url || url === '') {
      return true; // Suppress error
    }
    if (originalOnError) {
      return originalOnError.apply(this, arguments);
    }
    return false;
  };
  
  // Also handle unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('ethereum') || 
         event.reason.message.includes('Script error'))) {
      event.preventDefault();
    }
  });
}

// Initialize theme before rendering
initializeTheme();

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
