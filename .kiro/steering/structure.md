# Project Structure

This is a monorepo containing two main projects: the backend API and the frontend UI.

## Root Structure

```
/
├── idp-api/          # Backend Quarkus application
├── idp-ui/           # Frontend React application
└── .kiro/            # Kiro configuration and steering rules
```

## Backend Structure (idp-api)

```
idp-api/
├── src/main/java/com/angryss/idp/
│   ├── domain/                    # Domain layer (core business logic)
│   │   ├── entities/              # JPA entities (Stack, Blueprint, Team, etc.)
│   │   ├── valueobjects/          # Value objects and enums
│   │   └── services/              # Domain services (validation, selection logic)
│   ├── application/               # Application layer (use cases)
│   │   ├── dtos/                  # Data Transfer Objects
│   │   └── usecases/              # Application services (StackService, BlueprintService)
│   ├── infrastructure/            # Infrastructure layer
│   │   └── security/              # Security implementations (Traefik auth)
│   └── presentation/              # Presentation layer
│       ├── controllers/           # REST controllers
│       └── mappers/               # Entity to DTO mappers
├── src/main/resources/
│   ├── db/migration/              # Flyway migration scripts (V1__, V2__, etc.)
│   ├── application.properties     # Main configuration
│   └── application-prod.properties # Production overrides
├── src/test/                      # Test mirror of main structure
├── docker/                        # Docker configuration files
├── docs/                          # Architecture and setup documentation
├── k8s/                           # Kubernetes manifests
├── scripts/                       # Utility scripts
└── pom.xml                        # Maven configuration
```

## Frontend Structure (idp-ui)

```
idp-ui/
├── src/
│   ├── components/                # React components
│   │   ├── input/                 # Reusable input components (AngryButton, etc.)
│   │   ├── infrastructure/        # Infrastructure-specific forms
│   │   ├── *.tsx                  # Page/feature components
│   │   └── *.css                  # Component-specific styles
│   ├── contexts/                  # React contexts (ThemeContext)
│   ├── services/                  # API service layer
│   │   └── api.ts                 # Centralized API calls
│   ├── types/                     # TypeScript type definitions
│   │   ├── auth.ts                # Authentication types
│   │   └── stack.ts               # Stack-related types
│   ├── auth.ts                    # Authentication utilities
│   ├── App.tsx                    # Main application component
│   ├── main.tsx                   # Application entry point
│   └── index.css                  # Global styles
├── public/                        # Static assets
├── docs/                          # Architecture documentation
├── package.json                   # NPM dependencies and scripts
├── vite.config.ts                 # Vite configuration
└── tsconfig.json                  # TypeScript configuration
```

## Key Architectural Layers

### Backend (Clean Architecture)

1. **Domain Layer** (`domain/`): Core business entities and logic, framework-agnostic
   - Entities extend `PanacheEntityBase`
   - Value objects are enums or immutable classes
   - Domain services contain business rules

2. **Application Layer** (`application/`): Use cases and orchestration
   - Services coordinate domain objects
   - DTOs define API contracts
   - No framework dependencies

3. **Infrastructure Layer** (`infrastructure/`): External concerns
   - Database implementations
   - Security mechanisms
   - External service integrations

4. **Presentation Layer** (`presentation/`): API interface
   - REST controllers handle HTTP
   - Mappers convert between entities and DTOs
   - Input validation

### Frontend

- **Components**: UI building blocks, organized by feature
- **Services**: API communication layer
- **Types**: Shared TypeScript definitions
- **Contexts**: Global state management

## Configuration Files

### Backend
- `application.properties`: Main config (dev profile)
- `application-prod.properties`: Production overrides
- `.env`: Local environment variables (not committed)
- `docker-compose.yml`: Local development services

### Frontend
- `vite.config.ts`: Build and dev server configuration
- `tsconfig.json`: TypeScript compiler options
- `eslint.config.js`: Linting rules

## Database Migrations

Located in `idp-api/src/main/resources/db/migration/`:
- Follow naming: `V{version}__{description}.sql`
- Example: `V1__schema.sql`, `V2__data.sql`
- Applied automatically in dev, manually in prod

## Documentation

- `idp-api/docs/ARCHITECTURE.md`: Backend architecture details
- `idp-ui/docs/ARCHITECTURE.md`: Frontend architecture details
- `idp-api/docs/ENVIRONMENT_VARIABLES.md`: Configuration reference
- `idp-api/docs/OAUTH_CONFIGURATION.md`: Authentication setup

## Testing

- Backend tests mirror `src/main/java` structure in `src/test/java`
- Use H2 in-memory database for tests
- REST Assured for API testing
- Test profile uses simplified paths (no `/api` prefix)
