import type { PropertySchema } from '../types/admin';
import { AngryTextBox } from './input/AngryTextBox';
import { AngryCheckBox } from './input/AngryCheckBox';
import { AngryComboBox } from './input/AngryComboBox';
import type { AngryComboItem } from './input/AngryComboBox';
import './PropertyInput.css';

/**
 * Props interface for PropertyInput component
 * 
 * @property property - Property schema definition containing metadata and validation rules
 * @property value - Current value of the property
 * @property onChange - Callback function invoked when the property value changes
 * @property error - Optional validation error message to display
 * @property disabled - If true, the input control is disabled (default: false)
 */
interface PropertyInputProps {
  property: PropertySchema;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * PropertyInput Component
 * 
 * A specialized input component that renders the appropriate control based on property data type.
 * Automatically handles validation, error display, help text, and required field indicators.
 * 
 * Supported Property Types:
 * - STRING: Renders AngryTextBox with optional pattern validation
 * - NUMBER: Renders AngryTextBox with numeric validation and min/max constraints
 * - BOOLEAN: Renders AngryCheckBox for true/false values
 * - LIST: Renders AngryComboBox (dropdown) when allowedValues are provided, otherwise AngryTextBox
 * 
 * Features:
 * - Type-specific input controls
 * - Inline validation error display
 * - Help text from property description
 * - Required field indicator (asterisk)
 * - Theme-aware styling
 * 
 * @example
 * ```tsx
 * <PropertyInput
 *   property={{
 *     propertyName: 'storageClass',
 *     displayName: 'Storage Class',
 *     dataType: 'LIST',
 *     required: true,
 *     validationRules: {
 *       allowedValues: [
 *         { value: 'STANDARD', label: 'Standard' },
 *         { value: 'GLACIER', label: 'Glacier' }
 *       ]
 *     }
 *   }}
 *   value="STANDARD"
 *   onChange={setValue}
 * />
 * ```
 * 
 * @see {@link https://github.com/angryss/idp-ui/docs/DYNAMIC_INFRASTRUCTURE_FORMS.md#propertyinput} for detailed documentation
 */

export const PropertyInput = ({
  property,
  value,
  onChange,
  error,
  disabled = false,
}: PropertyInputProps) => {
  // Property type detection logic
  const getInputType = (): 'string' | 'number' | 'boolean' | 'list' => {
    return property.dataType.toLowerCase() as 'string' | 'number' | 'boolean' | 'list';
  };

  const inputType = getInputType();

  // Render appropriate input control based on property type
  const renderInput = () => {
    switch (inputType) {
      case 'string':
        return renderStringInput();
      case 'number':
        return renderNumberInput();
      case 'boolean':
        return renderBooleanInput();
      case 'list':
        return renderListInput();
      default:
        return <div className="property-input-unsupported">Unsupported property type: {property.dataType}</div>;
    }
  };

  // Placeholder implementations for each input type
  const renderStringInput = () => {
    const stringValue = value !== null && value !== undefined ? String(value) : '';
    
    // Build placeholder with length hints if available
    let placeholder = property.displayName;
    const minLength = property.validationRules?.minLength;
    const maxLength = property.validationRules?.maxLength;
    if (minLength !== undefined && maxLength !== undefined) {
      placeholder += ` (${minLength}-${maxLength} chars)`;
    } else if (minLength !== undefined) {
      placeholder += ` (min: ${minLength} chars)`;
    } else if (maxLength !== undefined) {
      placeholder += ` (max: ${maxLength} chars)`;
    }
    
    return (
      <div className="property-input-control">
        <AngryTextBox
          id={`property-${property.propertyName}`}
          value={stringValue}
          onChange={(newValue) => onChange(newValue)}
          placeholder={placeholder}
          disabled={disabled}
          className={error ? 'has-error' : ''}
        />
      </div>
    );
  };

  const renderNumberInput = () => {
    const numberValue = value !== null && value !== undefined ? String(value) : '';
    
    // Handle numeric input with validation
    const handleNumberChange = (newValue: string) => {
      // Allow empty string (for clearing the field)
      if (newValue === '') {
        onChange(null);
        return;
      }
      
      // Validate numeric input (allow integers and decimals, including partial inputs)
      // Allow: digits, optional negative sign at start, optional single decimal point
      const numericRegex = /^-?\d*\.?\d*$/;
      if (!numericRegex.test(newValue)) {
        // Prevent non-numeric character entry by not calling onChange
        return;
      }
      
      // Allow negative sign and decimal point during typing (incomplete numbers)
      if (newValue === '-' || newValue === '.' || newValue === '-.') {
        onChange(newValue);
        return;
      }
      
      // Convert to number if it's a complete valid number
      const parsedValue = parseFloat(newValue);
      if (!isNaN(parsedValue)) {
        onChange(parsedValue);
      } else {
        // Keep the string value during typing (e.g., "-", ".")
        onChange(newValue);
      }
    };
    
    // Build placeholder with min/max hints if available
    let placeholder = property.displayName;
    const min = property.validationRules?.min;
    const max = property.validationRules?.max;
    if (min !== undefined && max !== undefined) {
      placeholder += ` (${min}-${max})`;
    } else if (min !== undefined) {
      placeholder += ` (min: ${min})`;
    } else if (max !== undefined) {
      placeholder += ` (max: ${max})`;
    }
    
    return (
      <div className="property-input-control">
        <AngryTextBox
          id={`property-${property.propertyName}`}
          type="text"
          value={numberValue}
          onChange={handleNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          className={error ? 'has-error' : ''}
        />
      </div>
    );
  };

  const renderBooleanInput = () => {
    // Handle boolean value - convert to boolean, with default value support
    let booleanValue = false;
    
    if (value !== null && value !== undefined) {
      // Handle existing value
      booleanValue = Boolean(value);
    } else if (property.defaultValue !== null && property.defaultValue !== undefined) {
      // Apply default value if no value is set
      booleanValue = Boolean(property.defaultValue);
    }
    
    // Build label with required indicator if needed
    const label = property.required 
      ? `${property.displayName} *` 
      : property.displayName;
    
    return (
      <div className="property-input-control">
        <AngryCheckBox
          id={`property-${property.propertyName}`}
          checked={booleanValue}
          onChange={(checked) => onChange(checked)}
          label={label}
          disabled={disabled}
          className={error ? 'has-error' : ''}
        />
      </div>
    );
  };

  const renderListInput = () => {
    // Check if we have allowed values for dropdown
    const hasAllowedValues = property.validationRules?.allowedValues && 
                            property.validationRules.allowedValues.length > 0;

    if (hasAllowedValues) {
      // Convert allowed values to AngryComboBox items format
      const comboItems: AngryComboItem[] = property.validationRules!.allowedValues!.map((option) => ({
        text: option.label,
        value: option.value,
      }));

      // Get current value as string
      const currentValue = value !== null && value !== undefined ? String(value) : '';

      return (
        <div className="property-input-control">
          <AngryComboBox
            id={`property-${property.propertyName}`}
            items={comboItems}
            value={currentValue}
            onChange={(newValue) => onChange(newValue)}
            placeholder={`Select ${property.displayName}`}
            disabled={disabled}
            className={error ? 'has-error' : ''}
          />
        </div>
      );
    }

    // Fallback to AngryTextBox for lists without allowed values
    const listValue = value !== null && value !== undefined ? String(value) : '';
    
    return (
      <div className="property-input-control">
        <AngryTextBox
          id={`property-${property.propertyName}`}
          value={listValue}
          onChange={(newValue) => onChange(newValue)}
          placeholder="Enter comma-separated values"
          disabled={disabled}
          className={error ? 'has-error' : ''}
        />
      </div>
    );
  };

  return (
    <div className={`property-input-wrapper ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''}`}>
      {/* Label section - only show for non-boolean types (boolean shows label inline) */}
      {inputType !== 'boolean' && (
        <label htmlFor={`property-${property.propertyName}`} className="property-input-label">
          {property.displayName}
          {property.required && <span className="property-input-required" aria-label="required">*</span>}
        </label>
      )}

      {/* Input control */}
      {renderInput()}

      {/* Help text section */}
      {property.description && (
        <div className="property-input-help-text">
          {property.description}
        </div>
      )}

      {/* Error display section */}
      {error && (
        <div 
          id={`${property.propertyName}-error`}
          className="property-input-error"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
};
