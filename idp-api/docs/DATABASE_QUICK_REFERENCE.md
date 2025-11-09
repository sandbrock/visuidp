# Database Architecture Quick Reference

This is a quick reference guide for developers working with the multi-database support feature.

## Quick Start

### Using PostgreSQL (Default)

```properties
# application.properties
idp.database.provider=postgresql
quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/idp_db
quarkus.datasource.username=idp_user
quarkus.datasource.password=idp_password
```

### Using DynamoDB

```properties
# application.properties
idp.database.provider=dynamodb
idp.database.dynamodb.region=us-east-1
# Optional for local development:
idp.database.dynamodb.endpoint=http://localhost:8000
```

## Writing Code with Repositories

### Inject Repository in Service

```java
@ApplicationScoped
public class StackService {
    
    @Inject
    StackRepository stackRepository;  // Correct implementation injected automatically
    
    @Transactional
    public StackResponseDto createStack(StackCreateDto createDto, String createdBy) {
        Stack stack = new Stack();
        // ... populate stack
        stack = stackRepository.save(stack);
        return stackMapper.toResponseDto(stack);
    }
}
```

### Common Repository Operations

```java
// Create or Update
Stack saved = stackRepository.save(stack);

// Find by ID
Optional<Stack> stack = stackRepository.findById(id);

// Find all
List<Stack> allStacks = stackRepository.findAll();

// Custom queries
List<Stack> userStacks = stackRepository.findByCreatedBy(username);
List<Stack> teamStacks = stackRepository.findByTeamId(teamId);

// Check existence
boolean exists = stackRepository.existsByNameAndCreatedBy(name, user);

// Count
long total = stackRepository.count();

// Delete
stackRepository.delete(stack);
```

## Creating a New Repository

### 1. Define Repository Interface

```java
package com.angryss.idp.domain.repositories;

public interface MyEntityRepository extends Repository<MyEntity, UUID> {
    // Add entity-specific query methods
    List<MyEntity> findByStatus(String status);
    Optional<MyEntity> findByName(String name);
}
```

### 2. Implement PostgreSQL Repository

```java
package com.angryss.idp.infrastructure.persistence.postgresql;

@ApplicationScoped
@Named("postgresql")
@ConditionalOnProperty(name = "idp.database.provider", stringValue = "postgresql")
public class PostgresMyEntityRepository implements MyEntityRepository {
    
    @Override
    @Transactional
    public MyEntity save(MyEntity entity) {
        if (entity.getId() == null) {
            entity.setId(UUID.randomUUID());
        }
        entity.persist();
        return entity;
    }
    
    @Override
    public Optional<MyEntity> findById(UUID id) {
        return Optional.ofNullable(MyEntity.findById(id));
    }
    
    @Override
    public List<MyEntity> findByStatus(String status) {
        return MyEntity.list("status", status);
    }
}
```

### 3. Implement DynamoDB Repository

```java
package com.angryss.idp.infrastructure.persistence.dynamodb;

@ApplicationScoped
@Named("dynamodb")
@ConditionalOnProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoMyEntityRepository implements MyEntityRepository {
    
    @Inject
    DynamoDbClient dynamoDbClient;
    
    @Inject
    DynamoEntityMapper entityMapper;
    
    private static final String TABLE_NAME = "idp_my_entities";
    
    @Override
    public MyEntity save(MyEntity entity) {
        if (entity.getId() == null) {
            entity.setId(UUID.randomUUID());
        }
        
        Map<String, AttributeValue> item = entityMapper.myEntityToItem(entity);
        
        PutItemRequest request = PutItemRequest.builder()
            .tableName(TABLE_NAME)
            .item(item)
            .build();
            
        dynamoDbClient.putItem(request);
        return entity;
    }
    
    @Override
    public Optional<MyEntity> findById(UUID id) {
        GetItemRequest request = GetItemRequest.builder()
            .tableName(TABLE_NAME)
            .key(Map.of("id", AttributeValue.builder().s(id.toString()).build()))
            .build();
            
        GetItemResponse response = dynamoDbClient.getItem(request);
        
        if (!response.hasItem()) {
            return Optional.empty();
        }
        
        return Optional.of(entityMapper.itemToMyEntity(response.item()));
    }
    
    @Override
    public List<MyEntity> findByStatus(String status) {
        // Use GSI for efficient querying
        QueryRequest request = QueryRequest.builder()
            .tableName(TABLE_NAME)
            .indexName("status-index")
            .keyConditionExpression("status = :status")
            .expressionAttributeValues(Map.of(
                ":status", AttributeValue.builder().s(status).build()
            ))
            .build();
            
        QueryResponse response = dynamoDbClient.query(request);
        
        return response.items().stream()
            .map(entityMapper::itemToMyEntity)
            .collect(Collectors.toList());
    }
}
```

