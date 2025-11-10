# Design Document

## Overview

This design outlines the approach for completing the transaction management audit of the IDP API backend. The audit will systematically review all code components to ensure proper transaction management patterns, prevent connection pool exhaustion, and establish maintainable coding standards. The design leverages existing audit tooling and documentation while defining a structured workflow for manual review, automated scanning, testing, and validation.

## Architecture

### Audit Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Audit Workflow                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Automated Scanning                                 │
│  - Execute audit script                                      │
│  - Generate findings report                                  │
│  - Categorize issues by severity                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Manual Repository Review                          │
│  - Review 13 PostgreSQL repositories                        │
│  - Verify write operations have @Transactional             │
│  - Verify read operations lack @Transactional              │
│  - Document findings                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: Manual Service Review                             │
│  - Review 6 service classes                                 │
│  - Verify transaction boundaries                            │
│  - Check for long-running transactions                      │
│  - Document findings                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: Controller Spot Check                             │
│  - Review 3+ controller classes                             │
│  - Verify no @Transactional annotations                     │
│  - Confirm delegation to services                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 5: Issue Remediation                                 │
│  - Fix identified issues                                    │
│  - Apply consistent patterns                                │
│  - Update code following guidelines                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 6: Testing & Validation                              │
│  - Run integration tests                                    │
│  - Execute load tests                                       │
│  - Monitor connection pool metrics                          │
│  - Verify success criteria                                  │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    IDP API Application                       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Controllers  │   │  Services    │   │ Repositories │
│ (No TX)      │   │  (TX Layer)  │   │ (TX Methods) │
└──────────────┘   └──────────────┘   └──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │  Database    │
                   │ (PostgreSQL) │
                   └──────────────┘
```

## Components and Interfaces

### 1. Audit Script Component

**Purpose**: Automated scanning tool to identify transaction management issues

**Location**: `idp-api/scripts/audit-transactions.sh`

**Capabilities**:
- Scans for write operations without `@Transactional`
- Detects controllers with `@Transactional` (anti-pattern)
- Identifies read-only repository methods with unnecessary `@Transactional`
- Checks health checks for proper transaction handling
- Detects scheduled jobs and async operations
- Generates comprehensive report file

**Output**: `transaction-audit-report.txt` with categorized findings

**Enhancement Needed**: None - script is complete and functional

### 2. Repository Review Component

**Target Files** (13 PostgreSQL repositories):
- PostgresAdminAuditLogRepository.java
- PostgresApiKeyRepository.java
- PostgresBlueprintResourceRepository.java
- PostgresCategoryRepository.java
- PostgresDomainRepository.java
- PostgresEnvironmentConfigRepository.java
- PostgresEnvironmentEntityRepository.java
- PostgresPropertySchemaRepository.java
- PostgresResourceTypeCloudMappingRepository.java
- PostgresResourceTypeRepository.java
- PostgresStackCollectionRepository.java
- PostgresStackResourceRepository.java
- PostgresTeamRepository.java (already verified)

**Review Checklist Per File**:
1. Verify `save()` method has `@Transactional`
2. Verify `delete()` method has `@Transactional`
3. Verify `findById()` does NOT have `@Transactional`
4. Verify `findAll()` does NOT have `@Transactional`
5. Verify `count()` does NOT have `@Transactional`
6. Verify `exists()` does NOT have `@Transactional`
7. Check for any custom write methods needing `@Transactional`

**Expected Pattern**:
```java
@ApplicationScoped
public class PostgresXxxRepository implements XxxRepository {
    
    @Override
    @Transactional  // Required
    public Xxx save(Xxx entity) {
        entity.persist();
        return entity;
    }
    
    @Override
    @Transactional  // Required
    public void delete(Xxx entity) {
        entity.delete();
    }
    
    @Override
    // No @Transactional - Panache handles it
    public Optional<Xxx> findById(UUID id) {
        return Optional.ofNullable(Xxx.findById(id));
    }
}
```

### 3. Service Review Component

**Target Files** (6 service classes):
- AdminDashboardService.java
- ApiKeyService.java
- CloudProviderService.java
- PropertySchemaService.java
- ResourceTypeCloudMappingService.java
- ResourceTypeService.java

**Review Checklist Per File**:
1. Verify create methods have `@Transactional`
2. Verify update methods have `@Transactional`
3. Verify delete methods have `@Transactional`
4. Verify read-only methods do NOT have `@Transactional`
5. Check for external API calls inside `@Transactional` methods (anti-pattern)
6. Check for long-running loops inside `@Transactional` methods (anti-pattern)
7. Verify proper exception handling for rollback scenarios

**Expected Pattern**:
```java
@ApplicationScoped
public class XxxService {
    
    @Transactional  // Required for writes
    public XxxDto create(XxxCreateDto dto) {
        Xxx entity = new Xxx();
        // Business logic
        entity = repository.save(entity);
        return toDto(entity);
    }
    
