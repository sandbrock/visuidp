# Database Architecture Diagrams

This document contains visual representations of the multi-database support architecture.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Presentation Layer"
        Controllers[REST Controllers]
    end
    
    subgraph "Application Layer"
        Services[Use Case Services]
        DTOs[Data Transfer Objects]
    end
    
    subgraph "Domain Layer"
        Entities[Domain Entities]
        RepoInterfaces[Repository Interfaces]
        DomainServices[Domain Services]
    end
    
    subgraph "Infrastructure Layer - PostgreSQL"
        PostgresRepos[PostgreSQL Repositories]
        Hibernate[Hibernate ORM]
        Flyway[Flyway Migrations]
    end
    
    subgraph "Infrastructure Layer - DynamoDB"
        DynamoRepos[DynamoDB Repositories]
        EntityMapper[Entity Mapper]
        DynamoClient[AWS SDK DynamoDbClient]
    end
    
    subgraph "Data Storage"
        PostgresDB[(PostgreSQL Database)]
        DynamoDB[(DynamoDB Tables)]
    end
    
    Controllers --> Services
    Services --> DTOs
    Services --> RepoInterfaces
    RepoInterfaces -.implements.-> PostgresRepos
    RepoInterfaces -.implements.-> DynamoRepos
    
    PostgresRepos --> Hibernate
    Hibernate --> PostgresDB
    Flyway --> PostgresDB
    
    DynamoRepos --> EntityMapper
    DynamoRepos --> DynamoClient
    DynamoClient --> DynamoDB
    
    Entities -.used by.-> Services
    Entities -.used by.-> PostgresRepos
    Entities -.used by.-> DynamoRepos
    
    style RepoInterfaces fill:#e1f5ff
    style PostgresRepos fill:#c8e6c9
    style DynamoRepos fill:#fff9c4
```

## Repository Pattern Structure

```mermaid
classDiagram
    class Repository~T, ID~ {
        <<interface>>
        +save(T entity) T
        +findById(ID id) Optional~T~
        +findAll() List~T~
        +delete(T entity) void
        +count() long
        +exists(ID id) boolean
    }
    
    class StackRepository {
        <<interface>>
        +findByCreatedBy(String) List~Stack~
        +findByStackType(StackType) List~Stack~
        +findByTeamId(UUID) List~Stack~
        +existsByNameAndCreatedBy(String, String) boolean
    }
    
    class PostgresStackRepository {
        +save(Stack) Stack
        +findById(UUID) Optional~Stack~
        +findAll() List~Stack~
        +findByCreatedBy(String) List~Stack~
        +delete(Stack) void
    }
    
    class DynamoStackRepository {
        -DynamoDbClient client
        -DynamoEntityMapper mapper
        +save(Stack) Stack
        +findById(UUID) Optional~Stack~
        +findAll() List~Stack~
        +findByCreatedBy(String) List~Stack~
        +delete(Stack) void
    }
    
    class StackService {
        -StackRepository repository
        +createStack(StackCreateDto, String) StackResponseDto
        +updateStack(UUID, StackCreateDto) StackResponseDto
        +getStack(UUID) StackResponseDto
        +deleteStack(UUID) void
    }
    
    Repository <|-- StackRepository
    StackRepository <|.. PostgresStackRepository
    StackRepository <|.. DynamoStackRepository
    StackService --> StackRepository
