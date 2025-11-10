# Transaction Management Steering Rules

## Overview

These rules ensure proper transaction management across the IDP API codebase to prevent connection pool exhaustion and maintain data consistency.

## Core Principles

1. **Transactions belong in the Service Layer** - Never in repositories or controllers
2. **Write operations require @Transactional** - All create, update, delete operations
3. **Read operations don't need @Transactional** - Panache handles them automatically
4. **Keep transactions short** - Long transactions hold database connections
5. **No external calls in transactions** - Move API calls outside transaction boundaries

## Layer-Specific Rules

### Repository Layer (Infrastructure)

**✅ REQUIRED**:
- Add `@Transactional` to all write operations (`save()`, `delete()`, custom write methods)
- Extend `PanacheEntityBase` for entities
- Use `UUID` for primary keys

**❌ PROHIBITED**:
- Adding `@Transactional` to read operations (`findById()`, `findAll()`, `count()`, `exists()`, custom queries)
- Direct database operations outside repository pattern
- Business logic in repositories

**Example**:
```java
@ApplicationScoped
public class PostgresStackRepository implements StackRepository {
    
    @Override
    @Transactional  // ✅ Required
    public Stack save(Stack stack) {
        stack.persist();
        return stack;
    }
    
    @Override
    // ❌ No @Transactional - Panache handles it
    public Optional<Stack> findById(UUID id) {
        return Optional.ofNullable(Stack.findById(id));
    }
}
```

### Service Layer (Application)

**✅ REQUIRED**:
- Add `@Transactional` to all create/update/delete methods
- Validate input before starting transaction
- Handle exceptions properly for rollback
- Keep transactions focused and short

**❌ PROHIBITED**:
- Adding `@Transactional` to read-only methods
- External API calls inside `@Transactional` methods
- Long-running loops inside `@Transactional` methods
- Thread.sleep or blocking operations in transactions

**Example**:
```java
@ApplicationScoped
public class StackService {
    
    @Transactional  // ✅ Required for writes
    public StackDto create(StackCreateDto dto, String user) {
        // Validation happens before transaction
        validateStackCreation(dto);
        
        Stack stack = new Stack(dto.getName(), ...);
        stack = repository.save(stack);
        return toDto(stack);
    }
    
    // ❌ No @Transactional for reads
    public StackDto getById(UUID id) {
        return repository.findById(id)
            .map(this::toDto)
            .orElseThrow();
    }
}
```

### Controller Layer (Presentation)

**✅ REQUIRED**:
- Delegate all business logic to services
- Handle only HTTP concerns (request/response mapping)
- Use proper HTTP status codes
- Validate input with `@Valid`

**❌ PROHIBITED**:
- Adding `@Transactional` to any controller method
- Direct database operations
- Business logic in controllers
- Direct repository access

**Example**:
```java
@Path("/v1/stacks")
@Authenticated
public class StackController {
    
    @Inject
    StackService stackService;
    
    @POST
    // ❌ NO @Transactional on controllers
    public Response create(@Valid StackCreateDto dto, @Context SecurityContext ctx) {
        String user = ctx.getUserPrincipal().getName();
        StackDto result = stackService.create(dto, user);
        return Response.status(201).entity(result).build();
    }
}
```

### Health Checks

**✅ REQUIRED**:
- Add `@Transactional` if performing database operations
- Use lightweight queries (count, exists)
- Complete within 5 seconds
- Handle exceptions gracefully

**❌ PROHIBITED**:
- Long-running queries
- Complex joins or aggregations
- External API calls

**Example**:
```java
@Readiness
@ApplicationScoped
public class DatabaseHealthCheck implements HealthCheck {
    
    @Override
    @Transactional  // ✅ Required for DB operations
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

## Common Patterns

### Pattern 1: Simple CRUD Operation

```java
@Transactional
public EntityDto create(EntityCreateDto dto) {
    Entity entity = new Entity(dto.getName(), ...);
    entity = repository.save(entity);
    return toDto(entity);
}
```

### Pattern 2: Update with Validation

```java
@Transactional
public EntityDto update(UUID id, EntityUpdateDto dto) {
    Entity entity = repository.findById(id).orElseThrow();
    
    // Validation
    if (dto.getName() != null) {
        entity.setName(dto.getName());
    }
    
    entity = repository.save(entity);
    return toDto(entity);
}
```

### Pattern 3: Multiple Repository Calls

```java
@Transactional  // One transaction covers all operations
public StackDto createWithResources(StackCreateDto dto) {
    Stack stack = new Stack(dto.getName(), ...);
    stack = stackRepository.save(stack);
    
    for (ResourceDto resourceDto : dto.getResources()) {
        StackResource resource = new StackResource(...);
        resource.setStack(stack);
        resourceRepository.save(resource);
    }
    
    return toDto(stack);
}
```

### Pattern 4: External API Call (Anti-Pattern Fixed)

```java
// ❌ BAD - External call inside transaction
@Transactional
public void processStack(UUID id) {
    Stack stack = stackRepository.findById(id).orElseThrow();
    ExternalApiResponse response = externalApi.call(stack);  // ❌ BAD
    stack.setStatus(response.getStatus());
    stackRepository.save(stack);
}

