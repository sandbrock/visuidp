# Implementation Plan

- [x] 1. Add breadcrumb to Cloud Provider Management page
  - Import the Breadcrumb component from './Breadcrumb'
  - Define breadcrumb items array with "Admin Dashboard" (path: '/admin') and "Cloud Provider Management"
  - Render Breadcrumb component at the top of the component, before the existing header div
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 2.3_

- [x] 2. Add breadcrumb to Resource Type Management page
  - Import the Breadcrumb component from './Breadcrumb'
  - Define breadcrumb items array with "Admin Dashboard" (path: '/admin') and "Resource Type Management"
  - Render Breadcrumb component at the top of the component, before the existing header div
  - _Requirements: 1.2, 1.4, 1.5, 2.1, 2.2, 2.3_

- [x] 3. Add breadcrumb to Resource Type Mapping Management page
  - Import the Breadcrumb component from './Breadcrumb'
  - Define breadcrumb items array with "Admin Dashboard" (path: '/admin') and "Resource Type Mapping Management"
  - Render Breadcrumb component at the top of the component, before the existing header div
  - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_

- [x] 4. Verify visual consistency and navigation
  - Manually test navigation from Admin Dashboard to each management page
  - Verify breadcrumb click navigation returns to Admin Dashboard
  - Compare breadcrumb styling across all admin pages including Property Schema Editor
  - Test in both light and dark themes
  - _Requirements: 2.3, 2.4_
