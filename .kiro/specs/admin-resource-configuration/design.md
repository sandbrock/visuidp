# Design Document: Admin Resource Configuration

## Overview

The Admin Resource Configuration feature provides a comprehensive system for platform administrators to configure cloud providers, resource types, and their properties. This configuration drives the dynamic generation of Terraform modules and enables users to create stacks and blueprints with appropriate cloud-specific resources.

The design extends the existing Clean Architecture pattern in the IDP system, adding new domain entities, application services, and REST endpoints for both administrative configuration and user consumption.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │  Admin Controllers   │    │   User Controllers       │  │
│  │  - CloudProviders    │    │   - Stacks (enhanced)    │  │
│  │  - ResourceTypes     │    │   - Blueprints (enhanced)│  │
│  │  - PropertySchemas   │    │                          │  │
│  └──────────────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │  Admin Services      │    │   Domain Services        │  │
│  │  - CloudProviderSvc  │    │   - PropertyValidator    │  │
│  │  - ResourceTypeSvc   │    │   - SchemaResolver       │  │
│  │  - PropertySchemaSvc │    │                          │  │
│  └──────────────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌──────────────────────────────────────────────────────────┤
│  │  Entities:                                               │
│  │  - CloudProvider                                         │
│  │  - ResourceType (unified)                                │
│  │  - ResourceTypeCloudMapping                              │
│  │  - PropertySchema                                        │
│  │  - Stack (enhanced)                                      │
│  │  - Blueprint (enhanced)                                  │
│  └──────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  - PostgreSQL with JSONB for flexible schemas                │
│  - Traefik + OAuth Proxy for authentication                  │
│  - Role-based authorization via security attributes          │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Domain Layer

#### New Entities

**CloudProvider**
```java
@Entity
@Table(name = "cloud_providers")
public class CloudProvider extends PanacheEntityBase {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false, unique = true)
    private String name; // AWS, AZURE, GCP
    
    @Column(nullable = false)
    private String displayName; // "Amazon Web Services"
    
    @Column
    private String description;
    
    @Column(nullable = false)
    private Boolean enabled = false;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
```

**ResourceType** (Unified - replaces StackResourceType and BlueprintResourceType)
```java
@Entity
@Table(name = "resource_types")
public class ResourceType extends PanacheEntityBase {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false, unique = true)
    private String name; // MANAGED_CONTAINER_ORCHESTRATOR, RELATIONAL_DATABASE, etc.
    
    @Column(nullable = false)
    private String displayName;
    
    @Column
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceCategory category; // SHARED, NON_SHARED, BOTH
    
    @Column(nullable = false)
    private Boolean enabled = true;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
```

**ResourceTypeCloudMapping**
```java
@Entity
@Table(name = "resource_type_cloud_mappings")
public class ResourceTypeCloudMapping extends PanacheEntityBase {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_type_id", nullable = false)
    private ResourceType resourceType;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cloud_provider_id", nullable = false)
    private CloudProvider cloudProvider;
    
    @Column(name = "terraform_module_location", nullable = false)
    private String terraformModuleLocation;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "module_location_type", nullable = false)
    private ModuleLocationType moduleLocationType; // GIT, FILE_SYSTEM, REGISTRY
    
    @Column(nullable = false)
    private Boolean enabled = true;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
```

**PropertySchema**
```java
@Entity
@Table(name = "property_schemas")
public class PropertySchema extends PanacheEntityBase {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mapping_id", nullable = false)
    private ResourceTypeCloudMapping mapping;
    
    @Column(nullable = false)
    private String propertyName;
    
    @Column(nullable = false)
    private String displayName;
    
    @Column
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PropertyDataType dataType; // STRING, NUMBER, BOOLEAN, LIST
    
    @Column(nullable = false)
    private Boolean required = false;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "default_value", columnDefinition = "jsonb")
    private Object defaultValue;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_rules", columnDefinition = "jsonb")
    private Map<String, Object> validationRules; // min, max, pattern, etc.
    
    @Column(name = "display_order")
    private Integer displayOrder;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
```

#### Enhanced Entities

**Stack** (modifications)
- Add `@ManyToOne CloudProvider cloudProvider` field
- Enhance resource configuration validation to use PropertySchema

