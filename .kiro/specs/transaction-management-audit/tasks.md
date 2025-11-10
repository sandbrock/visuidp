# Implementation Plan

- [x] 1. Execute automated audit scan
  - Run the audit script to generate initial findings report
  - Review the generated report for categorized issues
  - Create a tracking document to monitor progress
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Audit PostgreSQL repositories for transaction compliance
- [x] 2.1 Review first batch of repositories (5 files)
  - Review PostgresAdminAuditLogRepository.java against checklist
  - Review PostgresApiKeyRepository.java against checklist
  - Review PostgresBlueprintResourceRepository.java against checklist
  - Review PostgresCategoryRepository.java against checklist
  - Review PostgresDomainRepository.java against checklist
  - Document findings in tracking sheet
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.2 Review second batch of repositories (5 files)
  - Review PostgresEnvironmentConfigRepository.java against checklist
  - Review PostgresEnvironmentEntityRepository.java against checklist
  - Review PostgresPropertySchemaRepository.java against checklist
  - Review PostgresResourceTypeCloudMappingRepository.java against checklist
  - Review PostgresResourceTypeRepository.java against checklist
  - Document findings in tracking sheet
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.3 Review final batch of repositories (3 files)
  - Review PostgresStackCollectionRepository.java against checklist
  - Review PostgresStackResourceRepository.java against checklist
  - Review PostgresTeamRepository.java (verify previous review)
  - Document findings in tracking sheet
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.4 Fix repository transaction issues
  - Add missing @Transactional annotations on write operations
  - Remove unnecessary @Transactional annotations on read operations
  - Verify all fixes follow the expected pattern
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Audit service layer for proper transaction boundaries
- [x] 3.1 Review first batch of services (3 files)
  - Review AdminDashboardService.java against checklist
  - Review ApiKeyService.java against checklist
  - Review CloudProviderService.java against checklist
  - Check for external API calls inside @Transactional methods
  - Check for long-running loops inside @Transactional methods
  - Document findings in tracking sheet
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3_

- [x] 3.2 Review second batch of services (3 files)
  - Review PropertySchemaService.java against checklist
  - Review ResourceTypeCloudMappingService.java against checklist
  - Review ResourceTypeService.java against checklist
  - Check for external API calls inside @Transactional methods
  - Check for long-running loops inside @Transactional methods
  - Document findings in tracking sheet
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3_

- [x] 3.3 Fix service transaction issues
  - Add missing @Transactional annotations on create/update/delete methods
  - Remove unnecessary @Transactional annotations on read-only methods
  - Refactor long-running transactions to chunk work or move external calls outside
  - Verify all fixes follow the expected pattern
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.4_

- [x] 4. Spot check controllers for transaction anti-patterns
- [x] 4.1 Review controller classes
  - Review BlueprintsController.java for @Transactional anti-patterns
  - Review CloudProvidersController.java for @Transactional anti-patterns
  - Review TeamsController.java for @Transactional anti-patterns
  - Verify all business logic is delegated to services
  - Document findings in tracking sheet
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.2 Fix controller transaction anti-patterns
  - Remove any @Transactional annotations from controller methods
  - Ensure services have @Transactional where controllers previously had it
  - Verify controllers only handle HTTP concerns
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Verify health checks have proper transaction handling
- [x] 5.1 Audit health check implementations
  - Search for all health check classes beyond DatabaseHealthCheck
  - Verify health checks performing database operations have @Transactional
  - Verify health check operations complete within 5 seconds
  - Document findings in tracking sheet
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.2 Fix health check transaction issues
  - Add @Transactional to health checks performing database operations
  - Optimize slow health check queries
  - Verify all health checks follow the expected pattern
  - _Requirements: 4.1, 4.2_

