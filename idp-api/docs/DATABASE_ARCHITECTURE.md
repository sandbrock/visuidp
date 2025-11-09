# Database Architecture

## Overview

The IDP API implements a pluggable database abstraction layer that supports multiple database backends. This architecture allows installers to choose between PostgreSQL (relational) and DynamoDB (NoSQL) for data persistence based on their infrastructure requirements and operational preferences.

The implementation follows the Repository pattern to decouple business logic from data persistence concerns, enabling database provider selection through configuration without requiring code changes.

**Visual Diagrams**: For architecture diagrams and visual representations, see [DATABASE_ARCHITECTURE_DIAGRAMS.md](DATABASE_ARCHITECTURE_DIAGRAMS.md)

## Architecture Principles

### Clean Architecture Compliance

The database abstraction layer maintains the existing Clean Architecture structure:

1. **Domain Layer**: Contains entity definitions and repository interfaces (contracts)
2. **Application Layer**: Uses repository interfaces without knowledge of implementation details
3. **Infrastructure Layer**: Provides concrete repository implementations for each database provider
4. **Presentation Layer**: Remains unchanged, unaware of database implementation

### Key Design Goals

- **Database Agnostic Business Logic**: Application services interact only with repository interfaces
- **Configuration-Driven Selection**: Database provider chosen via configuration property at startup
- **Zero Code Changes for Switching**: Changing database providers requires only configuration updates
- **Consistent Behavior**: Both implementations provide identical functionality through common interfaces
- **Performance Optimization**: Each implementation leverages database-specific strengths

## Repository Pattern Implementation

### Repository Interface Layer

Located in: `com.angryss.idp.domain.repositories`

Each domain entity has a corresponding repository interface that defines standard data access operations:

```java
package com.angryss.idp.domain.repositories;

public interface StackRepository {
    // Create/Update
    Stack save(Stack stack);
    
    // Read operations
    Optional<Stack> findById(UUID id);
    List<Stack> findAll();
    List<Stack> findByCreatedBy(String createdBy);
    List<Stack> findByStackType(StackType stackType);
    List<Stack> findByTeamId(UUID teamId);
    
    // Query operations
    boolean existsByNameAndCreatedBy(String name, String createdBy);
    long count();
    
    // Delete
    void delete(Stack stack);
}
```

### Repository Interfaces for All Entities

The system provides repository interfaces for all 16 domain entities:

**Core Entities:**
- `StackRepository` - Developer project stacks
- `BlueprintRepository` - Reusable infrastructure templates
- `TeamRepository` - Development teams
- `CloudProviderRepository` - Cloud provider configurations
- `ResourceTypeRepository` - Infrastructure resource type definitions
- `PropertySchemaRepository` - Dynamic property schemas

**Supporting Entities:**
- `ApiKeyRepository` - API authentication keys
- `AdminAuditLogRepository` - Administrative action audit trail
- `BlueprintResourceRepository` - Resources within blueprints
- `CategoryRepository` - Resource categorization
- `DomainRepository` - Domain definitions
- `EnvironmentConfigRepository` - Environment-specific configurations
- `EnvironmentEntityRepository` - Environment definitions
- `ResourceTypeCloudMappingRepository` - Resource type to cloud provider mappings
- `StackCollectionRepository` - Stack groupings
- `StackResourceRepository` - Resources within stacks

### Base Repository Interface

All repository interfaces extend a common base interface:

```java
package com.angryss.idp.domain.repositories;

public interface Repository<T, ID> {
    T save(T entity);
    Optional<T> findById(ID id);
    List<T> findAll();
    void delete(T entity);
    long count();
    boolean exists(ID id);
}
```

Entity-specific repositories extend this base and add domain-specific query methods.

## Database Provider Selection Mechanism

### Configuration Property

The database provider is selected via a single configuration property:

```properties
idp.database.provider=postgresql  # or dynamodb
```

This property is read at application startup and determines which repository implementations are activated.

### Conditional Bean Creation

Repository implementations use Quarkus CDI with conditional bean creation:

