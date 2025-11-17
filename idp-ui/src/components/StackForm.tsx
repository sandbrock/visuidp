import { useState, useEffect, useRef } from 'react';
import type { Stack, StackCreate, StackResource } from '../types/stack';
import {
  StackType,
  ProgrammingLanguage,
  getStackTypeDisplayName,
  getProgrammingLanguageDisplayName,
  getSupportedLanguages,
  getDefaultLanguage,
  getSupportedFrameworkVersions,
  getDefaultFrameworkVersion
} from '../types/stack';
import { apiService, type Blueprint, type BlueprintResource } from '../services/api';
import type { User } from '../types/auth';
import type { ResourceType } from '../types/admin';
import { DynamicResourceForm } from './DynamicResourceForm';
import type { FocusableInputHandle } from '../types/focus';
import { AngryComboBox, AngryTextBox, AngryCheckBox, AngryButton } from './input';
import { FormField } from './common/FormField/FormField';
import { ErrorMessage } from './common/Feedback/ErrorMessage';
import { LoadingButton } from './common/LoadingButton/LoadingButton';
import { InfoBox } from './common/Feedback/InfoBox';

type StackCreateForm = StackCreate;
import './StackForm.css';

interface StackFormProps {
  stack?: Stack;
  onSave: (stack: Stack) => void;
  onCancel: () => void;
  user: User;
}

/**
 * Filters blueprints based on stack type requirements.
 * - RESTful API and Event-driven API require "Managed Container Orchestrator"
 * - JavaScript Web Application requires "Storage"
 * - Infrastructure-only shows all blueprints
 * - Serverless stacks show all blueprints (no specific requirements)
 */
const filterBlueprintsForStackType = (
  blueprints: Blueprint[],
  stackType: StackType
): Blueprint[] => {
  if (stackType === StackType.INFRASTRUCTURE) {
    return blueprints; // No filtering for infrastructure stacks
  }
  
  return blueprints.filter(blueprint => {
    const resourceTypes = blueprint.resources?.map(r => r.resourceTypeName) || [];
    
    if (stackType === StackType.RESTFUL_API || stackType === StackType.EVENT_DRIVEN_API) {
      return resourceTypes.includes('Managed Container Orchestrator');
    }
    
    if (stackType === StackType.JAVASCRIPT_WEB_APPLICATION) {
      return resourceTypes.includes('Storage');
    }
    
    // Serverless stacks don't require specific resources
    return true;
  });
};

/**
 * Returns helper text explaining blueprint requirements for the selected stack type.
 */
const getStackTypeRequirementText = (stackType: StackType): string | null => {
  switch (stackType) {
    case StackType.RESTFUL_API:
    case StackType.EVENT_DRIVEN_API:
      return 'This stack type requires a blueprint with a Container Orchestrator';
    case StackType.JAVASCRIPT_WEB_APPLICATION:
      return 'This stack type requires a blueprint with a Storage resource';
    default:
      return null;
  }
};

/**
 * Gets available resources of a specific type from the selected blueprint.
 */
const getAvailableResourcesOfType = (
  blueprint: Blueprint | null,
  resourceTypeName: string
): BlueprintResource[] => {
  if (!blueprint?.resources) return [];
  
  return blueprint.resources.filter(
    r => r.resourceTypeName === resourceTypeName
  );
};

/**
 * Determines if resource selection dropdown should be shown.
 * Shows dropdown only when there are multiple resources of the required type.
 */
const shouldShowResourceSelection = (
  _stackType: StackType,
  blueprint: Blueprint | null,
  resourceTypeName: string
): boolean => {
  const resources = getAvailableResourcesOfType(blueprint, resourceTypeName);
  return resources.length > 1;
};

/**
 * Auto-selects resource if only one is available.
 * Returns the resource ID if exactly one resource of the type exists, null otherwise.
 */
const autoSelectResourceIfSingle = (
  blueprint: Blueprint | null,
  resourceTypeName: string
): string | null => {
  const resources = getAvailableResourcesOfType(blueprint, resourceTypeName);
  return resources.length === 1 ? resources[0].id || null : null;
};