**Blueprint** (modifications)
- Replace `Set<String> supportedCloudTypes` with `@ManyToMany Set<CloudProvider> supportedCloudProviders`
- Add relationship to BlueprintResource entities

**StackResource** (modifications)
- Add `@ManyToOne ResourceType resourceType` field
- Add `@ManyToOne CloudProvider cloudProvider` field
- Configuration JSONB will be validated against PropertySchema

**BlueprintResource** (modifications)
- Add `@ManyToOne CloudProvider cloudProvider` field
- Enhance validation using PropertySchema

#### Value Objects

**ResourceCategory** (enum)
```java
public enum ResourceCategory {
    SHARED,      // Only for blueprints (e.g., ECS Cluster)
    NON_SHARED,  // Only for stacks (e.g., RDS Database)
    BOTH         // Can be used in either context
}
```

**PropertyDataType** (enum)
```java
public enum PropertyDataType {
    STRING,
    NUMBER,
    BOOLEAN,
    LIST
}
```

**ModuleLocationType** (enum)
```java
public enum ModuleLocationType {
    GIT,          // Git repository URL
    FILE_SYSTEM,  // Local file path
    REGISTRY      // Terraform registry reference
}
```

#### Domain Services

**PropertyValidationService**
- Validates user-provided property values against PropertySchema definitions
- Applies data type validation
- Checks required fields
- Applies custom validation rules (min, max, pattern)

**SchemaResolverService**
- Resolves the appropriate PropertySchema set for a given ResourceType + CloudProvider
- Merges common properties with cloud-specific properties
- Provides schema information for UI form generation

### 2. Application Layer

#### DTOs

**CloudProviderDto**
```java
public record CloudProviderDto(
    UUID id,
    String name,
    String displayName,
    String description,
    Boolean enabled,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
```

**ResourceTypeDto**
```java
public record ResourceTypeDto(
    UUID id,
    String name,
    String displayName,
    String description,
    ResourceCategory category,
    Boolean enabled,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
```

**ResourceTypeCloudMappingDto**
```java
public record ResourceTypeCloudMappingDto(
    UUID id,
    UUID resourceTypeId,
    String resourceTypeName,
    UUID cloudProviderId,
    String cloudProviderName,
    String terraformModuleLocation,
    ModuleLocationType moduleLocationType,
    Boolean enabled,
    Boolean isComplete, // Has properties defined
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
```

**PropertySchemaDto**
```java
public record PropertySchemaDto(
    UUID id,
    UUID mappingId,
    String propertyName,
    String displayName,
    String description,
    PropertyDataType dataType,
    Boolean required,
    Object defaultValue,
    Map<String, Object> validationRules,
    Integer displayOrder
) {}
```

**AdminDashboardDto**
```java
public record AdminDashboardDto(
    List<CloudProviderDto> cloudProviders,
    List<ResourceTypeDto> resourceTypes,
    List<ResourceTypeCloudMappingDto> mappings,
    Map<String, Integer> statistics
) {}
```

#### Application Services

**CloudProviderService**
- `List<CloudProviderDto> listAll()`
- `CloudProviderDto getById(UUID id)`
- `CloudProviderDto create(CloudProviderCreateDto dto)`
- `CloudProviderDto update(UUID id, CloudProviderUpdateDto dto)`
- `void toggleEnabled(UUID id, Boolean enabled)`
- `List<CloudProviderDto> listEnabled()`

**ResourceTypeService**
- `List<ResourceTypeDto> listAll()`
- `ResourceTypeDto getById(UUID id)`
- `ResourceTypeDto create(ResourceTypeCreateDto dto)`
- `ResourceTypeDto update(UUID id, ResourceTypeUpdateDto dto)`
- `void toggleEnabled(UUID id, Boolean enabled)`
- `List<ResourceTypeDto> listByCategory(ResourceCategory category)`
- `List<ResourceTypeDto> listEnabledForUser()`

