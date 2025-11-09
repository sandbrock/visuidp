# IDP API Documentation

Welcome to the IDP API documentation. This directory contains comprehensive guides for understanding, configuring, and developing the Internal Developer Platform API.

## Getting Started

- **[Architecture](ARCHITECTURE.md)** - System architecture overview and design principles
- **[Environment Variables](ENVIRONMENT_VARIABLES.md)** - Complete configuration reference

## Database Documentation

The IDP API supports multiple database backends through a pluggable architecture:

- **[Database Architecture](DATABASE_ARCHITECTURE.md)** ⭐ - Comprehensive guide to the repository pattern implementation and database provider selection mechanism
- **[Database Architecture Diagrams](DATABASE_ARCHITECTURE_DIAGRAMS.md)** - Visual representations of the database architecture with Mermaid diagrams
- **[Database Quick Reference](DATABASE_QUICK_REFERENCE.md)** - Quick start guide for developers working with repositories
- **[Database Configuration](DATABASE_CONFIGURATION.md)** - Step-by-step configuration guide for PostgreSQL and DynamoDB
- **[Database Troubleshooting](DATABASE_TROUBLESHOOTING.md)** - Common issues, solutions, and debugging tips for both database providers
- **[DynamoDB Testing](DYNAMODB_TESTING.md)** - Guide for testing with DynamoDB Local

## API Documentation

- **[API Documentation](API_DOCUMENTATION.md)** - REST API reference and endpoint documentation
- **[API Key Authentication](API_KEY_AUTHENTICATION.md)** - API key authentication system documentation
- **[API Key OpenAPI Summary](API_KEY_OPENAPI_SUMMARY.md)** - OpenAPI specification for API key endpoints

## Authentication & Security

- **[OAuth Configuration](OAUTH_CONFIGURATION.md)** - OAuth2 Proxy and SSO setup guide
- **[Azure Entra ID Setup](AZURE_ENTRA_ID_SETUP.md)** - Azure Active Directory integration guide

## Documentation by Topic

### For Developers

Start here if you're developing features or fixing bugs:

1. [Architecture](ARCHITECTURE.md) - Understand the Clean Architecture structure
2. [Database Quick Reference](DATABASE_QUICK_REFERENCE.md) - Learn how to work with repositories
3. [Database Architecture](DATABASE_ARCHITECTURE.md) - Deep dive into the database abstraction layer
4. [API Documentation](API_DOCUMENTATION.md) - REST API contracts and examples

### For DevOps/Operations

Start here if you're deploying or configuring the application:

1. [Database Configuration](DATABASE_CONFIGURATION.md) - Configure PostgreSQL or DynamoDB
2. [Environment Variables](ENVIRONMENT_VARIABLES.md) - All configuration options
3. [OAuth Configuration](OAUTH_CONFIGURATION.md) - Set up authentication
4. [Database Architecture](DATABASE_ARCHITECTURE.md) - Understand deployment considerations

### For Architects

Start here if you're evaluating or designing system integrations:

1. [Architecture](ARCHITECTURE.md) - High-level system design
2. [Database Architecture](DATABASE_ARCHITECTURE.md) - Database abstraction layer design
3. [Database Architecture Diagrams](DATABASE_ARCHITECTURE_DIAGRAMS.md) - Visual architecture representations
4. [API Documentation](API_DOCUMENTATION.md) - API contracts and integration points

## Key Concepts

### Clean Architecture

The application follows Clean Architecture principles with four layers:

- **Domain Layer**: Core business entities and logic
- **Application Layer**: Use cases and orchestration
- **Infrastructure Layer**: Database, security, external services
- **Presentation Layer**: REST controllers and API

### Repository Pattern

The application uses the Repository pattern to abstract data persistence:

- **Repository Interfaces**: Define data access contracts (domain layer)
- **Repository Implementations**: Provide database-specific implementations (infrastructure layer)
- **Dependency Injection**: CDI automatically injects the correct implementation

This allows the application to support multiple database backends (PostgreSQL and DynamoDB) without changing business logic.

### Multi-Database Support

The application can be configured to use either:

- **PostgreSQL**: Relational database with Hibernate ORM and Flyway migrations
- **DynamoDB**: NoSQL database with AWS SDK and programmatic table management

The database provider is selected via a single configuration property: `idp.database.provider`

## Quick Links

### Common Tasks

- **Add a new entity**: See [Database Quick Reference](DATABASE_QUICK_REFERENCE.md#creating-a-new-repository)
- **Configure database**: See [Database Configuration](DATABASE_CONFIGURATION.md)
- **Run tests**: See [DynamoDB Testing](DYNAMODB_TESTING.md)
- **Deploy to production**: See [Database Configuration](DATABASE_CONFIGURATION.md#production-deployment)
- **Troubleshoot issues**: See [Database Troubleshooting](DATABASE_TROUBLESHOOTING.md)

### Architecture Diagrams

All architecture diagrams are available in [Database Architecture Diagrams](DATABASE_ARCHITECTURE_DIAGRAMS.md):

- High-level architecture
- Repository pattern structure
- Database provider selection flow
- CDI bean injection flow
- PostgreSQL implementation
- DynamoDB implementation
- Entity mapping flow
- Transaction flow comparison
- Query pattern optimization
- Deployment architecture
- Health check flow
- Testing strategy

## Contributing

When adding new features or making changes:

1. Follow Clean Architecture principles
2. Use repository interfaces for data access
3. Write tests for both PostgreSQL and DynamoDB implementations
4. Update relevant documentation
5. Add architecture diagrams if introducing new patterns

## Support

For questions or issues:

- Check the relevant documentation above
- Review application logs for detailed error messages
- Check health endpoint: `/api/q/health`
- Consult [Quarkus documentation](https://quarkus.io/guides/)
- Consult [AWS SDK documentation](https://docs.aws.amazon.com/sdk-for-java/)
