# Connection Pool Monitoring Guide

## Overview

The IDP API exposes connection pool metrics through the health endpoint, allowing real-time monitoring of database connection usage. This guide explains how to access and interpret these metrics for operational monitoring and troubleshooting.

## Health Endpoint

### Endpoint URL

**Development:**
```
http://localhost:8082/api/q/health/ready
```

**Production:**
```
https://<your-domain>/api/q/health/ready
```

### Authentication

The health endpoint is typically accessible without authentication for monitoring purposes. Verify your security configuration if access is restricted.

## Connection Pool Metrics

The health check response includes the following connection pool metrics under the `database-postgresql` check:

### Core Metrics

| Metric | Field Name | Description | Healthy Range |
|--------|-----------|-------------|---------------|
| **Active Connections** | `connectionPool.active` | Number of connections currently in use by application threads | 0 when idle, < 80% of max under load |
| **Available Connections** | `connectionPool.available` | Number of connections ready for use in the pool | High when idle, > 20% of max under load |
| **Awaiting Connections** | `connectionPool.awaiting` | Number of threads waiting for a connection | Should always be 0 |
| **Max Pool Size** | `connectionPool.max` | Maximum number of connections allowed in the pool | Configured value (default: 20) |
| **Max Used** | `connectionPool.maxUsed` | Peak number of connections used since startup | Should be < 80% of max |
| **Created** | `connectionPool.created` | Total connections created since startup | Increases over time |
| **Destroyed** | `connectionPool.destroyed` | Total connections destroyed since startup | Should be low |

### Example Response

```json
{
  "status": "UP",
  "checks": [
    {
      "name": "database-postgresql",
      "status": "UP",
      "data": {
        "provider": "postgresql",
        "stackCount": 6,
        "connectionPool.active": 2,
        "connectionPool.available": 18,
        "connectionPool.max": 20,
        "connectionPool.maxUsed": 5,
        "connectionPool.awaiting": 0,
        "connectionPool.created": 20,
        "connectionPool.destroyed": 0,
        "database.version": "17.6",
        "database.product": "PostgreSQL",
        "driver.version": "42.7.7",
        "database.url": "jdbc:postgresql://localhost:5432/idp_db"
      }
    }
  ]
}
```

## Accessing Metrics

### Using curl

```bash
# Basic request
curl http://localhost:8082/api/q/health/ready

# Pretty-printed JSON
curl -s http://localhost:8082/api/q/health/ready | jq '.'

# Extract specific metric
curl -s http://localhost:8082/api/q/health/ready | jq '.checks[] | select(.name=="database-postgresql") | .data."connectionPool.active"'

# Monitor continuously (every 5 seconds)
watch -n 5 'curl -s http://localhost:8082/api/q/health/ready | jq ".checks[] | select(.name==\"database-postgresql\") | .data | {active: .\"connectionPool.active\", available: .\"connectionPool.available\", awaiting: .\"connectionPool.awaiting\"}"'
```

### Using Monitoring Script

A dedicated monitoring script is available for continuous observation:

```bash
# Run the monitoring script
./scripts/monitor-connection-pool.sh

# Monitor during load testing
./scripts/monitor-connection-pool.sh > connection-pool-metrics.log &
./scripts/load-test.sh
```

### Using Browser

Navigate to the health endpoint URL in your browser:
```
http://localhost:8082/api/q/health/ready
```

For better readability, use a JSON formatter browser extension.

## Interpreting Metrics

### Healthy State (Idle)

When the application is idle with no active requests:
- `active`: 0-2 (minimal background activity)
- `available`: 18-20 (most connections available)
- `awaiting`: 0 (no threads waiting)

### Healthy State (Under Load)

When the application is processing requests:
- `active`: < 16 (< 80% of max pool size)
- `available`: > 4 (> 20% of max pool size)
- `awaiting`: 0 (no threads waiting)

### Warning Signs

| Symptom | Metric Values | Likely Cause | Action |
|---------|--------------|--------------|--------|
| High utilization | `active` > 16 (80% of max) | Heavy load or slow queries | Monitor for exhaustion, consider scaling |
| Pool exhaustion | `awaiting` > 0 | All connections in use | Investigate long-running transactions |
| Connection leaks | `active` stays high when idle | Connections not released | Review transaction boundaries |
| High churn | `destroyed` increasing rapidly | Connection errors or timeouts | Check database health and network |

### Critical Issues

| Issue | Metric Values | Impact | Immediate Action |
|-------|--------------|--------|------------------|
| **Pool Exhausted** | `awaiting` > 0, `available` = 0 | Requests timing out | Restart application, investigate root cause |
| **All Connections Active** | `active` = `max`, `available` = 0 | Degraded performance | Scale up or fix long transactions |
| **Persistent Awaiting** | `awaiting` > 0 for > 30 seconds | Service outage | Emergency intervention required |

## Monitoring Best Practices

### 1. Continuous Monitoring

Set up automated monitoring to track connection pool metrics:

```bash
# Example: Log metrics every minute
while true; do
  echo "$(date): $(curl -s http://localhost:8082/api/q/health/ready | jq -c '.checks[] | select(.name=="database-postgresql") | .data | {active, available, awaiting}')"
  sleep 60
done >> connection-pool-monitoring.log
```

### 2. Alerting Thresholds

