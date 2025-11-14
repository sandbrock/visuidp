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

type StackCreateForm = StackCreate;
import './StackForm.css';

interface StackFormProps {
  stack?: Stack;
  onSave: (stack: Stack) => void;
  onCancel: () => void;
  user: User;
}

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

  const handleChange = (field: keyof StackCreateForm, value: string | boolean) => {
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
              placeholder="Display Name *"
              componentRef={nameInputRef}
            />
          </div>

          <div className="form-group">
            <AngryTextBox
              id="cloudName"
              value={formData.cloudName}
              onChange={(v) => handleChange('cloudName', v)}
              placeholder="Cloud Name *"
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

          <div className="form-group">
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
          </div>

          {(formData.stackType === StackType.RESTFUL_SERVERLESS || 
            formData.stackType === StackType.RESTFUL_API || 
            formData.stackType === StackType.JAVASCRIPT_WEB_APPLICATION) && (
            <div className="form-group">
              <AngryTextBox
                id="routePath"
                value={formData.routePath}
                onChange={(v) => handleChange('routePath', v)}
                placeholder="Route Path *"
              />
              <small className="form-text text-muted">The route path must start and end with a forward slash (e.g., /my-route-path/).</small>
            </div>
          )}

          <div className="form-group">
            <AngryTextBox
              id="repositoryURL"
              value={formData.repositoryURL || ''}
              onChange={(v) => handleChange('repositoryURL', v)}
              placeholder="Repository URL"
              type="url"
            />
          </div>

          {supportedLanguages.length > 0 && (
            <div className="form-group">
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
            </div>
          )}

          {supportedLanguages.length > 0 && supportedVersions.length > 0 && (
            <div className="form-group">
              <AngryComboBox
                id="frameworkVersion"
                value={formData.frameworkVersion || ''}
                onChange={(val: string) => handleChange('frameworkVersion', val)}
                items={supportedVersions.map(v => ({ text: v, value: v }))}
                placeholder="Framework Version"
              />
            </div>
          )}

          {(formData.stackType === StackType.RESTFUL_SERVERLESS || formData.stackType === StackType.RESTFUL_API) && (
            <div className="form-group">
              <AngryCheckBox
                label="Make this stack public"
                checked={formData.isPublic || false}
                onChange={(checked) => handleChange('isPublic', checked)}
              />
            </div>
          )}

          {/* Resources Section */}
          <div className="resources-section">
            <h3>Infrastructure Resources</h3>
            
            {selectedResources.map((resource, index) => (
              <div key={index} className="resource-item">
                <div className="resource-header">
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
            <AngryButton
              type="submit"
              disabled={loading}
              isPrimary={true}
            >
              {loading ? 'Saving...' : (stack ? 'Update Stack' : 'Create Stack')}
            </AngryButton>
          </div>
        </form>
      </div>
    </div>
  );
};
