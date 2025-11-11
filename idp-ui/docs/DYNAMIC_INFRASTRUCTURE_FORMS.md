# Dynamic Infrastructure Forms

## Overview

The Dynamic Infrastructure Forms feature provides a flexible, schema-driven approach to rendering cloud-specific property forms. Instead of hardcoding forms for each cloud provider and resource type combination, the system fetches property schemas from the backend and dynamically generates appropriate UI controls.

This approach enables administrators to add new cloud providers and resource types without requiring frontend code changes, making the system more maintainable and extensible.

## Architecture

### Component Hierarchy

```
Infrastructure.tsx / StackForm.tsx
└── DynamicResourceForm
    ├── PropertyInput (STRING)
    ├── PropertyInput (NUMBER)
    ├── PropertyInput (BOOLEAN)
    └── PropertyInput (LIST)
```

### Data Flow

```
1. User selects Resource Type + Cloud Provider
2. DynamicResourceForm fetches schema from backend
3. PropertySchemaService caches schema
4. DynamicResourceForm renders PropertyInput components
5. User enters values
6. Validation occurs on change
7. Values passed back to parent component
```

## Components

### DynamicResourceForm

The main component that orchestrates schema fetching, property rendering, and validation.

#### Props

```typescript
interface DynamicResourceFormProps {
  resourceTypeId: string;        // UUID of the resource type
  cloudProviderId: string;       // UUID of the cloud provider
  values: Record<string, unknown>; // Current property values
  onChange: (values: Record<string, unknown>) => void; // Value change handler
  disabled?: boolean;            // Disable all inputs
  showLabels?: boolean;          // Show property labels (default: true)
}
```

#### Usage Example

```typescript
import DynamicResourceForm from './DynamicResourceForm';

function MyComponent() {
  const [properties, setProperties] = useState({});

  return (
    <DynamicResourceForm
      resourceTypeId="uuid-of-storage-type"
      cloudProviderId="uuid-of-aws-provider"
      values={properties}
      onChange={setProperties}
    />
  );
}
```

#### Features

- **Automatic Schema Fetching**: Fetches property schema when resource type or cloud provider changes
- **Schema Caching**: Uses PropertySchemaService to cache schemas and minimize API calls
- **Loading States**: Displays spinner while fetching schema
- **Error Handling**: Shows error message with retry button on fetch failure
- **Empty State**: Displays informative message when no properties are configured
- **Validation**: Validates all properties against schema rules
- **Theme Support**: Respects light/dark theme via CSS variables

#### State Management

The component manages the following internal state:

- `schema`: Array of property schemas fetched from backend
- `loading`: Boolean indicating schema fetch in progress
- `error`: Error message if schema fetch fails
- `validationErrors`: Map of property names to error messages

### PropertyInput

A specialized component that renders the appropriate input control based on property data type.

#### Props

```typescript
interface PropertyInputProps {
  property: PropertySchema;      // Property schema definition
  value: unknown;                // Current property value
  onChange: (value: unknown) => void; // Value change handler
  error?: string;                // Validation error message
  disabled?: boolean;            // Disable input
}
```

#### Usage Example

```typescript
import PropertyInput from './PropertyInput';

function MyForm() {
  const property = {
    propertyName: 'storageClass',
    displayName: 'Storage Class',
    description: 'The storage class for the S3 bucket',
    dataType: 'LIST',
    required: true,
    validationRules: {
      allowedValues: [
        { value: 'STANDARD', label: 'Standard' },
        { value: 'GLACIER', label: 'Glacier' }
      ]
    }
  };

  const [value, setValue] = useState('STANDARD');

  return (
    <PropertyInput
      property={property}
      value={value}
      onChange={setValue}
    />
  );
}
```

#### Input Type Mapping

| Data Type | Input Control | Validation |
|-----------|--------------|------------|
| STRING | AngryTextBox | pattern, minLength, maxLength |
| NUMBER | AngryTextBox (numeric) | min, max, numeric only |
| BOOLEAN | AngryCheckBox | N/A |
| LIST (with allowedValues) | AngryComboBox | value in allowedValues |
| LIST (without allowedValues) | AngryTextBox | N/A |

#### Features

- **Type-Specific Rendering**: Automatically selects appropriate input control
- **Validation Display**: Shows inline error messages
- **Help Text**: Displays property description below input
- **Required Indicator**: Shows asterisk (*) for required fields
- **Theme Support**: Uses CSS variables for consistent styling

## Services

### PropertySchemaService

A service class that manages fetching and caching of property schemas.

#### API