```java
@ApplicationScoped
@Named("postgresql")
@ConditionalOnProperty(name = "idp.database.provider", stringValue = "postgresql")
public class PostgresStackRepository implements StackRepository {
    // PostgreSQL implementation
}

@ApplicationScoped
@Named("dynamodb")
@ConditionalOnProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoStackRepository implements StackRepository {
    // DynamoDB implementation
}
```

Only the repository implementation matching the configured provider is instantiated.

### Repository Injection in Services

Application services inject repositories using CDI:

```java
@ApplicationScoped
public class StackService {
    
    @Inject
    StackRepository stackRepository;  // Correct implementation injected automatically
    
    @Transactional
    public StackResponseDto createStack(StackCreateDto createDto, String createdBy) {
        Stack stack = new Stack();
        // ... populate stack fields
        stack = stackRepository.save(stack);
        return stackMapper.toResponseDto(stack);
    }
}
```

The CDI container automatically injects the correct implementation based on the active configuration.

### Database Provider Configuration Class

Located in: `com.angryss.idp.infrastructure.persistence.config.DatabaseProviderConfig`

This class manages database-specific initialization:

```java
@ApplicationScoped
public class DatabaseProviderConfig {
    
    @ConfigProperty(name = "idp.database.provider")
    String databaseProvider;
    
    @Observes
    StartupEvent event void onStart() {
        log.info("Initializing database provider: {}", databaseProvider);
        
        if ("dynamodb".equals(databaseProvider)) {
            initializeDynamoDbTables();
        }
        // PostgreSQL uses Flyway migrations automatically
    }
    
    @Produces
    @ApplicationScoped
    public DynamoDbClient dynamoDbClient() {
        if (!"dynamodb".equals(databaseProvider)) {
            return null;
        }
        // Create and configure DynamoDB client
    }
}
```

## PostgreSQL Implementation

### Architecture

Located in: `com.angryss.idp.infrastructure.persistence.postgresql`

The PostgreSQL implementation leverages existing Quarkus/Hibernate infrastructure:

```
PostgreSQL Repository Implementation
├── Delegates to Panache entity methods
├── Uses Hibernate ORM for relationship management
├── Leverages JPA annotations on entities
├── Uses @Transactional for transaction management
└── Schema managed by Flyway migrations
```

### Example Implementation

```java
@ApplicationScoped
@Named("postgresql")
@ConditionalOnProperty(name = "idp.database.provider", stringValue = "postgresql")
public class PostgresStackRepository implements StackRepository {
    
    @Override
    @Transactional
    public Stack save(Stack stack) {
        if (stack.getId() == null) {
            stack.setId(UUID.randomUUID());
        }
        stack.setUpdatedAt(LocalDateTime.now());
        stack.persist();
        return stack;
    }
    
    @Override
    public Optional<Stack> findById(UUID id) {
        return Optional.ofNullable(Stack.findById(id));
    }
    
    @Override
    public List<Stack> findAll() {
        return Stack.listAll();
    }
    
    @Override
    public List<Stack> findByCreatedBy(String createdBy) {
        return Stack.list("createdBy", createdBy);
    }
    
    @Override
    @Transactional
    public void delete(Stack stack) {
        stack.delete();
    }
}
```

### Key Characteristics

- **Entities**: Continue to extend `PanacheEntityBase` with JPA annotations
- **Relationships**: Managed automatically by Hibernate (lazy/eager loading)
- **JSONB Support**: Complex configuration stored in JSONB columns
- **Transactions**: JTA transactions via `@Transactional` annotation
- **Schema Management**: Flyway versioned migrations
- **Query Optimization**: Database indexes defined in migrations

### Database Schema

Tables follow snake_case naming convention:

- `stacks` - Developer project stacks
- `blueprints` - Infrastructure templates
- `teams` - Development teams
- `cloud_providers` - Cloud provider configurations
- `resource_types` - Resource type definitions
- `property_schemas` - Dynamic property schemas
- (Additional tables for remaining entities)

Foreign key constraints enforce referential integrity.

## DynamoDB Implementation

### Architecture

Located in: `com.angryss.idp.infrastructure.persistence.dynamodb`

