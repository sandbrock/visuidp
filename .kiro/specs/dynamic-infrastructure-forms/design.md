# Design Document: Dynamic Infrastructure Forms

## Overview

The Dynamic Infrastructure Forms feature replaces hardcoded cloud-specific property forms with a flexible, schema-driven approach. By fetching property schemas from the backend and generating forms dynamically, the system becomes more maintainable and allows administrators to add new cloud providers and resource types without requiring frontend code changes.

This design builds upon the existing admin-resource-configuration feature, which provides the backend infrastructure for property schema management. The focus here is on the frontend implementation that consumes these schemas and renders appropriate UI controls.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Components                      │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │  Infrastructure.tsx  │    │   StackForm.tsx          │  │
│  │  (Blueprint Mgmt)    │    │   (Stack Mgmt)           │  │
│  └──────────┬───────────┘    └──────────┬───────────────┘  │
│             │                            │                   │
│             └────────────┬───────────────┘                   │
│                          │                                   │
│                          ▼                                   │
│             ┌────────────────────────┐                       │
│             │ DynamicResourceForm    │                       │
│             │ (Reusable Component)   │                       │
│             └────────────┬───────────┘                       │
│                          │                                   │
│                          ▼                                   │
│             ┌────────────────────────┐                       │
│             │ PropertySchemaService  │                       │
│             │ (Caching & Fetching)   │                       │
│             └────────────┬───────────┘                       │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│  GET /v1/blueprints/resource-schema/{rtId}/{cpId}           │
│  GET /v1/stacks/resource-schema/{rtId}/{cpId}               │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
Infrastructure.tsx
├── Blueprint Form (existing)
└── Resource Management Section
    ├── Resource List (existing)
    └── Resource Form
        ├── Basic Fields (name, description, type)
        ├── Cloud Provider Selector
        └── DynamicResourceForm ← NEW
            ├── PropertyInput (STRING)
            ├── PropertyInput (NUMBER)
            ├── PropertyInput (BOOLEAN)
            └── PropertyInput (LIST)
```

## Components and Interfaces

### 1. New Frontend Component: DynamicResourceForm

**Purpose**: Reusable component that renders form inputs based on property schemas.

**Props Interface**:
```typescript
interface DynamicResourceFormProps {
  resourceTypeId: string;
  cloudProviderId: string;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
  showLabels?: boolean;
}
```

**State Management**:
```typescript
interface DynamicResourceFormState {
  schema: PropertySchema[] | null;
  loading: boolean;
  error: string | null;
  validationErrors: Record<string, string>;
}
```

**Key Methods**:
- `fetchSchema()`: Fetches property schema from backend
- `renderProperty(property: PropertySchema)`: Renders appropriate input control
- `validateProperty(property: PropertySchema, value: unknown)`: Validates a single property
- `validateAll()`: Validates all properties and returns errors
- `handlePropertyChange(propertyName: string, value: unknown)`: Updates property value

### 2. New Service: PropertySchemaService

**Purpose**: Manages fetching and caching of property schemas.

**Interface**:
```typescript
class PropertySchemaService {
  private cache: Map<string, PropertySchema[]>;
  
  async getSchema(
    resourceTypeId: string, 
    cloudProviderId: string,
    context: 'blueprint' | 'stack'
  ): Promise<PropertySchema[]>;
  
  clearCache(): void;
  
  private getCacheKey(
    resourceTypeId: string, 
    cloudProviderId: string,
    context: string
  ): string;
}
```

**Caching Strategy**:
- Cache key format: `{context}:{resourceTypeId}:{cloudProviderId}`
- Cache persists for the session (in-memory)
- Cache is cleared on page refresh or navigation away
- Cache is shared across component instances

### 3. Enhanced Infrastructure Component

**Changes Required**:
1. Remove hardcoded rendering functions:
   - `renderAWSProperties()`
   - `renderAzureProperties()`
   - `renderGCPProperties()`
   - `renderCloudSpecificPropertiesForm()`

2. Replace with DynamicResourceForm:
```typescript
{resourceFormData.cloudProviderId && (
  <DynamicResourceForm
    resourceTypeId={resourceFormData.resourceTypeId}
    cloudProviderId={resourceFormData.cloudProviderId}
    values={resourceFormData.cloudSpecificProperties}
    onChange={(values) => handleResourceFormChange('cloudSpecificProperties', values)}
  />
)}
```

### 4. Property Input Components

**PropertyInput Component**:
```typescript
interface PropertyInputProps {
  property: PropertySchema;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}
