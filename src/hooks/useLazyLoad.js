import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for lazy loading components with Intersection Observer
 * Renders a placeholder until the component is visible in viewport
 */
export const useLazyLoad = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        // Once visible, we can stop observing
        observer.unobserve(entry.target);
      }
    }, {
      rootMargin: '50px', // Start loading 50px before entering viewport
      threshold: 0.01,
      ...options
    });

    const currentElement = elementRef.current;

    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
      observer.disconnect();
    };
  }, [options]);

  return { elementRef, isVisible };
};

/**
 * Lazy Load Wrapper Component
 * Renders children only when visible, shows placeholder while loading
 */
export const LazyLoadWrapper = ({ children, placeholder = null, threshold = 0.01, rootMargin = '50px' }) => {
  const { elementRef, isVisible } = useLazyLoad({ threshold, rootMargin });

  return (
    <div ref={elementRef}>
      {isVisible ? children : (placeholder || <div style={{ minHeight: '200px' }} />)}
    </div>
  );
};

/**
 * Lazy Load Card Skeleton
 * Shows a loading skeleton while chart data is being fetched
 */
export const LazyLoadCardSkeleton = ({ title = 'Loading...', height = '300px' }) => {
  return (
    <div style={{
      padding: '1rem',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '0.375rem',
      minHeight: height,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div style={{
        height: '24px',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '4px',
        marginBottom: '1rem',
        animation: 'pulse 2s infinite'
      }} />
      <div style={{
        height: '200px',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '4px',
        animation: 'pulse 2s infinite'
      }} />
    </div>
  );
};

export default useLazyLoad;
