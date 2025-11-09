# Implementation Plan

- [x] 1. Create domain layer entities and value objects
  - Create new entity classes for CloudProvider, unified ResourceType, ResourceTypeCloudMapping, and PropertySchema
  - Create enum value objects: ResourceCategory, PropertyDataType, ModuleLocationType
  - Implement entity validation constraints and lifecycle callbacks
  - _Requirements: 1.1, 1.4, 2.1, 2.2, 3.1, 3.3, 4.1_

- [x] 2. Create and execute database migration scripts
  - Write Flyway migration to create cloud_providers, resource_types, resource_type_cloud_mappings, property_schemas tables
  - Write migration to create admin_audit_logs table
  - Write migration to add foreign key columns to existing tables (stacks, stack_resources, blueprint_resources)
  - Write migration to create blueprint_cloud_providers junction table
  - Write migration to create indexes for performance optimization
  - _Requirements: 1.4, 2.4, 3.5, 4.4_

- [x] 3. Implement domain services for validation and schema resolution
- [x] 3.1 Create PropertyValidationService
  - Implement validation logic for STRING, NUMBER, BOOLEAN, and LIST data types
  - Implement required field validation
  - Implement custom validation rules (min, max, pattern)
  - Create validation error response structures
  - _Requirements: 3.6, 7.4, 9.3, 10.4_

- [x] 3.2 Create SchemaResolverService
  - Implement schema resolution for ResourceType + CloudProvider combinations
  - Create method to retrieve all PropertySchemas for a mapping
  - Implement schema map generation for UI form building
  - _Requirements: 3.6, 7.4, 9.3_

- [x] 4. Enhance security infrastructure for admin authorization
- [x] 4.1 Update TraefikAuthenticationMechanism
  - Parse X-Auth-Request-Groups header from OAuth Proxy
  - Map Azure Entra ID groups to Quarkus security roles
  - Add "admin" role for users in configured admin group
  - _Requirements: 5.3_

- [x] 4.2 Create AdminAuditLog entity and interceptor
  - Create AdminAuditLog entity with user, action, entity type, entity ID, changes, timestamp
  - Implement CDI interceptor to automatically log admin service method calls
  - Capture before/after state for update operations
  - _Requirements: 5.4_

- [x] 5. Implement application layer DTOs for admin entities
  - Create DTOs: CloudProviderDto, CloudProviderCreateDto, CloudProviderUpdateDto
  - Create DTOs: ResourceTypeDto, ResourceTypeCreateDto, ResourceTypeUpdateDto
  - Create DTOs: ResourceTypeCloudMappingDto, ResourceTypeCloudMappingCreateDto, ResourceTypeCloudMappingUpdateDto
  - Create DTOs: PropertySchemaDto, PropertySchemaCreateDto, PropertySchemaUpdateDto
  - Create AdminDashboardDto with statistics
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.1_

- [x] 6. Implement application layer services for cloud provider management
- [x] 6.1 Create CloudProviderService
  - Implement listAll, getById, create, update methods
  - Implement toggleEnabled method with validation
  - Implement listEnabled method for user-facing queries
  - Add entity-to-DTO mapping logic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6.2 Write unit tests for CloudProviderService
  - Test CRUD operations with mocked repository
  - Test enable/disable toggle logic
  - Test DTO mapping
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 7. Implement application layer services for resource type management
- [x] 7.1 Create ResourceTypeService
  - Implement listAll, getById, create, update methods
  - Implement toggleEnabled method
  - Implement listByCategory and listEnabledForUser methods
  - Add entity-to-DTO mapping logic
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7.2 Write unit tests for ResourceTypeService
  - Test CRUD operations
  - Test category filtering
  - Test enabled filtering for users
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 8. Implement application layer services for mapping management
- [x] 8.1 Create ResourceTypeCloudMappingService
  - Implement listAll, getById, create, update methods
  - Implement toggleEnabled with completeness validation
  - Implement listByResourceType and listByCloudProvider methods
  - Implement findByResourceTypeAndCloud method
  - Add completeness check (has Terraform location and properties)
  - _Requirements: 3.1, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.4_