```

**Input Type Mapping**:
- `STRING` → AngryTextBox
- `NUMBER` → AngryTextBox with numeric validation
- `BOOLEAN` → AngryCheckBox
- `LIST` (with allowed values) → AngryComboBox
- `LIST` (without allowed values) → AngryTextBox (comma-separated)

## Data Models

### PropertySchema (Frontend Type)

```typescript
interface PropertySchema {
  id: string;
  mappingId: string;
  propertyName: string;
  displayName: string;
  description?: string;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'LIST';
  required: boolean;
  defaultValue?: unknown;
  validationRules?: ValidationRules;
  displayOrder?: number;
}

interface ValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  allowedValues?: Array<{ value: string; label: string }>;
  minLength?: number;
  maxLength?: number;
}
```

### API Response Format

**GET /v1/blueprints/resource-schema/{resourceTypeId}/{cloudProviderId}**

Response:
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
          { "value": "STANDARD_IA", "label": "Standard-IA" },
          { "value": "ONEZONE_IA", "label": "One Zone-IA" },
          { "value": "GLACIER", "label": "Glacier" },
          { "value": "DEEP_ARCHIVE", "label": "Glacier Deep Archive" },
          { "value": "INTELLIGENT_TIERING", "label": "Intelligent-Tiering" }
        ]
      },
      "displayOrder": 1
    },
    {
      "id": "uuid",
      "mappingId": "uuid",
      "propertyName": "versioning",
      "displayName": "Versioning Status",
      "description": "Enable versioning to keep multiple versions of objects",
      "dataType": "LIST",
      "required": true,
      "defaultValue": "Enabled",
      "validationRules": {
        "allowedValues": [
          { "value": "Enabled", "label": "Enabled" },
          { "value": "Suspended", "label": "Suspended" },
          { "value": "Disabled", "label": "Disabled" }
        ]
      },
      "displayOrder": 2
    },
    {
      "id": "uuid",
      "mappingId": "uuid",
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
  ]
}
```

## Error Handling

### Schema Loading Errors

**Scenario**: API call to fetch property schema fails

**Handling**:
1. Display error message in DynamicResourceForm: "Unable to load property configuration. Please try again."
2. Provide retry button
3. Log error to console for debugging
4. Allow user to continue without cloud-specific properties (if not required)

**UI State**:
```typescript
{error && (
  <div className="error-message">
    <p>Unable to load property configuration.</p>
    <button onClick={fetchSchema}>Retry</button>
  </div>
)}
```

### Validation Errors

**Scenario**: User enters invalid value for a property

**Handling**:
1. Display inline error message below input control
2. Highlight input control with error styling
3. Prevent form submission
4. Clear error when user corrects input

**Error Message Format**:
- Required field: "{displayName} is required"
- Min/max violation: "{displayName} must be between {min} and {max}"
- Pattern violation: "{displayName} format is invalid"
- Allowed values violation: "{displayName} must be one of: {allowedValues}"

### No Schema Defined

**Scenario**: No property schema exists for the selected Resource Type and Cloud Provider

**Handling**:
1. Display informational message: "No cloud-specific properties are configured for this resource type and cloud provider."
2. Allow user to save resource without cloud-specific properties
3. Provide guidance: "Contact your administrator if you need to configure additional properties."

**UI State**:
```typescript
{schema && schema.length === 0 && (
  <div className="info-message">
    <p>No cloud-specific properties are configured for this resource type and cloud provider.</p>
    <p className="help-text">Contact your administrator if you need to configure additional properties.</p>
  </div>
)}
```

## Testing Strategy

### Unit Tests