```

## Database Provider Selection Flow

```mermaid
flowchart TD
    Start([Application Startup]) --> ReadConfig[Read idp.database.provider]
    ReadConfig --> ValidateConfig{Valid Provider?}
    
    ValidateConfig -->|Invalid| FailStartup[Fail Startup with Error]
    ValidateConfig -->|postgresql| PostgresPath[PostgreSQL Path]
    ValidateConfig -->|dynamodb| DynamoPath[DynamoDB Path]
    
    PostgresPath --> ValidatePostgresConfig{Validate PostgreSQL Config}
    ValidatePostgresConfig -->|Missing Config| FailStartup
    ValidatePostgresConfig -->|Valid| CreatePostgresBeans[Create PostgreSQL Beans]
    
    DynamoPath --> ValidateDynamoConfig{Validate DynamoDB Config}
    ValidateDynamoConfig -->|Missing Config| FailStartup
    ValidateDynamoConfig -->|Valid| CreateDynamoBeans[Create DynamoDB Beans]
    
    CreatePostgresBeans --> InitPostgres[Initialize Hibernate & Flyway]
    InitPostgres --> RunMigrations[Run Flyway Migrations]
    RunMigrations --> HealthCheck[Database Health Check]
    
    CreateDynamoBeans --> InitDynamo[Initialize DynamoDB Client]
    InitDynamo --> CreateTables[Create Tables if Not Exist]
    CreateTables --> CreateGSIs[Create GSIs]
    CreateGSIs --> HealthCheck
    
    HealthCheck --> HealthPass{Health Check Pass?}
    HealthPass -->|No| FailStartup
    HealthPass -->|Yes| Ready([Application Ready])
    
    FailStartup --> End([Application Terminated])
    Ready --> End
    
    style ReadConfig fill:#e1f5ff
    style CreatePostgresBeans fill:#c8e6c9
    style CreateDynamoBeans fill:#fff9c4
    style Ready fill:#a5d6a7
    style FailStartup fill:#ef9a9a
```

## CDI Bean Injection Flow

```mermaid
sequenceDiagram
    participant App as Application Startup
    participant CDI as CDI Container
    participant Config as Configuration
    participant Service as StackService
    participant Repo as StackRepository
    
    App->>CDI: Initialize CDI Container
    CDI->>Config: Read idp.database.provider
    Config-->>CDI: "postgresql"
    
    CDI->>CDI: Scan for @Named("postgresql") beans
    CDI->>CDI: Check @ConditionalOnProperty
    CDI->>CDI: Create PostgresStackRepository bean
    CDI->>CDI: Skip DynamoStackRepository (condition not met)
    
    Service->>CDI: @Inject StackRepository
    CDI->>CDI: Find qualifying bean
    CDI-->>Service: Inject PostgresStackRepository
    
    Note over Service,Repo: Service uses repository<br/>without knowing implementation
    
    Service->>Repo: save(stack)
    Repo->>Repo: Delegate to Hibernate
```

## PostgreSQL Repository Implementation

```mermaid
flowchart LR
    subgraph "Application Service"
        Service[StackService]
    end
    
    subgraph "Repository Layer"
        RepoInterface[StackRepository Interface]
        PostgresRepo[PostgresStackRepository]
    end
    
    subgraph "ORM Layer"
        Panache[Panache Entity Methods]
        Hibernate[Hibernate ORM]
    end
    
    subgraph "Database"
        PostgresDB[(PostgreSQL)]
    end
    
    Service -->|Calls| RepoInterface
    RepoInterface -.implements.-> PostgresRepo
    PostgresRepo -->|Delegates to| Panache
    Panache -->|Uses| Hibernate
    Hibernate -->|SQL Queries| PostgresDB
    
    style PostgresRepo fill:#c8e6c9
    style PostgresDB fill:#4fc3f7
```

## DynamoDB Repository Implementation

```mermaid
flowchart LR
    subgraph "Application Service"
        Service[StackService]
    end
    
    subgraph "Repository Layer"
        RepoInterface[StackRepository Interface]
        DynamoRepo[DynamoStackRepository]
    end
    
    subgraph "Mapping Layer"
        Mapper[DynamoEntityMapper]
    end
    
    subgraph "AWS SDK"
        Client[DynamoDbClient]
    end
    
    subgraph "AWS Cloud"
        DynamoDB[(DynamoDB Tables)]
    end
    
    Service -->|Calls| RepoInterface
    RepoInterface -.implements.-> DynamoRepo
    DynamoRepo -->|Convert Entity| Mapper
    Mapper -->|AttributeValue Map| DynamoRepo
    DynamoRepo -->|PutItem/GetItem| Client
    Client -->|HTTPS API| DynamoDB
    
    style DynamoRepo fill:#fff9c4
    style DynamoDB fill:#ff9800
