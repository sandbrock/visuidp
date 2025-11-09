# DynamoDB Testing Guide

This guide explains how to run integration tests against DynamoDB Local for the multi-database support feature.

## Overview

The IDP API supports both PostgreSQL and DynamoDB as database backends. To ensure both implementations work correctly, we have integration tests that run against DynamoDB Local, a local version of DynamoDB that runs in Docker.

## Prerequisites

- Docker and Docker Compose installed
- Maven 3.8+ installed
- Java 21 installed

## Quick Start

### 1. Start DynamoDB Local

```bash
# From the idp-api directory
docker compose up -d dynamodb-local
```

Or use the helper script:

```bash
./scripts/start-dynamodb-local.sh
```

### 2. Run DynamoDB Tests

```bash
# Run all DynamoDB tests
./mvnw test -Dtest="*Dynamo*Test"

# Run a specific test class
./mvnw test -Dtest=DynamoStackRepositoryTest

# Run with verbose logging
./mvnw test -Dtest="*Dynamo*Test" -Dquarkus.log.category."com.angryss.idp".level=DEBUG
```

### 3. Stop DynamoDB Local

```bash
docker compose stop dynamodb-local
```

## DynamoDB Local Configuration

DynamoDB Local is configured in `docker-compose.yml`:

```yaml
dynamodb-local:
  image: amazon/dynamodb-local:latest
  container_name: idp-dynamodb-local
  command: "-jar DynamoDBLocal.jar -sharedDb -inMemory"
  ports:
    - "8000:8000"
```

Key configuration options:
- `-sharedDb`: Uses a single database file for all credentials and regions
- `-inMemory`: Runs entirely in memory (faster, but data is lost on restart)
- Port `8000`: Standard DynamoDB Local port

## Test Configuration

### Test Profile

DynamoDB tests use a dedicated test profile configured in:
- `src/test/resources/application-test-dynamodb.properties`
- `DynamoDbTestProfile.java`

Key configuration properties:

```properties
idp.database.provider=dynamodb
idp.database.dynamodb.region=us-east-1
idp.database.dynamodb.endpoint=http://localhost:8000
idp.database.dynamodb.table-prefix=test_idp
```

### Using the Test Profile

There are two ways to use the DynamoDB test profile:

#### Option 1: Extend DynamoDbTestBase (Recommended)

```java
public class DynamoStackRepositoryTest extends DynamoDbTestBase {
    
    @Inject
    StackRepository stackRepository;
    
    @Test
    public void testSaveAndFindById() {
        // Test implementation
        // DynamoDB client available via this.dynamoDbClient
        // Test data automatically cleaned up before each test
    }
}
```

#### Option 2: Use @TestProfile Annotation

```java
@QuarkusTest
@TestProfile(DynamoDbTestProfile.class)
public class DynamoStackRepositoryTest {
    
    @Inject
    DynamoDbClient dynamoDbClient;
    
    @Inject
    StackRepository stackRepository;
    
    @Test
    public void testSaveAndFindById() {
        // Test implementation
    }
}
```

## Writing DynamoDB Tests

### Test Structure

DynamoDB integration tests should follow this structure:

```java
public class DynamoEntityRepositoryTest extends DynamoDbTestBase {
    
    @Inject
    EntityRepository repository;
    
    @Test
    public void testCrudOperations() {
        // 1. Create entity
        Entity entity = new Entity();
        entity.setName("Test");
        
        // 2. Save entity
        Entity saved = repository.save(entity);
        assertNotNull(saved.getId());
        
        // 3. Find entity
        Optional<Entity> found = repository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("Test", found.get().getName());
        
        // 4. Update entity
        found.get().setName("Updated");
        repository.save(found.get());
        
        // 5. Verify update
        Optional<Entity> updated = repository.findById(saved.getId());
        assertEquals("Updated", updated.get().getName());
        
        // 6. Delete entity
        repository.delete(updated.get());
        
        // 7. Verify deletion
        Optional<Entity> deleted = repository.findById(saved.getId());
        assertFalse(deleted.isPresent());
    }
}
```

### Test Isolation

Each test extending `DynamoDbTestBase` automatically cleans up test data before each test method using the `@BeforeEach` hook. This ensures:
- Tests don't interfere with each other
- Each test starts with a clean state
- No manual cleanup is required

### Testing Query Operations

When testing query operations (e.g., findByCreatedBy, findByStackType), ensure:

1. Create multiple test entities with different attributes
2. Execute the query
3. Verify the correct entities are returned
4. Verify entities that shouldn't match are excluded

Example:

```java
@Test
public void testFindByCreatedBy() {
    // Create entities with different creators
    Stack stack1 = createStack("stack1", "user1");
    Stack stack2 = createStack("stack2", "user1");
    Stack stack3 = createStack("stack3", "user2");
    
    repository.save(stack1);
    repository.save(stack2);
    repository.save(stack3);
    
    // Query by creator
    List<Stack> user1Stacks = repository.findByCreatedBy("user1");
    
    // Verify results
    assertEquals(2, user1Stacks.size());
    assertTrue(user1Stacks.stream().allMatch(s -> s.getCreatedBy().equals("user1")));
}
```

