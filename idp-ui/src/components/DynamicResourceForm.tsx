import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import type { PropertySchema } from '../types/admin';
import { propertySchemaService } from '../services/PropertySchemaService';
import { PropertyInput } from './PropertyInput';
import './DynamicResourceForm.css';

/**
 * Props interface for DynamicResourceForm component
 * 
 * @property resourceTypeId - UUID of the resource type (e.g., Storage, Database)
 * @property cloudProviderId - UUID of the cloud provider (e.g., AWS, Azure, GCP)
 * @property values - Current property values as key-value pairs
 * @property onChange - Callback function invoked when property values change
 * @property disabled - If true, all inputs are disabled (default: false)
 * @property showLabels - If true, property labels are displayed (default: true)
 * @property context - Context for schema fetching: 'blueprint' or 'stack' (default: 'blueprint')
 * @property userEmail - Optional user email for authentication
 * @property isEditMode - If true, editing existing resource; if false, creating new (affects default value application)
 */
interface DynamicResourceFormProps {
  resourceTypeId: string;
  cloudProviderId: string;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
  showLabels?: boolean;
  context?: 'blueprint' | 'stack';
  userEmail?: string;
  isEditMode?: boolean;
}

/**
 * Ref interface for DynamicResourceForm component
 * Exposes validation methods to parent components via forwardRef
 * 
 * @property validateAll - Validates all properties and returns error map
 * @property setValidationErrors - Manually sets validation errors for display
 */
export interface DynamicResourceFormRef {
  validateAll: () => Record<string, string>;
  setValidationErrors: (errors: Record<string, string>) => void;
}

/**
 * DynamicResourceForm Component
 * 
 * A reusable form component that dynamically generates input controls based on property schemas
 * fetched from the backend. This eliminates the need for hardcoded cloud-specific forms and
 * enables administrators to configure new resource types without frontend code changes.
 * 
 * Features:
 * - Automatic schema fetching and caching
 * - Support for STRING, NUMBER, BOOLEAN, and LIST property types
 * - Built-in validation (required fields, min/max, patterns, allowed values)
 * - Loading, error, and empty states
 * - Theme-aware styling (light/dark mode support)
 * - Default value application for new resources
 * 
 * @example
 * ```tsx
 * <DynamicResourceForm
 *   resourceTypeId="uuid-of-storage-type"
 *   cloudProviderId="uuid-of-aws-provider"
 *   values={properties}
 *   onChange={setProperties}
 *   context="blueprint"
 * />
 * ```
 * 
 * @see {@link https://github.com/angryss/idp-ui/docs/DYNAMIC_INFRASTRUCTURE_FORMS.md} for detailed documentation
 */