- [x] 6. Run integration tests to verify fixes
- [x] 6.1 Execute integration test suite
  - Run `./mvnw test` from idp-api directory
  - Review test results for any failures
  - Check logs for connection-related errors
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 6.2 Fix any test failures
  - Investigate root cause of any failing tests
  - Apply fixes to code or tests as needed
  - Re-run tests until 100% pass rate achieved
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 7. Execute load tests and monitor connection pool
- [x] 7.1 Perform load testing
  - Execute 100+ concurrent requests using Apache Bench or curl loops
  - Monitor connection pool metrics during load test
  - Verify pool utilization stays below 80%
  - Check logs for acquisition timeout errors
  - _Requirements: 6.3, 6.4, 6.5_

- [x] 7.2 Analyze load test results
  - Review connection pool metrics from health endpoint
  - Verify active connections are low when idle
  - Verify available connections are high when idle
  - Verify awaiting connections remain at 0
  - Document any issues found
  - _Requirements: 6.3, 6.4, 8.1, 8.2, 8.3_

- [x] 7.3 Fix any load test issues
  - Address any connection pool exhaustion issues
  - Optimize slow queries or long-running transactions
  - Re-run load tests to verify fixes
  - _Requirements: 6.3, 10.5_

- [x] 8. Perform soak test for final validation
- [x] 8.1 Execute soak test
  - Run application under normal load for 1 hour
  - Monitor connection pool metrics continuously
  - Check logs for any connection pool exhaustion errors
  - Verify health checks pass consistently
  - _Requirements: 9.5_

- [x] 8.2 Validate success criteria
  - Verify all 13 repositories reviewed and compliant
  - Verify all 6 services reviewed and compliant
  - Verify at least 3 controllers verified compliant
  - Verify integration tests pass 100%
  - Verify load test shows pool utilization < 80%
  - Verify zero connection pool errors in soak test
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9. Configure monitoring and alerting
- [x] 9.1 Set up connection pool monitoring
  - Verify health endpoint exposes active connection count
  - Verify health endpoint exposes available connection count
  - Verify health endpoint exposes awaiting connection count
  - Document how to access these metrics
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 9.2 Configure alerting thresholds
  - Document recommended alert for pool utilization > 80%
  - Document recommended alert for connection acquisition timeout
  - Document recommended alert for long-running transactions > 30 seconds
  - _Requirements: 8.4, 8.5, 10.5_

- [x] 10. Update audit tracking and close out
- [x] 10.1 Complete audit tracking document
  - Mark all repositories as reviewed and compliant
  - Mark all services as reviewed and compliant
  - Mark all controllers as reviewed and compliant
  - Document all findings and fixes applied
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 10.2 Verify documentation is complete
  - Confirm AUDIT_CHECKLIST.md is accurate
  - Confirm TRANSACTION_MANAGEMENT_GUIDE.md reflects current patterns
  - Confirm all steering rules are documented
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10.3 Create audit completion summary
  - Document total files reviewed
  - Document total issues found and fixed
  - Document test results and metrics
  - Document lessons learned and recommendations
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11. Fix DynamoDB bean naming conflicts
- [x] 11.1 Remove ambiguous @Named annotations from DynamoDB repositories
  - Remove `@Named("dynamodb")` from all 16 DynamoDB repository classes
  - Verify repositories are still conditionally enabled via `@IfBuildProperty`
  - Update any injection points that use `@Named("dynamodb")` to use type-based injection
  - _Requirements: 6.1, 6.2_

- [x] 11.2 Verify DynamoDB repository injection
  - Search for all `@Inject @Named("dynamodb")` injection points
  - Replace with type-based injection using repository interfaces
  - Ensure CDI can resolve repositories without ambiguity
  - _Requirements: 6.1, 6.2_

- [x] 11.3 Test DynamoDB repository resolution
  - Run tests with `idp.database.provider=dynamodb` to verify bean resolution
  - Verify no ambiguous bean name errors occur
  - Document the fix in audit tracking
  - _Requirements: 6.1, 6.2, 9.4_

- [-] 12. Fix API Key authentication mechanism in tests
- [x] 12.1 Investigate authentication mechanism activation
  - Review test profile configuration for authentication settings
  - Verify `ApiKeyAuthenticationMechanism` is properly enabled in tests
  - Check if `@Alternative` annotation is preventing activation
  - Document findings in tracking sheet
  - _Requirements: 6.1, 6.2_

