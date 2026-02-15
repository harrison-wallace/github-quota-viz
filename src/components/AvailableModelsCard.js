import React, { useState, useMemo } from 'react';
import { Card, Table, Badge, Form, Row, Col, Collapse, Alert } from 'react-bootstrap';
import { FaBrain, FaFilter, FaChevronDown, FaExclamationTriangle, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import {
  useAvailableModels,
  getProviders,
  filterByProvider,
  formatMultiplier
} from '../services/modelsService';

const AvailableModelsCard = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'multiplierPaid', direction: 'desc' });
  const { models, loading, error, lastUpdated, refetch } = useAvailableModels();

  // Get unique providers
  const providers = useMemo(() => getProviders(models), [models]);

  // Filter and sort models
  const filteredModels = useMemo(() => {
    let filtered = filterByProvider(models, selectedProvider);

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'provider':
            aValue = a.provider.toLowerCase();
            bValue = b.provider.toLowerCase();
            break;
          case 'status':
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case 'multiplierPaid':
            aValue = a.multiplierPaid !== null ? a.multiplierPaid : -1;
            bValue = b.multiplierPaid !== null ? b.multiplierPaid : -1;
            break;
          case 'multiplierFree':
            aValue = a.multiplierFree !== null ? a.multiplierFree : -1;
            bValue = b.multiplierFree !== null ? b.multiplierFree : -1;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [models, selectedProvider, sortConfig]);

  // Handle sort click
  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get sort icon
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <FaSort className="sort-icon" />;
    return sortConfig.direction === 'asc' ? <FaSortUp className="sort-icon active" /> : <FaSortDown className="sort-icon active" />;
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('ga') || statusLower === 'ga') return 'success';
    if (statusLower.includes('preview')) return 'warning';
    if (statusLower.includes('closing') || statusLower.includes('retired')) return 'danger';
    return 'secondary';
  };

  // Get multiplier badge class based on value (green = low, red = high)
  const getMultiplierBadgeClass = (multiplier) => {
    if (multiplier === null) return 'multiplier-badge unavailable';
    if (multiplier === 0) return 'multiplier-badge included';
    if (multiplier <= 0.5) return 'multiplier-badge low';
    if (multiplier <= 1) return 'multiplier-badge medium';
    if (multiplier <= 2) return 'multiplier-badge high';
    return 'multiplier-badge premium';
  };

  // Format last updated time
  const formatLastUpdated = (date) => {
    if (!date) return 'Unknown';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card className={`usage-card ${className}`}>
      <Card.Header 
        as="div"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        className="d-flex justify-content-between align-items-center"
      >
        <div className="d-flex align-items-center gap-2">
          <FaBrain />
          <span>Available Copilot Models</span>
          {lastUpdated && (
            <small className="text-muted ms-2">
              (Updated: {formatLastUpdated(lastUpdated)})
            </small>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <FaChevronDown 
            className={`collapse-icon ${isExpanded ? '' : 'collapsed'}`}
            style={{ fontSize: '0.875rem', transition: 'transform 0.3s ease' }}
          />
        </div>
      </Card.Header>

      <Collapse in={isExpanded}>
        <Card.Body>
          {/* Filter and Actions */}
          <Row className="mb-3 align-items-center">
            <Col md={6} className="mb-2 mb-md-0">
              <div className="d-flex align-items-center gap-2">
                <FaFilter className="text-muted" />
                <Form.Select
                  size="sm"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  style={{ width: 'auto' }}
                >
                  <option value="All">All Providers</option>
                  {providers.map(provider => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </Form.Select>
              </div>
            </Col>
            <Col md={6} className="text-md-end">
              <small className="text-muted">
                {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''} shown
              </small>
            </Col>
          </Row>

          {/* Error Alert */}
          {error && (
            <Alert variant="warning" className="mb-3">
              <FaExclamationTriangle className="me-2" />
              <small>
                Could not fetch latest models from GitHub Docs. 
                Showing cached data. <button 
                  className="btn btn-link btn-sm p-0" 
                  onClick={(e) => { e.stopPropagation(); refetch(); }}
                >
                  Retry
                </button>
              </small>
            </Alert>
          )}

          {/* Models Table */}
          <div className="models-table-container">
            <Table striped bordered hover size="sm" className="mb-0 available-models-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} className="sortable-header">
                    Model {getSortIcon('name')}
                  </th>
                  <th onClick={() => handleSort('provider')} className="sortable-header">
                    Provider {getSortIcon('provider')}
                  </th>
                  <th onClick={() => handleSort('status')} className="sortable-header">
                    Status {getSortIcon('status')}
                  </th>
                  <th onClick={() => handleSort('multiplierPaid')} className="sortable-header text-center">
                    Paid Plans {getSortIcon('multiplierPaid')}
                  </th>
                  <th onClick={() => handleSort('multiplierFree')} className="sortable-header text-center">
                    Free Plan {getSortIcon('multiplierFree')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <span className="ms-2">Loading models...</span>
                    </td>
                  </tr>
                ) : filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      No models found
                    </td>
                  </tr>
                ) : (
                  filteredModels.map((model, index) => (
                    <tr key={index}>
                      <td>
                        <strong>{model.name}</strong>
                      </td>
                      <td>{model.provider}</td>
                      <td>
                        <Badge 
                          bg={getStatusVariant(model.status)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {model.status}
                        </Badge>
                      </td>
                      <td className="text-center">
                        {model.multiplierPaid !== null ? (
                          <span className={getMultiplierBadgeClass(model.multiplierPaid)}>
                            {formatMultiplier(model.multiplierPaid)}
                          </span>
                        ) : (
                          <span className="multiplier-badge unavailable">-</span>
                        )}
                      </td>
                      <td className="text-center">
                        {model.multiplierFree !== null ? (
                          <span className={getMultiplierBadgeClass(model.multiplierFree)}>
                            {formatMultiplier(model.multiplierFree)}
                          </span>
                        ) : (
                          <span className="multiplier-badge unavailable">Not available</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* Legend */}
          <div className="mt-3 pt-3 border-top">
            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
              <strong>Legend:</strong>{' '}
              <Badge bg="success" className="me-1">GA</Badge> Generally Available{' '}
              <Badge bg="warning" className="me-1 ms-2">Preview</Badge> Public Preview{' '}
              <Badge bg="danger" className="me-1 ms-2">Closing</Badge> Being Retired{' '}
              <span className="ms-2">| Multiplier = premium request cost factor</span>
            </small>
          </div>

          {/* Source Info */}
          <div className="mt-2 text-end">
            <small className="text-muted">
              Data auto-updates every 24h from{' '}
              <a 
                href="https://docs.github.com/en/copilot/using-github-copilot/ai-models/supported-ai-models-in-copilot"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                GitHub Docs
              </a>
            </small>
          </div>
        </Card.Body>
      </Collapse>
    </Card>
  );
};

export default AvailableModelsCard;