```typescript
class PropertySchemaService {
  /**
   * Fetches property schema for a resource type and cloud provider combination.
   * Results are cached to minimize API calls.
   * 
   * @param resourceTypeId - UUID of the resource type
   * @param cloudProviderId - UUID of the cloud provider
   * @param context - Context for the schema ('blueprint' or 'stack')
   * @returns Promise resolving to array of property schemas
   */
  async getSchema(
    resourceTypeId: string,
    cloudProviderId: string,
    context: 'blueprint' | 'stack'
  ): Promise<PropertySchema[]>;

  /**
   * Clears all cached schemas.
   * Useful for testing or forcing a refresh.
   */
  clearCache(): void;
}
```

#### Usage Example

```typescript
import PropertySchemaService from '../services/PropertySchemaService';

const schemaService = new PropertySchemaService();

// Fetch schema for Blueprint context
const schema = await schemaService.getSchema(
  'resource-type-uuid',
  'cloud-provider-uuid',
  'blueprint'
);

// Schema is now cached - subsequent calls return cached version
const cachedSchema = await schemaService.getSchema(
  'resource-type-uuid',
  'cloud-provider-uuid',
  'blueprint'
);

// Clear cache if needed
schemaService.clearCache();
```

#### Caching Strategy

- **Cache Key Format**: `{context}:{resourceTypeId}:{cloudProviderId}`
- **Cache Lifetime**: Session-based (in-memory)
- **Cache Invalidation**: Cleared on page refresh or manual call to `clearCache()`
- **Shared Cache**: All component instances share the same cache

#### Error Handling

The service handles the following error scenarios:

- **404 Not Found**: Returns empty array (no schema configured)
- **500 Server Error**: Throws error with message
- **Network Error**: Throws error with message

## Property Schema Structure

### PropertySchema Interface

```typescript
interface PropertySchema {
  id: string;                    // Unique identifier
  mappingId: string;             // Resource type cloud mapping ID
  propertyName: string;          // Property key name
  displayName: string;           // Human-readable label
  description?: string;          // Help text
  dataType: PropertyDataType;    // STRING | NUMBER | BOOLEAN | LIST
  required: boolean;             // Is property required?
  defaultValue?: unknown;        // Default value
  validationRules?: ValidationRules; // Validation constraints
  displayOrder?: number;         // Sort order (lower = first)
}
```

### ValidationRules Interface

```typescript
interface ValidationRules {
  min?: number;                  // Minimum value (NUMBER)
  max?: number;                  // Maximum value (NUMBER)
  pattern?: string;              // Regex pattern (STRING)
  allowedValues?: Array<{        // Dropdown options (LIST)
    value: string;
    label: string;
  }>;
  minLength?: number;            // Minimum length (STRING)
  maxLength?: number;            // Maximum length (STRING)
}
```

## Property Schema Configuration Examples

### Example 1: AWS S3 Storage Class (LIST with Allowed Values)

```json
{
  "propertyName": "storageClass",
  "displayName": "Storage Class",
  "description": "The storage class for the S3 bucket",
  "dataType": "LIST",
  "required": true,
  "defaultValue": "STANDARD",
  "validationRules": {
    "allowedValues": [
      { "value": "STANDARD", "label": "Standard" },
      { "value": "STANDARD_IA", "label": "Standard-IA" },
      { "value": "ONEZONE_IA", "label": "One Zone-IA" },
      { "value": "GLACIER", "label": "Glacier" },
      { "value": "DEEP_ARCHIVE", "label": "Glacier Deep Archive" },
      { "value": "INTELLIGENT_TIERING", "label": "Intelligent-Tiering" }
    ]
  },
  "displayOrder": 1
}
```

### Example 2: Versioning Status (BOOLEAN)

```json
{
  "propertyName": "versioningEnabled",
  "displayName": "Enable Versioning",
  "description": "Keep multiple versions of objects in the bucket",
  "dataType": "BOOLEAN",
  "required": false,
  "defaultValue": true,
  "displayOrder": 2
}
```

### Example 3: Lifecycle Days (NUMBER with Min/Max)

```json
{
  "propertyName": "lifecycleDays",
  "displayName": "Lifecycle Transition Days",
  "description": "Number of days before transitioning objects to a different storage class",
  "dataType": "NUMBER",
  "required": false,
  "validationRules": {
    "min": 1,
    "max": 3650
  },
  "displayOrder": 3
}
```

### Example 4: Bucket Name Pattern (STRING with Regex)

```json
{
  "propertyName": "bucketNamePrefix",
  "displayName": "Bucket Name Prefix",
  "description": "Prefix for the S3 bucket name (lowercase letters, numbers, and hyphens only)",
  "dataType": "STRING",
  "required": true,
  "validationRules": {
    "pattern": "^[a-z0-9-]+$",
    "minLength": 3,
    "maxLength": 20
  },
  "displayOrder": 4
}
```

