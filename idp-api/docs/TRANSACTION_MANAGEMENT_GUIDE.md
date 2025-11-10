# Transaction Management Guide

## Quick Reference

This guide provides best practices for transaction management in the IDP API to prevent connection pool exhaustion and ensure data consistency.

## Core Principles

1. **Transactions belong in the Service Layer** - Not in repositories or controllers
2. **Write operations need transactions** - `save()`, `delete()`, `update()`
3. **Read operations don't need transactions** - Panache handles them automatically
4. **Keep transactions short** - Long transactions hold database connections
5. **One transaction per request** - Avoid nested transactions when possible

## Layer-by-Layer Guide

### 1. Repository Layer (Infrastructure)

**✅ DO**: Add `@Transactional` to write operations

```java
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresStackRepository implements StackRepository {
    
    @Override
    @Transactional  // ✅ Required for persist
    public Stack save(Stack stack) {
        stack.persist();
        return stack;
    }
    
    @Override
    @Transactional  // ✅ Required for delete
    public void delete(Stack stack) {
        stack.delete();
    }
}
```

**❌ DON'T**: Add `@Transactional` to read operations

```java
@Override
// ❌ NO @Transactional needed - Panache handles it
public Optional<Stack> findById(UUID id) {
    return Optional.ofNullable(Stack.findById(id));
}

@Override
// ❌ NO @Transactional needed
public List<Stack> findAll() {
    return Stack.listAll();
}

@Override
// ❌ NO @Transactional needed
public long count() {
    return Stack.count();
}
```

### 2. Service Layer (Application)

**✅ DO**: Add `@Transactional` to methods that modify data

```java
@ApplicationScoped
public class StackService {
    
    @Inject
    StackRepository stackRepository;
    
    @Transactional  // ✅ Required - modifies data
    public StackResponseDto createStack(StackCreateDto dto, String createdBy) {
        // Validation
        validateStackCreation(dto);
        
        // Create entity
        Stack stack = new Stack(dto.getName(), dto.getDescription(), ...);
        
        // Save (repository method also has @Transactional, but that's OK)
        stack = stackRepository.save(stack);
        
        return toDto(stack);
    }
    
    @Transactional  // ✅ Required - modifies data
    public StackResponseDto updateStack(UUID id, StackCreateDto dto, String user) {
        Stack stack = stackRepository.findById(id).orElseThrow();
        
        // Update fields
        stack.setName(dto.getName());
        stack.setDescription(dto.getDescription());
        
        // Save changes
        stack = stackRepository.save(stack);
        
        return toDto(stack);
    }
    
    @Transactional  // ✅ Required - deletes data
    public void deleteStack(UUID id, String user) {
        Stack stack = stackRepository.findById(id).orElseThrow();
        stackRepository.delete(stack);
    }
}
```

**❌ DON'T**: Add `@Transactional` to read-only methods

```java
// ❌ NO @Transactional needed - read-only
public StackResponseDto getStackById(UUID id) {
    return stackRepository.findById(id)
        .map(this::toDto)
        .orElseThrow();
}

// ❌ NO @Transactional needed - read-only
public List<StackResponseDto> getAllStacks() {
    return stackRepository.findAll().stream()
        .map(this::toDto)
        .collect(Collectors.toList());
}
```

### 3. Controller Layer (Presentation)

**❌ DON'T**: Add `@Transactional` to controllers

```java
@Path("/v1/stacks")
@Authenticated
public class StackController {
    
    @Inject
    StackService stackService;
    
    @POST
    // ❌ NO @Transactional on controllers - let service handle it
    public Response createStack(@Valid StackCreateDto dto, @Context SecurityContext ctx) {
        String user = ctx.getUserPrincipal().getName();
        StackResponseDto result = stackService.createStack(dto, user);
        return Response.status(201).entity(result).build();
    }
    
    @GET
    @Path("/{id}")
    // ❌ NO @Transactional on controllers
    public StackResponseDto getStack(@PathParam("id") UUID id) {
        return stackService.getStackById(id);
    }
}
```

### 4. Health Checks

**✅ DO**: Add `@Transactional` if performing database operations

