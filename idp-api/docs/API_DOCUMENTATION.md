# API Documentation

## Overview

The Internal Developer Platform (IDP) API provides RESTful endpoints for provisioning and managing developer projects across multiple environments. The API supports both OAuth2 Proxy (SSO) authentication for interactive users and API key authentication for programmatic access.

## Documentation Resources

### Interactive Documentation

**Swagger UI** - Interactive API documentation with "Try it out" functionality:
- **Development**: http://localhost:8082/api/q/swagger-ui
- **Production**: https://api.example.com/api/q/swagger-ui

**OpenAPI Specification** - Machine-readable API specification:
- **Development**: http://localhost:8082/api/q/openapi
- **Production**: https://api.example.com/api/q/openapi

### Guides

- **[API Key Authentication Guide](./API_KEY_AUTHENTICATION.md)** - Complete guide for using API keys
- **[Architecture Documentation](./ARCHITECTURE.md)** - System architecture and design patterns
- **[Environment Variables](./ENVIRONMENT_VARIABLES.md)** - Configuration reference
- **[OAuth Configuration](./OAUTH_CONFIGURATION.md)** - OAuth2 Proxy setup

## Quick Start

### Authentication

The API supports two authentication methods:

#### 1. OAuth2 Proxy (Browser-based)
For interactive users accessing the API through a web browser. Authentication is handled automatically by the OAuth2 Proxy.

#### 2. API Key (Programmatic)
For CLI tools, CI/CD pipelines, and scripts. Include your API key in the Authorization header:

```bash
curl -H "Authorization: Bearer idp_user_abc123..." https://api.example.com/api/v1/stacks
```

See the [API Key Authentication Guide](./API_KEY_AUTHENTICATION.md) for detailed instructions.

## API Endpoints

### Base URLs

- **Development**: http://localhost:8082/api/v1
- **Production**: https://api.example.com/api/v1

### Core Resources

#### Stacks
- `GET /v1/stacks` - List all stacks
- `POST /v1/stacks` - Create a new stack
- `GET /v1/stacks/{id}` - Get stack details
- `PUT /v1/stacks/{id}` - Update a stack
- `DELETE /v1/stacks/{id}` - Delete a stack

#### Blueprints
- `GET /v1/blueprints` - List all blueprints
- `POST /v1/blueprints` - Create a new blueprint
- `GET /v1/blueprints/{id}` - Get blueprint details
- `PUT /v1/blueprints/{id}` - Update a blueprint
- `DELETE /v1/blueprints/{id}` - Delete a blueprint

#### API Keys
- `POST /v1/api-keys/user` - Create a user API key
- `POST /v1/api-keys/system` - Create a system API key (admin only)
- `GET /v1/api-keys/user` - List your API keys
- `GET /v1/api-keys/all` - List all API keys (admin only)
- `GET /v1/api-keys/{id}` - Get API key details
- `POST /v1/api-keys/{id}/rotate` - Rotate an API key
- `DELETE /v1/api-keys/{id}` - Revoke an API key
- `PUT /v1/api-keys/{id}/name` - Update API key name
- `GET /v1/api-keys/audit-logs` - Get audit logs (admin only)

#### Admin Resources
- `GET /v1/admin/dashboard` - Admin dashboard statistics
- `GET /v1/cloud-providers` - Manage cloud providers
- `GET /v1/resource-types` - Manage resource types
- `GET /v1/property-schemas` - Manage property schemas

### Health and Monitoring

- `GET /api/q/health` - Health check endpoint
- `GET /api/q/health/live` - Liveness probe
- `GET /api/q/health/ready` - Readiness probe
- `GET /api/q/metrics` - Prometheus metrics

## Request/Response Format

### Content Type

All requests and responses use JSON:
```
Content-Type: application/json
```

### Request Example

```bash
curl -X POST https://api.example.com/api/v1/stacks \
  -H "Authorization: Bearer idp_user_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-api-service",
    "stackType": "RESTFUL_API",
    "environment": "DEV",
    "cloudProvider": "AWS",
    "region": "us-east-1"
  }'
```

