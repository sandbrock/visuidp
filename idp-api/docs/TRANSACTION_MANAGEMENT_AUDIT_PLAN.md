# Transaction Management Audit Plan

## Executive Summary

This document outlines a comprehensive plan to audit and fix transaction management across the IDP API project to prevent connection pool exhaustion and ensure proper resource handling.

## Problem Statement

The application experienced database connection pool exhaustion due to:
1. Missing `@Transactional` annotations on methods performing database operations
2. Improper transaction boundaries causing connections to be held longer than necessary
3. Read operations without transaction context not releasing connections promptly

## Audit Scope

### 1. Infrastructure Layer - PostgreSQL Repositories ✅ GOOD
**Location**: `idp-api/src/main/java/com/angryss/idp/infrastructure/persistence/postgresql/`

**Current Status**: All PostgreSQL repositories follow correct patterns:
- Write operations (`save`, `delete`) have `@Transactional`
- Read operations (`findById`, `findAll`, `count`, `exists`) do NOT have `@Transactional` (correct for Panache)
- Repositories are properly scoped with `@ApplicationScoped`

**Files Checked**:
- ✅ PostgresStackRepository.java
- ✅ PostgresBlueprintRepository.java
- ✅ PostgresTeamRepository.java
- ✅ PostgresCloudProviderRepository.java

**Action**: Verify remaining 13 PostgreSQL repositories follow same pattern

### 2. Infrastructure Layer - Health Checks ✅ FIXED
**Location**: `idp-api/src/main/java/com/angryss/idp/infrastructure/persistence/config/`

**Issue Found**: DatabaseHealthCheck.call() was missing `@Transactional`
**Status**: ✅ FIXED - Added `@Transactional` annotation

**Action**: Audit any other health checks or monitoring components

### 3. Application Layer - Services ✅ GOOD
**Location**: `idp-api/src/main/java/com/angryss/idp/application/usecases/`

**Current Status**: Services follow correct patterns:
- Business logic methods that modify data have `@Transactional`
- Read-only methods delegate to repositories (no transaction needed)
- Transaction boundaries are at the service layer (correct)

**Files Checked**:
- ✅ StackService.java - Proper transaction boundaries
- ✅ BlueprintService.java - Proper transaction boundaries

**Action**: Verify remaining 6 service classes follow same pattern

### 4. Presentation Layer - Controllers ✅ GOOD
**Location**: `idp-api/src/main/java/com/angryss/idp/presentation/controllers/`

**Current Status**: Controllers correctly delegate to services
- No `@Transactional` on controllers (correct - transactions should be in service layer)
- Controllers handle HTTP concerns only

**Files Checked**:
- ✅ StackController.java

**Action**: Spot-check 2-3 more controllers to confirm pattern

### 5. Domain Layer - Entities
**Location**: `idp-api/src/main/java/com/angryss/idp/domain/entities/`

**Action**: Verify entities don't have business logic that requires transactions

### 6. DynamoDB Repositories (Lower Priority)
**Location**: `idp-api/src/main/java/com/angryss/idp/infrastructure/persistence/dynamodb/`

**Note**: DynamoDB doesn't use connection pools, but should still follow transaction patterns for consistency

**Action**: Review DynamoTransactionManager.java for proper resource handling

## Detailed Audit Checklist

### Phase 1: Complete Repository Audit (Priority: HIGH)
Verify all PostgreSQL repositories follow the pattern:

**Remaining PostgreSQL Repositories to Check**:
- [ ] PostgresAdminAuditLogRepository.java
- [ ] PostgresApiKeyRepository.java
- [ ] PostgresBlueprintResourceRepository.java
- [ ] PostgresCategoryRepository.java
- [ ] PostgresDomainRepository.java
- [ ] PostgresEnvironmentConfigRepository.java
- [ ] PostgresEnvironmentEntityRepository.java
- [ ] PostgresPropertySchemaRepository.java
- [ ] PostgresResourceTypeCloudMappingRepository.java
- [ ] PostgresResourceTypeRepository.java
- [ ] PostgresStackCollectionRepository.java
- [ ] PostgresStackResourceRepository.java

