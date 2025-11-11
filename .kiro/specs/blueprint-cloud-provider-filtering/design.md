# Design Document

## Overview

This design addresses the cloud provider filtering issue in the blueprint editor by ensuring that blueprint resources can only be configured for cloud providers that are explicitly selected for the parent blueprint. The solution involves modifying the BlueprintForm component to filter cloud provider options and automatically clean up resources when cloud providers are deselected.

## Architecture

### Component Hierarchy

```
BlueprintForm (manages blueprint and cloud provider selection)
  └── Resource Items (one per blueprint resource)
      ├── AngryComboBox (filtered cloud provider dropdown)
      └── DynamicResourceForm (receives filtered cloud provider)
```

### Data Flow

1. User selects cloud providers via checkboxes → `selectedCloudProviderIds` state updated
2. User adds/edits resource → Cloud provider dropdown filtered by `selectedCloudProviderIds`
3. User deselects cloud provider → Resources using that provider are removed from `selectedResources`
4. User saves blueprint → Validated resources sent to API

## Components and Interfaces

### BlueprintForm Component Changes

**Current State:**
- `selectedCloudProviderIds`: string[] - Tracks selected cloud providers
- `selectedResources`: Array of resource objects with cloudProviderId

**Modified Behavior:**

1. **Cloud Provider Dropdown Filtering**
   - The existing cloud provider dropdown for each resource already filters correctly:
   ```typescript
   items={cloudProviders
     .filter(cp => selectedCloudProviderIds.includes(cp.id))
     .map(cp => ({ text: cp.displayName, value: cp.id }))}
   ```
   - This is working as intended and doesn't need changes

2. **Add Resource Dropdown Filtering**
   - The "Add Shared Resource" dropdown already filters correctly:
   ```typescript
   {cloudProviders
     .filter(cp => selectedCloudProviderIds.includes(cp.id))
     .map(cp => (
       <option key={`${rt.id}|${cp.id}`} value={`${rt.id}|${cp.id}`}>
         {cp.displayName}
       </option>
     ))}
   ```
   - This is working as intended and doesn't need changes

3. **Resource Cleanup on Cloud Provider Deselection**
   - The existing `handleCloudProviderChange` already removes incompatible resources:
   ```typescript
   const handleCloudProviderChange = (newSelection: string[]) => {
     setSelectedCloudProviderIds(prev => {
       if (newSelection.length < prev.length) {
         setSelectedResources(current => 
           current.filter(res => newSelection.includes(res.cloudProviderId))
         );
       }
       return newSelection;
     });
   };
   ```
   - This is working as intended and doesn't need changes

### Issue Analysis

After reviewing the code, the BlueprintForm component implements filtering logic on lines 331-334, but there's a **state initialization and rendering timing issue**:

**Root Cause:**
When editing an existing blueprint, the component loads cloud providers and resource types asynchronously in separate useEffect hooks. The resource cloud provider dropdowns may render before the `selectedCloudProviderIds` state is properly initialized from the blueprint data, causing them to show all available cloud providers instead of only the selected ones.

**Specific Issues Identified:**

1. **Race Condition in State Initialization**
   - The `cloudProviders` array loads asynchronously (line 107-116)
   - The `selectedCloudProviderIds` state is set from blueprint data (line 73-82)
   - Resources render with dropdowns before `selectedCloudProviderIds` is populated
   - Result: Dropdowns show all cloud providers initially, then may not re-render with filtered list

2. **Missing Dependency in useEffect**
   - The resource loading effect (line 73-82) doesn't trigger re-renders of child components
   - When `selectedCloudProviderIds` updates, the AngryComboBox components may not receive the updated filtered items

3. **Component Re-render Optimization**
   - React may optimize away re-renders if it doesn't detect that the filtered items array has changed
   - The filter operation creates a new array, but React may not detect the change if the component is already mounted

## Revised Design Approach

The design will focus on:

1. **Fix State Initialization Race Condition** - Ensure `selectedCloudProviderIds` is set before resources render
2. **Force Component Re-renders** - Use key prop to force AngryComboBox re-renders when cloud provider selection changes
3. **Enhanced User Feedback** - Make it clearer when resources are removed due to cloud provider deselection
4. **Backend Validation** - Ensure API validates cloud provider consistency

