# Alerting Thresholds for Connection Pool Monitoring

## Overview

This document defines recommended alerting thresholds for connection pool monitoring and transaction management. These thresholds help detect and prevent connection pool exhaustion, identify performance issues, and maintain application health.

## Alert Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **CRITICAL** | Service-impacting issue requiring immediate action | < 5 minutes | Connection pool exhausted |
| **WARNING** | Potential issue that may lead to service impact | < 30 minutes | High pool utilization |
| **INFO** | Informational alert for awareness | < 24 hours | Connection churn rate increased |

## Connection Pool Alerts

### 1. High Pool Utilization (WARNING)

**Condition:** Connection pool utilization exceeds 80%

**Metric:** `connectionPool.active / connectionPool.max > 0.80`

**Threshold:** 
- WARNING: > 80% for 2 consecutive minutes
- CRITICAL: > 90% for 1 minute

**Description:**
The connection pool is nearing capacity. This indicates heavy load or slow queries that are holding connections longer than expected.

**Impact:**
- Increased response times
- Risk of connection pool exhaustion
- Potential request timeouts

**Recommended Actions:**
1. Monitor for connection pool exhaustion
2. Review recent deployments or traffic changes
3. Check for slow queries in database logs
4. Review transaction boundaries in recent code changes
5. Consider scaling up if sustained high load
6. Investigate long-running transactions

**Example Alert Configuration (Prometheus):**
```yaml
- alert: HighConnectionPoolUtilization
  expr: (agroal_active_count / agroal_max_size) * 100 > 80
  for: 2m
  labels:
    severity: warning
    component: database
  annotations:
    summary: "High connection pool utilization ({{ $value }}%)"
    description: "Connection pool utilization is {{ $value }}% on {{ $labels.instance }}"
```

**Example Query:**
```bash
# Check current utilization
curl -s http://localhost:8082/api/q/health/ready | jq '.checks[] | select(.name=="database-postgresql") | (.data."connectionPool.active" / .data."connectionPool.max" * 100)'
```

### 2. Connection Acquisition Timeout (CRITICAL)

**Condition:** Threads are waiting for connections (awaiting count > 0)

**Metric:** `connectionPool.awaiting > 0`

**Threshold:**
- CRITICAL: > 0 for any duration

**Description:**
Application threads are waiting for database connections because the pool is exhausted. This indicates all connections are in use and new requests cannot be served.

**Impact:**
- Request timeouts
- Service degradation or outage
- User-facing errors
- Cascading failures

**Recommended Actions:**
1. **IMMEDIATE:** Check application logs for "acquisition timeout" errors
2. **IMMEDIATE:** Review active connections and long-running queries
3. Identify and terminate long-running transactions if safe
4. Restart application if connections are leaked
5. Review recent code changes for transaction management issues
6. Increase pool size temporarily if needed
7. Conduct post-incident review to identify root cause

**Example Alert Configuration (Prometheus):**
```yaml
- alert: ConnectionPoolExhausted
  expr: agroal_awaiting_count > 0
  for: 30s
  labels:
    severity: critical
    component: database
    page: true
  annotations:
    summary: "Connection pool exhausted - threads waiting"
    description: "{{ $value }} threads are waiting for database connections on {{ $labels.instance }}"
    runbook_url: "https://wiki.example.com/runbooks/connection-pool-exhaustion"
```

**Example Query:**
```bash
# Check for awaiting connections
curl -s http://localhost:8082/api/q/health/ready | jq '.checks[] | select(.name=="database-postgresql") | .data."connectionPool.awaiting"'

# Monitor continuously
watch -n 1 'curl -s http://localhost:8082/api/q/health/ready | jq ".checks[] | select(.name==\"database-postgresql\") | .data.\"connectionPool.awaiting\""'
```

**Troubleshooting Commands:**
```bash
# Check for long-running queries in PostgreSQL
docker exec -it idp-postgres psql -U idp_user -d idp_db -c "
SELECT 
    pid, 
    now() - query_start as duration, 
    state, 
    query 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY duration DESC 
LIMIT 10;"

# Check application logs for timeout errors
grep -i "acquisition timeout" logs/application.log | tail -20

# Review transaction warnings
grep -i "transaction" logs/application.log | tail -20
```

### 3. Long-Running Transactions (WARNING)

**Condition:** Transactions running longer than 30 seconds

**Metric:** Transaction duration > 30 seconds

**Threshold:**
- WARNING: > 30 seconds
- CRITICAL: > 60 seconds

**Description:**
Transactions that run for extended periods hold database connections and can lead to connection pool exhaustion. Long-running transactions may indicate slow queries, external API calls within transactions, or large batch operations.

**Impact:**
- Reduced connection pool availability
- Increased risk of connection exhaustion
- Database lock contention
- Degraded application performance

**Recommended Actions:**
1. Identify the long-running transaction in application logs
2. Review the code for the identified transaction
3. Check for external API calls inside `@Transactional` methods
4. Look for large loops or batch operations inside transactions
5. Optimize slow queries
6. Refactor to chunk work into smaller transactions
7. Move external calls outside transaction boundaries

