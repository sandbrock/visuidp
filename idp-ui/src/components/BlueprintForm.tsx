import { useState, useEffect, useRef } from 'react';
import type { Blueprint, BlueprintCreate, BlueprintResource } from '../services/api';
import { apiService } from '../services/api';
import type { User } from '../types/auth';
import type { CloudProvider, ResourceType, PropertySchema } from '../types/admin';
import { DynamicResourceForm } from './DynamicResourceForm';
import { AngryComboBox, AngryTextBox, AngryButton, AngryCheckBoxGroup } from './input';
import './BlueprintForm.css';

interface BlueprintFormProps {
  blueprint?: Blueprint;
  onSave: (blueprint: Blueprint) => void;
  onCancel: () => void;
  user: User;
}

export const BlueprintForm = ({ blueprint, onSave, onCancel, user }: BlueprintFormProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nameInputRef = useRef<any>(null);
  const [formData, setFormData] = useState<BlueprintCreate>({
    name: '',
    description: '',
    supportedCloudProviderIds: [],
    resources: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cloud providers and resource types
  const [cloudProviders, setCloudProviders] = useState<CloudProvider[]>([]);
  const [availableResourceTypes, setAvailableResourceTypes] = useState<ResourceType[]>([]);
  const [selectedCloudProviderIds, setSelectedCloudProviderIds] = useState<string[]>([]);
  const [selectedResources, setSelectedResources] = useState<Array<{
    resourceTypeId: string;
    name: string;
    cloudProviderId: string;
    configuration: Record<string, unknown>;
    schema: Record<string, PropertySchema>;
  }>>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Focus the name input when the form mounts
  useEffect(() => {
    const attempts = [50, 150, 300, 500];
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    
    attempts.forEach(delay => {
      const timer = setTimeout(() => {
        if (nameInputRef.current) {
          try {
            if (nameInputRef.current.focusIn) {
              nameInputRef.current.focusIn();
            } else {
              const input = nameInputRef.current.inputElement || 
                          nameInputRef.current.element || 
                          nameInputRef.current;
              
              if (input) {
                const actualInput = input.querySelector ? 
                                  input.querySelector('input') : 
                                  input;
                if (actualInput && actualInput.focus) {
                  actualInput.focus();
                }
              }
            }
          } catch (e) {
            console.log('Focus attempt failed:', e);
          }
        }
      }, delay);
      timers.push(timer);
    });
    
    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  // Load existing blueprint data
  useEffect(() => {
    if (blueprint) {
      setFormData({
        name: blueprint.name,
        description: blueprint.description || '',
        supportedCloudProviderIds: blueprint.supportedCloudProviderIds || [],
        resources: blueprint.resources || [],
      });
      setSelectedCloudProviderIds(blueprint.supportedCloudProviderIds || []);
      
      // Load resources if editing
      if (blueprint.resources && blueprint.resources.length > 0) {
        loadResourceSchemas(blueprint.resources);
      }
    }
  }, [blueprint]);

  // Load resource schemas for existing resources
  const loadResourceSchemas = async (resources: BlueprintResource[]) => {
    const resourcesWithSchemas = await Promise.all(
      resources.map(async (resource) => {
        try {
          const schema = await apiService.getResourceSchemaForBlueprint(
            resource.resourceTypeId,
            resource.cloudProviderId,
            user.email
          );
          return {
            resourceTypeId: resource.resourceTypeId,
            name: resource.name,
            cloudProviderId: resource.cloudProviderId,
            configuration: resource.configuration,
            schema,
          };
        } catch (err) {
          console.error('Failed to load schema for resource:', err);
          return {
            resourceTypeId: resource.resourceTypeId,
            name: resource.name,
            cloudProviderId: resource.cloudProviderId,
            configuration: resource.configuration,
            schema: {},
          };
        }
      })
    );
    setSelectedResources(resourcesWithSchemas);
  };

  // Load cloud providers and resource types on mount
  useEffect(() => {
    (async () => {
      try {
        const [providers, resourceTypes] = await Promise.all([
          apiService.getAvailableCloudProvidersForBlueprints(user.email),
          apiService.getAvailableResourceTypesForBlueprints(user.email),
        ]);
        setCloudProviders(providers);
        setAvailableResourceTypes(resourceTypes);
      } catch (e) {
        console.error('Failed to load cloud providers or resource types', e);
      }
    })();
  }, [user.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate at least one cloud provider is selected
    if (selectedCloudProviderIds.length === 0) {
      setError('Please select at least one cloud provider');
      setLoading(false);
      return;
    }

    try {
      let savedBlueprint: Blueprint;
      
      // Convert selected resources to the format expected by the API
      const resources: Omit<BlueprintResource, 'id'>[] = selectedResources.map(res => ({
        name: res.name,
        resourceTypeId: res.resourceTypeId,
        cloudProviderId: res.cloudProviderId,
        configuration: res.configuration,
      }));
      
      const payload: BlueprintCreate = {
        ...formData,
        supportedCloudProviderIds: selectedCloudProviderIds,
        resources,
      };
      
      if (blueprint) {
        savedBlueprint = await apiService.updateBlueprint(blueprint.id, payload, user.email);
      } else {
        savedBlueprint = await apiService.createBlueprint(payload, user.email);
      }
      onSave(savedBlueprint);
    } catch (err) {
      console.error('Failed to save blueprint:', err);
      setError(err instanceof Error ? err.message : 'Failed to save blueprint');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof BlueprintCreate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCloudProviderChange = (newSelection: string[]) => {
    setSelectedCloudProviderIds(prev => {
      // Remove resources that are not compatible with remaining cloud providers
      if (newSelection.length < prev.length) {
        setSelectedResources(current => 
          current.filter(res => newSelection.includes(res.cloudProviderId))
        );
      }
      
      return newSelection;
    });
  };

  const handleAddResource = async (resourceTypeId: string, cloudProviderId: string) => {
    if (!cloudProviderId) {
      setError('Please select a cloud provider for this resource');
      return;
    }

    setLoadingSchema(true);
    try {
      const schema = await apiService.getResourceSchemaForBlueprint(
        resourceTypeId,
        cloudProviderId,
        user.email
      );
      
      const resourceType = availableResourceTypes.find(rt => rt.id === resourceTypeId);
      const newResource = {
        resourceTypeId,
        name: resourceType?.displayName || 'New Resource',
        cloudProviderId,
        configuration: {},
        schema,
      };
      
      setSelectedResources(prev => [...prev, newResource]);
    } catch (err) {
      console.error('Failed to load resource schema:', err);
      setError('Failed to load resource configuration schema');
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleRemoveResource = (index: number) => {
    setSelectedResources(prev => prev.filter((_, i) => i !== index));
  };

  const handleResourceConfigChange = (index: number, configuration: Record<string, unknown>) => {
    setSelectedResources(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], configuration };
      return updated;
    });
  };

  const handleResourceNameChange = (index: number, name: string) => {
    setSelectedResources(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name };
      return updated;
    });
  };

  const handleResourceCloudProviderChange = async (index: number, cloudProviderId: string) => {
    const resource = selectedResources[index];
    
    setLoadingSchema(true);
    try {
      const schema = await apiService.getResourceSchemaForBlueprint(
        resource.resourceTypeId,
        cloudProviderId,
        user.email
      );
      
      setSelectedResources(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          cloudProviderId,
          configuration: {}, // Reset configuration when cloud provider changes
          schema,
        };
        return updated;
      });
    } catch (err) {
      console.error('Failed to load resource schema:', err);
      setError('Failed to load resource configuration schema');
    } finally {
      setLoadingSchema(false);
    }
  };

  return (
    <div className="blueprint-form-container">
      <div className="blueprint-form">
        <h2>{blueprint ? 'Edit Blueprint' : 'Create New Blueprint'}</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <AngryTextBox
              id="name"
              value={formData.name}
              onChange={(v) => handleChange('name', v)}
              placeholder="Blueprint Name *"
              componentRef={nameInputRef}
            />
          </div>

          <div className="form-group">
            <AngryTextBox
              id="description"
              value={formData.description || ''}
              onChange={(v) => handleChange('description', v)}
              placeholder="Description"
              multiline={true}
            />
          </div>

          {/* Cloud Provider Multi-Select */}
          <div className="form-group">
            <AngryCheckBoxGroup
              id="cloudProviders"
              label="Supported Cloud Providers *"
              items={cloudProviders.map(p => ({ value: p.id, label: p.displayName }))}
              selectedValues={selectedCloudProviderIds}
              onChange={handleCloudProviderChange}
              layout="vertical"
            />
            {selectedCloudProviderIds.length === 0 && (
              <small className="form-help-text">Select at least one cloud provider</small>
            )}
          </div>

          {/* Resources Section */}
          {selectedCloudProviderIds.length > 0 && (
            <div className="resources-section">
              <h3>Shared Infrastructure Resources</h3>
              
              {selectedResources.map((resource, index) => {
                const resourceType = availableResourceTypes.find(rt => rt.id === resource.resourceTypeId);
                return (
                  <div key={index} className="resource-item">
                    <div className="resource-header">
                      <div className="resource-header-row">
                        <AngryTextBox
                          id={`resource-name-${index}`}
                          value={resource.name}
                          onChange={(v) => handleResourceNameChange(index, v)}
                          placeholder="Resource Name *"
                        />
                        <button
                          type="button"
                          className="remove-resource-btn"
                          onClick={() => handleRemoveResource(index)}
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="resource-type-info">
                        <strong>Type:</strong> {resourceType?.displayName || 'Unknown'}
                      </div>
                      <div className="form-group">
                        <label htmlFor={`resource-cloud-${index}`}>Cloud Provider *</label>
                        <AngryComboBox
                          id={`resource-cloud-${index}`}
                          value={resource.cloudProviderId}
                          onChange={(val: string) => handleResourceCloudProviderChange(index, val)}
                          items={cloudProviders
                            .filter(cp => selectedCloudProviderIds.includes(cp.id))
                            .map(cp => ({ text: cp.displayName, value: cp.id }))}
                          placeholder="Select cloud provider"
                        />
                      </div>
                    </div>
                    
                    <div className="resource-config">
                      <DynamicResourceForm
                        schema={resource.schema}
                        values={resource.configuration}
                        onChange={(config) => handleResourceConfigChange(index, config)}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="add-resource-section">
                <label htmlFor="add-resource-type">Add Shared Resource</label>
                <div className="add-resource-controls">
                  <select
                    id="add-resource-type"
                    onChange={(e) => {
                      if (e.target.value) {
                        const [resourceTypeId, cloudProviderId] = e.target.value.split('|');
                        handleAddResource(resourceTypeId, cloudProviderId);
                        e.target.value = '';
                      }
                    }}
                    disabled={loading || loadingSchema}
                    className="add-resource-select"
                  >
                    <option value="">Select a resource type and cloud provider...</option>
                    {availableResourceTypes.map(rt => (
                      <optgroup key={rt.id} label={rt.displayName}>
                        {cloudProviders
                          .filter(cp => selectedCloudProviderIds.includes(cp.id))
                          .map(cp => (
                            <option key={`${rt.id}|${cp.id}`} value={`${rt.id}|${cp.id}`}>
                              {cp.displayName}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {loadingSchema && <small className="loading-text">Loading schema...</small>}
              </div>
            </div>
          )}

          <div className="form-actions">
            <AngryButton
              onClick={onCancel}
              disabled={loading}
              cssClass="e-outline"
            >
              Cancel
            </AngryButton>
            <AngryButton
              type="submit"
              disabled={loading}
              cssClass="e-primary"
              isPrimary={true}
            >
              {loading ? 'Saving...' : (blueprint ? 'Update Blueprint' : 'Create Blueprint')}
            </AngryButton>
          </div>
        </form>
      </div>
    </div>
  );
};
