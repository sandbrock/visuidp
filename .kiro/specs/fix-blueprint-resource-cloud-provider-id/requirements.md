# Requirements Document

## Introduction

When editing a blueprint resource in the Infrastructure page, the DynamicResourceForm attempts to fetch property schemas using the cloud provider identifier. However, the system is currently passing a cloud type string (e.g., "AWS") instead of the cloud provider UUID, resulting in 404 errors and preventing the form from loading cloud-specific properties.

This feature will fix the data transformation and state management to ensure the correct cloud provider UUID is used when fetching property schemas for blueprint resources.

## Glossary

- **Blueprint**: A reusable infrastructure pattern containing shared resources
- **Blueprint Resource**: An infrastructure resource (e.g., storage, database) that is part of a blueprint
- **Cloud Provider**: A cloud service provider entity with a UUID identifier (e.g., AWS, Azure, GCP)
- **Cloud Type**: A string identifier for cloud provider types (e.g., "aws", "azure", "gcp")
- **Property Schema**: Configuration schema defining cloud-specific properties for a resource type
- **DynamicResourceForm**: React component that dynamically generates form inputs based on property schemas
- **Frontend**: The React-based UI application (idp-ui)
- **Backend DTO**: Data Transfer Object used for API communication

## Requirements

### Requirement 1: Cloud Provider ID Resolution

**User Story:** As a developer editing a blueprint resource, I want the form to correctly identify the cloud provider so that cloud-specific properties load without errors

#### Acceptance Criteria

1. WHEN a blueprint is fetched from the backend, THE Frontend SHALL transform the backend DTO to include the cloud provider UUID in the `cloudProviderId` field
2. WHEN a blueprint resource contains a `cloudType` field from the backend, THE Frontend SHALL resolve the cloud type string to the corresponding cloud provider UUID
3. WHEN the cloud provider UUID cannot be resolved, THE Frontend SHALL log a warning and set `cloudProviderId` to an empty string
4. WHEN the `DynamicResourceForm` receives a `cloudProviderId`, THE Frontend SHALL use this UUID to fetch property schemas from the API

### Requirement 2: Form State Management

**User Story:** As a developer editing a blueprint resource, I want the cloud provider dropdown to display the correct selection so that I can see which provider is currently configured

#### Acceptance Criteria

1. WHEN loading an existing blueprint resource for editing, THE BlueprintForm SHALL populate the cloud provider dropdown with the resolved cloud provider UUID
2. WHEN the cloud provider list is loaded, THE BlueprintForm SHALL maintain a mapping between cloud provider UUIDs and cloud type strings
3. WHEN a user changes the cloud provider selection, THE BlueprintForm SHALL update both the `cloudProviderId` and reset the configuration object
4. WHEN saving a blueprint resource, THE BlueprintForm SHALL transform the cloud provider UUID back to the cloud type string for backend compatibility

### Requirement 3: Error Handling

**User Story:** As a developer, I want clear error messages when cloud provider resolution fails so that I can understand and fix configuration issues

#### Acceptance Criteria

1. WHEN a cloud type string cannot be mapped to a cloud provider UUID, THE Frontend SHALL display an error message indicating the unmapped cloud type
2. WHEN the property schema API returns a 404 error, THE DynamicResourceForm SHALL display a user-friendly message indicating no schema is configured
3. WHEN the cloud provider list fails to load, THE BlueprintForm SHALL display an error message and disable resource editing
4. IF a blueprint resource has an invalid cloud provider reference, THEN THE BlueprintForm SHALL allow the user to select a valid cloud provider to fix the issue

### Requirement 4: Backward Compatibility

**User Story:** As a system administrator, I want existing blueprints to continue working after the fix so that no data migration is required

#### Acceptance Criteria

1. WHEN transforming backend DTOs, THE Frontend SHALL support both `cloudType` string and `cloudProviderId` UUID fields
2. WHEN sending data to the backend, THE Frontend SHALL continue using the `cloudType` field format expected by the backend API
3. WHEN a blueprint resource is missing cloud provider information, THE Frontend SHALL handle the missing data gracefully without crashing
4. WHEN displaying existing blueprints, THE Frontend SHALL correctly resolve cloud provider names for display purposes
