# Requirements Document

## Introduction

The Dynamic Infrastructure Forms feature replaces hardcoded cloud-specific property forms with dynamic forms that are generated from property schemas configured by administrators. This enables the platform to support new cloud providers and resource types without requiring code changes to the frontend, making the system more flexible and maintainable.

## Glossary

- **Property Schema**: A database-defined configuration that specifies the properties available for a specific Resource Type and Cloud Provider combination, including data type, validation rules, and display information
- **Dynamic Form**: A user interface form that is generated at runtime based on Property Schema definitions rather than hardcoded in the application
- **Cloud-Specific Properties**: Configuration parameters unique to a particular Resource Type and Cloud Provider combination (e.g., S3 bucket versioning for AWS Storage)
- **Resource Type**: A category of infrastructure resource (e.g., Storage, Relational Database Server, Container Orchestrator)
- **Cloud Provider**: A cloud computing platform (AWS, Azure, Google Cloud) that can host infrastructure resources
- **Blueprint**: A collection of shared infrastructure resources that multiple stacks can reference
- **Blueprint Resource**: An infrastructure resource defined within a Blueprint
- **IDP System**: The Internal Developer Platform application that manages stacks and blueprints
- **Infrastructure Component**: The React component in the frontend that displays and manages Blueprint resources

## Requirements

### Requirement 1

**User Story:** As a developer, I want to see property forms that are automatically generated from admin-configured schemas, so that I can configure resources without waiting for code changes when new properties are added

#### Acceptance Criteria

1. WHEN a developer selects a Resource Type and Cloud Provider combination for a Blueprint resource, THE IDP System SHALL fetch the property schema from the backend
2. THE IDP System SHALL generate a form dynamically based on the retrieved property schema
3. THE IDP System SHALL display properties in the order specified by the displayOrder field in the property schema
4. THE IDP System SHALL render appropriate input controls based on the property data type (STRING, NUMBER, BOOLEAN, LIST)
5. THE IDP System SHALL display property labels using the displayName field from the property schema

### Requirement 2

**User Story:** As a developer, I want to see helpful descriptions for each property, so that I understand what values to provide without consulting external documentation

#### Acceptance Criteria

1. WHEN a property has a description in the property schema, THE IDP System SHALL display the description as help text near the input control
2. THE IDP System SHALL display help text in a visually distinct style that does not interfere with the input control
3. THE IDP System SHALL support multi-line descriptions for complex properties
4. THE IDP System SHALL display help text consistently across all property types

### Requirement 3

**User Story:** As a developer, I want required properties to be clearly marked, so that I know which fields must be filled before saving

#### Acceptance Criteria

1. WHEN a property is marked as required in the property schema, THE IDP System SHALL display a visual indicator (such as an asterisk) next to the property label
2. THE IDP System SHALL prevent form submission if required properties are not provided
3. THE IDP System SHALL display a validation error message when a required property is missing
4. THE IDP System SHALL highlight required properties that are missing with a visual indicator

### Requirement 4

**User Story:** As a developer, I want property values to be validated according to admin-defined rules, so that I receive immediate feedback on invalid inputs

#### Acceptance Criteria

1. WHEN a property has validation rules defined in the property schema, THE IDP System SHALL apply those rules to user input
2. THE IDP System SHALL support validation rules for minimum and maximum values for NUMBER properties
3. THE IDP System SHALL support validation rules for string patterns (regex) for STRING properties
4. WHEN a validation rule is violated, THE IDP System SHALL display an inline error message explaining the violation
5. THE IDP System SHALL prevent form submission if any validation rules are violated

### Requirement 5

**User Story:** As a developer, I want to see default values pre-populated in the form, so that I can quickly configure resources with recommended settings

#### Acceptance Criteria

1. WHEN a property has a default value defined in the property schema, THE IDP System SHALL pre-populate the input control with that value
2. THE IDP System SHALL allow developers to override default values
3. THE IDP System SHALL apply default values only when creating new resources, not when editing existing resources
4. THE IDP System SHALL handle default values correctly for all data types (STRING, NUMBER, BOOLEAN, LIST)

### Requirement 6

**User Story:** As a developer, I want LIST properties to be rendered as dropdown selects with predefined options, so that I can choose from valid values without typing

#### Acceptance Criteria

1. WHEN a property has data type LIST and validation rules containing allowed values, THE IDP System SHALL render a dropdown select control
2. THE IDP System SHALL populate the dropdown with the allowed values from the validation rules
3. THE IDP System SHALL display user-friendly labels for dropdown options if provided in the validation rules
4. THE IDP System SHALL support single-select dropdowns for LIST properties
5. THE IDP System SHALL validate that the selected value is one of the allowed values

### Requirement 7

**User Story:** As a developer, I want BOOLEAN properties to be rendered as checkboxes or toggle switches, so that I can easily enable or disable features

#### Acceptance Criteria

