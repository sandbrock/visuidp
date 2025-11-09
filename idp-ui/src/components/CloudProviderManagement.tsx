import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { CloudProvider, CloudProviderCreate } from '../types/admin';
import type { User } from '../types/auth';
import { AngryButton, AngryTextBox, AngryCheckBox } from './input';
import { Modal } from './Modal';
import { Breadcrumb } from './Breadcrumb';
import './CloudProviderManagement.css';

interface CloudProviderManagementProps {
  user: User;
}

export const CloudProviderManagement = ({ user }: CloudProviderManagementProps) => {
  const breadcrumbItems = [
    { label: 'Admin Dashboard', path: '/admin' },
    { label: 'Cloud Provider Management' }
  ];

  const [providers, setProviders] = useState<CloudProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<CloudProvider | null>(null);
  const [formData, setFormData] = useState<CloudProviderCreate>({
    name: '',
    displayName: '',
    description: '',
    enabled: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getCloudProviders(user.email);
      setProviders(data);
    } catch (err) {
      console.error('Failed to load cloud providers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cloud providers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProvider(null);
    setFormData({
      name: '',
      displayName: '',
      description: '',
      enabled: false,
    });
    setShowModal(true);
  };

  const handleEdit = (provider: CloudProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      displayName: provider.displayName,
      description: provider.description || '',
      enabled: provider.enabled,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!formData.name.trim() || !formData.displayName.trim()) {
        setError('Name and Display Name are required');
        return;
      }

      if (editingProvider) {
        await apiService.updateCloudProvider(editingProvider.id, formData, user.email);
      } else {
        await apiService.createCloudProvider(formData, user.email);
      }

      setShowModal(false);
      await loadProviders();
    } catch (err) {
      console.error('Failed to save cloud provider:', err);
      setError(err instanceof Error ? err.message : 'Failed to save cloud provider');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (provider: CloudProvider) => {
    try {
      setError(null);
      await apiService.toggleCloudProvider(provider.id, !provider.enabled, user.email);
      await loadProviders();
    } catch (err) {
      console.error('Failed to toggle cloud provider:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle cloud provider');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setError(null);
  };

  if (loading) {
    return <div className="cloud-provider-management loading">Loading cloud providers...</div>;
  }

  return (
    <div className="cloud-provider-management">
      <Breadcrumb items={breadcrumbItems} />
      <div className="header">
        <h2>Cloud Provider Management</h2>
        <AngryButton onClick={handleCreate} cssClass="e-primary" isPrimary={true}>
          Add Cloud Provider
        </AngryButton>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="providers-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Display Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  No cloud providers configured. Click "Add Cloud Provider" to create one.
                </td>
              </tr>
            ) : (
              providers.map((provider) => (
                <tr key={provider.id}>
                  <td>{provider.name}</td>
                  <td>{provider.displayName}</td>
                  <td>{provider.description || '-'}</td>
                  <td>
                    <span className={`status-badge ${provider.enabled ? 'enabled' : 'disabled'}`}>
                      {provider.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="actions">
                    <AngryButton
                      onClick={() => handleEdit(provider)}
                      cssClass="e-small"
                    >
                      Edit
                    </AngryButton>
                    <AngryButton
                      onClick={() => handleToggle(provider)}
                      cssClass={`e-small ${provider.enabled ? 'e-warning' : 'e-success'}`}
                    >
                      {provider.enabled ? 'Disable' : 'Enable'}
                    </AngryButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title={editingProvider ? 'Edit Cloud Provider' : 'Create Cloud Provider'}
        width="500px"
        showCloseIcon={true}
        buttons={[
          {
            label: 'Cancel',
            onClick: handleModalClose,
            variant: 'secondary',
            disabled: saving
          },
          {
            label: saving ? 'Saving...' : editingProvider ? 'Update' : 'Create',
            onClick: handleSave,
            variant: 'primary',
            disabled: saving
          }
        ]}
      >
        <div className="cloud-provider-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <AngryTextBox
              id="name"
              value={formData.name}
              onChange={(v) => setFormData({ ...formData, name: v })}
              placeholder="Name (e.g., AWS, Azure, GCP) *"
              disabled={!!editingProvider}
            />
            <small className="form-hint">Unique identifier for the cloud provider</small>
          </div>

          <div className="form-group">
            <AngryTextBox
              id="displayName"
              value={formData.displayName}
              onChange={(v) => setFormData({ ...formData, displayName: v })}
              placeholder="Display Name *"
            />
            <small className="form-hint">User-friendly name shown in the UI</small>
          </div>

          <div className="form-group">
            <AngryTextBox
              id="description"
              value={formData.description || ''}
              onChange={(v) => setFormData({ ...formData, description: v })}
              placeholder="Description"
              multiline={true}
            />
          </div>

          <div className="form-group">
            <AngryCheckBox
              label="Enable this cloud provider"
              checked={formData.enabled || false}
              onChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
            <small className="form-hint">Only enabled providers are available to users</small>
          </div>
        </div>
      </Modal>
    </div>
  );
};
