# Implementation Plan

- [x] 1. Create database migration to remove organizational fields
  - Create Flyway migration script V4__remove_stack_organizational_fields.sql
  - Drop foreign key constraints: fk_stacks_cloud_provider, fk_stacks_domain, fk_stacks_category
  - Drop indexes: idx_stacks_cloud_provider, idx_stacks_domain_id, idx_stacks_category_id
  - Drop columns: cloud_provider_id, domain_id, category_id from stacks table
  - Add table comment explaining cloud-agnostic design
  - Use IF EXISTS clauses for idempotency
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

- [x] 2. Update Stack entity to remove organizational fields
  - Remove cloudProvider field and @ManyToOne relationship
  - Remove domain field and @ManyToOne relationship
  - Remove category field and @ManyToOne relationship
  - Remove getCloudProvider() and setCloudProvider() methods
  - Remove getDomain() and setDomain() methods
  - Remove getCategory() and setCategory() methods
  - Remove validateCloudProvider() method
  - Remove validateCloudProvider() call from @PrePersist hook
  - Remove validateCloudProvider() call from @PreUpdate hook
  - Remove findByCloudProviderId() static finder method
  - Remove findByCloudProviderAndCreatedBy() static finder method
  - Remove findByDomainId() static finder method
  - Remove findByCategoryId() static finder method
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 3. Update DTOs to remove organizational fields
  - Remove domainId field from StackCreateDto
  - Remove categoryId field from StackCreateDto
  - Remove getDomainId() and setDomainId() from StackCreateDto
  - Remove getCategoryId() and setCategoryId() from StackCreateDto
  - Remove domainId field from StackResponseDto
  - Remove categoryId field from StackResponseDto
  - Remove getDomainId() and setDomainId() from StackResponseDto
  - Remove getCategoryId() and setCategoryId() from StackResponseDto
  - _Requirements: 1.9, 4.1, 4.2, 4.3_

- [x] 4. Update StackService to remove organizational field handling
  - Remove domain lookup logic from create method
  - Remove category lookup logic from create method
  - Remove domain assignment in create method
  - Remove category assignment in create method
  - Remove domainId mapping in toResponseDto method
  - Remove categoryId mapping in toResponseDto method
  - Remove DomainRepository injection if no longer used
  - Remove CategoryRepository injection if no longer used
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. Update frontend TypeScript types
  - Remove domainId field from Stack interface in types/stack.ts
  - Remove categoryId field from Stack interface in types/stack.ts
  - Remove cloudProviderId field from Stack interface if present
  - Remove domainId from StackCreateRequest interface
  - Remove categoryId from StackCreateRequest interface
  - Remove cloudProviderId from StackCreateRequest interface if present
  - _Requirements: 5.5_

- [x] 6. Update StackForm component
  - Remove domain selection field from form UI
  - Remove category selection field from form UI
  - Remove cloud provider selection field from form UI if present
  - Remove domainId from form state
  - Remove categoryId from form state
  - Remove cloudProviderId from form state if present
  - Remove domainId from submission payload
  - Remove categoryId from submission payload
  - Remove cloudProviderId from submission payload if present
  - _Requirements: 5.1, 5.2_

- [x] 7. Update StackList component
  - Remove Domain column from table header
  - Remove Category column from table header
  - Remove Cloud Provider column from table header if present
  - Remove domain cell from table rows
  - Remove category cell from table rows
  - Remove cloud provider cell from table rows if present
  - _Requirements: 5.3_

- [x] 8. Update StackDetails component
  - Remove domain detail row from display
  - Remove category detail row from display
  - Remove cloud provider detail row from display if present
  - _Requirements: 5.4_

- [x] 9. Update backend tests
  - Update Stack entity tests to remove cloud provider, domain, and category assertions
  - Update StackService tests to remove organizational field logic
  - Update test data builders to not set cloud provider, domain, or category
  - Update integration tests to not validate removed fields
  - Remove unit tests for validateCloudProvider() method
  - Remove tests for removed finder methods
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9.1 Write migration test to verify schema changes
  - Test that cloud_provider_id column is removed
  - Test that domain_id column is removed
  - Test that category_id column is removed
  - Test that foreign key constraints are removed
  - Test that indexes are removed
  - Test that migration is idempotent
  - Test that other stack data is preserved
  - _Requirements: 2.10, 2.11_

- [x] 10. Update frontend tests
  - Update StackForm tests to verify removed fields are not displayed
  - Update StackList tests to verify removed columns are not shown
  - Update StackDetails tests to verify removed fields are not displayed
  - Add test to verify form submission excludes removed fields
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 11. Update documentation
  - Update architecture documentation to reflect cloud-agnostic stack design
  - Update API documentation comments to remove references to removed fields
  - Update database schema comments in migration script
  - Remove code comments referencing cloud provider, domain, or category validation
  - Add migration script comments explaining the removal
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12. Verify and validate changes
  - Run full backend test suite and verify all tests pass
  - Run full frontend test suite and verify all tests pass
  - Start application and verify stack creation works without removed fields
  - Verify stack list displays correctly without removed columns
  - Verify stack details displays correctly without removed fields
  - Verify API documentation doesn't show removed fields
  - Test migration on clean database
  - Test migration on database with existing stack data
  - _Requirements: 6.5, 4.4_