## Comparing PostgreSQL and DynamoDB Tests

To ensure consistency between implementations, consider:

### 1. Shared Test Data

Create helper methods to generate test data that works with both implementations:

```java
protected Stack createTestStack(String name, String createdBy) {
    Stack stack = new Stack();
    stack.setName(name);
    stack.setCreatedBy(createdBy);
    stack.setStackType(StackType.INFRASTRUCTURE);
    stack.setCreatedAt(LocalDateTime.now());
    return stack;
}
```

### 2. Shared Assertions

Use the same assertions for both implementations:

```java
protected void assertStackEquals(Stack expected, Stack actual) {
    assertEquals(expected.getName(), actual.getName());
    assertEquals(expected.getCreatedBy(), actual.getCreatedBy());
    assertEquals(expected.getStackType(), actual.getStackType());
    // ... other assertions
}
```

### 3. Parameterized Tests

Consider creating parameterized tests that run against both implementations:

```java
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class RepositoryContractTest {
    
    @ParameterizedTest
    @MethodSource("repositoryImplementations")
    public void testSaveAndFindById(StackRepository repository) {
        // Test implementation that works with both
    }
    
    private Stream<StackRepository> repositoryImplementations() {
        // Return both PostgreSQL and DynamoDB implementations
    }
}
```

## Troubleshooting

### DynamoDB Local Not Running

**Symptom**: Tests fail with connection errors

**Solution**:
```bash
# Check if DynamoDB Local is running
docker compose ps dynamodb-local

# If not running, start it
docker compose up -d dynamodb-local

# Check logs
docker compose logs dynamodb-local
```

### Port 8000 Already in Use

**Symptom**: DynamoDB Local fails to start

**Solution**: Change the port in `docker-compose.yml`:

```yaml
dynamodb-local:
  ports:
    - "8001:8000"  # Use port 8001 instead
```

Then update test configuration:

```properties
idp.database.dynamodb.endpoint=http://localhost:8001
```

### Tables Not Being Created

**Symptom**: Tests fail because tables don't exist

**Solution**: Verify that:
1. The database provider is set to `dynamodb` in the test profile
2. The `DatabaseProviderConfig` startup observer is triggered
3. Check logs for table creation errors:

```bash
./mvnw test -Dtest=DynamoDbLocalConnectionTest -Dquarkus.log.category."com.angryss.idp".level=DEBUG
```

### Tests Are Slow

**Symptom**: DynamoDB tests take a long time to run

**Solution**:
1. Ensure DynamoDB Local is using `-inMemory` flag (check docker-compose.yml)
2. Reduce test data volume
3. Consider running tests in parallel:

```bash
./mvnw test -Dtest="*Dynamo*Test" -DforkCount=2
```

### Cleanup Issues

**Symptom**: Tests fail due to leftover data from previous tests

**Solution**:
1. Ensure your test extends `DynamoDbTestBase` for automatic cleanup
2. Manually clean up in `@AfterEach` if needed:

```java
@AfterEach
public void cleanup() {
    deleteAllItemsFromTable("test_idp_stacks");
}
```

## Best Practices

### 1. Use Descriptive Test Names

```java
@Test
public void testSaveStack_WithAllFields_ShouldPersistSuccessfully() {
    // Test implementation
}
```

### 2. Test Edge Cases

- Null values
- Empty strings
- Large data sets
- Concurrent operations
- Transaction rollbacks

### 3. Verify GSI Queries

When testing queries that use Global Secondary Indexes:

```java
@Test
public void testFindByStackType_UsesGSI_ReturnsCorrectResults() {
    // Create test data
    // Execute query
    // Verify results
    // Verify GSI was used (check logs if needed)
}
```

### 4. Test Relationship Loading

Verify that relationships are loaded correctly:

```java
@Test
public void testFindById_LoadsRelationships_Successfully() {
    // Create entity with relationships
    // Save entity
    // Load entity
    // Verify relationships are loaded
}
```

### 5. Test Transaction Behavior

Verify transaction semantics:

```java
@Test
public void testTransaction_RollsBackOnError() {
    // Start transaction
    // Perform operations
    // Trigger error
    // Verify rollback occurred
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: DynamoDB Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      dynamodb-local:
        image: amazon/dynamodb-local:latest
        ports:
          - 8000:8000
        options: >-
          --health-cmd "curl -f http://localhost:8000/ || exit 1"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 21
        uses: actions/setup-java@v3
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Run DynamoDB Tests
        run: ./mvnw test -Dtest="*Dynamo*Test"
```

## Additional Resources

- [DynamoDB Local Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- [AWS SDK for Java Documentation](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/home.html)
- [Quarkus Testing Guide](https://quarkus.io/guides/getting-started-testing)
- [Multi-Database Support Design Document](./DATABASE_CONFIGURATION.md)