export const StackForm = ({ stack, onSave, onCancel, user }: StackFormProps) => {
   
  const nameInputRef = useRef<FocusableInputHandle>(null);
  const [formData, setFormData] = useState<StackCreateForm>({
    name: '',
    cloudName: '',
    routePath: '',
    description: '',
    repositoryURL: '',
    stackType: StackType.RESTFUL_API,
    programmingLanguage: ProgrammingLanguage.QUARKUS,
    frameworkVersion: undefined,
    isPublic: false,
    resources: [],
    blueprintId: null,
    blueprintResourceId: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportedLanguages, setSupportedLanguages] = useState<ProgrammingLanguage[]>([]);
  const [supportedVersions, setSupportedVersions] = useState<string[]>([]);
  
  // State for resources
  const [availableResourceTypes, setAvailableResourceTypes] = useState<ResourceType[]>([]);
  const [selectedResources, setSelectedResources] = useState<Array<{
    resourceTypeId: string;
    name: string;
    configuration: Record<string, unknown>;
  }>>([]);
  
  // State for blueprints
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [filteredBlueprints, setFilteredBlueprints] = useState<Blueprint[]>([]);

  // Focus the name input when the form mounts
  useEffect(() => {
    // Multiple attempts with increasing delays to handle modal animation
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

  useEffect(() => {
    if (stack) {
      setFormData({
        name: stack.name,
        cloudName: stack.cloudName,
        routePath: stack.routePath,
        description: stack.description || '',
        repositoryURL: stack.repositoryURL || '',
        stackType: stack.stackType,
        programmingLanguage: stack.programmingLanguage,
        frameworkVersion: stack.frameworkVersion,
        isPublic: stack.isPublic || false,
        resources: stack.resources || [],
        blueprintId: stack.blueprintId || null,
        blueprintResourceId: null, // Will be set by auto-selection effect if needed
      });
      
      // Load resources if editing
      if (stack.resources && stack.resources.length > 0) {
        const resourcesData = stack.resources.map(resource => ({
          resourceTypeId: resource.resourceTypeId,
          name: resource.name,
          configuration: resource.configuration,
        }));
        setSelectedResources(resourcesData);
      }
    }
  }, [stack]);

  useEffect(() => {
    const languages = getSupportedLanguages(formData.stackType);
    setSupportedLanguages(languages);
    
    // Set default language if current language is not supported
    if (languages.length > 0 && (!formData.programmingLanguage || !languages.includes(formData.programmingLanguage))) {
      const defaultLang = getDefaultLanguage(formData.stackType);
      setFormData(prev => ({ ...prev, programmingLanguage: defaultLang || languages[0] }));
    }
    
    // Clear route path if stack type doesn't require it
    const requiresRoutePath = formData.stackType === StackType.RESTFUL_SERVERLESS || 
                             formData.stackType === StackType.RESTFUL_API || 
                             formData.stackType === StackType.JAVASCRIPT_WEB_APPLICATION;
    if (!requiresRoutePath && formData.routePath) {
      setFormData(prev => ({ ...prev, routePath: '' }));
    }
  }, [formData.stackType, formData.routePath, formData.programmingLanguage]);

  useEffect(() => {
    const versions = getSupportedFrameworkVersions(formData.programmingLanguage);
    setSupportedVersions(versions);
    
    // Set default version if current version is not supported
    if (versions.length > 0 && (!formData.frameworkVersion || !versions.includes(formData.frameworkVersion))) {
      const defaultVersion = getDefaultFrameworkVersion(formData.programmingLanguage);
      setFormData(prev => ({ ...prev, frameworkVersion: defaultVersion || versions[0] }));
    }
  }, [formData.programmingLanguage, formData.frameworkVersion]);

  // Load resource types and blueprints on mount
  useEffect(() => {
    (async () => {
      try {
        const resourceTypes = await apiService.getAvailableResourceTypesForStacks(user.email);
        setAvailableResourceTypes(resourceTypes);
      } catch (e) {
        console.error('Failed to load resource types', e);
      }
      
      try {
        const loadedBlueprints = await apiService.getBlueprints(user.email);
        setBlueprints(loadedBlueprints);
      } catch (e) {
        console.error('Failed to load blueprints', e);
      }
    })();
  }, [user.email]);
  
  // Filter blueprints based on stack type
  useEffect(() => {
    const filtered = filterBlueprintsForStackType(blueprints, formData.stackType);
    setFilteredBlueprints(filtered);
    
    // Clear blueprint selection if current selection is not in filtered list
    if (formData.blueprintId && !filtered.find(b => b.id === formData.blueprintId)) {
      setFormData(prev => ({ ...prev, blueprintId: null }));
    }
    
    // Clear error when stack type changes
    setError(null);
  }, [blueprints, formData.stackType, formData.blueprintId]);

  // Clear error when blueprint selection changes
  useEffect(() => {
    setError(null);
  }, [formData.blueprintId]);

  // Handle auto-selection of blueprint resource when blueprint or stack type changes
  useEffect(() => {
    const selectedBlueprint = blueprints.find(b => b.id === formData.blueprintId);
    
    if (selectedBlueprint && formData.stackType) {
      let resourceTypeName: string | null = null;
      
      // Determine required resource type based on stack type
      if (formData.stackType === StackType.RESTFUL_API || formData.stackType === StackType.EVENT_DRIVEN_API) {
        resourceTypeName = 'Managed Container Orchestrator';
      } else if (formData.stackType === StackType.JAVASCRIPT_WEB_APPLICATION) {
        resourceTypeName = 'Storage';
      }
      
      // Auto-select if only one resource of the required type exists
      if (resourceTypeName) {
        const autoSelectedId = autoSelectResourceIfSingle(selectedBlueprint, resourceTypeName);
        setFormData(prev => ({ ...prev, blueprintResourceId: autoSelectedId }));
      } else {
        // Clear selection if stack type doesn't require a specific resource
        setFormData(prev => ({ ...prev, blueprintResourceId: null }));
      }
    } else {
      // Clear selection if no blueprint is selected
      setFormData(prev => ({ ...prev, blueprintResourceId: null }));
    }
  }, [formData.blueprintId, formData.stackType, blueprints]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate route path for required stack types
    const requiresRoutePath = formData.stackType === StackType.RESTFUL_SERVERLESS || 
                             formData.stackType === StackType.RESTFUL_API || 
                             formData.stackType === StackType.JAVASCRIPT_WEB_APPLICATION;
    
    if (requiresRoutePath && !formData.routePath?.trim()) {
      setError('Route Path is required for this stack type');
      setLoading(false);
      return;
    }

    // Validate blueprint resource selection for applicable stack types
    if (formData.blueprintId) {
      const selectedBlueprint = blueprints.find(b => b.id === formData.blueprintId);
      
      // Check if Container Orchestrator selection is required
      if ((formData.stackType === StackType.RESTFUL_API || formData.stackType === StackType.EVENT_DRIVEN_API) &&
          shouldShowResourceSelection(formData.stackType, selectedBlueprint || null, 'Managed Container Orchestrator')) {
        if (!formData.blueprintResourceId) {
          setError('Please select a Container Orchestrator');
          setLoading(false);
          return;
        }
      }
      
      // Check if Storage Resource selection is required
      if (formData.stackType === StackType.JAVASCRIPT_WEB_APPLICATION &&
          shouldShowResourceSelection(formData.stackType, selectedBlueprint || null, 'Storage')) {
        if (!formData.blueprintResourceId) {
          setError('Please select a Storage Resource');
          setLoading(false);
          return;
        }
      }
    }

    try {
      let savedStack: Stack;
      
      // Convert selected resources to the format expected by the API
      const resources: Omit<StackResource, 'id'>[] = selectedResources.map(res => ({
        name: res.name,
        resourceTypeId: res.resourceTypeId,
        cloudProviderId: res.configuration.cloudProviderId as string || '',
        configuration: res.configuration,
      }));
      
      const payload: StackCreate = {
        ...formData,
        resources,
      };
      
      if (stack) {
        savedStack = await apiService.updateStack(stack.id, payload, user.email);
      } else {
        savedStack = await apiService.createStack(payload, user.email);
      }
      onSave(savedStack);
    } catch (err) {
      console.error('Failed to save stack:', err);
      setError(err instanceof Error ? err.message : 'Failed to save stack');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof StackCreateForm, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };



  const handleAddResource = (resourceTypeId: string) => {
    const resourceType = availableResourceTypes.find(rt => rt.id === resourceTypeId);
    const newResource = {
      resourceTypeId,
      name: resourceType?.displayName || 'New Resource',
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

  return (
    <div className="stack-form-container">
      <div className="stack-form">
        <h2>{stack ? 'Edit Stack' : 'Create New Stack'}</h2>

        <form onSubmit={handleSubmit}>
          <FormField 
            label="Display Name" 
            required
            htmlFor="name"
          >
            <AngryTextBox
              id="name"
              value={formData.name}
              onChange={(v) => handleChange('name', v)}
              componentRef={nameInputRef}
              placeholder="Display Name"
            />
          </FormField>

          <FormField 
            label="Cloud Name" 
            required
            htmlFor="cloudName"
          >
            <AngryTextBox
              id="cloudName"
              value={formData.cloudName}
              onChange={(v) => handleChange('cloudName', v)}
              placeholder="Cloud Name"
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

          <FormField 
            label="Stack Type" 
            htmlFor="stackType"
          >
            <AngryComboBox
              id="stackType"
              value={formData.stackType}
              onChange={(val: string) => handleChange('stackType', val as StackType)}
              items={Object.values(StackType).map(type => ({
                text: getStackTypeDisplayName(type),
                value: type
              }))}
              placeholder="Select stack type"
            />
          </FormField>

          {getStackTypeRequirementText(formData.stackType) && (
            <InfoBox>{getStackTypeRequirementText(formData.stackType)}</InfoBox>
          )}

          <FormField 
            label="Blueprint" 
            htmlFor="blueprint"
            hint="Optional: Select a blueprint to use predefined infrastructure resources"
          >
            <AngryComboBox
              id="blueprint"
              value={formData.blueprintId || ''}
              onChange={(val: string) => handleChange('blueprintId', val || null)}
              items={[
                { text: 'None', value: '' },
                ...filteredBlueprints.map(bp => ({
                  text: bp.name,
                  value: bp.id
                }))
              ]}
              placeholder="Select blueprint (optional)"
            />
          </FormField>

          {/* Container Orchestrator Selection */}
          {formData.blueprintId && 
           (formData.stackType === StackType.RESTFUL_API || formData.stackType === StackType.EVENT_DRIVEN_API) &&
           shouldShowResourceSelection(
             formData.stackType,
             blueprints.find(b => b.id === formData.blueprintId) || null,
             'Managed Container Orchestrator'
           ) && (
            <FormField 
              label="Container Orchestrator" 
              required
              htmlFor="blueprintResource"
              hint="Select the container orchestrator to use for this stack"
            >
              <AngryComboBox
                id="blueprintResource"
                value={formData.blueprintResourceId || ''}
                onChange={(val: string) => handleChange('blueprintResourceId', val || null)}
                items={
                  getAvailableResourcesOfType(
                    blueprints.find(b => b.id === formData.blueprintId) || null,
                    'Managed Container Orchestrator'
                  ).map(resource => ({
                    text: resource.name,
                    value: resource.id || ''
                  }))
                }
                placeholder="Select container orchestrator"
              />
            </FormField>
          )}

          {/* Storage Resource Selection */}
          {formData.blueprintId && 
           formData.stackType === StackType.JAVASCRIPT_WEB_APPLICATION &&
           shouldShowResourceSelection(
             formData.stackType,
             blueprints.find(b => b.id === formData.blueprintId) || null,
             'Storage'
           ) && (
            <FormField 
              label="Storage Resource" 
              required
              htmlFor="blueprintResourceStorage"
              hint="Select the storage resource to use for this web application"
            >
              <AngryComboBox
                id="blueprintResourceStorage"
                value={formData.blueprintResourceId || ''}
                onChange={(val: string) => handleChange('blueprintResourceId', val || null)}
                items={
                  getAvailableResourcesOfType(
                    blueprints.find(b => b.id === formData.blueprintId) || null,
                    'Storage'
                  ).map(resource => ({
                    text: resource.name,
                    value: resource.id || ''
                  }))
                }
                placeholder="Select storage resource"
              />
            </FormField>
          )}

          {error && (
            <ErrorMessage message={error} />
          )}

          {(formData.stackType === StackType.RESTFUL_SERVERLESS || 
            formData.stackType === StackType.RESTFUL_API || 
            formData.stackType === StackType.JAVASCRIPT_WEB_APPLICATION) && (
            <FormField 
              label="Route Path" 
              required
              htmlFor="routePath"
              hint="The route path must start and end with a forward slash (e.g., /my-route-path/)."
            >
              <AngryTextBox
                id="routePath"
                value={formData.routePath}
                onChange={(v) => handleChange('routePath', v)}
                placeholder="Route Path"
              />
            </FormField>
          )}

          <FormField 
            label="Repository URL" 
            htmlFor="repositoryURL"
          >
            <AngryTextBox
              id="repositoryURL"
              value={formData.repositoryURL || ''}
              onChange={(v) => handleChange('repositoryURL', v)}
              type="url"
              placeholder="Repository URL"
            />
          </FormField>

          {supportedLanguages.length > 0 && (
            <FormField 
              label="Framework" 
              htmlFor="programmingLanguage"
            >
              <AngryComboBox
                id="programmingLanguage"
                value={formData.programmingLanguage || ''}
                onChange={(val: string) => handleChange('programmingLanguage', val as ProgrammingLanguage)}
                items={supportedLanguages.map(lang => ({
                  text: getProgrammingLanguageDisplayName(lang),
                  value: lang
                }))}
                placeholder="Framework"
              />
            </FormField>
          )}

          {supportedLanguages.length > 0 && supportedVersions.length > 0 && (
            <FormField 
              label="Framework Version" 
              htmlFor="frameworkVersion"
            >
              <AngryComboBox
                id="frameworkVersion"
                value={formData.frameworkVersion || ''}
                onChange={(val: string) => handleChange('frameworkVersion', val)}
                items={supportedVersions.map(v => ({ text: v, value: v }))}
                placeholder="Framework Version"
              />
            </FormField>
          )}

          {(formData.stackType === StackType.RESTFUL_SERVERLESS || formData.stackType === StackType.RESTFUL_API) && (
            <FormField label="Public Stack">
              <AngryCheckBox
                label="Make this stack public"
                checked={formData.isPublic || false}
                onChange={(checked) => handleChange('isPublic', checked)}
              />
            </FormField>
          )}

          {/* Resources Section */}
          <div className="resources-section">
            <h3>Infrastructure Resources</h3>
            
            {selectedResources.map((resource, index) => (
              <div key={index} className="resource-item">
                <div className="resource-header">
                  <FormField 
                    label="Resource Name" 
                    required
                    htmlFor={`resource-name-${index}`}
                  >
                    <AngryTextBox
                      id={`resource-name-${index}`}
                      value={resource.name}
                      onChange={(v) => handleResourceNameChange(index, v)}
                      placeholder="Resource Name"
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
                
                <div className="resource-config">
                  <DynamicResourceForm
                    resourceTypeId={resource.resourceTypeId}
                    cloudProviderId={resource.configuration.cloudProviderId as string || ''}
                    values={resource.configuration}
                    onChange={(config) => handleResourceConfigChange(index, config)}
                    context="stack"
                    userEmail={user.email}
                    isEditMode={!!stack}
                  />
                </div>
              </div>
            ))}

            <div className="add-resource-section">
              <label htmlFor="add-resource">Add Resource</label>
              <select
                id="add-resource"
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddResource(e.target.value);
                    e.target.value = '';
                  }
                }}
                disabled={loading}
                className="add-resource-select"
              >
                <option value="">Select a resource type...</option>
                {availableResourceTypes.map(rt => (
                  <option key={rt.id} value={rt.id}>
                    {rt.displayName}
                  </option>
                ))}
              </select>
            </div>
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
              isPrimary={true}
            >
              {stack ? 'Update Stack' : 'Create Stack'}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};
