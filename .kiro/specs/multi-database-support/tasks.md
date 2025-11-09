# Implementation Plan

- [x] 1. Create repository interface layer
- [x] 1.1 Define base repository interface with common CRUD operations
  - Create `Repository<T, ID>` interface in `com.angryss.idp.domain.repositories`
  - Include methods: save, findById, findAll, delete, count, exists
  - _Requirements: 2.1, 2.2_

- [x] 1.2 Create entity-specific repository interfaces
  - Create `StackRepository` interface extending base repository with Stack-specific queries
  - Create `BlueprintRepository` interface with Blueprint-specific queries
  - Create `TeamRepository` interface with Team-specific queries
  - Create `CloudProviderRepository` interface with CloudProvider-specific queries
  - Create `ResourceTypeRepository` interface with ResourceType-specific queries
  - Create `PropertySchemaRepository` interface with PropertySchema-specific queries
  - Create `ApiKeyRepository` interface with ApiKey-specific queries
  - Create `AdminAuditLogRepository` interface with AdminAuditLog-specific queries
  - Create remaining repository interfaces for: BlueprintResource, Category, Domain, EnvironmentConfig, EnvironmentEntity, ResourceTypeCloudMapping, StackCollection, StackResource
  - _Requirements: 2.1, 2.2, 5.1, 5.2, 5.3_

- [x] 2. Implement PostgreSQL repository layer
- [x] 2.1 Create PostgreSQL repository implementations for core entities
  - Implement `PostgresStackRepository` delegating to Panache methods
  - Implement `PostgresBlueprintRepository` delegating to Panache methods
  - Implement `PostgresTeamRepository` delegating to Panache methods
  - Add `@Named("postgresql")` and `@ConditionalOnProperty` annotations
  - _Requirements: 2.3, 3.1_

- [x] 2.2 Create PostgreSQL repository implementations for remaining entities
  - Implement repositories for: CloudProvider, ResourceType, PropertySchema, ApiKey, AdminAuditLog
  - Implement repositories for: BlueprintResource, Category, Domain, EnvironmentConfig, EnvironmentEntity, ResourceTypeCloudMapping, StackCollection, StackResource
  - _Requirements: 2.3, 3.1_

- [x] 2.3 Add transaction support to PostgreSQL repositories
  - Add `@Transactional` annotations to write operations
  - Verify transaction rollback behavior
  - _Requirements: 7.1, 7.3, 7.4_

- [x] 3. Update application services to use repositories
- [x] 3.1 Refactor StackService to use StackRepository
  - Replace direct `Stack.findById()` calls with `stackRepository.findById()`
  - Replace direct `Stack.persist()` calls with `stackRepository.save()`
  - Replace direct `Stack.delete()` calls with `stackRepository.delete()`
  - Replace static finder methods with repository methods
  - _Requirements: 2.4, 2.5_

- [x] 3.2 Refactor BlueprintService to use BlueprintRepository
  - Replace direct entity access with repository methods
  - Update all CRUD operations
  - _Requirements: 2.4, 2.5_

- [x] 3.3 Refactor remaining services to use repositories
  - Update CloudProviderService, ResourceTypeService, PropertySchemaService
  - Update ApiKeyService, AdminDashboardService
  - Update all other services that directly access entities
  - _Requirements: 2.4, 2.5_

- [x] 4. Add database provider configuration
- [x] 4.1 Create database configuration class
  - Create `DatabaseProviderConfig` in `com.angryss.idp.infrastructure.persistence.config`
  - Add `idp.database.provider` configuration property
  - Add validation for configuration property values
  - _Requirements: 1.1, 1.4, 6.3, 6.4_

- [x] 4.2 Implement repository injection logic
  - Add CDI producer methods for repository selection
  - Use `@Named` qualifiers to select correct implementation
  - Add startup logging for selected database provider
  - _Requirements: 1.1, 1.5, 2.3_

- [x] 4.3 Add PostgreSQL-specific configuration validation
  - Validate database URL, username, password are present when provider is postgresql
  - Fail startup with clear error if configuration is missing
  - _Requirements: 6.1, 6.4, 6.5_

- [ ] 5. Create DynamoDB client configuration
- [x] 5.1 Add DynamoDB dependencies to pom.xml
  - Add AWS SDK DynamoDB dependency
  - Add AWS SDK core dependencies
  - _Requirements: 1.3_

