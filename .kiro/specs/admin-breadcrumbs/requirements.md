# Requirements Document

## Introduction

This feature adds breadcrumb navigation to admin pages in the IDP UI to improve user navigation and provide clear context about the current location within the admin section. The breadcrumbs will allow users to easily navigate back to the Admin Dashboard from any admin management page.

## Glossary

- **Admin Dashboard**: The main administrative interface showing overview statistics and quick access to management pages
- **Breadcrumb**: A navigation component that shows the user's current location in the application hierarchy and allows navigation to parent pages
- **Management Page**: An admin page for managing specific resources (Cloud Providers, Resource Types, or Resource Type Mappings)
- **UI Component**: A reusable React component in the frontend application

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to see breadcrumbs on admin management pages, so that I can understand my current location and easily navigate back to the Admin Dashboard

#### Acceptance Criteria

1. WHEN an administrator views the Cloud Provider Management page, THE UI Component SHALL display a breadcrumb showing "Admin Dashboard / Cloud Provider Management"
2. WHEN an administrator views the Resource Type Management page, THE UI Component SHALL display a breadcrumb showing "Admin Dashboard / Resource Type Management"
3. WHEN an administrator views the Resource Type Mapping Management page, THE UI Component SHALL display a breadcrumb showing "Admin Dashboard / Resource Type Mapping Management"
4. WHEN an administrator clicks on "Admin Dashboard" in the breadcrumb, THE UI Component SHALL navigate to the Admin Dashboard page at path "/admin"
5. THE UI Component SHALL display the current page name as non-clickable text in the breadcrumb

### Requirement 2

**User Story:** As an administrator, I want breadcrumbs to be visually consistent with the existing Property Schema Editor breadcrumbs, so that the navigation experience is uniform across all admin pages

#### Acceptance Criteria

1. THE UI Component SHALL use the existing Breadcrumb component located at "idp-ui/src/components/Breadcrumb.tsx"
2. THE UI Component SHALL position breadcrumbs at the top of the page content, above the page header
3. THE UI Component SHALL apply the same styling and spacing as the Property Schema Editor breadcrumbs
4. THE UI Component SHALL maintain consistent breadcrumb behavior across all admin pages
