# Requirements Document

## Introduction

This feature enables the IDP API to support multiple database backends, allowing installers to choose between PostgreSQL (relational) and DynamoDB (NoSQL) for data persistence. The system will maintain a unified data access layer that abstracts the underlying database implementation, with configuration-driven selection of the active database provider.

## Glossary

- **IDP_API**: The Internal Developer Platform API backend application built with Quarkus
- **Data_Access_Layer**: The abstraction layer that provides a unified interface for data operations regardless of the underlying database
- **Database_Provider**: The concrete implementation of data persistence (PostgreSQL or DynamoDB)
- **Repository_Interface**: Java interface defining standard CRUD operations for each entity type
- **Configuration_Flag**: Environment variable or application property that determines which database provider to use
- **Entity_Mapper**: Component responsible for converting between domain entities and database-specific representations
- **Migration_Strategy**: The approach for handling schema changes in each database type
- **Panache_Entity**: Current Quarkus ORM pattern using PanacheEntityBase for PostgreSQL persistence

## Requirements

### Requirement 1

**User Story:** As an installer, I want to choose between PostgreSQL and DynamoDB during deployment, so that I can use the database that best fits my infrastructure requirements

#### Acceptance Criteria

1. WHEN THE IDP_API starts, THE IDP_API SHALL read the Configuration_Flag to determine which Database_Provider to activate
2. WHERE the Configuration_Flag specifies PostgreSQL, THE IDP_API SHALL initialize the PostgreSQL Database_Provider with Hibernate ORM
3. WHERE the Configuration_Flag specifies DynamoDB, THE IDP_API SHALL initialize the DynamoDB Database_Provider with AWS SDK
4. IF the Configuration_Flag contains an invalid value, THEN THE IDP_API SHALL fail startup with a clear error message indicating valid options
5. THE IDP_API SHALL log the selected Database_Provider during startup

### Requirement 2

**User Story:** As a developer, I want a unified data access interface, so that business logic remains independent of the database implementation

#### Acceptance Criteria

1. THE Data_Access_Layer SHALL define Repository_Interface for each entity type (Stack, Blueprint, Team, etc.)
2. THE Repository_Interface SHALL provide methods for create, read, update, delete, and query operations
3. THE IDP_API SHALL inject the appropriate Database_Provider implementation based on the Configuration_Flag
4. THE business logic layer SHALL interact only with Repository_Interface, not with database-specific code
5. WHEN switching Database_Provider via Configuration_Flag, THE IDP_API SHALL not require changes to business logic code

### Requirement 3

**User Story:** As a developer, I want entity mapping to handle database-specific representations, so that domain models remain clean and database-agnostic

#### Acceptance Criteria

1. THE Entity_Mapper SHALL convert domain entities to PostgreSQL table rows for the PostgreSQL Database_Provider
2. THE Entity_Mapper SHALL convert domain entities to DynamoDB items for the DynamoDB Database_Provider
3. THE Entity_Mapper SHALL handle JSONB columns in PostgreSQL by serializing complex objects to JSON
4. THE Entity_Mapper SHALL handle DynamoDB Map attributes by converting complex objects to nested maps
5. THE Entity_Mapper SHALL preserve all entity relationships (one-to-many, many-to-many) in both database implementations

### Requirement 4

**User Story:** As an operations engineer, I want schema management to work appropriately for each database type, so that deployments are reliable and repeatable

#### Acceptance Criteria

1. WHERE the Database_Provider is PostgreSQL, THE IDP_API SHALL use Flyway migrations to manage schema changes
2. WHERE the Database_Provider is DynamoDB, THE IDP_API SHALL create tables and indexes programmatically at startup if they do not exist
3. THE IDP_API SHALL validate that required database structures exist before accepting requests
4. IF required database structures are missing, THEN THE IDP_API SHALL fail health checks with descriptive error messages
5. THE Migration_Strategy SHALL support version tracking for both database types

### Requirement 5

**User Story:** As a developer, I want query operations to work consistently across both databases, so that I can retrieve data using the same interface

#### Acceptance Criteria

1. THE Repository_Interface SHALL support queries by ID for all entity types
2. THE Repository_Interface SHALL support list-all operations for all entity types
3. THE Repository_Interface SHALL support filtering by common attributes (e.g., createdBy, stackType)
4. THE Data_Access_Layer SHALL translate Repository_Interface queries to SQL for PostgreSQL Database_Provider
5. THE Data_Access_Layer SHALL translate Repository_Interface queries to DynamoDB Query/Scan operations for DynamoDB Database_Provider

### Requirement 6

**User Story:** As an operations engineer, I want the system to handle database-specific configuration, so that I can provide appropriate connection details for each database type

#### Acceptance Criteria

1. WHERE the Database_Provider is PostgreSQL, THE IDP_API SHALL require database URL, username, and password configuration
2. WHERE the Database_Provider is DynamoDB, THE IDP_API SHALL require AWS region and optionally AWS credentials configuration
3. THE IDP_API SHALL validate that required configuration properties are present for the selected Database_Provider
4. IF required configuration is missing, THEN THE IDP_API SHALL fail startup with a clear error message listing missing properties
5. THE IDP_API SHALL support environment variables for all database configuration properties

### Requirement 7

**User Story:** As a developer, I want transaction support to work appropriately for each database, so that data consistency is maintained

#### Acceptance Criteria

1. WHERE the Database_Provider is PostgreSQL, THE Data_Access_Layer SHALL use JTA transactions via Quarkus transaction management
2. WHERE the Database_Provider is DynamoDB, THE Data_Access_Layer SHALL use DynamoDB transactions for operations affecting multiple items
3. THE Repository_Interface SHALL provide transactional boundaries for multi-step operations
4. WHEN a transaction fails, THE Data_Access_Layer SHALL roll back all changes within the transaction scope
5. THE Data_Access_Layer SHALL log transaction failures with sufficient detail for debugging

### Requirement 8

**User Story:** As a tester, I want integration tests to run against both database implementations, so that I can verify functionality works correctly with either database

#### Acceptance Criteria

1. THE test suite SHALL include integration tests that run against PostgreSQL Database_Provider
2. THE test suite SHALL include integration tests that run against DynamoDB Database_Provider (using DynamoDB Local)
3. THE integration tests SHALL verify CRUD operations for all entity types
4. THE integration tests SHALL verify query operations return consistent results across both Database_Provider implementations
5. THE integration tests SHALL verify transaction behavior for both Database_Provider implementations