```

## Entity Mapping Flow (DynamoDB)

```mermaid
sequenceDiagram
    participant Repo as DynamoStackRepository
    participant Mapper as DynamoEntityMapper
    participant Client as DynamoDbClient
    participant DB as DynamoDB
    
    Note over Repo,Mapper: Save Operation
    Repo->>Mapper: stackToItem(stack)
    Mapper->>Mapper: Convert UUID to String
    Mapper->>Mapper: Convert LocalDateTime to ISO String
    Mapper->>Mapper: Convert Enum to String
    Mapper->>Mapper: Convert Map to AttributeValue
    Mapper-->>Repo: Map<String, AttributeValue>
    
    Repo->>Client: putItem(tableName, item)
    Client->>DB: PutItem API Call
    DB-->>Client: Success
    Client-->>Repo: PutItemResponse
    
    Note over Repo,Mapper: Retrieve Operation
    Repo->>Client: getItem(tableName, key)
    Client->>DB: GetItem API Call
    DB-->>Client: Item Data
    Client-->>Repo: GetItemResponse
    
    Repo->>Mapper: itemToStack(item)
    Mapper->>Mapper: Convert String to UUID
    Mapper->>Mapper: Convert ISO String to LocalDateTime
    Mapper->>Mapper: Convert String to Enum
    Mapper->>Mapper: Convert AttributeValue to Map
    Mapper-->>Repo: Stack Entity
```

## DynamoDB Table Structure

```mermaid
erDiagram
    IDP_STACKS {
        string id PK
        string name
        string stackType
        string createdBy
        string createdAt
        string description
        string teamId FK
        string blueprintId FK
        map configuration
    }
    
    IDP_TEAMS {
        string id PK
        string name
        string description
        string createdAt
    }
    
    IDP_BLUEPRINTS {
        string id PK
        string name
        string description
        boolean isActive
        string createdAt
    }
    
    IDP_STACKS ||--o{ IDP_TEAMS : "belongs to"
    IDP_STACKS ||--o{ IDP_BLUEPRINTS : "uses"
    
    IDP_STACKS }|--|| GSI_CREATED_BY : "indexed by"
    IDP_STACKS }|--|| GSI_STACK_TYPE : "indexed by"
    IDP_STACKS }|--|| GSI_TEAM_ID : "indexed by"
    
    GSI_CREATED_BY {
        string createdBy PK
        string createdAt SK
    }
    
    GSI_STACK_TYPE {
        string stackType PK
        string createdAt SK
    }
    
    GSI_TEAM_ID {
        string teamId PK
        string createdAt SK
    }
```

## PostgreSQL Schema Structure

```mermaid
erDiagram
    STACKS {
        uuid id PK
        varchar name
        varchar stack_type
        varchar created_by
        timestamp created_at
        text description
        uuid team_id FK
        uuid blueprint_id FK
        jsonb configuration
    }
    
    TEAMS {
        uuid id PK
        varchar name
        text description
        timestamp created_at
    }
    
    BLUEPRINTS {
        uuid id PK
        varchar name
        text description
        boolean is_active
        timestamp created_at
    }
    
    STACKS }o--|| TEAMS : "belongs to"
    STACKS }o--|| BLUEPRINTS : "uses"
```

## Transaction Flow Comparison

```mermaid
flowchart TB
    subgraph "PostgreSQL Transaction"
        PG1[Begin Transaction] --> PG2[Execute SQL 1]
        PG2 --> PG3[Execute SQL 2]
        PG3 --> PG4[Execute SQL 3]
        PG4 --> PG5{All Success?}
        PG5 -->|Yes| PG6[Commit]
        PG5 -->|No| PG7[Rollback]
    end
    
    subgraph "DynamoDB Transaction"
        DY1[Build TransactWriteItems] --> DY2[Add Put/Update/Delete Items]
        DY2 --> DY3[Execute Transaction]
        DY3 --> DY4{All Success?}
        DY4 -->|Yes| DY5[All Items Written]
        DY4 -->|No| DY6[None Written - Atomic Rollback]
    end
    
    style PG6 fill:#a5d6a7
    style PG7 fill:#ef9a9a
    style DY5 fill:#a5d6a7
    style DY6 fill:#ef9a9a