**Example Alert Configuration (Application Logs):**
```yaml
- alert: LongRunningTransaction
  expr: transaction_duration_seconds > 30
  for: 1m
  labels:
    severity: warning
    component: database
  annotations:
    summary: "Long-running transaction detected"
    description: "Transaction {{ $labels.method }} has been running for {{ $value }}s"
```

**Application Logging:**
Add transaction duration logging in your application:
```java
@Around("@annotation(jakarta.transaction.Transactional)")
public Object logTransactionDuration(ProceedingJoinPoint joinPoint) throws Throwable {
    long start = System.currentTimeMillis();
    try {
        return joinPoint.proceed();
    } finally {
        long duration = System.currentTimeMillis() - start;
        if (duration > 30000) {
            LOG.warnf("Long-running transaction: %s took %dms", 
                joinPoint.getSignature(), duration);
        }
    }
}
```

**Example Query:**
```bash
# Search logs for long-running transaction warnings
grep "Long-running transaction" logs/application.log

# Monitor transaction duration in PostgreSQL
docker exec -it idp-postgres psql -U idp_user -d idp_db -c "
SELECT 
    pid,
    now() - xact_start as transaction_duration,
    query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
  AND now() - xact_start > interval '30 seconds'
ORDER BY transaction_duration DESC;"
```

### 4. Zero Available Connections (CRITICAL)

**Condition:** No connections available in the pool

**Metric:** `connectionPool.available = 0`

**Threshold:**
- CRITICAL: = 0 for 1 minute

**Description:**
All connections in the pool are currently in use. This is a precursor to connection pool exhaustion and indicates the application is at maximum capacity.

**Impact:**
- Imminent connection pool exhaustion
- New requests will wait for connections
- High risk of timeouts

**Recommended Actions:**
1. Monitor `connectionPool.awaiting` metric closely
2. Review active connections and their duration
3. Check for traffic spikes or unusual load patterns
4. Prepare to scale up if needed
5. Review recent deployments for transaction issues

**Example Alert Configuration (Prometheus):**
```yaml
- alert: NoAvailableConnections
  expr: agroal_available_count == 0
  for: 1m
  labels:
    severity: critical
    component: database
  annotations:
    summary: "No available database connections"
    description: "Connection pool has no available connections on {{ $labels.instance }}"
```

### 5. High Connection Churn (INFO)

**Condition:** Connections being created and destroyed frequently

**Metric:** Rate of `connectionPool.created` and `connectionPool.destroyed` increasing rapidly

**Threshold:**
- INFO: > 100 connections created/destroyed per minute

**Description:**
High connection churn indicates connections are being created and destroyed frequently, which may suggest connection instability, network issues, or configuration problems.

**Impact:**
- Increased overhead from connection creation
- Potential performance degradation
- May indicate underlying connectivity issues

**Recommended Actions:**
1. Check database health and network stability
2. Review connection timeout settings
3. Verify database credentials are correct
4. Check for database connection limits being reached
5. Review connection pool configuration

**Example Query:**
```bash
# Monitor connection creation/destruction rate
watch -n 5 'curl -s http://localhost:8082/api/q/health/ready | jq ".checks[] | select(.name==\"database-postgresql\") | .data | {created: .\"connectionPool.created\", destroyed: .\"connectionPool.destroyed\"}"'
```

## Transaction Management Alerts

### 6. Missing Transaction Annotation (CODE REVIEW)

**Condition:** Write operations without `@Transactional` annotation

**Detection:** Code review, audit script, or runtime errors

**Description:**
Repository write methods (save, delete, update) must have `@Transactional` annotation to ensure proper transaction management and connection handling.

**Impact:**
- Potential data inconsistency
- Connection leaks
- Unexpected rollback behavior

**Recommended Actions:**
1. Run transaction audit script: `./scripts/audit-transactions.sh`
2. Review flagged methods
3. Add `@Transactional` annotation to write operations
4. Run integration tests to verify fixes

**Prevention:**
- Include transaction checks in code review checklist
- Run audit script in CI/CD pipeline
- Use IDE inspections to detect missing annotations

### 7. Controller Transaction Anti-Pattern (CODE REVIEW)

**Condition:** `@Transactional` annotation on controller methods

**Detection:** Code review or audit script

**Description:**
Controllers should never manage transactions. Transaction boundaries belong in the service layer where business logic resides.

**Impact:**
- Poor separation of concerns
- Difficult to test and maintain
- Potential for transaction leaks

**Recommended Actions:**
1. Remove `@Transactional` from controller methods
2. Ensure service layer has proper transaction boundaries
3. Verify controllers only handle HTTP concerns

**Prevention:**
- Include in code review checklist
- Run audit script in CI/CD pipeline
- Educate team on clean architecture principles

## Monitoring Dashboard Recommendations

### Essential Panels

1. **Connection Pool Utilization (Line Graph)**
   - Metrics: `active`, `available`, `max`
   - Threshold lines at 80% and 90%
   - Time range: Last 1 hour

2. **Awaiting Connections (Single Stat)**
   - Metric: `awaiting`
   - Alert if > 0
   - Large, prominent display

