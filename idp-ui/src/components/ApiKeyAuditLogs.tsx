import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { ApiKeyAuditLog } from '../types/apiKey';
import type { User } from '../types/auth';
import { AngryButton, AngryTextBox, AngryDatePicker } from './input';
import { Breadcrumb } from './Breadcrumb';
import './ApiKeyAuditLogs.css';

interface ApiKeyAuditLogsProps {
  user: User;
}

export const ApiKeyAuditLogs = ({ user }: ApiKeyAuditLogsProps) => {
  const breadcrumbItems = [
    { label: 'Admin Dashboard', path: '/admin' },
    { label: 'API Key Audit Logs' }
  ];

  const [auditLogs, setAuditLogs] = useState<ApiKeyAuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ApiKeyAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterUserEmail, setFilterUserEmail] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterEventType, setFilterEventType] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditLogs, filterUserEmail, filterStartDate, filterEndDate, filterEventType]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getApiKeyAuditLogs(user.email);
      setAuditLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...auditLogs];

    // Filter by user email
    if (filterUserEmail) {
      filtered = filtered.filter(log =>
        log.userEmail.toLowerCase().includes(filterUserEmail.toLowerCase())
      );
    }

    // Filter by start date
    if (filterStartDate) {
      const startDate = new Date(filterStartDate);
      filtered = filtered.filter(log => new Date(log.timestamp) >= startDate);
    }

    // Filter by end date
    if (filterEndDate) {
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      filtered = filtered.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Filter by event type
    if (filterEventType) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(filterEventType.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilterUserEmail('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterEventType('');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionBadgeClass = (action: string): string => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create')) return 'action-create';
    if (actionLower.includes('rotate')) return 'action-rotate';
    if (actionLower.includes('revoke')) return 'action-revoke';
    if (actionLower.includes('auth') || actionLower.includes('login')) return 'action-auth';
    if (actionLower.includes('fail')) return 'action-fail';
    return 'action-default';
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination">
        <AngryButton
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          size="small"
        >
          First
        </AngryButton>
        <AngryButton
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          size="small"
        >
          Previous
        </AngryButton>
        
        {startPage > 1 && (
          <>
            <button className="page-number" onClick={() => handlePageChange(1)}>1</button>
            {startPage > 2 && <span className="pagination-ellipsis">...</span>}
          </>
        )}
        
        {pageNumbers.map(number => (
          <button
            key={number}
            className={`page-number ${currentPage === number ? 'active' : ''}`}
            onClick={() => handlePageChange(number)}
          >
            {number}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
            <button className="page-number" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
          </>
        )}
        
        <AngryButton
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          size="small"
        >
          Next
        </AngryButton>
        <AngryButton
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          size="small"
        >
          Last
        </AngryButton>
      </div>
    );
  };

  if (loading) {
    return <div className="api-key-audit-logs loading">Loading audit logs...</div>;
  }

  return (
    <div className="api-key-audit-logs">
      <Breadcrumb items={breadcrumbItems} />
      <div className="header">
        <div className="header-content">
          <h2>API Key Audit Logs</h2>
          <p className="header-description">
            View and filter API key lifecycle events and authentication attempts
          </p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-field">
            <label htmlFor="filter-user-email">User Email</label>
            <AngryTextBox
              id="filter-user-email"
              value={filterUserEmail}
              onChange={(value) => setFilterUserEmail(value)}
              placeholder="Filter by user email"
            />
          </div>
          
          <div className="filter-field">
            <label htmlFor="filter-event-type">Event Type</label>
            <AngryTextBox
              id="filter-event-type"
              value={filterEventType}
              onChange={(value) => setFilterEventType(value)}
              placeholder="Filter by event type"
            />
          </div>
          
          <div className="filter-field">
            <AngryDatePicker
              id="filter-start-date"
              value={filterStartDate}
              onChange={setFilterStartDate}
              placeholder="Start Date"
            />
          </div>
          
          <div className="filter-field">
            <AngryDatePicker
              id="filter-end-date"
              value={filterEndDate}
              onChange={setFilterEndDate}
              placeholder="End Date"
            />
          </div>
        </div>
        
        <div className="filters-actions">
          <AngryButton onClick={handleClearFilters} size="small">
            Clear Filters
          </AngryButton>
          <span className="results-count">
            Showing {currentLogs.length} of {filteredLogs.length} results
            {filteredLogs.length !== auditLogs.length && ` (${auditLogs.length} total)`}
          </span>
        </div>
      </div>

      <div className="audit-logs-table">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User Email</th>
              <th>Action</th>
              <th>Key Prefix</th>
              <th>Source IP</th>
            </tr>
          </thead>
          <tbody>
            {currentLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  {filteredLogs.length === 0 && auditLogs.length > 0
                    ? 'No audit logs match the current filters.'
                    : 'No audit logs found.'}
                </td>
              </tr>
            ) : (
              currentLogs.map((log) => (
                <tr key={log.id}>
                  <td className="timestamp-cell">{formatDate(log.timestamp)}</td>
                  <td className="email-cell">{log.userEmail}</td>
                  <td>
                    <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="key-prefix-cell">
                    <code>{log.keyPrefix}</code>
                  </td>
                  <td className="ip-cell">{log.sourceIp || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {renderPagination()}

      {filteredLogs.length > 0 && (
        <div className="audit-logs-info">
          <div className="info-card">
            <h3>About Audit Logs</h3>
            <ul>
              <li>All API key lifecycle events are logged for security and compliance</li>
              <li>Authentication attempts (successful and failed) are tracked with source IP</li>
              <li>Use filters to narrow down specific events or time periods</li>
              <li>Logs are retained according to your organization's retention policy</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