### Fix State Initialization Race Condition

**Component:** BlueprintForm

**Problem:** The `selectedCloudProviderIds` state may not be initialized when resource dropdowns first render.

**Solution 1: Conditional Rendering**
Only render resources after cloud providers are loaded and selected:

```typescript
// Add loading state for cloud providers
const [cloudProvidersLoaded, setCloudProvidersLoaded] = useState(false);

// Update the cloud provider loading effect
useEffect(() => {
  (async () => {
    try {
      const [providers, resourceTypes] = await Promise.all([
        apiService.getAvailableCloudProvidersForBlueprints(user.email),
        apiService.getAvailableResourceTypesForBlueprints(user.email),
      ]);
      setCloudProviders(providers);
      setAvailableResourceTypes(resourceTypes);
      setCloudProvidersLoaded(true); // Mark as loaded
    } catch (e) {
      console.error('Failed to load cloud providers or resource types', e);
    }
  })();
}, [user.email]);

// Conditional rendering in JSX
{cloudProvidersLoaded && selectedCloudProviderIds.length > 0 && (
  <div className="resources-list">
    {/* Resource items */}
  </div>
)}
```

**Solution 2: Force Re-render with Key Prop**
Add a key prop to AngryComboBox that changes when `selectedCloudProviderIds` changes:

```typescript
<AngryComboBox
  key={`resource-cloud-${index}-${selectedCloudProviderIds.join(',')}`}
  id={`resource-cloud-${index}`}
  value={resource.cloudProviderId}
  onChange={(val: string) => handleResourceCloudProviderChange(index, val)}
  items={cloudProviders
    .filter(cp => selectedCloudProviderIds.includes(cp.id))
    .map(cp => ({ text: cp.displayName, value: cp.id }))}
  placeholder="Select cloud provider"
/>
```

**Recommended Approach:** Combine both solutions for maximum reliability:
1. Use conditional rendering to prevent premature rendering
2. Use key prop to force re-renders when cloud provider selection changes

### Enhanced User Feedback

**Component:** BlueprintForm

**Changes:**

1. Add confirmation dialog when deselecting cloud providers with associated resources:
```typescript
const handleCloudProviderChange = (newSelection: string[]) => {
  setSelectedCloudProviderIds(prev => {
    // Check if we're removing providers
    if (newSelection.length < prev.length) {
      const removedProviders = prev.filter(id => !newSelection.includes(id));
      const affectedResources = selectedResources.filter(res => 
        removedProviders.includes(res.cloudProviderId)
      );
      
      if (affectedResources.length > 0) {
        // Show confirmation dialog
        const providerNames = removedProviders
          .map(id => cloudProviders.find(p => p.id === id)?.displayName)
          .join(', ');
        
        const confirmed = window.confirm(
          `Removing ${providerNames} will delete ${affectedResources.length} ` +
          `resource(s): ${affectedResources.map(r => r.name).join(', ')}. Continue?`
        );
        
        if (!confirmed) {
          return prev; // Cancel the change
        }
      }
      
      // Remove incompatible resources
      setSelectedResources(current => 
        current.filter(res => newSelection.includes(res.cloudProviderId))
      );
    }
    
    return newSelection;
  });
};
```

2. Add visual indicator showing which cloud providers each resource uses:
```typescript
<div className="resource-cloud-indicator">
  <span className="cloud-badge">
    {cloudProviders.find(cp => cp.id === resource.cloudProviderId)?.displayName}
  </span>
</div>
```

3. Add validation message when trying to add resources without cloud providers:
```typescript
{selectedCloudProviderIds.length === 0 && (
  <div className="info-message">
    Please select at least one cloud provider above before adding resources.
  </div>
)}
```

### Backend Validation

**Component:** BlueprintService (Java backend)

**Changes:**

