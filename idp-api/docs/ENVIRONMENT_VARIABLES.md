# Environment Variables Configuration

This document lists all environment variables used in the IDP API project and how they are configured.

## Environment Variable Usage

All configuration values are stored in `.env` file and used throughout the system:

### Database Configuration

#### Database Provider Selection
| Variable | Description | Default | Used In |
|----------|-------------|---------|---------|
| `DATABASE_PROVIDER` | Database backend to use (`postgresql` or `dynamodb`) | `postgresql` | `application.properties` |

#### PostgreSQL Configuration
Used when `DATABASE_PROVIDER=postgresql`

| Variable | Description | Default | Used In |
|----------|-------------|---------|---------|
| `DB_USERNAME` | PostgreSQL username | `idp_user` | `application.properties` |
| `DB_PASSWORD` | PostgreSQL password | `idp_password` | `application.properties` |
| `DB_URL` | PostgreSQL connection URL | `jdbc:postgresql://localhost:5432/idp_db` | `application.properties` |

#### DynamoDB Configuration
Used when `DATABASE_PROVIDER=dynamodb`

| Variable | Description | Default | Required | Used In |
|----------|-------------|---------|----------|---------|
| `DYNAMODB_REGION` | AWS region for DynamoDB tables | `us-east-1` | ✅ Yes | `application.properties` |
| `DYNAMODB_ENDPOINT` | Custom DynamoDB endpoint (for local testing) | _(empty)_ | ❌ No | `application.properties` |
| `DYNAMODB_TABLE_PREFIX` | Prefix for DynamoDB table names | `idp` | ❌ No | `application.properties` |
| `DYNAMODB_AUTO_CREATE_TABLES` | Auto-create tables on startup | `true` | ❌ No | `application-dynamodb.properties` |
| `DYNAMODB_READ_CAPACITY` | Read capacity units for tables | `5` | ❌ No | `application-dynamodb.properties` |
| `DYNAMODB_WRITE_CAPACITY` | Write capacity units for tables | `5` | ❌ No | `application-dynamodb.properties` |
| `AWS_ACCESS_KEY_ID` | AWS access key (if not using IAM roles) | _(empty)_ | ❌ No | AWS SDK |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key (if not using IAM roles) | _(empty)_ | ❌ No | AWS SDK |
| `AWS_SESSION_TOKEN` | AWS session token (for temporary credentials) | _(empty)_ | ❌ No | AWS SDK |
| `AWS_SDK_LOG_LEVEL` | AWS SDK log level | `WARN` | ❌ No | `application-dynamodb.properties` |
| `DYNAMODB_LOG_LEVEL` | DynamoDB repository log level | `INFO` | ❌ No | `application-dynamodb.properties` |

### HTTP/API Configuration
| Variable | Description | Default | Used In |
|----------|-------------|---------|---------|
| `HTTP_PORT` | API server port | `8082` | `application.properties`, Traefik |
| `API_HOST` | API server host | `172.22.8.222` | Traefik dynamic config |
| `UI_HOST` | UI server host | `172.22.8.222` | Traefik dynamic config |
| `UI_PORT` | UI server port | `8083` | Traefik dynamic config |

### CORS Configuration
| Variable | Description | Default | Used In |
|----------|-------------|---------|---------|
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:8082,http://localhost:8083,https://localhost:8443,http://localhost:3000` | `application.properties` |

### Logging Configuration
| Variable | Description | Default | Used In |
|----------|-------------|---------|---------|
| `LOG_LEVEL` | Application log level | `INFO` | `application.properties` |
| `LOG_SQL` | Enable SQL logging | `false` | `application.properties` |
| `LOG_SQL_LEVEL` | SQL log level | `WARN` | `application.properties` |

### Azure Entra ID Configuration
| Variable | Description | Required | Used In |
|----------|-------------|----------|---------|
| `AZURE_TENANT_ID` | Azure tenant ID | ✅ Yes | `docker-compose.yml` |
| `AZURE_CLIENT_ID` | Azure application client ID | ✅ Yes | `docker-compose.yml` |
| `AZURE_CLIENT_SECRET` | Azure application client secret | ✅ Yes | `docker-compose.yml` |