The DynamoDB implementation uses AWS SDK v2:

```
DynamoDB Repository Implementation
├── Uses AWS SDK DynamoDbClient
├── Entity Mapper converts entities to/from DynamoDB items
├── GSIs (Global Secondary Indexes) for query optimization
├── Transaction Manager for multi-item operations
└── Tables created programmatically at startup
```

### Example Implementation

```java
@ApplicationScoped
@Named("dynamodb")
@ConditionalOnProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoStackRepository implements StackRepository {
    
    @Inject
    DynamoDbClient dynamoDbClient;
    
    @Inject
    DynamoEntityMapper entityMapper;
    
    private static final String TABLE_NAME = "idp_stacks";
    
    @Override
    public Stack save(Stack stack) {
        if (stack.getId() == null) {
            stack.setId(UUID.randomUUID());
        }
        stack.setUpdatedAt(LocalDateTime.now());
        
        Map<String, AttributeValue> item = entityMapper.stackToItem(stack);
        
        PutItemRequest request = PutItemRequest.builder()
            .tableName(TABLE_NAME)
            .item(item)
            .build();
            
        dynamoDbClient.putItem(request);
        return stack;
    }
    
    @Override
    public Optional<Stack> findById(UUID id) {
        GetItemRequest request = GetItemRequest.builder()
            .tableName(TABLE_NAME)
            .key(Map.of("id", AttributeValue.builder().s(id.toString()).build()))
            .build();
            
        GetItemResponse response = dynamoDbClient.getItem(request);
        
        if (!response.hasItem()) {
            return Optional.empty();
        }
        
        return Optional.of(entityMapper.itemToStack(response.item()));
    }
    
    @Override
    public List<Stack> findByCreatedBy(String createdBy) {
        QueryRequest request = QueryRequest.builder()
            .tableName(TABLE_NAME)
            .indexName("createdBy-createdAt-index")
            .keyConditionExpression("createdBy = :createdBy")
            .expressionAttributeValues(Map.of(
                ":createdBy", AttributeValue.builder().s(createdBy).build()
            ))
            .build();
            
        QueryResponse response = dynamoDbClient.query(request);
        
        return response.items().stream()
            .map(entityMapper::itemToStack)
            .collect(Collectors.toList());
    }
}
```

### Entity Mapper

Located in: `com.angryss.idp.infrastructure.persistence.dynamodb.mapper.DynamoEntityMapper`

Converts between domain entities and DynamoDB items:

```java
@ApplicationScoped
public class DynamoEntityMapper {
    
    public Map<String, AttributeValue> stackToItem(Stack stack) {
        Map<String, AttributeValue> item = new HashMap<>();
        
        // Required fields
        item.put("id", AttributeValue.builder().s(stack.getId().toString()).build());
        item.put("name", AttributeValue.builder().s(stack.getName()).build());
        item.put("stackType", AttributeValue.builder().s(stack.getStackType().name()).build());
        item.put("createdBy", AttributeValue.builder().s(stack.getCreatedBy()).build());
        item.put("createdAt", AttributeValue.builder().s(stack.getCreatedAt().toString()).build());
        
        // Optional fields
        if (stack.getDescription() != null) {
            item.put("description", AttributeValue.builder().s(stack.getDescription()).build());
        }
        
        // Relationships (store foreign keys)
        if (stack.getTeam() != null) {
            item.put("teamId", AttributeValue.builder().s(stack.getTeam().getId().toString()).build());
        }
        
        // Complex objects (Map/JSONB equivalent)
        if (stack.getConfiguration() != null) {
            item.put("configuration", mapToAttributeValue(stack.getConfiguration()));
        }
        
        return item;
    }
    
    public Stack itemToStack(Map<String, AttributeValue> item) {
        Stack stack = new Stack();
        
        stack.setId(UUID.fromString(item.get("id").s()));
        stack.setName(item.get("name").s());
        stack.setStackType(StackType.valueOf(item.get("stackType").s()));
        stack.setCreatedBy(item.get("createdBy").s());
        stack.setCreatedAt(LocalDateTime.parse(item.get("createdAt").s()));
        
        // Optional fields
        if (item.containsKey("description")) {
            stack.setDescription(item.get("description").s());
        }
        
        // Configuration
        if (item.containsKey("configuration")) {
            stack.setConfiguration(attributeValueToMap(item.get("configuration")));
        }
        
        // Note: Relationships loaded separately when needed
        
        return stack;
    }
}
```