// ✅ GOOD - External call outside transaction
public void processStack(UUID id) {
    Stack stack = stackRepository.findById(id).orElseThrow();
    ExternalApiResponse response = externalApi.call(stack);  // ✅ Outside transaction
    updateStackStatus(id, response.getStatus());
}

@Transactional
private void updateStackStatus(UUID id, String status) {
    Stack stack = stackRepository.findById(id).orElseThrow();
    stack.setStatus(status);
    stackRepository.save(stack);
}
```

### Pattern 5: Batch Processing

```java
// ❌ BAD - Large batch in one transaction
@Transactional
public void processAllStacks() {
    List<Stack> allStacks = stackRepository.findAll();
    for (Stack stack : allStacks) {  // ❌ Could be thousands
        stack.setProcessed(true);
        stackRepository.save(stack);
    }
}

// ✅ GOOD - Process in smaller batches
public void processAllStacks() {
    int batchSize = 100;
    int offset = 0;
    
    while (true) {
        List<Stack> batch = getStackBatch(offset, batchSize);
        if (batch.isEmpty()) break;
        processBatch(batch);
        offset += batchSize;
    }
}

@Transactional
private void processBatch(List<Stack> stacks) {
    for (Stack stack : stacks) {
        stack.setProcessed(true);
        stackRepository.save(stack);
    }
}
```

## Code Review Checklist

When reviewing code, verify:

- [ ] Write operations have `@Transactional` in service layer
- [ ] Read-only operations don't have unnecessary `@Transactional`
- [ ] Controllers don't have `@Transactional`
- [ ] Transactions are kept short (< 30 seconds)
- [ ] External API calls are outside transactions
- [ ] Batch operations process in reasonable chunks (< 100 items)
- [ ] Exception handling allows proper rollback
- [ ] Health checks with DB operations have `@Transactional`

## Monitoring and Alerts

### Connection Pool Metrics

Monitor these metrics via `/api/q/health/ready`:
- `connectionPool.active` - Should be low when idle
- `connectionPool.available` - Should be high when idle
- `connectionPool.awaiting` - Should always be 0

### Recommended Alerts

1. **Pool Utilization > 80%**
   - Severity: WARNING
   - Action: Review transaction boundaries, check for leaks

2. **Connection Acquisition Timeout**
   - Severity: CRITICAL
   - Action: Immediate investigation, check for long-running transactions

3. **Long-Running Transaction > 30 seconds**
   - Severity: WARNING
   - Action: Review transaction scope, move external calls outside

4. **Awaiting Connections > 0**
   - Severity: WARNING
   - Action: Pool may be undersized or transactions holding connections too long

## Testing Requirements

### Unit Tests

- Test transaction rollback on exceptions
- Test validation before transaction starts
- Mock external dependencies

### Integration Tests

- Verify write operations commit successfully
- Verify rollback on exceptions
- Test concurrent operations
- Monitor connection pool during tests

### Load Tests

- Execute 100+ concurrent requests
- Verify pool utilization stays < 80%
- Check for connection acquisition timeouts
- Monitor transaction duration

## Common Mistakes to Avoid

1. **@Transactional on Controllers** - Always wrong, move to service
2. **@Transactional on Read Operations** - Unnecessary, Panache handles it
3. **External API Calls in Transactions** - Move outside transaction boundary
4. **Large Batch Processing** - Break into smaller chunks
5. **Missing @Transactional on Writes** - Required for data consistency
6. **Long-Running Transactions** - Keep transactions short and focused
7. **Nested Transactions** - Avoid when possible, use single transaction
8. **Direct Repository Access from Controllers** - Always use services

## Performance Guidelines

### Transaction Duration Targets

- **Simple CRUD**: < 10ms
- **Complex Operations**: < 100ms
- **Batch Operations**: < 1 second per batch
- **Maximum**: < 30 seconds (alert threshold)

### Connection Pool Sizing

- **Current Configuration**: 20 connections
- **Utilization Target**: < 80%
- **Current Capacity**: ~3,370 req/sec
- **Scaling Threshold**: If sustained load > 2,500 req/sec, increase to 30

## References

- [Transaction Management Guide](../docs/TRANSACTION_MANAGEMENT_GUIDE.md) - Comprehensive developer guide
- [Audit Checklist](../AUDIT_CHECKLIST.md) - Quick reference for audits
- [Connection Pool Monitoring](../docs/CONNECTION_POOL_MONITORING.md) - Monitoring guide
- [Alerting Thresholds](../docs/ALERTING_THRESHOLDS.md) - Alert configuration
- [Quarkus Transaction Guide](https://quarkus.io/guides/transaction) - Official documentation

## Audit History

- **November 9, 2025**: Initial transaction management audit completed
  - 25 files reviewed (16 repositories, 6 services, 3 controllers)
  - 4 issues found and fixed (all in TeamsController)
  - 100% compliance achieved
  - System production-ready

---

**Last Updated**: November 9, 2025  
**Status**: Active  
**Compliance**: 100%
