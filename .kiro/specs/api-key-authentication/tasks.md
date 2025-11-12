# Implementation Plan

## ✅ Completed Tasks

All core implementation tasks have been completed. The API key authentication feature is fully implemented with:

- ✅ Database schema with api_keys table in V1__schema.sql
- ✅ Complete backend implementation (entities, services, controllers, authentication mechanism)
- ✅ Complete frontend implementation (personal and admin pages, modals, navigation)
- ✅ Comprehensive test coverage (unit, integration, and E2E tests)
- ✅ OpenAPI documentation with security schemes
- ✅ Configuration properties
- ✅ Audit logging

## 🔄 Remaining Tasks

The following tasks represent gaps between the current implementation and the design/requirements:

- [x] 1. Fix API endpoint path inconsistency
  - Update ApiKeysController to use `/system` endpoint instead of `/all` for listing all API keys
  - The design specifies GET /system for listing system keys (admin only), but implementation uses GET /all
  - Update frontend apiService to call the correct endpoint
  - _Requirements: 2.4, 9.3, 9.4_

- [x] 2. Implement system API keys filtering in admin view
  - Update ApiKeyService.listAllApiKeys() to be renamed to listSystemApiKeys()
  - Filter to only return SYSTEM type API keys (not all keys)
  - Update controller endpoint GET /system to call the renamed method
  - Update frontend to display only system keys in admin view
  - _Requirements: 2.4, 2.6, 9.3, 9.4_

- [x] 3. Implement edit name functionality in frontend
  - Complete the handleEditName function in ApiKeysManagement.tsx (currently shows TODO)
  - Create ApiKeyEditNameModal component with name input field
  - Call apiService.updateApiKeyName() when user submits new name
  - Refresh key list after successful name update
  - _Requirements: 8.2, 8.4, 8.5_

- [x] 4. Add background job for expired key processing
  - Create scheduled job to call ApiKeyService.processExpiredApiKeys() daily
  - Use Quarkus @Scheduled annotation with cron expression
  - Log number of keys processed
  - _Requirements: 3.2, 3.3_

- [x] 5. Add background job for rotation grace period processing
  - Implement rotation grace period tracking in ApiKey entity (add fields: rotated_from_id, grace_period_ends_at)
  - Update ApiKeyService.rotateApiKey() to set grace period end time
  - Complete ApiKeyService.processRotationGracePeriod() implementation
  - Create scheduled job to call processRotationGracePeriod() hourly
  - _Requirements: 4.2, 4.3_

- [x] 6. Verify test coverage meets requirements
  - Run test suite and verify all tests pass
  - Check that tests cover all acceptance criteria from requirements
  - Ensure tests follow patterns from testing-patterns.md steering rule
  - _Requirements: All_

- [x] 7. Update API documentation with complete examples
  - Add curl examples for all API key endpoints in API_KEY_AUTHENTICATION.md
  - Document error responses with examples
  - Add troubleshooting section for common issues
  - _Requirements: 5.1_

- [x] 8. Remove Key Type selector from admin API key creation modal
  - Remove the Key Type dropdown/combo box from ApiKeyCreateModal when used in admin context
  - The modal should automatically create SYSTEM type keys when accessed from admin interface
  - Update ApiKeyCreateModal.tsx to not render the key type selector for admin users
  - Ensure the backend endpoint POST /api/v1/api-keys/system always creates SYSTEM type keys regardless of DTO content
  - _Requirements: 9.3, 9.5, 9.6_
