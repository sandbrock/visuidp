# Implementation Plan

- [x] 1. Fix cloud provider dropdown state initialization race condition
  - Add `cloudProvidersLoaded` state to track when cloud providers have been loaded
  - Update cloud provider loading useEffect to set `cloudProvidersLoaded` to true after loading
  - Add conditional rendering to only show resources list when `cloudProvidersLoaded` is true and `selectedCloudProviderIds` has items
  - Add key prop to AngryComboBox that includes `selectedCloudProviderIds.join(',')` to force re-render when selection changes
  - Test that editing existing blueprint shows only selected cloud providers in resource dropdowns
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2. Add confirmation dialog for cloud provider deselection
  - Implement confirmation dialog in BlueprintForm when user deselects cloud providers that have associated resources
  - Display list of affected resources in the confirmation message
  - Allow user to cancel the deselection if they don't want to remove resources
  - _Requirements: 1.4, 4.1_

- [x] 3. Add visual indicators for resource cloud providers
  - Add cloud provider badge display for each blueprint resource in the resource list
  - Style the badge to match the application's design system
  - Ensure badge is visible and clearly indicates which cloud provider the resource uses
  - _Requirements: 4.1, 4.2_

- [x] 4. Add validation message for empty cloud provider selection
  - Display info message when no cloud providers are selected for the blueprint
  - Conditionally hide or disable the "Add Resource" section when no cloud providers are selected
  - Update the message to guide users to select cloud providers first
  - _Requirements: 4.2_

- [x] 5. Implement backend validation for blueprint cloud provider consistency
  - Create validation method in BlueprintService to check that all blueprint resources reference cloud providers in the blueprint's supportedCloudProviderIds list
  - Add validation call in createBlueprint method before calling createBlueprintResources
  - Add validation call in updateBlueprint method before calling createBlueprintResources
  - Return appropriate error response (400 Bad Request) with descriptive message when validation fails
  - _Requirements: 2.3, 4.3_

- [x] 6. Add backend tests for cloud provider validation
  - Write unit test for validation method with valid cloud provider references
  - Write unit test for validation method with invalid cloud provider references
  - Write integration test for blueprint creation with invalid cloud provider references
  - Write integration test for blueprint update with invalid cloud provider references
  - _Requirements: 2.3_

- [x] 7. Add frontend tests for enhanced user feedback
  - Write test for confirmation dialog display when deselecting cloud providers with resources
  - Write test for confirmation dialog cancellation behavior
  - Write test for cloud provider badge display
  - Write test for validation message display when no cloud providers selected
  - _Requirements: 1.4, 5.1, 5.2_

- [x] 8. Add frontend tests for cloud provider dropdown filtering on edit
  - Write test that loads existing blueprint and verifies cloud provider dropdowns only show selected providers
  - Write test that verifies changing selectedCloudProviderIds updates all resource dropdowns
  - Write test that verifies resources don't render until cloud providers are loaded
  - Write test that verifies key prop changes when selectedCloudProviderIds changes
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Fix conditional rendering to prevent premature resource rendering in edit mode
  - Update the conditional rendering logic on line 313 to check both cloudProvidersLoaded AND that selectedCloudProviderIds matches the blueprint's cloud providers (in edit mode)
  - Ensure resources don't render until selectedCloudProviderIds state is properly initialized from blueprint data
  - Add a check to verify blueprint data has been loaded before rendering resources
  - Test that editing an existing blueprint shows only selected cloud providers in all resource dropdowns from initial render
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 10. Fix cloud provider dropdown filtering in Infrastructure.tsx resource editor
  - Update the filteredCloudProvidersForResource memoized value in Infrastructure.tsx (line 193-202) to remove the fallback that returns all cloud providers
  - Ensure the cloud provider dropdown on line 820-827 only shows cloud providers that are in the blueprint's supportedCloudProviderIds
  - Handle the case where blueprint has no supported cloud providers by showing an empty list or disabled dropdown
  - Test that editing a blueprint resource shows only the blueprint's selected cloud providers in the "Cloud-Specific Properties" dropdown
  - _Requirements: 1.2, 1.3, 4.2, 4.4_