- [x] 12.2 Fix authentication mechanism configuration
  - Ensure authentication mechanism is active in test profile
  - Verify database provider configuration aligns with test expectations
  - Add test-specific configuration if needed
  - _Requirements: 6.1, 6.2_

- [x] 12.3 Verify API Key authentication tests
  - Run ApiKeyAuthenticationMechanismTest suite
  - Run ApiKeySecurityTest suite
  - Run ApiKeyE2ETest suite
  - Verify all authentication tests pass
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 13. Fix entity persistence pattern in repository tests
- [x] 13.1 Review repository save() method implementations
  - Check if save() uses persist() or merge() for updates
  - Verify save() handles both new and detached entities correctly
  - Document current implementation pattern
  - _Requirements: 6.1, 6.2_

- [x] 13.2 Fix repository save() methods or test patterns
  - Update repository save() to handle detached entities (use merge for updates)
  - OR update tests to use returned entity from first save() call
  - Apply consistent pattern across all PostgreSQL repositories
  - _Requirements: 6.1, 6.2_

- [x] 13.3 Verify repository integration tests
  - Run PostgresApiKeyRepositoryIntegrationTest
  - Run PostgresBlueprintRepositoryIntegrationTest
  - Run PostgresStackRepositoryIntegrationTest
  - Run PostgresTeamRepositoryIntegrationTest
  - Verify no EntityExists exceptions occur
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 14. Fix test data cleanup and constraint violations
- [x] 14.1 Review test cleanup methods
  - Check @AfterEach cleanup in failing test classes
  - Verify foreign key constraints are handled in correct order
  - Identify tests with duplicate key violations
  - _Requirements: 6.1, 6.2_

- [x] 14.2 Improve test data cleanup
  - Add proper cleanup order (child entities before parents)
  - Use UUID-based unique values for test data
  - Clear test data between test methods
  - _Requirements: 6.1, 6.2_

- [x] 14.3 Fix BlueprintServiceTest cleanup issues
  - Fix foreign key constraint violations in setup/cleanup
  - Ensure stacks are deleted before blueprints
  - Verify test isolation
  - _Requirements: 6.1, 6.2_

- [x] 14.4 Verify test data isolation
  - Run full test suite to verify no constraint violations
  - Check for duplicate key errors in logs
  - Verify tests can run in any order
  - _Requirements: 6.1, 6.2, 9.4_

- [-] 15. Final test suite validation
- [x] 15.1 Run complete test suite
  - Execute `./mvnw test` with all fixes applied
  - Review test results for remaining failures
  - Document pass rate and any remaining issues
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 15.2 Achieve 100% test pass rate
  - Fix any remaining test failures
  - Verify no skipped tests due to build errors
  - Confirm zero errors and zero failures
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 15.3 Update audit completion with test fixes
  - Document all test-related issues found and fixed
  - Update tracking sheet with final test results
  - Add lessons learned about test configuration
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 16. Fix controller validation and error handling issues
- [x] 16.1 Review BlueprintsController validation failures
  - Investigate why invalid cloud provider returns 500 instead of 400
  - Investigate why invalid resource type returns 500 instead of 400
  - Check error response body formatting
  - _Requirements: 6.1, 6.2_

- [x] 16.2 Add proper validation error handling
  - Ensure validation exceptions return 400 with descriptive messages
  - Add exception mappers for common validation failures
  - Verify error responses include expected error messages
  - _Requirements: 6.1, 6.2_

- [x] 16.3 Test controller validation
  - Run BlueprintsControllerTest validation test cases
  - Verify proper HTTP status codes for validation errors
  - Verify error messages are included in response body
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 17. Fix AdminResourceConfigurationE2ETest failures
- [x] 17.1 Investigate 404 errors in admin resource tests
  - Review why admin endpoints return 404 instead of expected responses
  - Check if admin routes are properly registered
  - Verify admin authorization is working correctly
  - _Requirements: 6.1, 6.2_