### OAuth2-Proxy Configuration
| Variable | Description | Required | Used In |
|----------|-------------|----------|---------|
| `OAUTH2_PROXY_COOKIE_SECRET` | Cookie encryption secret (32 chars) | ✅ Yes | `docker-compose.yml` |
| `OAUTH2_PROXY_WHITELIST_DOMAINS` | Comma-separated allowed domains | ✅ Yes | `docker-compose.yml` |

### Domain Configuration
| Variable | Description | Default | Used In |
|----------|-------------|---------|---------|
| `DOMAIN` | Base domain for redirects | `localhost` | `docker-compose.yml` |

## Current .env File Structure

### PostgreSQL Configuration (Default)

```bash
# Database Provider (postgresql or dynamodb)
DATABASE_PROVIDER=postgresql

# PostgreSQL Database Configuration
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_URL=jdbc:postgresql://localhost:5432/idp_db

# HTTP Configuration
HTTP_PORT=8082
API_HOST=172.22.8.222
UI_HOST=172.22.8.222
UI_PORT=8083
CORS_ORIGINS=http://localhost:8082,http://localhost:8083,https://localhost:8443,http://localhost:3000

# Logging Configuration
LOG_LEVEL=INFO
LOG_SQL=false
LOG_SQL_LEVEL=WARN

# Azure Entra ID Configuration
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret

# OAuth2-Proxy Configuration
OAUTH2_PROXY_COOKIE_SECRET=abcdefghijklmnopqrstuvwxyz123456

# Domain Configuration
DOMAIN=localhost

# OAuth2-Proxy Whitelist Domains
OAUTH2_PROXY_WHITELIST_DOMAINS=localhost:8082,localhost:8083,localhost:8443,localhost:3000
```

### DynamoDB Configuration (Alternative)

```bash
# Database Provider
DATABASE_PROVIDER=dynamodb

# DynamoDB Configuration
DYNAMODB_REGION=us-east-1
# Optional: For local testing with DynamoDB Local
# DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE_PREFIX=idp
DYNAMODB_AUTO_CREATE_TABLES=true
DYNAMODB_READ_CAPACITY=5
DYNAMODB_WRITE_CAPACITY=5

# AWS Credentials (optional - use IAM roles in production)
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_SESSION_TOKEN=your-session-token

# AWS SDK Logging
AWS_SDK_LOG_LEVEL=WARN
DYNAMODB_LOG_LEVEL=INFO

# HTTP Configuration (same as PostgreSQL)
HTTP_PORT=8082
API_HOST=172.22.8.222
UI_HOST=172.22.8.222
UI_PORT=8083
CORS_ORIGINS=http://localhost:8082,http://localhost:8083,https://localhost:8443,http://localhost:3000

# Logging Configuration
LOG_LEVEL=INFO

# Azure Entra ID Configuration
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret

# OAuth2-Proxy Configuration
OAUTH2_PROXY_COOKIE_SECRET=abcdefghijklmnopqrstuvwxyz123456

# Domain Configuration
DOMAIN=localhost

# OAuth2-Proxy Whitelist Domains
OAUTH2_PROXY_WHITELIST_DOMAINS=localhost:8082,localhost:8083,localhost:8443,localhost:3000
```

## File Usage Locations

### `application.properties`
Uses environment variables with fallback defaults:
```properties
# Database provider selection
idp.database.provider=${DATABASE_PROVIDER:postgresql}

# PostgreSQL configuration
quarkus.datasource.username=${DB_USERNAME:idp_user}
quarkus.datasource.password=${DB_PASSWORD:idp_password}
quarkus.datasource.jdbc.url=${DB_URL:jdbc:postgresql://localhost:5432/idp_db}

# DynamoDB configuration
idp.database.dynamodb.region=${DYNAMODB_REGION:us-east-1}
idp.database.dynamodb.endpoint=${DYNAMODB_ENDPOINT:}
idp.database.dynamodb.table-prefix=${DYNAMODB_TABLE_PREFIX:idp}

# HTTP configuration
quarkus.http.port=${HTTP_PORT:8082}
quarkus.http.cors.origins=${CORS_ORIGINS:http://localhost:8082,http://localhost:8083,https://localhost:8443,http://localhost:3000}

# Logging configuration
quarkus.hibernate-orm.log.sql=${LOG_SQL:false}
quarkus.log.category."com.angryss.idp".level=${LOG_LEVEL:INFO}
quarkus.log.category."org.hibernate.SQL".level=${LOG_SQL_LEVEL:WARN}
```

