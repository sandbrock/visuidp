# Testing Patterns and Best Practices

## Overview

This document defines mandatory testing patterns for the IDP API backend. These patterns emerged from comprehensive transaction management audits and test suite stabilization efforts. Following these patterns ensures test reliability, proper resource management, and consistent behavior across the test suite.

## Test Data Management

### Rule 1: Always Use Unique Test Data

**Requirement**: Every test must generate unique values for entities to prevent conflicts.

**Pattern**:
```java
@BeforeEach
void setUp() {
    // Generate unique ID for this test execution
    uniqueId = UUID.randomUUID().toString().substring(0, 8);
    
    // Use unique ID in all test data
    testStackName = "test-stack-" + uniqueId;
    testRoutePath = "/test-" + uniqueId + "/";
    testApiKeyName = "test-key-" + uniqueId;
}
```

**Anti-Pattern**:
```java
// WRONG - Hardcoded values cause conflicts
private static final String TEST_STACK_NAME = "test-stack";
private static final String TEST_ROUTE_PATH = "/test-stack/";
```

**Rationale**: Tests may run in parallel or leave residual data. Unique values prevent duplicate key constraint violations and ensure test isolation.

### Rule 2: Track Created Entities for Cleanup

**Requirement**: Tests must track all created entities and clean them up in `@AfterEach`.

**Pattern**:
```java
@QuarkusTest
class StackServiceTest {
    private List<UUID> createdStackIds = new ArrayList<>();
    private List<UUID> createdTeamIds = new ArrayList<>();
    
    @Test
    void testCreateStack() {
        Stack stack = stackRepository.save(createTestStack());
        createdStackIds.add(stack.id);  // Track for cleanup
        
        // Test logic...
    }
    
    @AfterEach
    void tearDown() {
        // Clean up in reverse order of creation
        createdStackIds.forEach(id -> {
            try {
                stackRepository.findById(id).ifPresent(stackRepository::delete);
            } catch (Exception e) {
                // Log but don't fail cleanup
                System.err.println("Failed to delete stack: " + id);
            }
        });
        createdStackIds.clear();
        
        createdTeamIds.forEach(id -> {
            try {
                teamRepository.findById(id).ifPresent(teamRepository::delete);
            } catch (Exception e) {
                System.err.println("Failed to delete team: " + id);
            }
        });
        createdTeamIds.clear();
    }
}
```

**Rationale**: Proper cleanup prevents test data pollution and ensures tests can run repeatedly without conflicts.

### Rule 3: Respect Foreign Key Constraints in Cleanup

**Requirement**: Delete child entities before parent entities to avoid foreign key constraint violations.

**Pattern**:
```java
@AfterEach
void tearDown() {
    // CORRECT ORDER - children before parents
    
    // 1. Delete stack resources (child of stack)
    stackResourceRepository.deleteAll();
    
    // 2. Delete stacks (child of team and blueprint)
    stackRepository.deleteAll();
    
    // 3. Delete blueprint resources (child of blueprint)
    blueprintResourceRepository.deleteAll();
    
    // 4. Delete blueprints (parent)
    blueprintRepository.deleteAll();
    
    // 5. Delete teams (parent)
    teamRepository.deleteAll();
    
    // 6. Delete cloud providers (referenced by many)
    cloudProviderRepository.deleteAll();
}
```

**Anti-Pattern**:
```java
// WRONG - parent before children causes foreign key violations
teamRepository.deleteAll();
stackRepository.deleteAll();  // FAILS - stacks reference teams
```

**Rationale**: Database foreign key constraints enforce referential integrity. Deleting parents before children violates these constraints.

## Entity Persistence Patterns

### Rule 4: Always Use Returned Entity from save()

**Requirement**: After calling `save()`, always use the returned entity reference for subsequent operations.

**Pattern**:
```java
// CORRECT - use returned entity
ApiKey apiKey = createTestApiKey();
ApiKey savedApiKey = apiKeyRepository.save(apiKey);  // Get returned entity
savedApiKey.isActive = false;  // Modify returned entity
apiKeyRepository.save(savedApiKey);  // Works correctly
```

