# Requirements Document

## Introduction

The Admin Resource Configuration feature enables platform administrators to configure the cloud providers, resource types, and cloud-specific properties that are available to users when creating stacks and blueprints. This configuration drives the dynamic generation of Terraform modules and CI/CD pipelines, allowing the platform to support multiple clouds without hardcoding provider-specific logic.

## Glossary

- **Admin Section**: A restricted area of the application accessible only to administrators for platform configuration
- **Cloud Provider**: A cloud computing platform (AWS, Azure, Google Cloud) that can host infrastructure resources
- **Resource Type**: A category of infrastructure resource (e.g., Managed Container Orchestrator, Relational Database, Storage) that abstracts cloud-specific implementations
- **Cloud-Specific Property**: A configuration parameter unique to a particular Resource Type and Cloud Provider combination (e.g., S3 bucket versioning for AWS Storage)
- **Terraform Module Location**: A reference (URL, path, or repository location) to the Terraform module that provisions a specific Resource Type on a specific Cloud Provider
- **IDP System**: The Internal Developer Platform application that manages stacks and blueprints
- **Stack**: A single microservice or UI application with its associated infrastructure resources
- **Blueprint**: A collection of shared infrastructure resources that multiple stacks can reference
- **Azure Entra ID**: Microsoft's cloud-based identity and access management service used for user authentication
- **Traefik**: A reverse proxy and load balancer that handles routing and authentication integration
- **OAuth Proxy**: An authentication proxy that integrates with Azure Entra ID and forwards user identity information to the IDP System via HTTP headers

## Requirements

### Requirement 1

**User Story:** As a platform administrator, I want to enable or disable cloud providers, so that users can only select from approved cloud platforms for their stacks and blueprints

#### Acceptance Criteria

1. THE IDP System SHALL provide an interface for administrators to view all supported cloud providers
2. WHEN an administrator enables a cloud provider, THE IDP System SHALL make that provider available for selection during stack and blueprint creation
3. WHEN an administrator disables a cloud provider, THE IDP System SHALL prevent users from selecting that provider for new stacks and blueprints
4. THE IDP System SHALL persist cloud provider enablement status across application restarts
5. THE IDP System SHALL display the current enablement status for each cloud provider in the admin interface

### Requirement 2

**User Story:** As a platform administrator, I want to configure which resource types are available, so that users can only provision infrastructure resources that are supported and approved

#### Acceptance Criteria

1. THE IDP System SHALL provide an interface for administrators to create new resource type definitions
2. WHEN an administrator creates a resource type, THE IDP System SHALL require a unique name and description
3. THE IDP System SHALL allow administrators to enable or disable existing resource types
4. WHEN a resource type is disabled, THE IDP System SHALL prevent users from adding that resource type to new stacks and blueprints
5. THE IDP System SHALL display all configured resource types with their enablement status in the admin interface

### Requirement 3

**User Story:** As a platform administrator, I want to define cloud-specific properties for each resource type and cloud provider combination, so that users can configure resources appropriately for their target cloud

#### Acceptance Criteria

1. THE IDP System SHALL provide an interface for administrators to define properties for a specific Resource Type and Cloud Provider combination
2. WHEN an administrator defines a property, THE IDP System SHALL require a property name, data type, and indication of whether the property is required or optional
3. THE IDP System SHALL support the following property data types: string, number, boolean, and list
4. THE IDP System SHALL allow administrators to specify default values for optional properties
5. THE IDP System SHALL validate that property names are unique within a Resource Type and Cloud Provider combination
6. WHEN a user configures a resource in a stack or blueprint, THE IDP System SHALL present only the properties defined for that Resource Type and Cloud Provider combination

### Requirement 4

**User Story:** As a platform administrator, I want to specify the Terraform module location for each resource type and cloud provider combination, so that the system can generate appropriate infrastructure code

#### Acceptance Criteria

1. THE IDP System SHALL provide an interface for administrators to specify a Terraform module location for each Resource Type and Cloud Provider combination
2. THE IDP System SHALL support the following Terraform module location formats: Git repository URL, file system path, and Terraform registry reference
3. WHEN an administrator saves a Terraform module location, THE IDP System SHALL validate that the location format is syntactically correct
4. THE IDP System SHALL require a Terraform module location before a Resource Type and Cloud Provider combination can be used in stacks or blueprints
5. THE IDP System SHALL allow administrators to update Terraform module locations for existing combinations

### Requirement 5

**User Story:** As a platform administrator, I want to restrict access to the admin section, so that only authorized personnel can modify platform configuration

#### Acceptance Criteria

1. THE IDP System SHALL restrict access to the admin section to users with administrator privileges
2. WHEN a non-administrator user attempts to access the admin section, THE IDP System SHALL deny access and return an appropriate error response
3. THE IDP System SHALL determine administrator status based on user attributes provided by the OAuth Proxy in HTTP headers after Azure Entra ID authentication
4. THE IDP System SHALL log all administrative configuration changes with the administrator's identity and timestamp
5. THE IDP System SHALL display the current user's authorization status in the user interface

### Requirement 6

**User Story:** As a platform administrator, I want to view and manage all resource type and cloud provider configurations in one place, so that I can efficiently maintain the platform

#### Acceptance Criteria