- [x] 8.2 Write unit tests for ResourceTypeCloudMappingService
  - Test CRUD operations
  - Test completeness validation
  - Test filtering methods
  - _Requirements: 4.4, 6.4_

- [x] 9. Implement application layer services for property schema management
- [x] 9.1 Create PropertySchemaService
  - Implement listByMapping, getById, create, update, delete methods
  - Implement bulkCreate for efficient property creation
  - Implement getSchemaMap for UI form generation
  - Add validation for unique property names within mapping
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9.2 Write unit tests for PropertySchemaService
  - Test CRUD operations
  - Test bulk create
  - Test schema map generation
  - Test unique property name validation
  - _Requirements: 3.1, 3.5_

- [x] 10. Implement admin dashboard service
- [x] 10.1 Create AdminDashboardService
  - Implement getDashboard method aggregating all configuration data
  - Implement getIncompleteMappings method
  - Implement getStatistics method with counts
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 10.2 Write unit tests for AdminDashboardService
  - Test dashboard data aggregation
  - Test incomplete mappings detection
  - Test statistics calculation
  - _Requirements: 6.1, 6.4_

- [x] 11. Implement presentation layer mappers
  - Create mapper classes to convert between entities and DTOs
  - Implement CloudProviderMapper with toDto and toEntity methods
  - Implement ResourceTypeMapper with toDto and toEntity methods
  - Implement ResourceTypeCloudMappingMapper with toDto and toEntity methods
  - Implement PropertySchemaMapper with toDto and toEntity methods
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 12. Implement admin REST controllers
- [x] 12.1 Create CloudProvidersController
  - Implement GET /, GET /{id}, POST /, PUT /{id} endpoints
  - Implement PATCH /{id}/toggle endpoint
  - Implement GET /enabled endpoint
  - Add @RolesAllowed("admin") annotation
  - Add OpenAPI annotations for documentation
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 5.1, 5.2_

- [x] 12.2 Create ResourceTypesController
  - Implement GET /, GET /{id}, POST /, PUT /{id} endpoints
  - Implement PATCH /{id}/toggle endpoint
  - Implement GET /category/{category} endpoint
  - Add @RolesAllowed("admin") annotation
  - Add OpenAPI annotations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2_

- [x] 12.3 Create ResourceTypeCloudMappingsController
  - Implement GET /, GET /{id}, POST /, PUT /{id} endpoints
  - Implement PATCH /{id}/toggle endpoint
  - Implement GET /resource-type/{resourceTypeId} and GET /cloud-provider/{cloudProviderId} endpoints
  - Add @RolesAllowed("admin") annotation
  - Add OpenAPI annotations
  - _Requirements: 3.1, 3.5, 4.1, 4.2, 4.3, 4.5, 5.1, 5.2_

- [x] 12.4 Create PropertySchemasController
  - Implement GET /mapping/{mappingId}, GET /{id}, POST /, PUT /{id}, DELETE /{id} endpoints
  - Implement POST /bulk endpoint for bulk property creation
  - Add @RolesAllowed("admin") annotation
  - Add OpenAPI annotations
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2_

- [x] 12.5 Create AdminDashboardController
  - Implement GET /, GET /incomplete-mappings, GET /statistics endpoints
  - Add @RolesAllowed("admin") annotation
  - Add OpenAPI annotations
  - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4_

- [x] 12.6 Write integration tests for admin controllers
  - Test all CRUD endpoints with REST Assured
  - Test authorization enforcement (admin vs. non-admin)
  - Test validation error responses
  - Test cascade operations
  - _Requirements: 5.1, 5.2, 5.5_

