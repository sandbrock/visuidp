import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import type { 
  PropertySchema, 
  PropertySchemaCreate,
  PropertyDataType,
  ResourceTypeCloudMapping 
} from '../types/admin';
import type { User } from '../types/auth';
import { AngryButton, AngryTextBox, AngryComboBox, AngryCheckBox } from './input';
import { Modal } from './Modal';
import { Breadcrumb } from './Breadcrumb';
import './PropertySchemaEditor.css';

interface PropertySchemaEditorProps {
  user: User;
}

const DATA_TYPES: { value: PropertyDataType; text: string }[] = [
  { value: 'STRING', text: 'String' },
  { value: 'NUMBER', text: 'Number' },
  { value: 'BOOLEAN', text: 'Boolean' },
  { value: 'LIST', text: 'List' },
];

interface PropertyFormData extends Omit<PropertySchemaCreate, 'mappingId'> {
  id?: string;
}

/**
 * PropertySchemaEditor - Standalone page for managing property schemas for resource type cloud mappings
 * 
 * Navigation Entry Points:
 * 1. From AdminDashboard (incomplete mappings):
 *    - Route: /admin/property-schemas/:mappingId
 *    - State: { from: '/admin', resourceTypeName, cloudProviderName }
 * 
 * 2. From ResourceTypeMappingManagement (grid):
 *    - Route: /admin/property-schemas/:mappingId
 *    - State: { from: '/admin/resource-type-mappings', resourceTypeName, cloudProviderName }
 * 
 * 3. Alternative query param route:
 *    - Route: /admin/property-schemas?resourceTypeId=xxx&cloudProviderId=yyy
 *    - State: Optional navigation context
 * 
 * URL Parameters:
 * - mappingId (route param): Direct mapping ID
 * - resourceTypeId (query param): Alternative lookup by resource type
 * - cloudProviderId (query param): Alternative lookup by cloud provider
 * 
 * Location State:
 * - from: Previous page path for back navigation
 * - resourceTypeName: Display name for breadcrumb/header
 * - cloudProviderName: Display name for breadcrumb/header
 */