### `application-dynamodb.properties`
DynamoDB-specific profile configuration:
```properties
# Database provider
idp.database.provider=dynamodb

# DynamoDB settings
idp.database.dynamodb.region=${DYNAMODB_REGION:us-east-1}
idp.database.dynamodb.table-prefix=${DYNAMODB_TABLE_PREFIX:idp}
idp.database.dynamodb.auto-create-tables=${DYNAMODB_AUTO_CREATE_TABLES:true}
idp.database.dynamodb.read-capacity-units=${DYNAMODB_READ_CAPACITY:5}
idp.database.dynamodb.write-capacity-units=${DYNAMODB_WRITE_CAPACITY:5}

# Disable PostgreSQL components
quarkus.hibernate-orm.enabled=false
quarkus.flyway.enabled=false

# AWS SDK logging
quarkus.log.category."software.amazon.awssdk".level=${AWS_SDK_LOG_LEVEL:WARN}
quarkus.log.category."com.angryss.idp.infrastructure.persistence.dynamodb".level=${DYNAMODB_LOG_LEVEL:INFO}
```

### `docker-compose.yml`
OAuth2-Proxy service uses environment variables:
```yaml
environment:
  OAUTH2_PROXY_AZURE_TENANT: ${AZURE_TENANT_ID}
  OAUTH2_PROXY_CLIENT_ID: ${AZURE_CLIENT_ID}
  OAUTH2_PROXY_CLIENT_SECRET: ${AZURE_CLIENT_SECRET}
  OAUTH2_PROXY_REDIRECT_URL: https://${DOMAIN}:8443/oauth2/callback
  OAUTH2_PROXY_OIDC_ISSUER_URL: https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0
  OAUTH2_PROXY_COOKIE_SECRET: ${OAUTH2_PROXY_COOKIE_SECRET}
  OAUTH2_PROXY_WHITELIST_DOMAINS: "${OAUTH2_PROXY_WHITELIST_DOMAINS}"
```

Traefik service uses environment variables:
```yaml
environment:
  - API_HOST=${API_HOST}
  - UI_HOST=${UI_HOST}
  - HTTP_PORT=${HTTP_PORT}
  - UI_PORT=${UI_PORT}
```

### `traefik/dynamic.yml.template`
Template file with environment variable placeholders:
- `${API_HOST}:${HTTP_PORT}` for API service URL
- `${UI_HOST}:${UI_PORT}` for UI service URL
- `${HTTP_PORT}` and `${UI_PORT}` for CORS origins

## Environment Variable Substitution

### Quarkus (application.properties)
Quarkus natively supports environment variables with fallbacks using `${VAR:default}` syntax.

### Docker Compose
Docker Compose automatically substitutes environment variables from `.env` file using `${VAR}` syntax.

### Traefik Dynamic Configuration
Uses custom entrypoint script (`scripts/traefik-entrypoint.sh`) with `envsubst` to process template files.

## Security Considerations

### Secret Management
- ✅ `.env` file is in `.gitignore`
- ✅ All secrets use environment variables
- ✅ No hardcoded secrets in source code
- ✅ Cookie secret uses proper length (32+ characters)

### Production Deployment
For production, consider:
1. **External secret management**: AWS Secrets Manager, Azure Key Vault
2. **Environment-specific .env files**: `.env.prod`, `.env.staging`
3. **Secret rotation**: Plan for regular rotation of `OAUTH2_PROXY_COOKIE_SECRET` and Azure secrets
4. **Access control**: Limit who can access production environment variables

## Database Provider Configuration

### Choosing a Database Provider

The IDP API supports two database backends:

1. **PostgreSQL** (default): Relational database, best for traditional deployments
2. **DynamoDB**: NoSQL database, best for AWS cloud deployments with auto-scaling needs

### PostgreSQL Setup (Default)