### 4. Add Entity Mapper Methods (DynamoDB)

```java
// In DynamoEntityMapper class
public Map<String, AttributeValue> myEntityToItem(MyEntity entity) {
    Map<String, AttributeValue> item = new HashMap<>();
    
    item.put("id", AttributeValue.builder().s(entity.getId().toString()).build());
    item.put("name", AttributeValue.builder().s(entity.getName()).build());
    item.put("status", AttributeValue.builder().s(entity.getStatus()).build());
    
    // Handle optional fields
    if (entity.getDescription() != null) {
        item.put("description", AttributeValue.builder().s(entity.getDescription()).build());
    }
    
    return item;
}

public MyEntity itemToMyEntity(Map<String, AttributeValue> item) {
    MyEntity entity = new MyEntity();
    
    entity.setId(UUID.fromString(item.get("id").s()));
    entity.setName(item.get("name").s());
    entity.setStatus(item.get("status").s());
    
    if (item.containsKey("description")) {
        entity.setDescription(item.get("description").s());
    }
    
    return entity;
}
```

## Testing

### Unit Test with Mocked Repository

```java
@QuarkusTest
class MyServiceTest {
    
    @InjectMock
    MyEntityRepository repository;
    
    @Inject
    MyService service;
    
    @Test
    void testCreateEntity() {
        MyEntity entity = new MyEntity();
        entity.setId(UUID.randomUUID());
        
        when(repository.save(any())).thenReturn(entity);
        
        MyEntityDto result = service.createEntity(new MyEntityCreateDto());
        
        assertNotNull(result);
        verify(repository).save(any());
    }
}
```

### Integration Test (PostgreSQL)

```java
@QuarkusTest
@TestProfile(PostgresTestProfile.class)
class PostgresMyEntityRepositoryTest {
    
    @Inject
    MyEntityRepository repository;
    
    @Test
    @Transactional
    void testSaveAndFind() {
        MyEntity entity = new MyEntity();
        entity.setName("Test");
        
        MyEntity saved = repository.save(entity);
        assertNotNull(saved.getId());
        
        Optional<MyEntity> found = repository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("Test", found.get().getName());
    }
}
```

### Integration Test (DynamoDB)

```java
@QuarkusTest
@TestProfile(DynamoDbTestProfile.class)
class DynamoMyEntityRepositoryTest {
    
    @Inject
    MyEntityRepository repository;
    
    @BeforeEach
    void setup() {
        // DynamoDB Local should be running
        // Tables created automatically
    }
    
    @Test
    void testSaveAndFind() {
        MyEntity entity = new MyEntity();
        entity.setName("Test");
        
        MyEntity saved = repository.save(entity);
        assertNotNull(saved.getId());
        
        Optional<MyEntity> found = repository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("Test", found.get().getName());
    }
}
```

## Common Patterns

### Handling Relationships

**PostgreSQL**: Relationships loaded automatically by Hibernate
```java
Stack stack = stackRepository.findById(id).orElseThrow();
Team team = stack.getTeam();  // Loaded automatically (if eager) or on access (if lazy)
```

**DynamoDB**: Relationships loaded explicitly
```java
Stack stack = stackRepository.findById(id).orElseThrow();
UUID teamId = stack.getTeamId();  // Foreign key stored as UUID
Team team = teamRepository.findById(teamId).orElseThrow();  // Explicit load
```

### Batch Operations

**PostgreSQL**:
```java
@Transactional
public void saveMultiple(List<Stack> stacks) {
    stacks.forEach(stackRepository::save);
    // All saved in single transaction
}
```

**DynamoDB**:
```java
public void saveMultiple(List<Stack> stacks) {
    // Use BatchWriteItem for efficiency
    List<WriteRequest> requests = stacks.stream()
        .map(stack -> {
            Map<String, AttributeValue> item = entityMapper.stackToItem(stack);
            return WriteRequest.builder()
                .putRequest(PutRequest.builder().item(item).build())
                .build();
        })
        .collect(Collectors.toList());
    
    BatchWriteItemRequest request = BatchWriteItemRequest.builder()
        .requestItems(Map.of(TABLE_NAME, requests))
        .build();
        
    dynamoDbClient.batchWriteItem(request);
}
```