**ResourceTypeCloudMappingService**
- `List<ResourceTypeCloudMappingDto> listAll()`
- `ResourceTypeCloudMappingDto getById(UUID id)`
- `ResourceTypeCloudMappingDto create(ResourceTypeCloudMappingCreateDto dto)`
- `ResourceTypeCloudMappingDto update(UUID id, ResourceTypeCloudMappingUpdateDto dto)`
- `void toggleEnabled(UUID id, Boolean enabled)`
- `List<ResourceTypeCloudMappingDto> listByResourceType(UUID resourceTypeId)`
- `List<ResourceTypeCloudMappingDto> listByCloudProvider(UUID cloudProviderId)`
- `ResourceTypeCloudMappingDto findByResourceTypeAndCloud(UUID resourceTypeId, UUID cloudProviderId)`

**PropertySchemaService**
- `List<PropertySchemaDto> listByMapping(UUID mappingId)`
- `PropertySchemaDto getById(UUID id)`
- `PropertySchemaDto create(PropertySchemaCreateDto dto)`
- `PropertySchemaDto update(UUID id, PropertySchemaUpdateDto dto)`
- `void delete(UUID id)`
- `List<PropertySchemaDto> bulkCreate(UUID mappingId, List<PropertySchemaCreateDto> dtos)`
- `Map<String, PropertySchemaDto> getSchemaMap(UUID resourceTypeId, UUID cloudProviderId)`

**AdminDashboardService**
- `AdminDashboardDto getDashboard()`
- `List<ResourceTypeCloudMappingDto> getIncompleteMappings()`
- `Map<String, Integer> getStatistics()`

### 3. Presentation Layer

#### Admin REST Controllers

**CloudProvidersController** (`/api/v1/admin/cloud-providers`)
- `GET /` - List all cloud providers
- `GET /{id}` - Get cloud provider by ID
- `POST /` - Create new cloud provider
- `PUT /{id}` - Update cloud provider
- `PATCH /{id}/toggle` - Enable/disable cloud provider
- `GET /enabled` - List enabled cloud providers

**ResourceTypesController** (`/api/v1/admin/resource-types`)
- `GET /` - List all resource types
- `GET /{id}` - Get resource type by ID
- `POST /` - Create new resource type
- `PUT /{id}` - Update resource type
- `PATCH /{id}/toggle` - Enable/disable resource type
- `GET /category/{category}` - List by category

**ResourceTypeCloudMappingsController** (`/api/v1/admin/resource-type-cloud-mappings`)
- `GET /` - List all mappings
- `GET /{id}` - Get mapping by ID
- `POST /` - Create new mapping
- `PUT /{id}` - Update mapping
- `PATCH /{id}/toggle` - Enable/disable mapping
- `GET /resource-type/{resourceTypeId}` - List by resource type
- `GET /cloud-provider/{cloudProviderId}` - List by cloud provider

**PropertySchemasController** (`/api/v1/admin/property-schemas`)
- `GET /mapping/{mappingId}` - List properties for a mapping
- `GET /{id}` - Get property schema by ID
- `POST /` - Create new property schema
- `POST /bulk` - Bulk create property schemas
- `PUT /{id}` - Update property schema
- `DELETE /{id}` - Delete property schema

**AdminDashboardController** (`/api/v1/admin/dashboard`)
- `GET /` - Get dashboard overview
- `GET /incomplete-mappings` - Get incomplete mappings
- `GET /statistics` - Get configuration statistics

#### Enhanced User Controllers

**StacksController** (modifications to `/api/v1/stacks`)
- `GET /available-cloud-providers` - List enabled cloud providers
- `GET /available-resource-types` - List enabled non-shared resource types
- `GET /resource-schema/{resourceTypeId}/{cloudProviderId}` - Get property schema for resource configuration

**BlueprintsController** (modifications to `/api/v1/blueprints`)
- `GET /available-cloud-providers` - List enabled cloud providers
- `GET /available-resource-types` - List enabled shared resource types
- `GET /resource-schema/{resourceTypeId}/{cloudProviderId}` - Get property schema for resource configuration

### 4. Infrastructure Layer

#### Security

**Authorization**
- Add `@RolesAllowed("admin")` annotation to all admin controllers
- Implement role extraction from Azure Entra ID groups via OAuth Proxy headers
- Enhance `TraefikAuthenticationMechanism` to parse `X-Auth-Request-Groups` header
- Map specific Azure Entra ID group to "admin" role

