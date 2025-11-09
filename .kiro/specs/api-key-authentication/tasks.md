# Implementation Plan

- [x] 1. Create database schema and domain entities
  - Create Flyway migration V3__api_keys.sql with api_keys table, indexes, and constraints
  - Implement ApiKey entity extending PanacheEntityBase with all fields and lifecycle methods (isValid, isExpired, markAsUsed, revoke)
  - Implement ApiKeyType enum with USER and SYSTEM values
  - _Requirements: 1.1, 1.3, 2.1, 3.2, 6.1, 6.4_

- [x] 2. Implement domain validation service
  - Create ApiKeyValidationService with key format validation logic
  - Implement BCrypt hash verification method
  - Implement expiration detection logic (7-day warning threshold)
  - _Requirements: 1.1, 3.4, 5.2_

- [x] 3. Create application layer DTOs
  - Implement ApiKeyCreateDto with keyName, expirationDays, and keyType fields
  - Implement ApiKeyResponseDto with all metadata fields and status calculation
  - Implement ApiKeyCreatedDto extending ApiKeyResponseDto with apiKey field
  - Implement ApiKeyAuditLogDto for audit log responses
  - _Requirements: 1.4, 2.4, 7.1, 8.1_

- [x] 4. Implement API key generation and storage logic
  - Create ApiKeyService with secure random key generation using SecureRandom and Base62 encoding
  - Implement key prefix generation (idp_user_ and idp_system_)
  - Implement BCrypt hashing with configurable cost factor
  - Implement createUserApiKey method with validation and audit logging
  - Implement createSystemApiKey method with admin role check
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 8.1, 8.3_

- [x] 5. Implement API key lifecycle management
  - Implement revokeApiKey method with authorization checks and audit logging
  - Implement rotateApiKey method with grace period logic
  - Implement updateApiKeyName method with uniqueness validation
  - Implement automatic expiration handling in validation logic
  - _Requirements: 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 8.2, 8.4, 8.5_

- [x] 6. Implement API key query methods
  - Implement listUserApiKeys method filtering by current user email
  - Implement listAllApiKeys method with admin role restriction
  - Implement getApiKeyById method with ownership validation
  - Implement getApiKeyAuditLogs method with filtering by user email and date range
  - _Requirements: 1.4, 1.5, 2.4, 7.4_

- [x] 7. Create authentication mechanism for API keys
  - Implement ApiKeyAuthenticationMechanism with Priority 0
  - Implement Authorization header parsing with Bearer scheme
  - Implement API key validation against database with hash verification
  - Implement last_used_at timestamp update on successful authentication
  - Implement authentication failure logging with key prefix and source IP
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.2, 7.5_

- [x] 8. Create security identity from API key
  - Implement ApiKeyPrincipal with name, email, keyType, and keyId fields
  - Implement buildSecurityIdentity method in ApiKeyAuthenticationMechanism
  - Map user API keys to user role with userEmail as principal
  - Map system API keys to admin role with system identifier as principal
  - Ensure SecurityIdentity structure matches OAuth2 Proxy authentication
  - _Requirements: 2.3, 2.5, 5.1, 5.5_

- [x] 9. Implement REST API endpoints
  - Create ApiKeysController with base path /api/v1/api-keys
  - Implement POST /user endpoint for user API key creation
  - Implement POST /system endpoint for system API key creation with admin role
  - Implement GET /user endpoint for listing current user's keys
  - Implement GET /all endpoint for listing all keys (admin only)
  - Implement GET /{id} endpoint for retrieving specific key details with ownership check
  - Implement POST /{id}/rotate endpoint for key rotation
  - Implement DELETE /{id} endpoint for key revocation
  - Implement PUT /{id}/name endpoint for updating key name
  - Implement GET /audit-logs endpoint for retrieving audit logs (admin only)
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.4, 4.1, 6.1, 7.4, 8.2_

