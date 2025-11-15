import { useState, useEffect, useRef } from 'react';
import type { Blueprint, BlueprintCreate, BlueprintResource } from '../services/api';
import { apiService } from '../services/api';
import type { User } from '../types/auth';
import type { CloudProvider, ResourceType } from '../types/admin';
import { DynamicResourceForm } from './DynamicResourceForm';
import { AngryComboBox, AngryTextBox, AngryButton, AngryCheckBoxGroup } from './input';
import { FormField } from './common/FormField/FormField';
import { ErrorMessage } from './common/Feedback/ErrorMessage';
import { LoadingButton } from './common/LoadingButton/LoadingButton';
import { InfoBox } from './common/Feedback/InfoBox';
import { ConfirmationDialog } from './common/ConfirmationDialog/ConfirmationDialog';
import CloudProviderLookupService from '../services/CloudProviderLookupService';
import type { FocusableInputHandle } from '../types/focus';
import './BlueprintForm.css';

interface BlueprintFormProps {
  blueprint?: Blueprint;
  onSave: (blueprint: Blueprint) => void;
  onCancel: () => void;
  user: User;
}

export const BlueprintForm = ({ blueprint, onSave, onCancel, user }: BlueprintFormProps) => {
  const nameInputRef = useRef<FocusableInputHandle>(null);
  
  /**
   * CloudProviderLookupService Reference
   * 
   * Purpose: Provides bidirectional mapping between cloud type strings and cloud provider UUIDs
   * 
   * Usage Pattern:
   * 1. Service is initialized when cloud providers are loaded from the API
   * 2. Used by API service to transform backend DTOs (cloudType string → UUID)
   * 3. Used when saving to transform UUIDs back to cloud type strings for backend
   * 
   * Key Methods:
   * - initialize(providers): Loads cloud provider data and builds internal mappings
   * - resolveCloudProviderId(cloudType): Converts "AWS" → "uuid-123"
   * - resolveCloudType(uuid): Converts "uuid-123" → "AWS"
   * - getCloudProviderById(uuid): Retrieves full cloud provider object
   * 
   * Singleton Pattern: getInstance() ensures single instance across the application
   */
  const cloudProviderLookupRef = useRef<CloudProviderLookupService>(CloudProviderLookupService.getInstance());
  
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
  const [cloudProvidersLoaded, setCloudProvidersLoaded] = useState(false);
  const [cloudProvidersLoadError, setCloudProvidersLoadError] = useState<string | null>(null);
  const [selectedCloudProviderIds, setSelectedCloudProviderIds] = useState<string[]>([]);
  
  /**
   * State for selected resources in the blueprint
   * 
   * Interface:
   * - resourceTypeId: UUID of the resource type
   * - name: Display name of the resource
   * - cloudProviderId: UUID of the cloud provider (resolved from cloud type string)
   * - configuration: Cloud-specific configuration object
   * 
   * Data Flow:
   * 1. Backend returns resources with cloudType string (e.g., "AWS")
   * 2. API service transforms using CloudProviderLookupService to resolve UUID
   * 3. This state stores the resolved UUID in cloudProviderId field
   * 4. DynamicResourceForm receives the UUID and uses it to fetch property schemas
   * 5. Property schema API endpoint expects UUID: /blueprints/resource-schema/{typeId}/{UUID}
   * 
   * Note: cloudProviderId stores the UUID, not the cloud type string. This ensures
   * the correct cloud provider is used when fetching property schemas.
   */
  const [selectedResources, setSelectedResources] = useState<Array<{
    resourceTypeId: string;
    name: string;
    cloudProviderId: string; // UUID of cloud provider (resolved from backend cloudType)
    configuration: Record<string, unknown>;
  }>>([]);
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCloudProviderChange, setPendingCloudProviderChange] = useState<string[] | null>(null);
  const [affectedResources, setAffectedResources] = useState<Array<{
    name: string;
    cloudProviderName: string;
  }>>([]);

  // Focus the name input when the form mounts
  useEffect(() => {
    const attempts = [50, 150, 300, 500];
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    
    attempts.forEach(delay => {
      const timer = setTimeout(() => {
        if (nameInputRef.current && nameInputRef.current.focus) {
          try {
            nameInputRef.current.focus();
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

  /**
   * Load resource schemas for existing resources
   * 
   * Note: Resources received here have already been transformed by the API service's
   * getBlueprints() method, which uses CloudProviderLookupService to resolve cloud type
   * strings to UUIDs. Therefore, resource.cloudProviderId contains the resolved UUID.
   * 
   * @param resources - Array of BlueprintResource objects with resolved cloudProviderId (UUID)
   */
  const loadResourceSchemas = async (resources: BlueprintResource[]) => {
    // Map resources to the state format, preserving the resolved UUID in cloudProviderId
    const resourcesWithResolvedIds = resources.map((resource) => ({
      resourceTypeId: resource.resourceTypeId,
      name: resource.name,
      cloudProviderId: resource.cloudProviderId, // Already contains UUID from transformation
      configuration: resource.configuration,
    }));
    setSelectedResources(resourcesWithResolvedIds);
  };

  /**
   * Load cloud providers and resource types on component mount
   * 
   * Critical Initialization Step:
   * This effect initializes the CloudProviderLookupService with cloud provider data,
   * which is essential for the cloud type → UUID resolution process.
   * 
   * Initialization Flow:
   * 1. Fetch cloud providers and resource types from API
   * 2. Store providers in component state for UI rendering
   * 3. Initialize CloudProviderLookupService with provider data
   * 4. Service builds internal mapping: { "aws" → "uuid-123", "azure" → "uuid-456", ... }
   * 5. Set cloudProvidersLoaded flag to enable resource editing
   * 
   * Error Handling:
   * - If loading fails, cloudProvidersLoadError is set
   * - Resource editing is disabled until providers are successfully loaded
   * - User can retry loading via the retry button
   * 
   * Dependencies:
   * - user.email: Required for API authentication
   */
  useEffect(() => {
    (async () => {
      try {
        setCloudProvidersLoadError(null);
        const [providers, resourceTypes] = await Promise.all([
          apiService.getAvailableCloudProvidersForBlueprints(user.email),
          apiService.getAvailableResourceTypesForBlueprints(user.email),
        ]);
        setCloudProviders(providers);
        setAvailableResourceTypes(resourceTypes);
        
        // Initialize CloudProviderLookupService with loaded providers
        // This builds the internal mapping used for cloud type ↔ UUID resolution
        cloudProviderLookupRef.current.initialize(providers);
        
        setCloudProvidersLoaded(true);
      } catch (e) {
        console.error('Failed to load cloud providers or resource types', e);
        const errorMessage = e instanceof Error ? e.message : 'Failed to load cloud providers';
        setCloudProvidersLoadError(errorMessage);
        setCloudProvidersLoaded(false);
      }
    })();
  }, [user.email]);

  /**
   * Retry loading cloud providers after a failure
   * 
   * This handler allows users to retry loading cloud providers if the initial
   * load fails. It performs the same initialization as the useEffect, including
   * reinitializing the CloudProviderLookupService.
   */
  const handleRetryLoadCloudProviders = async () => {
    try {
      setCloudProvidersLoadError(null);
      setLoading(true);
      const [providers, resourceTypes] = await Promise.all([
        apiService.getAvailableCloudProvidersForBlueprints(user.email),
        apiService.getAvailableResourceTypesForBlueprints(user.email),
      ]);
      setCloudProviders(providers);
      setAvailableResourceTypes(resourceTypes);
      
      // Reinitialize CloudProviderLookupService with loaded providers
      cloudProviderLookupRef.current.initialize(providers);
      
      setCloudProvidersLoaded(true);
    } catch (e) {
      console.error('Failed to load cloud providers or resource types', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to load cloud providers';
      setCloudProvidersLoadError(errorMessage);
      setCloudProvidersLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form submission - save blueprint to backend
   * 
   * Transformation Logic:
   * The API service handles the transformation of cloud provider UUIDs back to cloud type
   * strings when sending data to the backend. This maintains backward compatibility with
   * the backend API contract.
   * 
   * Data Flow:
   * 1. selectedResources contains cloudProviderId as UUID (e.g., "uuid-123")
   * 2. Resources are mapped to BlueprintResource format with UUID preserved
   * 3. API service's createBlueprint/updateBlueprint methods handle transformation
   * 4. transformBlueprintResourceToBackend() converts UUID → cloud type string
   * 5. Backend receives cloudType string (e.g., "AWS") as expected
   * 
   * Note: The transformation happens in the API service layer, not here. This component
   * works exclusively with UUIDs for cloud provider identification.
   */
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
      // Note: cloudProviderId contains UUID, API service will transform to cloud type string
      const resources: Omit<BlueprintResource, 'id'>[] = selectedResources.map(res => ({
        name: res.name,
        resourceTypeId: res.resourceTypeId,
        cloudProviderId: res.cloudProviderId, // UUID - will be transformed by API service
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
    // Check if we're removing providers
    if (newSelection.length < selectedCloudProviderIds.length) {
      const removedProviders = selectedCloudProviderIds.filter(id => !newSelection.includes(id));
      const resourcesAffected = selectedResources.filter(res => 
        removedProviders.includes(res.cloudProviderId)
      );
      
      // If there are affected resources, show confirmation dialog
      if (resourcesAffected.length > 0) {
        const affectedResourcesList = resourcesAffected.map(res => ({
          name: res.name,
          cloudProviderName: cloudProviders.find(cp => cp.id === res.cloudProviderId)?.displayName || 'Unknown'
        }));
        
        setAffectedResources(affectedResourcesList);
        setPendingCloudProviderChange(newSelection);
        setShowConfirmDialog(true);
        return; // Don't apply the change yet
      }
    }
    
    // No affected resources or adding providers, apply change immediately
    setSelectedCloudProviderIds(newSelection);
  };
  
  const handleConfirmCloudProviderChange = () => {
    if (pendingCloudProviderChange) {
      // Apply the pending change and remove incompatible resources
      setSelectedCloudProviderIds(pendingCloudProviderChange);
      setSelectedResources(current => 
        current.filter(res => pendingCloudProviderChange.includes(res.cloudProviderId))
      );
    }
    
    // Reset dialog state
    setShowConfirmDialog(false);
    setPendingCloudProviderChange(null);
    setAffectedResources([]);
  };
  
  const handleCancelCloudProviderChange = () => {
    // Cancel the change, keep existing selection
    setShowConfirmDialog(false);
    setPendingCloudProviderChange(null);
    setAffectedResources([]);
  };

  const handleAddResource = async (resourceTypeId: string, cloudProviderId: string) => {
    if (!cloudProviderId) {
      setError('Please select a cloud provider for this resource');
      return;
    }

    const resourceType = availableResourceTypes.find(rt => rt.id === resourceTypeId);
    const newResource = {
      resourceTypeId,
      name: resourceType?.displayName || 'New Resource',
      cloudProviderId,
      configuration: {},
    };
    
    setSelectedResources(prev => [...prev, newResource]);
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

  /**
   * Handle cloud provider change for a specific resource
   * 
   * State Management:
   * When a user changes the cloud provider for a resource, we need to:
   * 1. Update the cloudProviderId field with the new UUID
   * 2. Reset the configuration object (cloud-specific properties are different)
   * 3. Trigger DynamicResourceForm to fetch new property schema
   * 
   * Data Flow:
   * 1. User selects new cloud provider from dropdown
   * 2. cloudProviderId is updated with the new UUID
   * 3. Configuration is reset to empty object
   * 4. DynamicResourceForm receives new cloudProviderId via props
   * 5. DynamicResourceForm fetches property schema using the UUID
   * 6. Property schema API: /blueprints/resource-schema/{resourceTypeId}/{UUID}
   * 
   * Note: The UUID is used directly for the API call, no transformation needed here.
   */
  const handleResourceCloudProviderChange = async (index: number, cloudProviderId: string) => {
    setSelectedResources(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        cloudProviderId, // Store UUID for property schema fetching
        configuration: {}, // Reset configuration when cloud provider changes
      };
      return updated;
    });
  };

  return (
    <div className="blueprint-form-container">
      <div className="blueprint-form">
        <h2>{blueprint ? 'Edit Blueprint' : 'Create New Blueprint'}</h2>
        
        {error && (
          <ErrorMessage message={error} />
        )}

        {cloudProvidersLoadError && (
          <ErrorMessage message={
            <>
              <strong>Error loading cloud providers:</strong> {cloudProvidersLoadError}
              <div style={{ marginTop: '10px' }}>
                <AngryButton
                  onClick={handleRetryLoadCloudProviders}
                  disabled={loading}
                  style="outline"
                >
                  {loading ? 'Retrying...' : 'Retry'}
                </AngryButton>
              </div>
            </>
          } />
        )}

        <form onSubmit={handleSubmit}>
          <FormField 
            label="Blueprint Name" 
            required
            htmlFor="name"
          >
            <AngryTextBox
              id="name"
              value={formData.name}
              onChange={(v) => handleChange('name', v)}
              componentRef={nameInputRef}
              placeholder="Blueprint Name"
            />
          </FormField>

          <FormField 
            label="Description" 
            htmlFor="description"
          >
            <AngryTextBox
              id="description"
              value={formData.description || ''}
              onChange={(v) => handleChange('description', v)}
              multiline={true}
              placeholder="Description"
            />
          </FormField>

          {/* Cloud Provider Multi-Select */}
          <FormField 
            label="Supported Cloud Providers" 
            required
            hint="Select at least one cloud provider"
          >
            <AngryCheckBoxGroup
              id="cloudProviders"
              items={cloudProviders.map(p => ({ value: p.id, label: p.displayName }))}
              selectedValues={selectedCloudProviderIds}
              onChange={handleCloudProviderChange}
              layout="vertical"
              disabled={!cloudProvidersLoaded || !!cloudProvidersLoadError}
            />
          </FormField>

          {/* Resources Section */}
          <div className="resources-section">
            <h3>Shared Infrastructure Resources</h3>
            
            {cloudProvidersLoadError ? (
              <InfoBox>
                <p>Cloud providers must be loaded before you can add resources. Please retry loading cloud providers above.</p>
              </InfoBox>
            ) : selectedCloudProviderIds.length === 0 ? (
              <InfoBox>
                <p>Please select at least one cloud provider above before adding resources.</p>
              </InfoBox>
            ) : (
              <>
                {cloudProvidersLoaded && selectedCloudProviderIds.length > 0 && selectedResources.length > 0 && (
                  <div className="resources-list">
                    {selectedResources.map((resource, index) => {
                const resourceType = availableResourceTypes.find(rt => rt.id === resource.resourceTypeId);
                return (
                  <div key={index} className="resource-item">
                    <div className="resource-header">
                      <div className="resource-header-row">
                        <FormField 
                          label="Display Name" 
                          required
                          htmlFor={`resource-name-${index}`}
                        >
                          <AngryTextBox
                            id={`resource-name-${index}`}
                            value={resource.name}
                            onChange={(v) => handleResourceNameChange(index, v)}
                            placeholder="Display Name"
                          />
                        </FormField>
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
                      <div className="resource-cloud-provider-badge">
                        <span className="cloud-provider-badge">
                          {cloudProviders.find(cp => cp.id === resource.cloudProviderId)?.displayName || 'Unknown Provider'}
                        </span>
                      </div>
                      <FormField 
                        label="Cloud Provider" 
                        required
                        htmlFor={`resource-cloud-${index}`}
                      >
                        <AngryComboBox
                          key={`resource-cloud-${index}-${selectedCloudProviderIds.join(',')}`}
                          id={`resource-cloud-${index}`}
                          value={resource.cloudProviderId}
                          onChange={(val: string) => handleResourceCloudProviderChange(index, val)}
                          items={cloudProviders
                            .filter(cp => selectedCloudProviderIds.includes(cp.id))
                            .map(cp => ({ text: cp.displayName, value: cp.id }))}
                          placeholder="Select cloud provider"
                        />
                      </FormField>
                    </div>
                    
                    <div className="resource-config">
                      <DynamicResourceForm
                        resourceTypeId={resource.resourceTypeId}
                        cloudProviderId={resource.cloudProviderId}
                        values={resource.configuration}
                        onChange={(config) => handleResourceConfigChange(index, config)}
                        context="blueprint"
                        userEmail={user.email}
                      />
                    </div>
                  </div>
                );
                    })}
                  </div>
                )}

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
                      disabled={loading}
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
                </div>
              </>
            )}
          </div>

          <div className="form-actions">
            <AngryButton
              onClick={onCancel}
              disabled={loading}
              style="outline"
            >
              Cancel
            </AngryButton>
            <LoadingButton
              type="submit"
              isLoading={loading}
              loadingText="Saving..."
              disabled={!cloudProvidersLoaded || !!cloudProvidersLoadError}
              isPrimary={true}
              data-testid={blueprint ? "button-update-blueprint" : "button-create-blueprint"}
            >
              {blueprint ? 'Update Blueprint' : 'Create Blueprint'}
            </LoadingButton>
          </div>
        </form>
      </div>
      
      {/* Confirmation Dialog for Cloud Provider Deselection */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelCloudProviderChange}
        onConfirm={handleConfirmCloudProviderChange}
        title="Remove Cloud Provider?"
        message={
          <div className="confirmation-dialog-content">
            <p>
              Removing the selected cloud provider(s) will delete <strong>{affectedResources.length}</strong> resource(s):
            </p>
            <ul className="affected-resources-list">
              {affectedResources.map((resource, index) => (
                <li key={index}>
                  <strong>{resource.name}</strong> ({resource.cloudProviderName})
                </li>
              ))}
            </ul>
            <p>
              This action cannot be undone. Do you want to continue?
            </p>
          </div>
        }
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        isProcessing={false}
      />
    </div>
  );
};