**Anti-Pattern**:
```java
// WRONG - using original entity reference
ApiKey apiKey = createTestApiKey();
apiKeyRepository.save(apiKey);  // Don't use returned value
apiKey.isActive = false;  // Modifying original (may be detached)
apiKeyRepository.save(apiKey);  // May fail with EntityExistsException
```

**Rationale**: JPA entity lifecycle states (transient, managed, detached) affect persistence operations. The returned entity is guaranteed to be in the correct state.

### Rule 5: Keep Entity Operations Within Transaction Boundaries

**Requirement**: When modifying entities, keep all operations within the same transaction to maintain managed state.

**Pattern**:
```java
@Transactional
public CloudProviderDto update(UUID id, CloudProviderUpdateDto dto) {
    // Fetch entity (becomes MANAGED)
    CloudProvider provider = repository.findById(id).orElseThrow();
    
    // Modify entity (still MANAGED)
    provider.displayName = dto.getDisplayName();
    
    // Save entity (still MANAGED - persist() is no-op)
    provider = repository.save(provider);
    return toDto(provider);
}
```

**Rationale**: Entities remain managed within a transaction, avoiding detachment issues and ensuring changes are tracked by JPA.

## Authentication in Tests

### Rule 6: Create and Persist API Keys Before Authentication Tests

**Requirement**: Tests requiring authentication must create and persist API keys in `@BeforeEach`.

**Pattern**:
```java
@QuarkusTest
class ApiKeyAuthenticationTest {
    @Inject
    ApiKeyRepository apiKeyRepository;
    
    private String testApiKeyHash;
    private String uniqueId;
    
    @BeforeEach
    void setUp() {
        uniqueId = UUID.randomUUID().toString().substring(0, 8);
        
        // Create and persist API key for tests
        ApiKey apiKey = new ApiKey();
        apiKey.name = "test-key-" + uniqueId;
        apiKey.keyHash = "hash-" + uniqueId;
        apiKey.type = ApiKeyType.SYSTEM;
        apiKey.createdBy = "test-user@example.com";
        apiKey.createdAt = LocalDateTime.now();
        apiKey.expiresAt = LocalDateTime.now().plusDays(30);
        apiKey.isActive = true;
        
        apiKey = apiKeyRepository.save(apiKey);
        testApiKeyHash = apiKey.keyHash;
    }
    
    @Test
    void testAuthenticateWithApiKey() {
        given()
            .header("X-API-Key", testApiKeyHash)
            .when()
            .get("/v1/stacks")
            .then()
            .statusCode(200);
    }
}
```

**Rationale**: Authentication mechanisms query the database for API keys. Keys must exist before authentication can succeed.

### Rule 7: Use SYSTEM Type API Keys for Admin Tests

**Requirement**: Tests requiring admin privileges must use `ApiKeyType.SYSTEM` to receive the admin role.

**Pattern**:
```java
@BeforeEach
void setUp() {
    // Create SYSTEM type API key for admin access
    ApiKey adminKey = new ApiKey();
    adminKey.type = ApiKeyType.SYSTEM;  // Gets admin role
    adminKey.name = "admin-key-" + uniqueId;
    adminKey.keyHash = "admin-hash-" + uniqueId;
    // ... other fields
    
    adminKey = apiKeyRepository.save(adminKey);
    adminApiKeyHash = adminKey.keyHash;
}

@Test
void testAdminEndpoint() {
    given()
        .header("X-API-Key", adminApiKeyHash)
        .when()
        .post("/v1/admin/cloud-providers")
        .then()
        .statusCode(201);  // Success with admin role
}
```

**Rationale**: The authentication mechanism assigns the admin role only to SYSTEM type API keys. Other types receive user-level permissions.

### Rule 8: Configure Test Profile for Authentication

**Requirement**: Test configuration must properly enable authentication mechanisms.

**Pattern**:
```properties
# src/test/resources/application.properties

# Database Configuration
idp.database.provider=postgresql

# Authentication Configuration
quarkus.http.auth.basic=false
quarkus.http.auth.proactive=false

# Admin Configuration
idp.admin.group=admin
```

**Rationale**: Proper configuration ensures authentication mechanisms are active and CDI beans resolve correctly in tests.

## Transaction Management in Tests

### Rule 9: Let Repository Methods Manage Transactions