- [x] 13. Enhance existing user-facing controllers
- [x] 13.1 Update StacksController
  - Add GET /available-cloud-providers endpoint
  - Add GET /available-resource-types endpoint (filter by NON_SHARED and BOTH categories)
  - Add GET /resource-schema/{resourceTypeId}/{cloudProviderId} endpoint
  - Update create/update endpoints to validate against property schemas
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 13.2 Update BlueprintsController
  - Add GET /available-cloud-providers endpoint
  - Add GET /available-resource-types endpoint (filter by SHARED and BOTH categories)
  - Add GET /resource-schema/{resourceTypeId}/{cloudProviderId} endpoint
  - Update create/update endpoints to validate against property schemas
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 13.3 Write integration tests for enhanced user controllers
  - Test that only enabled providers and resource types are returned
  - Test property schema retrieval
  - Test validation enforcement on create/update
  - Test required property validation
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 14. Update existing entities to use new relationships
- [x] 14.1 Enhance Stack entity
  - Add cloudProvider ManyToOne relationship
  - Update validation to ensure cloudProvider is enabled
  - Update finder methods to include cloudProvider
  - _Requirements: 8.1, 8.2, 10.1_

- [x] 14.2 Enhance Blueprint entity
  - Replace supportedCloudTypes with supportedCloudProviders ManyToMany relationship
  - Update validation to ensure all cloudProviders are enabled
  - Update finder methods
  - _Requirements: 7.1, 7.2, 10.1_

- [x] 14.3 Enhance StackResource entity
  - Add resourceType and cloudProvider ManyToOne relationships
  - Update configuration validation to use PropertyValidationService
  - _Requirements: 9.3, 9.4, 9.5, 10.3, 10.4_

- [x] 14.4 Enhance BlueprintResource entity
  - Add cloudProvider ManyToOne relationship
  - Update configuration validation to use PropertyValidationService
  - _Requirements: 7.4, 7.5, 10.3, 10.4_

- [x] 15. Implement frontend admin UI components
- [x] 15.1 Create CloudProviderManagement component
  - Create table view with enable/disable toggles
  - Create create/edit modal form
  - Implement API integration with CloudProvidersController
  - Add visual indicators for enabled status
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 5.5_

- [x] 15.2 Create ResourceTypeManagement component
  - Create table view with category filter
  - Create create/edit modal form with category selection
  - Implement API integration with ResourceTypesController
  - Add enable/disable toggles
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.5_

- [x] 15.3 Create ResourceTypeMappingManagement component
  - Create grid view showing resource types vs. cloud providers
  - Implement color-coded cells (complete, incomplete, not configured)
  - Create mapping configuration modal with Terraform location input
  - Implement API integration with ResourceTypeCloudMappingsController
  - _Requirements: 3.1, 3.5, 4.1, 4.2, 4.3, 4.5, 5.5, 6.4_

- [x] 15.4 Create PropertySchemaEditor component
  - Create form builder interface for defining properties
  - Implement drag-and-drop reordering for display order
  - Create data type selector with validation rule builder
  - Implement preview of generated form
  - Implement API integration with PropertySchemasController
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.5_

- [x] 15.5 Create AdminDashboard component
  - Create statistics cards (providers, resource types, mappings, properties)
  - Create incomplete mappings list with quick links
  - Create recent audit log display
  - Implement API integration with AdminDashboardController
  - _Requirements: 5.5, 6.1, 6.2, 6.3, 6.4_

- [x] 15.6 Create admin navigation and routing
  - Add admin section to main navigation (visible only to admins)
  - Create routes for all admin components
  - Implement role-based route protection
  - _Requirements: 5.1, 5.2, 5.5_

- [x] 16. Enhance frontend user UI components
- [x] 16.1 Update StackForm component
  - Add cloud provider dropdown (fetch from /available-cloud-providers)
  - Update resource type selection (fetch from /available-resource-types)
  - Implement dynamic form generation based on property schemas
  - Add real-time validation feedback
  - Display help text from property descriptions
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 16.2 Update BlueprintForm component
  - Add cloud provider multi-select (fetch from /available-cloud-providers)
  - Update resource type selection (fetch from /available-resource-types)
  - Implement dynamic form generation based on property schemas
  - Add real-time validation feedback
  - Display help text from property descriptions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 16.3 Create DynamicResourceForm component
  - Create reusable component for rendering property schema-driven forms
  - Implement input controls for STRING, NUMBER, BOOLEAN, LIST data types
  - Implement client-side validation based on validation rules
  - Display validation errors inline
  - Support default values
  - _Requirements: 7.4, 9.3, 10.3, 10.4_

