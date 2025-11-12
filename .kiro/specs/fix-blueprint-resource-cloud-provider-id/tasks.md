# Implementation Plan

- [x] 1. Create CloudProviderLookupService
  - Create `idp-ui/src/services/CloudProviderLookupService.ts` with singleton pattern
  - Implement `initialize()` method to build cloud type to UUID mapping
  - Implement `resolveCloudProviderId()` for cloud type string to UUID resolution (case-insensitive)
  - Implement `resolveCloudType()` for UUID to cloud type string resolution
  - Implement `getCloudProviderById()` to retrieve full cloud provider object
  - Implement `isInitialized()` and `clear()` utility methods
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.1 Write unit tests for CloudProviderLookupService
  - Test initialization with cloud providers
  - Test cloud type to UUID resolution with various cases (uppercase, lowercase, mixed)
  - Test UUID to cloud type resolution
  - Test handling of unknown cloud types (returns null)
  - Test clearing cached data
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Update API service transformation functions
  - [x] 2.1 Modify `transformBlueprintResourceFromBackend()` function
    - Accept optional `CloudProviderLookupService` parameter
    - Call `resolveCloudProviderId()` to convert cloud type to UUID
    - Set `cloudProviderId` to resolved UUID or empty string
    - Log warning if cloud type cannot be resolved
    - Keep `cloudProviderName` as cloud type string for display
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.3_

  - [x] 2.2 Update `getBlueprints()` method
    - Ensure cloud providers are loaded before fetching blueprints
    - Initialize CloudProviderLookupService with loaded cloud providers
    - Pass lookup service to transformation function
    - Transform all blueprint resources with resolved cloud provider IDs
    - _Requirements: 1.1, 1.2, 4.1_

  - [x] 2.3 Verify `transformBlueprintResourceToBackend()` maintains cloud type
    - Ensure function continues to send `cloudType` string to backend
    - Use `cloudProviderName` field for backend transformation
    - Maintain backward compatibility with backend API
    - _Requirements: 4.2_

- [x] 2.4 Write unit tests for transformation functions
  - Test `transformBlueprintResourceFromBackend()` with valid cloud type
  - Test transformation with unknown cloud type (logs warning, sets empty string)
  - Test transformation without lookup service (backward compatibility)
  - Test `transformBlueprintResourceToBackend()` maintains cloud type format
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2_

- [x] 3. Update BlueprintForm component
  - [x] 3.1 Initialize CloudProviderLookupService when cloud providers load
    - Import CloudProviderLookupService in BlueprintForm
    - Call `initialize()` after cloud providers are fetched
    - Store lookup service instance in component state or ref
    - _Requirements: 2.2_

  - [x] 3.2 Update resource loading logic
    - Ensure `loadResourceSchemas()` uses resolved cloud provider UUIDs
    - Verify `selectedResources` state contains UUIDs in `cloudProviderId` field
    - Update resource state interface documentation if needed
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Update cloud provider change handler
    - Verify `handleResourceCloudProviderChange()` updates with UUID
    - Ensure configuration reset still works correctly
    - Maintain proper state synchronization
    - _Requirements: 2.3_

  - [x] 3.4 Update save logic to transform UUIDs back to cloud types
    - Before calling API, transform `cloudProviderId` UUID to cloud type string
    - Use CloudProviderLookupService.resolveCloudType() for reverse lookup
    - Ensure backend receives expected `cloudType` format
    - _Requirements: 2.4, 4.2_

- [x] 3.5 Write unit tests for BlueprintForm changes
  - Test cloud provider lookup service initialization
  - Test loading existing blueprint with cloud type resolution
  - Test cloud provider dropdown shows correct selection
  - Test changing cloud provider updates state with UUID
  - Test saving blueprint transforms UUID back to cloud type
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Add error handling and user feedback
  - [x] 4.1 Handle cloud type resolution failures
    - Add console warning when cloud type cannot be resolved
    - Allow form to continue loading with empty cloud provider ID
    - Display helpful error message in DynamicResourceForm
    - _Requirements: 1.3, 3.1, 4.3_

  - [x] 4.2 Handle cloud provider loading failures
    - Add error state when cloud providers fail to load
    - Display error message in BlueprintForm
    - Disable resource editing until cloud providers are loaded
    - Provide retry mechanism
    - _Requirements: 3.3_

  - [x] 4.3 Improve DynamicResourceForm error messages
    - Verify 404 error shows user-friendly message
    - Ensure form remains functional when schema is not found
    - Add guidance for users to contact administrator
    - _Requirements: 3.2, 4.4_

- [x] 5. Integration testing and validation
  - [x] 5.1 Test complete blueprint editing workflow
    - Load Infrastructure page and select a blueprint
    - Click Edit on a resource
    - Verify no 404 errors in browser console
    - Verify cloud provider dropdown shows correct selection
    - Verify DynamicResourceForm receives correct UUID
    - Verify property schema API is called with UUID (not cloud type string)
    - _Requirements: 1.1, 1.4, 2.1_

  - [x] 5.2 Test cloud provider change workflow
    - Change cloud provider selection in resource form
    - Verify configuration resets correctly
    - Verify new cloud provider UUID is used for schema fetch
    - Save blueprint and verify changes persist
    - _Requirements: 2.3, 2.4_

  - [x] 5.3 Test error scenarios
    - Test blueprint with invalid/unknown cloud type
    - Test blueprint with missing cloud provider data
    - Test property schema 404 handling (no schema configured)
    - Test cloud provider list loading failure
    - Verify appropriate error messages are displayed
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.4 Test backward compatibility
    - Verify existing blueprints load correctly
    - Verify blueprints without cloud provider data handle gracefully
    - Verify backend API receives expected data format
    - Test with various cloud provider configurations
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Code cleanup and documentation
  - [x] 6.1 Add JSDoc comments to CloudProviderLookupService
    - Document all public methods with parameters and return types
    - Add usage examples in comments
    - Document singleton pattern usage
    - _Requirements: All_

  - [x] 6.2 Update inline comments in transformation functions
    - Explain cloud type to UUID resolution logic
    - Document backward compatibility considerations
    - Add comments for error handling paths
    - _Requirements: 1.1, 1.2, 1.3, 4.1_

  - [x] 6.3 Update BlueprintForm component comments
    - Document cloud provider lookup service usage
    - Explain state management for cloud provider IDs
    - Add comments for transformation logic
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