export const PropertySchemaEditor = ({ user }: PropertySchemaEditorProps) => {
  const { mappingId } = useParams<{ mappingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract navigation context from location state
  // This context is passed when navigating from:
  // - AdminDashboard: includes 'from', 'resourceTypeName', 'cloudProviderName'
  // - ResourceTypeMappingManagement: includes 'from', 'resourceTypeName', 'cloudProviderName'
  const navigationContext = location.state as {
    from?: string;
    resourceTypeName?: string;
    cloudProviderName?: string;
  } | null;
  
  const [mapping, setMapping] = useState<ResourceTypeCloudMapping | null>(null);
  const [properties, setProperties] = useState<PropertySchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertySchema | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>({
    propertyName: '',
    displayName: '',
    description: '',
    dataType: 'STRING',
    required: false,
    defaultValue: undefined,
    validationRules: {},
    displayOrder: 0,
  });
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const loadProperties = useCallback(
    async (mappingIdToLoad: string) => {
      try {
        const data = await apiService.getPropertySchemasByMapping(mappingIdToLoad, user.email);
        // Sort by display order
        const sorted = data.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        setProperties(sorted);
      } catch (err) {
        console.error('Failed to load property schemas:', err);
        throw err;
      }
    },
    [user.email]
  );

  const loadMapping = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let mappingData: ResourceTypeCloudMapping;

      if (mappingId) {
        // Load mapping by ID from route parameter
        console.log('Loading mapping by ID:', mappingId);
        const mappings = await apiService.getResourceTypeCloudMappings(user.email);
        const found = mappings.find((m) => m.id === mappingId);
        if (!found) {
          console.error('Mapping not found for ID:', mappingId);
          setError(`Mapping not found with ID: ${mappingId}`);
          return;
        }
        console.log('Found mapping:', found);
        mappingData = found;
      } else {
        // Load mapping by resourceTypeId and cloudProviderId from query params
        const resourceTypeId = searchParams.get('resourceTypeId');
        const cloudProviderId = searchParams.get('cloudProviderId');

        console.log('Loading mapping by query params:', { resourceTypeId, cloudProviderId });

        if (!resourceTypeId || !cloudProviderId) {
          console.error('Missing required query parameters');
          setError('Missing required parameters: resourceTypeId and cloudProviderId. Please navigate from the mappings page.');
          return;
        }

        const mappings = await apiService.getResourceTypeCloudMappings(user.email);
        const found = mappings.find(
          (m) => m.resourceTypeId === resourceTypeId && m.cloudProviderId === cloudProviderId
        );

        if (!found) {
          console.error('Mapping not found for:', { resourceTypeId, cloudProviderId });
          setError(`Mapping not found for the specified resource type and cloud provider. Please ensure the mapping exists.`);
          return;
        }
        console.log('Found mapping:', found);
        mappingData = found;
      }

      setMapping(mappingData);
      await loadProperties(mappingData.id);
    } catch (err) {
      console.error('Failed to load mapping:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mapping');
    } finally {
      setLoading(false);
    }
  }, [mappingId, searchParams, user.email, loadProperties]);

  useEffect(() => {
    loadMapping();
  }, [loadMapping]);

  const handleBack = () => {
    // Navigate back to the previous page using location state or browser history
    if (navigationContext?.from) {
      navigate(navigationContext.from);
    } else {
      // Fallback: try browser history, or go to mappings page
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/admin/resource-type-mappings');
      }
    }
  };

  // Build dynamic breadcrumb items based on navigation context
  const buildBreadcrumbItems = (): Array<{ label: string; path?: string }> => {
    const items: Array<{ label: string; path?: string }> = [
      { label: 'Admin Dashboard', path: '/admin' }
    ];
    
    // Determine the previous page based on navigation context
    if (navigationContext?.from === '/admin') {
      // Coming from dashboard - show direct path
      items.push({ label: 'Property Schema Editor' });
    } else if (navigationContext?.from === '/admin/resource-type-mappings') {
      // Coming from mappings page
      items.push({ label: 'Resource Type Mappings', path: '/admin/resource-type-mappings' });
      items.push({ label: 'Property Schema Editor' });
    } else {
      // Default path through mappings
      items.push({ label: 'Resource Type Mappings', path: '/admin/resource-type-mappings' });
      items.push({ label: 'Property Schema Editor' });
    }
    
    return items;
  };

  const handleCreate = () => {
    setEditingProperty(null);
    setFormData({
      propertyName: '',
      displayName: '',
      description: '',
      dataType: 'STRING',
      required: false,
      defaultValue: undefined,
      validationRules: {},
      displayOrder: properties.length,
    });
    setShowModal(true);
  };

  const handleEdit = (property: PropertySchema) => {
    setEditingProperty(property);
    setFormData({
      id: property.id,
      propertyName: property.propertyName,
      displayName: property.displayName,
      description: property.description || '',
      dataType: property.dataType,
      required: property.required,
      defaultValue: property.defaultValue,
      validationRules: property.validationRules || {},
      displayOrder: property.displayOrder || 0,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!formData.propertyName.trim() || !formData.displayName.trim()) {
        setError('Property Name and Display Name are required');
        return;
      }

      // Validate property name is unique (excluding current property if editing)
      const isDuplicate = properties.some(
        (p) => p.propertyName === formData.propertyName && p.id !== editingProperty?.id
      );
      if (isDuplicate) {
        setError('Property name must be unique within this mapping');
        return;
      }

      if (editingProperty) {
        await apiService.updatePropertySchema(editingProperty.id, formData, user.email);
      } else {
        await apiService.createPropertySchema(
          { ...formData, mappingId: mapping!.id },
          user.email
        );
      }

      setShowModal(false);
      await loadProperties(mapping!.id);
    } catch (err) {
      console.error('Failed to save property schema:', err);
      setError(err instanceof Error ? err.message : 'Failed to save property schema');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (property: PropertySchema) => {
    if (!confirm(`Are you sure you want to delete property "${property.displayName}"?`)) {
      return;
    }

    try {
      setError(null);
      await apiService.deletePropertySchema(property.id, user.email);
      await loadProperties(mapping!.id);
    } catch (err) {
      console.error('Failed to delete property schema:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete property schema');
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newProperties = [...properties];
    const draggedItem = newProperties[draggedIndex];
    newProperties.splice(draggedIndex, 1);
    newProperties.splice(index, 0, draggedItem);

    setProperties(newProperties);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    try {
      // Update display order for all properties
      const updates = properties.map((prop, index) => ({
        ...prop,
        displayOrder: index,
      }));

      // Update each property with new display order
      await Promise.all(
        updates.map((prop) =>
          apiService.updatePropertySchema(
            prop.id,
            { displayOrder: prop.displayOrder },
            user.email
          )
        )
      );

      setDraggedIndex(null);
      await loadProperties(mapping!.id);
    } catch (err) {
      console.error('Failed to update property order:', err);
      setError(err instanceof Error ? err.message : 'Failed to update property order');
      await loadProperties(mapping!.id); // Reload to reset order
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setError(null);
  };

  const handleValidationRuleChange = (key: string, value: string) => {
    const rules: Record<string, unknown> = { ...formData.validationRules };
    if (value.trim() === '') {
      delete rules[key];
    } else {
      // Try to parse as number if it looks like a number
      const numValue = Number(value);
      rules[key] = isNaN(numValue) ? value : numValue;
    }
    setFormData({ ...formData, validationRules: rules });
  };

  const renderPreview = () => {
    return (
      <div className="property-preview">
        <h3>Form Preview</h3>
        <div className="preview-form">
          {properties.map((prop) => (
            <div key={prop.id} className="preview-field">
              <label>
                {prop.displayName}
                {prop.required && <span className="required">*</span>}
              </label>
              {prop.description && <small className="field-hint">{prop.description}</small>}
              {renderPreviewInput(prop)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPreviewInput = (prop: PropertySchema) => {
    switch (prop.dataType) {
      case 'STRING':
        return (
          <AngryTextBox
            id={`preview-${prop.id}`}
            value={prop.defaultValue as string || ''}
            onChange={() => {}}
            placeholder={prop.defaultValue as string || ''}
            disabled={true}
          />
        );
      case 'NUMBER':
        return (
          <AngryTextBox
            id={`preview-${prop.id}`}
            value={prop.defaultValue?.toString() || ''}
            onChange={() => {}}
            placeholder={prop.defaultValue?.toString() || ''}
            disabled={true}
          />
        );
      case 'BOOLEAN':
        return (
          <AngryCheckBox
            label=""
            checked={prop.defaultValue as boolean || false}
            onChange={() => {}}
            disabled={true}
          />
        );
      case 'LIST':
        return (
          <AngryTextBox
            id={`preview-${prop.id}`}
            value=""
            onChange={() => {}}
            placeholder="Comma-separated values"
            disabled={true}
            multiline={true}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="property-schema-editor loading">Loading...</div>;
  }

  if (error && !mapping) {
    return (
      <div className="property-schema-editor error">
        <div className="error-message">{error}</div>
        <AngryButton onClick={handleBack} isPrimary={true}>
          Go Back
        </AngryButton>
      </div>
    );
  }

  if (!mapping) {
    return <div className="property-schema-editor">No mapping data available</div>;
  }

  const breadcrumbItems = buildBreadcrumbItems();

  return (
    <div className="property-schema-editor">
      <Breadcrumb items={breadcrumbItems} />
      
      <div className="header">
        <div className="header-info">
          <h2>Property Schema Editor</h2>
          <div className="mapping-info">
            <span className="mapping-label">
              {navigationContext?.resourceTypeName || mapping.resourceTypeName} - {navigationContext?.cloudProviderName || mapping.cloudProviderName}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <AngryButton onClick={handleBack} style="outline">
            Back
          </AngryButton>
          <AngryButton
            onClick={() => setPreviewMode(!previewMode)}
            style="outline"
          >
            {previewMode ? 'Edit Mode' : 'Preview Mode'}
          </AngryButton>
          <AngryButton onClick={handleCreate} isPrimary={true}>
            Add Property
          </AngryButton>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {previewMode ? (
        renderPreview()
      ) : (
        <div className="properties-list">
          {properties.length === 0 ? (
            <div className="empty-state">
              No properties defined yet. Click "Add Property" to create one.
            </div>
          ) : (
            <div className="properties-table">
              <table>
                <thead>
                  <tr>
                    <th className="drag-handle-header"></th>
                    <th>Property Name</th>
                    <th>Display Name</th>
                    <th>Data Type</th>
                    <th>Required</th>
                    <th>Default Value</th>
                    <th>Validation Rules</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property, index) => (
                    <tr
                      key={property.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={draggedIndex === index ? 'dragging' : ''}
                    >
                      <td className="drag-handle">
                        <span className="drag-icon">⋮⋮</span>
                      </td>
                      <td className="property-name">{property.propertyName}</td>
                      <td>{property.displayName}</td>
                      <td>
                        <span className="data-type-badge">{property.dataType}</span>
                      </td>
                      <td>
                        <span className={`required-badge ${property.required ? 'yes' : 'no'}`}>
                          {property.required ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="default-value">
                        {property.defaultValue !== undefined && property.defaultValue !== null
                          ? JSON.stringify(property.defaultValue)
                          : '-'}
                      </td>
                      <td className="validation-rules">
                        {property.validationRules && Object.keys(property.validationRules).length > 0
                          ? Object.entries(property.validationRules)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')
                          : '-'}
                      </td>
                      <td className="actions">
                        <AngryButton onClick={() => handleEdit(property)} size="small">
                          Edit
                        </AngryButton>
                        <AngryButton
                          onClick={() => handleDelete(property)}
                          size="small"
                          variant="danger"
                        >
                          Delete
                        </AngryButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        width="700px"
        isOpen={showModal}
        onClose={handleModalClose}
        title={editingProperty ? 'Edit Property Schema' : 'Create Property Schema'}
        showCloseIcon={true}
        buttons={[
          {
            label: 'Cancel',
            onClick: handleModalClose,
            variant: 'secondary',
            disabled: saving
          },
          {
            label: saving ? 'Saving...' : editingProperty ? 'Update' : 'Create',
            onClick: handleSave,
            variant: 'primary',
            disabled: saving
          }
        ]}
      >
        <div className="property-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Property Name *</label>
              <AngryTextBox
                id="propertyName"
                value={formData.propertyName}
                onChange={(v) => setFormData({ ...formData, propertyName: v })}
                placeholder="e.g., maxConnections"
                disabled={!!editingProperty}
              />
              <small className="form-hint">
                Unique identifier for this property (camelCase recommended)
              </small>
            </div>

            <div className="form-group">
              <label>Display Name *</label>
              <AngryTextBox
                id="displayName"
                value={formData.displayName}
                onChange={(v) => setFormData({ ...formData, displayName: v })}
                placeholder="e.g., Maximum Connections"
              />
              <small className="form-hint">User-friendly name shown in forms</small>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <AngryTextBox
              id="description"
              value={formData.description || ''}
              onChange={(v) => setFormData({ ...formData, description: v })}
              placeholder="Help text for users"
              multiline={true}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data Type *</label>
              <AngryComboBox
                id="dataType"
                items={DATA_TYPES}
                value={formData.dataType}
                onChange={(value) => setFormData({ ...formData, dataType: value as PropertyDataType })}
                placeholder="Select data type"
              />
            </div>

            <div className="form-group checkbox-group">
              <AngryCheckBox
                label="Required Field"
                checked={formData.required}
                onChange={(checked) => setFormData({ ...formData, required: checked })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Default Value</label>
            {formData.dataType === 'BOOLEAN' ? (
              <AngryCheckBox
                label="Default to true"
                checked={(formData.defaultValue as boolean) || false}
                onChange={(checked) => setFormData({ ...formData, defaultValue: checked })}
              />
            ) : formData.dataType === 'NUMBER' ? (
              <AngryTextBox
                id="defaultValue"
                value={formData.defaultValue?.toString() || ''}
                onChange={(v) => {
                  const num = v === '' ? undefined : Number(v);
                  setFormData({ ...formData, defaultValue: isNaN(num as number) ? undefined : num });
                }}
                placeholder="Enter default number"
              />
            ) : (
              <AngryTextBox
                id="defaultValue"
                value={(formData.defaultValue as string) || ''}
                onChange={(v) => setFormData({ ...formData, defaultValue: v || undefined })}
                placeholder="Enter default value"
              />
            )}
          </div>

          <div className="form-group">
            <label>Validation Rules</label>
            <div className="validation-rules-editor">
              {formData.dataType === 'NUMBER' && (
                <>
                  <div className="validation-rule">
                    <label>Minimum</label>
                    <AngryTextBox
                      id="min"
                      value={
                        (formData.validationRules as Record<string, unknown>)?.min?.toString() ||
                        ''
                      }
                      onChange={(v) => handleValidationRuleChange('min', v)}
                      placeholder="Min value"
                    />
                  </div>
                  <div className="validation-rule">
                    <label>Maximum</label>
                    <AngryTextBox
                      id="max"
                      value={
                        (formData.validationRules as Record<string, unknown>)?.max?.toString() ||
                        ''
                      }
                      onChange={(v) => handleValidationRuleChange('max', v)}
                      placeholder="Max value"
                    />
                  </div>
                </>
              )}
              {formData.dataType === 'STRING' && (
                <>
                  <div className="validation-rule">
                    <label>Min Length</label>
                    <AngryTextBox
                      id="minLength"
                      value={
                        (formData.validationRules as Record<string, unknown>)?.minLength?.toString() ||
                        ''
                      }
                      onChange={(v) => handleValidationRuleChange('minLength', v)}
                      placeholder="Min length"
                    />
                  </div>
                  <div className="validation-rule">
                    <label>Max Length</label>
                    <AngryTextBox
                      id="maxLength"
                      value={
                        (formData.validationRules as Record<string, unknown>)?.maxLength?.toString() ||
                        ''
                      }
                      onChange={(v) => handleValidationRuleChange('maxLength', v)}
                      placeholder="Max length"
                    />
                  </div>
                  <div className="validation-rule">
                    <label>Pattern (Regex)</label>
                    <AngryTextBox
                      id="pattern"
                      value={
                        ((formData.validationRules as Record<string, unknown>)?.pattern as string) ||
                        ''
                      }
                      onChange={(v) => handleValidationRuleChange('pattern', v)}
                      placeholder="e.g., ^[a-z]+$"
                    />
                  </div>
                </>
              )}
              {formData.dataType === 'LIST' && (
                <>
                  <div className="validation-rule">
                    <label>Min Items</label>
                    <AngryTextBox
                      id="minItems"
                      value={
                        (formData.validationRules as Record<string, unknown>)?.minItems?.toString() ||
                        ''
                      }
                      onChange={(v) => handleValidationRuleChange('minItems', v)}
                      placeholder="Min items"
                    />
                  </div>
                  <div className="validation-rule">
                    <label>Max Items</label>
                    <AngryTextBox
                      id="maxItems"
                      value={
                        (formData.validationRules as Record<string, unknown>)?.maxItems?.toString() ||
                        ''
                      }
                      onChange={(v) => handleValidationRuleChange('maxItems', v)}
                      placeholder="Max items"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
