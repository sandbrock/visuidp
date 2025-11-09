# Database Configuration Guide

## Overview

The IDP API supports two database backends through a pluggable architecture:

- **PostgreSQL**: Relational database with ACID transactions, ideal for traditional deployments
- **DynamoDB**: NoSQL database with automatic scaling, ideal for AWS cloud deployments

This guide provides step-by-step instructions for configuring, deploying, and migrating between database providers.

**Quick Links:**
- [PostgreSQL Configuration](#postgresql-configuration)
- [DynamoDB Configuration](#dynamodb-configuration)
- [Deployment Examples](#deployment-examples)
- [Migration Considerations](#migration-considerations)
- [Troubleshooting](#troubleshooting)

## Choosing a Database Provider

### PostgreSQL - Best For

✅ Traditional on-premises or VM-based deployments  
✅ Complex queries with joins across multiple tables  
✅ Strong consistency requirements with ACID transactions  
✅ Existing PostgreSQL infrastructure and expertise  
✅ Cost-sensitive deployments (open source, no per-request charges)  
✅ Development environments with Docker Compose  

### DynamoDB - Best For

✅ AWS cloud-native deployments  
✅ Auto-scaling requirements with unpredictable traffic  
✅ Simple access patterns (key-based lookups)  
✅ Serverless architectures (AWS Lambda, ECS Fargate)  
✅ Global distribution requirements  
✅ Managed service preference (no database administration)  

### Decision Matrix

| Criteria | PostgreSQL | DynamoDB |
|----------|-----------|----------|
| **Deployment** | Self-managed or RDS | Fully managed |
| **Scaling** | Vertical (larger instance) | Automatic horizontal |
| **Cost Model** | Instance-based | Per-request + storage |
| **Query Flexibility** | SQL with complex joins | Key-based with GSIs |
| **Consistency** | Strong ACID | Eventual (configurable) |
| **Latency** | 10-50ms typical | <10ms single-digit |
| **Backup/Recovery** | Manual or RDS automated | Automatic point-in-time |
| **Multi-region** | Manual replication | Built-in global tables |


## PostgreSQL Configuration

### Local Development Setup

#### Prerequisites

- Docker and Docker Compose installed
- Java 21 or later
- Maven 3.8 or later

#### Step 1: Configure Environment Variables

Create or update `.env` file in the `idp-api` directory:

```bash
# Database Provider Selection
DATABASE_PROVIDER=postgresql

# PostgreSQL Connection
DB_USERNAME=idp_user
DB_PASSWORD=idp_password
DB_URL=jdbc:postgresql://localhost:5432/idp_db

# Logging (optional)
LOG_SQL=false
LOG_SQL_LEVEL=WARN
```

#### Step 2: Start PostgreSQL with Docker Compose

```bash
cd idp-api
docker compose up -d postgres
```

This starts PostgreSQL on port 5432 with the configured credentials.

#### Step 3: Verify Database Connection

```bash
# Using psql
psql -h localhost -U idp_user -d idp_db -c "SELECT 1"

# Or using Docker
docker compose exec postgres psql -U idp_user -d idp_db -c "SELECT 1"
```

#### Step 4: Start the Application

```bash
./mvnw quarkus:dev
```

Flyway migrations run automatically in dev mode, creating all required tables.

#### Step 5: Verify Configuration

Check the application logs for:
```
INFO  [com.ang.idp.inf.per.con.DatabaseProviderConfig] Database provider: postgresql
INFO  [io.quarkus.flyway.FlywayRecorder] Flyway migration completed successfully
```

Access health check endpoint:
```bash
curl http://localhost:8082/q/health/ready
```

Expected response:
```json
{
  "status": "UP",
  "checks": [
    {
      "name": "database-postgresql",
      "status": "UP"
    }
  ]
}
```


### Production PostgreSQL Setup

#### Option 1: Self-Managed PostgreSQL

**Step 1: Install PostgreSQL**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-14

# RHEL/CentOS
sudo dnf install postgresql14-server
sudo postgresql-14-setup initdb
sudo systemctl enable postgresql-14
sudo systemctl start postgresql-14
```

**Step 2: Create Database and User**

```sql
-- Connect as postgres user
sudo -u postgres psql

-- Create database
CREATE DATABASE idp_db;

-- Create user with password
CREATE USER idp_user WITH ENCRYPTED PASSWORD 'secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE idp_db TO idp_user;

-- Connect to database
\c idp_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO idp_user;
```

**Step 3: Configure PostgreSQL for Remote Access**

Edit `/etc/postgresql/14/main/postgresql.conf`:
```conf
listen_addresses = '*'  # or specific IP
max_connections = 100
shared_buffers = 256MB
```

Edit `/etc/postgresql/14/main/pg_hba.conf`:
```conf
# Allow connections from application servers
host    idp_db    idp_user    10.0.0.0/8    scram-sha-256
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql-14
```

**Step 4: Configure Application**

Set environment variables:
```bash
export DATABASE_PROVIDER=postgresql
export DB_URL=jdbc:postgresql://db-server:5432/idp_db
export DB_USERNAME=idp_user
export DB_PASSWORD=secure_password_here
```

Or update `application.properties`:
```properties
idp.database.provider=postgresql
quarkus.datasource.jdbc.url=jdbc:postgresql://db-server:5432/idp_db
quarkus.datasource.username=idp_user
quarkus.datasource.password=${DB_PASSWORD}
```

**Step 5: Run Migrations**

Migrations run automatically on application startup. To run manually:
```bash
./mvnw flyway:migrate
```


#### Option 2: AWS RDS PostgreSQL

**Step 1: Create RDS Instance**

Using AWS Console:
1. Navigate to RDS → Create database
2. Choose PostgreSQL (version 14 or later)
3. Select production or dev/test template
4. Configure instance:
   - DB instance identifier: `idp-db`
   - Master username: `idp_user`
   - Master password: (generate secure password)
   - Instance class: `db.t3.medium` (or larger for production)
   - Storage: 100 GB GP3 (with autoscaling)
5. Configure connectivity:
   - VPC: Select your application VPC
   - Public access: No (for production)
   - Security group: Create new or select existing
6. Additional configuration:
   - Initial database name: `idp_db`
   - Backup retention: 7 days (or more)
   - Enable encryption at rest
   - Enable automated backups

Using AWS CLI:
```bash
aws rds create-db-instance \
  --db-instance-identifier idp-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.7 \
  --master-username idp_user \
  --master-user-password "SecurePassword123!" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name my-db-subnet-group \
  --backup-retention-period 7 \
  --storage-encrypted \
  --db-name idp_db
```

**Step 2: Configure Security Group**

Allow inbound PostgreSQL traffic (port 5432) from application security group:
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-database \
  --protocol tcp \
  --port 5432 \
  --source-group sg-application
```

**Step 3: Get Connection Endpoint**

```bash
aws rds describe-db-instances \
  --db-instance-identifier idp-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

**Step 4: Configure Application**

Store credentials in AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name idp-api/database \
  --secret-string '{
    "username": "idp_user",
    "password": "SecurePassword123!",
    "host": "idp-db.xxxxx.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "database": "idp_db"
  }'
```

Configure application to read from Secrets Manager or use environment variables:
```bash
export DATABASE_PROVIDER=postgresql
export DB_URL=jdbc:postgresql://idp-db.xxxxx.us-east-1.rds.amazonaws.com:5432/idp_db
export DB_USERNAME=idp_user
export DB_PASSWORD=SecurePassword123!
```

**Step 5: Enable SSL/TLS**

Download RDS certificate:
```bash
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

Update connection URL:
```properties
quarkus.datasource.jdbc.url=jdbc:postgresql://idp-db.xxxxx.us-east-1.rds.amazonaws.com:5432/idp_db?ssl=true&sslmode=verify-full&sslrootcert=/path/to/global-bundle.pem
```


#### Option 3: Azure Database for PostgreSQL

**Step 1: Create Azure PostgreSQL Server**

Using Azure Portal:
1. Navigate to Azure Database for PostgreSQL servers → Create
2. Select deployment option: Flexible Server
3. Configure basics:
   - Server name: `idp-db`
   - Region: Select your region
   - PostgreSQL version: 14
   - Compute + storage: Standard_D2s_v3 (or larger)
4. Configure authentication:
   - Admin username: `idp_user`
   - Password: (generate secure password)
5. Configure networking:
   - Connectivity method: Private access (VNet integration)
   - Virtual network: Select your VNet
   - Subnet: Select database subnet
6. Review and create

Using Azure CLI:
```bash
az postgres flexible-server create \
  --resource-group idp-rg \
  --name idp-db \
  --location eastus \
  --admin-user idp_user \
  --admin-password "SecurePassword123!" \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --storage-size 128 \
  --version 14 \
  --vnet my-vnet \
  --subnet database-subnet
```

**Step 2: Create Database**

```bash
az postgres flexible-server db create \
  --resource-group idp-rg \
  --server-name idp-db \
  --database-name idp_db
```

**Step 3: Configure Firewall Rules**

For VNet access (recommended):
```bash
az postgres flexible-server vnet-rule create \
  --resource-group idp-rg \
  --server-name idp-db \
  --name allow-app-subnet \
  --vnet-name my-vnet \
  --subnet app-subnet
```

For IP-based access (development only):
```bash
az postgres flexible-server firewall-rule create \
  --resource-group idp-rg \
  --name idp-db \
  --rule-name allow-office \
  --start-ip-address 203.0.113.0 \
  --end-ip-address 203.0.113.255
```

**Step 4: Get Connection String**

```bash
az postgres flexible-server show \
  --resource-group idp-rg \
  --name idp-db \
  --query "fullyQualifiedDomainName" \
  --output tsv
```

**Step 5: Configure Application**

Store credentials in Azure Key Vault:
```bash
az keyvault secret set \
  --vault-name idp-keyvault \
  --name db-username \
  --value "idp_user"

az keyvault secret set \
  --vault-name idp-keyvault \
  --name db-password \
  --value "SecurePassword123!"
```

Configure application:
```bash
export DATABASE_PROVIDER=postgresql
export DB_URL=jdbc:postgresql://idp-db.postgres.database.azure.com:5432/idp_db?sslmode=require
export DB_USERNAME=idp_user
export DB_PASSWORD=SecurePassword123!
```


### PostgreSQL Configuration Reference

#### Connection Pool Settings

```properties
# Connection pool size
quarkus.datasource.jdbc.min-size=5
quarkus.datasource.jdbc.max-size=20

# Connection timeout
quarkus.datasource.jdbc.acquisition-timeout=10

# Idle timeout (minutes)
quarkus.datasource.jdbc.idle-removal-interval=5

# Connection validation
quarkus.datasource.jdbc.validation-query-sql=SELECT 1
```

#### Performance Tuning

```properties
# Enable statement caching
quarkus.datasource.jdbc.enable-statement-caching=true

# Batch size for bulk operations
quarkus.hibernate-orm.jdbc.statement-batch-size=50

# Second-level cache (optional)
quarkus.hibernate-orm.cache."com.angryss.idp.domain.entities.*".expiration.max-idle=600
```

#### SSL/TLS Configuration

```properties
# Require SSL
quarkus.datasource.jdbc.url=jdbc:postgresql://host:5432/idp_db?ssl=true&sslmode=require

# Verify certificate
quarkus.datasource.jdbc.url=jdbc:postgresql://host:5432/idp_db?ssl=true&sslmode=verify-full&sslrootcert=/path/to/ca-cert.pem
```

#### Flyway Migration Settings

```properties
# Enable migrations
quarkus.flyway.migrate-at-start=true

# Migration location
quarkus.flyway.locations=classpath:db/migration

# Baseline on migrate
quarkus.flyway.baseline-on-migrate=true

# Validate migrations
quarkus.flyway.validate-on-migrate=true

# Clean database (dev only!)
%dev.quarkus.flyway.clean-at-start=false
```


## DynamoDB Configuration

### Local Development Setup

#### Prerequisites

- Docker installed
- AWS CLI installed (optional, for testing)
- Java 21 or later
- Maven 3.8 or later

#### Step 1: Start DynamoDB Local

Using Docker:
```bash
docker run -d \
  --name dynamodb-local \
  -p 8000:8000 \
  amazon/dynamodb-local
```

Or using Docker Compose (add to `docker-compose.yml`):
```yaml
services:
  dynamodb-local:
    image: amazon/dynamodb-local
    container_name: dynamodb-local
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb -inMemory"
```

#### Step 2: Configure Environment Variables

Create or update `.env` file:
```bash
# Database Provider Selection
DATABASE_PROVIDER=dynamodb

# DynamoDB Configuration
DYNAMODB_REGION=us-east-1
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE_PREFIX=idp
DYNAMODB_AUTO_CREATE_TABLES=true

# Capacity settings (for local testing)
DYNAMODB_READ_CAPACITY=5
DYNAMODB_WRITE_CAPACITY=5

# AWS credentials (not needed for local, but required by SDK)
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
```

#### Step 3: Start the Application

```bash
./mvnw quarkus:dev
```

Tables are created automatically on startup.

#### Step 4: Verify Configuration

Check application logs:
```
INFO  [com.ang.idp.inf.per.con.DatabaseProviderConfig] Database provider: dynamodb
INFO  [com.ang.idp.inf.per.con.DatabaseProviderConfig] Initializing DynamoDB tables...
INFO  [com.ang.idp.inf.per.con.DatabaseProviderConfig] Created table: idp_stacks
INFO  [com.ang.idp.inf.per.con.DatabaseProviderConfig] Created table: idp_blueprints
...
```

List tables using AWS CLI:
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

Access health check:
```bash
curl http://localhost:8082/q/health/ready
```

Expected response:
```json
{
  "status": "UP",
  "checks": [
    {
      "name": "database-dynamodb",
      "status": "UP"
    }
  ]
}
```

#### Step 5: Inspect Data (Optional)

Using AWS CLI:
```bash
# Scan stacks table
aws dynamodb scan \
  --table-name idp_stacks \
  --endpoint-url http://localhost:8000

# Get specific item
aws dynamodb get-item \
  --table-name idp_stacks \
  --key '{"id": {"S": "123e4567-e89b-12d3-a456-426614174000"}}' \
  --endpoint-url http://localhost:8000
```


### Production DynamoDB Setup (AWS)

#### Step 1: Create IAM Policy

Create a policy with DynamoDB permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:DescribeTable",
        "dynamodb:CreateTable",
        "dynamodb:ListTables"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/idp_*",
        "arn:aws:dynamodb:*:*:table/idp_*/index/*"
      ]
    }
  ]
}
```

Save as `idp-dynamodb-policy.json` and create:
```bash
aws iam create-policy \
  --policy-name IDPDynamoDBPolicy \
  --policy-document file://idp-dynamodb-policy.json
```

#### Step 2: Create IAM Role

For ECS Task:
```bash
aws iam create-role \
  --role-name IDPTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name IDPTaskRole \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/IDPDynamoDBPolicy
```

For EC2 Instance:
```bash
aws iam create-role \
  --role-name IDPEC2Role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name IDPEC2Role \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/IDPDynamoDBPolicy

aws iam create-instance-profile --instance-profile-name IDPEC2Profile
aws iam add-role-to-instance-profile \
  --instance-profile-name IDPEC2Profile \
  --role-name IDPEC2Role
```

#### Step 3: Configure Application

**Option A: Using IAM Role (Recommended)**

Set environment variables (no AWS credentials needed):
```bash
export DATABASE_PROVIDER=dynamodb
export DYNAMODB_REGION=us-east-1
export DYNAMODB_TABLE_PREFIX=idp
export DYNAMODB_AUTO_CREATE_TABLES=true
```

**Option B: Using AWS Credentials (Not Recommended)**

```bash
export DATABASE_PROVIDER=dynamodb
export DYNAMODB_REGION=us-east-1
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

#### Step 4: Deploy Application

**ECS Fargate:**

Task definition snippet:
```json
{
  "family": "idp-api",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/IDPTaskRole",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "idp-api",
    "image": "idp-api:latest",
    "environment": [
      {"name": "DATABASE_PROVIDER", "value": "dynamodb"},
      {"name": "DYNAMODB_REGION", "value": "us-east-1"},
      {"name": "DYNAMODB_TABLE_PREFIX", "value": "idp"},
      {"name": "DYNAMODB_AUTO_CREATE_TABLES", "value": "true"}
    ]
  }]
}
```

**EC2 Instance:**

```bash
# Attach IAM role to instance
aws ec2 associate-iam-instance-profile \
  --instance-id i-1234567890abcdef0 \
  --iam-instance-profile Name=IDPEC2Profile

# Set environment variables in systemd service or .env file
export DATABASE_PROVIDER=dynamodb
export DYNAMODB_REGION=us-east-1
```

#### Step 5: Configure Table Capacity

**On-Demand Mode (Recommended for Variable Traffic):**

```bash
# Tables are created in on-demand mode by default
# No capacity planning needed
```

**Provisioned Mode (For Predictable Traffic):**

Update environment variables:
```bash
export DYNAMODB_BILLING_MODE=PROVISIONED
export DYNAMODB_READ_CAPACITY=100
export DYNAMODB_WRITE_CAPACITY=50
```

Or modify tables after creation:
```bash
aws dynamodb update-table \
  --table-name idp_stacks \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=50
```

#### Step 6: Enable Auto Scaling (Provisioned Mode)

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/idp_stacks \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --min-capacity 5 \
  --max-capacity 100

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace dynamodb \
  --resource-id table/idp_stacks \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --policy-name idp-stacks-read-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "DynamoDBReadCapacityUtilization"
    }
  }'
```


### DynamoDB Configuration Reference

#### Basic Settings

```properties
# Database provider
idp.database.provider=dynamodb

# AWS region (required)
idp.database.dynamodb.region=us-east-1

# Custom endpoint (local development only)
idp.database.dynamodb.endpoint=http://localhost:8000

# Table name prefix
idp.database.dynamodb.table-prefix=idp
```

#### Table Management

```properties
# Auto-create tables on startup
idp.database.dynamodb.auto-create-tables=true

# Billing mode: PAY_PER_REQUEST or PROVISIONED
idp.database.dynamodb.billing-mode=PAY_PER_REQUEST

# Provisioned capacity (if billing-mode=PROVISIONED)
idp.database.dynamodb.read-capacity-units=5
idp.database.dynamodb.write-capacity-units=5

# Point-in-time recovery
idp.database.dynamodb.point-in-time-recovery=true

# Encryption at rest (enabled by default)
idp.database.dynamodb.sse-enabled=true
```

#### Performance Settings

```properties
# Connection timeout (milliseconds)
idp.database.dynamodb.connection-timeout=10000

# Socket timeout (milliseconds)
idp.database.dynamodb.socket-timeout=30000

# Max connections
idp.database.dynamodb.max-connections=50

# Connection acquisition timeout (milliseconds)
idp.database.dynamodb.connection-acquisition-timeout=10000

# Enable request compression
idp.database.dynamodb.request-compression=true
```

#### Retry Configuration

```properties
# Max retry attempts
idp.database.dynamodb.max-error-retry=3

# Retry mode: STANDARD, LEGACY, or ADAPTIVE
idp.database.dynamodb.retry-mode=ADAPTIVE

# Base delay for exponential backoff (milliseconds)
idp.database.dynamodb.base-delay=100
```

#### Logging

```properties
# AWS SDK logging
quarkus.log.category."software.amazon.awssdk".level=WARN

# DynamoDB repository logging
quarkus.log.category."com.angryss.idp.infrastructure.persistence.dynamodb".level=INFO

# Request/response logging (debug only)
quarkus.log.category."software.amazon.awssdk.request".level=DEBUG
```


## Deployment Examples

### Docker Compose Deployment

#### PostgreSQL Configuration

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    container_name: idp-postgres
    environment:
      POSTGRES_DB: idp_db
      POSTGRES_USER: idp_user
      POSTGRES_PASSWORD: idp_password
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U idp_user -d idp_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  idp-api:
    image: idp-api:latest
    container_name: idp-api
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_PROVIDER: postgresql
      DB_URL: jdbc:postgresql://postgres:5432/idp_db
      DB_USERNAME: idp_user
      DB_PASSWORD: idp_password
    ports:
      - "8082:8082"

volumes:
  postgres-data:
```

#### DynamoDB Local Configuration

```yaml
version: '3.8'

services:
  dynamodb-local:
    image: amazon/dynamodb-local
    container_name: dynamodb-local
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb"

  idp-api:
    image: idp-api:latest
    container_name: idp-api
    depends_on:
      - dynamodb-local
    environment:
      DATABASE_PROVIDER: dynamodb
      DYNAMODB_REGION: us-east-1
      DYNAMODB_ENDPOINT: http://dynamodb-local:8000
      DYNAMODB_AUTO_CREATE_TABLES: "true"
      AWS_ACCESS_KEY_ID: dummy
      AWS_SECRET_ACCESS_KEY: dummy
    ports:
      - "8082:8082"
```

### Kubernetes Deployment

#### PostgreSQL with StatefulSet

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: idp-api-config
data:
  DATABASE_PROVIDER: "postgresql"
  DB_URL: "jdbc:postgresql://postgres-service:5432/idp_db"
---
apiVersion: v1
kind: Secret
metadata:
  name: idp-api-secrets
type: Opaque
stringData:
  DB_USERNAME: "idp_user"
  DB_PASSWORD: "secure_password_here"
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "idp_db"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: idp-api-secrets
              key: DB_USERNAME
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: idp-api-secrets
              key: DB_PASSWORD
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: idp-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: idp-api
  template:
    metadata:
      labels:
        app: idp-api
    spec:
      containers:
      - name: idp-api
        image: idp-api:latest
        ports:
        - containerPort: 8082
        envFrom:
        - configMapRef:
            name: idp-api-config
        env:
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: idp-api-secrets
              key: DB_USERNAME
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: idp-api-secrets
              key: DB_PASSWORD
        livenessProbe:
          httpGet:
            path: /q/health/live
            port: 8082
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /q/health/ready
            port: 8082
          initialDelaySeconds: 10
          periodSeconds: 5
```


#### DynamoDB with IAM Role (EKS)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: idp-api-sa
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/IDPTaskRole
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: idp-api-config
data:
  DATABASE_PROVIDER: "dynamodb"
  DYNAMODB_REGION: "us-east-1"
  DYNAMODB_TABLE_PREFIX: "idp"
  DYNAMODB_AUTO_CREATE_TABLES: "true"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: idp-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: idp-api
  template:
    metadata:
      labels:
        app: idp-api
    spec:
      serviceAccountName: idp-api-sa
      containers:
      - name: idp-api
        image: idp-api:latest
        ports:
        - containerPort: 8082
        envFrom:
        - configMapRef:
            name: idp-api-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /q/health/live
            port: 8082
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /q/health/ready
            port: 8082
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: idp-api-service
spec:
  selector:
    app: idp-api
  ports:
  - port: 80
    targetPort: 8082
  type: LoadBalancer
```

### AWS ECS Fargate Deployment

#### Task Definition (PostgreSQL with RDS)

```json
{
  "family": "idp-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/IDPTaskRole",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "idp-api",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/idp-api:latest",
      "portMappings": [
        {
          "containerPort": 8082,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_PROVIDER",
          "value": "postgresql"
        },
        {
          "name": "DB_URL",
          "value": "jdbc:postgresql://idp-db.xxxxx.us-east-1.rds.amazonaws.com:5432/idp_db"
        }
      ],
      "secrets": [
        {
          "name": "DB_USERNAME",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:idp-api/database:username::"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:idp-api/database:password::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/idp-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8082/q/health/ready || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### Task Definition (DynamoDB)

```json
{
  "family": "idp-api-dynamodb",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/IDPTaskRole",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "idp-api",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/idp-api:latest",
      "portMappings": [
        {
          "containerPort": 8082,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_PROVIDER",
          "value": "dynamodb"
        },
        {
          "name": "DYNAMODB_REGION",
          "value": "us-east-1"
        },
        {
          "name": "DYNAMODB_TABLE_PREFIX",
          "value": "idp"
        },
        {
          "name": "DYNAMODB_AUTO_CREATE_TABLES",
          "value": "true"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/idp-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8082/q/health/ready || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```


## Migration Considerations

### Switching from PostgreSQL to DynamoDB

#### Pre-Migration Checklist

- [ ] Review query patterns and ensure they work with DynamoDB GSIs
- [ ] Estimate DynamoDB costs based on expected read/write operations
- [ ] Plan for data migration downtime or dual-write strategy
- [ ] Test application thoroughly with DynamoDB in staging environment
- [ ] Prepare rollback plan

#### Migration Steps

**Step 1: Export Data from PostgreSQL**

```bash
# Export all tables to JSON
pg_dump -h localhost -U idp_user -d idp_db \
  --data-only --column-inserts --format=plain \
  > idp_data_export.sql

# Or use custom export script
./scripts/export-postgres-data.sh > data.json
```

**Step 2: Transform Data Format**

Create a transformation script to convert PostgreSQL data to DynamoDB format:

```python
import json
import psycopg2
from datetime import datetime

# Connect to PostgreSQL
conn = psycopg2.connect(
    host="localhost",
    database="idp_db",
    user="idp_user",
    password="idp_password"
)

# Export stacks
cursor = conn.cursor()
cursor.execute("SELECT * FROM stacks")
stacks = cursor.fetchall()

dynamodb_items = []
for stack in stacks:
    item = {
        "id": {"S": str(stack[0])},
        "name": {"S": stack[1]},
        "stackType": {"S": stack[2]},
        "createdBy": {"S": stack[3]},
        "createdAt": {"S": stack[4].isoformat()},
        # ... map all fields
    }
    dynamodb_items.append(item)

# Save to file
with open('stacks_export.json', 'w') as f:
    json.dump(dynamodb_items, f, indent=2)
```

**Step 3: Import Data to DynamoDB**

```bash
# Using AWS CLI batch write
aws dynamodb batch-write-item \
  --request-items file://stacks_import.json

# Or use custom import script
./scripts/import-dynamodb-data.sh data.json
```

**Step 4: Update Application Configuration**

```bash
# Update .env or environment variables
export DATABASE_PROVIDER=dynamodb
export DYNAMODB_REGION=us-east-1
# Remove PostgreSQL configuration
```

**Step 5: Deploy and Verify**

```bash
# Deploy application
./deploy.sh

# Verify health check
curl https://api.example.com/q/health/ready

# Verify data integrity
./scripts/verify-data-migration.sh
```

#### Data Migration Script Example

```bash
#!/bin/bash
# migrate-postgres-to-dynamodb.sh

set -e

echo "Starting migration from PostgreSQL to DynamoDB..."

# Step 1: Export from PostgreSQL
echo "Exporting data from PostgreSQL..."
psql -h localhost -U idp_user -d idp_db -c "\COPY (SELECT row_to_json(t) FROM stacks t) TO 'stacks.json'"
psql -h localhost -U idp_user -d idp_db -c "\COPY (SELECT row_to_json(t) FROM blueprints t) TO 'blueprints.json'"
# ... export other tables

# Step 2: Transform data
echo "Transforming data format..."
python3 transform_data.py

# Step 3: Import to DynamoDB
echo "Importing data to DynamoDB..."
for table in stacks blueprints teams; do
  echo "Importing $table..."
  aws dynamodb batch-write-item \
    --request-items file://dynamodb_${table}.json \
    --region us-east-1
done

echo "Migration complete!"
```


### Switching from DynamoDB to PostgreSQL

#### Pre-Migration Checklist

- [ ] Provision PostgreSQL database (RDS, self-managed, etc.)
- [ ] Review schema and ensure all DynamoDB data can be represented
- [ ] Plan for data migration downtime
- [ ] Test application with PostgreSQL in staging environment
- [ ] Prepare rollback plan

#### Migration Steps

**Step 1: Export Data from DynamoDB**

```bash
# Scan and export all tables
for table in idp_stacks idp_blueprints idp_teams; do
  echo "Exporting $table..."
  aws dynamodb scan \
    --table-name $table \
    --region us-east-1 \
    --output json > ${table}_export.json
done
```

**Step 2: Transform Data Format**

```python
import json
import psycopg2
from datetime import datetime
from decimal import Decimal

# Load DynamoDB export
with open('idp_stacks_export.json', 'r') as f:
    data = json.load(f)

# Connect to PostgreSQL
conn = psycopg2.connect(
    host="localhost",
    database="idp_db",
    user="idp_user",
    password="idp_password"
)
cursor = conn.cursor()

# Transform and insert
for item in data['Items']:
    cursor.execute("""
        INSERT INTO stacks (id, name, stack_type, created_by, created_at, ...)
        VALUES (%s, %s, %s, %s, %s, ...)
    """, (
        item['id']['S'],
        item['name']['S'],
        item['stackType']['S'],
        item['createdBy']['S'],
        datetime.fromisoformat(item['createdAt']['S']),
        # ... map all fields
    ))

conn.commit()
```

**Step 3: Run Flyway Migrations**

```bash
# Ensure PostgreSQL schema is up to date
./mvnw flyway:migrate
```

**Step 4: Import Data**

```bash
# Run import script
python3 import_from_dynamodb.py

# Verify data
psql -h localhost -U idp_user -d idp_db -c "SELECT COUNT(*) FROM stacks"
```

**Step 5: Update Application Configuration**

```bash
# Update .env or environment variables
export DATABASE_PROVIDER=postgresql
export DB_URL=jdbc:postgresql://localhost:5432/idp_db
export DB_USERNAME=idp_user
export DB_PASSWORD=secure_password
# Remove DynamoDB configuration
```

**Step 6: Deploy and Verify**

```bash
# Deploy application
./deploy.sh

# Verify health check
curl https://api.example.com/q/health/ready

# Verify data integrity
./scripts/verify-data-migration.sh
```

### Zero-Downtime Migration Strategy

For production systems requiring zero downtime:

#### Dual-Write Approach

1. **Phase 1: Dual Write**
   - Deploy application version that writes to both databases
   - Reads continue from source database
   - Monitor for write errors

2. **Phase 2: Data Sync**
   - Run batch job to sync historical data to target database
   - Verify data consistency between databases

3. **Phase 3: Dual Read**
   - Deploy version that reads from both databases
   - Compare results for consistency
   - Log any discrepancies

4. **Phase 4: Switch Primary**
   - Deploy version that reads from target database
   - Continue dual writes for safety
   - Monitor application metrics

5. **Phase 5: Cleanup**
   - Stop writes to source database
   - Decommission source database after retention period

#### Blue-Green Deployment

1. **Prepare Green Environment**
   - Set up new environment with target database
   - Migrate data to target database
   - Deploy application to green environment

2. **Testing**
   - Run smoke tests on green environment
   - Verify all functionality works correctly
   - Load test to ensure performance

3. **Switch Traffic**
   - Update load balancer to route traffic to green
   - Monitor for errors
   - Keep blue environment running for quick rollback

4. **Cleanup**
   - After verification period, decommission blue environment


### Data Consistency Verification

After migration, verify data consistency:

```bash
#!/bin/bash
# verify-migration.sh

echo "Verifying data migration..."

# Count records in each table
echo "Checking record counts..."
SOURCE_STACKS=$(psql -h source-db -U idp_user -d idp_db -t -c "SELECT COUNT(*) FROM stacks")
TARGET_STACKS=$(aws dynamodb scan --table-name idp_stacks --select COUNT --query 'Count' --output text)

if [ "$SOURCE_STACKS" -eq "$TARGET_STACKS" ]; then
  echo "✓ Stack count matches: $SOURCE_STACKS"
else
  echo "✗ Stack count mismatch: Source=$SOURCE_STACKS, Target=$TARGET_STACKS"
  exit 1
fi

# Verify sample records
echo "Verifying sample records..."
psql -h source-db -U idp_user -d idp_db -t -c "SELECT id FROM stacks LIMIT 10" | while read id; do
  # Check if record exists in target
  aws dynamodb get-item \
    --table-name idp_stacks \
    --key "{\"id\": {\"S\": \"$id\"}}" \
    --query 'Item' \
    --output json > /dev/null
  
  if [ $? -eq 0 ]; then
    echo "✓ Record $id exists in target"
  else
    echo "✗ Record $id missing in target"
    exit 1
  fi
done

echo "Migration verification complete!"
```

### Rollback Procedures

#### Rollback from DynamoDB to PostgreSQL

```bash
#!/bin/bash
# rollback-to-postgresql.sh

echo "Rolling back to PostgreSQL..."

# Step 1: Update configuration
export DATABASE_PROVIDER=postgresql
export DB_URL=jdbc:postgresql://backup-db:5432/idp_db

# Step 2: Redeploy application
kubectl set env deployment/idp-api DATABASE_PROVIDER=postgresql
kubectl set env deployment/idp-api DB_URL=jdbc:postgresql://backup-db:5432/idp_db

# Step 3: Verify health
kubectl rollout status deployment/idp-api
curl https://api.example.com/q/health/ready

echo "Rollback complete!"
```

#### Rollback from PostgreSQL to DynamoDB

```bash
#!/bin/bash
# rollback-to-dynamodb.sh

echo "Rolling back to DynamoDB..."

# Step 1: Update configuration
export DATABASE_PROVIDER=dynamodb
export DYNAMODB_REGION=us-east-1

# Step 2: Redeploy application
kubectl set env deployment/idp-api DATABASE_PROVIDER=dynamodb
kubectl set env deployment/idp-api DYNAMODB_REGION=us-east-1

# Step 3: Verify health
kubectl rollout status deployment/idp-api
curl https://api.example.com/q/health/ready

echo "Rollback complete!"
```


## Troubleshooting

### Common PostgreSQL Issues

#### Issue: Connection Refused

**Symptoms:**
```
org.postgresql.util.PSQLException: Connection refused
```

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   docker compose ps postgres
   # or
   systemctl status postgresql
   ```

2. Check connection details:
   ```bash
   psql -h localhost -U idp_user -d idp_db
   ```

3. Verify firewall rules allow port 5432

4. Check `pg_hba.conf` allows connections from application host

#### Issue: Authentication Failed

**Symptoms:**
```
org.postgresql.util.PSQLException: FATAL: password authentication failed
```

**Solutions:**
1. Verify credentials in `.env` file match database
2. Check `pg_hba.conf` authentication method (md5, scram-sha-256)
3. Reset password if needed:
   ```sql
   ALTER USER idp_user WITH PASSWORD 'new_password';
   ```

#### Issue: Flyway Migration Failed

**Symptoms:**
```
FlywayException: Validate failed: Migration checksum mismatch
```

**Solutions:**
1. Check migration files haven't been modified
2. Repair Flyway schema history:
   ```bash
   ./mvnw flyway:repair
   ```
3. For development, clean and remigrate:
   ```bash
   ./mvnw flyway:clean flyway:migrate
   ```

#### Issue: Connection Pool Exhausted

**Symptoms:**
```
HikariPool: Connection is not available, request timed out after 30000ms
```

**Solutions:**
1. Increase pool size:
   ```properties
   quarkus.datasource.jdbc.max-size=50
   ```
2. Check for connection leaks in application code
3. Monitor active connections:
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'idp_db';
   ```

#### Issue: Slow Queries

**Symptoms:**
- Application timeouts
- High database CPU usage

**Solutions:**
1. Enable query logging:
   ```properties
   quarkus.hibernate-orm.log.sql=true
   quarkus.log.category."org.hibernate.SQL".level=DEBUG
   ```

2. Analyze slow queries:
   ```sql
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. Add missing indexes:
   ```sql
   CREATE INDEX idx_stacks_created_by ON stacks(created_by);
   ```


### Common DynamoDB Issues

#### Issue: Access Denied

**Symptoms:**
```
AccessDeniedException: User is not authorized to perform: dynamodb:PutItem
```

**Solutions:**
1. Verify IAM role has correct permissions:
   ```bash
   aws iam get-role-policy --role-name IDPTaskRole --policy-name DynamoDBPolicy
   ```

2. Check IAM role is attached to ECS task or EC2 instance:
   ```bash
   # For ECS
   aws ecs describe-tasks --tasks TASK_ARN --query 'tasks[0].taskRoleArn'
   
   # For EC2
   aws ec2 describe-instances --instance-ids i-xxxxx --query 'Reservations[0].Instances[0].IamInstanceProfile'
   ```

3. Verify table ARN in policy matches actual table names

4. For local development, check AWS credentials:
   ```bash
   aws sts get-caller-identity
   ```

#### Issue: Table Not Found

**Symptoms:**
```
ResourceNotFoundException: Requested resource not found: Table: idp_stacks not found
```

**Solutions:**
1. Verify table exists:
   ```bash
   aws dynamodb list-tables --region us-east-1
   ```

2. Check table prefix configuration:
   ```properties
   idp.database.dynamodb.table-prefix=idp
   ```

3. Enable auto-create tables:
   ```properties
   idp.database.dynamodb.auto-create-tables=true
   ```

4. Manually create tables:
   ```bash
   aws dynamodb create-table \
     --table-name idp_stacks \
     --attribute-definitions AttributeName=id,AttributeType=S \
     --key-schema AttributeName=id,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST
   ```

#### Issue: Provisioned Throughput Exceeded

**Symptoms:**
```
ProvisionedThroughputExceededException: The level of configured provisioned throughput for the table was exceeded
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

3. Enable auto-scaling (see production setup section)

4. Implement exponential backoff in application (already configured)

#### Issue: Item Size Exceeded

**Symptoms:**
```
ValidationException: Item size has exceeded the maximum allowed size
```

**Solutions:**
1. DynamoDB has 400KB item size limit
2. Review large fields (configuration, metadata)
3. Consider storing large data in S3 and reference in DynamoDB
4. Split large items into multiple related items

#### Issue: Connection Timeout

**Symptoms:**
```
SdkClientException: Unable to execute HTTP request: Connect timed out
```

**Solutions:**
1. Check network connectivity to DynamoDB endpoint
2. Verify VPC endpoint configuration (if using)
3. Increase timeout settings:
   ```properties
   idp.database.dynamodb.connection-timeout=30000
   idp.database.dynamodb.socket-timeout=60000
   ```

4. Check security group rules allow HTTPS (443) outbound

#### Issue: Conditional Check Failed

**Symptoms:**
```
ConditionalCheckFailedException: The conditional request failed
```

**Solutions:**
1. This is expected for optimistic locking conflicts
2. Application should retry the operation
3. Review concurrent update patterns
4. Consider using transactions for multi-item updates


### Configuration Issues

#### Issue: Wrong Database Provider Active

**Symptoms:**
- Application starts but uses unexpected database
- Health check shows wrong provider

**Solutions:**
1. Check configuration property:
   ```bash
   # In application logs
   grep "Database provider" logs/application.log
   ```

2. Verify environment variable:
   ```bash
   echo $DATABASE_PROVIDER
   ```

3. Check application.properties:
   ```properties
   idp.database.provider=${DATABASE_PROVIDER:postgresql}
   ```

4. Ensure no conflicting profiles:
   ```bash
   # Check active profile
   echo $QUARKUS_PROFILE
   ```

#### Issue: Health Check Fails

**Symptoms:**
```json
{
  "status": "DOWN",
  "checks": [{
    "name": "database-postgresql",
    "status": "DOWN",
    "data": {"error": "Connection refused"}
  }]
}
```

**Solutions:**
1. Check database connectivity manually
2. Review application logs for detailed error
3. Verify database is running and accessible
4. Check credentials and connection string
5. Test with simple query:
   ```bash
   # PostgreSQL
   psql -h host -U user -d db -c "SELECT 1"
   
   # DynamoDB
   aws dynamodb list-tables --region us-east-1
   ```

#### Issue: Missing Configuration

**Symptoms:**
```
ConfigurationException: Required property 'idp.database.dynamodb.region' not found
```

**Solutions:**
1. Add missing property to `.env` or environment:
   ```bash
   export DYNAMODB_REGION=us-east-1
   ```

2. Check property name matches expected format:
   ```properties
   # Correct
   idp.database.dynamodb.region=us-east-1
   
   # Incorrect
   dynamodb.region=us-east-1
   ```

3. Verify environment variable substitution:
   ```properties
   idp.database.dynamodb.region=${DYNAMODB_REGION}
   ```

### Debugging Tips

#### Enable Debug Logging

```properties
# Application logging
quarkus.log.category."com.angryss.idp".level=DEBUG

# Database provider logging
quarkus.log.category."com.angryss.idp.infrastructure.persistence".level=DEBUG

# PostgreSQL/Hibernate logging
quarkus.hibernate-orm.log.sql=true
quarkus.log.category."org.hibernate.SQL".level=DEBUG
quarkus.log.category."org.hibernate.type.descriptor.sql.BasicBinder".level=TRACE

# DynamoDB/AWS SDK logging
quarkus.log.category."software.amazon.awssdk".level=DEBUG
quarkus.log.category."software.amazon.awssdk.request".level=DEBUG
```

#### Monitor Database Connections

**PostgreSQL:**
```sql
-- Active connections
SELECT pid, usename, application_name, client_addr, state, query
FROM pg_stat_activity
WHERE datname = 'idp_db';

-- Connection pool stats (from application metrics)
curl http://localhost:8082/q/metrics | grep hikaricp
```

**DynamoDB:**
```bash
# CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=idp_stacks \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

#### Test Database Connectivity

```bash
#!/bin/bash
# test-database-connectivity.sh

echo "Testing database connectivity..."

# Test PostgreSQL
if [ "$DATABASE_PROVIDER" = "postgresql" ]; then
  echo "Testing PostgreSQL connection..."
  psql "$DB_URL" -c "SELECT 1" && echo "✓ PostgreSQL connected" || echo "✗ PostgreSQL connection failed"
fi

# Test DynamoDB
if [ "$DATABASE_PROVIDER" = "dynamodb" ]; then
  echo "Testing DynamoDB connection..."
  aws dynamodb list-tables --region "$DYNAMODB_REGION" > /dev/null && echo "✓ DynamoDB connected" || echo "✗ DynamoDB connection failed"
fi

# Test application health
echo "Testing application health..."
curl -f http://localhost:8082/q/health/ready && echo "✓ Application healthy" || echo "✗ Application unhealthy"
```


## Performance Optimization

### PostgreSQL Performance Tuning

#### Connection Pool Optimization

```properties
# Optimal pool size: (core_count * 2) + effective_spindle_count
quarkus.datasource.jdbc.min-size=10
quarkus.datasource.jdbc.max-size=50

# Connection timeout (seconds)
quarkus.datasource.jdbc.acquisition-timeout=10

# Idle connection timeout (minutes)
quarkus.datasource.jdbc.idle-removal-interval=5

# Connection validation
quarkus.datasource.jdbc.validation-query-sql=SELECT 1
quarkus.datasource.jdbc.background-validation-interval=PT2M
```

#### Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_stacks_created_by ON stacks(created_by);
CREATE INDEX idx_stacks_stack_type ON stacks(stack_type);
CREATE INDEX idx_stacks_team_id ON stacks(team_id);
CREATE INDEX idx_blueprints_name ON blueprints(name);

-- Composite indexes for complex queries
CREATE INDEX idx_stacks_type_created ON stacks(stack_type, created_at DESC);

-- Partial indexes for filtered queries
CREATE INDEX idx_active_blueprints ON blueprints(created_at) WHERE is_active = true;
```

#### Batch Operations

```properties
# Enable batch inserts/updates
quarkus.hibernate-orm.jdbc.statement-batch-size=50
quarkus.hibernate-orm.jdbc.order-inserts=true
quarkus.hibernate-orm.jdbc.order-updates=true
```

#### Caching

```properties
# Enable second-level cache
quarkus.hibernate-orm.cache."com.angryss.idp.domain.entities.*".expiration.max-idle=600

# Query result cache
quarkus.hibernate-orm.cache.use-query-cache=true
```

### DynamoDB Performance Tuning

#### Capacity Planning

**On-Demand Mode (Recommended for Variable Traffic):**
```properties
idp.database.dynamodb.billing-mode=PAY_PER_REQUEST
```

**Provisioned Mode (For Predictable Traffic):**
```properties
idp.database.dynamodb.billing-mode=PROVISIONED
idp.database.dynamodb.read-capacity-units=100
idp.database.dynamodb.write-capacity-units=50
```

#### GSI Optimization

Design GSIs for common query patterns:

```java
// Example: Query stacks by creator
// GSI: createdBy-createdAt-index
// Partition Key: createdBy
// Sort Key: createdAt

// Example: Query stacks by type
// GSI: stackType-createdAt-index
// Partition Key: stackType
// Sort Key: createdAt
```

#### Batch Operations

```properties
# Enable batch operations
idp.database.dynamodb.batch-size=25  # Max 25 items per batch

# Parallel batch processing
idp.database.dynamodb.batch-parallelism=4
```

#### Connection Pool

```properties
# Optimize HTTP client
idp.database.dynamodb.max-connections=50
idp.database.dynamodb.connection-timeout=10000
idp.database.dynamodb.socket-timeout=30000
```

#### Request Compression

```properties
# Enable compression for large requests
idp.database.dynamodb.request-compression=true
idp.database.dynamodb.request-compression-threshold=1024
```

### Monitoring and Metrics

#### PostgreSQL Monitoring

```sql
-- Monitor slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Monitor table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

#### DynamoDB Monitoring

```bash
# Monitor consumed capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=idp_stacks \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Monitor throttled requests
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=idp_stacks \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

#### Application Metrics

```bash
# Quarkus metrics endpoint
curl http://localhost:8082/q/metrics

# Database-specific metrics
curl http://localhost:8082/q/metrics | grep database
curl http://localhost:8082/q/metrics | grep hikaricp
curl http://localhost:8082/q/metrics | grep dynamodb
```


## Security Best Practices

### PostgreSQL Security

#### Connection Security

```properties
# Require SSL/TLS
quarkus.datasource.jdbc.url=jdbc:postgresql://host:5432/idp_db?ssl=true&sslmode=require

# Verify server certificate
quarkus.datasource.jdbc.url=jdbc:postgresql://host:5432/idp_db?ssl=true&sslmode=verify-full&sslrootcert=/path/to/ca-cert.pem
```

#### Credential Management

**Using Environment Variables:**
```bash
export DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id idp-api/database \
  --query 'SecretString' \
  --output text | jq -r '.password')
```

**Using Kubernetes Secrets:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
type: Opaque
stringData:
  username: idp_user
  password: secure_password_here
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: idp-api
        env:
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: password
```

#### Database User Permissions

```sql
-- Create dedicated user with minimal permissions
CREATE USER idp_user WITH PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE idp_db TO idp_user;
GRANT USAGE ON SCHEMA public TO idp_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO idp_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO idp_user;

-- Revoke unnecessary permissions
REVOKE CREATE ON SCHEMA public FROM idp_user;
```

#### Network Security

```conf
# pg_hba.conf - Restrict connections
# Allow only from application subnet
host    idp_db    idp_user    10.0.1.0/24    scram-sha-256

# Deny all other connections
host    all       all         0.0.0.0/0      reject
```

### DynamoDB Security

#### IAM Policies

**Principle of Least Privilege:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/idp_*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/idp_*/index/*"
      ]
    }
  ]
}
```

**Deny Dangerous Operations:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "dynamodb:DeleteTable",
        "dynamodb:UpdateTable"
      ],
      "Resource": "*"
    }
  ]
}
```

#### Encryption

**Encryption at Rest (Enabled by Default):**
```bash
# Verify encryption status
aws dynamodb describe-table \
  --table-name idp_stacks \
  --query 'Table.SSEDescription'

# Enable customer-managed key
aws dynamodb update-table \
  --table-name idp_stacks \
  --sse-specification Enabled=true,SSEType=KMS,KMSMasterKeyId=alias/idp-dynamodb-key
```

**Encryption in Transit:**
- All DynamoDB API calls use HTTPS by default
- No additional configuration needed

#### VPC Endpoints

```bash
# Create VPC endpoint for DynamoDB
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxx \
  --service-name com.amazonaws.us-east-1.dynamodb \
  --route-table-ids rtb-xxxxx

# Update security group to allow HTTPS
aws ec2 authorize-security-group-egress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

#### Audit Logging

```bash
# Enable CloudTrail for DynamoDB API calls
aws cloudtrail create-trail \
  --name idp-dynamodb-trail \
  --s3-bucket-name idp-audit-logs

aws cloudtrail start-logging --name idp-dynamodb-trail

# Enable DynamoDB Streams for data changes
aws dynamodb update-table \
  --table-name idp_stacks \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES
```

### General Security Practices

#### Secrets Management

**Never commit secrets to version control:**
```bash
# .gitignore
.env
*.pem
*.key
secrets/
```

**Use secret management services:**
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- Kubernetes Secrets

#### Regular Security Updates

```bash
# Update dependencies regularly
./mvnw versions:display-dependency-updates

# Update base images
docker pull postgres:14
docker pull amazon/dynamodb-local
```

#### Access Logging

```properties
# Enable access logging
quarkus.log.category."com.angryss.idp.infrastructure.security".level=INFO

# Log database operations (be careful with sensitive data)
quarkus.log.category."com.angryss.idp.infrastructure.persistence".level=INFO
```


## Backup and Recovery

### PostgreSQL Backup

#### Automated Backups (RDS)

```bash
# Configure automated backups
aws rds modify-db-instance \
  --db-instance-identifier idp-db \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"

# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier idp-db \
  --db-snapshot-identifier idp-db-snapshot-$(date +%Y%m%d)
```

#### Manual Backups

```bash
# Full database backup
pg_dump -h localhost -U idp_user -d idp_db -F c -f idp_db_backup_$(date +%Y%m%d).dump

# Schema-only backup
pg_dump -h localhost -U idp_user -d idp_db --schema-only -f schema_backup.sql

# Data-only backup
pg_dump -h localhost -U idp_user -d idp_db --data-only -f data_backup.sql

# Compressed backup
pg_dump -h localhost -U idp_user -d idp_db | gzip > idp_db_backup_$(date +%Y%m%d).sql.gz
```

#### Restore from Backup

```bash
# Restore from custom format
pg_restore -h localhost -U idp_user -d idp_db -c idp_db_backup.dump

# Restore from SQL file
psql -h localhost -U idp_user -d idp_db < backup.sql

# Restore from compressed backup
gunzip -c idp_db_backup.sql.gz | psql -h localhost -U idp_user -d idp_db
```

#### Point-in-Time Recovery (RDS)

```bash
# Restore to specific time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier idp-db \
  --target-db-instance-identifier idp-db-restored \
  --restore-time 2024-01-15T10:30:00Z
```

### DynamoDB Backup

#### On-Demand Backups

```bash
# Create backup
aws dynamodb create-backup \
  --table-name idp_stacks \
  --backup-name idp-stacks-backup-$(date +%Y%m%d)

# List backups
aws dynamodb list-backups --table-name idp_stacks

# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name idp_stacks_restored \
  --backup-arn arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/idp_stacks/backup/xxxxx
```

#### Point-in-Time Recovery

```bash
# Enable PITR
aws dynamodb update-continuous-backups \
  --table-name idp_stacks \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

# Restore to specific time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name idp_stacks \
  --target-table-name idp_stacks_restored \
  --restore-date-time 2024-01-15T10:30:00Z
```

#### Export to S3

```bash
# Export table to S3
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/idp_stacks \
  --s3-bucket idp-backups \
  --s3-prefix dynamodb-exports/ \
  --export-format DYNAMODB_JSON

# Import from S3
aws dynamodb import-table \
  --s3-bucket-source S3Bucket=idp-backups,S3KeyPrefix=dynamodb-exports/ \
  --input-format DYNAMODB_JSON \
  --table-creation-parameters TableName=idp_stacks_imported,...
```

### Backup Automation

#### Automated Backup Script

```bash
#!/bin/bash
# backup-database.sh

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

if [ "$DATABASE_PROVIDER" = "postgresql" ]; then
  echo "Backing up PostgreSQL..."
  
  # Create backup
  pg_dump -h $DB_HOST -U $DB_USERNAME -d idp_db -F c \
    -f "$BACKUP_DIR/idp_db_$DATE.dump"
  
  # Upload to S3
  aws s3 cp "$BACKUP_DIR/idp_db_$DATE.dump" \
    s3://idp-backups/postgresql/
  
  # Clean old backups
  find $BACKUP_DIR -name "idp_db_*.dump" -mtime +$RETENTION_DAYS -delete
  
elif [ "$DATABASE_PROVIDER" = "dynamodb" ]; then
  echo "Backing up DynamoDB..."
  
  # Create backups for all tables
  for table in idp_stacks idp_blueprints idp_teams; do
    aws dynamodb create-backup \
      --table-name $table \
      --backup-name ${table}_${DATE}
  done
  
  # Clean old backups
  for table in idp_stacks idp_blueprints idp_teams; do
    aws dynamodb list-backups --table-name $table \
      --time-range-lower-bound $(date -d "$RETENTION_DAYS days ago" +%s) \
      --query 'BackupSummaries[].BackupArn' --output text | \
    while read arn; do
      aws dynamodb delete-backup --backup-arn $arn
    done
  done
fi

echo "Backup completed successfully!"
```

#### Cron Job Setup

```bash
# Add to crontab
crontab -e

# Run daily at 2 AM
0 2 * * * /opt/idp/scripts/backup-database.sh >> /var/log/idp-backup.log 2>&1
```


## Cost Optimization

### PostgreSQL Cost Optimization

#### Self-Managed PostgreSQL

**Pros:**
- No per-request charges
- Predictable monthly costs
- Full control over resources

**Cons:**
- Requires database administration
- Manual scaling and maintenance
- Infrastructure management overhead

**Cost Factors:**
- Server/VM costs
- Storage costs
- Backup storage
- Network egress

#### AWS RDS PostgreSQL

**Cost Optimization Tips:**

1. **Right-size instances:**
   ```bash
   # Start with smaller instance
   db.t3.medium  # 2 vCPU, 4 GB RAM
   
   # Scale up as needed
   db.r5.large   # 2 vCPU, 16 GB RAM
   ```

2. **Use Reserved Instances:**
   - 1-year commitment: ~40% savings
   - 3-year commitment: ~60% savings

3. **Optimize storage:**
   ```bash
   # Use GP3 instead of GP2
   --storage-type gp3
   --allocated-storage 100
   --iops 3000  # Only pay for what you need
   ```

4. **Enable storage autoscaling:**
   ```bash
   --max-allocated-storage 500  # Prevents over-provisioning
   ```

5. **Reduce backup retention:**
   ```bash
   --backup-retention-period 7  # Instead of 30
   ```

### DynamoDB Cost Optimization

#### Billing Modes

**On-Demand Mode:**
- Pay per request
- No capacity planning
- Best for: Unpredictable traffic, new applications

**Provisioned Mode:**
- Pay for provisioned capacity
- Lower cost per request
- Best for: Predictable traffic, steady workloads

#### Cost Optimization Tips

1. **Choose appropriate billing mode:**
   ```bash
   # Calculate break-even point
   # On-demand: $1.25 per million writes, $0.25 per million reads
   # Provisioned: $0.00065 per WCU-hour, $0.00013 per RCU-hour
   
   # If you do > 1.5M writes/month, provisioned is cheaper
   ```

2. **Use auto-scaling (provisioned mode):**
   ```bash
   # Scale between min and max capacity
   --min-capacity 5
   --max-capacity 100
   --target-utilization 70
   ```

3. **Optimize GSI usage:**
   - Only create GSIs for required queries
   - Use sparse indexes (only items with attribute)
   - Consider query patterns carefully

4. **Enable TTL for temporary data:**
   ```bash
   aws dynamodb update-time-to-live \
     --table-name idp_sessions \
     --time-to-live-specification Enabled=true,AttributeName=expiresAt
   ```

5. **Use batch operations:**
   ```java
   // Instead of 25 individual PutItem calls
   // Use 1 BatchWriteItem call (saves 24 requests)
   ```

6. **Compress large items:**
   ```java
   // Compress configuration data before storing
   String compressed = compress(configuration);
   // Reduces storage costs and read/write costs
   ```

7. **Monitor and optimize:**
   ```bash
   # Check consumed capacity
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name ConsumedReadCapacityUnits \
     --dimensions Name=TableName,Value=idp_stacks
   
   # Identify unused GSIs
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name ConsumedReadCapacityUnits \
     --dimensions Name=TableName,Value=idp_stacks,Name=GlobalSecondaryIndexName,Value=unused-index
   ```

### Cost Comparison Example

**Scenario:** 1 million API requests/month, 10 GB data

**PostgreSQL (RDS):**
- Instance: db.t3.medium = $60/month
- Storage: 100 GB GP3 = $11.50/month
- Backups: 100 GB = $9.50/month
- **Total: ~$81/month**

**DynamoDB (On-Demand):**
- Writes: 500K × $1.25/million = $0.63
- Reads: 500K × $0.25/million = $0.13
- Storage: 10 GB × $0.25/GB = $2.50
- **Total: ~$3.26/month**

**DynamoDB (Provisioned):**
- WCU: 5 × $0.00065 × 730 hours = $2.37
- RCU: 5 × $0.00013 × 730 hours = $0.47
- Storage: 10 GB × $0.25/GB = $2.50
- **Total: ~$5.34/month**

*Note: Actual costs vary based on usage patterns, region, and specific requirements.*


## Additional Resources

### Documentation

**PostgreSQL:**
- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [Quarkus Hibernate ORM Guide](https://quarkus.io/guides/hibernate-orm)
- [Flyway Documentation](https://flywaydb.org/documentation/)
- [AWS RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/en-us/azure/postgresql/)

**DynamoDB:**
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [AWS SDK for Java 2.x](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)

**IDP API:**
- [Database Architecture](DATABASE_ARCHITECTURE.md)
- [Database Architecture Diagrams](DATABASE_ARCHITECTURE_DIAGRAMS.md)
- [Database Quick Reference](DATABASE_QUICK_REFERENCE.md)
- [DynamoDB Testing Guide](DYNAMODB_TESTING.md)
- [Environment Variables](ENVIRONMENT_VARIABLES.md)

### Tools

**PostgreSQL:**
- [pgAdmin](https://www.pgadmin.org/) - GUI administration tool
- [psql](https://www.postgresql.org/docs/current/app-psql.html) - Command-line client
- [pg_dump/pg_restore](https://www.postgresql.org/docs/current/backup-dump.html) - Backup tools
- [pgBadger](https://pgbadger.darold.net/) - Log analyzer

**DynamoDB:**
- [AWS CLI](https://aws.amazon.com/cli/) - Command-line interface
- [NoSQL Workbench](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html) - GUI tool
- [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) - Local testing
- [AWS Console](https://console.aws.amazon.com/dynamodb/) - Web interface

### Support

**Getting Help:**
1. Check [troubleshooting section](#troubleshooting) in this guide
2. Review application logs for detailed error messages
3. Check health endpoint: `/q/health/ready`
4. Consult relevant documentation above
5. Contact your DevOps team or cloud provider support

**Reporting Issues:**
- Include database provider (PostgreSQL or DynamoDB)
- Include relevant configuration (sanitize credentials)
- Include error messages and stack traces
- Include steps to reproduce the issue

### Related Guides

- **[Getting Started](../README.md)** - Project overview and setup
- **[Architecture](ARCHITECTURE.md)** - System architecture overview
- **[API Documentation](API_DOCUMENTATION.md)** - REST API reference
- **[OAuth Configuration](OAUTH_CONFIGURATION.md)** - Authentication setup

---

## Summary

This guide covered comprehensive database configuration for the IDP API:

✅ **PostgreSQL Configuration** - Local development, production deployment (self-managed, RDS, Azure)  
✅ **DynamoDB Configuration** - Local development with DynamoDB Local, AWS production deployment  
✅ **Deployment Examples** - Docker Compose, Kubernetes, ECS Fargate  
✅ **Migration Strategies** - Switching between providers, zero-downtime migration  
✅ **Troubleshooting** - Common issues and solutions for both databases  
✅ **Performance Optimization** - Tuning tips for optimal performance  
✅ **Security Best Practices** - Securing connections, credentials, and data  
✅ **Backup and Recovery** - Automated backups and restore procedures  
✅ **Cost Optimization** - Reducing costs while maintaining performance  

For quick reference during development, see [Database Quick Reference](DATABASE_QUICK_REFERENCE.md).

For architectural details and design decisions, see [Database Architecture](DATABASE_ARCHITECTURE.md).

For visual representations of the architecture, see [Database Architecture Diagrams](DATABASE_ARCHITECTURE_DIAGRAMS.md).
