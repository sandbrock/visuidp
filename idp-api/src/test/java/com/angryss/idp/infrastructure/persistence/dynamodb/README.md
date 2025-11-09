# DynamoDB Integration Tests

This directory contains integration tests for the DynamoDB repository implementations.

## Prerequisites

Before running DynamoDB integration tests, you must start DynamoDB Local:

```bash
# From the idp-api directory
docker compose up -d dynamodb-local
```

This will start DynamoDB Local on `http://localhost:8000`.

## Running Tests

### Run all DynamoDB tests

```bash
./mvnw test -Dtest="*Dynamo*Test"
```

### Run a specific DynamoDB test class

```bash
./mvnw test -Dtest=DynamoStackRepositoryTest
```

### Run tests with verbose output

```bash
./mvnw test -Dtest="*Dynamo*Test" -Dquarkus.log.category."com.angryss.idp".level=DEBUG
```

## Writing DynamoDB Tests

### Option 1: Extend DynamoDbTestBase

The simplest approach is to extend `DynamoDbTestBase`:

```java
public class DynamoStackRepositoryTest extends DynamoDbTestBase {
    
    @Inject
    StackRepository stackRepository;
    
    @Test
    public void testSaveAndFindById() {
        // Test implementation
        // DynamoDB client is available via this.dynamoDbClient
        // Test data is automatically cleaned up before each test
    }
}
```

### Option 2: Use @TestProfile annotation

Alternatively, use the `@TestProfile` annotation directly:

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

## Test Configuration

The DynamoDB test profile is configured in:
- `src/test/resources/application-test-dynamodb.properties`
- `DynamoDbTestProfile.java`

Key configuration properties:
- `idp.database.provider=dynamodb`
- `idp.database.dynamodb.endpoint=http://localhost:8000`
- `idp.database.dynamodb.region=us-east-1`
- `idp.database.dynamodb.table-prefix=test_idp`

## Test Isolation

Each test class extending `DynamoDbTestBase` automatically cleans up test data before each test method. This ensures test isolation and prevents test interference.

## Troubleshooting

### DynamoDB Local not running

If tests fail with connection errors, ensure DynamoDB Local is running:

```bash
docker compose ps dynamodb-local
```

If not running, start it:

```bash
docker compose up -d dynamodb-local
```

### Port 8000 already in use

If port 8000 is already in use, you can change the port in `docker-compose.yml`:

```yaml
dynamodb-local:
  ports:
    - "8001:8000"  # Change host port to 8001
```

Then update the test configuration:

```properties
idp.database.dynamodb.endpoint=http://localhost:8001
```

### Tables not being created

DynamoDB tables are created automatically by the `DatabaseProviderConfig` on application startup. If tables are not being created, check:

1. The database provider is set to `dynamodb` in the test profile
2. The `DatabaseProviderConfig` startup observer is being triggered
3. Check logs for any table creation errors

### Tests are slow

DynamoDB Local runs in-memory by default, so tests should be fast. If tests are slow:

1. Ensure you're using the `-inMemory` flag in docker-compose.yml
2. Check that test data cleanup is not taking too long
3. Consider reducing the amount of test data

## Comparing with PostgreSQL Tests

To ensure consistency between PostgreSQL and DynamoDB implementations, consider:

1. Creating parameterized tests that run against both implementations
2. Using the same test data and assertions
3. Verifying that query results are identical
4. Testing transaction behavior in both implementations

Example parameterized test structure:

```java
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class RepositoryContractTest {
    
    @ParameterizedTest
    @MethodSource("repositoryImplementations")
    public void testSaveAndFindById(StackRepository repository) {
        // Test implementation that works with both PostgreSQL and DynamoDB
    }
    
    private Stream<StackRepository> repositoryImplementations() {
        // Return both PostgreSQL and DynamoDB implementations
    }
}
```
