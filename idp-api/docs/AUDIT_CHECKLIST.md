# Transaction Management Audit - Quick Start Checklist

## Immediate Actions (Do This Now)

### 1. Restart Your Application ✅
The connection pool configuration has been updated. Restart to apply:

```bash
# Stop Quarkus dev mode (Ctrl+C if running)
cd idp-api
./mvnw quarkus:dev
```

### 2. Verify the Fix ✅
Check that the errors are gone:

```bash
# Watch the logs - should see no more "acquisition timeout" errors
# Health check should show UP status
curl http://localhost:8082/api/q/health/ready | jq
```

## Phase 1: Automated Scan (30 minutes)

### Run the Audit Script
```bash
cd idp-api
./scripts/audit-transactions.sh
```

This generates: `transaction-audit-report.txt`

### Review the Report
Look for:
- ⚠️  POTENTIAL ISSUE markers
- ❌ ANTI-PATTERN markers
- Count of issues found

## Phase 2: Repository Audit (1-2 hours)

Review these 13 PostgreSQL repositories:

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

**For each file, verify**:
- ✅ `save()` has `@Transactional`
- ✅ `delete()` has `@Transactional`
- ❌ `findById()` does NOT have `@Transactional`
- ❌ `findAll()` does NOT have `@Transactional`
- ❌ `count()` does NOT have `@Transactional`
- ❌ `exists()` does NOT have `@Transactional`

## Phase 3: Service Audit (1-2 hours)

Review these 6 service classes:

- [ ] AdminDashboardService.java
- [ ] ApiKeyService.java
- [ ] CloudProviderService.java
- [ ] PropertySchemaService.java
- [ ] ResourceTypeCloudMappingService.java
- [ ] ResourceTypeService.java

**For each file, verify**:
- ✅ Create methods have `@Transactional`
- ✅ Update methods have `@Transactional`
- ✅ Delete methods have `@Transactional`
- ❌ Read-only methods do NOT have `@Transactional`
- ❌ No external API calls inside `@Transactional` methods

## Phase 4: Controller Spot Check (30 minutes)

Spot-check these controllers:

- [ ] BlueprintsController.java
- [ ] CloudProvidersController.java
- [ ] TeamsController.java

**Verify**:
- ❌ NO `@Transactional` annotations on any controller methods
- ✅ All business logic delegated to services

## Phase 5: Health Checks (15 minutes)

Search for health checks:

```bash
find idp-api/src/main/java -name "*HealthCheck.java"
```

**For each health check**:
- [ ] If it performs database operations → needs `@Transactional`
- [ ] If it's read-only → verify it's fast and lightweight

## Phase 6: Testing (1-2 hours)

### Run Integration Tests
```bash
cd idp-api
./mvnw test
```

### Manual Testing
1. Create a stack
2. Update a stack
3. Delete a stack
4. List all stacks
5. Check health endpoint

### Monitor Connection Pool
```bash
# Check health endpoint for connection pool metrics
curl http://localhost:8082/api/q/health/ready | jq '.checks[] | select(.name | contains("database"))'
```

Look for:
- `connectionPool.active` - should be low when idle
- `connectionPool.available` - should be high when idle
- `connectionPool.awaiting` - should be 0

## Phase 7: Load Testing (Optional, 1 hour)

If you have time, run load tests:

```bash
# Example using Apache Bench
ab -n 1000 -c 10 http://localhost:8082/api/v1/stacks

# Or using curl in a loop
for i in {1..100}; do
  curl -s http://localhost:8082/api/v1/stacks > /dev/null &
done
wait

# Check connection pool after load
curl http://localhost:8082/api/q/health/ready | jq
```

## Success Criteria

✅ **You're done when**:
- [ ] No "acquisition timeout" errors in logs
- [ ] Health checks consistently passing
- [ ] All repositories follow correct pattern
- [ ] All services follow correct pattern
- [ ] No controllers have `@Transactional`
- [ ] Integration tests pass
- [ ] Connection pool metrics look healthy

## If You Find Issues

### Issue: Repository has @Transactional on read method

**Fix**:
```java
// Before
@Override
@Transactional  // ❌ Remove this
public Optional<Stack> findById(UUID id) {
    return Optional.ofNullable(Stack.findById(id));
}

// After
@Override
// ✅ No @Transactional needed
public Optional<Stack> findById(UUID id) {
    return Optional.ofNullable(Stack.findById(id));
}
```

### Issue: Service write method missing @Transactional

**Fix**:
```java
// Before
public StackDto create(StackCreateDto dto) {  // ❌ Missing @Transactional
    Stack stack = new Stack();
    stack = repository.save(stack);
    return toDto(stack);
}

// After
@Transactional  // ✅ Added
public StackDto create(StackCreateDto dto) {
    Stack stack = new Stack();
    stack = repository.save(stack);
    return toDto(stack);
}
```

### Issue: Controller has @Transactional

**Fix**:
```java
// Before
@POST
@Transactional  // ❌ Remove this
public Response create(@Valid StackCreateDto dto) {
    return Response.ok(service.create(dto)).build();
}

// After
@POST
// ✅ No @Transactional on controllers
public Response create(@Valid StackCreateDto dto) {
    return Response.ok(service.create(dto)).build();
}
```

## Quick Reference

### When to use @Transactional

| Layer | Write Operations | Read Operations |
|-------|-----------------|-----------------|
| Repository | ✅ Yes | ❌ No |
| Service | ✅ Yes | ❌ No |
| Controller | ❌ Never | ❌ Never |
| Health Check | ✅ If DB ops | ❌ No |

### Transaction Boundaries

```
HTTP Request
    ↓
Controller (no transaction)
    ↓
Service (@Transactional starts here)
    ↓
Repository (joins service transaction)
    ↓
Database
```

## Resources

- **Full Guide**: `docs/TRANSACTION_MANAGEMENT_GUIDE.md`
- **Audit Plan**: `TRANSACTION_MANAGEMENT_AUDIT_PLAN.md`
- **Summary**: `TRANSACTION_AUDIT_SUMMARY.md`
- **Steering Rules**: `.kiro/steering/transaction-management.md`

## Time Estimates

- **Automated Scan**: 30 minutes
- **Repository Audit**: 1-2 hours
- **Service Audit**: 1-2 hours
- **Controller Check**: 30 minutes
- **Testing**: 1-2 hours
- **Total**: 4-7 hours

## Questions?

1. Check the Transaction Management Guide first
2. Run the audit script to identify issues
3. Review the patterns in the Audit Plan
4. Monitor connection pool metrics

---

**Start here**: Run `./scripts/audit-transactions.sh` and review the report!