1. Add validation in `createBlueprint` and `updateBlueprint` methods:
```java
private void validateBlueprintResources(BlueprintCreate dto) {
    Set<String> supportedProviders = new HashSet<>(dto.getSupportedCloudProviderIds());
    
    for (var resource : dto.getResources()) {
        if (!supportedProviders.contains(resource.getCloudProviderId())) {
            throw new IllegalArgumentException(
                String.format(
                    "Blueprint resource '%s' references cloud provider '%s' " +
                    "which is not in the blueprint's supported cloud providers",
                    resource.getName(),
                    resource.getCloudProviderId()
                )
            );
        }
    }
}
```

2. Call validation before saving:
```java
@Transactional
public Blueprint create(BlueprintCreate dto, String userEmail) {
    validateBlueprintResources(dto); // Add this line
    
    // Existing creation logic...
}
```

## Data Models

No changes to data models are required. The existing structure already supports the necessary relationships:

```typescript
interface Blueprint {
  id: string;
  name: string;
  description?: string;
  supportedCloudProviderIds: string[];  // Cloud providers enabled for this blueprint
  resources: BlueprintResource[];
}

interface BlueprintResource {
  id?: string;
  name: string;
  resourceTypeId: string;
  cloudProviderId: string;  // Must be in parent blueprint's supportedCloudProviderIds
  configuration: Record<string, unknown>;
}
```

## Error Handling

### Frontend Error Scenarios

1. **No Cloud Providers Selected**
   - Display: Info message prompting user to select cloud providers
   - Action: Disable "Add Resource" functionality

2. **Removing Cloud Provider with Resources**
   - Display: Confirmation dialog with list of affected resources
   - Action: Allow user to cancel or proceed with removal

3. **Backend Validation Failure**
   - Display: Error message from API response
   - Action: Prevent form submission, highlight invalid resources

### Backend Error Scenarios

1. **Invalid Cloud Provider Reference**
   - HTTP Status: 400 Bad Request
   - Error Message: "Blueprint resource '{name}' references cloud provider '{id}' which is not in the blueprint's supported cloud providers"
   - Action: Return detailed validation error to frontend

2. **Cloud Provider Not Found**
   - HTTP Status: 404 Not Found
   - Error Message: "Cloud provider '{id}' not found"
   - Action: Return error to frontend

## Testing Strategy

### Frontend Tests

1. **Unit Tests for BlueprintForm**
   - Test cloud provider dropdown filtering for new resources
   - Test cloud provider dropdown filtering for existing resources when editing
   - Test that dropdowns only show selected cloud providers after blueprint loads
   - Test resource removal on cloud provider deselection
   - Test confirmation dialog display
   - Test validation messages
   - Test that changing selectedCloudProviderIds triggers dropdown re-renders

2. **Integration Tests**
   - Test full blueprint creation flow with filtered cloud providers
   - Test blueprint editing with cloud provider changes
   - Test loading existing blueprint and verifying dropdown filtering
   - Test resource addition with cloud provider constraints
   - Test editing resource cloud provider shows only selected providers

### Backend Tests

1. **Unit Tests for BlueprintService**
   - Test validation logic for cloud provider consistency
   - Test error messages for invalid configurations
   - Test successful creation with valid cloud providers

2. **Integration Tests**
   - Test API endpoint validation
   - Test blueprint creation with invalid cloud provider references
   - Test blueprint update with cloud provider changes

## Implementation Notes

### Key Findings

The BlueprintForm component implements filtering logic, but has a state initialization race condition. The main improvements needed are:

1. **Fix Race Condition** - Ensure selectedCloudProviderIds is initialized before resources render
2. **Force Re-renders** - Use key prop to ensure dropdowns update when cloud provider selection changes
3. **User Feedback** - Add confirmation dialogs and visual indicators (already implemented)
4. **Backend Validation** - Ensure API validates cloud provider consistency (already implemented)
5. **Error Messages** - Provide clear feedback when validation fails

### No Breaking Changes

All changes are additive and don't break existing functionality:
- Confirmation dialogs can be bypassed
- Backend validation prevents invalid data but doesn't change API contracts
- Visual indicators are purely informational

### Performance Considerations

- Filtering operations are O(n) where n is the number of cloud providers (typically < 10)
- No additional API calls required
- Validation adds minimal overhead to save operations
