# Implementation Plan

- [x] 1. Update ApiKeysManagement component to support personal and admin modes
  - Add optional `mode` prop to ApiKeysManagementProps with type 'personal' | 'admin' and default value 'personal'
  - Add conditional logic to determine if component is in admin mode
  - Update breadcrumb items based on mode (personal: no admin context, admin: includes "Admin Dashboard")
  - Update page title based on mode (personal: "My API Keys", admin: "API Keys Management")
  - Update page description based on mode
  - Update loadApiKeys function to call getAllApiKeys in admin mode or getUserApiKeys in personal mode
  - _Requirements: 1.5, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.4_

- [x] 2. Update ApiKeyCreateModal component to support mode-based behavior
  - Add optional `mode` prop to ApiKeyCreateModalProps with type 'personal' | 'admin' and default value 'personal'
  - Add conditional logic to show/hide key type selector based on mode AND user.isAdmin
  - Force keyType to 'USER' when in personal mode regardless of user selection
  - Update modal to pass mode prop to child components if needed
  - _Requirements: 2.2, 2.3, 4.3_

- [x] 3. Update ApiKeyRotateModal and ApiKeyRevokeModal to accept mode prop
  - Add optional `mode` prop to both modal components for consistency
  - Pass mode prop through from parent ApiKeysManagement component
  - Ensure modals work correctly in both personal and admin contexts
  - _Requirements: 2.1, 4.1_

- [x] 4. Add personal API keys route to App.tsx
  - Add new Route for path="/api-keys" that renders ApiKeysManagement with mode="personal"
  - Ensure route is NOT wrapped in ProtectedRoute with requireAdmin (accessible to all authenticated users)
  - Place route before admin routes in the Routes component
  - _Requirements: 1.2, 3.5_

- [x] 5. Update admin API keys route to pass mode prop
  - Update existing /admin/api-keys route to pass mode="admin" to ApiKeysManagement component
  - Verify route remains protected with requireAdmin={true}
  - Ensure no breaking changes to existing admin functionality
  - _Requirements: 3.3, 3.4, 4.5_

- [x] 6. Add API Keys navigation link to Header component
  - Add new navigation link for "API Keys" between Infrastructure and Admin links
  - Set link to navigate to /api-keys route
  - Apply same styling as other navigation links (Development, Infrastructure)
  - Add active state highlighting when current route is /api-keys
  - Add appropriate icon (🔑 or similar) if icons are used in navigation
  - _Requirements: 1.1, 5.1, 5.3_

- [x] 7. Update Header component CSS for new navigation link
  - Ensure API Keys link has consistent spacing and styling with other nav links
  - Add hover state styling
  - Add active state styling for when user is on /api-keys route
  - Ensure responsive behavior matches other navigation links
  - _Requirements: 5.1_

- [x] 8. Enhance empty state messaging for personal API keys page
  - Update empty state in ApiKeysManagement to show different message based on mode
  - For personal mode: show onboarding message with benefits of API keys
  - For admin mode: keep existing empty state message
  - Add helpful links or documentation references in personal mode empty state
  - _Requirements: 5.4, 5.5_

- [x] 9. Update ApiKeysManagement CSS for mode-specific styling
  - Ensure page title and description styling works for both modes
  - Verify breadcrumb styling is consistent in both contexts
  - Add any mode-specific CSS classes if needed for visual distinction
  - _Requirements: 3.1, 3.2_

- [x] 10. Write component tests for ApiKeysManagement mode behavior
  - Test that component renders correctly in personal mode (title, breadcrumb, API call)
  - Test that component renders correctly in admin mode (title, breadcrumb, API call)
  - Test that mode prop defaults to 'personal' when not provided
  - Test that getUserApiKeys is called in personal mode
  - Test that getAllApiKeys is called in admin mode
  - _Requirements: All_

- [x] 11. Write component tests for ApiKeyCreateModal mode behavior
  - Test that key type selector is hidden in personal mode
  - Test that key type selector is visible in admin mode for admin users
  - Test that keyType is forced to 'USER' in personal mode
  - Test that createUserApiKey is called with correct parameters in personal mode
  - _Requirements: 2.2, 2.3_

- [x] 12. Write integration tests for personal API keys route
  - Test that /api-keys route is accessible without admin privileges
  - Test that /api-keys route renders ApiKeysManagement with mode="personal"
  - Test navigation from Header to /api-keys route
  - Test that personal page shows only user's own keys
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 13. Write integration tests for admin API keys route
  - Test that /admin/api-keys route requires admin privileges
  - Test that /admin/api-keys route renders ApiKeysManagement with mode="admin"
  - Test that admin page shows all keys including system keys
  - Test that system key creation is available in admin mode
  - _Requirements: 3.3, 3.4, 4.5_

- [x] 14. Test navigation and routing behavior
  - Test that API Keys link appears in Header for all authenticated users
  - Test that clicking API Keys link navigates to /api-keys
  - Test that active state highlights correctly on /api-keys route
  - Test that admins can access both /api-keys and /admin/api-keys
  - Test breadcrumb navigation in both contexts
  - _Requirements: 1.1, 1.2, 3.5, 5.1_

- [x] 15. Verify backward compatibility
  - Test that existing admin API keys functionality is unchanged
  - Test that /admin/api-keys route continues to work as before
  - Test that system key creation still works for admins
  - Test that audit logs are accessible from admin page
  - _Requirements: 4.5_

- [x] 16. Update user documentation
  - Document how to access personal API keys page
  - Document how to create and manage personal API keys
  - Document difference between personal and admin API keys pages
  - Add examples of using personal API keys for common use cases
  - _Requirements: 5.5_
