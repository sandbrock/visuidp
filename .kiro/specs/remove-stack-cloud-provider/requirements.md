# Requirements Document

## Introduction

This feature removes the cloud provider, domain, and category fields from the Stack entity to align with VisuIDP's core principle of cloud-agnostic infrastructure management. Currently, stacks have direct relationships with cloud providers, domains, and categories, which contradicts the platform's goal of managing infrastructure in a cloud-agnostic way and adds unnecessary complexity. The cloud provider should be determined at the environment level, not at the stack level, allowing the same stack to be deployed across multiple cloud providers through different environments. Domains and categories add organizational overhead without clear value and should be removed to simplify the stack model.

## Glossary

- **Stack**: A logical representation of a service or UI application with its dependent infrastructure resources
- **Environment**: A deployment target (dev, staging, production) that is associated with a specific cloud provider
- **Cloud Provider**: A cloud computing platform (AWS, Azure, GCP, etc.) that hosts infrastructure resources
- **Domain**: An organizational grouping concept being removed from stacks
- **Category**: A classification concept being removed from stacks
- **Blueprint**: A reusable infrastructure pattern that can be applied to stacks
- **Stack Resource**: An infrastructure resource instance that belongs to a stack
- **Blueprint Resource**: A shared infrastructure resource defined in a blueprint
- **Database Schema**: The PostgreSQL database structure defined through Flyway migrations
- **Entity**: A JPA domain object representing a database table
- **DTO**: Data Transfer Object used for API request/response payloads
- **Foreign Key**: A database constraint that enforces referential integrity between tables

## Requirements

### Requirement 1: Remove Cloud Provider, Domain, and Category from Stack Entity

**User Story:** As a platform architect, I want stacks to be cloud-agnostic and free from unnecessary organizational fields so that the same stack definition can be deployed to multiple cloud providers through different environments without complexity.

#### Acceptance Criteria

1. WHEN THE Stack entity is modified, THE System SHALL remove the cloudProvider field and its associated getter/setter methods
2. WHEN THE Stack entity is modified, THE System SHALL remove the domain field and its associated getter/setter methods
3. WHEN THE Stack entity is modified, THE System SHALL remove the category field and its associated getter/setter methods
4. WHEN THE Stack entity is modified, THE System SHALL remove the validateCloudProvider() method from @PrePersist and @PreUpdate lifecycle hooks
5. WHEN THE Stack entity is modified, THE System SHALL remove the findByCloudProviderId() static finder method
6. WHEN THE Stack entity is modified, THE System SHALL remove the findByCloudProviderAndCreatedBy() static finder method
7. WHEN THE Stack entity is modified, THE System SHALL remove the findByDomainId() static finder method
8. WHEN THE Stack entity is modified, THE System SHALL remove the findByCategoryId() static finder method
9. WHEN THE StackCreateDto is modified, THE System SHALL remove domainId, categoryId, and any cloudProviderId fields if present

### Requirement 2: Update Database Schema

**User Story:** As a database administrator, I want the database schema to reflect the removal of cloud provider, domain, and category from stacks so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN A new Flyway migration is created, THE System SHALL drop the foreign key constraint fk_stacks_cloud_provider from the stacks table
2. WHEN THE migration is created, THE System SHALL drop the foreign key constraint fk_stacks_domain from the stacks table
3. WHEN THE migration is created, THE System SHALL drop the foreign key constraint fk_stacks_category from the stacks table
4. WHEN THE migration is created, THE System SHALL drop the index idx_stacks_cloud_provider from the stacks table
5. WHEN THE migration is created, THE System SHALL drop the index idx_stacks_domain_id from the stacks table
6. WHEN THE migration is created, THE System SHALL drop the index idx_stacks_category_id from the stacks table
7. WHEN THE migration is created, THE System SHALL drop the cloud_provider_id column from the stacks table
8. WHEN THE migration is created, THE System SHALL drop the domain_id column from the stacks table
9. WHEN THE migration is created, THE System SHALL drop the category_id column from the stacks table
10. WHEN THE migration is executed, THE System SHALL complete without errors on a database with existing data
11. WHEN THE migration is executed, THE System SHALL preserve all other stack data

### Requirement 3: Update Service Layer

**User Story:** As a backend developer, I want the service layer to no longer handle cloud provider, domain, or category associations for stacks so that business logic remains cloud-agnostic and simplified.

#### Acceptance Criteria

