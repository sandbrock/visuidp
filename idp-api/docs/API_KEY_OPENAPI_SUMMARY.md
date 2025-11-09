# API Key Authentication - OpenAPI Documentation Summary

This document summarizes the OpenAPI/Swagger documentation added for the API key authentication feature.

## Documentation Components

### 1. OpenAPI Configuration Class

**File**: `src/main/java/com/angryss/idp/infrastructure/openapi/OpenApiConfiguration.java`

**Purpose**: Defines global OpenAPI settings including:
- API information (title, version, description)
- Security schemes (Bearer authentication and OAuth2 Proxy)
- Server URLs
- Comprehensive authentication documentation

**Key Features**:
- Detailed description of both authentication methods
- API key format specifications
- Usage examples in the description
- Security best practices

### 2. Enhanced Controller Annotations

**File**: `src/main/java/com/angryss/idp/presentation/controllers/ApiKeysController.java`

**Enhancements**:
- Detailed operation descriptions with examples
- Request/response body schemas
- Comprehensive error response documentation
- Parameter descriptions with examples
- HTTP status code documentation

**Endpoints Documented**:
- `POST /v1/api-keys/user` - Create user API key
- `POST /v1/api-keys/system` - Create system API key (admin)
- `GET /v1/api-keys/user` - List user API keys
- `GET /v1/api-keys/all` - List all API keys (admin)
- `GET /v1/api-keys/{id}` - Get API key details
- `POST /v1/api-keys/{id}/rotate` - Rotate API key
- `DELETE /v1/api-keys/{id}` - Revoke API key
- `PUT /v1/api-keys/{id}/name` - Update API key name
- `GET /v1/api-keys/audit-logs` - Get audit logs (admin)

### 3. Enhanced DTO Schema Annotations

**Files**:
- `ApiKeyCreateDto.java` - Request schema for creating API keys
- `ApiKeyResponseDto.java` - Response schema for API key metadata
- `ApiKeyCreatedDto.java` - Response schema including plaintext key
- `ApiKeyAuditLogDto.java` - Response schema for audit logs

**Enhancements**:
- Field descriptions with examples
- Data type specifications
- Validation constraints
- Enum value documentation

## Security Schemes

### Bearer Authentication (API Keys)

**Scheme Name**: `BearerAuth`
**Type**: HTTP Bearer
**Format**: API Key

**Description**: Comprehensive documentation including:
- Authorization header format
- API key format specifications (user vs system keys)
- How to obtain an API key
- Security notes (hashing, expiration, rotation)

**Example**:
```
Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678
```

### OAuth2 Proxy Authentication

**Scheme Name**: `OAuth2Proxy`
**Type**: API Key (Header)
**Header**: `X-Forwarded-Email`

**Description**: Documentation for header-based authentication via OAuth2 Proxy

## Documentation Files

### 1. API Key Authentication Guide

**File**: `docs/API_KEY_AUTHENTICATION.md`

**Contents**:
- Complete guide for using API keys
- Creating user and system keys
- Using keys with various tools (cURL, Python, Node.js, Java)
- Managing keys (list, rotate, revoke)
- API key lifecycle and expiration
- Security best practices
- Audit logs
- Error handling
- Troubleshooting

### 2. API Documentation Overview

**File**: `docs/API_DOCUMENTATION.md`

**Contents**:
- Overview of all API endpoints
- Authentication methods
- Request/response formats
- Error handling
- Rate limiting
- Pagination and filtering
- Client library examples
- Versioning information

### 3. Updated README

**File**: `README.md`

**Updates**:
- Added API documentation section
- Links to Swagger UI and OpenAPI spec
- Links to comprehensive guides
- Quick reference for API key endpoints
- Authentication section with both methods

## Accessing the Documentation

### Interactive Documentation (Swagger UI)

**Development**:
```
http://localhost:8082/api/q/swagger-ui
```

**Production**:
```
https://api.example.com/api/q/swagger-ui
```

**Features**:
- Interactive "Try it out" functionality
- Complete endpoint documentation
- Request/response examples
- Authentication configuration
- Schema definitions

### OpenAPI Specification

