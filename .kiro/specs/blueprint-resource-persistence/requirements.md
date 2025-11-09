# Requirements Document

## Introduction

The Blueprint Resource Persistence feature enables users to create, update, and delete shared infrastructure resources within blueprints, with changes properly persisted to the backend API. Currently, the backend does not support blueprint resources - the Blueprint entity has no relationship with BlueprintResource entities, and the BlueprintCreateDto does not accept resources. This results in the frontend sending resource data that is completely ignored by the backend.

**Note:** This implementation will modify existing database migration scripts directly rather than creating new migrations. Backward compatibility is not a concern for this feature.

## Glossary

- **Blueprint**: A collection of shared infrastructure resources that multiple stacks can reference
- **Blueprint Resource**: A shared infrastructure component (e.g., Container Orchestrator, Database Server) that belongs to a blueprint
- **IDP System**: The Internal Developer Platform application that manages stacks and blueprints
- **BlueprintCreateDto**: The data transfer object used to create and update blueprints
- **BlueprintResponseDto**: The data transfer object returned when retrieving blueprint information
- **BlueprintService**: The application service that handles blueprint business logic
- **Persisted State**: Data saved to the backend database via API calls
- **Database Migration Script**: Flyway SQL migration files that define database schema changes

## Requirements

### Requirement 1

**User Story:** As a developer, I want to create new shared infrastructure resources within a blueprint, so that the resources are saved to the database and available for use by stacks

#### Acceptance Criteria

1. WHEN a user creates a new resource within a blueprint, THE IDP System SHALL persist the resource to the database with a relationship to the blueprint
2. WHEN the blueprint is retrieved, THE IDP System SHALL include all associated resources in the response
3. THE IDP System SHALL validate that all required resource fields are provided before persisting
4. THE IDP System SHALL validate that the resource type exists before creating the resource
5. THE IDP System SHALL validate that the cloud provider exists and is enabled before creating the resource

### Requirement 2

**User Story:** As a developer, I want to update existing shared infrastructure resources within a blueprint, so that my configuration changes are persisted to the database

#### Acceptance Criteria

1. WHEN a user updates a blueprint with modified resources, THE IDP System SHALL update the existing resources in the database
2. WHEN a resource is removed from the blueprint update payload, THE IDP System SHALL delete that resource from the database
3. WHEN a new resource is added to the blueprint update payload, THE IDP System SHALL create that resource in the database
4. THE IDP System SHALL maintain the relationship between the blueprint and its resources during updates
5. THE IDP System SHALL validate all resource data before persisting updates

### Requirement 3

**User Story:** As a developer, I want to delete shared infrastructure resources from a blueprint, so that unused resources are removed from the database

#### Acceptance Criteria

1. WHEN a user updates a blueprint without a specific resource, THE IDP System SHALL delete that resource from the database
2. WHEN a blueprint is deleted, THE IDP System SHALL delete all associated resources
3. THE IDP System SHALL use cascade delete to ensure orphaned resources are not left in the database
4. THE IDP System SHALL validate that the resource exists before attempting deletion
5. THE IDP System SHALL handle deletion errors gracefully

### Requirement 4

**User Story:** As a developer, I want resource changes to persist across page refreshes, so that I don't lose my work when navigating away from the page

#### Acceptance Criteria

1. WHEN a user creates, updates, or deletes a resource, THE IDP System SHALL persist the changes to the backend database
2. WHEN a user refreshes the page after making resource changes, THE IDP System SHALL display the updated resource list from the server
3. THE IDP System SHALL fetch the latest blueprint data including resources from the server after any blueprint operation
4. THE IDP System SHALL maintain data consistency between the frontend and backend

### Requirement 5

**User Story:** As a developer, I want the backend to accept and return blueprint resources, so that the frontend can properly manage them

#### Acceptance Criteria

1. THE IDP System SHALL accept a resources field in the BlueprintCreateDto
2. THE IDP System SHALL return resources in the BlueprintResponseDto
3. THE IDP System SHALL establish a one-to-many relationship between Blueprint and BlueprintResource entities
4. THE IDP System SHALL use cascade operations to manage the lifecycle of blueprint resources
5. THE IDP System SHALL transform between DTO and entity representations correctly

### Requirement 6

**User Story:** As a developer implementing this feature, I want to modify existing database migration scripts directly, so that the schema changes are integrated into the initial database setup

#### Acceptance Criteria

1. THE IDP System SHALL modify existing Database Migration Scripts to include blueprint resource relationships
2. THE IDP System SHALL NOT create new versioned migration files for this feature
3. THE IDP System SHALL update the schema definition in the existing V1__schema.sql file
4. THE IDP System SHALL update the seed data in the existing V2__data.sql file if needed
5. THE IDP System SHALL ensure the modified migration scripts create the correct database schema when run on a fresh database
