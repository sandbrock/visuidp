import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { 
  CloudProvider, 
  ResourceType, 
  ResourceTypeCloudMapping, 
  ResourceTypeCloudMappingCreate,
  ModuleLocationType 
} from '../types/admin';
import type { User } from '../types/auth';
import { AngryTextBox, AngryComboBox, AngryCheckBox } from './input';
import { Modal } from './Modal';
import type { ModalButton } from './Modal';
import { Breadcrumb } from './Breadcrumb';
import { FormField } from './common';
import { ErrorMessage } from './common';
import { MetadataDisplay } from './common';
import './ResourceTypeMappingManagement.css';

interface ResourceTypeMappingManagementProps {
  user: User;
}

interface GridCell {
  resourceTypeId: string;
  cloudProviderId: string;
  mapping?: ResourceTypeCloudMapping;
}

const MODULE_LOCATION_TYPES: { value: ModuleLocationType; text: string }[] = [
  { value: 'GIT', text: 'Git Repository' },
  { value: 'FILE_SYSTEM', text: 'File System' },
  { value: 'REGISTRY', text: 'Terraform Registry' },
];

export const ResourceTypeMappingManagement = ({ user }: ResourceTypeMappingManagementProps) => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<CloudProvider[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [mappings, setMappings] = useState<ResourceTypeCloudMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [formData, setFormData] = useState<ResourceTypeCloudMappingCreate>({
    resourceTypeId: '',
    cloudProviderId: '',
    terraformModuleLocation: '',
    moduleLocationType: 'GIT',
    enabled: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [providersData, resourceTypesData, mappingsData] = await Promise.all([
        apiService.getCloudProviders(user.email),
        apiService.getResourceTypes(user.email),
        apiService.getResourceTypeCloudMappings(user.email),
      ]);
      setProviders(providersData);
      setResourceTypes(resourceTypesData);
      setMappings(mappingsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getMappingForCell = (resourceTypeId: string, cloudProviderId: string): ResourceTypeCloudMapping | undefined => {
    return mappings.find(
      (m) => m.resourceTypeId === resourceTypeId && m.cloudProviderId === cloudProviderId
    );
  };

  const getCellStatus = (mapping?: ResourceTypeCloudMapping): 'complete' | 'incomplete' | 'not-configured' => {
    if (!mapping) return 'not-configured';
    if (mapping.isComplete && mapping.enabled) return 'complete';
    return 'incomplete';
  };

  const getCellStatusText = (mapping?: ResourceTypeCloudMapping): string => {
    if (!mapping) return 'Not Configured';
    if (mapping.isComplete && mapping.enabled) return 'Complete';
    if (!mapping.isComplete) return 'Incomplete';
    if (!mapping.enabled) return 'Disabled';
    return 'Unknown';
  };

  const handleCellClick = (resourceTypeId: string, cloudProviderId: string) => {
    const mapping = getMappingForCell(resourceTypeId, cloudProviderId);
    
    // Only open modal for inline editing of mapping details (Terraform location)
    setSelectedCell({ resourceTypeId, cloudProviderId, mapping });
    
    if (mapping) {
      setFormData({
        resourceTypeId: mapping.resourceTypeId,
        cloudProviderId: mapping.cloudProviderId,
        terraformModuleLocation: mapping.terraformModuleLocation,
        moduleLocationType: mapping.moduleLocationType,
        enabled: mapping.enabled,
      });
    } else {
      setFormData({
        resourceTypeId,
        cloudProviderId,
        terraformModuleLocation: '',
        moduleLocationType: 'GIT',
        enabled: false,
      });
    }
    
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!formData.terraformModuleLocation.trim()) {
        setError('Terraform module location is required');
        return;
      }

      if (selectedCell?.mapping) {
        // Update existing mapping
        await apiService.updateResourceTypeCloudMapping(
          selectedCell.mapping.id,
          {
            terraformModuleLocation: formData.terraformModuleLocation,
            moduleLocationType: formData.moduleLocationType,
            enabled: formData.enabled,
          },
          user.email
        );
      } else {
        // Create new mapping
        await apiService.createResourceTypeCloudMapping(formData, user.email);
      }

      setShowModal(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save mapping:', err);
      setError(err instanceof Error ? err.message : 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (mapping: ResourceTypeCloudMapping) => {
    try {
      setError(null);
      await apiService.toggleResourceTypeCloudMapping(mapping.id, !mapping.enabled, user.email);
      await loadData();
    } catch (err) {
      console.error('Failed to toggle mapping:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle mapping');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedCell(null);
    setError(null);
  };

  const handleConfigureProperties = (mapping: ResourceTypeCloudMapping) => {
    // Navigate directly to the PropertySchemaEditor page with the mapping ID
    navigate(`/admin/property-schemas/${mapping.id}`, {
      state: {
        from: '/admin/resource-type-mappings',
        resourceTypeName: mapping.resourceTypeName,
        cloudProviderName: mapping.cloudProviderName,
      },
    });
  };

  const breadcrumbItems = [
    { label: 'Admin Dashboard', path: '/admin' },
    { label: 'Resource Type Mapping Management' }
  ];

  if (loading) {
    return <div className="resource-type-mapping-management loading">Loading mappings...</div>;
  }

  return (
    <div className="resource-type-mapping-management">
      <Breadcrumb items={breadcrumbItems} />
      <div className="header">
        <h2>Resource Type Cloud Mappings</h2>
        <div className="legend">
          <div className="legend-item">
            <span className="legend-color complete"></span>
            <span>Complete & Enabled</span>
          </div>
          <div className="legend-item">
            <span className="legend-color incomplete"></span>
            <span>Incomplete or Disabled</span>
          </div>
          <div className="legend-item">
            <span className="legend-color not-configured"></span>
            <span>Not Configured</span>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="mapping-grid-container">
        <table className="mapping-grid">
          <thead>
            <tr>
              <th className="resource-type-header">Resource Type</th>
              {providers.map((provider) => (
                <th key={provider.id} className="cloud-provider-header">
                  {provider.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resourceTypes.length === 0 || providers.length === 0 ? (
              <tr>
                <td colSpan={providers.length + 1} className="empty-state">
                  {resourceTypes.length === 0 && providers.length === 0
                    ? 'No resource types or cloud providers configured. Please create them first.'
                    : resourceTypes.length === 0
                    ? 'No resource types configured. Please create resource types first.'
                    : 'No cloud providers configured. Please create cloud providers first.'}
                </td>
              </tr>
            ) : (
              resourceTypes.map((resourceType) => (
                <tr key={resourceType.id}>
                  <td className="resource-type-cell">
                    <div className="resource-type-name">{resourceType.displayName}</div>
                    <div className="resource-type-category">{resourceType.category}</div>
                  </td>
                  {providers.map((provider) => {
                    const mapping = getMappingForCell(resourceType.id, provider.id);
                    const status = getCellStatus(mapping);
                    return (
                      <td
                        key={`${resourceType.id}-${provider.id}`}
                        className={`mapping-cell ${status}`}
                      >
                        <div className="cell-content">
                          <div 
                            className="cell-status-area"
                            onClick={() => handleCellClick(resourceType.id, provider.id)}
                          >
                            <div className="cell-status">{getCellStatusText(mapping)}</div>
                            {mapping && (
                              <div className="cell-details">
                                <div className="cell-location-type">{mapping.moduleLocationType}</div>
                              </div>
                            )}
                          </div>
                          {mapping && (
                            <div className="cell-actions">
                              <button
                                className="configure-properties-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfigureProperties(mapping);
                                }}
                                title="Configure Properties"
                              >
                                Configure Properties
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title={
          selectedCell?.mapping
            ? `Edit Mapping: ${resourceTypes.find((rt) => rt.id === selectedCell.resourceTypeId)?.displayName} - ${providers.find((p) => p.id === selectedCell.cloudProviderId)?.displayName}`
            : `Create Mapping: ${resourceTypes.find((rt) => rt.id === selectedCell?.resourceTypeId)?.displayName} - ${providers.find((p) => p.id === selectedCell?.cloudProviderId)?.displayName}`
        }
        width="600px"
        showCloseIcon={true}
        buttons={[
          {
            label: 'Cancel',
            onClick: handleModalClose,
            variant: 'secondary',
            disabled: saving
          },
          ...(selectedCell?.mapping ? [
            {
              label: selectedCell.mapping.enabled ? 'Disable' : 'Enable',
              onClick: () => handleToggle(selectedCell.mapping!),
              variant: selectedCell.mapping.enabled ? 'warning' : 'success',
              disabled: saving
            } as ModalButton
          ] : []),
          {
            label: selectedCell?.mapping ? 'Update' : 'Create',
            onClick: handleSave,
            variant: 'primary',
            disabled: saving
          }
        ]}
      >
        <div className="mapping-form">
          {error && <ErrorMessage message={error} />}

          <FormField label="Resource Type">
            <AngryTextBox
              id="resourceType"
              value={resourceTypes.find((rt) => rt.id === formData.resourceTypeId)?.displayName || ''}
              onChange={() => {}}
              placeholder="Resource Type"
              disabled={true}
              multiline={false}
            />
          </FormField>

          <FormField label="Cloud Provider">
            <AngryTextBox
              id="cloudProvider"
              value={providers.find((p) => p.id === formData.cloudProviderId)?.displayName || ''}
              onChange={() => {}}
              placeholder="Cloud Provider"
              disabled={true}
              multiline={false}
            />
          </FormField>

          <FormField
            label="Module Location Type"
            hint={formData.moduleLocationType === 'GIT' ? 'Git repository URL (e.g., https://github.com/org/repo.git)' :
                 formData.moduleLocationType === 'FILE_SYSTEM' ? 'Local file system path (e.g., ./modules/resource)' :
                 'Terraform registry reference (e.g., hashicorp/aws/vpc)'}
            required
          >
            <AngryComboBox
              id="moduleLocationType"
              items={MODULE_LOCATION_TYPES}
              value={formData.moduleLocationType}
              onChange={(value) => setFormData({ ...formData, moduleLocationType: value as ModuleLocationType })}
              placeholder="Select location type"
            />
          </FormField>

          <FormField
            label="Terraform Module Location"
            hint="The location where the Terraform module for this resource type and cloud provider can be found"
            required
          >
            <AngryTextBox
              id="terraformModuleLocation"
              value={formData.terraformModuleLocation}
              onChange={(v) => setFormData({ ...formData, terraformModuleLocation: v })}
              placeholder="Enter module location"
              multiline={false}
            />
          </FormField>

          <FormField
            label="Enable this mapping"
            hint="Only enabled mappings are available to users. Note: Mappings must be complete (have properties defined) to be enabled."
          >
            <AngryCheckBox
              id="enabled"
              checked={formData.enabled}
              onChange={(checked) => setFormData({ ...formData, enabled: checked })}
              label="Enable this mapping"
            />
          </FormField>

          {selectedCell?.mapping && (
            <MetadataDisplay
              items={[
                {
                  label: 'Status',
                  value: (
                    <span className={`status-badge ${getCellStatus(selectedCell.mapping)}`}>
                      {getCellStatusText(selectedCell.mapping)}
                    </span>
                  )
                },
                {
                  label: 'Created',
                  value: new Date(selectedCell.mapping.createdAt).toLocaleString()
                },
                {
                  label: 'Updated',
                  value: new Date(selectedCell.mapping.updatedAt).toLocaleString()
                }
              ]}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};