### Table Design

Each entity has its own DynamoDB table:

**Table: idp_stacks**
- Primary Key: `id` (String, UUID)
- GSI1: `createdBy-createdAt-index` - Query stacks by creator
- GSI2: `stackType-createdAt-index` - Query stacks by type
- GSI3: `teamId-createdAt-index` - Query stacks by team

**Table: idp_blueprints**
- Primary Key: `id` (String, UUID)
- GSI1: `name-index` - Unique name lookups
- GSI2: `isActive-createdAt-index` - Query active blueprints

**Table: idp_teams**
- Primary Key: `id` (String, UUID)
- GSI1: `name-index` - Unique name lookups

(Similar patterns for remaining entities)

### Relationship Handling

- **One-to-Many**: Store foreign key UUID in child items
- **Many-to-Many**: Create junction table (e.g., `idp_blueprint_cloud_providers`)
- **Lazy Loading**: Relationships loaded on-demand via separate queries
- **Eager Loading**: Batch operations for loading related entities

### Transaction Support

Located in: `com.angryss.idp.infrastructure.persistence.dynamodb.DynamoTransactionManager`

Coordinates multi-item operations:

```java
@ApplicationScoped
public class DynamoTransactionManager {
    
    @Inject
    DynamoDbClient dynamoDbClient;
    
    public void executeTransaction(List<TransactWriteItem> items) {
        TransactWriteItemsRequest request = TransactWriteItemsRequest.builder()
            .transactItems(items)
            .build();
            
        try {
            dynamoDbClient.transactWriteItems(request);
        } catch (TransactionCanceledException e) {
            // Handle transaction failure
            throw new PersistenceException("Transaction failed", e);
        }
    }
}
```

## Configuration Examples

### PostgreSQL Configuration

```properties
# Database provider selection
idp.database.provider=postgresql

# PostgreSQL connection
quarkus.datasource.db-kind=postgresql
quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/idp_db
quarkus.datasource.username=idp_user
quarkus.datasource.password=${DB_PASSWORD}

# Flyway migrations
quarkus.flyway.migrate-at-start=true
quarkus.flyway.locations=classpath:db/migration
```

### DynamoDB Configuration

```properties
# Database provider selection
idp.database.provider=dynamodb

# AWS region
idp.database.dynamodb.region=us-east-1

# Optional: Local endpoint for development/testing
idp.database.dynamodb.endpoint=http://localhost:8000

# AWS credentials (via IAM role in production)
# quarkus.dynamodb.aws.credentials.type=default
```

### Environment Variables

Both configurations support environment variable overrides:

```bash
# PostgreSQL
export IDP_DATABASE_PROVIDER=postgresql
export QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://prod-db:5432/idp_db
export QUARKUS_DATASOURCE_PASSWORD=secure_password

# DynamoDB
export IDP_DATABASE_PROVIDER=dynamodb
export IDP_DATABASE_DYNAMODB_REGION=us-west-2
```

## Health Checks

Located in: `com.angryss.idp.infrastructure.persistence.config.DatabaseHealthCheck`

Verifies database connectivity and readiness:

```java
@ApplicationScoped
@Readiness
public class DatabaseHealthCheck implements HealthCheck {
    
    @Inject
    @ConfigProperty(name = "idp.database.provider")
    String databaseProvider;
    
    @Inject
    Instance<StackRepository> stackRepository;
    
    @Override
    public HealthCheckResponse call() {
        try {
            // Simple connectivity check
            stackRepository.get().count();
            
            return HealthCheckResponse.up("database-" + databaseProvider);
        } catch (Exception e) {
            return HealthCheckResponse.down("database-" + databaseProvider)
                .withData("error", e.getMessage())
                .withData("provider", databaseProvider);
        }
    }
}
```