- [x] 5.2 Create DynamoDB client producer
  - Create `DynamoDbClient` CDI producer in `DatabaseProviderConfig`
  - Add configuration for AWS region
  - Add optional endpoint override for local testing
  - Add `@ConditionalOnProperty` to only create when provider is dynamodb
  - _Requirements: 1.3, 6.2, 6.5_

- [x] 5.3 Add DynamoDB-specific configuration validation
  - Validate AWS region is present when provider is dynamodb
  - Fail startup with clear error if configuration is missing
  - _Requirements: 6.2, 6.4, 6.5_

- [x] 6. Implement DynamoDB entity mapper
- [x] 6.1 Create base mapper utilities
  - Create `DynamoEntityMapper` class in `com.angryss.idp.infrastructure.persistence.dynamodb.mapper`
  - Implement `mapToAttributeValue()` for converting Java Maps to DynamoDB Maps
  - Implement `attributeValueToMap()` for converting DynamoDB Maps to Java Maps
  - Add utility methods for handling UUIDs, LocalDateTime, enums
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 6.2 Implement Stack entity mapping
  - Implement `stackToItem()` method converting Stack to DynamoDB item
  - Implement `itemToStack()` method converting DynamoDB item to Stack
  - Handle all Stack fields including optional fields
  - Handle relationship foreign keys (teamId, blueprintId, etc.)
  - Handle configuration Map field
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6.3 Implement Blueprint entity mapping
  - Implement `blueprintToItem()` and `itemToBlueprint()` methods
  - Handle Blueprint fields and relationships
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 6.4 Implement Team entity mapping
  - Implement `teamToItem()` and `itemToTeam()` methods
  - Handle Team fields
  - _Requirements: 3.1, 3.2_

- [x] 6.5 Implement mapping for remaining entities
  - Implement mapper methods for: CloudProvider, ResourceType, PropertySchema, ApiKey, AdminAuditLog
  - Implement mapper methods for: BlueprintResource, Category, Domain, EnvironmentConfig, EnvironmentEntity, ResourceTypeCloudMapping, StackCollection, StackResource
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 7. Create DynamoDB table initialization
- [x] 7.1 Create table schema definitions
  - Define table schemas for all entities in `DatabaseProviderConfig`
  - Define primary key structure (id as String)
  - Define GSI schemas for common query patterns
  - _Requirements: 4.2, 4.3_

- [x] 7.2 Implement table creation logic
  - Implement `initializeDynamoDbTables()` method
  - Check if tables exist before creating
  - Create tables with defined schemas
  - Create GSIs for query optimization
  - _Requirements: 4.2, 4.3_

- [x] 7.3 Add table existence validation
  - Verify all required tables exist at startup
  - Fail health checks if tables are missing
  - _Requirements: 4.3, 4.4_

- [x] 8. Implement DynamoDB repository layer
- [x] 8.1 Create DynamoStackRepository implementation
  - Implement `save()` using PutItem operation
  - Implement `findById()` using GetItem operation
  - Implement `findAll()` using Scan operation
  - Implement `findByCreatedBy()` using Query on GSI
  - Implement `findByStackType()` using Query on GSI
  - Implement `findByTeamId()` using Query on GSI
  - Implement `existsByNameAndCreatedBy()` using Query
  - Implement `delete()` using DeleteItem operation
  - Implement `count()` using Scan with count
  - Add `@Named("dynamodb")` and `@ConditionalOnProperty` annotations
  - _Requirements: 1.3, 3.2, 5.4, 5.5_

- [x] 8.2 Create DynamoBlueprintRepository implementation
  - Implement all CRUD operations
  - Implement query methods using GSIs
  - _Requirements: 1.3, 3.2, 5.4, 5.5_

- [x] 8.3 Create DynamoTeamRepository implementation
  - Implement all CRUD operations
  - Implement query methods
  - _Requirements: 1.3, 3.2, 5.4, 5.5_

- [x] 8.4 Create DynamoDB repositories for remaining entities
  - Implement repositories for: CloudProvider, ResourceType, PropertySchema, ApiKey, AdminAuditLog
  - Implement repositories for: BlueprintResource, Category, Domain, EnvironmentConfig, EnvironmentEntity, ResourceTypeCloudMapping, StackCollection, StackResource
  - _Requirements: 1.3, 3.2, 5.4, 5.5_