**DynamicResourceForm Component**
- Test rendering with empty schema
- Test rendering with various property types (STRING, NUMBER, BOOLEAN, LIST)
- Test property value changes
- Test validation for required fields
- Test validation for min/max rules
- Test validation for pattern rules
- Test default value application
- Test error display
- Test loading state
- Test error state

**PropertySchemaService**
- Test schema fetching
- Test caching behavior
- Test cache key generation
- Test cache clearing
- Test error handling

**PropertyInput Component**
- Test rendering for each data type
- Test value changes
- Test validation
- Test error display
- Test disabled state

### Integration Tests

**Infrastructure Component with DynamicResourceForm**
- Test creating a new resource with dynamic properties
- Test editing an existing resource with dynamic properties
- Test switching cloud providers (schema changes)
- Test switching resource types (schema changes)
- Test form submission with valid data
- Test form submission with invalid data (validation errors)

**API Integration**
- Test fetching schema from backend
- Test handling 404 (no schema defined)
- Test handling 500 (server error)
- Test caching behavior across multiple component instances

### End-to-End Tests

**Complete Resource Configuration Workflow**
1. Admin configures property schema for AWS Storage
2. Developer creates Blueprint
3. Developer adds Storage resource
4. Developer selects AWS as cloud provider
5. Dynamic form loads with AWS Storage properties
6. Developer fills in properties
7. Developer saves resource
8. Verify resource is saved with correct cloud-specific properties

**Theme Consistency Test**
1. Load Infrastructure component in light theme
2. Verify dynamic form styling matches theme
3. Toggle to dark theme
4. Verify dynamic form styling updates correctly

## UI Design

### DynamicResourceForm Layout

```
┌─────────────────────────────────────────────────────────┐
│ Cloud-Specific Properties                               │
│ ─────────────────────────────────────────────────────── │
│                                                          │
│ Storage Class *                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Standard                                         ▼  │ │
│ └─────────────────────────────────────────────────────┘ │
│ The storage class for the S3 bucket                     │
│                                                          │
│ Versioning Status *                                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Enabled                                          ▼  │ │
│ └─────────────────────────────────────────────────────┘ │
│ Enable versioning to keep multiple versions of objects  │
│                                                          │
│ Lifecycle Transition Days                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 90                                                   │ │
│ └─────────────────────────────────────────────────────┘ │
│ Number of days before transitioning objects (1-3650)    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Visual Indicators

**Required Fields**: Asterisk (*) next to label
**Help Text**: Smaller, lighter text below input
**Validation Errors**: Red border on input, red error text below
**Loading State**: Spinner with "Loading properties..." text
**Empty State**: Informational message with guidance

### Theme Support

**CSS Variables Used**:
- `--bg-primary`: Form background
- `--bg-secondary`: Input backgrounds
- `--text-primary`: Labels and values
- `--text-secondary`: Help text
- `--border-color`: Input borders
- `--error-color`: Validation errors
- `--primary-color`: Focus states

## Implementation Approach

### Phase 1: Create DynamicResourceForm Component
1. Create component file and basic structure
2. Implement PropertySchemaService for fetching and caching
3. Implement property rendering logic for each data type
4. Implement validation logic
5. Add loading and error states

### Phase 2: Create PropertyInput Components
1. Create PropertyInput component with type-specific rendering
2. Implement validation for each data type
3. Add error display
4. Add help text display
5. Ensure theme compatibility

### Phase 3: Integrate with Infrastructure Component
1. Import DynamicResourceForm
2. Replace hardcoded cloud-specific property forms
3. Update resource form data handling
4. Remove old rendering functions

### Phase 4: Add API Service Methods
1. Add getResourceSchema method to apiService
2. Implement error handling
3. Add TypeScript types for schema response

### Phase 5: Testing and Refinement
1. Write unit tests
2. Write integration tests
3. Perform manual testing with various resource types and cloud providers
4. Test theme switching
5. Test validation scenarios
6. Optimize performance (caching, rendering)

## Data Handling

### Loading Existing Resources

**Scenario**: Loading an existing Blueprint resource for editing

**Approach**:
1. DynamicResourceForm will load existing property values from `cloudSpecificProperties`
2. If a property exists in the schema but not in the data, it will use the default value
3. When saving, only schema-defined properties will be saved

**Data Strategy**:
- Property values are loaded from `cloudSpecificProperties` object
- Only properties defined in the current schema are displayed and saved
- Default values are applied for missing properties when creating new resources

### Default Value Type Handling

**Issue**: Default values must be stored with correct JSON types in the database to ensure proper display in form controls.

**Type-Specific Storage**:
- **STRING properties**: Store as JSON string: `'"value"'` or `'value'`
- **NUMBER properties**: Store as JSON number: `1` or `10.5` (NOT `'"1"'` or `'"10.5"'`)
- **BOOLEAN properties**: Store as JSON boolean: `true` or `false` (NOT `'"true"'` or `'"false"'`)
- **LIST properties**: Store as JSON string: `'"STANDARD"'` (the value from allowedValues)

**Example Database Values**:
```sql
-- CORRECT: NUMBER default value stored as JSON number
default_value = '1'

