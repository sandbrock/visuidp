# Database Troubleshooting Guide

## Overview

This guide provides solutions to common issues when working with the IDP API's multi-database support. It covers configuration errors, connectivity problems, and debugging techniques for both PostgreSQL and DynamoDB implementations.

**Quick Navigation:**
- [Configuration Errors](#configuration-errors)
- [PostgreSQL Issues](#postgresql-issues)
- [DynamoDB Issues](#dynamodb-issues)
- [Health Check Interpretation](#health-check-interpretation)
- [Debugging Tips](#debugging-tips)
- [Performance Issues](#performance-issues)

## Configuration Errors

### Error: "No qualifying bean found for type Repository"

**Symptom:**
```
javax.enterprise.inject.UnsatisfiedResolutionException: 
No qualifying bean found for type com.angryss.idp.domain.repositories.StackRepository
```

**Cause:** The `idp.database.provider` configuration property is missing or set to an invalid value.

**Solution:**

1. Check that `idp.database.provider` is set in your configuration:
   ```properties
   idp.database.provider=postgresql  # or dynamodb
   ```

2. Verify the value is exactly `postgresql` or `dynamodb` (case-sensitive)

3. If using environment variables, ensure they're properly set:
   ```bash
   export IDP_DATABASE_PROVIDER=postgresql
   ```

4. Check application startup logs for configuration loading:
   ```
   INFO  [com.ang.idp.inf.per.con.DatabaseProviderConfig] Database provider: postgresql
   ```

**Prevention:** Always set `idp.database.provider` in your configuration files or environment variables.

---

### Error: "Invalid database provider configuration"

**Symptom:**
```
java.lang.IllegalStateException: Invalid database provider: mysql
Supported providers: postgresql, dynamodb
```

**Cause:** The configured database provider is not supported.

**Solution:**

1. Change `idp.database.provider` to either `postgresql` or `dynamodb`
2. Verify spelling and case (must be lowercase)
3. Remove any extra whitespace or special characters

**Valid Configuration:**
```properties
# Correct
idp.database.provider=postgresql
idp.database.provider=dynamodb

# Incorrect
idp.database.provider=PostgreSQL  # Wrong case
idp.database.provider=postgres    # Wrong value
idp.database.provider= postgresql # Extra space
```

---

### Error: "Missing required configuration properties"

**Symptom (PostgreSQL):**
```
Configuration validation failed: Missing required PostgreSQL configuration
Required properties: quarkus.datasource.jdbc.url, quarkus.datasource.username, quarkus.datasource.password
```

**Symptom (DynamoDB):**
```
Configuration validation failed: Missing required DynamoDB configuration
Required properties: idp.database.dynamodb.region
```

**Cause:** Required database-specific configuration properties are not set.

**Solution for PostgreSQL:**

1. Add all required PostgreSQL properties:
   ```properties
   idp.database.provider=postgresql
   quarkus.datasource.db-kind=postgresql
   quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/idp_db
   quarkus.datasource.username=idp_user
   quarkus.datasource.password=your_password
   ```

2. Or use environment variables:
   ```bash
   export IDP_DATABASE_PROVIDER=postgresql
   export QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://localhost:5432/idp_db
   export QUARKUS_DATASOURCE_USERNAME=idp_user
   export QUARKUS_DATASOURCE_PASSWORD=your_password
   ```

**Solution for DynamoDB:**

1. Add required DynamoDB properties:
   ```properties
   idp.database.provider=dynamodb
   idp.database.dynamodb.region=us-east-1
   ```

2. For local development, also add endpoint:
   ```properties
   idp.database.dynamodb.endpoint=http://localhost:8000
   ```

3. Or use environment variables:
   ```bash
   export IDP_DATABASE_PROVIDER=dynamodb
   export IDP_DATABASE_DYNAMODB_REGION=us-east-1
   export IDP_DATABASE_DYNAMODB_ENDPOINT=http://localhost:8000
   ```

**Prevention:** Use configuration templates from [Database Configuration Guide](DATABASE_CONFIGURATION.md).

---

## PostgreSQL Issues

### Error: "Connection refused" or "Could not connect to database"

**Symptom:**
```
org.postgresql.util.PSQLException: Connection to localhost:5432 refused
```

**Cause:** PostgreSQL server is not running or not accessible.

**Diagnosis Steps:**

1. Check if PostgreSQL is running:
   ```bash
   # Using Docker
   docker ps | grep postgres
   
   # Using systemd
   sudo systemctl status postgresql
   
   # Using pg_isready
   pg_isready -h localhost -p 5432
   ```

2. Test connectivity:
   ```bash
   psql -h localhost -U idp_user -d idp_db -c "SELECT 1"
   ```

3. Check network connectivity:
   ```bash
   telnet localhost 5432
   # or
   nc -zv localhost 5432
   ```

**Solutions:**

**If PostgreSQL is not running:**
```bash
# Docker Compose
cd idp-api
docker compose up -d postgres

# Systemd
sudo systemctl start postgresql
```

**If PostgreSQL is running but not accessible:**

1. Check `postgresql.conf` for `listen_addresses`:
   ```conf
   listen_addresses = '*'  # or specific IP
   ```

2. Check `pg_hba.conf` for connection rules:
   ```conf
   host    idp_db    idp_user    0.0.0.0/0    scram-sha-256
   ```

3. Restart PostgreSQL after changes:
   ```bash
   sudo systemctl restart postgresql
   ```

**If using Docker and connection still fails:**

1. Check Docker network:
   ```bash
   docker network ls
   docker network inspect idp-api_default
   ```

2. Verify container is on correct network:
   ```bash
   docker inspect idp-postgres | grep NetworkMode
   ```

3. Use container name instead of localhost:
   ```properties
   quarkus.datasource.jdbc.url=jdbc:postgresql://postgres:5432/idp_db
   ```

---

### Error: "Authentication failed for user"

**Symptom:**
```
org.postgresql.util.PSQLException: FATAL: password authentication failed for user "idp_user"
```

**Cause:** Incorrect username or password.

**Solutions:**

1. Verify credentials in configuration match database:
   ```bash
   # Test with psql
   psql -h localhost -U idp_user -d idp_db
   ```

2. Reset password if needed:
   ```sql
   -- Connect as postgres superuser
   sudo -u postgres psql
   
   -- Reset password
   ALTER USER idp_user WITH PASSWORD 'new_password';
   ```

3. Check environment variable is set correctly:
   ```bash
   echo $QUARKUS_DATASOURCE_PASSWORD
   ```

4. Verify no extra whitespace in password:
   ```bash
   # Incorrect
   export QUARKUS_DATASOURCE_PASSWORD=" password "
   
   # Correct
   export QUARKUS_DATASOURCE_PASSWORD="password"
   ```

---

### Error: "Database does not exist"

**Symptom:**
```
org.postgresql.util.PSQLException: FATAL: database "idp_db" does not exist
```

**Cause:** The database has not been created.

**Solution:**

1. Create the database:
   ```bash
   # Using psql
   sudo -u postgres psql -c "CREATE DATABASE idp_db;"
   
   # Or connect and create
   sudo -u postgres psql
   CREATE DATABASE idp_db;
   GRANT ALL PRIVILEGES ON DATABASE idp_db TO idp_user;
   ```

2. For Docker Compose, ensure environment variables are set:
   ```yaml
   postgres:
     environment:
       POSTGRES_DB: idp_db
       POSTGRES_USER: idp_user
       POSTGRES_PASSWORD: idp_password
   ```

---

### Error: "Flyway migration failed"

**Symptom:**
```
org.flywaydb.core.api.FlywayException: Validate failed: 
Migration checksum mismatch for migration version 1
```

**Cause:** Migration files have been modified after being applied, or database schema is out of sync.

**Solutions:**

**Option 1: Repair Flyway schema history (if migration files are correct):**
```bash
./mvnw flyway:repair
```

**Option 2: Clean and re-migrate (development only - destroys data):**
```bash
./mvnw flyway:clean flyway:migrate
```

**Option 3: Baseline existing database:**
```bash
./mvnw flyway:baseline
./mvnw flyway:migrate
```

**Option 4: Reset database completely (development only):**
```bash
# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE idp_db;"
sudo -u postgres psql -c "CREATE DATABASE idp_db;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE idp_db TO idp_user;"

# Restart application (migrations run automatically)
./mvnw quarkus:dev
```

**Prevention:**
- Never modify migration files after they've been applied
- Use new migration files for schema changes (V3__, V4__, etc.)
- Keep migration files in version control

---

### Error: "Connection pool exhausted"

**Symptom:**
```
java.sql.SQLTransientConnectionException: HikariPool-1 - Connection is not available, 
request timed out after 30000ms
```

**Cause:** All database connections are in use and none are available.

**Diagnosis:**

1. Check current connection pool settings:
   ```properties
   quarkus.datasource.jdbc.min-size=5
   quarkus.datasource.jdbc.max-size=20
   ```

2. Check for connection leaks in application logs

3. Monitor active connections:
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'idp_db';
   ```

**Solutions:**

1. Increase connection pool size:
   ```properties
   quarkus.datasource.jdbc.max-size=50
   ```

2. Reduce connection acquisition timeout:
   ```properties
   quarkus.datasource.jdbc.acquisition-timeout=10
   ```

3. Enable connection validation:
   ```properties
   quarkus.datasource.jdbc.validation-query-sql=SELECT 1
   ```

4. Check for long-running transactions in code
5. Ensure `@Transactional` methods complete quickly
6. Review application for connection leaks

---

## DynamoDB Issues

### Error: "Unable to load credentials from any provider"

**Symptom:**
```
software.amazon.awssdk.core.exception.SdkClientException: 
Unable to load credentials from any of the providers in the chain
```

**Cause:** AWS credentials are not configured or IAM role is not attached.

**Solutions:**

**For Local Development:**

1. Set dummy credentials (DynamoDB Local doesn't validate):
   ```bash
   export AWS_ACCESS_KEY_ID=dummy
   export AWS_SECRET_ACCESS_KEY=dummy
   ```

2. Or use AWS CLI configuration:
   ```bash
   aws configure
   # Enter any values for local development
   ```

**For Production (AWS):**

1. **Recommended:** Use IAM role (no credentials needed):
   ```bash
   # ECS Task Role
   aws ecs describe-tasks --tasks <task-arn> | grep taskRoleArn
   
   # EC2 Instance Profile
   aws ec2 describe-instances --instance-ids <instance-id> | grep IamInstanceProfile
   ```

2. Verify IAM role has DynamoDB permissions:
   ```bash
   aws iam get-role-policy --role-name IDPTaskRole --policy-name DynamoDBAccess
   ```

3. **Not Recommended:** Use explicit credentials:
   ```bash
   export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   ```

**Prevention:** Always use IAM roles in production environments.

---

### Error: "Cannot do operations on a non-existent table"

**Symptom:**
```
software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException: 
Cannot do operations on a non-existent table
```

**Cause:** DynamoDB tables have not been created.

**Diagnosis:**

1. Check if auto-create is enabled:
   ```properties
   idp.database.dynamodb.auto-create-tables=true
   ```

2. List existing tables:
   ```bash
   # Local
   aws dynamodb list-tables --endpoint-url http://localhost:8000
   
   # AWS
   aws dynamodb list-tables --region us-east-1
   ```

3. Check application startup logs:
   ```
   INFO  [com.ang.idp.inf.per.con.DatabaseProviderConfig] Initializing DynamoDB tables...
   INFO  [com.ang.idp.inf.per.con.DatabaseProviderConfig] Created table: idp_stacks
   ```

**Solutions:**

1. Enable auto-create tables:
   ```properties
   idp.database.dynamodb.auto-create-tables=true
   ```

2. Manually create tables using AWS CLI:
   ```bash
   aws dynamodb create-table \
     --table-name idp_stacks \
     --attribute-definitions \
       AttributeName=id,AttributeType=S \
     --key-schema \
       AttributeName=id,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region us-east-1
   ```

3. Verify IAM permissions include `dynamodb:CreateTable`:
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "dynamodb:CreateTable",
       "dynamodb:DescribeTable"
     ],
     "Resource": "arn:aws:dynamodb:*:*:table/idp_*"
   }
   ```

4. Check for errors in CloudWatch Logs (AWS) or application logs (local)

---

### Error: "DynamoDB Local not responding"

**Symptom:**
```
software.amazon.awssdk.core.exception.SdkClientException: 
Unable to execute HTTP request: Connect to localhost:8000 failed
```

**Cause:** DynamoDB Local container is not running or not accessible.

**Diagnosis:**

1. Check if container is running:
   ```bash
   docker ps | grep dynamodb-local
   ```

2. Check container logs:
   ```bash
   docker logs dynamodb-local
   ```

3. Test connectivity:
   ```bash
   curl http://localhost:8000
   # Should return: "healthy"
   ```

**Solutions:**

1. Start DynamoDB Local:
   ```bash
   docker run -d \
     --name dynamodb-local \
     -p 8000:8000 \
     amazon/dynamodb-local
   ```

2. Or use Docker Compose:
   ```bash
   docker compose up -d dynamodb-local
   ```

3. Verify port is not in use:
   ```bash
   lsof -i :8000
   # or
   netstat -an | grep 8000
   ```

4. Check endpoint configuration:
   ```properties
   idp.database.dynamodb.endpoint=http://localhost:8000
   ```

---

### Error: "Provisioned throughput exceeded"

**Symptom:**
```
software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughputExceededException: 
The level of configured provisioned throughput for the table was exceeded
```

**Cause:** Request rate exceeds provisioned read/write capacity units.

**Diagnosis:**

1. Check current capacity:
   ```bash
   aws dynamodb describe-table --table-name idp_stacks \
     --query 'Table.ProvisionedThroughput'
   ```

2. Check CloudWatch metrics:
   - `ConsumedReadCapacityUnits`
   - `ConsumedWriteCapacityUnits`
   - `ThrottledRequests`

**Solutions:**

1. **Recommended:** Switch to on-demand billing:
   ```bash
   aws dynamodb update-table \
     --table-name idp_stacks \
     --billing-mode PAY_PER_REQUEST
   ```

2. Increase provisioned capacity:
   ```bash
   aws dynamodb update-table \
     --table-name idp_stacks \
     --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=50
   ```

3. Enable auto-scaling:
   ```bash
   aws application-autoscaling register-scalable-target \
     --service-namespace dynamodb \
     --resource-id table/idp_stacks \
     --scalable-dimension dynamodb:table:ReadCapacityUnits \
     --min-capacity 5 \
     --max-capacity 100
   ```

4. Implement exponential backoff in application (already included in SDK)

5. Use batch operations to reduce request count

**Prevention:** Use on-demand billing mode for variable workloads.

---

### Error: "Item size exceeds maximum allowed size"

**Symptom:**
```
software.amazon.awssdk.services.dynamodb.model.ItemSizeLimitExceededException: 
Item size has exceeded the maximum allowed size
```

**Cause:** DynamoDB items are limited to 400KB.

**Diagnosis:**

1. Check item size in application logs
2. Identify large fields (usually configuration maps or descriptions)

**Solutions:**

1. Store large data in S3 and reference by key:
   ```java
   // Instead of storing large config in item
   String s3Key = s3Service.uploadConfig(largeConfig);
   stack.setConfigurationS3Key(s3Key);
   ```

2. Compress data before storing:
   ```java
   String compressed = compressionService.compress(largeData);
   ```

3. Split data across multiple items

4. Review data model to reduce item size

**Prevention:** Design data model with 400KB limit in mind.

---

### Error: "Region not configured"

**Symptom:**
```
software.amazon.awssdk.core.exception.SdkClientException: 
Unable to load region from any of the providers in the chain
```

**Cause:** AWS region is not configured.

**Solution:**

1. Set region in configuration:
   ```properties
   idp.database.dynamodb.region=us-east-1
   ```

2. Or use environment variable:
   ```bash
   export IDP_DATABASE_DYNAMODB_REGION=us-east-1
   # or
   export AWS_REGION=us-east-1
   ```

3. For local development with DynamoDB Local, region is still required:
   ```properties
   idp.database.dynamodb.region=us-east-1
   idp.database.dynamodb.endpoint=http://localhost:8000
   ```

---

## Health Check Interpretation

### Understanding Health Check Responses

The application provides health checks at `/q/health/ready` and `/q/health/live`.

#### Healthy Database (PostgreSQL)

```json
{
  "status": "UP",
  "checks": [
    {
      "name": "database-postgresql",
      "status": "UP",
      "data": {
        "provider": "postgresql",
        "connection_pool_active": 2,
        "connection_pool_idle": 8,
        "connection_pool_max": 20
      }
    }
  ]
}
```

**Interpretation:**
- Database is accessible
- Connection pool is healthy
- Application is ready to serve requests

---

#### Healthy Database (DynamoDB)

```json
{
  "status": "UP",
  "checks": [
    {
      "name": "database-dynamodb",
      "status": "UP",
      "data": {
        "provider": "dynamodb",
        "region": "us-east-1",
        "tables_verified": 16
      }
    }
  ]
}
```

**Interpretation:**
- DynamoDB is accessible
- All required tables exist
- Application is ready to serve requests

---

#### Unhealthy Database (Connection Failed)

```json
{
  "status": "DOWN",
  "checks": [
    {
      "name": "database-postgresql",
      "status": "DOWN",
      "data": {
        "error": "Connection refused",
        "provider": "postgresql",
        "details": "org.postgresql.util.PSQLException: Connection to localhost:5432 refused"
      }
    }
  ]
}
```

**Interpretation:**
- Database is not accessible
- Check database server status
- Verify connection configuration
- Application should not receive traffic

**Action:** Follow [PostgreSQL Connection Issues](#error-connection-refused-or-could-not-connect-to-database) troubleshooting.

---

#### Unhealthy Database (Authentication Failed)

```json
{
  "status": "DOWN",
  "checks": [
    {
      "name": "database-postgresql",
      "status": "DOWN",
      "data": {
        "error": "Authentication failed",
        "provider": "postgresql",
        "details": "FATAL: password authentication failed for user 'idp_user'"
      }
    }
  ]
}
```

**Interpretation:**
- Database is accessible but credentials are incorrect
- Check username and password configuration

**Action:** Follow [Authentication Failed](#error-authentication-failed-for-user) troubleshooting.

---

#### Unhealthy Database (Tables Missing)

```json
{
  "status": "DOWN",
  "checks": [
    {
      "name": "database-dynamodb",
      "status": "DOWN",
      "data": {
        "error": "Required tables not found",
        "provider": "dynamodb",
        "missing_tables": ["idp_stacks", "idp_blueprints"]
      }
    }
  ]
}
```

**Interpretation:**
- DynamoDB is accessible but tables don't exist
- Table creation may have failed

**Action:** Follow [Tables Not Found](#error-cannot-do-operations-on-a-non-existent-table) troubleshooting.

---

### Health Check Best Practices

1. **Monitor health endpoints** in production:
   ```bash
   # Kubernetes liveness probe
   livenessProbe:
     httpGet:
       path: /q/health/live
       port: 8082
     initialDelaySeconds: 30
     periodSeconds: 10
   
   # Kubernetes readiness probe
   readinessProbe:
     httpGet:
       path: /q/health/ready
       port: 8082
     initialDelaySeconds: 10
     periodSeconds: 5
   ```

2. **Alert on health check failures** for more than 2 consecutive checks

3. **Review health check data** for performance insights:
   - Connection pool utilization
   - Response times
   - Error patterns

4. **Use readiness probe** to prevent traffic to unhealthy instances

5. **Use liveness probe** to restart crashed instances

---

## Debugging Tips

### Enable Debug Logging

#### PostgreSQL Debugging

```properties
# Repository layer
quarkus.log.category."com.angryss.idp.infrastructure.persistence.postgresql".level=DEBUG

# Hibernate SQL
quarkus.hibernate-orm.log.sql=true
quarkus.log.category."org.hibernate.SQL".level=DEBUG
quarkus.log.category."org.hibernate.type.descriptor.sql.BasicBinder".level=TRACE

# Connection pool
quarkus.log.category."com.zaxxer.hikari".level=DEBUG

# Flyway migrations
quarkus.log.category."org.flywaydb".level=DEBUG
```

#### DynamoDB Debugging

```properties
# Repository layer
quarkus.log.category."com.angryss.idp.infrastructure.persistence.dynamodb".level=DEBUG

# AWS SDK
quarkus.log.category."software.amazon.awssdk".level=DEBUG
quarkus.log.category."software.amazon.awssdk.request".level=DEBUG

# DynamoDB client
quarkus.log.category."software.amazon.awssdk.services.dynamodb".level=DEBUG

# Entity mapper
quarkus.log.category."com.angryss.idp.infrastructure.persistence.dynamodb.mapper".level=DEBUG
```

#### Application-Wide Debugging

```properties
# All persistence layer
quarkus.log.category."com.angryss.idp.infrastructure.persistence".level=DEBUG

# All repositories
quarkus.log.category."com.angryss.idp.domain.repositories".level=DEBUG

# Configuration
quarkus.log.category."com.angryss.idp.infrastructure.persistence.config".level=DEBUG
```

---

### Verify Configuration Loading

Check which configuration is being loaded:

```bash
# Start application with config logging
./mvnw quarkus:dev -Dquarkus.log.category."io.quarkus.config".level=DEBUG
```

Look for:
```
DEBUG [io.quarkus.config] idp.database.provider = postgresql
DEBUG [io.quarkus.config] quarkus.datasource.jdbc.url = jdbc:postgresql://localhost:5432/idp_db
```

---

### Test Database Connectivity Independently

#### PostgreSQL

```bash
# Test connection
psql -h localhost -U idp_user -d idp_db -c "SELECT version();"

# Test from Docker container
docker exec -it idp-api psql -h postgres -U idp_user -d idp_db -c "SELECT 1;"

# Check active connections
psql -h localhost -U idp_user -d idp_db -c "SELECT * FROM pg_stat_activity WHERE datname = 'idp_db';"
```

#### DynamoDB

```bash
# List tables (local)
aws dynamodb list-tables --endpoint-url http://localhost:8000

# List tables (AWS)
aws dynamodb list-tables --region us-east-1

# Describe table
aws dynamodb describe-table --table-name idp_stacks --region us-east-1

# Test write
aws dynamodb put-item \
  --table-name idp_stacks \
  --item '{"id": {"S": "test-123"}, "name": {"S": "test"}}' \
  --endpoint-url http://localhost:8000

# Test read
aws dynamodb get-item \
  --table-name idp_stacks \
  --key '{"id": {"S": "test-123"}}' \
  --endpoint-url http://localhost:8000
```

---

### Inspect Repository Bean Injection

Add logging to verify correct repository is injected:

```java
@ApplicationScoped
public class StackService {
    
    @Inject
    StackRepository stackRepository;
    
    @PostConstruct
    void init() {
        log.info("Injected repository implementation: {}", 
                 stackRepository.getClass().getName());
    }
}
```

Expected output:
```
INFO  [com.ang.idp.app.use.StackService] Injected repository implementation: 
      com.angryss.idp.infrastructure.persistence.postgresql.PostgresStackRepository
```

---

### Monitor Database Performance

#### PostgreSQL Performance

```sql
-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Connection pool stats
SELECT count(*), state
FROM pg_stat_activity
WHERE datname = 'idp_db'
GROUP BY state;
```

#### DynamoDB Performance

```bash
# CloudWatch metrics (AWS)
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=idp_stacks \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum

# Table metrics
aws dynamodb describe-table --table-name idp_stacks \
  --query 'Table.[TableSizeBytes,ItemCount]'

# Check for throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=idp_stacks \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Sum
```

---

### Common Debugging Scenarios

#### Scenario 1: Application starts but database operations fail

**Symptoms:**
- Application starts successfully
- Health check shows UP
- API requests fail with database errors

**Debugging Steps:**

1. Check if correct repository is injected:
   ```bash
   grep "Injected repository" logs/application.log
   ```

2. Verify database provider configuration:
   ```bash
   grep "Database provider:" logs/application.log
   ```

3. Test a simple operation:
   ```bash
   curl http://localhost:8082/api/v1/stacks
   ```

4. Check application logs for exceptions

5. Enable debug logging for repository layer

---

#### Scenario 2: Intermittent database failures

**Symptoms:**
- Most requests succeed
- Occasional database timeouts or connection errors
- Health check fluctuates between UP and DOWN

**Debugging Steps:**

1. Check connection pool exhaustion:
   ```sql
   -- PostgreSQL
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'idp_db';
   ```

2. Monitor connection pool metrics in logs

3. Check for long-running transactions:
   ```sql
   -- PostgreSQL
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';
   ```

4. Review application for transaction leaks

5. Increase connection pool size temporarily to confirm issue

---

#### Scenario 3: Slow database queries

**Symptoms:**
- API requests are slow
- Database CPU/memory usage is high
- Application logs show slow query warnings

**Debugging Steps:**

1. Enable SQL logging:
   ```properties
   quarkus.hibernate-orm.log.sql=true
   ```

2. Identify slow queries in logs

3. Analyze query execution plans:
   ```sql
   -- PostgreSQL
   EXPLAIN ANALYZE SELECT * FROM stacks WHERE created_by = 'user@example.com';
   ```

4. Check for missing indexes:
   ```sql
   -- PostgreSQL
   SELECT schemaname, tablename, indexname
   FROM pg_indexes
   WHERE schemaname = 'public';
   ```

5. For DynamoDB, verify GSI usage:
   ```bash
   aws dynamodb describe-table --table-name idp_stacks \
     --query 'Table.GlobalSecondaryIndexes[*].IndexName'
   ```

6. Review query patterns and optimize

---

## Performance Issues

### PostgreSQL Performance Optimization

#### Slow Queries

**Diagnosis:**
```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Solutions:**

1. Add missing indexes:
   ```sql
   CREATE INDEX idx_stacks_created_by ON stacks(created_by);
   CREATE INDEX idx_stacks_team_id ON stacks(team_id);
   ```

2. Optimize queries to use indexes:
   ```sql
   -- Bad: Full table scan
   SELECT * FROM stacks WHERE LOWER(name) = 'mystack';
   
   -- Good: Uses index
   SELECT * FROM stacks WHERE name = 'MyStack';
   ```

3. Use connection pooling effectively:
   ```properties
   quarkus.datasource.jdbc.min-size=10
   quarkus.datasource.jdbc.max-size=50
   ```

4. Enable query result caching:
   ```properties
   quarkus.hibernate-orm.cache."com.angryss.idp.domain.entities.*".expiration.max-idle=600
   ```

#### High Connection Count

**Diagnosis:**
```sql
SELECT count(*), state, wait_event_type
FROM pg_stat_activity
WHERE datname = 'idp_db'
GROUP BY state, wait_event_type;
```

**Solutions:**

1. Reduce connection pool size per instance:
   ```properties
   quarkus.datasource.jdbc.max-size=20
   ```

2. Use connection pooler (PgBouncer):
   ```bash
   # Install PgBouncer
   sudo apt install pgbouncer
   
   # Configure connection pooling
   # /etc/pgbouncer/pgbouncer.ini
   [databases]
   idp_db = host=localhost port=5432 dbname=idp_db
   
   [pgbouncer]
   pool_mode = transaction
   max_client_conn = 1000
   default_pool_size = 20
   ```

3. Review application for connection leaks

---

### DynamoDB Performance Optimization

#### High Latency

**Diagnosis:**
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name SuccessfulRequestLatency \
  --dimensions Name=TableName,Value=idp_stacks Name=Operation,Value=GetItem \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Average,Maximum
```

**Solutions:**

1. Use batch operations:
   ```java
   // Instead of multiple GetItem calls
   List<Map<String, AttributeValue>> keys = ids.stream()
       .map(id -> Map.of("id", AttributeValue.builder().s(id.toString()).build()))
       .collect(Collectors.toList());
   
   BatchGetItemRequest request = BatchGetItemRequest.builder()
       .requestItems(Map.of("idp_stacks", KeysAndAttributes.builder().keys(keys).build()))
       .build();
   ```

2. Use query instead of scan:
   ```java
   // Bad: Scan entire table
   ScanRequest scanRequest = ScanRequest.builder()
       .tableName("idp_stacks")
       .build();
   
   // Good: Query with GSI
   QueryRequest queryRequest = QueryRequest.builder()
       .tableName("idp_stacks")
       .indexName("createdBy-createdAt-index")
       .keyConditionExpression("createdBy = :user")
       .build();
   ```

3. Enable DAX (DynamoDB Accelerator) for read-heavy workloads

4. Use eventually consistent reads when strong consistency not required:
   ```java
   GetItemRequest request = GetItemRequest.builder()
       .tableName("idp_stacks")
       .key(key)
       .consistentRead(false)  // Eventually consistent
       .build();
   ```

#### Throttling

**Diagnosis:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=idp_stacks \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Sum
```

**Solutions:**

1. Switch to on-demand billing:
   ```bash
   aws dynamodb update-table \
     --table-name idp_stacks \
     --billing-mode PAY_PER_REQUEST
   ```

2. Increase provisioned capacity:
   ```bash
   aws dynamodb update-table \
     --table-name idp_stacks \
     --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=50
   ```

3. Implement exponential backoff (SDK does this automatically)

4. Distribute writes across partition keys

5. Use batch operations to reduce request count

---

## Getting Help

### Information to Collect

When seeking help, provide:

1. **Configuration:**
   ```bash
   # Sanitize passwords before sharing
   cat application.properties | grep -v password
   ```

2. **Application logs:**
   ```bash
   # Last 100 lines with timestamps
   tail -n 100 logs/application.log
   ```

3. **Health check response:**
   ```bash
   curl http://localhost:8082/q/health/ready | jq
   ```

4. **Database version:**
   ```bash
   # PostgreSQL
   psql -h localhost -U idp_user -d idp_db -c "SELECT version();"
   
   # DynamoDB
   aws dynamodb describe-table --table-name idp_stacks --region us-east-1
   ```

5. **Environment details:**
   - Operating system
   - Java version: `java -version`
   - Maven version: `mvn -version`
   - Docker version (if applicable): `docker --version`

### Additional Resources

- [Database Configuration Guide](DATABASE_CONFIGURATION.md)
- [Database Architecture](DATABASE_ARCHITECTURE.md)
- [Database Quick Reference](DATABASE_QUICK_REFERENCE.md)
- [Quarkus Datasource Guide](https://quarkus.io/guides/datasource)
- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## Quick Reference

### PostgreSQL Quick Checks

```bash
# Is PostgreSQL running?
docker ps | grep postgres
sudo systemctl status postgresql

# Can I connect?
psql -h localhost -U idp_user -d idp_db -c "SELECT 1"

# Are migrations applied?
psql -h localhost -U idp_user -d idp_db -c "SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"

# How many connections?
psql -h localhost -U idp_user -d idp_db -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'idp_db';"
```

### DynamoDB Quick Checks

```bash
# Is DynamoDB Local running?
docker ps | grep dynamodb-local
curl http://localhost:8000

# Can I connect?
aws dynamodb list-tables --endpoint-url http://localhost:8000

# Do tables exist?
aws dynamodb list-tables --region us-east-1 | grep idp_

# Check table status
aws dynamodb describe-table --table-name idp_stacks --region us-east-1 --query 'Table.TableStatus'
```

### Application Quick Checks

```bash
# Is application running?
curl http://localhost:8082/q/health/live

# Is database healthy?
curl http://localhost:8082/q/health/ready

# What database provider is configured?
grep "Database provider:" logs/application.log

# Any errors in logs?
grep -i error logs/application.log | tail -20
```