- [x] 17.2 Fix admin resource endpoint routing
  - Ensure all admin resource endpoints are properly mapped
  - Verify path parameters are correctly configured
  - Test endpoint accessibility with admin credentials
  - _Requirements: 6.1, 6.2_

- [x] 17.3 Verify admin E2E test suite
  - Run AdminResourceConfigurationE2ETest
  - Verify all test scenarios pass
  - Document any remaining issues
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 18. Fix ApiKeysController endpoint issues
- [x] 18.1 Investigate API key rotation 415 errors
  - Review why rotation endpoint returns 415 (Unsupported Media Type)
  - Check Content-Type header requirements
  - Verify request body parsing
  - _Requirements: 6.1, 6.2_

- [x] 18.2 Fix API key update endpoint issues
  - Investigate why update returns 400 instead of 200
  - Check request body validation
  - Verify DTO mapping is correct
  - _Requirements: 6.1, 6.2_

- [x] 18.3 Fix API key list filtering
  - Investigate why list endpoints return empty arrays
  - Verify query parameters are properly parsed
  - Check repository query methods
  - _Requirements: 6.1, 6.2_

- [x] 18.4 Test API keys controller endpoints
  - Run ApiKeysControllerTest suite
  - Verify all CRUD operations work correctly
  - Verify filtering and pagination work
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 19. Fix relationship and entity lifecycle tests
- [x] 19.1 Fix BlueprintStackRelationshipTest
  - Resolve duplicate key constraint violations
  - Ensure proper test data isolation
  - Verify relationship mappings work correctly
  - _Requirements: 6.1, 6.2_

- [x] 19.2 Fix StackResourceTest configuration validation
  - Investigate ArcUndeclaredThrowable error
  - Verify entity validation is working
  - Check JSONB configuration handling
  - _Requirements: 6.1, 6.2_

- [x] 19.3 Test entity relationships
  - Run BlueprintStackRelationshipTest
  - Run StackResourceTest
  - Verify all relationship tests pass
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 20. Fix PostgreSQL repository transaction tests
- [x] 20.1 Review PostgresRepositoryTransactionTest failures
  - Investigate ArcUndeclaredThrowable errors in transaction tests
  - Check if @Transactional is properly configured for tests
  - Verify test transaction boundaries
  - _Requirements: 6.1, 6.2_

- [x] 20.2 Fix repository transaction test configuration
  - Ensure test transactions are properly managed
  - Add missing test transaction setup if needed
  - Verify rollback behavior in tests
  - _Requirements: 6.1, 6.2_

- [x] 20.3 Verify repository transaction tests
  - Run PostgresRepositoryTransactionTest
  - Verify transactional behavior is correct
  - Document transaction test patterns
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 21. Fix admin authorization in tests
- [x] 21.1 Investigate admin role assignment failures
  - Review why system API keys don't get admin role in tests
  - Check ApiKeyAuthenticationMechanism role assignment
  - Verify admin group configuration in test profile
  - _Requirements: 6.1, 6.2_

- [x] 21.2 Fix admin authorization configuration
  - Ensure admin role is properly assigned to system keys
  - Verify authorization checks work in test environment
  - Add test-specific admin configuration if needed
  - _Requirements: 6.1, 6.2_

- [x] 21.3 Test admin authorization
  - Run ApiKeySecurityTest.testAdminCanAccessAllKeys
  - Run ApiKeyAuthenticationMechanismTest.testSystemApiKey_HasAdminRole
  - Verify admin authorization works correctly
  - _Requirements: 6.1, 6.2, 9.4_

- [x] 22. Document all test fixes and patterns
- [x] 22.1 Create test troubleshooting guide
  - Document common test failure patterns and solutions
  - Document test configuration requirements
  - Document test data management best practices
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 22.2 Update test documentation
  - Document how to run tests with different database providers
  - Document authentication configuration for tests
  - Document transaction management in tests
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 22.3 Add test patterns to steering rules
  - Create steering rule for test data cleanup
  - Create steering rule for entity persistence in tests
  - Create steering rule for authentication in tests
  - _Requirements: 7.4, 7.5_
