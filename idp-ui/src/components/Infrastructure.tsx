import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User } from '../types/auth';
import { 
  apiService, 
  type Blueprint, 
  type BlueprintCreate,
  type BlueprintResource
} from '../services/api';
import type { ResourceType, CloudProvider } from '../types/admin';
import './Infrastructure.css';
import { AngryComboBox, AngryTextBox, AngryButton, AngryCheckBox } from './input';
import ContainerOrchestratorConfigFormWithoutCloudServiceName from './infrastructure/ContainerOrchestratorConfigFormWithoutCloudServiceName';
import RelationalDatabaseServerConfigFormWithoutCloudServiceName from './infrastructure/RelationalDatabaseServerConfigFormWithoutCloudServiceName';
import ServiceBusConfigFormWithoutCloudServiceName from './infrastructure/ServiceBusConfigFormWithoutCloudServiceName';

interface InfrastructureProps {
  user: User;
}

export const Infrastructure = ({ user }: InfrastructureProps) => {
  const nameInputRef = useRef<{ focusIn?: () => void } | null>(null);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState('');
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [resources, setResources] = useState<BlueprintResource[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [cloudProviders, setCloudProviders] = useState<CloudProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [formData, setFormData] = useState<BlueprintCreate | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Resource creation/editing state
  const [resourceMode, setResourceMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [resourceFormData, setResourceFormData] = useState<Omit<BlueprintResource, 'id'> | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Load blueprints, resource types, and cloud providers
          const [blueprintsData, resourceTypesData, cloudProvidersData] = await Promise.all([
            apiService.getBlueprints(user.email),
            apiService.getAvailableResourceTypesForBlueprints(user.email),
            apiService.getAvailableCloudProvidersForBlueprints(user.email)
          ]);
        setBlueprints(blueprintsData);
        setResourceTypes(resourceTypesData);
        setCloudProviders(cloudProvidersData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    setMode('idle');
    setFormData(null);
  }, [user.email]);

  // Load resources when blueprint is selected
  useEffect(() => {
    if (!selectedBlueprintId) {
      setResources([]);
      return;
    }

    const blueprint = blueprints.find(b => b.id === selectedBlueprintId);
    if (blueprint && blueprint.resources) {
      setResources(blueprint.resources);
    } else {
      setResources([]);
    }
  }, [selectedBlueprintId, blueprints]);

  // Focus management for form
  useEffect(() => {
    if (mode !== 'idle' && nameInputRef.current) {
      // Multiple attempts with increasing delays to handle rendering
      const attempts = [50, 150, 300, 500];
      const timers: Array<ReturnType<typeof setTimeout>> = [];
      
      attempts.forEach(delay => {
        const timer = setTimeout(() => {
          if (nameInputRef.current) {
            try {
              if (nameInputRef.current.focusIn) {
                nameInputRef.current.focusIn();
              }
            } catch (e) {
              console.log('Focus attempt failed:', e);
            }
          }
        }, delay);
        timers.push(timer);
      });
      
      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [mode]);

  const handleBlueprintChange = (val: string) => {
    // Handle both selection and clearing, similar to StackForm domain handling
    if (!val) {
      setSelectedBlueprintId('');
      return;
    }
    const bp = blueprints.find(b => b.id === val);
    if (bp) {
      setSelectedBlueprintId(bp.id);
    } else {
      setSelectedBlueprintId('');
    }
  };

  const handleChange = (field: keyof BlueprintCreate, value: string | number | boolean | Record<string, unknown> | string[]) => {
    if (formData) {
      setFormData(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleCloudProviderChange = (cloudProviderId: string, isChecked: boolean) => {
    if (!formData) return;
    
    const currentProviders = formData.supportedCloudProviderIds || [];
    let newProviders: string[];
    
    if (isChecked) {
      newProviders = [...currentProviders, cloudProviderId];
    } else {
      newProviders = currentProviders.filter(id => id !== cloudProviderId);
    }
    
    setFormData(prev => prev ? { ...prev, supportedCloudProviderIds: newProviders } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    
    try {
      setSaving(true);
      setError(null);
      
      if (mode === 'create') {
        const newBlueprint = await apiService.createBlueprint(formData, user.email);
        // Refresh list and select the new blueprint
        const data = await apiService.getBlueprints(user.email);
        setBlueprints(data);
        setSelectedBlueprintId(newBlueprint.id);
      } else if (mode === 'edit' && selectedBlueprint) {
        await apiService.updateBlueprint(selectedBlueprint.id, formData, user.email);
        // Refresh list
        const data = await apiService.getBlueprints(user.email);
        setBlueprints(data);
      }
      
      setMode('idle');
      setFormData(null);
    } catch (e) {
      console.error(e);
      setError('Failed to save blueprint.');
    } finally {
      setSaving(false);
    }
  };

  const selectedBlueprint = selectedBlueprintId ? blueprints.find(b => b.id === selectedBlueprintId) : null;

  // Memoize filtered cloud providers for the resource form
  const filteredCloudProvidersForResource = useMemo(() => {
    const supportedProviderIds = selectedBlueprint?.supportedCloudProviderIds;
    
    // If blueprint has supported cloud providers, filter to those
    if (supportedProviderIds && supportedProviderIds.length > 0) {
      return cloudProviders.filter(cp => supportedProviderIds.includes(cp.id));
    }
    
    return cloudProviders;
  }, [selectedBlueprint?.supportedCloudProviderIds, cloudProviders]);

  const handleResourceUpdate = async (resource: BlueprintResource) => {
    setResourceMode('edit');
    setEditingResourceId(resource.id || null);
    setResourceFormData({
      name: resource.name,
      description: resource.description,
      resourceTypeId: resource.resourceTypeId,
      resourceTypeName: resource.resourceTypeName,
      cloudProviderId: resource.cloudProviderId,
      cloudProviderName: resource.cloudProviderName,
      configuration: resource.configuration || {},
      cloudSpecificProperties: resource.cloudSpecificProperties || {}
    });
  };

  const handleResourceDelete = async (resource: BlueprintResource) => {
    if (!confirm(`Are you sure you want to delete "${resource.name}"?`)) {
      return;
    }

    if (!selectedBlueprint) return;

    try {
      setSaving(true);
      setError(null);
      
      // Build updated resources array without deleted resource
      const updatedResources = resources
        .filter(r => r.id !== resource.id)
        .map(r => ({
          name: r.name,
          description: r.description,
          resourceTypeId: r.resourceTypeId,
          cloudProviderId: r.cloudProviderId,
          configuration: r.configuration,
          cloudSpecificProperties: r.cloudSpecificProperties
        }));
      
      // Update blueprint with filtered resources array
      await apiService.updateBlueprint(
        selectedBlueprint.id,
        {
          name: selectedBlueprint.name,
          description: selectedBlueprint.description,
          configuration: selectedBlueprint.configuration,
          supportedCloudProviderIds: selectedBlueprint.supportedCloudProviderIds,
          resources: updatedResources
        },
        user.email
      );
      
      // Refresh blueprints from server
      const data = await apiService.getBlueprints(user.email);
      setBlueprints(data);
      
    } catch (err) {
      console.error('Error deleting resource:', err);
      setError('Failed to delete resource. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResourceFormChange = (field: keyof Omit<BlueprintResource, 'id'>, value: string | Record<string, unknown>) => {
    if (resourceFormData) {
      if (field === 'resourceTypeId') {
        // Update configuration when resource type changes
        const selectedType = resourceTypes.find(rt => rt.id === value as string);
        const newConfig = getDefaultConfigurationForType(selectedType?.name || '');
        setResourceFormData(prev => prev ? { 
          ...prev, 
          [field]: value as string,
          resourceTypeName: selectedType?.name,
          configuration: newConfig as Record<string, unknown>,
          cloudSpecificProperties: {}
        } : null);
      } else if (field === 'cloudProviderId') {
        // Reset cloud-specific properties when cloud provider changes
        // Also store the cloud provider name for backend transformation
        const selectedProvider = cloudProviders.find(cp => cp.id === value as string);
        setResourceFormData(prev => prev ? { 
          ...prev, 
          [field]: value as string,
          cloudProviderName: selectedProvider?.name,
          cloudSpecificProperties: {}
        } : null);
      } else if (field === 'configuration') {
        // Handle configuration updates
        setResourceFormData(prev => prev ? { 
          ...prev, 
          configuration: value as Record<string, unknown>
        } : null);
      } else if (field === 'cloudSpecificProperties') {
        // Handle cloud-specific properties updates
        setResourceFormData(prev => prev ? { 
          ...prev, 
          cloudSpecificProperties: value as Record<string, unknown>
        } : null);
      } else {
        // Handle other fields
        setResourceFormData(prev => prev ? { ...prev, [field]: value } : null);
      }
    }
  };

  const getDefaultConfigurationForType = (typeName: string): unknown => {
    switch (typeName.toLowerCase()) {
      case 'container orchestrator':
        return {
          type: 'container-orchestrator',
          cloudServiceName: 'default-cluster'
        };
      case 'relational database server':
        return {
          type: 'relational-database-server',
          engine: 'postgres',
          version: '16',
          cloudServiceName: ''
        };
      case 'service bus':
        return {
          type: 'service-bus',
          cloudServiceName: ''
        };
      case 'storage':
        return {
          type: 'storage',
          cloudServiceName: ''
        };
      default:
        return {
          type: 'container-orchestrator',
          cloudServiceName: 'default-cluster'
        };
    }
  };

  // Configuration form components

  const renderCloudSpecificPropertiesForm = (cloudProviderId: string, resourceTypeId: string, properties: Record<string, unknown>, onChange: (properties: Record<string, unknown>) => void) => {
    const resourceType = resourceTypes.find(rt => rt.id === resourceTypeId);
    const cloudProvider = cloudProviders.find(cp => cp.id === cloudProviderId);
    if (!resourceType || !cloudProvider) return null;

    const renderAWSProperties = () => {
      switch (resourceType.name.toLowerCase()) {
        case 'storage':
          return (
            <div className="config-form">
              <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>AWS Storage Properties</h5>
              <div className="form-group">
                <AngryTextBox
                  id="aws-bucket-prefix"
                  value={(properties.bucketPrefix as string) || ''}
                  onChange={(v) => onChange({ ...properties, bucketPrefix: v })}
                  placeholder="S3 Bucket Prefix (optional)"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aws-storage-tier">Storage Tier</label>
                <AngryComboBox
                  id="aws-storage-tier"
                  items={[
                    { text: 'Standard', value: 'standard' },
                    { text: 'Infrequent Access', value: 'infrequent_access' },
                    { text: 'Archive', value: 'archive' }
                  ]}
                  value={(properties.storageTier as string) || 'standard'}
                  onChange={(val) => onChange({ ...properties, storageTier: val })}
                  placeholder="Select storage tier"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aws-storage-class">Storage Class *</label>
                <AngryComboBox
                  id="aws-storage-class"
                  items={[
                    { text: 'Standard', value: 'STANDARD' },
                    { text: 'Standard-IA', value: 'STANDARD_IA' },
                    { text: 'One Zone-IA', value: 'ONEZONE_IA' },
                    { text: 'Glacier', value: 'GLACIER' },
                    { text: 'Glacier Deep Archive', value: 'DEEP_ARCHIVE' },
                    { text: 'Intelligent-Tiering', value: 'INTELLIGENT_TIERING' }
                  ]}
                  value={(properties.storageClass as string) || 'STANDARD'}
                  onChange={(val) => onChange({ ...properties, storageClass: val })}
                  placeholder="Select storage class"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aws-versioning">Versioning Status *</label>
                <AngryComboBox
                  id="aws-versioning"
                  items={[
                    { text: 'Enabled', value: 'Enabled' },
                    { text: 'Suspended', value: 'Suspended' },
                    { text: 'Disabled', value: 'Disabled' }
                  ]}
                  value={(properties.versioning as string) || 'Enabled'}
                  onChange={(val) => onChange({ ...properties, versioning: val })}
                  placeholder="Select versioning status"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aws-encryption">Default Encryption *</label>
                <AngryComboBox
                  id="aws-encryption"
                  items={[
                    { text: 'AES-256', value: 'AES256' },
                    { text: 'AWS-KMS', value: 'aws:kms' },
                    { text: 'None', value: 'None' }
                  ]}
                  value={(properties.encryption as string) || 'AES256'}
                  onChange={(val) => onChange({ ...properties, encryption: val })}
                  placeholder="Select encryption type"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aws-block-public-access">Block Public Access *</label>
                <AngryComboBox
                  id="aws-block-public-access"
                  items={[
                    { text: 'Enabled', value: 'Enabled' },
                    { text: 'Disabled', value: 'Disabled' }
                  ]}
                  value={(properties.blockPublicAccess as string) || 'Enabled'}
                  onChange={(val) => onChange({ ...properties, blockPublicAccess: val })}
                  placeholder="Select public access setting"
                />
              </div>
              <div className="form-group">
                <AngryTextBox
                  id="aws-lifecycle-days"
                  value={(properties.lifecycleDays as string) || ''}
                  onChange={(v) => onChange({ ...properties, lifecycleDays: v })}
                  placeholder="Lifecycle Transition Days (optional)"
                />
              </div>
            </div>
          );
        case 'relational database server':
          return (
            <div className="config-form">
              <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>AWS RDS Properties</h5>
              <div className="form-group">
                <label htmlFor="aws-instance-class">Instance Class *</label>
                <AngryComboBox
                  id="aws-instance-class"
                  items={[
                    { text: 'db.t3.micro', value: 'db.t3.micro' },
                    { text: 'db.t3.small', value: 'db.t3.small' },
                    { text: 'db.t3.medium', value: 'db.t3.medium' },
                    { text: 'db.r5.large', value: 'db.r5.large' },
                    { text: 'db.r5.xlarge', value: 'db.r5.xlarge' }
                  ]}
                  value={(properties.instanceClass as string) || 'db.t3.micro'}
                  onChange={(val) => onChange({ ...properties, instanceClass: val })}
                  placeholder="Select instance class"
                />
              </div>
              <div className="form-group">
                <AngryTextBox
                  id="aws-multi-az"
                  value={(properties.multiAZ as string) || 'false'}
                  onChange={(v) => onChange({ ...properties, multiAZ: v })}
                  placeholder="Multi-AZ (true/false)"
                />
              </div>
            </div>
          );
        default:
          return null;
      }
    };

    const renderAzureProperties = () => {
      switch (resourceType.name.toLowerCase()) {
        case 'storage':
          return (
            <div className="config-form">
              <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Azure Storage Properties</h5>
              <div className="form-group">
                <AngryTextBox
                  id="azure-account-name"
                  value={(properties.accountName as string) || ''}
                  onChange={(v) => onChange({ ...properties, accountName: v })}
                  placeholder="Storage Account Name Prefix"
                />
              </div>
              <div className="form-group">
                <label htmlFor="azure-replication">Replication Type</label>
                <AngryComboBox
                  id="azure-replication"
                  items={[
                    { text: 'LRS (Locally-redundant)', value: 'LRS' },
                    { text: 'GRS (Geo-redundant)', value: 'GRS' },
                    { text: 'ZRS (Zone-redundant)', value: 'ZRS' },
                    { text: 'GZRS (Geo-zone-redundant)', value: 'GZRS' }
                  ]}
                  value={(properties.replication as string) || 'LRS'}
                  onChange={(val) => onChange({ ...properties, replication: val })}
                  placeholder="Select replication type"
                />
              </div>
            </div>
          );
        case 'relational database server':
          return (
            <div className="config-form">
              <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Azure Database Properties</h5>
              <div className="form-group">
                <label htmlFor="azure-tier">Service Tier</label>
                <AngryComboBox
                  id="azure-tier"
                  items={[
                    { text: 'Basic', value: 'Basic' },
                    { text: 'General Purpose', value: 'GeneralPurpose' },
                    { text: 'Business Critical', value: 'BusinessCritical' }
                  ]}
                  value={(properties.tier as string) || 'Basic'}
                  onChange={(val) => onChange({ ...properties, tier: val })}
                  placeholder="Select service tier"
                />
              </div>
              <div className="form-group">
                <AngryTextBox
                  id="azure-vcore"
                  value={(properties.vCores as string) || '2'}
                  onChange={(v) => onChange({ ...properties, vCores: v })}
                  placeholder="vCores"
                />
              </div>
            </div>
          );
        default:
          return null;
      }
    };

    const renderGCPProperties = () => {
      switch (resourceType.name.toLowerCase()) {
        case 'storage':
          return (
            <div className="config-form">
              <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Google Cloud Storage Properties</h5>
              <div className="form-group">
                <AngryTextBox
                  id="gcp-bucket-name"
                  value={(properties.bucketName as string) || ''}
                  onChange={(v) => onChange({ ...properties, bucketName: v })}
                  placeholder="Bucket Name Prefix"
                />
              </div>
              <div className="form-group">
                <label htmlFor="gcp-storage-class">Storage Class</label>
                <AngryComboBox
                  id="gcp-storage-class"
                  items={[
                    { text: 'Standard', value: 'STANDARD' },
                    { text: 'Nearline', value: 'NEARLINE' },
                    { text: 'Coldline', value: 'COLDLINE' },
                    { text: 'Archive', value: 'ARCHIVE' }
                  ]}
                  value={(properties.storageClass as string) || 'STANDARD'}
                  onChange={(val) => onChange({ ...properties, storageClass: val })}
                  placeholder="Select storage class"
                />
              </div>
            </div>
          );
        case 'relational database server':
          return (
            <div className="config-form">
              <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Google Cloud SQL Properties</h5>
              <div className="form-group">
                <label htmlFor="gcp-tier">Machine Tier</label>
                <AngryComboBox
                  id="gcp-tier"
                  items={[
                    { text: 'db-f1-micro', value: 'db-f1-micro' },
                    { text: 'db-g1-small', value: 'db-g1-small' },
                    { text: 'db-n1-standard-1', value: 'db-n1-standard-1' },
                    { text: 'db-n1-standard-2', value: 'db-n1-standard-2' },
                    { text: 'db-n1-highmem-2', value: 'db-n1-highmem-2' }
                  ]}
                  value={(properties.tier as string) || 'db-f1-micro'}
                  onChange={(val) => onChange({ ...properties, tier: val })}
                  placeholder="Select machine tier"
                />
              </div>
              <div className="form-group">
                <AngryTextBox
                  id="gcp-availability"
                  value={(properties.availabilityType as string) || 'ZONAL'}
                  onChange={(v) => onChange({ ...properties, availabilityType: v })}
                  placeholder="Availability Type (ZONAL/REGIONAL)"
                />
              </div>
            </div>
          );
        default:
          return null;
      }
    };

    switch (cloudProvider.name.toLowerCase()) {
      case 'aws':
        return renderAWSProperties();
      case 'azure':
        return renderAzureProperties();
      case 'gcp':
        return renderGCPProperties();
      default:
        return null;
    }
  };

  const renderConfigurationFormWithoutCloudServiceName = (resourceTypeId: string, config: Record<string, unknown>, onChange: (config: Record<string, unknown>) => void) => {
    const resourceType = resourceTypes.find(rt => rt.id === resourceTypeId);
    if (!resourceType) return null;

    switch (resourceType.name.toLowerCase()) {
      case 'container orchestrator':
        return <ContainerOrchestratorConfigFormWithoutCloudServiceName />;
      case 'relational database server':
        return <RelationalDatabaseServerConfigFormWithoutCloudServiceName config={config} onChange={onChange} />;
      case 'service bus':
        return <ServiceBusConfigFormWithoutCloudServiceName />;
      case 'storage':
        // Storage configuration is now handled entirely in cloud-specific properties
        return null;
      default:
        return null;
    }
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceFormData || !selectedBlueprint) return;
    
    console.log('Submitting resource form data:', JSON.stringify(resourceFormData, null, 2));
    
    try {
      setSaving(true);
      setError(null);
      
      // Build updated resources array
      let updatedResources: Omit<BlueprintResource, 'id'>[];
      
      if (resourceMode === 'create') {
        // Add new resource (without id)
        updatedResources = [
          ...resources.map(r => ({
            name: r.name,
            description: r.description,
            resourceTypeId: r.resourceTypeId,
            cloudProviderId: r.cloudProviderId,
            configuration: r.configuration,
            cloudSpecificProperties: r.cloudSpecificProperties
          })),
          resourceFormData
        ];
      } else if (resourceMode === 'edit' && editingResourceId) {
        // Update existing resource
        updatedResources = resources.map(r => {
          if (r.id === editingResourceId) {
            return {
              name: resourceFormData.name,
              description: resourceFormData.description,
              resourceTypeId: resourceFormData.resourceTypeId,
              cloudProviderId: resourceFormData.cloudProviderId,
              configuration: resourceFormData.configuration,
              cloudSpecificProperties: resourceFormData.cloudSpecificProperties
            };
          }
          return {
            name: r.name,
            description: r.description,
            resourceTypeId: r.resourceTypeId,
            cloudProviderId: r.cloudProviderId,
            configuration: r.configuration,
            cloudSpecificProperties: r.cloudSpecificProperties
          };
        });
      } else {
        return;
      }
      
      // Update blueprint with new resources array
      await apiService.updateBlueprint(
        selectedBlueprint.id,
        {
          name: selectedBlueprint.name,
          description: selectedBlueprint.description,
          configuration: selectedBlueprint.configuration,
          supportedCloudProviderIds: selectedBlueprint.supportedCloudProviderIds,
          resources: updatedResources
        },
        user.email
      );
      
      // Refresh blueprints from server
      const data = await apiService.getBlueprints(user.email);
      setBlueprints(data);
      
      // Reset form
      setResourceMode('idle');
      setResourceFormData(null);
      setEditingResourceId(null);
      
    } catch (e) {
      console.error(e);
      setError(
        resourceMode === 'create' 
          ? 'Failed to create resource. Please try again.' 
          : 'Failed to update resource. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Behavior handled by AngryComboBox

  return (
    <div className="content-container">
      <h2>Blueprints</h2>

      <div className="infrastructure-controls">
        <div className="environment-selector" style={{ gap: '0.75rem', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ alignSelf: 'flex-end' }}>
            <AngryComboBox
              id="blueprint-select"
              items={blueprints.map(bp => ({
                text: bp.name,
                value: bp.id
              }))}
              value={selectedBlueprintId}
              onChange={handleBlueprintChange}
              placeholder={loading ? 'Loading blueprint...' : 'Blueprint'}
              disabled={loading}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
            <button className="e-btn e-primary e-small" onClick={() => { setMode('create'); setFormData({ name: '', description: '', configuration: {}, supportedCloudProviderIds: [] }); }}>New</button>
            <button className="e-btn e-outline e-small" disabled={!selectedBlueprint} onClick={() => {
              if (!selectedBlueprint) return;
              setMode('edit');
              setFormData({
                name: selectedBlueprint.name,
                description: selectedBlueprint.description || '',
                configuration: selectedBlueprint.configuration ?? {},
                supportedCloudProviderIds: selectedBlueprint.supportedCloudProviderIds || []
              });
            }}>Edit</button>
            <button className="e-btn e-danger e-small" disabled={!selectedBlueprint} onClick={async () => {
              if (!selectedBlueprint) return;
              try {
                setSaving(true);
                await apiService.deleteBlueprint(selectedBlueprint.id, user.email);
                // Refresh list
                const data = await apiService.getBlueprints(user.email);
                setBlueprints(data);
                setSelectedBlueprintId('');
                setMode('idle');
              } catch (e) {
                console.error(e);
                setError('Failed to delete blueprint.');
              } finally {
                setSaving(false);
              }
            }}>Delete</button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '8px', 
          margin: '1rem 0',
          background: 'var(--bg-secondary)',
          borderRadius: '10px',
          isolation: 'isolate'
        }}>
          <div className="error-message" style={{ margin: 0 }}>
            {error}
          </div>
        </div>
      )}

      {/* Infrastructure form for create/edit */}
      {mode !== 'idle' && formData && (
        <div className="infrastructure-form">
          <h3>{mode === 'create' ? 'Create Blueprint' : 'Edit Blueprint'}</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <AngryTextBox
                id="bp-name"
                value={formData.name}
                onChange={(v) => handleChange('name', v)}
                placeholder="Blueprint Name *"
                componentRef={nameInputRef}
              />
            </div>
            
            <div className="form-group">
              <AngryTextBox
                id="bp-desc"
                value={formData.description || ''}
                onChange={(v) => handleChange('description', v)}
                placeholder="Description"
                multiline={true}
              />
            </div>
            
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Supported Cloud Providers *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cloudProviders.map(provider => (
                  <AngryCheckBox
                    key={provider.id}
                    id={`cloud-${provider.id}`}
                    checked={(formData.supportedCloudProviderIds || []).includes(provider.id)}
                    onChange={(isChecked) => handleCloudProviderChange(provider.id, isChecked)}
                    label={provider.displayName}
                  />
                ))}
              </div>
            </div>
            
            
            
            <div className="form-actions">
              <AngryButton
                onClick={() => { setMode('idle'); setFormData(null); setError(null); }}
                disabled={saving}
                cssClass="e-outline"
              >
                Cancel
              </AngryButton>
              <AngryButton
                type="submit"
                disabled={saving || !formData.name}
                cssClass="e-primary"
                isPrimary={true}
              >
                {saving ? 'Saving...' : (mode === 'create' ? 'Create Blueprint' : 'Update Blueprint')}
              </AngryButton>
            </div>
          </form>
        </div>
      )}

      <div className="infrastructure-content">
        {loading ? (
          <div className="loading-state" style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'var(--text-secondary)'
          }}>
            <p>Loading blueprints...</p>
          </div>
        ) : selectedBlueprintId ? (
          <div className="infrastructure-list">
            <h3>{selectedBlueprint?.name || 'Selected Blueprint'}</h3>
            {selectedBlueprint?.description && (
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                {selectedBlueprint.description}
              </p>
            )}
            {selectedBlueprint?.supportedCloudProviderIds && selectedBlueprint.supportedCloudProviderIds.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Supported Cloud Providers: </strong>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {selectedBlueprint.supportedCloudProviderIds.map(providerId => {
                    const provider = cloudProviders.find(cp => cp.id === providerId);
                    return (
                      <span 
                        key={providerId}
                        style={{
                          background: 'var(--bg-secondary)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          fontWeight: 500
                        }}
                      >
                        {provider?.displayName || providerId}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="infrastructure-resources">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>Shared Infrastructure Resources</h4>
                <button 
                  className="e-btn e-primary e-small" 
                  disabled={!selectedBlueprintId || saving}
                  onClick={() => {
                    if (!selectedBlueprintId) return;
                    setResourceMode('create');
                    const defaultTypeId = resourceTypes.length > 0 ? resourceTypes[0].id : '';
                    const defaultType = resourceTypes.find(rt => rt.id === defaultTypeId);
                    const defaultConfig = getDefaultConfigurationForType(defaultType?.name || '');
                    const supportedProviders = selectedBlueprint?.supportedCloudProviderIds || [];
                    const defaultCloudProviderId = supportedProviders.length > 0 ? supportedProviders[0] : (cloudProviders.length > 0 ? cloudProviders[0].id : '');
                    const defaultCloudProvider = cloudProviders.find(cp => cp.id === defaultCloudProviderId);
                    setResourceFormData({
                      name: '',
                      description: '',
                      resourceTypeId: defaultTypeId,
                      resourceTypeName: defaultType?.name,
                      cloudProviderId: defaultCloudProviderId,
                      cloudProviderName: defaultCloudProvider?.name,
                      configuration: (defaultConfig || {}) as Record<string, unknown>,
                      cloudSpecificProperties: {}
                    });
                  }}
                >
                  Create New Resource
                </button>
              </div>
              
              {resources.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <p>No shared infrastructure resources found.</p>
                </div>
              ) : (
                <div className="resources-table" style={{ 
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <div className="table-header" style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 2fr 1.5fr 1fr',
                    gap: '1rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-secondary)',
                    fontWeight: 600,
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <div>Name</div>
                    <div>Type</div>
                    <div>Cloud Type</div>
                    <div>Actions</div>
                  </div>
                  
                  {resources.map((resource, index) => (
                    <div 
                      key={resource.id}
                      className="table-row" 
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 2fr 1.5fr 1fr',
                        gap: '1rem',
                        padding: '0.75rem 1rem',
                        borderBottom: index < resources.length - 1 ? '1px solid var(--border-color)' : 'none',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{resource.name}</div>
                        {resource.description && (
                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: 'var(--text-secondary)', 
                            marginTop: '0.25rem' 
                          }}>
                            {resource.description}
                          </div>
                        )}
                      </div>
                      <div>{resource.resourceTypeName}</div>
                      <div>
                        {resource.cloudProviderName ? (
                          <span style={{
                            background: 'var(--bg-secondary)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            fontWeight: 500
                          }}>
                            {resource.cloudProviderName}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>Not specified</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="e-btn e-outline e-small" 
                          onClick={() => handleResourceUpdate(resource)}
                          disabled={saving}
                          title="Edit resource"
                        >
                          Edit
                        </button>
                        <button 
                          className="e-btn e-danger e-small" 
                          onClick={() => handleResourceDelete(resource)}
                          disabled={saving}
                          title="Delete resource"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Resource creation/editing form */}
              {(resourceMode === 'create' || resourceMode === 'edit') && resourceFormData && (
                <div className="infrastructure-form" style={{ marginTop: '2rem' }}>
                  <h4>{resourceMode === 'create' ? 'Create New Resource' : 'Edit Resource'}</h4>
                  
                  <form onSubmit={handleResourceSubmit}>
                    <div className="form-group">
                      <AngryTextBox
                        id="resource-name"
                        value={resourceFormData.name}
                        onChange={(v) => handleResourceFormChange('name', v)}
                        placeholder="Resource Name *"
                      />
                    </div>
                    
                    <div className="form-group">
                      <AngryTextBox
                        id="resource-description"
                        value={resourceFormData.description || ''}
                        onChange={(v) => handleResourceFormChange('description', v)}
                        placeholder="Description"
                        multiline={true}
                      />
                    </div>
                    
                    <div className="form-group">
                      <AngryComboBox
                        id="resource-type-select"
                        items={resourceTypes.map(rt => ({
                          text: rt.displayName,
                          value: rt.id
                        }))}
                        value={resourceFormData.resourceTypeId}
                        onChange={(val) => handleResourceFormChange('resourceTypeId', val)}
                        placeholder="Resource Type *"
                        disabled={resourceTypes.length === 0 || resourceMode === 'edit'}
                      />
                    </div>
                    
                    <div className="form-group">
                      <AngryTextBox
                        id="cloud-service-name"
                        value={(resourceFormData.configuration as Record<string, unknown>)?.cloudServiceName as string || ''}
                        onChange={(v) => handleResourceFormChange('configuration', { ...(resourceFormData.configuration as Record<string, unknown> || {}), cloudServiceName: v })}
                        placeholder="Cloud Service Name *"
                      />
                    </div>
                    
                    {/* Dynamic configuration form based on resource type (without cloud service name) */}
                    {resourceFormData.resourceTypeId && (
                      <div className="form-group">
                        {renderConfigurationFormWithoutCloudServiceName(
                          resourceFormData.resourceTypeId, 
                          resourceFormData.configuration as Record<string, unknown> || {}, 
                          (newConfig) => handleResourceFormChange('configuration', newConfig)
                        )}
                      </div>
                    )}
                    
                    {/* Cloud-specific properties section */}
                    <div style={{
                      margin: '1.5rem 0',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      background: 'var(--bg-secondary)'
                    }}>
                      {/* Cloud Type Selector - UI Control at the top of cloud properties */}
                      <div style={{
                        padding: '1rem',
                        borderBottom: resourceFormData.cloudProviderId ? '1px solid var(--border-color)' : 'none'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.75rem'
                        }}>
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            Cloud-Specific Properties
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.125rem 0.5rem',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '12px',
                            color: 'var(--text-secondary)'
                          }}>
                            Switches cloud properties below
                          </span>
                        </div>
                        <AngryComboBox
                          id="cloud-provider-select"
                          items={filteredCloudProvidersForResource.map(cp => ({
                            text: cp.displayName,
                            value: cp.id
                          }))}
                          value={resourceFormData.cloudProviderId || ''}
                          onChange={(val) => handleResourceFormChange('cloudProviderId', val)}
                          placeholder="Select Cloud Provider"
                        />
                      </div>
                      
                      {/* Cloud-specific properties form - only show when cloud provider is selected */}
                      {resourceFormData.cloudProviderId && (
                        <div style={{ padding: '1rem' }}>
                          <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 500 }}>
                            Cloud-Specific Properties for {cloudProviders.find(cp => cp.id === resourceFormData.cloudProviderId)?.displayName || 'Selected Provider'}
                          </h5>
                          {renderCloudSpecificPropertiesForm(
                            resourceFormData.cloudProviderId,
                            resourceFormData.resourceTypeId,
                            resourceFormData.cloudSpecificProperties as Record<string, unknown> || {},
                            (newProps) => handleResourceFormChange('cloudSpecificProperties', newProps)
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="form-actions">
                      <AngryButton
                        onClick={() => { 
                          setResourceMode('idle'); 
                          setResourceFormData(null); 
                          setEditingResourceId(null);
                          setError(null); 
                        }}
                        disabled={saving}
                        cssClass="e-outline"
                      >
                        Cancel
                      </AngryButton>
                      <AngryButton
                        type="submit"
                        disabled={saving || !resourceFormData.name || !resourceFormData.resourceTypeId}
                        cssClass="e-primary"
                        isPrimary={true}
                      >
                        {saving ? (resourceMode === 'create' ? 'Creating...' : 'Updating...') : (resourceMode === 'create' ? 'Create Resource' : 'Update Resource')}
                      </AngryButton>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="no-environment-selected">
            <p>Please select a blueprint to view infrastructure.</p>
          </div>
        )}
      </div>
    </div>
  );
};
