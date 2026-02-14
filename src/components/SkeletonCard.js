import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';

const SkeletonCard = ({ type = 'default' }) => {
  return (
    <Card className="usage-card h-100">
      <Card.Header>
        <div className="skeleton skeleton-header" style={{ width: '50%' }} />
      </Card.Header>
      <Card.Body>
        {type === 'chart' && (
          <>
            <div className="skeleton skeleton-circle" style={{ margin: '1.5rem auto' }} />
            <Row className="g-2 mt-3">
              <Col xs={6}>
                <div className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />
              </Col>
              <Col xs={6}>
                <div className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />
              </Col>
            </Row>
          </>
        )}
        
        {type === 'progress' && (
          <>
            <div className="mb-4">
              <div className="skeleton skeleton-text medium mb-2" />
              <div className="skeleton" style={{ height: '48px', borderRadius: '16px' }} />
            </div>
            <Row className="g-2">
              <Col xs={6}>
                <div className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />
              </Col>
              <Col xs={6}>
                <div className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />
              </Col>
              <Col xs={6}>
                <div className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />
              </Col>
              <Col xs={6}>
                <div className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />
              </Col>
            </Row>
          </>
        )}
        
        {type === 'summary' && (
          <>
            <Row className="mb-4">
              <Col md={4}>
                <div className="skeleton skeleton-text long mb-2" style={{ margin: '0 auto' }} />
                <div className="skeleton skeleton-text short" style={{ margin: '0 auto' }} />
              </Col>
              <Col md={4}>
                <div className="skeleton skeleton-text long mb-2" style={{ margin: '0 auto' }} />
                <div className="skeleton skeleton-text short" style={{ margin: '0 auto' }} />
              </Col>
              <Col md={4}>
                <div className="skeleton skeleton-text long mb-2" style={{ margin: '0 auto' }} />
                <div className="skeleton skeleton-text short" style={{ margin: '0 auto' }} />
              </Col>
            </Row>
            <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} />
          </>
        )}
        
        {type === 'default' && (
          <>
            <div className="skeleton skeleton-text long mb-3" />
            <div className="skeleton skeleton-text medium mb-3" />
            <div className="skeleton skeleton-text long mb-3" />
            <div className="skeleton skeleton-text short" />
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export const LoadingSkeleton = () => {
  return (
    <>
      {/* Copilot Chart Skeleton - Centered at Top */}
      <Row className="mb-3">
        <Col lg={8} className="mx-auto">
          <SkeletonCard type="chart" />
        </Col>
      </Row>
      
      {/* Cost Summary Skeleton */}
      <Row className="mb-3">
        <Col>
          <SkeletonCard type="summary" />
        </Col>
      </Row>
      
      {/* Actions Progress Skeleton */}
      <Row className="mb-3">
        <Col lg={8} className="mx-auto">
          <SkeletonCard type="progress" />
        </Col>
      </Row>
    </>
  );
};

export default SkeletonCard;