```java
@Readiness
@ApplicationScoped
public class DatabaseHealthCheck implements HealthCheck {
    
    @Inject
    Instance<StackRepository> stackRepository;
    
    @Override
    @Transactional  // ✅ Required - performs database operation
    public HealthCheckResponse call() {
        try {
            long count = stackRepository.get().count();
            return HealthCheckResponse.up("database")
                .withData("stackCount", count)
                .build();
        } catch (Exception e) {
            return HealthCheckResponse.down("database")
                .withData("error", e.getMessage())
                .build();
        }
    }
}
```

## Common Scenarios

### Scenario 1: Multiple Repository Calls in One Service Method

**✅ DO**: Use one transaction for all operations

```java
@Transactional  // ✅ One transaction covers all operations
public StackResponseDto createStackWithResources(StackCreateDto dto, String user) {
    // Create stack
    Stack stack = new Stack(dto.getName(), ...);
    stack = stackRepository.save(stack);
    
    // Create resources
    for (ResourceDto resourceDto : dto.getResources()) {
        StackResource resource = new StackResource(resourceDto.getName(), ...);
        resource.setStack(stack);
        resourceRepository.save(resource);
    }
    
    return toDto(stack);
}
```

### Scenario 2: Read Then Write

**✅ DO**: Transaction only on the write part

```java
@Transactional  // ✅ Transaction covers the whole method
public StackResponseDto updateStack(UUID id, StackCreateDto dto) {
    // Read operation (within transaction is OK)
    Stack stack = stackRepository.findById(id).orElseThrow();
    
    // Modify
    stack.setName(dto.getName());
    
    // Write operation
    stack = stackRepository.save(stack);
    
    return toDto(stack);
}
```

### Scenario 3: External API Call + Database Write

**❌ DON'T**: Include external calls in transaction

```java
// ❌ BAD - External call holds transaction open
@Transactional
public void processStack(UUID id) {
    Stack stack = stackRepository.findById(id).orElseThrow();
    
    // ❌ External API call inside transaction - BAD!
    ExternalApiResponse response = externalApi.call(stack);
    
    stack.setStatus(response.getStatus());
    stackRepository.save(stack);
}
```

**✅ DO**: External call outside transaction

```java
// ✅ GOOD - External call outside transaction
public void processStack(UUID id) {
    // Read stack (no transaction needed)
    Stack stack = stackRepository.findById(id).orElseThrow();
    
    // External API call (outside transaction)
    ExternalApiResponse response = externalApi.call(stack);
    
    // Update in separate transaction
    updateStackStatus(id, response.getStatus());
}

@Transactional  // ✅ Short transaction just for the write
private void updateStackStatus(UUID id, String status) {
    Stack stack = stackRepository.findById(id).orElseThrow();
    stack.setStatus(status);
    stackRepository.save(stack);
}
```

### Scenario 4: Batch Processing

**❌ DON'T**: Process large batches in one transaction

```java
// ❌ BAD - Long transaction holding connection
@Transactional
public void processAllStacks() {
    List<Stack> allStacks = stackRepository.findAll();
    
    for (Stack stack : allStacks) {  // ❌ Could be thousands of records
        // Process each stack
        stack.setProcessed(true);
        stackRepository.save(stack);
    }
}
```

**✅ DO**: Process in smaller batches with separate transactions

```java
// ✅ GOOD - Process in batches
public void processAllStacks() {
    int batchSize = 100;
    int offset = 0;
    
    while (true) {
        List<Stack> batch = getStackBatch(offset, batchSize);
        if (batch.isEmpty()) break;
        
        // Process batch in separate transaction
        processBatch(batch);
        
        offset += batchSize;
    }
}

@Transactional  // ✅ Short transaction per batch
private void processBatch(List<Stack> stacks) {
    for (Stack stack : stacks) {
        stack.setProcessed(true);
        stackRepository.save(stack);
    }
}
```

## Transaction Propagation

Quarkus uses JTA transactions with these propagation types:

- **REQUIRED** (default): Join existing transaction or create new one
- **REQUIRES_NEW**: Always create new transaction (suspend existing)
- **MANDATORY**: Must have existing transaction (throw exception if not)
- **SUPPORTS**: Join if exists, run without if not
- **NOT_SUPPORTED**: Run without transaction (suspend existing)
- **NEVER**: Must not have transaction (throw exception if exists)

**Example**:

```java
@Transactional  // REQUIRED (default)
public void outerMethod() {
    innerMethod();  // Joins outer transaction
}

@Transactional(Transactional.TxType.REQUIRES_NEW)
public void innerMethod() {
    // Runs in separate transaction
    // Commits independently of outer transaction
}
```

## Exception Handling and Rollback

**✅ DO**: Let exceptions propagate for automatic rollback

```java
@Transactional
public StackResponseDto createStack(StackCreateDto dto, String user) {
    // Validation - throws IllegalArgumentException
    validateStackCreation(dto);
    
    Stack stack = new Stack(dto.getName(), ...);
    stack = stackRepository.save(stack);
    
    // If any exception occurs, transaction automatically rolls back
    return toDto(stack);
}
```

**Rollback Behavior**:
- **RuntimeException**: Automatic rollback
- **Checked Exception**: No rollback (unless configured)
- **Manual rollback**: `TransactionManager.setRollbackOnly()`

## Testing Transaction Management

### Integration Test Example

```java
@QuarkusTest
@TestTransaction
class StackServiceTest {
    
    @Inject
    StackService stackService;
    
    @Inject
    StackRepository stackRepository;
    
    @Test
    void testCreateStack_rollsBackOnError() {
        StackCreateDto dto = new StackCreateDto();
        dto.setName(""); // Invalid - will cause validation error
        
        // Should throw exception and rollback
        assertThrows(IllegalArgumentException.class, () -> {
            stackService.createStack(dto, "user@example.com");
        });
        
        // Verify nothing was saved
        assertEquals(0, stackRepository.count());
    }
}
```

## Monitoring and Debugging

### Enable SQL Logging

```properties
# application.properties
quarkus.hibernate-orm.log.sql=true
quarkus.hibernate-orm.log.bind-parameters=true
```

### Monitor Connection Pool

```java
@Inject
AgroalDataSource dataSource;

public void logPoolMetrics() {
    var metrics = dataSource.getMetrics();
    LOG.infof("Active: %d, Available: %d, Max: %d, Awaiting: %d",
        metrics.activeCount(),
        metrics.availableCount(),
        metrics.maxUsedCount(),
        metrics.awaitingCount()
    );
}
```

### Check Transaction Status

```java
@Inject
TransactionManager transactionManager;

public void checkTransaction() {
    int status = transactionManager.getStatus();
    LOG.infof("Transaction status: %d", status);
    // STATUS_ACTIVE = 0
    // STATUS_COMMITTED = 3
    // STATUS_ROLLEDBACK = 4
}
```

## Troubleshooting

### Problem: Connection Pool Exhaustion

**Symptoms**:
- `Sorry, acquisition timeout!`
- `Unable to acquire JDBC Connection`

**Solutions**:
1. Check for missing `@Transactional` on write operations
2. Look for long-running transactions
3. Verify connections are being released
4. Increase pool size if needed

### Problem: Transaction Timeout

**Symptoms**:
- `Transaction timeout`
- Operations taking too long

**Solutions**:
1. Break large operations into smaller batches
2. Move external API calls outside transactions
3. Optimize database queries
4. Increase timeout if necessary:

```java
@Transactional(timeout = 60)  // 60 seconds
public void longRunningOperation() {
    // ...
}
```

### Problem: Deadlocks

**Symptoms**:
- `Deadlock detected`
- Transactions waiting for each other

**Solutions**:
1. Always acquire locks in same order
2. Keep transactions short
3. Use optimistic locking where appropriate
4. Add retry logic for deadlock exceptions

## Code Review Checklist

When reviewing code, check:

- [ ] Write operations have `@Transactional` in service layer
- [ ] Read-only operations don't have unnecessary `@Transactional`
- [ ] Controllers don't have `@Transactional`
- [ ] Transactions are kept short
- [ ] External API calls are outside transactions
- [ ] Batch operations process in reasonable chunks
- [ ] Exception handling allows proper rollback
- [ ] Health checks with DB operations have `@Transactional`

## Additional Resources

- [Quarkus Transaction Guide](https://quarkus.io/guides/transaction)
- [Hibernate ORM with Panache](https://quarkus.io/guides/hibernate-orm-panache)
- [Datasource Configuration](https://quarkus.io/guides/datasource)
- [JTA Specification](https://jakarta.ee/specifications/transactions/)
