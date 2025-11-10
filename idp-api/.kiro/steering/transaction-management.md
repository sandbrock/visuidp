---
inclusion: always
---

# Transaction Management Standards

## Rules for All Code

When writing or reviewing code in this project, follow these transaction management rules:

### 1. Repository Layer Rules

**PostgreSQL Repositories** (`infrastructure/persistence/postgresql/`):
- ✅ Add `@Transactional` to `save()` and `delete()` methods
- ❌ Do NOT add `@Transactional` to read methods (`findById`, `findAll`, `count`, `exists`)
- All repositories must be `@ApplicationScoped`

### 2. Service Layer Rules

**Services** (`application/usecases/`):
- ✅ Add `@Transactional` to methods that create, update, or delete data
- ❌ Do NOT add `@Transactional` to read-only methods
- Keep transactions short - no external API calls inside `@Transactional` methods
- All services must be `@ApplicationScoped`

### 3. Controller Layer Rules

**Controllers** (`presentation/controllers/`):
- ❌ NEVER add `@Transactional` to controllers
- Controllers should delegate to services for all business logic
- Transaction boundaries belong in the service layer

### 4. Health Check Rules

**Health Checks** (`infrastructure/persistence/config/`):
- ✅ Add `@Transactional` if the health check performs database operations
- Keep health checks lightweight and fast

### 5. General Rules

- **No long-running transactions**: Keep transactions under 5 seconds when possible
- **No external calls in transactions**: API calls, file I/O, etc. should be outside transactions
- **Batch processing**: Process large datasets in batches with separate transactions
- **Exception handling**: Let exceptions propagate for automatic rollback

## Code Review Checklist

When reviewing PRs, verify:
- [ ] Write operations have `@Transactional` in service layer
- [ ] Read operations don't have unnecessary `@Transactional`
- [ ] Controllers don't have `@Transactional`
- [ ] Transactions are kept short
- [ ] No external API calls inside transactions
- [ ] Health checks with DB operations have `@Transactional`

## Quick Examples

### ✅ Correct Repository Pattern
```java
@ApplicationScoped
public class PostgresStackRepository implements StackRepository {
    @Transactional
    public Stack save(Stack stack) {
        stack.persist();
        return stack;
    }
    
    // No @Transactional on reads
    public Optional<Stack> findById(UUID id) {
        return Optional.ofNullable(Stack.findById(id));
    }
}
```

### ✅ Correct Service Pattern
```java
@ApplicationScoped
public class StackService {
    @Transactional
    public StackDto create(StackCreateDto dto) {
        Stack stack = new Stack();
        stack = repository.save(stack);
        return toDto(stack);
    }
    
    // No @Transactional on reads
    public StackDto getById(UUID id) {
        return repository.findById(id)
            .map(this::toDto)
            .orElseThrow();
    }
}
```

### ❌ Incorrect Controller Pattern
```java
// WRONG - Don't do this!
@Path("/v1/stacks")
public class StackController {
    @POST
    @Transactional  // ❌ Remove this!
    public Response create(@Valid StackCreateDto dto) {
        // ...
    }
}
```

## Resources

- Full guide: `docs/TRANSACTION_MANAGEMENT_GUIDE.md`
- Audit plan: `TRANSACTION_MANAGEMENT_AUDIT_PLAN.md`
- Run audit: `./scripts/audit-transactions.sh`
