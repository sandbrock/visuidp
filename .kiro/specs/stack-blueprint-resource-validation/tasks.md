# Implementation Plan

- [x] 1. Update database migration for blueprint resource selection
  - Modify existing V1 or V2 migration script to add `blueprint_resource_id` column to `stack` table
  - Column should be UUID type with foreign key constraint to `blueprint_resource` table
  - Add the column definition in the appropriate location within the stack table creation
  - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3_

- [x] 2. Create BlueprintResourceValidationService domain service
  - Create new service class in `idp-api/src/main/java/com/angryss/idp/domain/services/BlueprintResourceValidationService.java`
  - Implement `validateBlueprintResourcesForStackType()` method that checks stack type and validates required resources
  - Implement `validateBlueprintResourceSelection()` method that validates selected resource belongs to blueprint and has correct type
  - Implement `hasContainerOrchestrator()` helper method to check for "Managed Container Orchestrator" resource type
  - Implement `hasStorageResource()` helper method to check for "Storage" resource type
  - Implement `getResourceTypeName()` helper method to safely extract resource type name from BlueprintResource
  - Implement `isValidResourceSelection()` helper method to validate resource selection
  - Add validation logic for RESTFUL_API and EVENT_DRIVEN_API requiring Container Orchestrator
  - Add validation logic for JAVASCRIPT_WEB_APPLICATION requiring Storage resource
  - Throw IllegalArgumentException with descriptive messages when validation fails
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 9.3, 10.3_

- [x] 3. Update Stack entity and DTOs for blueprint resource selection
  - Add `blueprintResource` field to Stack entity (ManyToOne relationship to BlueprintResource, nullable)
  - Add `blueprintResourceId` field to StackCreateDto (UUID, optional)
  - Add `blueprintResource` field to StackResponseDto (BlueprintResourceDto, optional)
  - Create BlueprintResourceDto if it doesn't exist with id, name, and resourceType fields
  - Update Stack entity mapper to include blueprintResource in response mapping
  - _Requirements: 9.1, 9.2, 10.1, 10.2_

- [x] 4. Integrate validation service into StackService
  - Inject BlueprintResourceValidationService into StackService
  - Modify `createStack()` method to call validation after blueprint lookup and before persistence
  - Modify `updateStack()` method to call validation after blueprint lookup and before persistence
  - Add blueprint resource selection validation in both create and update methods
  - Retrieve and associate selected BlueprintResource with Stack entity
  - Ensure validation occurs before any database operations
  - _Requirements: 5.1, 5.2, 5.3, 9.3, 10.3_

- [x] 5. Write unit tests for BlueprintResourceValidationService
  - Create test class `BlueprintResourceValidationServiceTest.java`
  - Write test for RESTful API with Container Orchestrator (success case)
  - Write test for RESTful API without Container Orchestrator (failure case)
  - Write test for Event-driven API with Container Orchestrator (success case)
  - Write test for Event-driven API without Container Orchestrator (failure case)
  - Write test for JavaScript Web Application with Storage (success case)
  - Write test for JavaScript Web Application without Storage (failure case)
  - Write test for Infrastructure-only stack with no blueprint (success case)
  - Write test for serverless stacks requiring no orchestrator validation
  - Write test for container stack with null blueprint (failure case)
  - Write test for Infrastructure stack with null blueprint (success case)
  - Write test for valid blueprint resource selection (success case)
  - Write test for invalid blueprint resource selection - resource not in blueprint (failure case)
  - Write test for invalid blueprint resource selection - wrong resource type (failure case)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 4.1, 4.2, 9.3, 10.3_

- [x] 6. Write integration tests for StackService validation
  - Modify `StackServiceTest.java` to add validation test cases
  - Write test for creating RESTful API stack with valid blueprint containing orchestrator
  - Write test for creating RESTful API stack with invalid blueprint missing orchestrator
  - Write test for creating JavaScript Web Application with valid blueprint containing storage
  - Write test for creating JavaScript Web Application with invalid blueprint missing storage
  - Write test for updating stack to use invalid blueprint
  - Write test for creating Infrastructure-only stack without blueprint
  - Write test for creating stack with valid blueprint resource selection
  - Write test for creating stack with invalid blueprint resource selection
  - Write test for creating stack with blueprint resource from different blueprint (failure case)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 4.1, 4.2, 5.1, 5.2, 5.3, 9.3, 10.3_

