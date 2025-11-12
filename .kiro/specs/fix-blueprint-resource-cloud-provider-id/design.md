# Design Document

## Overview

This design addresses the cloud provider ID resolution issue in the blueprint resource editing workflow. The root cause is a mismatch between the backend's use of cloud type strings (e.g., "AWS") and the frontend's need for cloud provider UUIDs to fetch property schemas.

The solution involves:
1. Creating a cloud provider lookup service to map cloud type strings to UUIDs
2. Updating the data transformation logic to resolve cloud provider IDs
3. Modifying the BlueprintForm to maintain proper state with resolved UUIDs
4. Ensuring backward compatibility with existing backend API contracts

## Architecture

### Component Interaction Flow

```
Backend API (cloudType: "AWS")
    ↓
transformBlueprintResourceFromBackend()
    ↓
CloudProviderLookupService.resolveCloudProviderId("AWS")
    ↓
BlueprintResource (cloudProviderId: "uuid-123")
    ↓
BlueprintForm (state with UUID)
    ↓
DynamicResourceForm (receives UUID)
    ↓
PropertySchemaService.getSchema(resourceTypeId, UUID, context)
    ↓
API Call: /blueprints/resource-schema/{resourceTypeId}/{UUID}
```

### Key Design Decisions

1. **Centralized Cloud Provider Lookup**: Create a singleton service to manage cloud provider resolution and caching
2. **Lazy Resolution**: Resolve cloud provider IDs only when needed (during transformation from backend)
3. **Graceful Degradation**: If resolution fails, allow the form to load but show appropriate error messages
4. **Maintain Backend Contract**: Continue sending `cloudType` strings to the backend to avoid breaking changes

## Components and Interfaces

### 1. CloudProviderLookupService

**Purpose**: Centralized service for resolving cloud type strings to cloud provider UUIDs

**Location**: `idp-ui/src/services/CloudProviderLookupService.ts`

**Interface**:
```typescript
class CloudProviderLookupService {
  private cloudProviders: CloudProvider[] | null;
  private cloudTypeToIdMap: Map<string, string>;
  
  // Initialize the service with cloud providers
  initialize(providers: CloudProvider[]): void;
  
  // Resolve cloud type string to UUID
  resolveCloudProviderId(cloudType: string): string | null;
  
  // Resolve UUID to cloud type string
  resolveCloudType(cloudProviderId: string): string | null;
  
  // Get cloud provider by ID
  getCloudProviderById(id: string): CloudProvider | null;
  
  // Check if service is initialized
  isInitialized(): boolean;
  
  // Clear cached data
  clear(): void;
}
```

**Key Features**:
- Singleton pattern for global access
- In-memory caching of cloud provider mappings
- Bidirectional lookup (cloudType ↔ UUID)
- Case-insensitive cloud type matching

### 2. Updated API Service Transformations

**Location**: `idp-ui/src/services/api.ts`

**Changes**:
```typescript
// Updated transformation function
function transformBlueprintResourceFromBackend(
  backendResource: BlueprintResourceBackendDto,
  cloudProviderLookup?: CloudProviderLookupService
): BlueprintResource {
  // Resolve cloud type to UUID
  let cloudProviderId = '';
  if (backendResource.cloudType && cloudProviderLookup) {
    const resolvedId = cloudProviderLookup.resolveCloudProviderId(backendResource.cloudType);
    if (resolvedId) {
      cloudProviderId = resolvedId;
    } else {
      console.warn(`Could not resolve cloud type: ${backendResource.cloudType}`);
    }
  }
  
  return {
    id: backendResource.id,
    name: backendResource.name,
    description: backendResource.description,
    resourceTypeId: backendResource.blueprintResourceTypeId,
    resourceTypeName: backendResource.blueprintResourceTypeName,
    cloudProviderId: cloudProviderId,
    cloudProviderName: backendResource.cloudType,
    configuration: backendResource.configuration,
    cloudSpecificProperties: backendResource.cloudSpecificProperties,
  };
}

// Updated API methods to use lookup service
async getBlueprints(userEmail?: string): Promise<Blueprint[]> {
  // Ensure cloud providers are loaded first
  await this.ensureCloudProvidersLoaded(userEmail);
  
  // Fetch and transform blueprints
  // ...
}
```

### 3. BlueprintForm State Management

**Location**: `idp-ui/src/components/BlueprintForm.tsx`

**Changes**:
- Initialize CloudProviderLookupService when cloud providers are loaded
- Use resolved UUIDs in selectedResources state
- Transform UUIDs back to cloud type strings when saving

**State Structure**:
```typescript
interface ResourceState {
  resourceTypeId: string;
  name: string;
  cloudProviderId: string;  // Now stores UUID instead of cloud type
  configuration: Record<string, unknown>;
}
```

### 4. DynamicResourceForm

**Location**: `idp-ui/src/components/DynamicResourceForm.tsx`

**Changes**: No changes required - component already expects UUID

## Data Models

### BlueprintResource (Frontend)

```typescript
interface BlueprintResource {
  id?: string;
  name: string;
  description?: string;
  resourceTypeId: string;           // UUID
  resourceTypeName?: string;        // Display name
  cloudProviderId: string;          // UUID (CHANGED from cloud type string)
  cloudProviderName?: string;       // Cloud type string for display
  configuration: Record<string, unknown>;
  cloudSpecificProperties?: Record<string, unknown>;
}
```