**Requirement**: Test methods should NOT use `@Transactional` unless specifically testing rollback behavior.

**Pattern**:
```java
@QuarkusTest
class PostgresRepositoryTransactionTest {
    
    @Test  // No @Transactional - repository manages transactions
    void testSaveOperationIsTransactional() {
        // Given
        Stack stack = createTestStack();
        
        // When - Repository method has @Transactional
        Stack saved = stackRepository.save(stack);
        
        // Then - Changes are committed
        assertNotNull(saved.id);
        assertTrue(stackRepository.exists(saved.id));
    }
}
```

**Anti-Pattern**:
```java
@Test
@Transactional  // WRONG - hides transaction boundary issues
void testSaveStack() {
    Stack saved = stackRepository.save(stack);
    assertNotNull(saved.id);
}
```

**Rationale**: Adding `@Transactional` to test methods masks transaction boundary issues in production code. Tests should verify that repository methods properly manage their own transactions.

### Rule 10: Use @Transactional Only for Rollback Testing

**Requirement**: Use `@Transactional` on test methods only when explicitly testing rollback behavior.

**Pattern**:
```java
@Test
@Transactional  // Correct use - testing rollback
void testTransactionRollbackOnException() {
    // Given
    Team team = createTestTeam();
    
    // When - Save within test transaction
    Team saved = teamRepository.save(team);
    UUID teamId = saved.id;
    
    // Verify within transaction
    assertTrue(teamRepository.exists(teamId));
    
    // Force rollback
    assertThrows(RuntimeException.class, () -> {
        throw new RuntimeException("Test exception");
    });
    
    // Transaction rolls back - entity not persisted
    // No cleanup needed
}
```

**Rationale**: Test transactions automatically roll back, which is useful for testing rollback scenarios but inappropriate for normal operation testing.

### Rule 11: Verify Repository Write Methods Have @Transactional

**Requirement**: All repository write methods (save, delete, update) must have `@Transactional` annotation.

**Pattern**:
```java
@ApplicationScoped
public class PostgresStackRepository implements StackRepository {
    
    @Override
    @Transactional  // REQUIRED for write operations
    public Stack save(Stack entity) {
        entity.persist();
        return entity;
    }
    
    @Override
    @Transactional  // REQUIRED for delete operations
    public void delete(Stack entity) {
        entity.delete();
    }
    
    @Override
    // No @Transactional - Panache handles read operations
    public Optional<Stack> findById(UUID id) {
        return Optional.ofNullable(Stack.findById(id));
    }
}
```

**Rationale**: Write operations must execute within transactions to ensure atomicity and proper connection management. Read operations are efficiently handled by Panache without explicit transactions.

## Test Configuration Best Practices

### Rule 12: Use Minimal Connection Pool for Tests

**Requirement**: Test configuration should use smaller connection pool sizes than production.

**Pattern**:
```properties
# src/test/resources/application.properties

# Connection Pool (smaller for tests)
quarkus.datasource.jdbc.min-size=1
quarkus.datasource.jdbc.max-size=5
quarkus.datasource.jdbc.acquisition-timeout=10
```

**Rationale**: Tests run with limited concurrency. Smaller pools reduce resource usage and make connection leaks more apparent.

### Rule 13: Use drop-and-create for Test Database

**Requirement**: Tests should use `drop-and-create` database generation strategy.

**Pattern**:
```properties
# src/test/resources/application.properties

# Hibernate - clean slate for each test run
quarkus.hibernate-orm.database.generation=drop-and-create
```

**Rationale**: Ensures tests start with a clean database schema, preventing schema drift issues and test data pollution.

## Test Data Builders

### Rule 14: Use Test Data Builder Pattern

**Requirement**: Create reusable test data builders for complex entities.