1. Set `DATABASE_PROVIDER=postgresql` (or omit, as it's the default)
2. Configure PostgreSQL connection details:
   ```bash
   DB_USERNAME=idp_user
   DB_PASSWORD=idp_password
   DB_URL=jdbc:postgresql://localhost:5432/idp_db
   ```
3. Start PostgreSQL: `docker compose up -d postgres`
4. Flyway migrations run automatically in dev mode

### DynamoDB Setup

#### Local Development with DynamoDB Local

1. Set `DATABASE_PROVIDER=dynamodb`
2. Configure DynamoDB settings:
   ```bash
   DYNAMODB_REGION=us-east-1
   DYNAMODB_ENDPOINT=http://localhost:8000
   DYNAMODB_AUTO_CREATE_TABLES=true
   ```
3. Start DynamoDB Local:
   ```bash
   docker run -d -p 8000:8000 amazon/dynamodb-local
   ```
4. Tables are created automatically on first startup

#### AWS Production Deployment

1. Set `DATABASE_PROVIDER=dynamodb`
2. Configure AWS region:
   ```bash
   DYNAMODB_REGION=us-east-1
   DYNAMODB_TABLE_PREFIX=idp
   ```
3. Use IAM roles for authentication (recommended):
   - Attach IAM role to ECS task or EC2 instance
   - Grant permissions: `dynamodb:*` on `idp_*` tables
4. Or use AWS credentials (not recommended for production):
   ```bash
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```

### Switching Database Providers

To switch between database providers:

1. Update `DATABASE_PROVIDER` in `.env` file
2. Restart the application
3. Note: Data is not automatically migrated between providers

### Profile-Based Configuration

You can also use Quarkus profiles to manage database configuration:

```bash
# Use DynamoDB profile
./mvnw quarkus:dev -Dquarkus.profile=dynamodb

# Or set environment variable
export QUARKUS_PROFILE=dynamodb
./mvnw quarkus:dev
```

## Development Setup

1. **Copy template**: `cp .env.example .env`
2. **Choose database provider**: Set `DATABASE_PROVIDER` (postgresql or dynamodb)
3. **Configure database**: Update relevant database configuration variables
4. **Generate cookie secret**: `openssl rand -base64 32`
5. **Configure Azure**: Update Azure tenant/client values
6. **Test configuration**: `docker compose config` to validate

## Troubleshooting

### Common Issues

1. **Missing environment variables**
   - Check `.env` file exists and contains all required variables
   - Verify no typos in variable names

2. **Environment substitution not working**
   - For Traefik: Check entrypoint script has execute permissions
   - For Docker Compose: Ensure `.env` is in same directory as `docker-compose.yml`
   - For Quarkus: Verify syntax uses `${VAR:default}` format

3. **Database provider issues**
   - **Invalid provider**: Ensure `DATABASE_PROVIDER` is either `postgresql` or `dynamodb`
   - **PostgreSQL connection failed**: Check `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`
   - **DynamoDB connection failed**: Verify `DYNAMODB_REGION` is correct and AWS credentials are valid
   - **Tables not created**: For DynamoDB, ensure `DYNAMODB_AUTO_CREATE_TABLES=true` in dev
   - **Wrong database active**: Check application logs for "Database provider: {provider}" message

4. **DynamoDB-specific issues**
   - **Access denied**: Verify IAM role has DynamoDB permissions
   - **Endpoint not reachable**: Check `DYNAMODB_ENDPOINT` is correct for local testing
   - **Table already exists**: If auto-create fails, tables may already exist with different schema
   - **Throughput exceeded**: Increase `DYNAMODB_READ_CAPACITY` and `DYNAMODB_WRITE_CAPACITY`

5. **CORS issues**
   - Verify `CORS_ORIGINS` includes all client URLs
   - Check ports match actual running services

6. **Authentication issues**
   - Verify Azure tenant/client ID/secret are correct
   - Check `OAUTH2_PROXY_COOKIE_SECRET` is properly generated
   - Ensure `DOMAIN` matches redirect URL configuration

### Validation Commands

```bash
# Check environment variable substitution
docker compose config

# Verify .env variables are loaded
docker compose run --rm oauth2-proxy printenv | grep OAUTH2_PROXY

# Test Traefik configuration
docker compose up traefik --dry-run

# Check database provider configuration
./mvnw quarkus:dev | grep "Database provider"

# Test DynamoDB connection (local)
aws dynamodb list-tables --endpoint-url http://localhost:8000

# Test PostgreSQL connection
psql -h localhost -U idp_user -d idp_db -c "SELECT 1"
```

## Related Files

- `.env` - Main environment variables file
- `.env.example` - Template with example values
- `.gitignore` - Excludes `.env` from version control
- `application.properties` - Quarkus configuration
- `docker-compose.yml` - Container orchestration
- `traefik/dynamic.yml.template` - Traefik configuration template
- `scripts/traefik-entrypoint.sh` - Environment substitution script