### Transactions

**PostgreSQL**:
```java
@Transactional
public void updateMultipleEntities() {
    Stack stack = stackRepository.findById(id).orElseThrow();
    stack.setName("Updated");
    stackRepository.save(stack);
    
    Team team = teamRepository.findById(teamId).orElseThrow();
    team.setName("Updated");
    teamRepository.save(team);
    
    // Both saved in single transaction
    // Automatic rollback on exception
}
```

**DynamoDB**:
```java
public void updateMultipleEntities() {
    Stack stack = stackRepository.findById(id).orElseThrow();
    stack.setName("Updated");
    
    Team team = teamRepository.findById(teamId).orElseThrow();
    team.setName("Updated");
    
    // Use transaction manager
    List<TransactWriteItem> items = List.of(
        TransactWriteItem.builder()
            .put(Put.builder()
                .tableName("idp_stacks")
                .item(entityMapper.stackToItem(stack))
                .build())
            .build(),
        TransactWriteItem.builder()
            .put(Put.builder()
                .tableName("idp_teams")
                .item(entityMapper.teamToItem(team))
                .build())
            .build()
    );
    
    transactionManager.executeTransaction(items);
}
```

## Troubleshooting

### Issue: "No qualifying bean found"

**Cause**: `idp.database.provider` not set or set incorrectly

**Solution**:
```properties
# Ensure this is set in application.properties
idp.database.provider=postgresql  # or dynamodb
```

### Issue: PostgreSQL connection refused

**Cause**: Database not running or incorrect connection details

**Solution**:
```bash
# Check if PostgreSQL is running
docker compose ps

# Verify connection details
echo $QUARKUS_DATASOURCE_JDBC_URL
```

### Issue: DynamoDB table not found

**Cause**: Tables not created or initialization failed

**Solution**:
```bash
# Check application logs for table creation
# Verify DynamoDB Local is running (for local dev)
docker ps | grep dynamodb

# Check AWS credentials (for production)
aws sts get-caller-identity
```

### Issue: Health check fails

**Cause**: Database connectivity issue

**Solution**:
```bash
# Check health endpoint
curl http://localhost:8082/q/health/ready

# Check logs for specific error
tail -f logs/application.log | grep -i database
```

## Performance Tips

### PostgreSQL

- Use indexes for frequently queried columns
- Use `@BatchSize` for relationship loading
- Enable query logging to identify slow queries
- Use connection pooling (configured by default)

### DynamoDB

- Design GSIs for common query patterns
- Use batch operations for multiple items
- Avoid Scan operations (use Query with GSI)
- Consider on-demand billing for variable workloads
- Use projection expressions to fetch only needed attributes

## Configuration Reference

### PostgreSQL Configuration

```properties
# Database provider
idp.database.provider=postgresql

# Connection
quarkus.datasource.db-kind=postgresql
quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/idp_db
quarkus.datasource.username=idp_user
quarkus.datasource.password=${DB_PASSWORD}

# Connection pool
quarkus.datasource.jdbc.min-size=5
quarkus.datasource.jdbc.max-size=20

# Flyway
quarkus.flyway.migrate-at-start=true
quarkus.flyway.locations=classpath:db/migration

# Hibernate
quarkus.hibernate-orm.log.sql=false
quarkus.hibernate-orm.database.generation=none
```

### DynamoDB Configuration

```properties
# Database provider
idp.database.provider=dynamodb

# AWS region
idp.database.dynamodb.region=us-east-1

# Local development (optional)
idp.database.dynamodb.endpoint=http://localhost:8000

# AWS credentials (use IAM role in production)
# quarkus.dynamodb.aws.credentials.type=default
```

## Additional Resources

- [Full Database Architecture Documentation](DATABASE_ARCHITECTURE.md)
- [Architecture Diagrams](DATABASE_ARCHITECTURE_DIAGRAMS.md)
- [Database Configuration Guide](DATABASE_CONFIGURATION.md)
- [Quarkus Hibernate ORM Guide](https://quarkus.io/guides/hibernate-orm)
- [AWS SDK for Java Documentation](https://docs.aws.amazon.com/sdk-for-java/)