**Audit Logging**
- Create `AdminAuditLog` entity to track all configuration changes
- Implement `@Interceptor` for automatic audit logging on admin service methods
- Log: user identity, action, entity type, entity ID, timestamp, changes

#### Database Schema

**Migration Strategy**
1. Create new tables: `cloud_providers`, `resource_types`, `resource_type_cloud_mappings`, `property_schemas`
2. Migrate existing `cloud_types` data to `cloud_providers`
3. Migrate `stack_resource_types` and `blueprint_resource_types` to unified `resource_types`
4. Add foreign key columns to `stacks`, `blueprints`, `stack_resources`, `blueprint_resources`
5. Create indexes on frequently queried columns

## Data Models

### Database Schema

```sql
-- Cloud Providers
CREATE TABLE cloud_providers (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Resource Types (unified)
CREATE TABLE resource_types (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL, -- SHARED, NON_SHARED, BOTH
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Resource Type Cloud Mappings
CREATE TABLE resource_type_cloud_mappings (
    id UUID PRIMARY KEY,
    resource_type_id UUID NOT NULL REFERENCES resource_types(id),
    cloud_provider_id UUID NOT NULL REFERENCES cloud_providers(id),
    terraform_module_location VARCHAR(2048) NOT NULL,
    module_location_type VARCHAR(20) NOT NULL, -- GIT, FILE_SYSTEM, REGISTRY
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE(resource_type_id, cloud_provider_id)
);

-- Property Schemas
CREATE TABLE property_schemas (
    id UUID PRIMARY KEY,
    mapping_id UUID NOT NULL REFERENCES resource_type_cloud_mappings(id) ON DELETE CASCADE,
    property_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    data_type VARCHAR(20) NOT NULL, -- STRING, NUMBER, BOOLEAN, LIST
    required BOOLEAN NOT NULL DEFAULT false,
    default_value JSONB,
    validation_rules JSONB,
    display_order INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE(mapping_id, property_name)
);

-- Admin Audit Log
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    changes JSONB,
    timestamp TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX idx_mappings_resource_type ON resource_type_cloud_mappings(resource_type_id);
CREATE INDEX idx_mappings_cloud_provider ON resource_type_cloud_mappings(cloud_provider_id);
CREATE INDEX idx_property_schemas_mapping ON property_schemas(mapping_id);
CREATE INDEX idx_audit_logs_user ON admin_audit_logs(user_email);
CREATE INDEX idx_audit_logs_timestamp ON admin_audit_logs(timestamp);
```

### Enhanced Existing Tables

```sql
-- Add cloud provider reference to stacks
ALTER TABLE stacks ADD COLUMN cloud_provider_id UUID REFERENCES cloud_providers(id);

-- Add cloud provider references to resources
ALTER TABLE stack_resources ADD COLUMN resource_type_id UUID REFERENCES resource_types(id);
ALTER TABLE stack_resources ADD COLUMN cloud_provider_id UUID REFERENCES cloud_providers(id);

ALTER TABLE blueprint_resources ADD COLUMN cloud_provider_id UUID REFERENCES cloud_providers(id);

-- Blueprint cloud providers (many-to-many)
CREATE TABLE blueprint_cloud_providers (
    blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
    cloud_provider_id UUID NOT NULL REFERENCES cloud_providers(id),
    PRIMARY KEY (blueprint_id, cloud_provider_id)
);
```

## Error Handling

### Validation Errors

**Property Validation**
- Return `400 Bad Request` with detailed validation messages
- Include property name, expected type, and validation rule violated
- Example: `{"field": "maxConnections", "error": "Must be a number between 1 and 1000", "provided": "5000"}`

**Configuration Completeness**
- Prevent enabling a ResourceTypeCloudMapping without Terraform module location
- Prevent enabling a ResourceTypeCloudMapping without at least one property schema
- Return `409 Conflict` with explanation

**Duplicate Prevention**
- Enforce unique constraints at database level
- Return `409 Conflict` for duplicate cloud provider names, resource type names, or mappings
- Include existing entity ID in error response

### Authorization Errors

- Return `403 Forbidden` for non-admin users accessing admin endpoints
- Return `401 Unauthorized` if authentication headers are missing
- Include clear error messages indicating required permissions

### Not Found Errors