- [x] 9. Implement DynamoDB transaction support
- [x] 9.1 Add transaction wrapper for DynamoDB
  - Create `DynamoTransactionManager` for coordinating multi-item operations
  - Implement transaction write using TransactWriteItems
  - Implement rollback logic for failed transactions
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 9.2 Add transaction support to DynamoDB repositories
  - Update repository methods to use transaction manager for multi-step operations
  - Add transaction logging
  - _Requirements: 7.2, 7.3, 7.5_

- [ ] 10. Add database health checks
- [x] 10.1 Create database health check implementation
  - Create `DatabaseHealthCheck` class implementing `HealthCheck`
  - Add `@Readiness` annotation
  - Implement connectivity check using repository count operation
  - Return health status with database provider name
  - _Requirements: 4.3, 4.4_

- [x] 10.2 Add detailed health check information
  - Include error messages in health check response
  - Add database-specific metadata (version, connection pool stats for PostgreSQL, table status for DynamoDB)
  - _Requirements: 4.4_

- [x] 11. Update application properties
- [x] 11.1 Add database provider configuration properties
  - Add `idp.database.provider` property with default value "postgresql"
  - Add DynamoDB configuration properties (region, endpoint)
  - Document all new configuration properties
  - _Requirements: 1.1, 6.1, 6.2, 6.5_

- [x] 11.2 Create example configuration files
  - Create `application-dynamodb.properties` with DynamoDB configuration example
  - Update existing `application.properties` with PostgreSQL as default
  - _Requirements: 1.2, 1.3, 6.1, 6.2_
fulf
- [x] 12. Create unit tests for mappers
- [x] 12.1 Write tests for DynamoEntityMapper
  - Test `stackToItem()` with all field combinations
  - Test `itemToStack()` with all field combinations
  - Test handling of null and optional fields
  - Test nested Map conversion
  - Test UUID, LocalDateTime, and enum conversions
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 12.2 Write tests for remaining entity mappers
  - Test mapper methods for all entities
  - Verify bidirectional conversion accuracy
  - _Requirements: 3.1, 3.2_

- [ ] 13. Create integration tests for PostgreSQL
- [x] 13.1 Create PostgreSQL repository integration tests
  - Write tests for StackRepository CRUD operations
  - Write tests for BlueprintRepository CRUD operations
  - Write tests for TeamRepository CRUD operations
  - Verify query methods return correct results
  - Verify transaction behavior
  - Use H2 in-memory database
  - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [x] 13.2 Create PostgreSQL repository tests for remaining entities
  - Write integration tests for all remaining repositories
  - Verify relationship loading
  - _Requirements: 8.1, 8.3, 8.4_

- [x] 14. Create integration tests for DynamoDB
- [x] 14.1 Set up DynamoDB Local test environment
  - Add DynamoDB Local Docker container to test setup
  - Configure test profile for DynamoDB
  - Create test configuration with local endpoint
  - _Requirements: 8.2_

- [x] 14.2 Create DynamoDB repository integration tests
  - Write tests for DynamoStackRepository CRUD operations
  - Write tests for DynamoBlueprintRepository CRUD operations
  - Write tests for DynamoTeamRepository CRUD operations
  - Verify GSI queries work correctly
  - Verify transaction behavior
  - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [x] 14.3 Create DynamoDB repository tests for remaining entities
  - Write integration tests for all remaining DynamoDB repositories
  - Test pagination for large result sets
  - Test conditional writes
  - _Requirements: 8.2, 8.3, 8.4_

- [x] 15. Create cross-database consistency tests
- [x] 15.1 Create parameterized repository contract tests
  - Create abstract test class that runs against both implementations
  - Test CRUD operations produce identical results
  - Test query operations return consistent data
  - Verify transaction semantics are equivalent
  - _Requirements: 8.4, 8.5_

- [x] 16. Update documentation
- [x] 16.1 Update architecture documentation
  - Document repository pattern implementation
  - Document database provider selection mechanism
  - Add architecture diagrams
  - _Requirements: 1.1, 2.1_

- [x] 16.2 Create database configuration guide
  - Document PostgreSQL configuration
  - Document DynamoDB configuration
  - Provide deployment examples
  - Document migration considerations
  - _Requirements: 1.2, 1.3, 6.1, 6.2_

- [x] 16.3 Create troubleshooting guide
  - Document common configuration errors
  - Document health check interpretation
  - Provide debugging tips for each database provider
  - _Requirements: 1.4, 4.4_