- [x] 10. Add error handling and validation
  - Implement validation for API key format in authentication mechanism
  - Implement error responses for invalid, expired, and revoked keys with appropriate HTTP status codes
  - Implement authorization checks for key access (users can only access own keys)
  - Implement validation for duplicate key names within user scope
  - Implement validation for expiration period range (1-365 days)
  - _Requirements: 3.3, 5.4, 6.2, 8.4, 8.5_

- [x] 11. Implement audit logging
  - Extend admin_audit_logs usage for API key lifecycle events
  - Log key creation events with user identifier, timestamp, and key metadata
  - Log key authentication events with key identifier, timestamp, and source IP
  - Log key revocation and expiration events with reason
  - Log failed authentication attempts with key prefix and source IP
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 12. Add configuration properties
  - Add idp.api-key.default-expiration-days property with default value 90
  - Add idp.api-key.rotation-grace-period-hours property with default value 24
  - Add idp.api-key.max-keys-per-user property with default value 10
  - Add idp.api-key.bcrypt-cost-factor property with default value 12
  - Inject configuration properties into ApiKeyService
  - _Requirements: 3.5, 4.2_

- [x] 13. Write backend unit tests
  - Write unit tests for ApiKeyValidationService (format validation, hash verification, expiration detection)
  - Write unit tests for ApiKeyService (key generation, hash storage, rotation logic, revocation, authorization)
  - Write unit tests for ApiKey entity methods (isValid, isExpired, markAsUsed, revoke)
  - _Requirements: All_

- [x] 14. Write backend integration tests
  - Write integration tests for ApiKeyAuthenticationMechanism (valid key, invalid key, expired key, revoked key, fallback to OAuth2)
  - Write integration tests for ApiKeysController endpoints (create, list, get, rotate, revoke, update name, audit logs)
  - Write end-to-end tests for full request flow with API key authentication
  - Write security tests for hash storage, authorization, and rate limiting
  - _Requirements: All_

- [x] 15. Create frontend API keys management page
  - Create ApiKeysManagement.tsx component with list of user's API keys
  - Display key metadata (name, prefix, creation date, expiration date, last used, status)
  - Implement status badges (Active, Expiring Soon, Expired, Revoked)
  - Add create new API key button
  - Add action buttons for each key (Rotate, Revoke, Edit Name)
  - _Requirements: 1.4, 1.5, 3.4, 8.2_

- [x] 16. Create API key creation modal
  - Create modal component for API key creation
  - Add key name input field
  - Add expiration period dropdown (30, 60, 90, 180, 365 days)
  - Add key type selection for admins (User or System)
  - Display generated API key with copy-to-clipboard button
  - Show warning message about single exposure
  - _Requirements: 1.1, 1.2, 2.1, 8.1_

- [x] 17. Implement API key rotation and revocation UI
  - Create rotation confirmation modal with grace period explanation
  - Display new key after rotation with copy button
  - Create revocation confirmation modal
  - Update key list after rotation or revocation
  - _Requirements: 4.1, 4.2, 4.5, 6.1_

- [x] 18. Create admin audit log viewer
  - Create ApiKeyAuditLogs.tsx component (admin only)
  - Display filterable table of API key events
  - Add filters for user email, date range, and event type
  - Implement pagination for large result sets
  - _Requirements: 7.4_

- [x] 19. Update API client for API key support
  - Update services/api.ts to include Authorization header when API key is present
  - Add localStorage management for API key storage
  - Add API key to all authenticated requests
  - _Requirements: 5.1_

- [x] 20. Add API keys navigation to admin dashboard
  - Add "API Keys" link to admin navigation menu
  - Update routing to include API keys management page
  - Ensure proper role-based access control for admin features
  - _Requirements: 1.4, 2.4_

- [x] 21. Write frontend component tests
  - Write tests for ApiKeysManagement component
  - Write tests for API key creation modal
  - Write tests for rotation and revocation flows
  - Write tests for admin audit log viewer
  - _Requirements: All_

- [x] 22. Create API documentation
  - Document API key authentication in OpenAPI/Swagger
  - Add examples for Authorization header usage
  - Document all API key endpoints with request/response schemas
  - Add security scheme for Bearer token authentication
  - _Requirements: 5.1_