```

## Query Pattern Optimization

```mermaid
graph TB
    subgraph "Query Patterns"
        Q1[Get by ID]
        Q2[List All]
        Q3[Filter by Attribute]
        Q4[Complex Join]
        Q5[Aggregation]
    end
    
    subgraph "PostgreSQL Strengths"
        PG1[Indexed Lookup - Fast]
        PG2[Table Scan - Acceptable]
        PG3[WHERE Clause - Fast]
        PG4[JOIN - Excellent]
        PG5[GROUP BY/SUM - Excellent]
    end
    
    subgraph "DynamoDB Strengths"
        DY1[GetItem - Excellent]
        DY2[Scan - Slow/Expensive]
        DY3[Query on GSI - Fast]
        DY4[Multiple Queries - Acceptable]
        DY5[Application Logic - Required]
    end
    
    Q1 --> PG1
    Q1 --> DY1
    Q2 --> PG2
    Q2 --> DY2
    Q3 --> PG3
    Q3 --> DY3
    Q4 --> PG4
    Q4 --> DY4
    Q5 --> PG5
    Q5 --> DY5
    
    style DY1 fill:#a5d6a7
    style DY2 fill:#ef9a9a
    style PG4 fill:#a5d6a7
    style PG5 fill:#a5d6a7
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Application Deployment"
        App[IDP API Application]
        Config[Configuration Property:<br/>idp.database.provider]
    end
    
    subgraph "PostgreSQL Deployment"
        PGApp[App with PostgreSQL Config]
        PGConn[Connection Pool]
        PGMigrate[Flyway Migrations]
        PGDB[(PostgreSQL<br/>RDS/Azure/Self-hosted)]
    end
    
    subgraph "DynamoDB Deployment"
        DYApp[App with DynamoDB Config]
        IAM[IAM Role]
        DYClient[DynamoDB Client]
        DYDB[(DynamoDB<br/>AWS Managed)]
    end
    
    App --> Config
    Config -->|postgresql| PGApp
    Config -->|dynamodb| DYApp
    
    PGApp --> PGConn
    PGApp --> PGMigrate
    PGConn --> PGDB
    PGMigrate --> PGDB
    
    DYApp --> IAM
    DYApp --> DYClient
    IAM --> DYClient
    DYClient --> DYDB
    
    style PGApp fill:#c8e6c9
    style DYApp fill:#fff9c4
    style PGDB fill:#4fc3f7
    style DYDB fill:#ff9800
```

## Health Check Flow

```mermaid
sequenceDiagram
    participant Client as Health Check Client
    participant Endpoint as /q/health/ready
    participant HealthCheck as DatabaseHealthCheck
    participant Repo as StackRepository
    participant DB as Database
    
    Client->>Endpoint: GET /q/health/ready
    Endpoint->>HealthCheck: call()
    
    HealthCheck->>Repo: count()
    
    alt Database Available
        Repo->>DB: Execute Query
        DB-->>Repo: Result
        Repo-->>HealthCheck: Count
        HealthCheck-->>Endpoint: UP (200)
        Endpoint-->>Client: {"status": "UP", "checks": [...]}
    else Database Unavailable
        Repo->>DB: Execute Query
        DB-->>Repo: Error
        Repo-->>HealthCheck: Exception
        HealthCheck-->>Endpoint: DOWN (503)
        Endpoint-->>Client: {"status": "DOWN", "checks": [...]}
    end
