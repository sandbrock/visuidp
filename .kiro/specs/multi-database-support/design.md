# Multi-Database Support Design

## Overview

This design introduces a pluggable database abstraction layer to the IDP API, enabling support for both PostgreSQL (relational) and DynamoDB (NoSQL) backends. The implementation follows the Repository pattern to decouple business logic from data persistence concerns, allowing installers to choose their preferred database through configuration.

The design maintains the existing Clean Architecture structure while introducing a new infrastructure component that provides database-agnostic data access. All 16 existing entities will be supported through unified repository interfaces.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│                  (REST Controllers)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Application Layer                          │
│              (Use Case Services + DTOs)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     Domain Layer                             │
│         (Entities, Value Objects, Domain Services)           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Repository Interfaces (New)                     │
│    StackRepository, BlueprintRepository, TeamRepository...   │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼────────┐            ┌────────▼────────┐
│   PostgreSQL    │            │    DynamoDB     │
│ Implementation  │            │ Implementation  │
│  (Hibernate)    │            │   (AWS SDK)     │
└─────────────────┘            └─────────────────┘
```

### Configuration-Driven Selection

The database provider is selected at application startup via a configuration property:

```properties
idp.database.provider=postgresql  # or dynamodb
```

Quarkus CDI will inject the appropriate repository implementation based on this configuration using `@Named` qualifiers and conditional bean creation.

## Components and Interfaces

### 1. Repository Interface Layer

Located in: `com.angryss.idp.domain.repositories`

Each entity will have a corresponding repository interface defining standard operations:

```java
public interface StackRepository {
    Stack save(Stack stack);
    Optional<Stack> findById(UUID id);
    List<Stack> findAll();
    List<Stack> findByCreatedBy(String createdBy);
    List<Stack> findByStackType(StackType stackType);
    List<Stack> findByTeamId(UUID teamId);
    List<Stack> findByCloudProviderId(UUID cloudProviderId);
    boolean existsByNameAndCreatedBy(String name, String createdBy);
    void delete(Stack stack);
    long count();
}
```

Similar interfaces will be created for all 16 entities:
- StackRepository
- BlueprintRepository
- TeamRepository
- CloudProviderRepository
- ResourceTypeRepository
- PropertySchemaRepository
- ApiKeyRepository
- AdminAuditLogRepository
- BlueprintResourceRepository
- CategoryRepository
- DomainRepository
- EnvironmentConfigRepository
- EnvironmentEntityRepository
- ResourceTypeCloudMappingRepository
- StackCollectionRepository
- StackResourceRepository

### 2. PostgreSQL Implementation

Located in: `com.angryss.idp.infrastructure.persistence.postgresql`

Implements repository interfaces using Hibernate ORM and Panache patterns:

```java
@ApplicationScoped
@Named("postgresql")
@ConditionalOnProperty(name = "idp.database.provider", stringValue = "postgresql")
public class PostgresStackRepository implements StackRepository {
    