3. **Connection Pool Health (Gauge)**
   - Metric: `(active / max) * 100`
   - Green: 0-70%
   - Yellow: 70-80%
   - Red: 80-100%

4. **Connection Churn (Line Graph)**
   - Metrics: `created`, `destroyed`
   - Time range: Last 24 hours

5. **Transaction Duration (Histogram)**
   - Metric: Transaction duration percentiles (p50, p95, p99)
   - Threshold line at 30 seconds

### Example Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "IDP API - Connection Pool Monitoring",
    "panels": [
      {
        "title": "Connection Pool Utilization",
        "type": "graph",
        "targets": [
          {
            "expr": "agroal_active_count",
            "legendFormat": "Active"
          },
          {
            "expr": "agroal_available_count",
            "legendFormat": "Available"
          },
          {
            "expr": "agroal_max_size",
            "legendFormat": "Max"
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [16],
                "type": "gt"
              },
              "query": {
                "params": ["A", "5m", "now"]
              }
            }
          ]
        }
      },
      {
        "title": "Awaiting Connections",
        "type": "singlestat",
        "targets": [
          {
            "expr": "agroal_awaiting_count"
          }
        ],
        "thresholds": "1,1",
        "colors": ["green", "red", "red"]
      }
    ]
  }
}
```

## Alert Notification Channels

### Recommended Channels by Severity

| Severity | Channels | Example |
|----------|----------|---------|
| CRITICAL | PagerDuty, Slack, Email, SMS | Connection pool exhausted |
| WARNING | Slack, Email | High pool utilization |
| INFO | Slack (low priority channel) | Connection churn increased |

### Example Slack Alert

```
🔴 CRITICAL: Connection Pool Exhausted
Instance: idp-api-prod-01
Metric: connectionPool.awaiting = 5
Time: 2025-11-09 14:32:15 UTC

Impact: Requests are timing out
Action Required: Investigate long-running transactions

Runbook: https://wiki.example.com/runbooks/connection-pool-exhaustion
Dashboard: https://grafana.example.com/d/connection-pool
```

## Testing Alerts

### Simulate High Utilization

```bash
# Run load test to increase pool utilization
./scripts/load-test.sh

# Monitor metrics
./scripts/monitor-connection-pool.sh
```

### Simulate Connection Exhaustion

```bash
# Reduce pool size temporarily (in application.properties)
quarkus.datasource.jdbc.max-size=5

# Run load test
./scripts/load-test.sh

# Observe awaiting connections
curl -s http://localhost:8082/api/q/health/ready | jq '.checks[] | select(.name=="database-postgresql") | .data."connectionPool.awaiting"'
```

### Verify Alert Delivery

1. Trigger alert condition
2. Verify alert appears in monitoring system
3. Verify notification sent to configured channels
4. Verify alert clears when condition resolves
5. Document any issues with alert configuration

## Alert Tuning

### Reducing False Positives

If alerts are firing too frequently:

1. **Increase threshold:** Adjust percentage or duration
2. **Add duration:** Require condition to persist longer (e.g., "for: 5m")
3. **Add time-of-day filters:** Exclude known high-traffic periods
4. **Adjust baseline:** Re-establish baseline metrics after changes

### Reducing False Negatives

If alerts are not firing when they should:

1. **Decrease threshold:** Lower percentage or duration
2. **Remove duration:** Alert immediately on condition
3. **Add multiple severity levels:** WARNING before CRITICAL
4. **Increase monitoring frequency:** Poll metrics more often

## Runbook Links

Create runbooks for each alert type:

1. **Connection Pool Exhaustion Runbook**
   - Diagnosis steps
   - Immediate mitigation actions
   - Root cause analysis procedures
   - Prevention measures

2. **High Utilization Runbook**
   - Capacity planning guidelines
   - Scaling procedures
   - Performance optimization checklist

3. **Long-Running Transaction Runbook**
   - Transaction identification procedures
   - Code review guidelines
   - Optimization techniques

## Related Documentation

- [CONNECTION_POOL_MONITORING.md](CONNECTION_POOL_MONITORING.md) - How to access and interpret metrics
- [TRANSACTION_MANAGEMENT_GUIDE.md](TRANSACTION_MANAGEMENT_GUIDE.md) - Transaction best practices
- [CONNECTION_POOL_FIX.md](CONNECTION_POOL_FIX.md) - Historical context on connection pool fixes
- [AUDIT_CHECKLIST.md](AUDIT_CHECKLIST.md) - Transaction audit checklist

## Summary

Proper alerting is essential for maintaining application health and preventing connection pool exhaustion. The three critical alerts to implement are:

1. **Pool Utilization > 80%** (WARNING) - Early warning of capacity issues
2. **Awaiting Connections > 0** (CRITICAL) - Immediate action required
3. **Long-Running Transactions > 30s** (WARNING) - Prevent future exhaustion

Configure these alerts in your monitoring system and ensure they are routed to appropriate notification channels based on severity. Regularly review and tune alert thresholds based on observed application behavior and traffic patterns.
