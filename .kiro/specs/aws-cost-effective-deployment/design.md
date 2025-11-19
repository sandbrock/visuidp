# Design Document

## Overview

This document describes the architecture for deploying VisuIDP to AWS using a cost-effective serverless and managed services approach. The design leverages AWS Lambda for compute, S3 and CloudFront for static content delivery, DynamoDB for the database, and Entra ID for authentication. The architecture is optimized for minimal operational costs while maintaining security, scalability, and feature parity with the existing application. A demo mode is included for hackathon judges to explore the system without authentication or actual deployments.

The deployment consists of:
- **Frontend (idp-ui)**: React application hosted on S3, distributed via CloudFront
- **Backend (idp-api)**: Quarkus application running on Lambda with GraalVM native compilation
- **CLI (idp-cli)**: Rust CLI available as a Lambda function or downloadable binary
- **Database**: DynamoDB with on-demand billing for true serverless scaling to zero
- **Authentication**: Entra ID OIDC with API Gateway HTTP API JWT authorizer (or demo mode for hackathon)
- **Infrastructure**: Deployed using Terraform for repeatable, version-controlled infrastructure

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet Users                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │   Route 53     │
                    │  (DNS)         │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  CloudFront    │
                    │  Distribution  │
                    └────┬───────┬───┘
                         │       │
              ┌──────────┘       └──────────┐
              │                              │
              ▼                              ▼
    ┌─────────────────┐          ┌──────────────────┐
    │   S3 Bucket     │          │   API Gateway    │
    │   (UI Static)   │          │   (REST API)     │
    └─────────────────┘          └────────┬─────────┘
                                          │
                                          ▼
                                 ┌────────────────┐
                                 │    Cognito     │
                                 │   Authorizer   │
                                 └────────┬───────┘
                                          │
                                          ▼
┌────────────────────────────────────────────────────────────────┐
│                           VPC                                   │
│                                                                 │
│  ┌──────────────────┐              ┌──────────────────┐       │
│  │  Lambda Function │              │  Lambda Function │       │
│  │  (IDP-API)       │◄─────────────┤  (IDP-CLI)       │       │
│  └────────┬─────────┘              └──────────────────┘       │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐                                          │
│  │   RDS Proxy      │                                          │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐                                          │
│  │  Aurora          │                                          │
│  │  Serverless v2   │                                          │
│  │  (PostgreSQL)    │                                          │
│  └──────────────────┘                                          │
│                                                                 │
│  Private Subnets                                               │
└────────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### 1. Frontend (IDP-UI)
- **Hosting**: S3 bucket configured for static website hosting
- **Distribution**: CloudFront CDN for global content delivery
- **Build**: Vite production build generates optimized static assets
- **Routing**: CloudFront handles SPA routing with custom error responses
- **Caching**: Aggressive caching for static assets, no caching for index.html

#### 2. Backend (IDP-API)
- **Compute**: AWS Lambda with container image deployment
- **Runtime**: GraalVM native image for fast cold starts (<1 second)
- **Integration**: API Gateway with Lambda proxy integration
- **Networking**: Deployed in existing VPC private subnets for RDS access
- **Configuration**: Environment variables from Systems Manager Parameter Store


#### 3. CLI (IDP-CLI)
- **Deployment Option 1**: Lambda function invoked via API Gateway endpoint
- **Deployment Option 2**: Downloadable binary for local execution
- **Functionality**: Template processing and infrastructure file generation
- **Storage**: Templates stored in S3, outputs returned via API or stored in S3

#### 4. Database
- **Service**: Amazon DynamoDB
- **Scaling**: On-demand billing with automatic scaling to zero when idle
- **Connection Management**: Direct AWS SDK access, no connection pooling needed
- **Networking**: AWS managed service, no VPC required
- **Authentication**: IAM roles, no credentials needed

#### 5. Authentication
- **Service**: Entra ID (Azure AD) OIDC - existing SSO provider
- **Authorization**: API Gateway HTTP API JWT authorizer validates Entra ID tokens
- **Token Flow**: UI obtains JWT from Entra ID, includes in API requests
- **Backend Integration**: Lambda extracts user identity from JWT claims
- **No Additional Services**: Direct integration with existing Entra ID, no Cognito needed

## Components and Interfaces

### CloudFront Distribution

**Purpose**: Global content delivery for UI and API