    @Override
    @Transactional
    public Stack save(Stack stack) {
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
    
    // Additional query methods...
}
```

**Key characteristics:**
- Entities continue to extend `PanacheEntityBase`
- JPA annotations remain on entities
- Hibernate manages relationships and JSONB columns
- Flyway handles schema migrations
- Transactions managed via `@Transactional`

### 3. DynamoDB Implementation

Located in: `com.angryss.idp.infrastructure.persistence.dynamodb`

Implements repository interfaces using AWS SDK v2:

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
    
    // Additional query methods using Query/Scan operations...
}
```

**Key characteristics:**
- Entities become POJOs (no JPA annotations used at runtime)
- Table names follow pattern: `idp_{entity_name_plural}`
- Primary key: `id` (String representation of UUID)
- GSIs (Global Secondary Indexes) for common queries
- Complex objects stored as nested Maps
- Relationships stored as foreign key UUIDs

### 4. Entity Mapper

Located in: `com.angryss.idp.infrastructure.persistence.dynamodb.mapper`

Handles conversion between domain entities and DynamoDB items:

```java
@ApplicationScoped
public class DynamoEntityMapper {
    
    public Map<String, AttributeValue> stackToItem(Stack stack) {
        Map<String, AttributeValue> item = new HashMap<>();
        
        item.put("id", AttributeValue.builder().s(stack.getId().toString()).build());
        item.put("name", AttributeValue.builder().s(stack.getName()).build());
        item.put("stackType", AttributeValue.builder().s(stack.getStackType().name()).build());
        item.put("createdBy", AttributeValue.builder().s(stack.getCreatedBy()).build());
        item.put("createdAt", AttributeValue.builder().s(stack.getCreatedAt().toString()).build());
        
        // Handle optional fields
        if (stack.getDescription() != null) {
            item.put("description", AttributeValue.builder().s(stack.getDescription()).build());
        }
        
        // Handle relationships (store foreign keys)
        if (stack.getTeam() != null) {
            item.put("teamId", AttributeValue.builder().s(stack.getTeam().getId().toString()).build());
        }
        
        // Handle JSONB/Map fields
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
        
        // Handle optional fields
        if (item.containsKey("description")) {
            stack.setDescription(item.get("description").s());
        }
        
        // Note: Relationships are lazy-loaded separately
        // The repository will handle loading related entities when needed
        
        // Handle Map fields
        if (item.containsKey("configuration")) {
            stack.setConfiguration(attributeValueToMap(item.get("configuration")));
        }
        
        return stack;
    }
    
    private AttributeValue mapToAttributeValue(Map<String, Object> map) {
        // Convert Java Map to DynamoDB Map attribute
        // Handle nested structures recursively
    }
    
    private Map<String, Object> attributeValueToMap(AttributeValue av) {
        // Convert DynamoDB Map attribute to Java Map
        // Handle nested structures recursively
    }
}
```

### 5. Database Provider Configuration

Located in: `com.angryss.idp.infrastructure.persistence.config`

```java
@ApplicationScoped
public class DatabaseProviderConfig {
    
    @ConfigProperty(name = "idp.database.provider")
    String databaseProvider;
    
    @ConfigProperty(name = "idp.database.dynamodb.region", defaultValue = "us-east-1")
    Optional<String> dynamoDbRegion;
    
    @ConfigProperty(name = "idp.database.dynamodb.endpoint")
    Optional<String> dynamoDbEndpoint;  // For local testing
    
    @Produces
    @ApplicationScoped
    public DynamoDbClient dynamoDbClient() {
        if (!"dynamodb".equals(databaseProvider)) {
            return null;
        }
        
        DynamoDbClientBuilder builder = DynamoDbClient.builder()
            .region(Region.of(dynamoDbRegion.orElse("us-east-1")));
        
        // Use custom endpoint for local testing (DynamoDB Local)
        dynamoDbEndpoint.ifPresent(endpoint -> 
            builder.endpointOverride(URI.create(endpoint))
        );
        
        return builder.build();
    }
    
    @Observes
    StartupEvent event void onStart() {
        log.info("Database provider: {}", databaseProvider);
        
        if ("dynamodb".equals(databaseProvider)) {
            initializeDynamoDbTables();
        }
    }
    
    private void initializeDynamoDbTables() {
        // Create tables if they don't exist
        // Create GSIs for common query patterns
    }
}
```

### 6. Repository Injection

Application services will inject repositories using qualifiers:

```java
@ApplicationScoped
public class StackService {
    
    @Inject
    @ConfigProperty(name = "idp.database.provider")
    String databaseProvider;
    
    @Inject
    @Named("postgresql")
    Instance<StackRepository> postgresRepo;
    
    @Inject
    @Named("dynamodb")
    Instance<StackRepository> dynamoRepo;
    
    private StackRepository stackRepository;
    
    @PostConstruct
    void init() {
        stackRepository = "postgresql".equals(databaseProvider) 
            ? postgresRepo.get() 
            : dynamoRepo.get();
    }
    
    @Transactional
    public StackResponseDto createStack(StackCreateDto createDto, String createdBy) {
        // Business logic remains unchanged
        Stack stack = new Stack(...);
        stack = stackRepository.save(stack);
        return stackMapper.toResponseDto(stack);
    }
}
```

## Data Models

### DynamoDB Table Design

Each entity gets its own table following this pattern:

**Table: idp_stacks**
- Primary Key: `id` (String, UUID)
- GSI1: `createdBy-createdAt-index` (for user queries)
- GSI2: `stackType-createdAt-index` (for type queries)
- GSI3: `teamId-createdAt-index` (for team queries)

**Table: idp_blueprints**
- Primary Key: `id` (String, UUID)
- GSI1: `name-index` (for unique name lookups)
- GSI2: `isActive-createdAt-index` (for active blueprint queries)

**Table: idp_teams**
- Primary Key: `id` (String, UUID)
- GSI1: `name-index` (for unique name lookups)

**Relationship Handling:**
- One-to-Many: Store foreign key UUID in child items
- Many-to-Many: Create junction table (e.g., `idp_blueprint_cloud_providers`)
- Lazy loading: Relationships loaded on-demand via separate queries

**JSONB/Map Fields:**
- Stored as DynamoDB Map attributes
- Nested structures preserved
- No schema validation at database level (handled in application)

### PostgreSQL Schema

Existing Flyway migrations remain unchanged. The PostgreSQL implementation continues to use:
- JPA entities with `@Entity` annotations
- Hibernate ORM for relationship management
- JSONB columns for flexible configuration data
- Foreign key constraints for referential integrity

## Error Handling

### Configuration Validation

At startup, the application validates:
1. `idp.database.provider` is set to valid value (postgresql/dynamodb)
2. Required configuration for selected provider is present
3. Database connectivity can be established
4. Required tables/structures exist

If validation fails, the application fails fast with descriptive error messages.

### Runtime Error Handling

**PostgreSQL:**
- Database exceptions wrapped in `PersistenceException`
- Transaction rollback on failure
- Constraint violations mapped to business exceptions

**DynamoDB:**
- AWS SDK exceptions wrapped in `PersistenceException`
- Conditional writes for optimistic locking
- Provisioned throughput exceptions handled with retry logic
- Item size limits (400KB) validated before writes

### Health Checks

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
            // Perform simple query to verify connectivity
            stackRepository.get().count();
            
