import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { ResourceType, ResourceTypeCreate, ResourceCategory } from '../types/admin';
import type { User } from '../types/auth';
import { AngryButton, AngryTextBox, AngryCheckBox, AngryComboBox } from './input';
import { Modal } from './Modal';
import { Breadcrumb } from './Breadcrumb';
import './ResourceTypeManagement.css';

interface ResourceTypeManagementProps {
  user: User;
}

const CATEGORY_OPTIONS = [
  { value: 'SHARED', text: 'Shared (Blueprint only)' },
  { value: 'NON_SHARED', text: 'Non-Shared (Stack only)' },
  { value: 'BOTH', text: 'Both (Blueprint and Stack)' },
];

export const ResourceTypeManagement = ({ user }: ResourceTypeManagementProps) => {
  const breadcrumbItems = [
    { label: 'Admin Dashboard', path: '/admin' },
    { label: 'Resource Type Management' }
  ];

  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [filteredResourceTypes, setFilteredResourceTypes] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingResourceType, setEditingResourceType] = useState<ResourceType | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | 'ALL'>('ALL');
  const [formData, setFormData] = useState<ResourceTypeCreate>({
    name: '',
    displayName: '',
    description: '',
    category: 'NON_SHARED',
    enabled: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadResourceTypes();
  }, []);

  useEffect(() => {
    filterResourceTypes();
  }, [resourceTypes, categoryFilter]);

  const loadResourceTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getResourceTypes(user.email);
      setResourceTypes(data);
    } catch (err) {
      console.error('Failed to load resource types:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resource types');
    } finally {
      setLoading(false);
    }
  };

  const filterResourceTypes = () => {
    if (categoryFilter === 'ALL') {
      setFilteredResourceTypes(resourceTypes);
    } else {
      setFilteredResourceTypes(resourceTypes.filter(rt => rt.category === categoryFilter));
    }
  };

  const handleCreate = () => {
    setEditingResourceType(null);
    setFormData({
      name: '',
      displayName: '',
      description: '',
      category: 'NON_SHARED',
      enabled: false,
    });
    setShowModal(true);
  };

  const handleEdit = (resourceType: ResourceType) => {
    setEditingResourceType(resourceType);
    setFormData({
      name: resourceType.name,
      displayName: resourceType.displayName,
      description: resourceType.description || '',
      category: resourceType.category,
      enabled: resourceType.enabled,
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

      if (!formData.category) {
        setError('Category is required');
        return;
      }

      if (editingResourceType) {
        await apiService.updateResourceType(editingResourceType.id, formData, user.email);
      } else {
        await apiService.createResourceType(formData, user.email);
      }

      setShowModal(false);
      await loadResourceTypes();
    } catch (err) {
      console.error('Failed to save resource type:', err);
      setError(err instanceof Error ? err.message : 'Failed to save resource type');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (resourceType: ResourceType) => {
    try {
      setError(null);
      await apiService.toggleResourceType(resourceType.id, !resourceType.enabled, user.email);
      await loadResourceTypes();
    } catch (err) {
      console.error('Failed to toggle resource type:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle resource type');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setError(null);
  };

  const getCategoryBadgeClass = (category: ResourceCategory): string => {
    switch (category) {
      case 'SHARED':
        return 'category-shared';
      case 'NON_SHARED':
        return 'category-non-shared';
      case 'BOTH':
        return 'category-both';
      default:
        return '';
    }
  };

  const getCategoryDisplayName = (category: ResourceCategory): string => {
    const option = CATEGORY_OPTIONS.find(opt => opt.value === category);
    return option ? option.text : category;
  };

  if (loading) {
    return <div className="resource-type-management loading">Loading resource types...</div>;
  }

  return (
    <div className="resource-type-management">
      <Breadcrumb items={breadcrumbItems} />
      <div className="header">
        <h2>Resource Type Management</h2>
        <AngryButton onClick={handleCreate} cssClass="e-primary" isPrimary={true}>
          Add Resource Type
        </AngryButton>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filter-bar">
        <label htmlFor="category-filter">Filter by Category:</label>
        <select
          id="category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ResourceCategory | 'ALL')}
          className="category-filter"
        >
          <option value="ALL">All Categories</option>
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.text}</option>
          ))}
        </select>
      </div>

      <div className="resource-types-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Display Name</th>
              <th>Description</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResourceTypes.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  {categoryFilter === 'ALL'
                    ? 'No resource types configured. Click "Add Resource Type" to create one.'
                    : `No resource types found for category "${getCategoryDisplayName(categoryFilter as ResourceCategory)}".`}
                </td>
              </tr>
            ) : (
              filteredResourceTypes.map((resourceType) => (
                <tr key={resourceType.id}>
                  <td>{resourceType.name}</td>
                  <td>{resourceType.displayName}</td>
                  <td>{resourceType.description || '-'}</td>
                  <td>
                    <span className={`category-badge ${getCategoryBadgeClass(resourceType.category)}`}>
                      {getCategoryDisplayName(resourceType.category)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${resourceType.enabled ? 'enabled' : 'disabled'}`}>
                      {resourceType.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="actions">
                    <AngryButton
                      onClick={() => handleEdit(resourceType)}
                      cssClass="e-small"
                    >
                      Edit
                    </AngryButton>
                    <AngryButton
                      onClick={() => handleToggle(resourceType)}
                      cssClass={`e-small ${resourceType.enabled ? 'e-warning' : 'e-success'}`}
                    >
                      {resourceType.enabled ? 'Disable' : 'Enable'}
                    </AngryButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        width="500px"
        isOpen={showModal}
        onClose={handleModalClose}
        title={editingResourceType ? 'Edit Resource Type' : 'Create Resource Type'}
        showCloseIcon={true}
        buttons={[
          {
            label: 'Cancel',
            onClick: handleModalClose,
            variant: 'secondary',
            disabled: saving
          },
          {
            label: saving ? 'Saving...' : editingResourceType ? 'Update' : 'Create',
            onClick: handleSave,
            variant: 'primary',
            disabled: saving
          }
        ]}
      >
        <div className="resource-type-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <AngryTextBox
              id="name"
              value={formData.name}
              onChange={(v) => setFormData({ ...formData, name: v })}
              placeholder="Name (e.g., RELATIONAL_DATABASE) *"
              disabled={!!editingResourceType}
            />
            <small className="form-hint">Unique identifier for the resource type (uppercase with underscores)</small>
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
            <label htmlFor="category">Category *</label>
            <AngryComboBox
              id="category"
              items={CATEGORY_OPTIONS}
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value as ResourceCategory })}
              placeholder="Select category"
            />
            <small className="form-hint">
              Shared: Only for blueprints (e.g., ECS Cluster)<br />
              Non-Shared: Only for stacks (e.g., RDS Database)<br />
              Both: Can be used in either context
            </small>
          </div>

          <div className="form-group">
            <AngryCheckBox
              label="Enable this resource type"
              checked={formData.enabled || false}
              onChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
            <small className="form-hint">Only enabled resource types are available to users</small>
          </div>
        </div>
      </Modal>
    </div>
  );
};