```

## Testing Strategy

```mermaid
graph TB
    subgraph "Unit Tests"
        UT1[Service Tests with Mocked Repositories]
        UT2[Mapper Tests]
        UT3[Domain Logic Tests]
    end
    
    subgraph "Integration Tests - PostgreSQL"
        IT1[H2 In-Memory Database]
        IT2[Repository CRUD Tests]
        IT3[Transaction Tests]
        IT4[Relationship Loading Tests]
    end
    
    subgraph "Integration Tests - DynamoDB"
        IT5[DynamoDB Local Docker]
        IT6[Repository CRUD Tests]
        IT7[GSI Query Tests]
        IT8[Transaction Tests]
    end
    
    subgraph "Contract Tests"
        CT1[Parameterized Tests]
        CT2[Run Against Both Implementations]
        CT3[Verify Identical Behavior]
    end
    
    UT1 --> IT1
    UT1 --> IT5
    IT2 --> CT1
    IT6 --> CT1
    CT1 --> CT2
    CT2 --> CT3
    
    style UT1 fill:#e1f5ff
    style IT1 fill:#c8e6c9
    style IT5 fill:#fff9c4
    style CT3 fill:#a5d6a7
```

## Configuration Validation Flow

```mermaid
flowchart TD
    Start([Startup Event]) --> ReadProvider[Read idp.database.provider]
    ReadProvider --> CheckProvider{Provider Value}
    
    CheckProvider -->|postgresql| CheckPGConfig[Check PostgreSQL Config]
    CheckProvider -->|dynamodb| CheckDYConfig[Check DynamoDB Config]
    CheckProvider -->|other| InvalidProvider[Invalid Provider Error]
    
    CheckPGConfig --> HasURL{Has DB URL?}
    HasURL -->|No| MissingPGConfig[Missing PostgreSQL Config Error]
    HasURL -->|Yes| HasUser{Has Username?}
    HasUser -->|No| MissingPGConfig
    HasUser -->|Yes| HasPass{Has Password?}
    HasPass -->|No| MissingPGConfig
    HasPass -->|Yes| PGValid[PostgreSQL Config Valid]
    
    CheckDYConfig --> HasRegion{Has AWS Region?}
    HasRegion -->|No| MissingDYConfig[Missing DynamoDB Config Error]
    HasRegion -->|Yes| DYValid[DynamoDB Config Valid]
    
    PGValid --> TestConnection[Test Database Connection]
    DYValid --> TestConnection
    
    TestConnection --> ConnSuccess{Connection OK?}
    ConnSuccess -->|Yes| LogSuccess[Log Success]
    ConnSuccess -->|No| ConnError[Connection Error]
    
    InvalidProvider --> FailStartup[Fail Application Startup]
    MissingPGConfig --> FailStartup
    MissingDYConfig --> FailStartup
    ConnError --> FailStartup
    
    LogSuccess --> Continue([Continue Startup])
    FailStartup --> End([Application Terminated])
    
    style PGValid fill:#c8e6c9
    style DYValid fill:#fff9c4
    style LogSuccess fill:#a5d6a7
    style FailStartup fill:#ef9a9a
```

## Data Flow - Create Stack Example

```mermaid
sequenceDiagram
    participant Client as REST Client
    participant Controller as StacksController
    participant Service as StackService
    participant Repo as StackRepository
    participant DB as Database
    
    Client->>Controller: POST /api/v1/stacks
    Controller->>Controller: Validate StackCreateDto
    Controller->>Service: createStack(dto, user)
    
    Service->>Service: Create Stack entity
    Service->>Service: Apply business rules
    Service->>Repo: save(stack)
    
    alt PostgreSQL Implementation
        Repo->>Repo: stack.persist()
        Repo->>DB: INSERT INTO stacks...
        DB-->>Repo: Success
    else DynamoDB Implementation
        Repo->>Repo: entityMapper.stackToItem(stack)
        Repo->>DB: PutItem(item)
        DB-->>Repo: Success
    end
    
    Repo-->>Service: Saved Stack
    Service->>Service: Map to StackResponseDto
    Service-->>Controller: StackResponseDto
    Controller-->>Client: 201 Created + StackResponseDto
```

## Legend

```mermaid
graph LR
    subgraph "Color Coding"
        PostgreSQL[PostgreSQL Components]
        DynamoDB[DynamoDB Components]
        Shared[Shared/Interface Components]
        Success[Success State]
        Error[Error State]
    end
    
    style PostgreSQL fill:#c8e6c9
    style DynamoDB fill:#fff9c4
    style Shared fill:#e1f5ff
    style Success fill:#a5d6a7
    style Error fill:#ef9a9a
```