-- INCORRECT: NUMBER default value stored as JSON string
default_value = '"1"'  -- This will display with quotation marks in the UI

-- CORRECT: STRING default value stored as JSON string
default_value = '"my-bucket"'

-- CORRECT: BOOLEAN default value stored as JSON boolean
default_value = 'true'
```

**Frontend Handling**:
- The frontend receives default values from the backend API
- For NUMBER properties, the value should be a JavaScript number type
- The PropertyInput component converts the number to string for display in the text input
- When the user doesn't modify the field, the numeric value is preserved without quotation marks

## Performance Considerations

### Schema Caching

**Strategy**: In-memory cache with session lifetime
**Benefits**:
- Reduces API calls
- Improves form loading speed
- Reduces server load

**Cache Invalidation**:
- Page refresh clears cache
- Navigation away and back clears cache
- Manual cache clear method available

### Lazy Loading

**Strategy**: Fetch schema only when cloud provider is selected
**Benefits**:
- Reduces initial load time
- Avoids unnecessary API calls
- Improves perceived performance

### Rendering Optimization

**Strategy**: Use React.memo for PropertyInput components
**Benefits**:
- Prevents unnecessary re-renders
- Improves form responsiveness
- Reduces CPU usage

## Security Considerations

### Input Validation

**Client-Side**: Validate all inputs against schema rules
**Server-Side**: Backend must also validate (client-side is for UX only)
**XSS Prevention**: Sanitize all user inputs before rendering

### Schema Integrity

**Trust**: Frontend trusts schema from backend (admin-configured)
**Validation**: Backend validates schema structure before serving
**Authorization**: Only admins can modify schemas

## Design Decisions and Rationales

### Reusable Component Approach

**Decision**: Create DynamicResourceForm as a reusable component

**Rationale**:
- Can be used in both Blueprint and Stack resource configuration
- Reduces code duplication
- Easier to maintain and test
- Consistent behavior across the application

### Schema Caching

**Decision**: Implement in-memory caching for property schemas

**Rationale**:
- Reduces API calls and improves performance
- Schemas change infrequently (admin-configured)
- Session-based cache is sufficient (no need for persistent storage)
- Simple to implement and maintain

### Separate PropertyInput Component

**Decision**: Create a separate component for rendering individual properties

**Rationale**:
- Encapsulates property-specific logic
- Easier to test individual property types
- Allows for property-specific optimizations (React.memo)
- Cleaner code organization

### Validation on Client and Server

**Decision**: Implement validation on both client and server

**Rationale**:
- Client-side validation provides immediate feedback (better UX)
- Server-side validation ensures data integrity (security)
- Follows best practices for web applications

### Schema-Only Property Management

**Decision**: Only save and display properties defined in the current schema

**Rationale**:
- Simplifies implementation and maintenance
- Ensures data consistency with admin configuration
- Eliminates confusion from legacy properties
- Provides clean separation between schema-defined and ad-hoc properties

### Theme-Aware Styling

**Decision**: Use CSS variables for all styling in dynamic forms

**Rationale**:
- Ensures consistency with existing application theme
- Supports light and dark modes automatically
- Easier to maintain (centralized theme definitions)
- Follows existing patterns in the codebase
