# Implementation Plan

- [x] 1. Modify existing database migration to add blueprint_id foreign key
  - Locate and modify existing V1__schema.sql migration file
  - Add blueprint_id column to blueprint_resources table definition as UUID
  - Add foreign key constraint referencing blueprints(id) with ON DELETE CASCADE
  - Create index on blueprint_id for query performance
  - Ensure table creation order supports foreign key constraint
  - _Requirements: 1.1, 2.4, 3.2, 3.3, 6.1, 6.2, 6.3, 6.5_

- [x] 2. Update BlueprintResource entity with blueprint relationship
  - Add @ManyToOne relationship field for blueprint
  - Add @JoinColumn annotation for blueprint_id
  - Add getter and setter methods for blueprint field
  - Ensure FetchType.LAZY is used for performance
  - _Requirements: 1.1, 2.4, 5.3_

- [x] 3. Update Blueprint entity with resources relationship
  - Add @OneToMany relationship field for resources
  - Configure cascade = CascadeType.ALL for automatic persistence
  - Configure orphanRemoval = true for automatic cleanup
  - Add logic in setter to maintain bidirectional relationship
  - Ensure FetchType.LAZY is used for performance
  - _Requirements: 1.1, 2.4, 3.2, 5.3, 5.4_

- [x] 4. Update BlueprintCreateDto to accept resources
  - Add List<BlueprintResourceCreateDto> resources field
  - Add @Valid annotation for nested validation
  - Add getter and setter methods
  - _Requirements: 5.1_

- [x] 5. Update BlueprintResponseDto to return resources
  - Add List<BlueprintResourceResponseDto> resources field
  - Add getter and setter methods
  - _Requirements: 5.2_

- [x] 6. Implement createBlueprintResources helper method in BlueprintService
  - Create private method that accepts List<BlueprintResourceCreateDto> and Blueprint
  - Validate each resource type exists by ID
  - Validate each cloud provider exists by name
  - Validate each cloud provider is enabled
  - Create BlueprintResource entity for each DTO
  - Set all required fields including blueprint relationship
  - Return Set<BlueprintResource>
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.5_

- [x] 7. Update createBlueprint method to handle resources
  - Check if createDto.getResources() is not null and not empty
  - Call createBlueprintResources helper method
  - Set resources on blueprint entity using setResources
  - Ensure resources are persisted with blueprint via cascade
  - _Requirements: 1.1, 1.2_

- [x] 8. Update updateBlueprint method to handle resources
  - Check if updateDto.getResources() is not null
  - Clear existing resources using getResources().clear()
  - If new resources list is not empty, call createBlueprintResources
  - Set new resources on blueprint entity
  - Rely on orphanRemoval to delete old resources
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1_

- [x] 9. Implement toResourceResponseDto helper method in BlueprintService
  - Create private method that accepts BlueprintResource entity
  - Map all fields to BlueprintResourceResponseDto
  - Include id, name, description, resourceTypeId, resourceTypeName
  - Include cloudType, configuration, cloudSpecificProperties
  - Return BlueprintResourceResponseDto
  - _Requirements: 1.2, 5.2, 5.5_

- [x] 10. Update toResponseDto method to include resources
  - Check if blueprint.getResources() is not null and not empty
  - Stream resources and map each to DTO using toResourceResponseDto
  - Collect to List<BlueprintResourceResponseDto>
  - Set resources list on BlueprintResponseDto
  - _Requirements: 1.2, 5.2, 5.5_

- [x] 11. Write unit tests for BlueprintService resource operations
  - Test createBlueprint with resources creates and persists resources
  - Test createBlueprint with empty resources list works correctly
  - Test updateBlueprint with new resources replaces old resources
  - Test updateBlueprint with empty resources list deletes all resources
  - Test deleteBlueprint cascades to delete resources
  - Test validation errors for invalid resource type ID
  - Test validation errors for invalid cloud provider name
  - Test validation errors for disabled cloud provider
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.2_

- [x] 12. Write integration tests for blueprint resource API endpoints
  - Test POST /blueprints with resources returns 201 with resources in response
  - Test PUT /blueprints/{id} with resources updates and returns resources
  - Test GET /blueprints/{id} returns blueprint with resources
  - Test DELETE /blueprints/{id} removes blueprint and cascades to resources
  - Test error scenarios return appropriate status codes and messages
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.2, 4.1, 4.2_

- [x] 13. Verify frontend integration
  - Start backend with migrations applied
  - Test creating a blueprint with resources in UI
  - Verify resources appear in blueprint list after save
  - Refresh page and verify resources persist
  - Test updating resources in UI
  - Test deleting resources in UI
  - Verify all operations persist correctly
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
