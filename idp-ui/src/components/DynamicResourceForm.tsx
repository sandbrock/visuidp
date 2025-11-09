import { useState, useEffect } from 'react';
import type { PropertySchema } from '../types/admin';
import { AngryTextBox, AngryCheckBox } from './input';
import './DynamicResourceForm.css';

interface DynamicResourceFormProps {
  schema: Record<string, PropertySchema>;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

interface ValidationError {
  field: string;
  message: string;
}

export const DynamicResourceForm = ({ schema, values, onChange }: DynamicResourceFormProps) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, unknown>>(values);

  // Initialize with default values from schema
  useEffect(() => {
    const initialValues = { ...values };
    Object.values(schema).forEach(prop => {
      if (!(prop.propertyName in initialValues) && prop.defaultValue !== undefined) {
        initialValues[prop.propertyName] = prop.defaultValue;
      }
    });
    setLocalValues(initialValues);
    onChange(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  // Validate a single field
  const validateField = (_propertyName: string, value: unknown, prop: PropertySchema): string | null => {
    // Check required
    if (prop.required && (value === undefined || value === null || value === '')) {
      return `${prop.displayName} is required`;
    }

    // Skip validation if value is empty and not required
    if (!prop.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Type-specific validation
    switch (prop.dataType) {
      case 'STRING': {
        const strValue = String(value);
        const rules = prop.validationRules || {};
        
        if (rules.minLength && strValue.length < Number(rules.minLength)) {
          return `${prop.displayName} must be at least ${rules.minLength} characters`;
        }
        if (rules.maxLength && strValue.length > Number(rules.maxLength)) {
          return `${prop.displayName} must be at most ${rules.maxLength} characters`;
        }
        if (rules.pattern && !new RegExp(String(rules.pattern)).test(strValue)) {
          return `${prop.displayName} format is invalid`;
        }
        break;
      }

      case 'NUMBER': {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return `${prop.displayName} must be a valid number`;
        }
        
        const rules = prop.validationRules || {};
        if (rules.min !== undefined && numValue < Number(rules.min)) {
          return `${prop.displayName} must be at least ${rules.min}`;
        }
        if (rules.max !== undefined && numValue > Number(rules.max)) {
          return `${prop.displayName} must be at most ${rules.max}`;
        }
        break;
      }

      case 'LIST': {
        if (!Array.isArray(value)) {
          return `${prop.displayName} must be a list`;
        }
        
        const rules = prop.validationRules || {};
        if (rules.minItems && value.length < Number(rules.minItems)) {
          return `${prop.displayName} must have at least ${rules.minItems} items`;
        }
        if (rules.maxItems && value.length > Number(rules.maxItems)) {
          return `${prop.displayName} must have at most ${rules.maxItems} items`;
        }
        break;
      }

      case 'BOOLEAN':
        // Boolean values are always valid
        break;
    }

    return null;
  };

  // Validate all fields
  const validateAll = (valuesToValidate: Record<string, unknown>): ValidationError[] => {
    const newErrors: ValidationError[] = [];
    
    Object.values(schema).forEach(prop => {
      const value = valuesToValidate[prop.propertyName];
      const error = validateField(prop.propertyName, value, prop);
      if (error) {
        newErrors.push({ field: prop.propertyName, message: error });
      }
    });

    return newErrors;
  };

  // Handle value change
  const handleChange = (propertyName: string, value: unknown, prop: PropertySchema) => {
    const newValues = { ...localValues, [propertyName]: value };
    setLocalValues(newValues);
    
    // Validate the changed field
    const error = validateField(propertyName, value, prop);
    setErrors(prev => {
      const filtered = prev.filter(e => e.field !== propertyName);
      if (error) {
        return [...filtered, { field: propertyName, message: error }];
      }
      return filtered;
    });

    // Validate all fields and notify parent
    const allErrors = validateAll(newValues);
    setErrors(allErrors);
    onChange(newValues);
  };

  // Get error for a specific field
  const getFieldError = (propertyName: string): string | undefined => {
    return errors.find(e => e.field === propertyName)?.message;
  };

  // Sort properties by display order
  const sortedProperties = Object.values(schema).sort((a, b) => {
    const orderA = a.displayOrder ?? 999;
    const orderB = b.displayOrder ?? 999;
    return orderA - orderB;
  });

  if (sortedProperties.length === 0) {
    return (
      <div className="dynamic-resource-form-empty">
        <p>No configuration properties defined for this resource.</p>
      </div>
    );
  }

  return (
    <div className="dynamic-resource-form">
      {sortedProperties.map(prop => {
        const value = localValues[prop.propertyName];
        const error = getFieldError(prop.propertyName);
        const fieldId = `field-${prop.propertyName}`;

        return (
          <div key={prop.propertyName} className="dynamic-form-field">
            {prop.dataType === 'STRING' && (
              <div className="field-wrapper">
                <AngryTextBox
                  id={fieldId}
                  value={String(value ?? '')}
                  onChange={(v) => handleChange(prop.propertyName, v, prop)}
                  placeholder={`${prop.displayName}${prop.required ? ' *' : ''}`}
                />
                {prop.description && (
                  <small className="field-help-text">{prop.description}</small>
                )}
                {error && (
                  <small className="field-error-text">{error}</small>
                )}
              </div>
            )}

            {prop.dataType === 'NUMBER' && (
              <div className="field-wrapper">
                <AngryTextBox
                  id={fieldId}
                  value={value !== undefined && value !== null ? String(value) : ''}
                  onChange={(v) => {
                    const numValue = v === '' ? undefined : Number(v);
                    handleChange(prop.propertyName, numValue, prop);
                  }}
                  placeholder={`${prop.displayName}${prop.required ? ' *' : ''}`}
                  type="number"
                />
                {prop.description && (
                  <small className="field-help-text">{prop.description}</small>
                )}
                {error && (
                  <small className="field-error-text">{error}</small>
                )}
              </div>
            )}

            {prop.dataType === 'BOOLEAN' && (
              <div className="field-wrapper">
                <AngryCheckBox
                  id={fieldId}
                  checked={Boolean(value)}
                  onChange={(checked) => handleChange(prop.propertyName, checked, prop)}
                  label={`${prop.displayName}${prop.required ? ' *' : ''}`}
                />
                {prop.description && (
                  <small className="field-help-text">{prop.description}</small>
                )}
                {error && (
                  <small className="field-error-text">{error}</small>
                )}
              </div>
            )}

            {prop.dataType === 'LIST' && (
              <div className="field-wrapper">
                <label htmlFor={fieldId}>
                  {prop.displayName}{prop.required ? ' *' : ''}
                </label>
                <textarea
                  id={fieldId}
                  value={Array.isArray(value) ? value.join('\n') : ''}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
                    handleChange(prop.propertyName, lines, prop);
                  }}
                  placeholder="Enter one item per line"
                  rows={4}
                  className="list-textarea"
                />
                {prop.description && (
                  <small className="field-help-text">{prop.description}</small>
                )}
                {error && (
                  <small className="field-error-text">{error}</small>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
