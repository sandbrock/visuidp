# Implementation Plan

- [x] 1. Clean up V2__data.sql seed data
  - Remove all backward compatibility INSERT statements for legacy tables
  - Remove backward compatibility comments
  - Update section headers to remove "(replaces X)" references
  - Keep only current table seed data (cloud_providers, resource_types, environments)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Update V1__schema.sql to remove legacy table definitions
- [x] 2.1 Remove legacy table CREATE statements
  - Remove `cloud_types` table definition
  - Remove `blueprint_resource_types` table definition
  - Remove `stack_resource_types` table definition
  - Remove `blueprint_supported_clouds` table definition
  - _Requirements: 2.3, 2.4, 2.5, 3.3_

- [x] 2.2 Update environments table schema
  - Rename `cloud_type_id` column to `cloud_provider_id`
  - Update foreign key constraint to reference `cloud_providers` table
  - Update constraint name from `fk_environments_cloud_type` to `fk_environments_cloud_provider`
  - _Requirements: 2.1, 3.1, 3.5_

- [x] 2.3 Update blueprint_resources table schema
  - Rename `blueprint_resource_type_id` column to `resource_type_id`
  - Update foreign key constraint to reference `resource_types` table
  - Update constraint name from `fk_blueprint_resources_type` to `fk_blueprint_resources_resource_type`
  - _Requirements: 2.2, 3.1_

- [x] 2.4 Update indexes for renamed columns
  - Remove `idx_environments_cloud_type_id` index
  - Remove `idx_blueprint_resources_type_id` index
  - Remove `idx_blueprint_supported_clouds_blueprint_id` index
  - Add `idx_environments_cloud_provider_id` index
  - Add `idx_blueprint_resources_resource_type_id` index
  - _Requirements: 3.2_

- [x] 3. Update V2__data.sql to use renamed columns
  - Update environments INSERT statements to use `cloud_provider_id` instead of `cloud_type_id`
  - Ensure all seed data references match the updated schema
  - _Requirements: 1.1, 3.5_

- [x] 4. Update Java entities to reference current tables
- [x] 4.1 Update BlueprintResource entity
  - Change `@JoinColumn(name = "blueprint_resource_type_id")` to `@JoinColumn(name = "resource_type_id")`
  - Change field name from `blueprintResourceType` to `resourceType`
  - Update field type from `BlueprintResourceType` to `ResourceType`
  - _Requirements: 4.1, 4.2_

- [x] 4.2 Update EnvironmentEntity
  - Change `@JoinColumn(name = "cloud_type_id")` to `@JoinColumn(name = "cloud_provider_id")`
  - Change field name from `cloudType` to `cloudProvider`
  - Update field type from `CloudType` to `CloudProvider`
  - _Requirements: 4.3, 4.4_

- [x] 4.3 Remove legacy entity classes
  - Delete `BlueprintResourceType.java` entity class
  - Delete `StackResourceType.java` entity class
  - Delete `CloudType.java` entity class
  - _Requirements: 4.2, 4.4_

- [x] 4.4 Update any references to legacy entities
  - Update imports in classes that referenced legacy entities
  - Update any service or repository code that used legacy entities
  - Fix compilation errors from entity changes
  - _Requirements: 4.5_

- [x] 5. Verify migrations with fresh database
  - Drop and recreate test database
  - Run Flyway migrations
  - Verify legacy tables do not exist
  - Verify current tables exist with correct data
  - Verify foreign key relationships work correctly
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Verify schema validation passes
  - Start application in development mode with `./mvnw quarkus:dev`
  - Confirm no Hibernate schema validation errors appear
  - Verify application starts successfully
  - _Requirements: 4.5_

- [ ] 7. Update frontend to work with new Java entities
- [x] 7.1 Update TypeScript types to match new entity field names
  - Update `cloudType` references to `cloudProvider` in type definitions
  - Update `blueprintResourceType` references to `resourceType` in type definitions
  - Update any interfaces that reference legacy entity field names
  - _Requirements: 4.1, 4.3_

- [x] 7.2 Update React components to use new field names
  - Update components that display or manipulate cloud provider data
  - Update components that work with resource type data
  - Update form components that submit data with old field names
  - Update any hardcoded references to legacy field names
  - _Requirements: 4.1, 4.3_

- [x] 7.3 Update API service calls to use new field names
  - Update API request/response handling in `services/api.ts`
  - Update any data transformation logic that maps between frontend and backend
  - Ensure API calls send data with correct field names expected by updated entities
  - _Requirements: 4.1, 4.3_

- [x] 7.4 Test frontend integration with updated backend
  - Verify frontend can successfully fetch and display data from updated entities
  - Test form submissions work correctly with new field names
  - Verify no console errors related to missing or incorrect field names
  - _Requirements: 4.5_

- [x] 8. Run existing test suite
  - Execute `./mvnw test` to ensure no regressions
  - Update any tests that fail due to entity field name changes
  - Verify all tests pass with updated schema and entities
  - _Requirements: All_