**Expected Pattern**:
```java
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresXxxRepository implements XxxRepository {
    
    @Override
    @Transactional  // ✅ Required for writes
    public Xxx save(Xxx entity) {
        entity.persist();
        return entity;
    }
    
    @Override
    @Transactional  // ✅ Required for deletes
    public void delete(Xxx entity) {
        entity.delete();
    }
    
    @Override
    // ❌ NO @Transactional for reads (Panache handles it)
    public Optional<Xxx> findById(UUID id) {
        return Optional.ofNullable(Xxx.findById(id));
    }
    
    @Override
    // ❌ NO @Transactional for reads
    public long count() {
        return Xxx.count();
    }
}
```

### Phase 2: Complete Service Audit (Priority: HIGH)
Verify all services have proper transaction boundaries:

**Remaining Services to Check**:
- [ ] AdminDashboardService.java
- [ ] ApiKeyService.java
- [ ] CloudProviderService.java
- [ ] PropertySchemaService.java
- [ ] ResourceTypeCloudMappingService.java
- [ ] ResourceTypeService.java

**Expected Pattern**:
```java
@ApplicationScoped
public class XxxService {
    
    @Inject
    XxxRepository repository;
    
    @Transactional  // ✅ Required for methods that modify data
    public XxxDto create(XxxCreateDto dto) {
        // Business logic
        Xxx entity = new Xxx();
        entity = repository.save(entity);
        return toDto(entity);
    }
    
    @Transactional  // ✅ Required for methods that modify data
    public XxxDto update(UUID id, XxxUpdateDto dto) {
        Xxx entity = repository.findById(id).orElseThrow();
        // Update logic
        entity = repository.save(entity);
        return toDto(entity);
    }
    
    @Transactional  // ✅ Required for deletes
    public void delete(UUID id) {
        Xxx entity = repository.findById(id).orElseThrow();
        repository.delete(entity);
    }
    
    // ❌ NO @Transactional for read-only methods
    public XxxDto getById(UUID id) {
        return repository.findById(id)
            .map(this::toDto)
            .orElseThrow();
    }
    
    // ❌ NO @Transactional for read-only methods
    public List<XxxDto> getAll() {
        return repository.findAll().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }
}
```

### Phase 3: Controller Spot Check (Priority: MEDIUM)
Verify controllers don't have transactions:

**Controllers to Spot Check**:
- [ ] BlueprintsController.java
- [ ] CloudProvidersController.java
- [ ] TeamsController.java

**Expected Pattern**:
```java
@Path("/v1/xxx")
@Authenticated
public class XxxController {
    
    @Inject
    XxxService service;
    
    // ❌ NO @Transactional on controllers
    @POST
    public Response create(@Valid XxxCreateDto dto, @Context SecurityContext ctx) {
        XxxDto result = service.create(dto);
        return Response.status(201).entity(result).build();
    }
}
```

### Phase 4: Health Checks and Monitoring (Priority: HIGH)
Check all health check implementations:

**Files to Check**:
- [x] DatabaseHealthCheck.java - ✅ FIXED
- [ ] Any custom health checks in infrastructure layer
- [ ] Any scheduled jobs or background tasks

**Expected Pattern**:
```java
@Readiness
@ApplicationScoped
public class XxxHealthCheck implements HealthCheck {
    
    @Override
    @Transactional  // ✅ Required if performing database operations
    public HealthCheckResponse call() {
        // Health check logic
    }
}
```

### Phase 5: Domain Services (Priority: MEDIUM)
Check domain services for transaction needs:

**Location**: `idp-api/src/main/java/com/angryss/idp/domain/services/`

**Files to Check**:
- [ ] PropertyValidationService.java
- [ ] ProvisionerSelectionService.java
- [ ] SchemaResolverService.java
- [ ] StackValidationService.java

**Note**: Domain services typically don't need transactions as they contain pure business logic

### Phase 6: Scheduled Jobs and Background Tasks (Priority: HIGH)
Search for any scheduled jobs or async operations:

**Search Patterns**:
- `@Scheduled`
- `@Async`
- `CompletionStage`
- `Uni` (Mutiny reactive types)

**Action**: Ensure any background database operations have proper transaction handling

## Common Anti-Patterns to Look For

### ❌ Anti-Pattern 1: Transaction on Read-Only Repository Methods
```java
@Override
@Transactional  // ❌ WRONG - Not needed for Panache reads
public Optional<Stack> findById(UUID id) {
    return Optional.ofNullable(Stack.findById(id));
}
```