- [x] 7. Write API-level tests for validation error responses
  - Modify `StacksControllerTest.java` to add API validation test cases
  - Write test verifying 400 status code when creating stack with invalid blueprint
  - Write test verifying proper error message format in response body
  - Write test verifying 201 status code when creating stack with valid blueprint
  - Write test verifying 400 status code when updating stack with invalid blueprint
  - Write test verifying 201 status code when creating stack with valid blueprint resource selection
  - Write test verifying 400 status code when creating stack with invalid blueprint resource selection
  - Verify response includes blueprintResource in StackResponseDto when provided
  - _Requirements: 3.1, 3.2, 3.3, 9.3, 10.3_

- [x] 8. Implement blueprint filtering logic in StackForm component
  - Create `filterBlueprintsForStackType()` helper function that filters blueprints based on stack type requirements
  - Add logic to check for "Managed Container Orchestrator" resource type for RESTful API and Event-driven API stack types
  - Add logic to check for "Storage" resource type for JavaScript Web Application stack type
  - Return all blueprints without filtering for Infrastructure-only stack type
  - Apply filtering when rendering blueprint dropdown options based on selected stack type
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Add requirement helper text to StackForm component
  - Create `getStackTypeRequirementText()` helper function that returns appropriate message for each stack type
  - Add InfoBox or similar component below stack type selection to display requirement text
  - Show "This stack type requires a blueprint with a Container Orchestrator" for RESTful API and Event-driven API
  - Show "This stack type requires a blueprint with a Storage resource" for JavaScript Web Application
  - Show no message or generic message for Infrastructure-only and serverless stack types
  - Update component styling to ensure helper text is visible and well-positioned
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 10. Implement blueprint resource selection in StackForm component
  - Add state to track selected blueprint resource ID
  - Create `getAvailableResourcesOfType()` helper function to get resources of specific type from blueprint
  - Create `shouldShowResourceSelection()` helper function to determine if dropdown should be shown
  - Create `autoSelectResourceIfSingle()` helper function to auto-select when only one resource available
  - Add useEffect to handle auto-selection when blueprint or stack type changes
  - Render Container Orchestrator dropdown when stack type is RESTful API or Event-driven API and blueprint has multiple orchestrators
  - Render Storage Resource dropdown when stack type is JavaScript Web Application and blueprint has multiple storage resources
  - Make resource selection required before form submission for applicable stack types
  - Include selected blueprintResourceId in API request payload
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_

- [x] 11. Enhance error handling in StackForm component
  - Update error handling logic to capture 400 validation errors from API responses
  - Extract error message from API response body
  - Display validation error messages using ErrorMessage or FeedbackMessage component
  - Position error messages near the blueprint selection field for better visibility
  - Ensure error messages are cleared when user changes stack type or blueprint selection
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 12. Write tests for StackForm blueprint filtering and resource selection
  - Create test file or add to existing `StackForm.test.tsx`
  - Write test verifying blueprints are filtered correctly for RESTful API stack type
  - Write test verifying blueprints are filtered correctly for Event-driven API stack type
  - Write test verifying blueprints are filtered correctly for JavaScript Web Application stack type
  - Write test verifying all blueprints are shown for Infrastructure-only stack type
  - Write test verifying helper text is displayed correctly for each stack type
  - Write test verifying error messages are displayed when API returns validation errors
  - Write test verifying resource selection dropdown is shown when blueprint has multiple resources
  - Write test verifying resource is auto-selected when blueprint has only one resource
  - Write test verifying form submission includes selected blueprint resource ID
  - Write test verifying resource selection is required for applicable stack types
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_