- [x] 17. Create TypeScript types for frontend
  - Create types for CloudProvider, ResourceType, ResourceTypeCloudMapping, PropertySchema
  - Create types for all DTOs matching backend structure
  - Create types for property data types and validation rules
  - Create types for admin dashboard data
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.1_

- [x] 18. Implement frontend API service methods
  - Add admin API methods to services/api.ts for all admin endpoints
  - Add user API methods for available-cloud-providers, available-resource-types, resource-schema
  - Implement error handling for validation errors
  - Add TypeScript return types for all methods
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.5, 7.1, 9.1, 10.1_

- [x] 19. Implement theme support for admin components
  - Update all admin component CSS files to support light and dark themes
  - Integrate ThemeContext into admin components
  - Apply theme-aware styling to tables, cards, modals, and forms
  - Ensure Syncfusion components in admin pages respect theme settings
  - Test theme toggling across all admin pages
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 20. Write end-to-end tests
  - Test admin workflow: create provider, resource type, mapping, properties, enable all
  - Test user workflow: create blueprint with shared resource, create stack with non-shared resource
  - Test property validation enforcement
  - Test authorization (admin vs. non-admin access)
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 7.1, 9.1_

- [x] 21. Create seed data migration for initial configuration
  - Create migration with initial cloud providers (AWS, AZURE, GCP)
  - Create migration with common resource types (MANAGED_CONTAINER_ORCHESTRATOR, RELATIONAL_DATABASE, STORAGE, QUEUE, CACHE)
  - Set appropriate categories for each resource type
  - _Requirements: 1.1, 2.1_

- [x] 22. Refactor admin navigation to eliminate modal-based navigation
- [x] 22.1 Convert PropertySchemaEditor to standalone routed page
  - Create dedicated route for PropertySchemaEditor (e.g., /admin/property-schemas/:mappingId)
  - Update PropertySchemaEditor component to accept route parameters (mappingId or resourceTypeId + cloudProviderId)
  - Add breadcrumb navigation component showing: Admin Dashboard > Mappings > Property Schema Editor
  - Add back button to return to previous page using React Router history
  - Remove modal dialog wrapper from PropertySchemaEditor
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 22.2 Update ResourceTypeMappingManagement to use direct navigation
  - Replace "Edit Properties" modal dialog trigger with direct navigation link
  - Update link to navigate to /admin/property-schemas with appropriate parameters
  - Remove modal dialog state management for property schema editing
  - Ensure grid cell click opens inline edit for mapping details only (Terraform location)
  - Add separate "Configure Properties" button/link that navigates to PropertySchemaEditor page
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [x] 22.3 Update AdminDashboard incomplete mappings to use direct navigation
  - Replace "Add Properties" button in incomplete mappings dialog with direct navigation link
  - Update link to navigate to /admin/property-schemas with mapping context
  - Remove modal dialog navigation triggers
  - Ensure all links in dashboard use standard navigation, not modal actions
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [x] 22.4 Add navigation context and state management
  - Implement URL parameter parsing in PropertySchemaEditor for mappingId, resourceTypeId, cloudProviderId
  - Add React Router location state to pass display names and additional context
  - Implement breadcrumb component that dynamically builds navigation path
  - Add back button handler that uses React Router history or explicit navigation
  - Test navigation flow from multiple entry points (dashboard, mapping grid)
  - _Requirements: 12.3, 12.4_

- [x] 22.5 Update admin routing configuration
  - Add new route for PropertySchemaEditor: /admin/property-schemas/:mappingId
  - Add alternative route with query parameters: /admin/property-schemas?resourceTypeId=&cloudProviderId=
  - Ensure all admin routes are protected with role-based guards
  - Update admin navigation menu if needed
  - Test all navigation paths and URL structures
  - _Requirements: 12.1, 12.2, 12.3, 12.5_