1. THE IDP System SHALL provide a dashboard view displaying all configured Resource Types and their associated Cloud Provider mappings
2. THE IDP System SHALL allow administrators to filter the configuration view by Cloud Provider or Resource Type
3. THE IDP System SHALL display the completeness status of each Resource Type and Cloud Provider combination, indicating whether Terraform module location and properties are defined
4. WHEN an administrator selects a Resource Type and Cloud Provider combination, THE IDP System SHALL display all configured properties and the Terraform module location
5. THE IDP System SHALL provide navigation to create, edit, or delete configurations from the dashboard view

### Requirement 7

**User Story:** As a developer, I want to define blueprints with shared infrastructure resources, so that multiple stacks can reuse common infrastructure components

#### Acceptance Criteria

1. THE IDP System SHALL provide an interface for users to create new blueprint definitions
2. WHEN a user creates a blueprint, THE IDP System SHALL allow selection of one or more enabled cloud providers that the blueprint applies to
3. THE IDP System SHALL allow users to add multiple resource types to a blueprint
4. WHEN a user adds a resource type to a blueprint, THE IDP System SHALL present a form with both common properties and cloud-specific properties defined by administrators for that Resource Type and Cloud Provider combination
5. THE IDP System SHALL validate that all required properties are provided before allowing the blueprint to be saved
6. THE IDP System SHALL persist blueprint definitions with their associated cloud providers, resource types, and property values
7. THE IDP System SHALL indicate that blueprint resources are intended for sharing across multiple stacks

### Requirement 8

**User Story:** As a developer, I want to define stacks and associate them with compatible shared resources, so that my microservice or UI can leverage existing infrastructure

#### Acceptance Criteria

1. THE IDP System SHALL provide an interface for users to create new stack definitions
2. WHEN a user creates a stack, THE IDP System SHALL display available blueprints that contain shared resources compatible with the stack type
3. THE IDP System SHALL allow users to select one or more compatible shared resources from blueprints to associate with the stack
4. WHEN a Docker-based microservice stack is created, THE IDP System SHALL allow association with Managed Container Orchestrator resources from blueprints
5. THE IDP System SHALL prevent users from associating incompatible resource types with a stack based on the stack type
6. THE IDP System SHALL persist stack associations with shared blueprint resources

### Requirement 9

**User Story:** As a developer, I want to add non-shared cloud resources to my stack, so that my application has dedicated infrastructure components like databases and storage

#### Acceptance Criteria

1. THE IDP System SHALL allow users to add resource types to a stack that are not shared with other stacks
2. THE IDP System SHALL exclude shared resource types (such as Managed Container Orchestrator) from the list of resources that can be added directly to a stack
3. WHEN a user adds a non-shared resource type to a stack, THE IDP System SHALL present a form with both common properties and cloud-specific properties defined by administrators for that Resource Type and Cloud Provider combination
4. THE IDP System SHALL support adding multiple instances of the same resource type to a stack with different property values
5. THE IDP System SHALL validate that all required properties are provided for each resource before allowing the stack to be saved
6. THE IDP System SHALL persist stack resource definitions with their property values

### Requirement 10

**User Story:** As a developer, I want to see only the cloud providers and resource types that are enabled by administrators, so that I can make valid selections when creating stacks and blueprints

#### Acceptance Criteria

1. WHEN a user creates or edits a stack or blueprint, THE IDP System SHALL display only enabled cloud providers in the provider selection interface
2. WHEN a user adds infrastructure resources to a stack or blueprint, THE IDP System SHALL display only enabled resource types
3. WHEN a user selects a Resource Type and Cloud Provider combination, THE IDP System SHALL present a form with the properties defined by administrators for that combination
4. THE IDP System SHALL validate user-provided property values against the data types defined by administrators
5. WHEN a required property is not provided, THE IDP System SHALL prevent the user from saving the resource configuration and display an appropriate validation message

### Requirement 11

**User Story:** As a platform administrator, I want the admin interface to respect the application's light and dark theme settings, so that I have a consistent visual experience across all pages

#### Acceptance Criteria

1. THE IDP System SHALL apply the current theme (light or dark) to all admin interface components
2. WHEN a user toggles the theme, THE IDP System SHALL update all admin pages to reflect the selected theme
3. THE IDP System SHALL ensure admin components use theme-aware colors, backgrounds, and text styles consistent with other application pages
4. THE IDP System SHALL maintain theme selection across page navigation within the admin section

### Requirement 12

**User Story:** As a platform administrator, I want to navigate directly to the Property Schema Editor without going through modal dialogs, so that I can efficiently manage property configurations

#### Acceptance Criteria

1. THE IDP System SHALL provide direct navigation links to the Property Schema Editor from the admin dashboard
2. WHEN an administrator clicks a navigation link to edit properties, THE IDP System SHALL navigate to the Property Schema Editor page without opening intermediate modal dialogs
3. THE IDP System SHALL pass the necessary context (resource type ID and cloud provider ID) through URL parameters or route state when navigating to the Property Schema Editor
4. THE IDP System SHALL display breadcrumb navigation or a back button in the Property Schema Editor to allow administrators to return to the previous page
5. THE IDP System SHALL NOT use modal dialogs as navigation triggers to non-modal pages