## Integration Guide

### Integrating into Infrastructure Component

The Infrastructure component has been updated to use DynamicResourceForm instead of hardcoded cloud-specific forms.

#### Before (Hardcoded)

```typescript
// Old approach - hardcoded for each cloud provider
const renderCloudSpecificPropertiesForm = () => {
  if (cloudProviderId === AWS_ID) {
    return renderAWSProperties();
  } else if (cloudProviderId === AZURE_ID) {
    return renderAzureProperties();
  } else if (cloudProviderId === GCP_ID) {
    return renderGCPProperties();
  }
  return null;
};
```

#### After (Dynamic)

```typescript
// New approach - dynamic based on schema
{resourceFormData.cloudProviderId && (
  <DynamicResourceForm
    resourceTypeId={resourceFormData.resourceTypeId}
    cloudProviderId={resourceFormData.cloudProviderId}
    values={resourceFormData.cloudSpecificProperties}
    onChange={(values) => 
      handleResourceFormChange('cloudSpecificProperties', values)
    }
  />
)}
```

### Integrating into StackForm Component

Similar integration pattern for Stack resource configuration:

```typescript
{selectedResource.resourceTypeId && selectedResource.cloudProviderId && (
  <DynamicResourceForm
    resourceTypeId={selectedResource.resourceTypeId}
    cloudProviderId={selectedResource.cloudProviderId}
    values={selectedResource.cloudSpecificProperties || {}}
    onChange={(values) => {
      setSelectedResource({
        ...selectedResource,
        cloudSpecificProperties: values
      });
    }}
  />
)}
```

## Validation

### Client-Side Validation

The DynamicResourceForm component performs client-side validation for:

- **Required Fields**: Ensures all required properties have values
- **Number Ranges**: Validates min/max constraints for NUMBER properties
- **String Patterns**: Validates regex patterns for STRING properties
- **Allowed Values**: Ensures LIST values are in the allowed set
- **String Length**: Validates minLength/maxLength for STRING properties

### Validation Error Display

Validation errors are displayed inline below each input control:

```
Property Name *
┌─────────────────────────────────────┐
│ [invalid value]                     │ ← Red border
└─────────────────────────────────────┘
⚠ Property Name must be between 1 and 100 ← Error message
```

### Preventing Form Submission

The parent component should call a validation method before submission:

```typescript
const handleSubmit = () => {
  // Validate dynamic properties
  const errors = validateDynamicProperties();
  
  if (Object.keys(errors).length > 0) {
    // Show errors, prevent submission
    return;
  }
  
  // Proceed with submission
  submitForm();
};
```

## Styling and Theming

### CSS Variables

The components use CSS variables for theme-aware styling:

```css
.dynamic-resource-form {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.property-input-error {
  color: var(--error-color);
  border-color: var(--error-color);
}

.property-input-help {
  color: var(--text-secondary);
  font-size: 0.875rem;
}
```

### Theme Support

The components automatically adapt to light and dark themes:

- **Light Theme**: Uses light backgrounds, dark text
- **Dark Theme**: Uses dark backgrounds, light text
- **Theme Toggle**: Changes apply immediately without page refresh

## Error Handling

### Schema Loading Errors

When schema fetching fails, the component displays:

```
⚠ Unable to load property configuration.
  [Retry Button]
```

Users can click the retry button to attempt fetching again.

### No Schema Configured

When no properties are defined for a resource type and cloud provider:

```
ℹ No cloud-specific properties are configured for this 
  resource type and cloud provider.
  
  Contact your administrator if you need to configure 
  additional properties.
```

### Validation Errors

Validation errors are displayed inline with specific messages:

- "Storage Class is required"
- "Lifecycle Days must be between 1 and 3650"
- "Bucket Name Prefix format is invalid"

## Performance Considerations

### Schema Caching

- Schemas are cached after first fetch
- Cache key: `{context}:{resourceTypeId}:{cloudProviderId}`
- Reduces API calls and improves responsiveness
- Cache shared across all component instances

### Lazy Loading

- Schemas are fetched only when needed (cloud provider selected)
- Avoids unnecessary API calls on initial page load

### Rendering Optimization

- PropertyInput components use React.memo to prevent unnecessary re-renders
- Only re-render when props change

## Testing

### Unit Tests

Test files are located in `idp-ui/src/components/`:

- `PropertyInput.test.tsx` - Tests for PropertyInput component
- `PropertyInput.theme.test.tsx` - Theme-specific tests
- `DynamicResourceForm.test.tsx` - Tests for DynamicResourceForm
- `DynamicResourceForm.validation.test.tsx` - Validation tests
- `PropertySchemaService.test.ts` - Service layer tests