### BlueprintResourceBackendDto

```typescript
interface BlueprintResourceBackendDto {
  id?: string;
  name: string;
  description?: string;
  blueprintResourceTypeId: string;  // UUID
  blueprintResourceTypeName?: string;
  cloudType?: string;               // Cloud type string (e.g., "AWS")
  configuration: Record<string, unknown>;
  cloudSpecificProperties?: Record<string, unknown>;
}
```

### Cloud Provider Mapping

```typescript
// Internal mapping structure
{
  "aws": "uuid-aws-provider",
  "azure": "uuid-azure-provider",
  "gcp": "uuid-gcp-provider"
}
```

## Error Handling

### Scenario 1: Cloud Type Cannot Be Resolved

**Trigger**: Backend returns cloudType that doesn't match any loaded cloud provider

**Handling**:
1. Log warning to console with the unresolved cloud type
2. Set `cloudProviderId` to empty string
3. DynamicResourceForm will show "no schema configured" message
4. User can manually select a valid cloud provider to fix

### Scenario 2: Cloud Providers Not Loaded

**Trigger**: Attempting to transform blueprint before cloud providers are fetched

**Handling**:
1. Ensure cloud providers are loaded before fetching blueprints
2. Add loading state to prevent premature transformation
3. Show loading indicator in UI

### Scenario 3: Property Schema 404 Error

**Trigger**: Valid UUID but no schema configured for resource type + cloud provider combination

**Handling**:
1. DynamicResourceForm catches 404 and shows user-friendly message
2. Form remains functional for editing other fields
3. User can save blueprint without cloud-specific properties

### Scenario 4: Invalid Cloud Provider Selection

**Trigger**: User selects cloud provider that's not in blueprint's supported list

**Handling**:
1. BlueprintForm filters cloud provider dropdown to only show supported providers
2. Validation prevents saving with unsupported cloud provider
3. Clear error message guides user to fix the issue

## Testing Strategy

### Unit Tests

1. **CloudProviderLookupService Tests**
   - Test initialization with cloud providers
   - Test cloud type to UUID resolution (case-insensitive)
   - Test UUID to cloud type resolution
   - Test handling of unknown cloud types
   - Test clearing cached data

2. **Transformation Function Tests**
   - Test transformBlueprintResourceFromBackend with valid cloud type
   - Test transformation with unknown cloud type
   - Test transformation without lookup service
   - Test transformBlueprintResourceToBackend maintains cloud type

3. **BlueprintForm Tests**
   - Test loading existing blueprint with cloud type resolution
   - Test cloud provider dropdown shows correct selection
   - Test changing cloud provider updates state correctly
   - Test saving blueprint transforms UUID back to cloud type

### Integration Tests

1. **End-to-End Blueprint Editing**
   - Load blueprint with resources
   - Verify cloud provider dropdowns show correct selections
   - Verify DynamicResourceForm receives correct UUID
   - Verify property schema API is called with UUID
   - Edit and save blueprint successfully

2. **Error Scenarios**
   - Test blueprint with invalid cloud type
   - Test blueprint with missing cloud provider data
   - Test property schema 404 handling
   - Test cloud provider list loading failure

### Manual Testing Checklist

- [ ] Open Infrastructure page and select a blueprint
- [ ] Click Edit on a resource
- [ ] Verify no 404 errors in console
- [ ] Verify cloud provider dropdown shows correct selection
- [ ] Verify cloud-specific properties load (if schema exists)
- [ ] Change cloud provider and verify configuration resets
- [ ] Save blueprint and verify data persists correctly
- [ ] Reload page and verify resource still loads correctly

## Migration and Rollout

### Phase 1: Add CloudProviderLookupService
- Create new service with tests
- No impact on existing functionality

### Phase 2: Update Transformation Logic
- Modify transformBlueprintResourceFromBackend
- Add cloud provider loading to getBlueprints
- Backward compatible - falls back to empty string if resolution fails

### Phase 3: Update BlueprintForm
- Initialize lookup service when cloud providers load
- Use resolved UUIDs in state
- Transform back to cloud type when saving

### Phase 4: Validation and Cleanup
- Verify all blueprint editing workflows work
- Add comprehensive error handling
- Update documentation

### Rollback Plan

If issues are discovered:
1. The changes are isolated to frontend transformation logic
2. Backend API contract remains unchanged
3. Can revert frontend changes without backend coordination
4. Existing blueprints in database are not affected

## Performance Considerations

1. **Caching**: CloudProviderLookupService caches mappings in memory
2. **Lazy Loading**: Cloud providers loaded once per session
3. **Minimal Overhead**: Lookup operations are O(1) hash map lookups
4. **No Additional API Calls**: Uses existing cloud provider data

## Security Considerations

1. **No New Attack Surface**: Changes are client-side data transformation
2. **Validation**: Backend still validates cloud provider references
3. **No Sensitive Data**: Cloud provider mappings are not sensitive
4. **Error Messages**: Don't expose internal system details

## Future Enhancements

1. **Persistent Caching**: Store cloud provider mappings in localStorage
2. **Automatic Refresh**: Reload cloud providers when stale
3. **Admin UI**: Allow admins to manage cloud provider mappings
4. **Validation**: Add frontend validation for cloud provider compatibility