1. WHEN a property has data type BOOLEAN, THE IDP System SHALL render a checkbox or toggle switch control
2. THE IDP System SHALL display the property label next to the checkbox
3. THE IDP System SHALL handle true/false values correctly when saving and loading
4. THE IDP System SHALL apply default values for BOOLEAN properties if specified in the schema

### Requirement 8

**User Story:** As a developer, I want NUMBER properties to be validated for numeric input, so that I cannot accidentally enter invalid values

#### Acceptance Criteria

1. WHEN a property has data type NUMBER, THE IDP System SHALL render a numeric input control
2. THE IDP System SHALL prevent non-numeric characters from being entered
3. THE IDP System SHALL validate minimum and maximum values if specified in the validation rules
4. THE IDP System SHALL display validation errors for out-of-range values
5. THE IDP System SHALL handle integer and decimal numbers correctly

### Requirement 9

**User Story:** As a developer, I want the dynamic forms to replace the hardcoded cloud-specific property forms, so that the system is consistent and maintainable

#### Acceptance Criteria

1. THE IDP System SHALL remove hardcoded cloud-specific property rendering functions (renderAWSProperties, renderAzureProperties, renderGCPProperties)
2. THE IDP System SHALL use the dynamic form component for all cloud-specific properties
3. THE IDP System SHALL handle cases where no property schema is defined for a Resource Type and Cloud Provider combination by displaying an appropriate message
4. THE IDP System SHALL fetch property schemas only when needed to minimize API calls

### Requirement 10

**User Story:** As a developer, I want the dynamic forms to load quickly, so that I can configure resources without delays

#### Acceptance Criteria

1. THE IDP System SHALL cache property schemas after the first fetch to avoid redundant API calls
2. THE IDP System SHALL display a loading indicator while fetching property schemas
3. THE IDP System SHALL handle API errors gracefully and display an error message if schemas cannot be loaded
4. THE IDP System SHALL load property schemas asynchronously without blocking the rest of the form
5. THE IDP System SHALL invalidate cached schemas when the user refreshes the page or navigates away and back

### Requirement 11

**User Story:** As a developer, I want the dynamic forms to respect the application's theme, so that I have a consistent visual experience

#### Acceptance Criteria

1. THE IDP System SHALL apply the current theme (light or dark) to all dynamically generated form controls
2. THE IDP System SHALL use theme-aware colors for labels, input controls, help text, and validation messages
3. THE IDP System SHALL ensure dynamically generated forms match the visual style of other forms in the application
4. THE IDP System SHALL maintain theme consistency when toggling between light and dark modes

### Requirement 12

**User Story:** As a developer, I want to see a clear message when no properties are defined for a resource type and cloud provider combination, so that I understand why the form is empty

#### Acceptance Criteria

1. WHEN no property schema is defined for a Resource Type and Cloud Provider combination, THE IDP System SHALL display a message indicating that no cloud-specific properties are configured
2. THE IDP System SHALL allow the developer to save the resource without cloud-specific properties if none are required
3. THE IDP System SHALL provide guidance on how to request new properties (e.g., contact administrator)
4. THE IDP System SHALL distinguish between "no properties defined" and "properties loading" states

### Requirement 13

**User Story:** As a developer, I want validation errors to be displayed inline with the input controls, so that I can quickly identify and fix issues

#### Acceptance Criteria

1. WHEN a validation error occurs, THE IDP System SHALL display the error message directly below the input control
2. THE IDP System SHALL highlight the input control with an error state (e.g., red border)
3. THE IDP System SHALL clear validation errors when the user corrects the input
4. THE IDP System SHALL display multiple validation errors if multiple properties are invalid
5. THE IDP System SHALL prevent form submission until all validation errors are resolved

### Requirement 14

**User Story:** As a developer, I want the dynamic form component to be reusable across different parts of the application, so that property configuration is consistent everywhere

#### Acceptance Criteria

1. THE IDP System SHALL implement the dynamic form as a reusable React component
2. THE IDP System SHALL allow the dynamic form component to be used in both Blueprint resource configuration and Stack resource configuration
3. THE IDP System SHALL support passing property schemas as props to the dynamic form component
4. THE IDP System SHALL support passing current property values and onChange handlers to the dynamic form component
5. THE IDP System SHALL ensure the dynamic form component is self-contained and does not depend on parent component state beyond props

### Requirement 15

**User Story:** As a developer, I want NUMBER property default values to be stored and displayed as numeric values without quotation marks, so that numeric inputs show clean default values

#### Acceptance Criteria

1. THE IDP System SHALL store default values for NUMBER properties as JSON numeric values in the database
2. THE IDP System SHALL not wrap numeric default values in string quotation marks in the database
3. WHEN a NUMBER property has a default value, THE IDP System SHALL display the numeric value without quotation marks in the input control
4. THE IDP System SHALL handle numeric default values correctly when applying them to new resources
5. THE IDP System SHALL validate that default values for NUMBER properties are within the specified min and max range if validation rules are defined
