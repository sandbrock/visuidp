# Dynamic Infrastructure Forms - Documentation Index

This document provides an index of all documentation created for the Dynamic Infrastructure Forms feature.

## User Documentation

### Primary Documentation

- **[Dynamic Infrastructure Forms Guide](../../../idp-ui/docs/DYNAMIC_INFRASTRUCTURE_FORMS.md)**
  - Comprehensive guide covering all aspects of the feature
  - Component usage examples
  - Property schema configuration
  - Integration guide
  - Troubleshooting
  - API reference

### Quick Reference

- **[Quick Reference Guide](../../../idp-ui/docs/DYNAMIC_FORMS_QUICK_REFERENCE.md)**
  - Quick start examples
  - Common patterns
  - CSS classes reference
  - Testing examples
  - Troubleshooting tips

## Architecture Documentation

- **[Frontend Architecture](../../../idp-ui/docs/ARCHITECTURE.md)**
  - Updated to include Dynamic Infrastructure Forms section
  - Component hierarchy
  - Data flow

- **[Frontend README](../../../idp-ui/README.md)**
  - Updated to reference Dynamic Infrastructure Forms documentation

## Component Documentation

### DynamicResourceForm Component

**Location**: `idp-ui/src/components/DynamicResourceForm.tsx`

**JSDoc Documentation**: Comprehensive inline documentation including:
- Component purpose and features
- Props interface with detailed descriptions
- Ref interface for validation methods
- Usage examples
- Link to full documentation

**Key Features**:
- Automatic schema fetching and caching
- Support for STRING, NUMBER, BOOLEAN, and LIST property types
- Built-in validation
- Loading, error, and empty states
- Theme-aware styling

**Props**:
```typescript
interface DynamicResourceFormProps {
  resourceTypeId: string;        // UUID of resource type
  cloudProviderId: string;       // UUID of cloud provider
  values: Record<string, unknown>; // Current property values
  onChange: (values: Record<string, unknown>) => void; // Change handler
  disabled?: boolean;            // Disable all inputs
  showLabels?: boolean;          // Show property labels
  context?: 'blueprint' | 'stack'; // Context for schema fetching
  userEmail?: string;            // Optional user email
  isEditMode?: boolean;          // Edit vs create mode
}
```

### PropertyInput Component

**Location**: `idp-ui/src/components/PropertyInput.tsx`

**JSDoc Documentation**: Comprehensive inline documentation including:
- Component purpose and features
- Props interface with detailed descriptions
- Supported property types
- Usage examples
- Link to full documentation

**Key Features**:
- Type-specific input controls
- Inline validation error display
- Help text from property description
- Required field indicator
- Theme-aware styling

**Props**:
```typescript
interface PropertyInputProps {
  property: PropertySchema;      // Property schema definition
  value: unknown;                // Current property value
  onChange: (value: unknown) => void; // Change handler
  error?: string;                // Validation error message
  disabled?: boolean;            // Disable input
}
```

### PropertySchemaService

**Location**: `idp-ui/src/services/PropertySchemaService.ts`

**JSDoc Documentation**: Comprehensive inline documentation including:
- Service purpose and features
- Method signatures with detailed descriptions
- Parameter descriptions
- Return types and error handling
- Usage examples

**Key Features**:
- Schema fetching from backend API
- In-memory caching with configurable keys
- Cache invalidation methods
- Error handling for 404 and 500 responses

**API**:
```typescript
class PropertySchemaService {
  async getSchema(
    resourceTypeId: string,
    cloudProviderId: string,
    context: 'blueprint' | 'stack',
    userEmail?: string
  ): Promise<PropertySchema[]>;
  
  clearCache(): void;
  
  clearSchemaCache(
    resourceTypeId: string,
    cloudProviderId: string,
    context: 'blueprint' | 'stack'
  ): void;
}
```

## Property Schema Structure

### PropertySchema Interface

**Location**: `idp-ui/src/types/admin.ts`

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
  displayOrder?: number;         // Sort order
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

## Integration Examples

### Infrastructure Component Integration

**Location**: `idp-ui/src/components/Infrastructure.tsx`

The Infrastructure component has been updated to use DynamicResourceForm:

```typescript
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

### StackForm Component Integration

**Location**: `idp-ui/src/components/StackForm.tsx`

The StackForm component has been updated to use DynamicResourceForm:

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
    context="stack"
  />
)}
```

