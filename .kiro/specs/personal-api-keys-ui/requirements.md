# Requirements Document

## Introduction

This document specifies requirements for adding a personal API keys management page accessible to all authenticated users in the Internal Developer Platform (IDP) UI. Currently, API key management is only accessible through the admin dashboard at `/admin/api-keys`, which requires admin privileges. However, the backend API and requirements support personal API keys for all users. This feature will add a user-accessible route and navigation to allow developers to manage their own API keys without admin access.

## Glossary

- **Personal_API_Keys_Page**: A UI page accessible to all authenticated users for managing their own API keys
- **User_Navigation**: The navigation menu available to regular (non-admin) users
- **Admin_API_Keys_Page**: The existing admin-only page at `/admin/api-keys` for managing all API keys including system keys
- **ApiKeysManagement_Component**: The existing React component that displays and manages API keys

## Requirements

### Requirement 1

**User Story:** As a developer, I want to access my personal API keys from the main navigation, so that I can manage my API keys without needing admin privileges

#### Acceptance Criteria

1. WHEN a user views the main navigation menu, THE IDP_UI SHALL display a link to the personal API keys page
2. WHEN a user clicks the personal API keys link, THE IDP_UI SHALL navigate to a dedicated personal API keys route
3. WHEN a non-admin user accesses the personal API keys page, THE IDP_UI SHALL display only their own API keys
4. WHEN an admin user accesses the personal API keys page, THE IDP_UI SHALL display only their own personal API keys (not system keys or other users' keys)
5. WHERE the user is on the personal API keys page, THE IDP_UI SHALL display appropriate breadcrumb navigation

### Requirement 2

**User Story:** As a developer, I want the personal API keys page to have the same functionality as the admin version, so that I can create, rotate, and revoke my keys

#### Acceptance Criteria

1. WHEN a user accesses the personal API keys page, THE IDP_UI SHALL display all personal API key management features (create, rotate, revoke, edit name)
2. WHEN a user creates an API key from the personal page, THE IDP_UI SHALL only allow creation of user-type API keys
3. WHEN a user views their API keys on the personal page, THE IDP_UI SHALL hide the system API key creation option
4. WHEN a user performs any API key operation, THE IDP_UI SHALL use the same backend endpoints as the admin page
5. WHEN a user accesses the personal API keys page, THE IDP_UI SHALL display the same key metadata and status information as the admin page

### Requirement 3

**User Story:** As a developer, I want clear visual distinction between the personal and admin API keys pages, so that I understand which context I am in

#### Acceptance Criteria

1. WHEN a user views the personal API keys page, THE IDP_UI SHALL display a page title indicating "My API Keys" or similar personal context
2. WHEN a user views the personal API keys page breadcrumb, THE IDP_UI SHALL not include "Admin Dashboard" in the navigation path
3. WHEN an admin views the admin API keys page, THE IDP_UI SHALL display a page title indicating "API Keys Management" with admin context
4. WHEN an admin views the admin API keys page, THE IDP_UI SHALL include "Admin Dashboard" in the breadcrumb navigation
5. WHERE a user has admin privileges, THE IDP_UI SHALL provide access to both the personal API keys page and the admin API keys page

### Requirement 4

**User Story:** As a product owner, I want to reuse the existing ApiKeysManagement component for both personal and admin contexts, so that we maintain code consistency and reduce duplication

#### Acceptance Criteria

1. WHEN implementing the personal API keys page, THE IDP_UI SHALL reuse the existing ApiKeysManagement component
2. WHEN the ApiKeysManagement component is used in personal context, THE IDP_UI SHALL pass a prop to indicate non-admin mode
3. WHEN the component is in personal mode, THE IDP_UI SHALL hide system API key creation options
4. WHEN the component is in personal mode, THE IDP_UI SHALL adjust breadcrumb navigation to exclude admin context
5. WHEN the component is in admin mode, THE IDP_UI SHALL maintain all existing functionality including system key management

### Requirement 5

**User Story:** As a developer, I want to easily discover the personal API keys feature, so that I know programmatic access is available

#### Acceptance Criteria

1. WHEN a user views the main application header or navigation, THE IDP_UI SHALL display a clearly labeled link to personal API keys
2. WHEN a user hovers over the API keys navigation link, THE IDP_UI SHALL provide a tooltip or description indicating its purpose
3. WHERE the user is viewing the homepage or development pages, THE IDP_UI SHALL make the API keys link easily discoverable
4. WHEN a user first accesses the personal API keys page with no keys, THE IDP_UI SHALL display helpful onboarding information
5. WHEN a user views the personal API keys page, THE IDP_UI SHALL include documentation links or help text about API key usage
