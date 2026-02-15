import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Filter out extension-related errors that only happen in dev
    const errorString = error.toString();
    const isExtensionError = 
      errorString.includes('ethereum') ||
      errorString.includes('Script error') ||
      errorString.includes('extension') ||
      (errorInfo.componentStack && errorInfo.componentStack.includes('chrome-extension'));
    
    if (!isExtensionError) {
      // Log real errors
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    // Reset state after a short delay to recover
    setTimeout(() => {
      this.setState({ hasError: false });
    }, 100);
  }

  render() {
    if (this.state.hasError) {
      return this.props.children;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