### ❌ Anti-Pattern 2: Missing Transaction on Write Operations
```java
@Override
// ❌ WRONG - Missing @Transactional
public Stack save(Stack stack) {
    stack.persist();
    return stack;
}
```

### ❌ Anti-Pattern 3: Transaction on Controller
```java
@POST
@Transactional  // ❌ WRONG - Transactions should be in service layer
public Response create(@Valid StackCreateDto dto) {
    // ...
}
```

### ❌ Anti-Pattern 4: Long-Running Transactions
```java
@Transactional
public void processLargeDataset() {
    List<Stack> allStacks = stackRepository.findAll();
    for (Stack stack : allStacks) {
        // ❌ WRONG - Long loop holding transaction
        Thread.sleep(1000);
        externalApiCall(stack);
    }
}
```

### ❌ Anti-Pattern 5: Nested Transactions Without Propagation
```java
@Transactional
public void outerMethod() {
    innerMethod();  // ❌ May cause issues if innerMethod also has @Transactional
}

@Transactional
public void innerMethod() {
    // ...
}
```

## Testing Strategy

### 1. Connection Pool Monitoring
Add monitoring to track:
- Active connections over time
- Connection acquisition time
- Connection leak detection
- Transaction duration

### 2. Load Testing
Test scenarios:
- High concurrent read operations
- High concurrent write operations
- Mixed read/write workload
- Health check frequency impact

### 3. Integration Tests
Verify:
- Transactions commit properly
- Rollback on exceptions
- Connection release after operations
- No connection leaks

## Implementation Steps

### Step 1: Automated Scan (Estimated: 30 minutes)
Create a script to scan for:
- Methods calling Panache operations without `@Transactional`
- Controllers with `@Transactional`
- Health checks without `@Transactional`

### Step 2: Manual Review (Estimated: 2-3 hours)
- Review all flagged files
- Check transaction boundaries
- Verify proper exception handling

### Step 3: Fix Issues (Estimated: 1-2 hours)
- Add missing `@Transactional` annotations
- Remove unnecessary `@Transactional` annotations
- Refactor long-running transactions

### Step 4: Testing (Estimated: 2-3 hours)
- Run integration tests
- Perform load testing
- Monitor connection pool metrics

### Step 5: Documentation (Estimated: 1 hour)
- Update architecture docs
- Create transaction management guidelines
- Add code review checklist

## Success Criteria

- ✅ No connection pool exhaustion under normal load
- ✅ All write operations have `@Transactional`
- ✅ No unnecessary transactions on read operations
- ✅ Health checks properly manage connections
- ✅ Connection pool metrics show healthy patterns
- ✅ All integration tests pass
- ✅ Load tests show stable connection usage

## Monitoring and Alerting

### Metrics to Track
1. **Connection Pool Metrics**:
   - Active connections
   - Available connections
   - Awaiting connections
   - Acquisition timeout count

2. **Transaction Metrics**:
   - Transaction duration (p50, p95, p99)
   - Transaction rollback rate
   - Long-running transaction count

3. **Health Check Metrics**:
   - Health check duration
   - Health check failure rate
   - Database connectivity status

### Alerts to Configure
- Connection pool utilization > 80%
- Connection acquisition timeout
- Health check failures
- Long-running transactions (> 30 seconds)

## Next Steps

1. **Immediate** (Today):
   - ✅ Fix DatabaseHealthCheck (DONE)
   - ✅ Update connection pool configuration (DONE)
   - [ ] Complete Phase 1: Repository audit

2. **Short-term** (This Week):
   - [ ] Complete Phase 2: Service audit
   - [ ] Complete Phase 4: Health check audit
   - [ ] Run load tests

3. **Medium-term** (Next Sprint):
   - [ ] Implement monitoring dashboard
   - [ ] Create transaction management guidelines
   - [ ] Add automated checks to CI/CD

## References

- Quarkus Transaction Guide: https://quarkus.io/guides/transaction
- Hibernate Panache Guide: https://quarkus.io/guides/hibernate-orm-panache
- Agroal Connection Pool: https://quarkus.io/guides/datasource
- Connection Pool Best Practices: https://vladmihalcea.com/the-anatomy-of-connection-pooling/
