# Dynamic Infrastructure Forms - Quick Reference

## Quick Start

### Using DynamicResourceForm

```typescript
import DynamicResourceForm from './DynamicResourceForm';

<DynamicResourceForm
  resourceTypeId="uuid-of-resource-type"
  cloudProviderId="uuid-of-cloud-provider"
  values={properties}
  onChange={setProperties}
/>
```

### Using PropertyInput

```typescript
import PropertyInput from './PropertyInput';

<PropertyInput
  property={propertySchema}
  value={currentValue}
  onChange={setValue}
  error={validationError}
/>
```

### Using PropertySchemaService

```typescript
import PropertySchemaService from '../services/PropertySchemaService';

const service = new PropertySchemaService();
const schema = await service.getSchema(
  resourceTypeId,
  cloudProviderId,
  'blueprint' // or 'stack'
);
```

## Property Data Types

| Type | Input Control | Example |
|------|--------------|---------|
| STRING | AngryTextBox | `"my-bucket-name"` |
| NUMBER | AngryTextBox (numeric) | `90` |
| BOOLEAN | AngryCheckBox | `true` |
| LIST | AngryComboBox | `"STANDARD"` |

## Validation Rules

### STRING Validation

```json
{
  "validationRules": {
    "pattern": "^[a-z0-9-]+$",
    "minLength": 3,
    "maxLength": 20
  }
}
```

### NUMBER Validation

```json
{
  "validationRules": {
    "min": 1,
    "max": 3650
  }
}
```

### LIST Validation

```json
{
  "validationRules": {
    "allowedValues": [
      { "value": "STANDARD", "label": "Standard" },
      { "value": "GLACIER", "label": "Glacier" }
    ]
  }
}
```

## Common Patterns

### Handling Form Submission

```typescript
const handleSubmit = () => {
  // Validate before submission
  const errors = validateProperties();
  if (Object.keys(errors).length > 0) {
    setValidationErrors(errors);
    return;
  }
  
  // Submit form
  await submitResource({
    ...basicFields,
    cloudSpecificProperties: properties
  });
};
```

### Clearing Cache

```typescript
import PropertySchemaService from '../services/PropertySchemaService';

const service = new PropertySchemaService();
service.clearCache(); // Clear all cached schemas
```

### Error Handling

```typescript
try {
  const schema = await service.getSchema(rtId, cpId, 'blueprint');
  setSchema(schema);
} catch (error) {
  setError('Unable to load property configuration');
  console.error('Schema fetch error:', error);
}
```

## CSS Classes

### DynamicResourceForm

- `.dynamic-resource-form` - Main container
- `.dynamic-resource-form-loading` - Loading state
- `.dynamic-resource-form-error` - Error state
- `.dynamic-resource-form-empty` - Empty state

### PropertyInput

- `.property-input-container` - Property wrapper
- `.property-input-label` - Label element
- `.property-input-required` - Required indicator
- `.property-input-help` - Help text
- `.property-input-error` - Error message

## API Endpoints

### Blueprint Schema

```
GET /v1/blueprints/resource-schema/{resourceTypeId}/{cloudProviderId}
```

### Stack Schema

```
GET /v1/stacks/resource-schema/{resourceTypeId}/{cloudProviderId}
```

## Testing

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react';
import PropertyInput from './PropertyInput';

test('renders STRING property', () => {
  const property = {
    propertyName: 'bucketName',
    displayName: 'Bucket Name',
    dataType: 'STRING',
    required: true
  };
  
  render(
    <PropertyInput
      property={property}
      value=""
      onChange={jest.fn()}
    />
  );
  
  expect(screen.getByLabelText(/Bucket Name/)).toBeInTheDocument();
});
```

### Integration Test Example

```typescript
test('fetches and renders schema', async () => {
  render(
    <DynamicResourceForm
      resourceTypeId="rt-uuid"
      cloudProviderId="cp-uuid"
      values={{}}
      onChange={jest.fn()}
    />
  );
  
  await waitFor(() => {
    expect(screen.getByText(/Storage Class/)).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Schema Not Loading

```typescript
// Check if IDs are valid
console.log('Resource Type ID:', resourceTypeId);
console.log('Cloud Provider ID:', cloudProviderId);

// Check API response
const response = await fetch(
  `/v1/blueprints/resource-schema/${resourceTypeId}/${cloudProviderId}`
);
console.log('Status:', response.status);
console.log('Data:', await response.json());
```

### Validation Not Working

```typescript
// Check validation rules
console.log('Property:', property);
console.log('Validation Rules:', property.validationRules);
console.log('Current Value:', value);

// Manually validate
const error = validateProperty(property, value);
console.log('Validation Error:', error);
```

### Theme Issues

```typescript
// Check CSS variables
const styles = getComputedStyle(document.documentElement);
console.log('--bg-primary:', styles.getPropertyValue('--bg-primary'));
console.log('--text-primary:', styles.getPropertyValue('--text-primary'));
```

## Best Practices

1. ✅ Always validate before submission
2. ✅ Handle loading and error states
3. ✅ Provide clear error messages
4. ✅ Use default values for optional properties
5. ✅ Set displayOrder for consistent property sequence
6. ✅ Include help text for complex properties
7. ✅ Test with both light and dark themes
8. ✅ Clear cache when testing schema changes

## Related Documentation

- [Full Documentation](./DYNAMIC_INFRASTRUCTURE_FORMS.md)
- [Architecture](./ARCHITECTURE.md)
- [Angry Controls Style Guide](./ANGRY_CONTROLS_STYLE_GUIDE.md)

---

**Last Updated**: November 10, 2025
