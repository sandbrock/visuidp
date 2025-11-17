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
import { apiService } from '../services/api';
import type { User } from '../types/auth';
import type { ResourceType } from '../types/admin';
import { DynamicResourceForm } from './DynamicResourceForm';
import type { FocusableInputHandle } from '../types/focus';
import { AngryComboBox, AngryTextBox, AngryCheckBox, AngryButton } from './input';
import { FormField } from './common/FormField/FormField';
import { ErrorMessage } from './common/Feedback/ErrorMessage';
import { LoadingButton } from './common/LoadingButton/LoadingButton';
import { validateBlueprintCompatibility } from '../services/blueprintValidation';

type StackCreateForm = StackCreate;
import './StackForm.css';

interface StackFormProps {
  stack?: Stack;
  blueprintId: string;
  onSave: (stack: Stack) => void;
  onCancel: () => void;
  user: User;
}



export const StackForm = ({ stack, blueprintId, onSave, onCancel, user }: StackFormProps) => {
   
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
    blueprintId: blueprintId,
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
  
  // State for blueprint migration (edit mode only)
  const [availableBlueprints, setAvailableBlueprints] = useState<Array<{ id: string; name: string }>>([]);
  const [targetBlueprintId, setTargetBlueprintId] = useState<string | null>(null);
  const [migrationWarnings, setMigrationWarnings] = useState<string[]>([]);
  


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
        blueprintId: blueprintId, // Use blueprintId from props
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
  }, [stack, blueprintId]);

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

  // Load resource types on mount
  useEffect(() => {
    (async () => {
      try {
        const resourceTypes = await apiService.getAvailableResourceTypesForStacks(user.email);
        setAvailableResourceTypes(resourceTypes);
      } catch (e) {
        console.error('Failed to load resource types', e);
      }
    })();
  }, [user.email]);

  // Load available blueprints for migration (edit mode only)
  useEffect(() => {
    if (stack) {
      (async () => {
        try {
          const blueprints = await apiService.getBlueprints(user.email);
          // Exclude the current blueprint from the list
          const otherBlueprints = blueprints
            .filter(b => b.id !== blueprintId)
            .map(b => ({ id: b.id, name: b.name }));
          setAvailableBlueprints(otherBlueprints);
        } catch (e) {
          console.error('Failed to load blueprints for migration', e);
        }
      })();
    }
  }, [stack, blueprintId, user.email]);

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

    // Validate blueprint migration if attempting to migrate
    if (targetBlueprintId && migrationWarnings.length > 0) {
      const confirmMigration = window.confirm(
        'This stack migration has compatibility warnings:\n\n' +
        migrationWarnings.join('\n') +
        '\n\nDo you want to proceed with the migration anyway?'
      );
      
      if (!confirmMigration) {
        setLoading(false);
        return;
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
        // If migrating to a different blueprint, use the target blueprint ID
        blueprintId: targetBlueprintId || formData.blueprintId,
      };
      
      if (stack) {
        savedStack = await apiService.updateStack(stack.id, payload, user.email);
      } else {
        savedStack = await apiService.createStack(payload, user.email);
      }
      onSave(savedStack);
    } catch (err) {
      console.error('Failed to save stack:', err);
      
      // Handle migration-specific errors
      if (err instanceof Error) {
        if (err.message.includes('blueprint') || err.message.includes('migration')) {
          setError(`Migration failed: ${err.message}`);
          // Revert to original blueprint on migration failure
          setTargetBlueprintId(null);
          setMigrationWarnings([]);
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to save stack');
      }
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

  const handleBlueprintMigration = async (newBlueprintId: string) => {
    setTargetBlueprintId(newBlueprintId);
    setMigrationWarnings([]);

    if (!newBlueprintId) {
      return;
    }

    try {
      // Fetch the target blueprint to validate compatibility
      const blueprints = await apiService.getBlueprints(user.email);
      const targetBlueprint = blueprints.find(b => b.id === newBlueprintId);

      if (!targetBlueprint) {
        setMigrationWarnings(['Selected blueprint not found']);
        return;
      }

      // Validate blueprint compatibility using the validation service
      const validationResult = validateBlueprintCompatibility(
        formData.stackType,
        targetBlueprint,
        formData.blueprintResourceId
      );

      setMigrationWarnings(validationResult.warnings);
    } catch (e) {
      console.error('Failed to validate blueprint migration', e);
      setMigrationWarnings(['Failed to validate target blueprint']);
    }
  };

  return (
    <div className="stack-form-container">
      <div className="stack-form" role="main" aria-label={stack ? 'Edit stack form' : 'Create new stack form'}>
        <h2>{stack ? 'Edit Stack' : 'Create New Stack'}</h2>

        <form onSubmit={handleSubmit} aria-label={stack ? 'Edit stack' : 'Create new stack'}>
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

          {/* Blueprint Migration Section (Edit Mode Only) */}
          {stack && availableBlueprints.length > 0 && (
            <div className="migration-section" role="region" aria-label="Blueprint migration">
              <h3>Move to Different Blueprint</h3>
              <p className="migration-description">
                You can move this stack to a different blueprint. The target blueprint must support the resources required by this stack type.
              </p>
              
              <FormField 
                label="Target Blueprint" 
                htmlFor="target-blueprint"
                hint="Select a blueprint to move this stack to"
              >
                <AngryComboBox
                  id="target-blueprint"
                  value={targetBlueprintId || ''}
                  onChange={(val: string) => handleBlueprintMigration(val)}
                  items={[
                    { text: 'Keep current blueprint', value: '' },
                    ...availableBlueprints.map(bp => ({
                      text: bp.name,
                      value: bp.id
                    }))
                  ]}
                  placeholder="Select target blueprint"
                  disabled={loading}
                  aria-label="Select a target blueprint to move this stack to"
                  aria-describedby={migrationWarnings.length > 0 ? "migration-warnings" : undefined}
                />
              </FormField>

              {migrationWarnings.length > 0 && (
                <div 
                  id="migration-warnings" 
                  className="migration-warnings" 
                  role="alert" 
                  aria-live="assertive"
                  aria-atomic="true"
                >
                  <h4>Migration Warnings:</h4>
                  <ul aria-label="List of migration compatibility warnings">
                    {migrationWarnings.map((warning, index) => (
                      <li key={index} className="migration-warning-item">
                        {warning}
                      </li>
                    ))}
                  </ul>
                  <p className="migration-warning-note">
                    Please review these warnings before saving. The stack may not function correctly in the target blueprint.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="form-actions" role="group" aria-label="Form actions">
            <AngryButton
              onClick={onCancel}
              disabled={loading}
              style="outline"
              aria-label="Cancel and return to previous view"
              aria-disabled={loading}
            >
              Cancel
            </AngryButton>
            <LoadingButton
              type="submit"
              isLoading={loading}
              loadingText="Saving..."
              isPrimary={true}
              aria-label={stack ? 'Update stack with changes' : 'Create new stack'}
            >
              {stack ? 'Update Stack' : 'Create Stack'}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};