export const DynamicResourceForm = forwardRef<DynamicResourceFormRef, DynamicResourceFormProps>(({
  resourceTypeId,
  cloudProviderId,
  values,
  onChange,
  disabled = false,
  showLabels = true,
  context = 'blueprint',
  userEmail,
  isEditMode = false,
}, ref) => {
  // State management
  const [schema, setSchema] = useState<PropertySchema[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * Expose validation methods to parent components via ref
   */
  useImperativeHandle(ref, () => ({
    validateAll: () => {
      const errors = validateAll();
      setValidationErrors(errors);
      return errors;
    },
    setValidationErrors: (errors: Record<string, string>) => {
      setValidationErrors(errors);
    },
  }));

  /**
   * Fetch schema when props change
   * useEffect hook monitors resourceTypeId, cloudProviderId, and context changes
   */
  useEffect(() => {
    // Only fetch if we have both required IDs
    if (!resourceTypeId || !cloudProviderId) {
      setSchema(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchSchema = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const fetchedSchema = await propertySchemaService.getSchema(
          resourceTypeId,
          cloudProviderId,
          context,
          userEmail
        );
        
        setSchema(fetchedSchema);
      } catch (err) {
        // Provide helpful error messages based on error type
        let errorMessage = 'Failed to load property configuration';
        
        if (err instanceof Error) {
          // Check for 404 errors (no schema configured)
          if (err.message.includes('404')) {
            errorMessage = 'No property schema is configured for this resource type and cloud provider combination. Contact your administrator to configure the required properties.';
          } else if (err.message.includes('401') || err.message.includes('403')) {
            errorMessage = 'You do not have permission to access this property schema. Please contact your administrator.';
          } else if (err.message.includes('500')) {
            errorMessage = 'Server error occurred while loading property schema. Please try again later or contact your administrator.';
          } else {
            errorMessage = err.message;
          }
        }
        
        console.error('Error loading property schema:', {
          resourceTypeId,
          cloudProviderId,
          context,
          error: err
        });
        
        setError(errorMessage);
        setSchema(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [resourceTypeId, cloudProviderId, context, userEmail]);

  /**
   * Apply default values when creating new resources
   * Only applies defaults if:
   * 1. Not in edit mode (isEditMode = false)
   * 2. Schema is loaded
   * 3. Property has a default value defined
   * 4. Property value is not already set
   */
  useEffect(() => {
    // Skip if in edit mode or no schema loaded
    if (isEditMode || !schema || schema.length === 0) {
      return;
    }

    // Check if any defaults need to be applied
    const defaultsToApply: Record<string, unknown> = {};
    let hasDefaults = false;

    schema.forEach((property) => {
      // Only apply default if:
      // 1. Property has a default value defined
      // 2. Current value is undefined or null (not set yet)
      if (
        property.defaultValue !== undefined &&
        property.defaultValue !== null &&
        (values[property.propertyName] === undefined || values[property.propertyName] === null)
      ) {
        defaultsToApply[property.propertyName] = property.defaultValue;
        hasDefaults = true;
      }
    });

    // Apply defaults if any were found
    if (hasDefaults) {
      const updatedValues = {
        ...values,
        ...defaultsToApply,
      };
      onChange(updatedValues);
    }
  }, [schema, isEditMode, values, onChange]);

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="dynamic-form-loading">
        <div className="loading-spinner" role="status" aria-live="polite">
          <span className="loading-text">Loading properties...</span>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    // Check if this is a 404 error (no schema configured)
    const is404Error = error.includes('No property schema is configured');
    
    return (
      <div className="dynamic-form-error" role="alert">
        <div className="error-icon">{is404Error ? 'ℹ️' : '⚠️'}</div>
        <div className="error-content">
          <p className="error-message">{error}</p>
          {!is404Error && (
            <button 
              className="retry-button"
              onClick={() => {
                // Trigger re-fetch by clearing and re-setting the error
                setError(null);
                setLoading(true);
                propertySchemaService.getSchema(
                  resourceTypeId,
                  cloudProviderId,
                  context,
                  userEmail
                ).then(setSchema)
                  .catch(err => {
                    let errorMessage = 'Failed to load property configuration';
                    if (err instanceof Error) {
                      if (err.message.includes('404')) {
                        errorMessage = 'No property schema is configured for this resource type and cloud provider combination. Contact your administrator to configure the required properties.';
                      } else {
                        errorMessage = err.message;
                      }
                    }
                    setError(errorMessage);
                  })
                  .finally(() => setLoading(false));
              }}
              disabled={disabled}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  /**
   * Handle empty schema case (no properties defined)
   */
  if (schema && schema.length === 0) {
    return (
      <div className="dynamic-form-empty" role="status">
        <div className="empty-icon">ℹ️</div>
        <div className="empty-content">
          <p className="empty-message">
            No cloud-specific properties are configured for this resource type and cloud provider.
          </p>
          <p className="empty-help-text">
            Contact your administrator if you need to configure additional properties.
          </p>
        </div>
      </div>
    );
  }

  /**
   * Validate a single property
   * Returns error message if validation fails, undefined if valid
   */
  const validateProperty = (property: PropertySchema, value: unknown): string | undefined => {
    const { propertyName, displayName, dataType, required, validationRules } = property;

    // Check required fields
    if (required) {
      if (value === undefined || value === null || value === '') {
        return `${displayName} is required`;
      }
    }

    // Skip further validation if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    // Apply validation rules based on data type
    if (validationRules) {
      // STRING validation
      if (dataType === 'STRING' && typeof value === 'string') {
        // Pattern validation (regex)
        if (validationRules.pattern) {
          try {
            const regex = new RegExp(validationRules.pattern);
            if (!regex.test(value)) {
              return `${displayName} format is invalid`;
            }
          } catch (err) {
            console.error(`Invalid regex pattern for ${propertyName}:`, err);
          }
        }

        // Min length validation
        if (validationRules.minLength !== undefined && value.length < validationRules.minLength) {
          return `${displayName} must be at least ${validationRules.minLength} characters`;
        }

        // Max length validation
        if (validationRules.maxLength !== undefined && value.length > validationRules.maxLength) {
          return `${displayName} must be at most ${validationRules.maxLength} characters`;
        }
      }

      // NUMBER validation
      if (dataType === 'NUMBER') {
        const numValue = typeof value === 'number' ? value : parseFloat(String(value));
        
        if (isNaN(numValue)) {
          return `${displayName} must be a valid number`;
        }

        // Min value validation
        if (validationRules.min !== undefined && numValue < validationRules.min) {
          if (validationRules.max !== undefined) {
            return `${displayName} must be between ${validationRules.min} and ${validationRules.max}`;
          }
          return `${displayName} must be at least ${validationRules.min}`;
        }

        // Max value validation
        if (validationRules.max !== undefined && numValue > validationRules.max) {
          if (validationRules.min !== undefined) {
            return `${displayName} must be between ${validationRules.min} and ${validationRules.max}`;
          }
          return `${displayName} must be at most ${validationRules.max}`;
        }
      }

      // LIST validation (allowed values)
      if (dataType === 'LIST' && validationRules.allowedValues && validationRules.allowedValues.length > 0) {
        const stringValue = String(value);
        const allowedValuesList = validationRules.allowedValues.map(av => av.value);
        
        if (!allowedValuesList.includes(stringValue)) {
          const allowedValuesStr = allowedValuesList.join(', ');
          return `${displayName} must be one of: ${allowedValuesStr}`;
        }
      }
    }

    return undefined;
  };

  /**
   * Validate all properties
   * Returns a Record of property names to error messages
   */
  const validateAll = (): Record<string, string> => {
    if (!schema) {
      return {};
    }

    const errors: Record<string, string> = {};

    schema.forEach((property) => {
      const value = values[property.propertyName];
      const error = validateProperty(property, value);
      
      if (error) {
        errors[property.propertyName] = error;
      }
    });

    return errors;
  };

  /**
   * Handle property change
   * Updates the values object with the new property value and clears validation error
   */
  const handlePropertyChange = (propertyName: string, value: unknown) => {
    // Update values object with new property value
    const updatedValues = {
      ...values,
      [propertyName]: value,
    };

    // Clear validation error for changed property
    if (validationErrors[propertyName]) {
      const updatedErrors = { ...validationErrors };
      delete updatedErrors[propertyName];
      setValidationErrors(updatedErrors);
    }

    // Call onChange prop with updated values
    onChange(updatedValues);
  };

  /**
   * Sort properties by displayOrder field
   * Properties without displayOrder are placed at the end
   */
  const sortedProperties = schema ? [...schema].sort((a, b) => {
    const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  }) : [];

  /**
   * Render form with properties
   */
  return (
    <div className="dynamic-resource-form">
      {showLabels && (
        <div className="form-section-header">
          <h3>Cloud-Specific Properties</h3>
        </div>
      )}
      
      <div className="form-properties">
        {sortedProperties.map((property) => (
          <PropertyInput
            key={property.id}
            property={property}
            value={values[property.propertyName]}
            onChange={(value) => handlePropertyChange(property.propertyName, value)}
            error={validationErrors[property.propertyName]}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
});

DynamicResourceForm.displayName = 'DynamicResourceForm';
