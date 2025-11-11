# Requirements Document

## Introduction

This document defines the requirements for rebranding the Internal Developer Platform (IDP) application to "VisuIDP". The rebranding involves updating user-facing labels, titles, and documentation while preserving all technical implementation details, code structure, and project names.

## Glossary

- **VisuIDP**: The new brand name for the Internal Developer Platform application
- **IDP**: Internal Developer Platform (technical term, remains in code)
- **User-Facing Labels**: Text visible to end users in the UI, documentation, and API responses
- **Technical Names**: Code identifiers, project names, package names, and internal references
- **Application**: The complete system including backend API and frontend UI

## Requirements

### Requirement 1

**User Story:** As a user, I want to see "VisuIDP" as the application name in the UI, so that I can identify the platform by its brand name.

#### Acceptance Criteria

1. WHEN a user views the application header, THE Application SHALL display "VisuIDP" as the primary title
2. WHEN a user views the browser tab, THE Application SHALL display "VisuIDP" in the page title
3. WHEN a user views the login page, THE Application SHALL display "VisuIDP" as the application name
4. WHEN a user views the homepage, THE Application SHALL display "VisuIDP" in welcome messages and branding elements

### Requirement 2

**User Story:** As a developer, I want technical code names to remain unchanged, so that existing integrations and deployments continue to work without modification.

#### Acceptance Criteria

1. THE Application SHALL preserve all project directory names (idp-api, idp-ui)
2. THE Application SHALL preserve all package names (com.angryss.idp)
3. THE Application SHALL preserve all code identifiers and class names
4. THE Application SHALL preserve all API endpoint paths
5. THE Application SHALL preserve all environment variable names

### Requirement 3

**User Story:** As a user reading documentation, I want to see "VisuIDP" referenced consistently, so that I understand the platform's brand identity.

#### Acceptance Criteria

1. WHEN a user reads the README files, THE Documentation SHALL refer to the platform as "VisuIDP"
2. WHEN a user reads architecture documentation, THE Documentation SHALL use "VisuIDP" when referring to the complete application
3. WHEN a user reads API documentation, THE Documentation SHALL display "VisuIDP" in the API title and description
4. THE Documentation SHALL maintain technical references to "IDP" where appropriate for clarity

### Requirement 4

**User Story:** As an administrator, I want the OpenAPI/Swagger documentation to reflect the VisuIDP brand, so that API consumers recognize the platform.

#### Acceptance Criteria

1. WHEN a user views the Swagger UI, THE API Documentation SHALL display "VisuIDP API" as the title
2. WHEN a user views the API description, THE API Documentation SHALL reference "VisuIDP" in the description text
3. THE API Documentation SHALL maintain technical endpoint paths unchanged

### Requirement 5

**User Story:** As a developer, I want HTML metadata to reflect the VisuIDP brand, so that search engines and browsers display the correct application name.

#### Acceptance Criteria

1. WHEN a browser loads the application, THE HTML Document SHALL contain "VisuIDP" in the title tag
2. WHEN a browser loads the application, THE HTML Document SHALL contain "VisuIDP" in meta description tags
3. WHERE favicon or app icons exist, THE Application SHALL update alt text to reference "VisuIDP"