            return HealthCheckResponse.up("database-" + databaseProvider);
        } catch (Exception e) {
            return HealthCheckResponse.down("database-" + databaseProvider)
                .withData("error", e.getMessage());
        }
    }
}
```

## Testing Strategy

### Unit Tests

**Repository Interface Tests:**
- Mock repository implementations
- Test business logic in isolation
- Verify correct repository methods are called

**Mapper Tests:**
- Test entity-to-item conversion
- Test item-to-entity conversion
- Verify handling of null/optional fields
- Verify nested Map conversion

### Integration Tests

**PostgreSQL Integration Tests:**
- Use H2 in-memory database (existing approach)
- Test all CRUD operations
- Verify relationship loading
- Test transaction behavior
- Verify Flyway migrations

**DynamoDB Integration Tests:**
- Use DynamoDB Local (Docker container)
- Test all CRUD operations
- Verify GSI queries
- Test pagination for large result sets
- Verify conditional writes

**Cross-Database Consistency Tests:**
- Parameterized tests that run against both implementations
- Verify identical behavior for standard operations
- Compare query results
- Verify transaction semantics

### Test Configuration

```properties
# Test profile for PostgreSQL
%test.idp.database.provider=postgresql
%test.quarkus.datasource.db-kind=h2

# Test profile for DynamoDB
%test-dynamodb.idp.database.provider=dynamodb
%test-dynamodb.idp.database.dynamodb.endpoint=http://localhost:8000
```

### Test Structure

```
src/test/java/
├── com/angryss/idp/
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── postgresql/
│   │   │   │   └── PostgresStackRepositoryTest.java
│   │   │   ├── dynamodb/
│   │   │   │   ├── DynamoStackRepositoryTest.java
│   │   │   │   └── DynamoEntityMapperTest.java
│   │   │   └── RepositoryContractTest.java  // Tests both implementations
│   ├── application/
│   │   └── usecases/
│   │       └── StackServiceTest.java  // Uses mocked repositories
```

## Migration Path

### Phase 1: Repository Abstraction (No Breaking Changes)
1. Create repository interfaces
2. Implement PostgreSQL repositories (delegate to existing Panache methods)
3. Update services to use repositories instead of direct entity access
4. Verify all existing tests pass

### Phase 2: DynamoDB Implementation
1. Add DynamoDB dependencies
2. Implement DynamoDB repositories
3. Implement entity mappers
4. Create table initialization logic
5. Add DynamoDB integration tests

### Phase 3: Configuration & Deployment
1. Add configuration properties
2. Implement conditional bean creation
3. Add health checks
4. Update documentation
5. Test deployment scenarios

### Backward Compatibility

- Existing PostgreSQL deployments continue to work without changes
- Default configuration remains PostgreSQL
- No changes to REST API contracts
- No changes to domain entities (JPA annotations remain but are ignored when using DynamoDB)

## Performance Considerations

### PostgreSQL
- Connection pooling (existing configuration)
- Query optimization via indexes (existing migrations)
- Batch operations for bulk inserts
- Lazy loading for relationships

### DynamoDB
- Provisioned capacity planning (WCU/RCU)
- GSI design for common query patterns
- Batch operations (BatchGetItem, BatchWriteItem)
- Pagination for large result sets
- Caching layer for frequently accessed data (future enhancement)

### Query Pattern Optimization

**PostgreSQL strengths:**
- Complex joins across multiple tables
- ACID transactions
- Full-text search
- Aggregations and analytics

**DynamoDB strengths:**
- Single-item lookups by primary key
- Predictable latency at scale
- Automatic scaling
- Simple query patterns

The repository abstraction allows the application to leverage the strengths of each database while maintaining a consistent interface.

## Security Considerations

### PostgreSQL
- Connection credentials via environment variables
- SSL/TLS for connections in production
- Database user with minimal required permissions
- No direct SQL injection risk (using ORM)

### DynamoDB
- AWS IAM roles for authentication
- Fine-grained access control via IAM policies
- Encryption at rest (enabled by default)
- Encryption in transit (HTTPS)
- VPC endpoints for private connectivity

### Configuration Security
- Sensitive configuration stored in environment variables
- No credentials in application.properties
- Support for external secret management (AWS Secrets Manager, HashiCorp Vault)

## Deployment Considerations

### PostgreSQL Deployment
- Existing Docker Compose setup continues to work
- Kubernetes deployments use external PostgreSQL service
- Flyway migrations run automatically on startup

### DynamoDB Deployment
- AWS-hosted DynamoDB (managed service)
- No schema migrations required
- Tables created automatically on first startup
- IAM role attached to ECS task or EC2 instance
- DynamoDB Local for local development

### Configuration Examples

**PostgreSQL (existing):**
```properties
idp.database.provider=postgresql
quarkus.datasource.db-kind=postgresql
quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/idp_db
quarkus.datasource.username=idp_user
quarkus.datasource.password=idp_password
```

**DynamoDB:**
```properties
idp.database.provider=dynamodb
idp.database.dynamodb.region=us-east-1
# Optional: for local development
idp.database.dynamodb.endpoint=http://localhost:8000
```

## Future Enhancements

1. **Additional Database Support**: MongoDB, Cassandra
2. **Caching Layer**: Redis for frequently accessed data
3. **Read Replicas**: Separate read/write repositories for scaling
4. **Event Sourcing**: Audit trail of all entity changes
5. **Multi-tenancy**: Partition data by tenant in DynamoDB
6. **Data Migration Tools**: Utilities to migrate data between database providers