**Development**:
```
http://localhost:8082/api/q/openapi
```

**Production**:
```
https://api.example.com/api/q/openapi
```

**Format**: JSON or YAML
**Use Cases**:
- Generate client libraries
- Import into API testing tools (Postman, Insomnia)
- Automated testing
- API gateway configuration

## Example Usage in Swagger UI

### 1. Configure Authentication

1. Click the "Authorize" button at the top of Swagger UI
2. Select "BearerAuth" scheme
3. Enter your API key: `idp_user_abc123...`
4. Click "Authorize"

### 2. Try an Endpoint

1. Navigate to "API Keys" section
2. Expand "GET /v1/api-keys/user"
3. Click "Try it out"
4. Click "Execute"
5. View the response

### 3. Create an API Key

1. Expand "POST /v1/api-keys/user"
2. Click "Try it out"
3. Edit the request body:
   ```json
   {
     "keyName": "Test Key",
     "expirationDays": 90
   }
   ```
4. Click "Execute"
5. Copy the returned API key from the response

## Schema Examples

### Request Schema (Create API Key)

```json
{
  "keyName": "CI/CD Pipeline Key",
  "expirationDays": 90
}
```

**Fields**:
- `keyName` (required): String, 1-100 characters
- `expirationDays` (optional): Integer, 1-365, default 90
- `keyType` (optional): Enum [USER, SYSTEM]

### Response Schema (API Key Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "keyName": "CI/CD Pipeline Key",
  "keyPrefix": "idp_user_abc",
  "keyType": "USER",
  "userEmail": "developer@example.com",
  "createdByEmail": "developer@example.com",
  "createdAt": "2024-01-15T10:30:00",
  "expiresAt": "2024-04-15T10:30:00",
  "lastUsedAt": null,
  "isActive": true,
  "isExpiringSoon": false,
  "status": "ACTIVE",
  "apiKey": "idp_user_abc123def456ghi789jkl012mno345pqr678"
}
```

## Testing the Documentation

### 1. Build the Application

```bash
./mvnw clean package -DskipTests
```

### 2. Start the Application

```bash
./mvnw quarkus:dev
```

### 3. Access Swagger UI

Open browser to: http://localhost:8082/api/q/swagger-ui

### 4. Verify Documentation

- Check that "API Keys" tag is present
- Verify all 9 endpoints are documented
- Check security schemes are defined
- Test "Try it out" functionality
- Verify request/response examples are shown

## Integration with API Clients

### Postman

1. Import OpenAPI spec: http://localhost:8082/api/q/openapi
2. Configure Bearer token authentication
3. Use generated requests

### Insomnia

1. Import OpenAPI spec
2. Configure Bearer authentication
3. Use generated requests

### Code Generation

Generate client libraries using OpenAPI Generator:

```bash
# Python client
openapi-generator-cli generate \
  -i http://localhost:8082/api/q/openapi \
  -g python \
  -o ./python-client

# Java client
openapi-generator-cli generate \
  -i http://localhost:8082/api/q/openapi \
  -g java \
  -o ./java-client

# TypeScript client
openapi-generator-cli generate \
  -i http://localhost:8082/api/q/openapi \
  -g typescript-axios \
  -o ./typescript-client
```

## Maintenance

### Updating Documentation

When adding or modifying API key endpoints:

1. Update controller annotations (`@Operation`, `@APIResponse`)
2. Update DTO schema annotations (`@Schema`)
3. Update `API_KEY_AUTHENTICATION.md` guide
4. Update `API_DOCUMENTATION.md` overview
5. Test in Swagger UI
6. Verify OpenAPI spec is valid

### Documentation Standards

- Use clear, concise descriptions
- Include practical examples
- Document all error cases
- Specify required vs optional fields
- Include security considerations
- Provide troubleshooting guidance

## Compliance

This documentation satisfies requirement 5.1:
- ✅ API key authentication documented in OpenAPI/Swagger
- ✅ Examples for Authorization header usage provided
- ✅ All API key endpoints documented with request/response schemas
- ✅ Security scheme for Bearer token authentication added
- ✅ Interactive documentation available via Swagger UI
- ✅ Comprehensive guides created for developers
