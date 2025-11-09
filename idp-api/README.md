# IDP REST API

A Quarkus-based RESTful API for the Internal Developer Platform, implementing Clean Architecture principles for provisioning and managing developer projects across multiple environments.

## Prerequisites

- Java 21
- Maven 3.8+
- Docker and Docker Compose

## Local Development Setup

### 1. Start Local Services

Start PostgreSQL and pgAdmin using Docker Compose:

```bash
docker compose up -d
```

This will start:
- **PostgreSQL** on port 5432 (database: `idp_db`, user: `postgres`, password: `postgres`)
- **pgAdmin** on port 8080 (email: `admin@angryss.com`, password: `admin`)

### 2. Run the Application

Start the Quarkus application in development mode:

```bash
./mvnw quarkus:dev
```

The API will be available at `http://localhost:8080/api/v1`

Note on test vs. runtime paths:
- Runtime uses a global root path (`quarkus.http.root-path=/api`), so all application endpoints are served under `/api` (for Traefik path-based routing).
- Test profile does not set a root path to simplify local controller tests; tests call endpoints at `/v1/...` directly.
  - Example: runtime `GET /api/v1/stack-types`, tests `GET /v1/stack-types`.
  - Built-in endpoints (health/metrics/openapi) are available at `/api/q/*` at runtime and `/q/*` in tests.

### 3. Access Services

- **Application**: http://localhost:8080 (OAuth2 Proxy - main entry point)
- **API Documentation**: http://localhost:8080/api/q/swagger-ui
- **pgAdmin**: http://localhost:8081 (for database management)
- **Health Check**: http://localhost:8080/api/q/health
- **Auth Test**: http://localhost:8080/api/v1/auth/headers

## Database & Migrations

- Datasource (local dev example):
  - `quarkus.datasource.db-kind=postgresql`
  - `quarkus.datasource.username=idp_user`
  - `quarkus.datasource.password=idp_password`
  - `quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/idp_dev`

- ORM: Hibernate ORM with Panache (entities under `com.angryss.idp.domain.entities`).

- Migrations: Flyway (versioned SQL under `src/main/resources/db/migration`).
  - Dev profile: runs migrations at startup (`quarkus.flyway.migrate-at-start=true`).
  - Prod profile: validates schema at startup and expects migrations to be run by a one-off job or CI/CD step (`quarkus.flyway.migrate-at-start=false`).
  - To add a change: create a new `V{version}__{description}.sql` file in `db/migration` and apply via Flyway.

Notes:
- We disabled Hibernate’s auto-DDL in dev/prod to avoid conflicts (`schema-management.strategy=validate`).
- Test profile uses H2 with schema auto-created for fast iteration.

## API Documentation

### Interactive Documentation

- **Swagger UI**: http://localhost:8082/api/q/swagger-ui - Interactive API documentation
- **OpenAPI Spec**: http://localhost:8082/api/q/openapi - Machine-readable API specification

### Guides

- **[Complete API Documentation](docs/API_DOCUMENTATION.md)** - Comprehensive API reference
- **[API Key Authentication Guide](docs/API_KEY_AUTHENTICATION.md)** - Guide for programmatic access
- **[Personal API Keys UI Guide](../idp-ui/docs/PERSONAL_API_KEYS.md)** - Managing API keys through the web interface
- **[Architecture Documentation](docs/ARCHITECTURE.md)** - System architecture details

### Quick Reference

#### Stack Types
- `GET /api/v1/stack-types` - Get all stack types
- `GET /api/v1/stack-types/{stackType}` - Get stack type details
- `GET /api/v1/stack-types/{stackType}/supported-languages` - Get supported languages
- `GET /api/v1/stack-types/{stackType}/compute-platform?environment={env}` - Get compute platform info

#### Environments
- `GET /api/v1/environments` - Get all environment configurations
- `GET /api/v1/environments/{environment}` - Get specific environment
- `POST /api/v1/environments` - Create environment configuration (admin only)
- `PUT /api/v1/environments/{environment}` - Update environment (admin only)
- `DELETE /api/v1/environments/{environment}` - Delete environment (admin only)
- `GET /api/v1/environments/{environment}/provisioning-info?stackType={type}` - Get provisioning info

#### API Keys
- `POST /api/v1/api-keys/user` - Create a user API key
- `POST /api/v1/api-keys/system` - Create a system API key (admin only)
- `GET /api/v1/api-keys/user` - List your API keys
- `POST /api/v1/api-keys/{id}/rotate` - Rotate an API key
- `DELETE /api/v1/api-keys/{id}` - Revoke an API key

#### Infrastructure Types
- `GET /api/v1/shared-infrastructure-types` - Get catalog of shared infrastructure types
- `GET /api/v1/stack-infrastructure-types` - Get catalog of stack infrastructure types

#### Projects
- `GET /api/v1/projects` - Get all projects
- `GET /api/v1/projects/{id}` - Get specific project
- `POST /api/v1/projects` - Create new project
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

## Architecture

The application follows Clean Architecture principles with the following layers:

- **Domain Layer**: Core business logic, entities, value objects, and repository interfaces
- **Application Layer**: Use cases, DTOs, and application services
- **Infrastructure Layer**: Database implementations, external service integrations
- **Presentation Layer**: REST controllers and request/response mapping

## Authentication

The application supports two authentication methods:

### 1. OAuth2 Proxy (Interactive Users)

For browser-based access:
- **OAuth2 Proxy**: Handles SAML authentication with AWS Identity Center (external to this application)
- **Header-based Auth**: Quarkus receives user info via `X-Forwarded-User` and `X-Forwarded-Email` headers
- **No OIDC/SAML**: This application has no OIDC or SAML dependencies - authentication is purely header-based
- **User Access**: All requests must go through OAuth2 Proxy at `http://localhost:8080`

Update the `OAUTH2_PROXY_SAML_IDP_METADATA_URL` in `docker-compose.yml` with your AWS Identity Center metadata URL.

### 2. API Key Authentication (Programmatic Access)

For CLI tools, CI/CD pipelines, and scripts:
- **Bearer Token**: Include API key in `Authorization: Bearer <key>` header
- **User Keys**: Personal keys tied to user accounts (`idp_user_*`)
- **System Keys**: Organization-level keys for services (`idp_system_*`)
- **Key Management**: Create, rotate, and revoke keys via UI or API endpoints

**Managing Keys via UI** (Recommended):
1. Log in to the IDP UI at `https://localhost:8443/ui/`
2. Click "API Keys" in the navigation menu
3. Create, rotate, or revoke your personal API keys

See the [Personal API Keys UI Guide](../idp-ui/docs/PERSONAL_API_KEYS.md) for detailed UI instructions, or the [API Key Authentication Guide](docs/API_KEY_AUTHENTICATION.md) for API-based management.

**Quick Example**:
```bash
# Create an API key (requires OAuth2 authentication first)
curl -X POST http://localhost:8082/api/v1/api-keys/user \
  -H "Content-Type: application/json" \
  -d '{"keyName": "My CLI Key", "expirationDays": 90}'

# Use the API key
curl -H "Authorization: Bearer idp_user_abc123..." \
  http://localhost:8082/api/v1/stacks
```

## Environment Types

The system supports two environment types:

- **ON_PREMISES**: Baremetal Kubernetes deployments
- **AWS**: Cloud deployments using Lambda and ECS Fargate

Provisioner selection is automatic based on the target environment configuration.

## Stopping Services

To stop all services:

```bash
docker compose down
```

To stop and remove volumes:

```bash
docker compose down -v
```