**Configuration**:
- **Origins**:
  - S3 origin for static UI assets (default behavior)
  - API Gateway origin for API requests (/api/* path pattern)
- **Behaviors**:
  - Default: S3 origin, cache optimized for static content
  - /api/*: API Gateway origin, no caching for dynamic content
- **SSL**: ACM certificate for custom domain
- **Error Handling**: Custom 404 response redirects to index.html for SPA routing

**Interfaces**:
- Input: HTTPS requests from users
- Output: Cached content from S3 or proxied requests to API Gateway

### API Gateway HTTP API

**Purpose**: Cost-effective managed API layer with built-in JWT validation

**Configuration**:
- **Type**: HTTP API (70% cheaper than REST API, $1 vs $3.50 per million requests)
- **Integration**: Lambda proxy integration
- **Authorizer**: JWT authorizer configured with Entra ID OIDC issuer
- **JWT Validation**: Automatic validation of Entra ID tokens (issuer, audience, expiration)
- **Throttling**: Rate limiting and burst limits
- **CORS**: Configured for CloudFront origin

**Interfaces**:
- Input: HTTP requests from CloudFront with Authorization header
- Output: Invokes Lambda function with request context including JWT claims
- Returns: Lambda response to CloudFront

### Lambda Function (IDP-API)

**Purpose**: Execute Quarkus backend application

**Configuration**:
- **Deployment**: Container image from Amazon ECR
- **Runtime**: Custom runtime with GraalVM native image
- **Memory**: 512-1024 MB (tuned for performance vs cost)
- **Timeout**: 30 seconds (API Gateway maximum)
- **VPC**: No VPC attachment needed (DynamoDB is AWS managed)
- **Environment Variables**:
  - DynamoDB table names
  - AWS region
  - Parameter Store paths for configuration
- **IAM Role**: Permissions for DynamoDB, Parameter Store (including KMS for SecureString), S3

**Interfaces**:
- Input: API Gateway event with request details and JWT claims
- Output: HTTP response with status code, headers, and body
- Dependencies: RDS Proxy for database, Parameter Store for config

### Lambda Function (IDP-CLI)

**Purpose**: Execute CLI template processing

**Configuration**:
- **Deployment**: Container image or ZIP with Rust binary
- **Runtime**: Custom runtime or provided.al2
- **Memory**: 256-512 MB
- **Timeout**: 60 seconds (for complex template processing)
- **Environment Variables**: S3 bucket for templates and outputs

**Interfaces**:
- Input: API Gateway event with template processing request
- Output: Generated infrastructure files (returned or stored in S3)
- Dependencies: S3 for template storage

### DynamoDB Single Table

**Purpose**: Fully managed NoSQL database with serverless scaling using single-table design pattern

**Configuration**:
- **Billing Mode**: On-demand (pay per request)
- **Capacity**: Automatically scales to zero when idle
- **Encryption**: Server-side encryption with AWS managed keys
- **Backup**: Point-in-time recovery (PITR) enabled
- **Global Tables**: Optional for multi-region deployment

**Single Table Design**:
- **Table Name**: `visuidp-data`
- **Primary Key**: 
  - `PK` (Partition Key, String): Entity type prefix + ID (e.g., `STACK#uuid`, `TEAM#uuid`)
  - `SK` (Sort Key, String): Metadata or relationship identifier (e.g., `METADATA`, `RESOURCE#uuid`)

**Entity Patterns**:

1. **Stack**:
   - PK: `STACK#<uuid>`
   - SK: `METADATA`
   - Attributes: name, routePath, cloudName, stackType, blueprintId, teamId, etc.

2. **Blueprint**:
   - PK: `BLUEPRINT#<uuid>`
   - SK: `METADATA`
   - Attributes: name, description, cloudProviderId, resources, etc.

3. **Team**:
   - PK: `TEAM#<uuid>`
   - SK: `METADATA`
   - Attributes: name, description, createdBy, createdAt, etc.

4. **CloudProvider**:
   - PK: `CLOUDPROVIDER#<uuid>`
   - SK: `METADATA`
   - Attributes: name, displayName, type, etc.

5. **ApiKey**:
   - PK: `APIKEY#<keyHash>`
   - SK: `METADATA`
   - Attributes: name, type, createdBy, expiresAt, isActive, etc.

**Global Secondary Indexes (GSIs)**:

1. **GSI1** - Query by secondary identifier:
   - PK: `GSI1PK` (e.g., `TEAM#<teamId>`)
   - SK: `GSI1SK` (e.g., `STACK#<stackId>`)
   - Use case: Query all stacks for a team

2. **GSI2** - Query by type and attribute:
   - PK: `GSI2PK` (e.g., `CLOUDPROVIDER#<providerId>`)
   - SK: `GSI2SK` (e.g., `BLUEPRINT#<blueprintId>`)
   - Use case: Query all blueprints for a cloud provider

**Access Patterns**:
- Get stack by ID: `GetItem(PK=STACK#<id>, SK=METADATA)`
- Get all stacks for team: `Query(GSI1, GSI1PK=TEAM#<teamId>, begins_with(GSI1SK, "STACK#"))`
- Get all blueprints for provider: `Query(GSI2, GSI2PK=CLOUDPROVIDER#<id>, begins_with(GSI2SK, "BLUEPRINT#"))`
- Get API key: `GetItem(PK=APIKEY#<hash>, SK=METADATA)`

**Interfaces**:
- Input: DynamoDB API calls from Lambda via AWS SDK
- Output: JSON documents
- Access: IAM role-based authentication

### Entra ID OIDC Integration

**Purpose**: User authentication using existing SSO provider

**Configuration**:
- **Provider**: Microsoft Entra ID (Azure AD)
- **Protocol**: OpenID Connect (OIDC)
- **Token Endpoint**: Entra ID token endpoint
- **Issuer**: https://login.microsoftonline.com/{tenant-id}/v2.0
- **Audience**: Application ID (client ID) registered in Entra ID
- **Token Expiration**: Configured in Entra ID (typically 1 hour)

**Interfaces**:
- Input: Authentication requests from UI to Entra ID
- Output: JWT tokens (ID token, access token) from Entra ID
- Integration: API Gateway HTTP API JWT authorizer validates tokens automatically

### S3 Buckets

**Purpose**: Storage for UI assets, templates, and outputs

**Buckets**:
1. **UI Assets Bucket**:
   - Static website hosting enabled
   - Public read access via CloudFront OAI
   - Lifecycle policy for old versions
2. **Templates Bucket**:
   - Stores CLI templates
   - Private access via IAM roles
3. **Outputs Bucket** (optional):
   - Stores generated infrastructure files
   - Private access with presigned URLs

**Interfaces**:
- Input: Object uploads from deployment pipeline or Lambda
- Output: Object downloads via CloudFront or Lambda

### Demo Mode Configuration

**Purpose**: Enable hackathon judges to explore the application without authentication or actual deployments

**Configuration**:
- **Environment Variable**: `DEMO_MODE=true` enables demo mode
- **Authentication Bypass**: When enabled, API Gateway JWT authorizer is optional
- **Demo User**: System uses a predefined demo user identity (email: demo@visuidp.example)
- **Sample Data**: Database pre-populated with realistic sample stacks, blueprints, and resources
- **Terraform Generation**: CLI generates valid Terraform but skips actual deployment
- **UI Indicator**: Banner or badge shows "Demo Mode" to avoid confusion

**Demo Data**:
- 3-5 sample stacks across different cloud providers (AWS, Azure, GCP)
- 5-10 blueprint templates for common infrastructure patterns
- Sample teams and user assignments
- Pre-generated Terraform examples for each stack type

**Behavior**:
- **Read Operations**: Return sample data from database
- **Write Operations**: Accept requests but don't persist changes (or use separate demo database)
- **Terraform Generation**: Generate valid code but skip deployment steps
- **Authentication**: Skip Entra ID, use demo user identity
- **Cost Estimation**: Show realistic cost estimates for demo stacks

**Implementation**:
- Feature flag in application configuration
- Separate demo database or in-memory data
- UI detects demo mode via API response header
- Clear visual indicators throughout the UI

## Data Models

### Environment Variables (Lambda)

```typescript
interface LambdaEnvironment {
  // DynamoDB Single Table
  DYNAMODB_TABLE_NAME: string;      // Single table name (e.g., "visuidp-data")
  
  // Configuration
  PARAMETER_STORE_PREFIX: string;   // Prefix for Parameter Store paths
  AWS_REGION: string;               // AWS region
  
  // Application
  QUARKUS_PROFILE: string;          // Quarkus profile (prod)
  LOG_LEVEL: string;                // Logging level
  
  // S3
  TEMPLATES_BUCKET: string;         // S3 bucket for templates
  OUTPUTS_BUCKET: string;           // S3 bucket for outputs
}
```

### API Gateway Event

```typescript
interface APIGatewayProxyEvent {
  httpMethod: string;
  path: string;
  headers: Record<string, string>;
  queryStringParameters: Record<string, string> | null;
  body: string | null;
  requestContext: {
    authorizer: {
      claims: {
        sub: string;              // User ID from Cognito
        email: string;            // User email
        'cognito:username': string;
        // Additional JWT claims
      };
    };
  };
}
```

### Terraform Variables and Data Sources

```hcl
# variables.tf
variable "vpc_id" {
  description = "Existing VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Existing private subnet IDs for Lambda and RDS"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Existing public subnet IDs (if needed)"
  type        = list(string)
  default     = []
}

variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PAY_PER_REQUEST or PROVISIONED)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB tables"
  type        = bool
  default     = true
}

variable "lambda_memory_size" {
  description = "Lambda memory in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "domain_name" {
  description = "Custom domain name"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
}

variable "entra_id_tenant_id" {
  description = "Entra ID tenant ID"
  type        = string
}

variable "entra_id_client_id" {
  description = "Entra ID application client ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}
```

### DynamoDB Configuration

```java
// Quarkus configuration for DynamoDB single-table design
public class DynamoDBConfig {
    // DynamoDB client configuration
    DynamoDbClient dynamoDb = DynamoDbClient.builder()
        .region(Region.of(System.getenv("AWS_REGION")))
        .build();
    
    // Single table name from environment variable
    String tableName = System.getenv("DYNAMODB_TABLE_NAME");
    
    // No connection pooling needed - AWS SDK handles this
    // No credentials needed - IAM role provides access
}
```

```java
// Example DynamoDB operations with single-table design

// Get stack by ID
public Stack getStack(String id) {
    GetItemRequest request = GetItemRequest.builder()
        .tableName(tableName)
        .key(Map.of(
            "PK", AttributeValue.builder().s("STACK#" + id).build(),
            "SK", AttributeValue.builder().s("METADATA").build()
        ))
        .build();
    
    GetItemResponse response = dynamoDb.getItem(request);
    return mapToStack(response.item());
}

// Put stack
public void putStack(Stack stack) {
    Map<String, AttributeValue> item = new HashMap<>();
    item.put("PK", AttributeValue.builder().s("STACK#" + stack.getId()).build());
    item.put("SK", AttributeValue.builder().s("METADATA").build());
    item.put("name", AttributeValue.builder().s(stack.getName()).build());
    item.put("teamId", AttributeValue.builder().s(stack.getTeamId()).build());
    // Add GSI attributes for querying
    item.put("GSI1PK", AttributeValue.builder().s("TEAM#" + stack.getTeamId()).build());
    item.put("GSI1SK", AttributeValue.builder().s("STACK#" + stack.getId()).build());
    // ... other attributes
    
    PutItemRequest request = PutItemRequest.builder()
        .tableName(tableName)
        .item(item)
        .build();
    
    dynamoDb.putItem(request);
}

// Query all stacks for a team using GSI1
public List<Stack> getStacksByTeam(String teamId) {
    QueryRequest request = QueryRequest.builder()
        .tableName(tableName)
        .indexName("GSI1")
        .keyConditionExpression("GSI1PK = :teamPK AND begins_with(GSI1SK, :stackPrefix)")
        .expressionAttributeValues(Map.of(
            ":teamPK", AttributeValue.builder().s("TEAM#" + teamId).build(),
            ":stackPrefix", AttributeValue.builder().s("STACK#").build()
        ))
        .build();
    
    QueryResponse response = dynamoDb.query(request);
    return response.items().stream()
        .map(this::mapToStack)
        .collect(Collectors.toList());
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: API timeout compliance

*For any* API endpoint, when invoked via Lambda, the response time should be less than 30 seconds (API Gateway timeout limit).

**Validates: Requirements 1.2**

### Property 2: CLI timeout compliance

*For any* template processing request, when executed via CLI Lambda, the execution time should be less than 60 seconds (Lambda timeout).

**Validates: Requirements 3.4**

### Property 3: API routing completeness

*For any* API endpoint path, when a request is made to API Gateway, it should be routed to the Lambda function and return a valid HTTP response.

**Validates: Requirements 5.1**

### Property 4: Authentication enforcement

*For any* protected API endpoint, when accessed without valid authentication, the request should be rejected with 401 Unauthorized status.

**Validates: Requirements 5.2**

### Property 5: JWT validation

*For any* API request with a JWT token, when the token is invalid or expired, the request should be rejected before reaching the Lambda function.

**Validates: Requirements 6.3**

### Property 6: Error logging completeness

*For any* error that occurs in the Lambda function, the error details and stack trace should be logged to CloudWatch Logs.

**Validates: Requirements 9.2**

### Property 7: API endpoint parity

*For any* REST endpoint in the original application, the deployed AWS version should support the same endpoint with equivalent functionality.

**Validates: Requirements 13.1**

### Property 8: UI feature parity

*For any* user interface feature in the original application, the deployed S3/CloudFront version should provide the same feature with equivalent functionality.

**Validates: Requirements 13.2**

### Property 9: CLI capability parity

*For any* template processing capability in the original CLI, the deployed Lambda version should support the same capability with equivalent functionality.

**Validates: Requirements 13.3**

### Property 10: Authentication feature parity

*For any* authentication or authorization check in the original application, the Cognito-based version should enforce the same security rules.

**Validates: Requirements 13.4**

### Property 11: Database operation parity

*For any* database operation (query, insert, update, delete) in the original application, the Aurora Serverless version should support the same operation with equivalent results.

**Validates: Requirements 13.5**


## Error Handling

### Lambda Function Errors

**Cold Start Failures**:
- **Detection**: CloudWatch metrics for initialization errors
- **Handling**: Retry with exponential backoff at API Gateway level
- **Mitigation**: Use provisioned concurrency for critical endpoints
- **Logging**: Log initialization errors with full context

**Database Connection Errors**:
- **Detection**: Connection timeout or authentication failures
- **Handling**: Return 503 Service Unavailable with retry-after header
- **Mitigation**: Use RDS Proxy for connection management
- **Logging**: Log connection errors with RDS Proxy endpoint details

**Timeout Errors**:
- **Detection**: Lambda execution exceeds timeout
- **Handling**: Return 504 Gateway Timeout
- **Mitigation**: Optimize slow operations, increase timeout if needed
- **Logging**: Log timeout with request details for analysis

**Memory Errors**:
- **Detection**: Out of memory errors in Lambda
- **Handling**: Return 500 Internal Server Error
- **Mitigation**: Increase Lambda memory allocation
- **Logging**: Log memory usage metrics

### API Gateway Errors

**Authentication Failures**:
- **Detection**: Invalid or expired JWT token
- **Handling**: Return 401 Unauthorized with error details
- **Mitigation**: Implement token refresh flow in UI
- **Logging**: Log authentication failures for security monitoring

**Throttling**:
- **Detection**: Request rate exceeds limits
- **Handling**: Return 429 Too Many Requests with retry-after header
- **Mitigation**: Implement client-side rate limiting and backoff
- **Logging**: Log throttling events for capacity planning

**Authorization Failures**:
- **Detection**: Valid token but insufficient permissions
- **Handling**: Return 403 Forbidden
- **Mitigation**: Ensure proper role/permission configuration
- **Logging**: Log authorization failures for audit

### Database Errors

**Throttling Errors**:
- **Detection**: DynamoDB returns ProvisionedThroughputExceededException
- **Handling**: Implement exponential backoff and retry
- **Mitigation**: Use on-demand billing mode or increase provisioned capacity
- **Logging**: Log throttling events for capacity planning

**Item Not Found**:
- **Detection**: GetItem returns empty response
- **Handling**: Return 404 Not Found
- **Mitigation**: Validate item existence before operations
- **Logging**: Log not found errors for debugging

**Conditional Check Failures**:
- **Detection**: ConditionalCheckFailedException on updates
- **Handling**: Return 409 Conflict
- **Mitigation**: Implement optimistic locking with version attributes
- **Logging**: Log conflicts for analysis

**Validation Errors**:
- **Detection**: ValidationException from DynamoDB
- **Handling**: Return 400 Bad Request with details
- **Mitigation**: Validate data before DynamoDB operations
- **Logging**: Log validation errors

### CloudFront/S3 Errors

**Origin Unavailable**:
- **Detection**: API Gateway or S3 returns errors
- **Handling**: Serve cached content if available, otherwise return error page
- **Mitigation**: Configure CloudFront error pages
- **Logging**: CloudFront access logs capture origin errors

**Cache Invalidation Failures**:
- **Detection**: Invalidation request fails
- **Handling**: Retry invalidation, alert operators
- **Mitigation**: Implement versioned asset URLs
- **Logging**: Log invalidation requests and results

### Entra ID Errors

**Entra ID Service Unavailable**:
- **Detection**: Entra ID OIDC service errors
- **Handling**: Return 503 Service Unavailable
- **Mitigation**: Implement retry logic
- **Logging**: Log Entra ID service errors

**Token Validation Failures**:
- **Detection**: Invalid token signature or claims
- **Handling**: Return 401 Unauthorized
- **Mitigation**: Ensure proper token validation configuration in API Gateway
- **Logging**: Log validation failures for security monitoring

### Deployment Errors

**Terraform Apply Failures**:
- **Detection**: Terraform apply fails during resource creation/update
- **Handling**: Review terraform plan, fix issues, and reapply
- **Mitigation**: Always run terraform plan before apply, test in dev environment first
- **Logging**: Terraform logs capture all resource changes and errors

**Container Image Build Failures**:
- **Detection**: Docker build or GraalVM compilation fails
- **Handling**: Fail deployment pipeline
- **Mitigation**: Test builds locally before pushing
- **Logging**: Build logs capture compilation errors

**Migration Failures**:
- **Detection**: Flyway migration fails on deployment
- **Handling**: Rollback deployment
- **Mitigation**: Test migrations against database snapshot
- **Logging**: Log migration errors with SQL details

## Testing Strategy

### Unit Testing

**Backend (Quarkus)**:
- Test business logic independently of AWS services
- Mock AWS SDK calls (Parameter Store, Secrets Manager, S3)
- Test database operations with H2 in-memory database
- Test JWT validation logic with test tokens
- Framework: JUnit 5, Mockito, REST Assured
- Coverage target: 80% for business logic

**Frontend (React)**:
- Test components with React Testing Library
- Test API integration with MSW (Mock Service Worker)
- Test authentication flows with mocked Cognito
- Test routing and navigation
- Framework: Vitest, React Testing Library
- Coverage target: 70% for components

**CLI (Rust)**:
- Test template processing logic
- Test S3 integration with mocked AWS SDK
- Test error handling
- Framework: Rust built-in testing
- Coverage target: 80% for core logic

### Integration Testing

**API Integration**:
- Deploy to test environment
- Test all API endpoints end-to-end
- Verify database operations against real Aurora instance
- Test authentication with test Cognito user pool
- Verify CloudWatch logging
- Framework: REST Assured, Postman/Newman

**UI Integration**:
- Deploy UI to test S3 bucket
- Test UI against deployed API
- Verify CloudFront routing and caching
- Test authentication flow with Cognito
- Framework: Playwright or Cypress

**CLI Integration**:
- Invoke CLI Lambda from test environment
- Verify template processing with real S3 buckets
- Test output generation and storage
- Framework: AWS SDK integration tests

### Property-Based Testing

Property-based tests will be implemented using appropriate libraries for each language:
- **Java (Quarkus)**: jqwik for property-based testing
- **TypeScript (React)**: fast-check for property-based testing
- **Rust (CLI)**: proptest for property-based testing

Each property-based test will:
- Run a minimum of 100 iterations
- Be tagged with a comment referencing the correctness property
- Use the format: `**Feature: aws-cost-effective-deployment, Property {number}: {property_text}**`

**Property Test Examples**:

1. **API Timeout Compliance** (Property 1):
   - Generate random API requests
   - Invoke Lambda function
   - Assert response time < 30 seconds

2. **Authentication Enforcement** (Property 4):
   - Generate random API endpoints
   - Make requests without authentication
   - Assert 401 response for all protected endpoints

3. **JWT Validation** (Property 5):
   - Generate random invalid/expired JWT tokens
   - Make API requests with invalid tokens
   - Assert requests are rejected

4. **API Endpoint Parity** (Property 7):
   - Generate requests for all original API endpoints
   - Verify equivalent endpoints exist in AWS deployment
   - Assert responses match expected format

### Performance Testing

**Load Testing**:
- Use Artillery or k6 for load generation
- Test Lambda scaling under load
- Verify RDS Proxy connection management
- Monitor CloudWatch metrics during load
- Target: Handle 100 concurrent users with <2s response time

**Cold Start Testing**:
- Measure cold start times for Lambda functions
- Target: <1 second for native image
- Test with different memory configurations
- Verify provisioned concurrency if needed

**Database Performance**:
- Test Aurora Serverless scaling
- Verify query performance with realistic data volumes
- Monitor connection pool utilization
- Target: <100ms for simple queries, <500ms for complex queries

### Security Testing

**Authentication Testing**:
- Test Entra ID integration
- Verify JWT validation
- Test token expiration and refresh
- Verify OIDC integration with Entra ID

**Authorization Testing**:
- Test role-based access control
- Verify API endpoint permissions
- Test cross-user data isolation

**Network Security**:
- Verify VPC security groups
- Test database access restrictions
- Verify no public access to RDS
- Test HTTPS enforcement

### Deployment Testing

**Infrastructure Testing**:
- Validate Terraform plan produces expected changes
- Test infrastructure deployment to dev environment with terraform apply
- Verify all resources are created correctly
- Test infrastructure updates and rollbacks with Terraform

**Migration Testing**:
- Test Flyway migrations against database snapshot
- Verify data integrity after migrations
- Test rollback procedures

**Smoke Testing**:
- After deployment, verify critical paths work
- Test authentication flow
- Test key API endpoints
- Verify UI loads and functions
- Test database connectivity

### Monitoring and Observability Testing

**Logging Verification**:
- Verify logs appear in CloudWatch
- Test log aggregation and search
- Verify error logs contain stack traces
- Test log retention policies

**Metrics Verification**:
- Verify custom metrics are published
- Test CloudWatch dashboards
- Verify alarm triggers
- Test metric-based auto-scaling

**Tracing**:
- Implement X-Ray tracing for Lambda
- Verify end-to-end request tracing
- Test performance analysis with traces


## Implementation Considerations

### Terraform Project Structure

**Directory Layout**:
```
terraform/
├── main.tf                 # Main configuration and module calls
├── variables.tf            # Input variables (including VPC/subnet IDs)
├── outputs.tf              # Output values
├── backend.tf              # S3 backend configuration
├── providers.tf            # AWS provider configuration
├── data.tf                 # Data sources for existing VPC/networking
├── dev.tfvars             # Development environment variables
├── staging.tfvars         # Staging environment variables
├── prod.tfvars            # Production environment variables
└── modules/
    ├── dynamodb/          # DynamoDB tables
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── lambda/            # Lambda functions (API and CLI)
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── api-gateway/       # HTTP API, JWT authorizer
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── frontend/          # S3, CloudFront
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── monitoring/        # CloudWatch dashboards, alarms
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

**Backend Configuration**:
```hcl
# backend.tf
# Note: Terraform backend (S3 + DynamoDB) is already configured
terraform {
  backend "s3" {
    # Backend configuration provided via backend config file or CLI
    # Example: terraform init -backend-config=backend-config.hcl
  }
}
```

**Backend Config File** (backend-config.hcl):
```hcl
bucket         = "existing-terraform-state-bucket"
key            = "visuidp/aws-deployment/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "existing-terraform-locks-table"
encrypt        = true
```

**Data Sources for Existing Infrastructure**:
```hcl
# data.tf
# No VPC data sources needed - DynamoDB is AWS managed
# Lambda functions access DynamoDB directly without VPC

# Optional: If you need VPC for other reasons
# data "aws_vpc" "existing" {
#   id = var.vpc_id
# }
```

**Provider Configuration**:
```hcl
# providers.tf
terraform {
  required_version = ">= 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "VisuIDP"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

**Module Usage Example**:
```hcl
# main.tf
module "dynamodb" {
  source = "./modules/dynamodb"
  
  table_name                 = "visuidp-data-${var.environment}"
  billing_mode               = var.dynamodb_billing_mode
  enable_point_in_time_recovery = var.enable_point_in_time_recovery
  environment                = var.environment
}

module "lambda_api" {
  source = "./modules/lambda"
  
  function_name         = "visuidp-api-${var.environment}"
  # No VPC configuration needed for DynamoDB access
  dynamodb_table_name   = module.dynamodb.table_name
  dynamodb_table_arn    = module.dynamodb.table_arn
  memory_size           = var.lambda_memory_size
  timeout               = var.lambda_timeout
  environment           = var.environment
}
```

### Quarkus Lambda Optimization

**Native Image Compilation**:
- Use GraalVM native-image for fast cold starts
- Configure reflection for JPA entities and JAX-RS resources
- Use Quarkus build-time initialization where possible
- Expected cold start: <1 second vs 3-5 seconds for JVM mode

**Configuration**:
```properties
# application.properties for Lambda
quarkus.package.type=native
quarkus.native.container-build=true
quarkus.native.builder-image=quay.io/quarkus/ubi-quarkus-mandrel-builder-image:jdk-21

# Lambda-specific settings
quarkus.lambda.handler=io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler
quarkus.lambda.enable-polling-jvm-mode=false

# Database connection for Lambda
quarkus.datasource.jdbc.min-size=0
quarkus.datasource.jdbc.max-size=2
quarkus.datasource.jdbc.acquisition-timeout=10
```

**Dependencies**:
- Add `quarkus-amazon-lambda-http` for HTTP event handling
- Add `quarkus-amazon-lambda-xray` for tracing
- Use `software.amazon.awssdk:rds` for IAM authentication

### React Build Optimization

**Vite Configuration**:
```typescript
// vite.config.ts for S3 deployment
export default defineConfig({
  base: '/ui/',  // CloudFront path prefix
  build: {
    outDir: 'dist',
    sourcemap: false,  // Disable for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
```

**Build Process**:
1. Run `npm run build` to generate static assets
2. Upload to S3 bucket with appropriate cache headers
3. Invalidate CloudFront cache for changed files
4. Use versioned filenames for cache busting

### Rust CLI Lambda

**Deployment Options**:

**Option 1: Custom Runtime**:
```toml
# Cargo.toml
[dependencies]
lambda_runtime = "0.8"
tokio = { version = "1", features = ["full"] }
aws-sdk-s3 = "1.0"
```

**Option 2: Container Image**:
```dockerfile
FROM public.ecr.aws/lambda/provided:al2

COPY target/release/idp-cli /var/runtime/bootstrap
CMD ["bootstrap"]
```

### DynamoDB Schema Management

**Table Creation**:
- Define tables in Terraform
- Create tables during infrastructure deployment
- No traditional migrations needed

**Schema Evolution**:
- DynamoDB is schemaless - add attributes as needed
- Use application-level versioning for data format changes
- Implement data transformation in application code

**Index Management**:
- Create Global Secondary Indexes (GSI) in Terraform
- Add new GSIs without downtime
- Remove unused GSIs to reduce costs

**Data Migration**:
```java
// Example: Migrate data from old format to new format
public void migrateStackData() {
    // Scan all items
    ScanRequest scanRequest = ScanRequest.builder()
        .tableName(stacksTable)
        .build();
    
    ScanResponse response = dynamoDb.scan(scanRequest);
    
    // Update items with new attributes
    for (Map<String, AttributeValue> item : response.items()) {
        // Transform data as needed
        UpdateItemRequest updateRequest = UpdateItemRequest.builder()
            .tableName(stacksTable)
            .key(Map.of("id", item.get("id")))
            .updateExpression("SET #version = :version")
            .expressionAttributeNames(Map.of("#version", "schemaVersion"))
            .expressionAttributeValues(Map.of(":version", 
                AttributeValue.builder().n("2").build()))
            .build();
        
        dynamoDb.updateItem(updateRequest);
    }
}
```

### Authentication Migration

**Current Code (OAuth2 Proxy)**:
```java
@ApplicationScoped
public class TraefikAuthenticationMechanism implements HttpAuthenticationMechanism {
    @Override
    public Uni<SecurityIdentity> authenticate(RoutingContext context, 
                                              IdentityProviderManager identityProviderManager) {
        String email = context.request().getHeader("X-Forwarded-Email");
        String user = context.request().getHeader("X-Forwarded-User");
        // Create security identity
    }
}
```

**New Code (Cognito JWT)**:
```java
@ApplicationScoped
public class CognitoAuthenticationMechanism implements HttpAuthenticationMechanism {
    @Override
    public Uni<SecurityIdentity> authenticate(RoutingContext context,
                                              IdentityProviderManager identityProviderManager) {
        // JWT is validated by API Gateway authorizer
        // Extract claims from request context
        Map<String, Object> claims = extractClaimsFromContext(context);
        String email = (String) claims.get("email");
        String userId = (String) claims.get("sub");
        // Create security identity
    }
}
```

### Cost Optimization Strategies

**Lambda Optimization**:
- Use ARM64 architecture (Graviton2) for 20% cost savings
- Right-size memory allocation (test 512MB, 1024MB)
- Use provisioned concurrency only for critical endpoints
- Implement caching to reduce invocations

**Database Optimization**:
- Start with Aurora Serverless v2 at 0.5 ACU minimum
- Monitor utilization and adjust capacity range
- Use read replicas only if needed
- Enable Performance Insights for query optimization

**Network Optimization**:
- Use VPC endpoints for S3, DynamoDB, Systems Manager
- Minimize NAT Gateway usage
- Consider single NAT Gateway for dev, multi-AZ for prod

**Storage Optimization**:
- Enable S3 Intelligent-Tiering for UI assets
- Set lifecycle policies for old versions
- Use CloudFront compression
- Optimize image and asset sizes

### Monitoring and Alerting

**CloudWatch Dashboards** (Cost-Optimized):
- Use CloudWatch Free Tier: First 3 dashboards free
- Lambda metrics: invocations, duration, errors, throttles (free metrics)
- API Gateway metrics: requests, latency, 4xx/5xx errors (free metrics)
- DynamoDB metrics: read/write capacity, throttles (free metrics)
- Avoid custom metrics to stay within Free Tier

**CloudWatch Alarms** (Cost-Optimized):
- Use CloudWatch Free Tier: First 10 alarms free
- Critical alarms only:
  - Lambda error rate > 1%
  - API Gateway 5xx error rate > 0.5%
  - DynamoDB throttling events
  - Lambda concurrent executions > 80% of limit
- Use composite alarms to combine multiple conditions into one alarm

**Log Aggregation** (Cost-Optimized):
- **3-day retention** for dev environment (vs 30 days)
- **7-day retention** for prod environment (vs 30 days)
- **Error-level logging only** to reduce ingestion costs
- Use CloudWatch Logs Insights for querying (free within retention period)
- Export critical logs to S3 for long-term storage ($0.023/GB vs $0.03/GB in CloudWatch)
- Filter logs at application level before sending to CloudWatch

**Cost Optimization Settings**:
```hcl
# Terraform configuration
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/visuidp-api-${var.environment}"
  retention_in_days = var.environment == "prod" ? 7 : 3
  
  tags = {
    Environment = var.environment
    CostCenter  = "optimized"
  }
}
```

### Deployment Pipeline

**CI/CD Workflow**:
1. **Build Phase**:
   - Build Quarkus native image
   - Build React production bundle
   - Build Rust CLI binary
   - Run unit tests

2. **Package Phase**:
   - Create Lambda container images
   - Push to ECR
   - Upload UI assets to staging S3

3. **Deploy Phase**:
   - Run terraform plan to preview changes
   - Apply Terraform configuration to target environment
   - Run database migrations
   - Update Lambda function code
   - Invalidate CloudFront cache

4. **Test Phase**:
   - Run smoke tests
   - Run integration tests
   - Verify monitoring and logging

5. **Promote Phase**:
   - Manual approval for production
   - Deploy to production
   - Monitor for errors

**Rollback Strategy**:
- Keep previous Lambda versions
- Use Terraform state history and version control
- Revert to previous Terraform configuration and apply
- Maintain database backups
- Document rollback procedures

### Security Best Practices

**IAM Roles**:
- Principle of least privilege
- Separate roles for each Lambda function
- Use IAM policies for resource access
- Enable IAM Access Analyzer

**Secrets Management**:
- Store all secrets in Parameter Store as SecureString type
- Use KMS encryption for sensitive parameters
- Never hardcode credentials
- Use IAM authentication for RDS where possible
- Rotate credentials by updating Parameter Store values

**Network Security**:
- Database in private subnets only
- Use security groups for access control
- Enable VPC Flow Logs
- Use AWS WAF for CloudFront (optional)

**Encryption**:
- Enable encryption at rest for RDS
- Use KMS for encryption keys
- Enable S3 bucket encryption
- Use HTTPS everywhere

### Cost Estimation

**Monthly Cost Breakdown** (for 3-4 users, hackathon/demo):

- **Lambda**: $0-1
  - **Free Tier: 1M requests + 400K GB-seconds/month**
  - 3-4 users ≈ 10K-50K requests/month = **FREE**
  - 512MB memory, 500ms average duration
  - ARM64 architecture
  - **Likely $0/month!**

- **API Gateway HTTP API**: $0-0.50
  - **Free Tier: First 1M requests**
  - 10K-50K requests/month = **FREE**
  - HTTP API pricing (70% cheaper than REST API)

- **DynamoDB**: $0-0.50
  - On-demand billing
  - 3-4 users ≈ 10K reads, 1K writes/month
  - <1GB storage
  - **Scales to $0 when idle!**
  - **Likely <$0.25/month**

- **CloudFront**: $0
  - **Free Tier: 50GB data transfer, 2M requests/month**
  - 3-4 users well within Free Tier
  - **$0/month**

- **S3**: $0
  - **Free Tier: 5GB storage, 20K GET requests**
  - UI assets <100MB
  - **$0/month**

- **Entra ID**: $0
  - Existing SSO provider
  - No additional cost

- **VPC/NAT Gateway**: $0
  - Not needed with DynamoDB
  - No additional cost

- **CloudWatch**: $0
  - **Free Tier: 5GB ingestion, 10 alarms, 3 dashboards**
  - 3-4 users with error-level logging only
  - 3-day log retention
  - **$0/month**

**Total Estimated Cost for 3-4 Users**: $0-2/month 🎉🎉🎉

**Most Likely Actual Cost**: **<$1/month** (essentially free!)

**Cost Savings vs Aurora Serverless v2**:
- **Saved**: ~$54-76/month (Aurora + RDS Proxy eliminated)
- **Saved**: ~$8-10/month (CloudWatch optimization)
- **Saved**: ~$5-15/month (Lambda Free Tier)
- **98% cost reduction** from original estimate

**Why So Cheap?**:
- All services have generous Free Tiers
- 3-4 users generate minimal traffic
- Serverless scales to zero when idle
- No always-on infrastructure costs

### Migration Path

**Phase 1: Infrastructure Setup** (Week 1)
- Configure Terraform to use existing backend (S3 + DynamoDB)
- Create DynamoDB tables with Terraform
- Configure table schemas and indexes
- Configure Entra ID integration

**Phase 2: Backend Migration** (Week 2-3)
- Update Quarkus application to use DynamoDB SDK
- Build Quarkus native image
- Deploy Lambda function (no VPC needed)
- Set up API Gateway
- Migrate authentication logic
- Migrate data models from relational to DynamoDB

**Phase 3: Frontend Migration** (Week 3)
- Build React production bundle
- Deploy to S3
- Configure CloudFront
- Update API endpoints
- Test authentication flow

**Phase 4: CLI Migration** (Week 4)
- Package CLI as Lambda
- Create API endpoint
- Test template processing
- Provide downloadable binary option

**Phase 5: Testing and Validation** (Week 4-5)
- Run integration tests
- Perform load testing
- Validate feature parity
- Security testing
- Performance tuning

**Phase 6: Production Deployment** (Week 6)
- Deploy to production
- Monitor closely
- Gradual traffic migration
- Decommission old infrastructure

### Risks and Mitigation

**Risk 1: Lambda Cold Starts**
- Mitigation: Use GraalVM native image, provisioned concurrency for critical endpoints
- Fallback: Use ECS Fargate if cold starts are unacceptable

**Risk 2: Database Connection Management**
- Mitigation: Use RDS Proxy for connection pooling
- Fallback: Implement application-level connection management

**Risk 3: Cost Overruns**
- Mitigation: Set up billing alarms, monitor usage closely
- Fallback: Optimize configuration, use reserved capacity

**Risk 4: Authentication Migration Complexity**
- Mitigation: Thorough testing of Cognito integration
- Fallback: Keep OAuth2 Proxy as backup option

**Risk 5: Feature Parity Issues**
- Mitigation: Comprehensive testing against original application
- Fallback: Identify and document any limitations

**Risk 6: Performance Degradation**
- Mitigation: Load testing, performance monitoring
- Fallback: Optimize Lambda configuration, use caching

### Success Criteria

**Functional**:
- All API endpoints functional
- All UI features working
- CLI capabilities available
- Authentication and authorization working
- Database operations successful

**Performance**:
- API response time <2 seconds (p95)
- Cold start time <1 second
- UI load time <3 seconds
- Database query time <500ms (p95)

**Cost**:
- Monthly cost <$150
- Cost per user <$1
- Cost per API request <$0.001

**Reliability**:
- Uptime >99.5%
- Error rate <1%
- Successful deployments >95%

**Security**:
- All secrets in Secrets Manager
- No public database access
- HTTPS everywhere
- IAM roles properly configured