- Return `404 Not Found` for non-existent entities
- Include entity type and ID in error message
- Provide suggestions for valid alternatives when applicable

## Testing Strategy

### Unit Tests

**Domain Layer**
- Test PropertyValidationService with various data types and validation rules
- Test SchemaResolverService schema merging logic
- Test entity validation constraints

**Application Layer**
- Test service methods with mocked repositories
- Test DTO mapping logic
- Test business rule enforcement (e.g., completeness checks)

### Integration Tests

**API Tests**
- Test admin CRUD operations for all entities
- Test authorization enforcement (admin vs. non-admin)
- Test cascade operations (deleting mapping deletes property schemas)
- Test user-facing endpoints return only enabled resources
- Test property schema resolution for stack/blueprint resource configuration

**Database Tests**
- Test unique constraints
- Test foreign key relationships
- Test JSONB column operations
- Test migration scripts

### End-to-End Tests

**Admin Workflow**
1. Create cloud provider
2. Create resource type
3. Create mapping between resource type and cloud provider
4. Add property schemas to mapping
5. Enable all entities
6. Verify user can see and use configuration

**User Workflow**
1. Create blueprint with shared resource
2. Configure resource properties using schema
3. Create stack
4. Associate stack with blueprint resource
5. Add non-shared resource to stack
6. Configure resource properties using schema
7. Verify configuration is validated correctly

## UI Considerations

### Admin UI Components

**Cloud Provider Management**
- Table view with enable/disable toggles
- Create/edit modal with name, display name, description
- Visual indicator of enabled status

**Resource Type Management**
- Table view with category filter
- Create/edit modal with category selection
- Enable/disable toggles

**Mapping Management**
- Grid view showing resource types vs. cloud providers
- Color-coded cells: green (complete), yellow (incomplete), gray (not configured)
- Click cell to open inline edit panel or navigate to dedicated mapping page
- Terraform module location input with type selector
- Direct link button to Property Schema Editor (navigates to separate page)

**Property Schema Editor** (Standalone Page)
- Accessed via direct navigation from mapping management or dashboard
- URL structure: `/admin/property-schemas?resourceTypeId={id}&cloudProviderId={id}` or `/admin/property-schemas/{mappingId}`
- Breadcrumb navigation showing: Admin Dashboard > Resource Type Cloud Mappings > Property Schema Editor
- Back button to return to previous page
- Form builder interface for defining properties
- Drag-and-drop reordering for display order
- Data type selector with appropriate input controls
- Validation rule builder (min, max, pattern, etc.)
- Preview of generated form
- Save and return to previous page

**Dashboard**
- Statistics cards (total providers, resource types, mappings, properties)
- Incomplete mappings list with direct navigation links to Property Schema Editor
- Recent audit log entries

**Navigation Principles**
- Modal dialogs are used ONLY for simple CRUD operations (create/edit single entities)
- Complex multi-step workflows use dedicated pages with proper routing
- All navigation to non-modal pages uses standard links/buttons, not modal dialog actions
- Context is passed via URL parameters or React Router state
- Breadcrumbs or back buttons provide clear navigation paths

### Theme Support

**Implementation Approach**
- All admin components SHALL use the existing ThemeContext from `src/contexts/ThemeContext.tsx`
- Admin component CSS files SHALL define theme-aware styles using CSS custom properties or conditional classes
- Color schemes SHALL match the existing application theme patterns:
  - Light theme: light backgrounds, dark text, subtle borders
  - Dark theme: dark backgrounds, light text, contrasted borders
- Syncfusion components used in admin pages SHALL respect theme settings through appropriate theme class application

**CSS Strategy**
- Use the `theme` class on parent containers (e.g., `className={theme}`)
- Define CSS rules with theme-specific selectors (e.g., `.light .admin-card`, `.dark .admin-card`)
- Ensure all interactive elements (buttons, inputs, modals) inherit theme styles
- Maintain consistent spacing, typography, and visual hierarchy across themes

### User UI Enhancements

**Stack/Blueprint Creation**
- Cloud provider dropdown (only enabled providers)
- Resource type selection (filtered by category and enabled status)
- Dynamic form generation based on property schemas
- Real-time validation feedback
- Help text from property descriptions

