import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { CloudProvider, CloudProviderCreate } from '../types/admin';
import type { User } from '../types/auth';
import { AngryButton, AngryTextBox, AngryCheckBox } from './input';
import { Modal } from './Modal';
import { Breadcrumb } from './Breadcrumb';
import { FormField } from './common';
import { ErrorMessage } from './common';
import { LoadingButton } from './common';
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

  const loadProviders = useCallback(async () => {
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
  }, [user.email]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

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
        <AngryButton onClick={handleCreate} isPrimary={true}>
          Add Cloud Provider
        </AngryButton>
      </div>

      {error && <ErrorMessage message={error} />}

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
                      size="small"
                    >
                      Edit
                    </AngryButton>
                    <LoadingButton
                      onClick={() => handleToggle(provider)}
                      size="small"
                      variant={provider.enabled ? 'warning' : 'success'}
                      isLoading={false}
                    >
                      {provider.enabled ? 'Disable' : 'Enable'}
                    </LoadingButton>
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
            label: editingProvider ? 'Update' : 'Create',
            onClick: handleSave,
            variant: 'primary',
            disabled: saving
          }
        ]}
      >
        <div className="cloud-provider-form">
          {error && <ErrorMessage message={error} />}

          <FormField
            label="Name"
            hint="Unique identifier for the cloud provider"
            required
          >
            <AngryTextBox
              id="name"
              value={formData.name}
              onChange={(v) => setFormData({ ...formData, name: v })}
              placeholder="Name (e.g., AWS, Azure, GCP) *"
              disabled={!!editingProvider}
            />
          </FormField>

          <FormField
            label="Display Name"
            hint="User-friendly name shown in the UI"
            required
          >
            <AngryTextBox
              id="displayName"
              value={formData.displayName}
              onChange={(v) => setFormData({ ...formData, displayName: v })}
              placeholder="Display Name *"
            />
          </FormField>

          <FormField
            label="Description"
          >
            <AngryTextBox
              id="description"
              value={formData.description || ''}
              onChange={(v) => setFormData({ ...formData, description: v })}
              placeholder="Description"
              multiline={true}
            />
          </FormField>

          <FormField
            label="Enable this cloud provider"
            hint="Only enabled providers are available to users"
          >
            <AngryCheckBox
              label="Enable this cloud provider"
              checked={formData.enabled || false}
              onChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};
