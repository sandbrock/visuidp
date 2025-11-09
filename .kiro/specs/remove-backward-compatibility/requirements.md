# Requirements Document

## Introduction

This feature removes backward compatibility code from the database migrations. The system has no users and does not require backward compatibility support. The legacy tables `cloud_types`, `blueprint_resource_types`, and `stack_resource_types` were replaced by new unified tables (`cloud_providers`, `resource_types`) but seed data still populates both old and new tables unnecessarily.

## Glossary

- **Migration Script**: Flyway SQL migration file that defines database schema changes and seed data
- **Legacy Tables**: Deprecated database tables (`cloud_types`, `blueprint_resource_types`, `stack_resource_types`) that have been replaced by new unified tables
- **Seed Data**: Initial data inserted into database tables during migration
- **V1 Migration**: The first Flyway migration file (V1__schema.sql) that contains database schema definitions
- **V2 Migration**: The second Flyway migration file (V2__data.sql) that contains seed data
- **Current Tables**: Active database tables (`cloud_providers`, `resource_types`, `blueprint_cloud_providers`) that replace legacy structures
- **Java Entity**: JPA entity class that maps to database tables and defines object-relational mapping

## Requirements

### Requirement 1

**User Story:** As a developer, I want the database migrations to only populate current tables, so that the codebase is clean and maintainable without unnecessary legacy code.

#### Acceptance Criteria

1. WHEN THE V2 migration executes, THE Migration Script SHALL insert seed data only into the `cloud_providers` table
2. WHEN THE V2 migration executes, THE Migration Script SHALL insert seed data only into the `resource_types` table
3. THE Migration Script SHALL NOT insert any data into the `cloud_types` table during V2 migration execution
4. THE Migration Script SHALL NOT insert any data into the `blueprint_resource_types` table during V2 migration execution
5. THE Migration Script SHALL NOT insert any data into the `stack_resource_types` table during V2 migration execution

### Requirement 2

**User Story:** As a developer, I want the V1 schema migration to only define current tables, so that the database schema reflects only the active data model.

#### Acceptance Criteria

1. THE V1 Migration SHALL define the `cloud_providers` table schema
2. THE V1 Migration SHALL define the `resource_types` table schema
3. THE V1 Migration SHALL NOT define the `cloud_types` table schema
4. THE V1 Migration SHALL NOT define the `blueprint_resource_types` table schema
5. THE V1 Migration SHALL NOT define the `stack_resource_types` table schema

### Requirement 3

**User Story:** As a developer, I want all references to legacy tables removed from the schema, so that the database structure is simplified and easier to understand.

#### Acceptance Criteria

1. THE Migration Script SHALL NOT create any foreign key constraints referencing `cloud_types` during V1 migration execution
2. THE Migration Script SHALL NOT create any indexes on Legacy Tables during V1 migration execution
3. THE V1 Migration SHALL remove the `blueprint_supported_clouds` table definition
4. THE V1 Migration SHALL use only the `blueprint_cloud_providers` junction table for blueprint-cloud relationships
5. THE V1 Migration SHALL update the `environments` table to reference `cloud_providers` instead of `cloud_types`

### Requirement 4

**User Story:** As a developer, I want all Java entities to reference only current tables, so that the application code matches the cleaned database schema.

#### Acceptance Criteria

1. THE BlueprintResource entity SHALL reference the `resource_types` table through a `resourceType` field
2. THE BlueprintResource entity SHALL NOT reference the `blueprint_resource_types` table
3. THE Environment entity SHALL reference the `cloud_providers` table through a `cloudProvider` field
4. THE Environment entity SHALL NOT reference the `cloud_types` table
5. THE application SHALL compile and run without schema validation errors after entity updates