Configure alerts for the following conditions:
- `connectionPool.active` > 16 (80% utilization) - WARNING
- `connectionPool.awaiting` > 0 - CRITICAL
- `connectionPool.available` = 0 - CRITICAL
- Long-running transactions > 30 seconds - WARNING

See [ALERTING_THRESHOLDS.md](ALERTING_THRESHOLDS.md) for detailed alerting configuration.

### 3. Load Testing

Always monitor connection pool metrics during load testing:

```bash
# Start monitoring
./scripts/monitor-connection-pool.sh > load-test-metrics.log &
MONITOR_PID=$!

# Run load test
./scripts/load-test.sh

# Stop monitoring
kill $MONITOR_PID

# Analyze results
cat load-test-metrics.log | grep "awaiting" | grep -v "awaiting: 0"
```

### 4. Baseline Establishment

Establish baseline metrics for your application:
1. Monitor during normal operation for 24 hours
2. Record peak `active` connections
3. Calculate average utilization percentage
4. Set alert thresholds based on observed patterns

## Integration with Monitoring Systems

### Prometheus

The metrics endpoint exposes Prometheus-compatible metrics:

```
http://localhost:8082/api/q/metrics
```

Example Prometheus queries:
```promql
# Connection pool utilization percentage
(agroal_active_count / agroal_max_size) * 100

# Awaiting connections (should always be 0)
agroal_awaiting_count

# Available connections
agroal_available_count
```

### Grafana Dashboard

Create a Grafana dashboard with the following panels:
1. **Connection Pool Utilization** - Line graph of active/available/max over time
2. **Awaiting Connections** - Single stat showing current awaiting count (alert if > 0)
3. **Connection Churn** - Line graph of created/destroyed over time
4. **Pool Health Score** - Gauge showing utilization percentage

### Application Logs

Connection pool issues are also logged:

```bash
# Watch for connection pool warnings
tail -f logs/application.log | grep -i "connection\|pool\|acquisition"

# Search for timeout errors
grep "acquisition timeout" logs/application.log
```

## Troubleshooting

### Issue: High Active Connections When Idle

**Symptoms:**
- `active` > 5 when no requests are being processed
- `active` doesn't decrease after load stops

**Diagnosis:**
```bash
# Check for long-running transactions
curl -s http://localhost:8082/api/q/health/ready | jq '.checks[] | select(.name=="database-postgresql") | .data."connectionPool.active"'

# Review application logs for transaction warnings
grep "transaction" logs/application.log | tail -20
```

**Resolution:**
1. Review recent code changes for missing `@Transactional` annotations
2. Check for transactions not being committed/rolled back
3. Verify no blocking operations inside transactions
4. Restart application if connections are leaked

### Issue: Awaiting Connections > 0

**Symptoms:**
- `awaiting` > 0
- Slow response times or timeouts
- "Connection acquisition timeout" errors in logs

**Diagnosis:**
```bash
# Monitor awaiting count
watch -n 1 'curl -s http://localhost:8082/api/q/health/ready | jq ".checks[] | select(.name==\"database-postgresql\") | .data.\"connectionPool.awaiting\""'

# Check for long-running queries in PostgreSQL
docker exec -it idp-postgres psql -U idp_user -d idp_db -c "SELECT pid, now() - query_start as duration, state, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;"
```

**Resolution:**
1. Identify and terminate long-running transactions
2. Optimize slow queries
3. Increase pool size if consistently hitting limit under normal load
4. Review transaction boundaries in code

### Issue: High Connection Churn

**Symptoms:**
- `destroyed` count increasing rapidly
- `created` count increasing rapidly
- Frequent connection errors in logs

**Diagnosis:**
```bash
# Monitor creation/destruction rate
watch -n 5 'curl -s http://localhost:8082/api/q/health/ready | jq ".checks[] | select(.name==\"database-postgresql\") | .data | {created: .\"connectionPool.created\", destroyed: .\"connectionPool.destroyed\"}"'
```

**Resolution:**
1. Check database health and network stability
2. Review connection timeout settings
3. Verify database credentials are correct
4. Check for database connection limits being reached

## Configuration

Connection pool settings are configured in `application.properties`:

```properties
# Maximum pool size (default: 20)
quarkus.datasource.jdbc.max-size=20

# Minimum pool size (default: 0)
quarkus.datasource.jdbc.min-size=0

# Connection acquisition timeout (default: 5 seconds)
quarkus.datasource.jdbc.acquisition-timeout=5

# Connection validation timeout (default: 5 seconds)
quarkus.datasource.jdbc.validation-query-sql=SELECT 1

# Idle timeout (default: 30 minutes)
quarkus.datasource.jdbc.idle-removal-interval=30M
```

Adjust these settings based on your application's needs and observed metrics.

## Related Documentation

- [ALERTING_THRESHOLDS.md](ALERTING_THRESHOLDS.md) - Recommended alerting configuration
- [TRANSACTION_MANAGEMENT_GUIDE.md](TRANSACTION_MANAGEMENT_GUIDE.md) - Transaction best practices
- [CONNECTION_POOL_FIX.md](CONNECTION_POOL_FIX.md) - Historical context on connection pool fixes
- [AUDIT_CHECKLIST.md](AUDIT_CHECKLIST.md) - Transaction audit checklist

## Summary

The IDP API provides comprehensive connection pool monitoring through the health endpoint. Regular monitoring of these metrics helps prevent connection pool exhaustion, identify performance issues, and maintain application health. Always monitor connection pool metrics during load testing and production deployments.
