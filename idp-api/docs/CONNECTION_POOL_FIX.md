# Database Connection Pool Exhaustion Fix

## Problem
The application was experiencing connection pool exhaustion with errors:
```
Sorry, acquisition timeout!
Unable to acquire JDBC Connection
```

## Root Causes

1. **Missing Transaction Management**: The `DatabaseHealthCheck.call()` method was performing database operations without `@Transactional`, causing connections to not be properly released.

2. **Aggressive Pool Settings**: 
   - Small pool size (16 connections)
   - Short acquisition timeout (10 seconds)
   - Long max lifetime (30 minutes) causing stale connections

## Changes Made

### 1. Added Transaction Management
Added `@Transactional` annotation to `DatabaseHealthCheck.call()` method to ensure connections are properly managed and released after health checks.

### 2. Improved Connection Pool Configuration
Updated `application.properties` with more resilient settings:

```properties
# Before
quarkus.datasource.jdbc.max-size=16
quarkus.datasource.jdbc.min-size=2
quarkus.datasource.jdbc.acquisition-timeout=10
quarkus.datasource.jdbc.idle-removal-interval=5M
quarkus.datasource.jdbc.max-lifetime=30M
quarkus.datasource.jdbc.leak-detection-interval=10M

# After
quarkus.datasource.jdbc.max-size=20
quarkus.datasource.jdbc.min-size=5
quarkus.datasource.jdbc.acquisition-timeout=30
quarkus.datasource.jdbc.idle-removal-interval=2M
quarkus.datasource.jdbc.max-lifetime=15M
quarkus.datasource.jdbc.leak-detection-interval=5M
quarkus.datasource.jdbc.background-validation-interval=2M
```

**Key improvements:**
- Increased max pool size from 16 to 20
- Increased min pool size from 2 to 5 (reduces connection creation overhead)
- Increased acquisition timeout from 10s to 30s (more tolerance for spikes)
- Reduced max lifetime from 30M to 15M (faster connection recycling)
- Reduced idle removal interval from 5M to 2M (faster cleanup)
- Reduced leak detection from 10M to 5M (faster leak identification)
- Added background validation every 2M (proactive connection health checks)

## Next Steps

1. **Restart the application** to apply the changes:
   ```bash
   # Stop Quarkus dev mode (Ctrl+C)
   # Restart
   ./mvnw quarkus:dev
   ```

2. **Monitor the logs** - you should no longer see acquisition timeout errors

3. **Check health endpoint** after restart:
   ```bash
   curl http://localhost:8082/api/q/health
   ```

4. **If issues persist**, check for:
   - Connection leaks in other parts of the code
   - PostgreSQL max_connections setting (default is 100)
   - Long-running queries blocking connections

## Monitoring Connection Pool

You can monitor pool health via the health check endpoint which now includes:
- Active connections
- Available connections
- Awaiting connections
- Created/destroyed connection counts

Access at: `http://localhost:8082/api/q/health/ready`