1. WHEN THE StackService is modified, THE System SHALL remove any logic that sets or validates cloudProvider on Stack entities
2. WHEN THE StackService is modified, THE System SHALL remove any logic that sets or validates domain on Stack entities
3. WHEN THE StackService is modified, THE System SHALL remove any logic that sets or validates category on Stack entities
4. WHEN THE StackService creates a stack, THE System SHALL not attempt to associate a cloud provider, domain, or category
5. WHEN THE StackService updates a stack, THE System SHALL not attempt to modify cloud provider, domain, or category associations
6. WHEN THE StackService maps entities to DTOs, THE System SHALL not include cloud provider, domain, or category information in responses

### Requirement 4: Update API Controllers

**User Story:** As an API consumer, I want the stack API endpoints to no longer accept or return cloud provider, domain, or category information so that the API contract reflects cloud-agnostic and simplified design.

#### Acceptance Criteria

1. WHEN THE StacksController handles create requests, THE System SHALL not accept cloudProviderId, domainId, or categoryId in the request payload
2. WHEN THE StacksController handles update requests, THE System SHALL not accept cloudProviderId, domainId, or categoryId in the request payload
3. WHEN THE StacksController returns stack responses, THE System SHALL not include cloudProviderId, domainId, or categoryId in the response payload
4. WHEN THE API documentation is generated, THE System SHALL not show cloudProviderId, domainId, or categoryId in stack-related schemas

### Requirement 5: Update Frontend Components

**User Story:** As a frontend developer, I want the UI components to no longer display or collect cloud provider, domain, or category information for stacks so that the user experience reflects cloud-agnostic and simplified design.

#### Acceptance Criteria

1. WHEN THE StackForm component is rendered, THE System SHALL not display cloud provider, domain, or category selection fields
2. WHEN THE StackForm component submits data, THE System SHALL not include cloudProviderId, domainId, or categoryId in the request payload
3. WHEN THE StackList component displays stacks, THE System SHALL not show cloud provider, domain, or category information
4. WHEN THE StackDetails component displays stack information, THE System SHALL not show cloud provider, domain, or category information
5. WHEN THE stack TypeScript types are defined, THE System SHALL not include cloudProviderId, domainId, or categoryId fields

### Requirement 6: Update Tests

**User Story:** As a quality assurance engineer, I want all tests to reflect the removal of cloud provider, domain, and category from stacks so that test coverage remains comprehensive.

#### Acceptance Criteria

1. WHEN EXISTING tests reference stack cloud providers, domains, or categories, THE System SHALL remove or update those test assertions
2. WHEN TEST data builders create stacks, THE System SHALL not set cloud provider, domain, or category associations
3. WHEN INTEGRATION tests verify stack creation, THE System SHALL not validate cloud provider, domain, or category fields
4. WHEN UNIT tests verify stack validation, THE System SHALL not test cloud provider, domain, or category validation logic
5. WHEN ALL tests are executed, THE System SHALL pass without failures related to cloud provider, domain, or category removal

### Requirement 7: Maintain Backward Compatibility for Other Entities

**User Story:** As a system maintainer, I want other entities that legitimately use cloud providers to remain unchanged so that only stack-level cloud provider associations are removed.

#### Acceptance Criteria

1. WHEN THE Environment entity is reviewed, THE System SHALL maintain the cloudProvider field and relationship
2. WHEN THE StackResource entity is reviewed, THE System SHALL maintain the cloudProvider field if it exists
3. WHEN THE BlueprintResource entity is reviewed, THE System SHALL maintain the cloudProvider field if it exists
4. WHEN THE Blueprint entity is reviewed, THE System SHALL maintain the blueprint_cloud_providers junction table
5. WHEN THE CloudProvider entity is reviewed, THE System SHALL remain unchanged and fully functional

### Requirement 8: Update Documentation

**User Story:** As a developer onboarding to the project, I want documentation to accurately reflect the cloud-agnostic and simplified stack design so that I understand the architecture correctly.

#### Acceptance Criteria

1. WHEN ARCHITECTURE documentation references stack cloud providers, domains, or categories, THE System SHALL update those references to reflect environment-level cloud provider associations and simplified stack model
2. WHEN API documentation is generated, THE System SHALL not include cloud provider, domain, or category fields in stack schemas
3. WHEN DATABASE schema comments reference stack cloud providers, domains, or categories, THE System SHALL update or remove those comments
4. WHEN CODE comments reference stack cloud provider, domain, or category validation, THE System SHALL remove those comments
5. WHEN MIGRATION scripts include comments, THE System SHALL clearly explain the removal of cloud provider, domain, and category from stacks
