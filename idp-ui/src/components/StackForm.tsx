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
import type { Domain, Category } from '../services/api';
import type { User } from '../types/auth';
import type { CloudProvider, ResourceType } from '../types/admin';
import { DynamicResourceForm } from './DynamicResourceForm';
// SyncFusion imports
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
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nameInputRef = useRef<any>(null);
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
    cloudProviderId: null,
    resources: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportedLanguages, setSupportedLanguages] = useState<ProgrammingLanguage[]>([]);
  const [supportedVersions, setSupportedVersions] = useState<string[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // New state for cloud providers and resources
  const [cloudProviders, setCloudProviders] = useState<CloudProvider[]>([]);
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
        if (nameInputRef.current) {
          try {
            // Syncfusion components expose focusIn method
            if (nameInputRef.current.focusIn) {
              nameInputRef.current.focusIn();
            } else {
              // Fallback: try to find the input element
              const input = nameInputRef.current.inputElement || 
                          nameInputRef.current.element || 
                          nameInputRef.current;
              
              if (input) {
                // If it's the wrapper, find the actual input
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
        domainId: stack.domainId || null,
        categoryId: stack.categoryId || null,
        cloudProviderId: stack.cloudProviderId || null,
        resources: stack.resources || [],
      });
      setSelectedDomainId(stack.domainId || null);
      setSelectedCategoryId(stack.categoryId || null);
      
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

  // Load cloud providers and resource types on mount
  useEffect(() => {
    (async () => {
      try {
        const [providers, resourceTypes] = await Promise.all([
          apiService.getAvailableCloudProvidersForStacks(user.email),
          apiService.getAvailableResourceTypesForStacks(user.email),
        ]);
        setCloudProviders(providers);
        setAvailableResourceTypes(resourceTypes);
      } catch (e) {
        console.error('Failed to load cloud providers or resource types', e);
      }
    })();
  }, [user.email]);

  // Load domains on mount
  useEffect(() => {
    (async () => {
      try {
        const list = await apiService.getDomains(user.email);
        setDomains(list);
        // Domain is loaded - no need to set input label for dropdown
      } catch (e) {
        console.error('Failed to load domains', e);
      }
    })();
  }, [user.email, stack?.domainId]);

  // Load categories whenever selectedDomainId changes
  useEffect(() => {
    (async () => {
      if (!selectedDomainId) {
        setCategories([]);
        setSelectedCategoryId(null);
        return;
      }
      try {
        const list = await apiService.getDomainCategories(selectedDomainId, user.email);
        setCategories(list);
      } catch (e) {
        console.error('Failed to load categories', e);
      }
    })();
  }, [selectedDomainId, user.email, stack?.categoryId]);



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
        cloudProviderId: formData.cloudProviderId!,
        configuration: res.configuration,
      }));
      
      const payload: StackCreate = {
        ...formData,
        domainId: selectedDomainId,
        categoryId: selectedCategoryId,
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
    if (!formData.cloudProviderId) {
      setError('Please select a cloud provider first');
      return;
    }

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
            <AngryComboBox
              id="cloudProvider"
              value={formData.cloudProviderId || ''}
              onChange={(val: string) => {
                handleChange('cloudProviderId', val);
                // Clear resources when cloud provider changes
                if (val !== formData.cloudProviderId) {
                  setSelectedResources([]);
                }
              }}
              items={cloudProviders.map(cp => ({ text: cp.displayName, value: cp.id }))}
              placeholder="Cloud Provider *"
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

          {/* Domain select (restrict to available domains) */}
          <div className="form-group">
            <AngryComboBox
              id="domain"
              value={selectedDomainId || ''}
              onChange={(val: string) => {
                if (!val) {
                  setSelectedDomainId(null);
                  setFormData(prev => ({ ...prev, domainId: null, categoryId: null }));
                  setCategories([]);
                  setSelectedCategoryId(null);
                  return;
                }
                const d = domains.find(x => x.id === val);
                if (d) {
                  setSelectedDomainId(d.id);
                  setFormData(prev => ({ ...prev, domainId: d.id }));
                }
              }}
              items={domains.map(d => ({ text: d.name, value: d.id }))}
              placeholder="Domain"
            />
          </div>

          {/* Category typeahead, depends on domain */}
          <div className="form-group">
            <AngryComboBox
              id="category"
              value={selectedCategoryId || ''}
              onChange={(val: string) => {
                if (!val) {
                  setSelectedCategoryId(null);
                  setFormData(prev => ({ ...prev, categoryId: null }));
                  return;
                }
                const category = categories.find(c => c.id === val);
                if (category) {
                  setSelectedCategoryId(category.id);
                  setFormData(prev => ({ ...prev, categoryId: category.id }));
                }
              }}
              items={categories.map(c => ({ text: c.name, value: c.id }))}
              placeholder="Category"
              disabled={!selectedDomainId}
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
          {formData.cloudProviderId && (
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
                      cloudProviderId={formData.cloudProviderId!}
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
              {loading ? 'Saving...' : (stack ? 'Update Stack' : 'Create Stack')}
            </AngryButton>
          </div>
        </form>
      </div>
    </div>
  );
};