### Response Example

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "my-api-service",
  "stackType": "RESTFUL_API",
  "environment": "DEV",
  "cloudProvider": "AWS",
  "region": "us-east-1",
  "status": "PROVISIONING",
  "createdAt": "2024-01-15T10:30:00",
  "updatedAt": "2024-01-15T10:30:00"
}
```

## Error Responses

### Standard Error Format

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2024-01-15T10:30:00"
}
```

### HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Request succeeded with no response body
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or failed
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate name)
- `500 Internal Server Error` - Server error

## Security

### Authentication Methods

1. **OAuth2 Proxy**: Handled by external proxy, user info passed via headers
2. **API Keys**: Bearer token in Authorization header

### Authorization

- **User Role**: Can manage own resources
- **Admin Role**: Full access to all resources and admin endpoints

### Security Best Practices

- Never commit API keys to version control
- Store keys in environment variables or secret management systems
- Rotate keys regularly (recommended: every 90 days)
- Use different keys for different environments
- Monitor audit logs for suspicious activity
- Revoke unused or compromised keys immediately

## Rate Limiting

Rate limiting is applied per API key or user:
- **Standard users**: 1000 requests per hour
- **Admin users**: 5000 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642252800
```

## Pagination

List endpoints support pagination via query parameters:

```bash
GET /v1/stacks?page=1&size=20&sort=createdAt,desc
```

**Parameters**:
- `page` (default: 0): Page number (zero-indexed)
- `size` (default: 20): Items per page
- `sort` (optional): Sort field and direction (e.g., `name,asc`)

**Response**:
```json
{
  "content": [...],
  "page": 0,
  "size": 20,
  "totalElements": 100,
  "totalPages": 5
}
```

## Filtering

List endpoints support filtering via query parameters:

```bash
GET /v1/stacks?environment=DEV&stackType=RESTFUL_API
```

Available filters vary by endpoint. See Swagger UI for details.

## Versioning

The API uses URL-based versioning:
- Current version: `/api/v1`
- Future versions: `/api/v2`, etc.

Breaking changes will be introduced in new versions. The current version will be maintained for at least 6 months after a new version is released.

## Client Libraries

### cURL Examples

See the [API Key Authentication Guide](./API_KEY_AUTHENTICATION.md) for comprehensive cURL examples.

### Python

```python
import requests

API_KEY = "idp_user_abc123..."
BASE_URL = "https://api.example.com/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# List stacks
response = requests.get(f"{BASE_URL}/stacks", headers=headers)
stacks = response.json()
```

### Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.example.com/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.IDP_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// List stacks
const stacks = await client.get('/stacks');
```

### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

String apiKey = System.getenv("IDP_API_KEY");
HttpClient client = HttpClient.newHttpClient();

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/api/v1/stacks"))
    .header("Authorization", "Bearer " + apiKey)
    .header("Content-Type", "application/json")
    .GET()
    .build();

HttpResponse<String> response = client.send(request, 
    HttpResponse.BodyHandlers.ofString());
```

## Support

### Documentation
- Swagger UI: https://api.example.com/api/q/swagger-ui
- API Key Guide: [API_KEY_AUTHENTICATION.md](./API_KEY_AUTHENTICATION.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Contact
- Email: support@angryss.com
- Issue Tracker: https://github.com/angryss/idp/issues

## Changelog

### Version 1.0.0 (Current)

**Features**:
- Stack management (create, read, update, delete)
- Blueprint management
- API key authentication
- OAuth2 Proxy integration
- Multi-cloud support (AWS, Azure, GCP)
- Admin dashboard and audit logs

**API Key Authentication**:
- User and system API keys
- Key rotation with grace period
- Automatic expiration
- Audit logging
- BCrypt hash storage

See the [CHANGELOG.md](../CHANGELOG.md) for detailed version history.
