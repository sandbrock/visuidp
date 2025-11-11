# Requirements Document

## Introduction

This feature addresses a data consistency issue in the blueprint editor where users can select cloud providers for blueprint resources that are not enabled in the parent blueprint. When a blueprint has a subset of cloud providers selected (e.g., only AWS and Azure), the blueprint resource editor should only allow selecting those same cloud providers, not all available cloud providers in the system.

## Glossary

- **Blueprint**: A reusable infrastructure pattern that defines shared resources and supports multiple cloud providers
- **Blueprint Resource**: An infrastructure resource (e.g., database, container orchestrator) that is part of a blueprint
- **Cloud Provider**: A cloud platform (AWS, Azure, GCP, etc.) that can host infrastructure resources
- **Blueprint Form**: The UI component that allows users to create or edit blueprints
- **Resource Configuration**: The per-cloud properties and settings for a blueprint resource
- **Property Schema Editor**: The UI component for defining property schemas for resource type cloud mappings

## Requirements

### Requirement 1: Blueprint Resource Cloud Provider Filtering

**User Story:** As a platform administrator creating a blueprint, I want the blueprint resource editor to only show cloud providers that I have selected for the blueprint, so that I cannot accidentally configure resources for unsupported cloud providers.

#### Acceptance Criteria

1. WHEN a user selects cloud providers for a blueprint using checkboxes, THE Blueprint Form SHALL store the selected cloud provider IDs in state
2. WHEN a user adds a blueprint resource, THE Blueprint Form SHALL filter the cloud provider dropdown to only include cloud providers that are selected for the blueprint
3. WHEN a user changes the cloud provider selection for a blueprint resource, THE Blueprint Form SHALL only display cloud providers that are currently selected for the blueprint
4. WHEN a user deselects a cloud provider from the blueprint, THE Blueprint Form SHALL remove any blueprint resources that were configured for that cloud provider
5. WHEN a user views the "Add Shared Resource" dropdown, THE Blueprint Form SHALL only show cloud provider options for providers that are selected in the blueprint

### Requirement 2: Existing Resource Validation and Editing

**User Story:** As a platform administrator editing an existing blueprint, I want the system to validate that all existing blueprint resources use cloud providers that are selected for the blueprint, so that I can identify and fix any data inconsistencies.

#### Acceptance Criteria

1. WHEN a user loads an existing blueprint for editing, THE Blueprint Form SHALL validate that each blueprint resource's cloud provider is in the blueprint's supported cloud providers list
2. WHEN a user edits an existing blueprint resource's cloud provider, THE Blueprint Form SHALL only display cloud providers that are currently selected for the blueprint in the dropdown
3. IF a blueprint resource has a cloud provider that is not in the blueprint's supported cloud providers list, THEN THE Blueprint Form SHALL display a warning message to the user
4. WHEN a user attempts to save a blueprint with invalid resource cloud providers, THE Blueprint Form SHALL prevent the save operation and display an error message
5. WHEN a user removes a cloud provider from the blueprint that has associated resources, THE Blueprint Form SHALL display a confirmation dialog listing the resources that will be removed

### Requirement 3: Dynamic Resource Form Cloud Provider Filtering

**User Story:** As a platform administrator configuring a blueprint resource, I want the dynamic resource form to only request properties for the selected cloud provider, so that I am not confused by irrelevant configuration options.

#### Acceptance Criteria

1. WHEN a blueprint resource is displayed in the Blueprint Form, THE DynamicResourceForm component SHALL receive the selected cloud provider ID as a prop
2. WHEN the DynamicResourceForm component loads property schemas, THE DynamicResourceForm component SHALL only load schemas for the specified cloud provider
3. WHEN a user changes the cloud provider for a blueprint resource, THE DynamicResourceForm component SHALL clear the existing configuration and reload schemas for the new cloud provider
4. WHEN the DynamicResourceForm component displays property inputs, THE DynamicResourceForm component SHALL only show properties that are relevant to the selected cloud provider

### Requirement 4: Cloud Provider Dropdown State Consistency

**User Story:** As a platform administrator editing an existing blueprint resource, I want the cloud provider dropdown to only show the cloud providers I have selected for the blueprint, so that I cannot select an incompatible cloud provider.

#### Acceptance Criteria

1. WHEN a user loads an existing blueprint for editing, THE Blueprint Form SHALL initialize the selectedCloudProviderIds state with the blueprint's supportedCloudProviderIds before rendering resource forms
2. WHEN a user opens the cloud provider dropdown for an existing resource, THE AngryComboBox component SHALL only display cloud providers that are in the selectedCloudProviderIds array
3. WHEN the selectedCloudProviderIds state changes, THE Blueprint Form SHALL re-render all resource cloud provider dropdowns with the updated filtered list
4. WHEN a user changes a resource's cloud provider, THE Blueprint Form SHALL only allow selection from the currently selected blueprint cloud providers

### Requirement 5: User Feedback and Error Handling

**User Story:** As a platform administrator, I want clear feedback when cloud provider selections affect blueprint resources, so that I understand the impact of my changes.

#### Acceptance Criteria

1. WHEN a user deselects a cloud provider that has associated resources, THE Blueprint Form SHALL display a warning message indicating how many resources will be affected
2. WHEN a user attempts to add a resource without selecting any cloud providers for the blueprint, THE Blueprint Form SHALL display an error message prompting them to select cloud providers first
3. WHEN a user saves a blueprint successfully, THE Blueprint Form SHALL display a success message confirming the save operation
4. WHEN a blueprint resource is removed due to cloud provider deselection, THE Blueprint Form SHALL log the removal action for audit purposes