### Integration Tests

- `Infrastructure.integration.test.tsx` - Tests Infrastructure component integration
- `StackForm.integration.test.tsx` - Tests StackForm component integration

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test PropertyInput.test.tsx

# Run tests in watch mode
npm test -- --watch
```

## Troubleshooting

### Schema Not Loading

**Problem**: Dynamic form shows loading spinner indefinitely

**Solutions**:
1. Check browser console for API errors
2. Verify resource type and cloud provider IDs are valid UUIDs
3. Ensure backend API is running and accessible
4. Check network tab for failed requests

### Properties Not Displaying

**Problem**: Form is empty even though schema exists

**Solutions**:
1. Verify schema has properties array with items
2. Check that properties have valid dataType values
3. Ensure displayOrder is set (properties are sorted by this field)
4. Clear cache: `PropertySchemaService.clearCache()`

### Validation Not Working

**Problem**: Invalid values are accepted

**Solutions**:
1. Verify validationRules are defined in schema
2. Check that validation logic matches data type
3. Ensure parent component checks validation before submission
4. Review browser console for validation errors

### Theme Not Applied

**Problem**: Components don't match application theme

**Solutions**:
1. Verify CSS variables are defined in global styles
2. Check that ThemeContext is properly configured
3. Ensure component CSS files are imported
4. Test theme toggle functionality

## API Endpoints

### Get Blueprint Resource Schema

```
GET /v1/blueprints/resource-schema/{resourceTypeId}/{cloudProviderId}
```

Returns property schema for Blueprint resource configuration.

### Get Stack Resource Schema

```
GET /v1/stacks/resource-schema/{resourceTypeId}/{cloudProviderId}
```

Returns property schema for Stack resource configuration.

### Response Format

```json
{
  "resourceTypeId": "uuid",
  "resourceTypeName": "Storage",
  "cloudProviderId": "uuid",
  "cloudProviderName": "AWS",
  "properties": [
    {
      "id": "uuid",
      "mappingId": "uuid",
      "propertyName": "storageClass",
      "displayName": "Storage Class",
      "description": "The storage class for the S3 bucket",
      "dataType": "LIST",
      "required": true,
      "defaultValue": "STANDARD",
      "validationRules": {
        "allowedValues": [
          { "value": "STANDARD", "label": "Standard" },
          { "value": "GLACIER", "label": "Glacier" }
        ]
      },
      "displayOrder": 1
    }
  ]
}
```

## Migration Guide

### Migrating from Hardcoded Forms

If you have existing hardcoded cloud-specific forms, follow these steps:

1. **Identify Hardcoded Properties**: List all properties currently hardcoded
2. **Create Property Schemas**: Use admin UI to configure schemas
3. **Replace Form Code**: Replace hardcoded forms with DynamicResourceForm
4. **Test Thoroughly**: Verify all properties render and validate correctly
5. **Remove Old Code**: Delete hardcoded rendering functions

### Example Migration

**Before**:
```typescript
const renderAWSProperties = () => (
  <div>
    <label>Storage Class</label>
    <select value={storageClass} onChange={...}>
      <option value="STANDARD">Standard</option>
      <option value="GLACIER">Glacier</option>
    </select>
  </div>
);
```

**After**:
```typescript
<DynamicResourceForm
  resourceTypeId={resourceTypeId}
  cloudProviderId={cloudProviderId}
  values={properties}
  onChange={setProperties}
/>
```

## Best Practices

1. **Always Validate**: Check validation errors before form submission
2. **Handle Empty State**: Provide clear messaging when no schema exists
3. **Use Caching**: Let PropertySchemaService handle caching automatically
4. **Test Theme Support**: Verify components work in both light and dark themes
5. **Provide Help Text**: Include descriptions for all properties in schema
6. **Set Display Order**: Use displayOrder to control property sequence
7. **Use Default Values**: Provide sensible defaults for optional properties
8. **Clear Error Messages**: Write user-friendly validation error messages

## Related Documentation

- [Admin Resource Configuration](../../idp-api/docs/ADMIN_RESOURCE_CONFIGURATION.md) - Backend schema management
- [Architecture](./ARCHITECTURE.md) - Frontend architecture overview
- [Angry Controls Style Guide](./ANGRY_CONTROLS_STYLE_GUIDE.md) - UI component guidelines

## Support

For issues or questions:
1. Check this documentation
2. Review test files for usage examples
3. Check browser console for errors
4. Contact the development team

---

**Last Updated**: November 10, 2025
**Version**: 1.0.0
