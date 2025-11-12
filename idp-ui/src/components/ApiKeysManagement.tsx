import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { ApiKeyResponse, ApiKeyStatus, ApiKeyCreated } from '../types/apiKey';
import type { User } from '../types/auth';
import { AngryButton } from './input';
import { Breadcrumb } from './Breadcrumb';
import { ApiKeyCreateModal } from './ApiKeyCreateModal';
import { ApiKeyRotateModal } from './ApiKeyRotateModal';
import { ApiKeyRevokeModal } from './ApiKeyRevokeModal';
import { ApiKeyEditNameModal } from './ApiKeyEditNameModal';
import './ApiKeysManagement.css';

interface ApiKeysManagementProps {
  user: User;
  mode?: 'personal' | 'admin';
}

export const ApiKeysManagement = ({ user, mode = 'personal' }: ApiKeysManagementProps) => {
  const isAdminMode = mode === 'admin';
  
  const breadcrumbItems = isAdminMode
    ? [
        { label: 'Admin Dashboard', path: '/admin' },
        { label: 'API Keys Management' }
      ]
    : [{ label: 'My API Keys' }];

  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKeyResponse | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, [isAdminMode]);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = isAdminMode 
        ? await apiService.getSystemApiKeys(user.email)
        : await apiService.getUserApiKeys(user.email);
      setApiKeys(data);
    } catch (err) {
      console.error('Failed to load API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = (_createdKey: ApiKeyCreated) => {
    // Reload the API keys list to show the new key
    loadApiKeys();
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleRotateKey = (keyId: string) => {
    const key = apiKeys.find(k => k.id === keyId);
    if (key) {
      setSelectedApiKey(key);
      setIsRotateModalOpen(true);
    }
  };

  const handleRevokeKey = (keyId: string) => {
    const key = apiKeys.find(k => k.id === keyId);
    if (key) {
      setSelectedApiKey(key);
      setIsRevokeModalOpen(true);
    }
  };

  const handleEditName = (keyId: string) => {
    const key = apiKeys.find(k => k.id === keyId);
    if (key) {
      setSelectedApiKey(key);
      setIsEditNameModalOpen(true);
    }
  };

  const handleRotateSuccess = (_rotatedKey: ApiKeyCreated) => {
    // Reload the API keys list to show the updated key
    loadApiKeys();
  };

  const handleRevokeSuccess = () => {
    // Reload the API keys list to show the revoked key
    loadApiKeys();
  };

  const handleCloseRotateModal = () => {
    setIsRotateModalOpen(false);
    setSelectedApiKey(null);
  };

  const handleCloseRevokeModal = () => {
    setIsRevokeModalOpen(false);
    setSelectedApiKey(null);
  };

  const handleEditNameSuccess = (_updatedKey: ApiKeyResponse) => {
    // Reload the API keys list to show the updated name
    loadApiKeys();
  };

  const handleCloseEditNameModal = () => {
    setIsEditNameModalOpen(false);
    setSelectedApiKey(null);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status: ApiKeyStatus): string => {
    switch (status) {
      case 'ACTIVE':
        return 'status-active';
      case 'EXPIRING_SOON':
        return 'status-expiring-soon';
      case 'EXPIRED':
        return 'status-expired';
      case 'REVOKED':
        return 'status-revoked';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: ApiKeyStatus): string => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'EXPIRING_SOON':
        return 'Expiring Soon';
      case 'EXPIRED':
        return 'Expired';
      case 'REVOKED':
        return 'Revoked';
      default:
        return status;
    }
  };

  if (loading) {
    return <div className="api-keys-management loading">Loading API keys...</div>;
  }

  return (
    <div className={`api-keys-management mode-${mode}`}>
      <Breadcrumb items={breadcrumbItems} />
      <div className="header">
        <div className="header-content">
          <h2>{isAdminMode ? 'API Keys Management' : 'My API Keys'}</h2>
          <p className="header-description">
            {isAdminMode
              ? 'Manage all API keys including system-level keys for programmatic access'
              : 'Manage your personal API keys for programmatic access to the IDP API'}
          </p>
        </div>
        <AngryButton onClick={handleCreateKey} cssClass="e-primary" isPrimary={true}>
          Create New API Key
        </AngryButton>
      </div>

      {error && <div className="error-message">{error}</div>}

      {apiKeys.length === 0 ? (
        <div className="empty-state-container">
          <div className="empty-state-icon">🔑</div>
          <h3 className="empty-state-title">
            {isAdminMode ? 'No API Keys Found' : 'No API Keys Yet'}
          </h3>
          {isAdminMode ? (
            <p className="empty-state-description">
              No API keys have been created yet. Click "Create New API Key" to generate your first key.
            </p>
          ) : (
            <>
              <p className="empty-state-description">
                Create your first API key to enable programmatic access to the IDP API. API keys allow you to:
              </p>
              <ul className="empty-state-benefits">
                <li>Authenticate CLI tools and scripts</li>
                <li>Integrate with CI/CD pipelines</li>
                <li>Automate infrastructure provisioning</li>
                <li>Access the API without interactive login</li>
              </ul>
              <div className="empty-state-action">
                <AngryButton onClick={handleCreateKey} cssClass="e-primary" isPrimary={true}>
                  Create Your First API Key
                </AngryButton>
              </div>
              <div className="empty-state-help">
                <p>
                  Learn more about API keys in our{' '}
                  <a href="/docs/api-keys" target="_blank" rel="noopener noreferrer">
                    documentation
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="api-keys-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Key Prefix</th>
                <th>Type</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Last Used</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id}>
                  <td className="key-name">{key.keyName}</td>
                  <td className="key-prefix">
                    <code>{key.keyPrefix}...</code>
                  </td>
                  <td>
                    <span className={`type-badge type-${key.keyType.toLowerCase()}`}>
                      {key.keyType}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(key.createdAt)}</td>
                  <td className="date-cell">{formatDate(key.expiresAt)}</td>
                  <td className="date-cell">{formatDate(key.lastUsedAt)}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(key.status)}`}>
                      {getStatusLabel(key.status)}
                    </span>
                  </td>
                  <td className="actions">
                    {key.status === 'ACTIVE' || key.status === 'EXPIRING_SOON' ? (
                      <>
                        <AngryButton
                          onClick={() => handleEditName(key.id)}
                          cssClass="e-small"
                        >
                          Edit Name
                        </AngryButton>
                        <AngryButton
                          onClick={() => handleRotateKey(key.id)}
                          cssClass="e-small e-info"
                        >
                          Rotate
                        </AngryButton>
                        <AngryButton
                          onClick={() => handleRevokeKey(key.id)}
                          cssClass="e-small e-danger"
                        >
                          Revoke
                        </AngryButton>
                      </>
                    ) : (
                      <span className="no-actions">No actions available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {apiKeys.length > 0 && (
        <div className="api-keys-info">
          <div className="info-card">
            <h3>About API Keys</h3>
            <ul>
              <li>API keys provide programmatic access to the IDP API</li>
              <li>Keys are shown only once during creation - save them securely</li>
              <li>Keys expire after the configured period (default 90 days)</li>
              <li>Rotate keys regularly to maintain security</li>
              <li>Revoked keys cannot be reactivated</li>
            </ul>
          </div>
        </div>
      )}

      <ApiKeyCreateModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleCreateSuccess}
        user={user}
        mode={mode}
      />

      <ApiKeyRotateModal
        isOpen={isRotateModalOpen}
        onClose={handleCloseRotateModal}
        onSuccess={handleRotateSuccess}
        apiKey={selectedApiKey}
        user={user}
        mode={mode}
      />

      <ApiKeyRevokeModal
        isOpen={isRevokeModalOpen}
        onClose={handleCloseRevokeModal}
        onSuccess={handleRevokeSuccess}
        apiKey={selectedApiKey}
        user={user}
        mode={mode}
      />

      <ApiKeyEditNameModal
        isOpen={isEditNameModalOpen}
        onClose={handleCloseEditNameModal}
        onSuccess={handleEditNameSuccess}
        apiKey={selectedApiKey}
        user={user}
      />
    </div>
  );
};
