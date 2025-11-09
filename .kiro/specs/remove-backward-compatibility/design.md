# Design Document

## Overview

This design removes all backward compatibility code from the database migrations and Java entities. The project has no users, so maintaining legacy table structures is unnecessary overhead. The cleanup involves removing legacy table definitions from V1__schema.sql, removing legacy seed data from V2__data.sql, and updating Java entities to reference only current tables.

## Architecture

### Current State

The database migrations contain both old and new table structures:

**Legacy Tables (to be removed):**
- `cloud_types` - replaced by `cloud_providers`
- `blueprint_resource_types` - replaced by `resource_types` (category='SHARED')
- `stack_resource_types` - replaced by `resource_types` (category='NON_SHARED')
- `blueprint_supported_clouds` - replaced by `blueprint_cloud_providers`

**Current Tables (to be kept):**
- `cloud_providers` - enhanced cloud provider management
- `resource_types` - unified resource type catalog with category field
- `blueprint_cloud_providers` - many-to-many junction table

### Target State

After cleanup:
- V1__schema.sql will only define current tables
- V2__data.sql will only seed current tables
- All foreign key references will point to current tables
- The `environments` table will reference `cloud_providers` directly
- Java entities will reference only current tables, eliminating schema validation errors

## Components and Interfaces

### V1__schema.sql Changes

**Tables to Remove:**
1. `cloud_types` table definition
2. `blueprint_resource_types` table definition
3. `stack_resource_types` table definition
4. `blueprint_supported_clouds` table definition

**Foreign Key Updates:**
- `environments.cloud_type_id` → rename to `cloud_provider_id` and reference `cloud_providers(id)`
- `blueprint_resources.blueprint_resource_type_id` → rename to `resource_type_id` and reference `resource_types(id)`

**Index Updates:**
- Remove: `idx_environments_cloud_type_id`
- Remove: `idx_blueprint_resources_type_id`
- Remove: `idx_blueprint_supported_clouds_blueprint_id`
- Add: `idx_environments_cloud_provider_id`
- Add: `idx_blueprint_resources_resource_type_id`

### V2__data.sql Changes

**Seed Data to Remove:**
1. All INSERT statements for `cloud_types` table
2. All INSERT statements for `blueprint_resource_types` table
3. All INSERT statements for `stack_resource_types` table

**Seed Data to Keep:**
1. `cloud_providers` inserts (AWS, Azure, GCP)
2. `resource_types` inserts (all categories)
3. `environments` inserts (Development, Production)

**Comments to Remove:**
- Remove "Seed cloud_types for backward compatibility" comment
- Remove "Seed legacy tables for backward compatibility" comment
- Update section headers to remove "(replaces X)" references

### Java Entity Changes

**BlueprintResource Entity Updates:**
- Change `@JoinColumn(name = "blueprint_resource_type_id")` to `@JoinColumn(name = "resource_type_id")`
- Change field name from `blueprintResourceType` to `resourceType`
- Update field type from `BlueprintResourceType` to `ResourceType`

**EnvironmentEntity Updates:**
- Change `@JoinColumn(name = "cloud_type_id")` to `@JoinColumn(name = "cloud_provider_id")`
- Change field name from `cloudType` to `cloudProvider`
- Update field type from `CloudType` to `CloudProvider`

**Entities to Remove:**
- Delete `BlueprintResourceType.java` entity class
- Delete `StackResourceType.java` entity class
- Delete `CloudType.java` entity class

## Data Models

### Java Entity Changes

**BlueprintResource Entity Before:**
```java
@Entity
@Table(name = "blueprint_resources")
public class BlueprintResource extends PanacheEntityBase {
    // ...
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blueprint_resource_type_id", nullable = false)
    public BlueprintResourceType blueprintResourceType;
    // ...
}
```

**BlueprintResource Entity After:**
```java
@Entity
@Table(name = "blueprint_resources")
public class BlueprintResource extends PanacheEntityBase {
    // ...
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_type_id", nullable = false)
    public ResourceType resourceType;
    // ...
}
```

**EnvironmentEntity Before:**
```java
@Entity
@Table(name = "environments")
public class EnvironmentEntity extends PanacheEntityBase {
    // ...
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cloud_type_id", nullable = false)
    public CloudType cloudType;
    // ...
}
```

**EnvironmentEntity After:**
```java
@Entity
@Table(name = "environments")
public class EnvironmentEntity extends PanacheEntityBase {
    // ...
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cloud_provider_id", nullable = false)
    public CloudProvider cloudProvider;
    // ...
}
```

### Environments Table Schema Change

**Before:**
```sql
CREATE TABLE environments (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    cloud_type_id UUID NOT NULL,  -- references cloud_types
    ...
    CONSTRAINT fk_environments_cloud_type FOREIGN KEY (cloud_type_id) REFERENCES cloud_types(id)
);
```

**After:**
```sql
CREATE TABLE environments (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    cloud_provider_id UUID NOT NULL,  -- references cloud_providers
    ...
    CONSTRAINT fk_environments_cloud_provider FOREIGN KEY (cloud_provider_id) REFERENCES cloud_providers(id)
);
```

### Blueprint Resources Table Schema Change

**Before:**
```sql
CREATE TABLE blueprint_resources (
    ...
    blueprint_resource_type_id UUID NOT NULL,
    ...
    CONSTRAINT fk_blueprint_resources_type FOREIGN KEY (blueprint_resource_type_id) REFERENCES blueprint_resource_types(id)
);
```

**After:**
```sql
CREATE TABLE blueprint_resources (
    ...
    resource_type_id UUID NOT NULL,
    ...
    CONSTRAINT fk_blueprint_resources_resource_type FOREIGN KEY (resource_type_id) REFERENCES resource_types(id)
);
```

## Error Handling

No special error handling required. This is a schema cleanup that:
- Removes unused table definitions
- Removes unused seed data
- Updates column names and foreign keys to reference current tables
- Updates Java entities to match the cleaned schema

If the migration fails, Flyway will prevent the changes from being applied and the database will remain in its previous state. The Java entity changes must be coordinated with the schema changes to prevent compilation errors.

## Testing Strategy

### Manual Verification

1. Drop and recreate the database
2. Run Flyway migrations
3. Verify that only current tables exist:
   - `cloud_providers` exists
   - `resource_types` exists
   - `blueprint_cloud_providers` exists
   - `cloud_types` does NOT exist
   - `blueprint_resource_types` does NOT exist
   - `stack_resource_types` does NOT exist
   - `blueprint_supported_clouds` does NOT exist

4. Verify seed data is present in current tables:
   - 3 rows in `cloud_providers` (AWS, Azure, GCP)
   - 8 rows in `resource_types` (4 SHARED, 4 NON_SHARED)
   - 2 rows in `environments` (Development, Production)

5. Verify foreign key relationships work:
   - `environments.cloud_provider_id` references `cloud_providers.id`
   - `blueprint_resources.resource_type_id` references `resource_types.id`

### Automated Testing

Run existing test suite to ensure no regressions:
```bash
cd idp-api
./mvnw test
```

The test suite should pass after updating Java entities to reference current tables. Any tests that fail due to entity changes will need to be updated to use the new field names and types.

### Schema Validation Testing

Run the application in development mode to verify schema validation passes:
```bash
cd idp-api
./mvnw quarkus:dev
```

The application should start without Hibernate schema validation errors, confirming that the Java entities match the database schema.