**Pattern**:
```java
public class TestDataBuilder {
    
    public static Stack createTestStack(String uniqueId) {
        Stack stack = new Stack();
        stack.name = "test-stack-" + uniqueId;
        stack.routePath = "/test-" + uniqueId + "/";
        stack.cloudName = "test-cloud-" + uniqueId;
        stack.stackType = StackType.INFRASTRUCTURE_ONLY;
        stack.createdBy = "test-user@example.com";
        stack.createdAt = LocalDateTime.now();
        return stack;
    }
    
    public static ApiKey createTestApiKey(String uniqueId, ApiKeyType type) {
        ApiKey apiKey = new ApiKey();
        apiKey.name = "test-key-" + uniqueId;
        apiKey.keyHash = "hash-" + uniqueId;
        apiKey.type = type;
        apiKey.createdBy = "test-user@example.com";
        apiKey.createdAt = LocalDateTime.now();
        apiKey.expiresAt = LocalDateTime.now().plusDays(30);
        apiKey.isActive = true;
        return apiKey;
    }
    
    public static Team createTestTeam(String uniqueId) {
        Team team = new Team();
        team.name = "test-team-" + uniqueId;
        team.description = "Test team " + uniqueId;
        team.createdBy = "test-user@example.com";
        team.createdAt = LocalDateTime.now();
        return team;
    }
}
```

**Rationale**: Centralized test data creation ensures consistency, reduces duplication, and makes tests more maintainable.

## Common Test Failure Patterns to Avoid

### Anti-Pattern 1: Hardcoded Test Values

**Problem**: Using hardcoded values causes duplicate key constraint violations.

**Solution**: Always generate unique values using UUID or timestamp.

### Anti-Pattern 2: Missing Cleanup

**Problem**: Not cleaning up test data causes conflicts in subsequent test runs.

**Solution**: Always implement `@AfterEach` cleanup with proper ordering.

### Anti-Pattern 3: Wrong Cleanup Order

**Problem**: Deleting parents before children causes foreign key violations.

**Solution**: Delete children first, then parents, respecting foreign key relationships.

### Anti-Pattern 4: Using Original Entity After Save

**Problem**: Modifying original entity reference after save causes EntityExistsException.

**Solution**: Always use the returned entity from save() operations.

### Anti-Pattern 5: Unnecessary @Transactional on Tests

**Problem**: Adding @Transactional to test methods hides transaction boundary issues.

**Solution**: Only use @Transactional when explicitly testing rollback behavior.

### Anti-Pattern 6: Missing @Transactional on Repository Writes

**Problem**: Repository write methods without @Transactional cause connection leaks.

**Solution**: Always annotate repository write methods with @Transactional.

### Anti-Pattern 7: Shared Test Data

**Problem**: Static or shared test data causes conflicts between tests.

**Solution**: Generate unique test data in @BeforeEach for each test execution.

### Anti-Pattern 8: Missing API Key Setup

**Problem**: Authentication tests fail because API keys don't exist in database.

**Solution**: Create and persist API keys in @BeforeEach before running authentication tests.

## Quick Reference Checklist

### Before Writing Tests
- [ ] Understand entity relationships and foreign keys
- [ ] Plan test data cleanup strategy
- [ ] Identify unique constraints requiring unique values
- [ ] Determine if test needs @Transactional (usually NO)
- [ ] Review existing test patterns in similar test classes

### Test Setup (@BeforeEach)
- [ ] Generate unique ID for test data
- [ ] Create test data with unique values
- [ ] Initialize tracking lists for cleanup
- [ ] Set up authentication context if needed
- [ ] Persist required entities (API keys, teams, etc.)

### Test Execution
- [ ] Use returned entity from save() operations
- [ ] Track created entities for cleanup
- [ ] Verify expected behavior with assertions
- [ ] Handle exceptions appropriately
- [ ] Don't catch and swallow exceptions

### Test Cleanup (@AfterEach)
- [ ] Delete test data in correct order (children first)
- [ ] Use try-catch to prevent cleanup failures
- [ ] Clear tracking lists
- [ ] Verify cleanup completed successfully
- [ ] Don't use deleteAll() on reference data tables

## Additional Resources

- [Test Troubleshooting Guide](../idp-api/docs/TEST_TROUBLESHOOTING_GUIDE.md)
- [Testing Guide](../idp-api/docs/TESTING_GUIDE.md)
- [Transaction Management Guide](../idp-api/docs/TRANSACTION_MANAGEMENT_GUIDE.md)
- [Repository Transaction Test Patterns](../idp-api/docs/REPOSITORY_TRANSACTION_TEST_PATTERNS.md)

---

**Last Updated**: November 10, 2025  
**Maintained By**: IDP API Development Team