## Testing Documentation

### Unit Tests

- **PropertyInput Tests**: `idp-ui/src/components/PropertyInput.test.tsx`
  - Tests for all property types (STRING, NUMBER, BOOLEAN, LIST)
  - Validation error display
  - Help text display
  - Required field indicator

- **PropertyInput Theme Tests**: `idp-ui/src/components/PropertyInput.theme.test.tsx`
  - Theme-specific styling tests
  - Light/dark mode compatibility

- **DynamicResourceForm Tests**: `idp-ui/src/components/DynamicResourceForm.test.tsx`
  - Schema fetching and caching
  - Property rendering
  - Validation logic
  - Loading and error states

- **DynamicResourceForm Validation Tests**: `idp-ui/src/components/DynamicResourceForm.validation.test.tsx`
  - Required field validation
  - Min/max validation
  - Pattern validation
  - Allowed values validation

- **PropertySchemaService Tests**: `idp-ui/src/services/PropertySchemaService.test.ts`
  - Schema fetching
  - Caching behavior
  - Cache key generation
  - Error handling

### Integration Tests

- **Infrastructure Integration Tests**: `idp-ui/src/components/Infrastructure.integration.test.tsx`
  - Creating Blueprint resources with dynamic properties
  - Editing existing resources
  - Switching cloud providers
  - Form submission with validation

- **StackForm Integration Tests**: `idp-ui/src/components/StackForm.integration.test.tsx`
  - Creating Stack resources with dynamic properties
  - Validation and error handling

## API Documentation

### Backend Endpoints

#### Get Blueprint Resource Schema

```
GET /v1/blueprints/resource-schema/{resourceTypeId}/{cloudProviderId}
```

Returns property schema for Blueprint resource configuration.

#### Get Stack Resource Schema

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

## Styling Documentation

### CSS Files

- **DynamicResourceForm.css**: `idp-ui/src/components/DynamicResourceForm.css`
  - Form container styles
  - Loading state styles
  - Error state styles
  - Empty state styles

- **PropertyInput.css**: `idp-ui/src/components/PropertyInput.css`
  - Input container styles
  - Label styles
  - Help text styles
  - Error message styles
  - Required indicator styles

### CSS Variables

The components use CSS variables for theme-aware styling:

```css
--bg-primary          /* Primary background color */
--bg-secondary        /* Secondary background color */
--text-primary        /* Primary text color */
--text-secondary      /* Secondary text color */
--border-color        /* Border color */
--error-color         /* Error message color */
--primary-color       /* Primary accent color */
```

## Related Backend Documentation

- **[Admin Resource Configuration](../../../idp-api/docs/ADMIN_RESOURCE_CONFIGURATION.md)**
  - Backend API for managing property schemas
  - Property schema CRUD operations
  - Resource type cloud mapping management

## Spec Documentation

### Requirements

- **[Requirements Document](./requirements.md)**
  - User stories and acceptance criteria
  - EARS-compliant requirements
  - Glossary of terms

### Design

- **[Design Document](./design.md)**
  - Architecture overview
  - Component design
  - Data models
  - Error handling strategy
  - Testing strategy

### Implementation

- **[Tasks Document](./tasks.md)**
  - Implementation plan
  - Task breakdown
  - Requirement traceability

### Testing

- **[Manual Testing Guide](./MANUAL_TESTING_GUIDE.md)**
  - Manual testing procedures
  - Test scenarios
  - Expected results

- **[Manual Testing Summary](./MANUAL_TESTING_SUMMARY.md)**
  - Test execution results
  - Issues found and resolved

## Documentation Maintenance

### Updating Documentation

When making changes to the Dynamic Infrastructure Forms feature:

1. Update inline JSDoc comments in component files
2. Update the main documentation guide if behavior changes
3. Update the quick reference guide if API changes
4. Update test documentation if test patterns change
5. Update this index if new documentation is added

### Documentation Review

Documentation should be reviewed:
- When new features are added
- When bugs are fixed that affect documented behavior
- When user feedback indicates confusion
- Quarterly as part of regular maintenance

## Support and Feedback

For questions or issues with the documentation:
1. Check the troubleshooting sections in the main guide
2. Review the quick reference for common patterns
3. Check inline JSDoc comments in component files
4. Contact the development team

---

**Last Updated**: November 10, 2025
**Maintained By**: IDP Development Team