## Navigation Flow

### Admin Navigation Architecture

The admin section uses a clear separation between modal dialogs and full-page navigation:

**Modal Dialog Use Cases:**
- Creating a new cloud provider
- Editing cloud provider details
- Creating a new resource type
- Editing resource type details
- Quick view of mapping details

**Full-Page Navigation Use Cases:**
- Property Schema Editor (complex multi-property configuration)
- Resource Type Cloud Mapping management (when editing multiple fields)
- Dashboard overview

**Navigation Patterns:**

1. **Dashboard → Property Schema Editor**
   - Incomplete mappings list shows "Configure Properties" link
   - Link navigates to: `/admin/property-schemas/{mappingId}`
   - Passes mapping context via URL parameter

2. **Mapping Management → Property Schema Editor**
   - Grid cell shows "Edit Properties" button
   - Button navigates to: `/admin/property-schemas?resourceTypeId={id}&cloudProviderId={id}`
   - Passes context via URL parameters

3. **Property Schema Editor → Previous Page**
   - Breadcrumb navigation or back button
   - Uses browser history or React Router navigation
   - Preserves any filters or state from previous page

**URL Structure:**
- `/admin/dashboard` - Main admin dashboard
- `/admin/cloud-providers` - Cloud provider management (if separate page)
- `/admin/resource-types` - Resource type management (if separate page)
- `/admin/mappings` - Resource type cloud mapping management
- `/admin/property-schemas/{mappingId}` - Property schema editor by mapping ID
- `/admin/property-schemas?resourceTypeId={id}&cloudProviderId={id}` - Property schema editor by resource type and cloud provider

**State Management:**
- URL parameters carry essential context (IDs)
- React Router location state can carry additional context (names, display info)
- No reliance on modal dialog state for navigation

## Migration Plan

### Phase 1: Database Schema
1. Create new tables
2. Migrate existing data
3. Add foreign key columns to existing tables
4. Create indexes

### Phase 2: Domain and Application Layers
1. Implement new entities
2. Implement domain services
3. Implement application services and DTOs
4. Update existing services to use new entities

### Phase 3: Presentation Layer
1. Implement admin controllers
2. Enhance existing user controllers
3. Implement authorization
4. Implement audit logging

### Phase 4: UI Implementation
1. Implement admin UI components
2. Enhance stack/blueprint forms
3. Integrate property schema-driven forms

### Phase 5: Testing and Deployment
1. Write and execute tests
2. Perform data migration in staging
3. Deploy to production
4. Monitor and iterate

## Design Decisions and Rationales

### Unified Resource Type Entity
**Decision**: Merge `StackResourceType` and `BlueprintResourceType` into a single `ResourceType` entity with a `category` field.

**Rationale**: 
- Reduces duplication
- Some resources can be used in both contexts (category = BOTH)
- Simplifies admin configuration
- Easier to maintain consistency

### JSONB for Property Schemas
**Decision**: Store validation rules and default values in JSONB columns.

**Rationale**:
- Flexible schema for different validation rule types
- Avoids creating multiple tables for different rule types
- PostgreSQL JSONB provides good query performance
- Aligns with existing pattern in the codebase

### Separate PropertySchema Entity
**Decision**: Create a dedicated entity for property schemas rather than embedding in ResourceTypeCloudMapping.

**Rationale**:
- Allows multiple properties per mapping
- Easier to query and manage individual properties
- Supports ordering and complex validation rules
- Enables bulk operations

### Role-Based Authorization
**Decision**: Use role-based authorization with "admin" role extracted from Azure Entra ID groups.

**Rationale**:
- Leverages existing authentication infrastructure
- Centralized user management in Azure Entra ID
- No need for separate admin user management in IDP
- Aligns with enterprise security practices

### Audit Logging
**Decision**: Implement comprehensive audit logging for all admin actions.

**Rationale**:
- Compliance and security requirements
- Troubleshooting configuration issues
- Understanding configuration evolution over time
- Accountability for changes

### Terraform Module Location Types
**Decision**: Support multiple module location types (Git, File System, Registry).

**Rationale**:
- Flexibility in module storage
- Supports different organizational practices
- Enables local development and testing
- Future-proof for different Terraform workflows