Health check endpoint: `/q/health/ready`

## Migration and Deployment

### Switching Database Providers

To switch from PostgreSQL to DynamoDB:

1. Update configuration property: `idp.database.provider=dynamodb`
2. Add DynamoDB-specific configuration (region, credentials)
3. Remove PostgreSQL-specific configuration
4. Restart application

No code changes required.

### Data Migration

Data migration between providers requires custom tooling (not included in initial implementation):

1. Export data from source database
2. Transform data format if needed
3. Import data to target database
4. Verify data integrity

### Deployment Scenarios

**PostgreSQL Deployment:**
- Docker Compose for local development
- Managed PostgreSQL (RDS, Azure Database) for production
- Flyway migrations run automatically on startup

**DynamoDB Deployment:**
- DynamoDB Local (Docker) for local development
- AWS DynamoDB (managed service) for production
- Tables created automatically on first startup
- IAM role for authentication (no credentials in config)

## Performance Considerations

### PostgreSQL Strengths

- Complex joins across multiple tables
- ACID transactions with strong consistency
- Full-text search capabilities
- Aggregations and analytics queries
- Mature query optimization

### DynamoDB Strengths

- Single-item lookups by primary key (sub-10ms latency)
- Predictable performance at any scale
- Automatic scaling (on-demand mode)
- Simple query patterns via GSIs
- No connection pool management

### Query Pattern Optimization

The repository abstraction allows leveraging each database's strengths:

**PostgreSQL**: Use for complex reporting, analytics, and multi-table joins
**DynamoDB**: Use for high-throughput transactional workloads with simple access patterns

## Security Considerations

### PostgreSQL Security

- Connection credentials via environment variables
- SSL/TLS for connections in production
- Database user with minimal required permissions
- No SQL injection risk (using ORM)
- Connection pooling with HikariCP

### DynamoDB Security

- AWS IAM roles for authentication
- Fine-grained access control via IAM policies
- Encryption at rest (enabled by default)
- Encryption in transit (HTTPS)
- VPC endpoints for private connectivity
- No credentials in application configuration (IAM role)

## Testing Strategy

### Unit Tests

- Mock repository interfaces in service tests
- Test business logic in isolation
- Verify correct repository methods called

### Integration Tests

**PostgreSQL:**
- Use H2 in-memory database
- Test all CRUD operations
- Verify relationship loading
- Test transaction behavior

**DynamoDB:**
- Use DynamoDB Local (Docker container)
- Test all CRUD operations
- Verify GSI queries
- Test pagination and conditional writes

### Cross-Database Consistency Tests

Parameterized tests that run against both implementations:

```java
@ParameterizedTest
@ValueSource(strings = {"postgresql", "dynamodb"})
void testStackCrudOperations(String provider) {
    // Test runs against both implementations
    // Verifies identical behavior
}
```

## Troubleshooting

### Common Issues

**Issue**: Application fails to start with "No qualifying bean"
**Solution**: Verify `idp.database.provider` is set correctly

**Issue**: PostgreSQL connection refused
**Solution**: Check database URL, credentials, and network connectivity

**Issue**: DynamoDB table not found
**Solution**: Verify table initialization completed, check CloudWatch logs

**Issue**: Health check fails
**Solution**: Check database connectivity, verify credentials/IAM role

### Logging

Enable debug logging for troubleshooting:

```properties
quarkus.log.category."com.angryss.idp.infrastructure.persistence".level=DEBUG
```

## Future Enhancements

1. **Additional Database Support**: MongoDB, Cassandra, MySQL
2. **Caching Layer**: Redis for frequently accessed data
3. **Read Replicas**: Separate read/write repositories for scaling
4. **Event Sourcing**: Audit trail of all entity changes
5. **Multi-tenancy**: Partition data by tenant in DynamoDB
6. **Data Migration Tools**: Utilities to migrate data between providers
7. **Query Performance Monitoring**: Metrics and tracing for database operations

## References

- [Quarkus Hibernate ORM Guide](https://quarkus.io/guides/hibernate-orm)
- [AWS SDK for Java 2.x](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
