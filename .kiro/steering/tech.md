# Technology Stack

## Backend (idp-api)

- **Framework**: Quarkus 3.20.2
- **Language**: Java 21
- **Build Tool**: Maven 3.8+
- **Database**: PostgreSQL with Flyway migrations
- **ORM**: Hibernate ORM with Panache
- **API Style**: RESTful with JAX-RS (quarkus-rest-jackson)
- **Validation**: Hibernate Validator
- **Documentation**: OpenAPI/Swagger (SmallRye OpenAPI)
- **Monitoring**: Micrometer with Prometheus, SmallRye Health
- **Testing**: JUnit 5, REST Assured, H2 (test database)

### Common Commands (Backend)

```bash
# Development mode with hot reload
./mvnw quarkus:dev

# Run tests
./mvnw test

# Build application
./mvnw clean package

# Build native image
./mvnw package -Pnative

# Start services (PostgreSQL, pgAdmin)
docker compose up -d

# Stop services
docker compose down
```

### API Endpoints

- Base path: `/api/v1` (runtime), `/v1` (tests)
- Built-in endpoints: `/api/q/swagger-ui`, `/api/q/health`, `/api/q/metrics`

## Frontend (idp-ui)

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router DOM 7
- **UI Components**: Syncfusion EJ2 React components
- **Linting**: ESLint 9
- **Port**: 8083 (development)
- **Base Path**: `/ui/`

### Common Commands (Frontend)

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Install dependencies
npm install
```

## Architecture Patterns

### Backend

- **Clean Architecture**: Domain, Application, Infrastructure, Presentation layers
- **Domain Layer**: Entities, value objects, domain services
- **Application Layer**: Use cases (services), DTOs
- **Infrastructure Layer**: Database implementations, external integrations, security
- **Presentation Layer**: REST controllers, mappers

### Data Storage

- **Relational schema**: For well-known, stable structures
- **JSONB columns**: For flexible/dynamic configuration data
- **Entities**: Extend `PanacheEntityBase`, use UUID primary keys
- **Migrations**: Flyway versioned SQL files in `src/main/resources/db/migration`

### Naming Conventions

- **Java**: PascalCase for classes, camelCase for methods/variables
- **Entities**: Singular names (Stack, Blueprint, Team)
- **DTOs**: Suffix with `Dto` (StackCreateDto, StackResponseDto)
- **Services**: Suffix with `Service` (StackService, BlueprintService)
- **Controllers**: Suffix with `Controller` (StacksController)
- **Database**: snake_case for tables and columns

### TypeScript/React

- **Components**: PascalCase, functional components with hooks
- **Files**: Match component name (StackForm.tsx)
- **Types**: Define in separate `types/` directory
- **Services**: Centralized in `services/api.ts`
- **Styling**: Component-specific CSS files

## Security

- **Authentication**: OAuth2 Proxy handles authentication externally
- **Authorization**: Header-based via `X-Forwarded-User` and `X-Forwarded-Email`
- **Custom mechanism**: `TraefikAuthenticationMechanism` for Quarkus security integration
- **No OIDC/SAML in app**: All auth handled by proxy layer

## Development Environment

### Local Setup

Local development requires running services via Docker Compose and starting both applications:

1. **Start Docker services** (from `idp-api/` directory):
   ```bash
   cd idp-api
   docker compose up -d
   ```
   This starts: Traefik, OAuth2 Proxy, PostgreSQL, and pgAdmin

2. **Start backend** (from `idp-api/` directory):
   ```bash
   ./mvnw quarkus:dev
   ```

3. **Start frontend** (from `idp-ui/` directory):
   ```bash
   npm run dev
   ```

### Service Ports

- **Traefik**: Port 8443 (HTTPS - main entry point)
- **OAuth2 Proxy**: Port 8080 (authentication layer)
- **Quarkus API**: Port 8082 (backend)
- **React UI**: Port 8083 (frontend)
- **PostgreSQL**: Port 5432
- **pgAdmin**: Port 8081

### Accessing the Application

Access the application through Traefik at `https://localhost:8443/`:

- **Frontend**: `https://localhost:8443/ui/` - Routes to React app (must be running on port 8083)
- **Backend API**: `https://localhost:8443/api/` - Routes to Quarkus API (must be running on port 8082)

Traefik handles routing and forwards requests to the appropriate local service. Both `idp-api` and `idp-ui` must be running locally for the full application to work.
