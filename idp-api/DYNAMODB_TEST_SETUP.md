# DynamoDB Local Test Environment Setup

This document summarizes the DynamoDB Local test environment setup for the multi-database support feature.

## What Was Set Up

### 1. Docker Configuration

**File**: `docker-compose.yml`

Added DynamoDB Local service:
- Image: `amazon/dynamodb-local:latest`
- Port: 8000
- Configuration: In-memory, shared database
- Health check: Ensures service is ready before tests run

### 2. Test Configuration Files

**File**: `src/test/resources/application.properties`
- Added `%test-dynamodb` profile configuration
- Configured DynamoDB endpoint, region, and table prefix
- Disabled PostgreSQL/Hibernate for DynamoDB tests

**File**: `src/test/resources/application-test-dynamodb.properties`
- Dedicated configuration file for DynamoDB tests
- Can be used with `-Dquarkus.profile=test-dynamodb`
- Includes detailed comments and documentation

### 3. Test Infrastructure Classes

**File**: `src/test/java/.../dynamodb/DynamoDbTestProfile.java`
- Quarkus test profile for DynamoDB tests
- Provides configuration overrides
- Used with `@TestProfile(DynamoDbTestProfile.class)` annotation

**File**: `src/test/java/.../dynamodb/DynamoDbTestBase.java`
- Base class for DynamoDB integration tests
- Provides automatic test data cleanup
- Includes utility methods for test isolation
- Verifies DynamoDB Local connectivity

**File**: `src/test/java/.../dynamodb/DynamoDbLocalConnectionTest.java`
- Verification test for DynamoDB Local setup
- Tests client injection and connectivity
- Can be used to verify the environment is working

### 4. Helper Scripts

**File**: `scripts/start-dynamodb-local.sh`
- Convenience script to start DynamoDB Local
- Waits for service to be healthy
- Displays connection information and usage instructions

### 5. Documentation

**File**: `docs/DYNAMODB_TESTING.md`
- Comprehensive guide for DynamoDB testing
- Includes quick start, configuration details, and troubleshooting
- Provides best practices and examples
- Covers CI/CD integration

**File**: `src/test/java/.../dynamodb/README.md`
- Quick reference for developers writing DynamoDB tests
- Located in the test directory for easy access
- Includes code examples and common patterns

## How to Use

### Quick Start

1. **Start DynamoDB Local**:
   ```bash
   ./scripts/start-dynamodb-local.sh
   ```
   Or:
   ```bash
   docker compose up -d dynamodb-local
   ```

2. **Run DynamoDB Tests**:
   ```bash
   ./mvnw test -Dtest="*Dynamo*Test"
   ```

3. **Verify Setup**:
   ```bash
   ./mvnw test -Dtest=DynamoDbLocalConnectionTest
   ```

### Writing Tests

Extend `DynamoDbTestBase` for automatic setup and cleanup:

```java
public class DynamoStackRepositoryTest extends DynamoDbTestBase {
    
    @Inject
    StackRepository stackRepository;
    
    @Test
    public void testSaveAndFindById() {
        // Test implementation
    }
}
```

## Configuration Details

### DynamoDB Local Endpoint
- **URL**: http://localhost:8000
- **Region**: us-east-1 (any region works with local)
- **Table Prefix**: test_idp

### Test Profile Properties
```properties
idp.database.provider=dynamodb
idp.database.dynamodb.region=us-east-1
idp.database.dynamodb.endpoint=http://localhost:8000
idp.database.dynamodb.table-prefix=test_idp
```

## Files Created

```
idp-api/
├── docker-compose.yml                                    # Updated with DynamoDB Local
├── scripts/
│   └── start-dynamodb-local.sh                          # Helper script
├── docs/
│   └── DYNAMODB_TESTING.md                              # Comprehensive guide
├── src/test/resources/
│   ├── application.properties                           # Updated with test-dynamodb profile
│   └── application-test-dynamodb.properties             # Dedicated config file
└── src/test/java/.../dynamodb/
    ├── DynamoDbTestProfile.java                         # Test profile class
    ├── DynamoDbTestBase.java                            # Base test class
    ├── DynamoDbLocalConnectionTest.java                 # Verification test
    └── README.md                                        # Quick reference
```

## Next Steps

With the test environment set up, you can now:

1. **Implement DynamoDB repository tests** (Task 14.2)
   - Create tests for DynamoStackRepository
   - Create tests for DynamoBlueprintRepository
   - Create tests for DynamoTeamRepository
   - Verify GSI queries work correctly
   - Verify transaction behavior

2. **Create tests for remaining repositories** (Task 14.3)
   - Test all remaining DynamoDB repositories
   - Test pagination for large result sets
   - Test conditional writes

3. **Create cross-database consistency tests** (Task 15)
   - Parameterized tests that run against both implementations
   - Verify identical behavior

## Verification

To verify the setup is working correctly:

```bash
# 1. Start DynamoDB Local
./scripts/start-dynamodb-local.sh

# 2. Run the connection test
./mvnw test -Dtest=DynamoDbLocalConnectionTest

# 3. Check the output for success
```

Expected output:
```
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
```

## Troubleshooting

If tests fail, check:

1. **DynamoDB Local is running**:
   ```bash
   docker compose ps dynamodb-local
   ```

2. **Port 8000 is available**:
   ```bash
   lsof -i :8000
   ```

3. **View DynamoDB Local logs**:
   ```bash
   docker compose logs dynamodb-local
   ```

For more troubleshooting tips, see `docs/DYNAMODB_TESTING.md`.

## Requirements Satisfied

This setup satisfies requirement **8.2** from the requirements document:

> THE test suite SHALL include integration tests that run against DynamoDB Database_Provider (using DynamoDB Local)

The environment is now ready for implementing DynamoDB repository integration tests.