    // No @Transactional for reads
    public XxxDto getById(UUID id) {
        return repository.findById(id)
            .map(this::toDto)
            .orElseThrow();
    }
}
```

### 4. Controller Spot Check Component

**Target Files** (minimum 3 controllers):
- BlueprintsController.java
- CloudProvidersController.java
- TeamsController.java
- Additional controllers as needed

**Review Checklist Per File**:
1. Verify NO `@Transactional` annotations on any method
2. Verify all business logic is delegated to services
3. Verify controllers only handle HTTP concerns (request/response)
4. Check for any direct database operations (anti-pattern)

**Expected Pattern**:
```java
@Path("/v1/xxx")
@Authenticated
public class XxxController {
    
    @Inject
    XxxService service;
    
    // No @Transactional on controllers
    @POST
    public Response create(@Valid XxxCreateDto dto) {
        XxxDto result = service.create(dto);
        return Response.status(201).entity(result).build();
    }
}
```

### 5. Testing Component

**Integration Tests**:
- Location: `idp-api/src/test/java`
- Execute: `./mvnw test`
- Verify: All tests pass with no connection-related failures

**Load Tests**:
- Tool: Apache Bench or curl loops
- Target: 100+ concurrent requests
- Monitor: Connection pool metrics during load
- Success: Pool utilization stays below 80%

**Health Check Monitoring**:
- Endpoint: `/api/q/health/ready`
- Metrics to verify:
  - `connectionPool.active` - should be low when idle
  - `connectionPool.available` - should be high when idle
  - `connectionPool.awaiting` - should be 0
  - No acquisition timeout errors in logs

### 6. Documentation Component

**Existing Documentation** (already created):
- `AUDIT_CHECKLIST.md` - Quick start guide
- `TRANSACTION_AUDIT_SUMMARY.md` - Executive overview
- `TRANSACTION_MANAGEMENT_AUDIT_PLAN.md` - Detailed plan
- `docs/TRANSACTION_MANAGEMENT_GUIDE.md` - Developer guide
- `CONNECTION_POOL_FIX.md` - Fix explanation
- `.kiro/steering/transaction-management.md` - Coding standards
- `README_TRANSACTION_AUDIT.md` - Documentation index

**No Additional Documentation Needed**: All documentation is complete

## Data Models

### Audit Findings Model

```typescript
interface AuditFinding {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  category: 'MISSING_TRANSACTION' | 'UNNECESSARY_TRANSACTION' | 
            'ANTI_PATTERN' | 'LONG_RUNNING_TRANSACTION';
  file: string;
  lineNumber: number;
  method: string;
  description: string;
  remediation: string;
}
```

### Audit Report Model

```typescript
interface AuditReport {
  timestamp: Date;
  totalFiles: number;
  filesScanned: number;
  findings: AuditFinding[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  repositoriesReviewed: string[];
  servicesReviewed: string[];
  controllersReviewed: string[];
}
```

### Connection Pool Metrics Model

```typescript
interface ConnectionPoolMetrics {
  active: number;
  available: number;
  awaiting: number;
  maxSize: number;
  minSize: number;
  acquisitionTimeout: number;
  utilizationPercent: number;
}
```

## Error Handling

### Audit Script Error Handling

1. **File Not Found**: Script continues scanning, logs warning
2. **Permission Denied**: Script skips file, logs warning
3. **Invalid Java Syntax**: Script continues, flags file for manual review
4. **Report Write Failure**: Script outputs to console only

### Code Fix Error Handling

1. **Missing @Transactional on Write**: Add annotation, verify with tests
2. **Unnecessary @Transactional on Read**: Remove annotation, verify with tests
3. **@Transactional on Controller**: Remove annotation, ensure service has it
4. **Long-Running Transaction**: Refactor to chunk work or move external calls outside transaction

### Testing Error Handling

1. **Integration Test Failure**: Review stack trace, fix root cause, re-run
2. **Connection Pool Exhaustion**: Review transaction boundaries, check for leaks
3. **Health Check Failure**: Verify database connectivity, check transaction handling
4. **Load Test Timeout**: Increase timeout or optimize slow queries

## Testing Strategy

### Phase 1: Automated Scanning Test
- **Action**: Execute `./scripts/audit-transactions.sh`
- **Expected**: Report generated with categorized findings
- **Validation**: Review report for accuracy, no false positives

### Phase 2: Repository Review Test
- **Action**: Manually review each repository against checklist
- **Expected**: All repositories follow expected pattern
- **Validation**: Document any deviations, create fix list

### Phase 3: Service Review Test
- **Action**: Manually review each service against checklist
- **Expected**: All services have proper transaction boundaries
- **Validation**: Document any deviations, create fix list

### Phase 4: Controller Spot Check Test
- **Action**: Review 3+ controllers for anti-patterns
- **Expected**: No controllers have @Transactional
- **Validation**: Confirm delegation to services

### Phase 5: Integration Test
- **Action**: Run `./mvnw test`
- **Expected**: All tests pass
- **Validation**: Zero connection-related failures

### Phase 6: Load Test
- **Action**: Execute 100+ concurrent requests
- **Expected**: Connection pool utilization < 80%
- **Validation**: Monitor metrics, check logs for errors

### Phase 7: Health Check Test
- **Action**: Query `/api/q/health/ready` during load
- **Expected**: Health check passes, metrics show healthy pool
- **Validation**: Verify active/available/awaiting counts

### Phase 8: Soak Test (Optional)
- **Action**: Run application under normal load for 1 hour
- **Expected**: Zero connection pool exhaustion errors
- **Validation**: Review logs, check metrics over time

## Implementation Approach

### Workflow Sequence

1. **Execute Automated Scan** (30 minutes)
   - Run audit script
   - Review generated report
   - Categorize findings by priority

2. **Review Repositories** (1-2 hours)
   - Open each repository file
   - Apply checklist
   - Document findings in tracking sheet
   - Create list of fixes needed

3. **Review Services** (1-2 hours)
   - Open each service file
   - Apply checklist
   - Check for long-running transactions
   - Document findings in tracking sheet
   - Create list of fixes needed

4. **Spot Check Controllers** (30 minutes)
   - Open 3+ controller files
   - Verify no @Transactional
   - Confirm delegation pattern
   - Document findings

5. **Apply Fixes** (1-2 hours)
   - Add missing @Transactional annotations
   - Remove unnecessary @Transactional annotations
   - Refactor long-running transactions
   - Follow coding guidelines

6. **Run Tests** (1-2 hours)
   - Execute integration tests
   - Fix any test failures
   - Run load tests
   - Monitor connection pool

7. **Validate Success** (30 minutes)
   - Verify all success criteria met
   - Review metrics
   - Check logs for errors
   - Document completion

### Tracking Mechanism

Create a simple tracking spreadsheet or markdown file:

```markdown
# Transaction Audit Tracking

## Repositories (13 total)
- [ ] PostgresAdminAuditLogRepository.java - Status: Not Started
- [ ] PostgresApiKeyRepository.java - Status: Not Started
...

## Services (6 total)
- [ ] AdminDashboardService.java - Status: Not Started
...

## Controllers (3+ total)
- [ ] BlueprintsController.java - Status: Not Started
...

## Findings
| File | Issue | Severity | Fix Applied |
|------|-------|----------|-------------|
| ... | ... | ... | ... |
```

### Success Criteria Validation

Before marking audit complete, verify:
- ✅ All 13 repositories reviewed and compliant
- ✅ All 6 services reviewed and compliant
- ✅ At least 3 controllers verified compliant
- ✅ Audit script runs without errors
- ✅ Integration tests pass 100%
- ✅ Load test shows pool utilization < 80%
- ✅ Health checks pass consistently
- ✅ Zero connection pool errors in 1-hour soak test
- ✅ All findings documented and resolved

## Design Decisions and Rationales

### Decision 1: Use Existing Audit Script
**Rationale**: Script is already comprehensive and functional. No need to rewrite or enhance. Focus effort on manual review and fixes.

### Decision 2: Manual Review Over Full Automation
**Rationale**: Transaction management requires understanding business logic context. Automated tools can flag potential issues, but human review is needed to confirm and apply appropriate fixes.

### Decision 3: Service Layer Transaction Boundaries
**Rationale**: Following clean architecture principles, transactions should start at the service layer where business logic resides, not in controllers (too high) or repositories (too low).

### Decision 4: No @Transactional on Panache Read Operations
**Rationale**: Panache automatically manages read-only operations efficiently. Adding @Transactional adds overhead without benefit and can hold connections unnecessarily.

### Decision 5: Spot Check Controllers Instead of Full Review
**Rationale**: Controllers should never have @Transactional. If a few are verified clean, the pattern is likely consistent. Full review is low value given the clear anti-pattern.

### Decision 6: Prioritize Repositories and Services
**Rationale**: These layers contain the actual transaction management code. Issues here directly cause connection pool problems. Controllers are lower risk.

### Decision 7: Load Testing Before Completion
**Rationale**: Connection pool issues often only manifest under load. Load testing validates that fixes work in realistic conditions, not just in isolated tests.

### Decision 8: 80% Pool Utilization Threshold
**Rationale**: Provides safety margin for traffic spikes. If pool regularly exceeds 80%, it indicates insufficient capacity or connection leaks.

## Monitoring and Validation

### Real-Time Monitoring
- Health endpoint: `/api/q/health/ready`
- Metrics endpoint: `/api/q/metrics`
- Application logs: Watch for acquisition timeout errors

### Post-Audit Monitoring
- Set up alerts for pool utilization > 80%
- Monitor transaction duration (p95, p99)
- Track connection acquisition time
- Log long-running transactions (> 30 seconds)

### Continuous Validation
- Add transaction checks to code review checklist
- Include connection pool metrics in CI/CD pipeline
- Run load tests in staging before production deploys
- Review connection pool metrics weekly

## Conclusion

This design provides a structured, systematic approach to completing the transaction management audit. By leveraging existing tooling and documentation, focusing manual effort on high-value reviews, and validating with comprehensive testing, the audit will ensure proper transaction management across the IDP API codebase and prevent future connection pool exhaustion issues.
