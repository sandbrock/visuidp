# API Key Authentication Guide

This guide explains how to use API key authentication with the Internal Developer Platform API.

## Overview

The IDP API supports two authentication methods:

1. **OAuth2 Proxy (SSO)** - For interactive browser-based access
2. **API Key Authentication** - For programmatic access (CLI tools, CI/CD pipelines, scripts)

This document focuses on API key authentication.

## Personal vs Admin API Keys Pages

The IDP UI provides two different pages for managing API keys:

### Personal API Keys Page (`/api-keys`)

- **Access**: All authenticated users
- **Purpose**: Manage your own personal API keys
- **What you see**: Only your own USER-type API keys
- **What you can do**: Create, rotate, revoke, and rename your personal keys
- **Navigation**: Click "API Keys" in the main navigation menu

**Use this page** when you need to manage API keys for your own development, testing, or automation.

### Admin API Keys Page (`/admin/api-keys`)

- **Access**: Administrators only
- **Purpose**: Manage all API keys in the system
- **What you see**: All API keys (all users + system keys)
- **What you can do**: Create USER and SYSTEM keys, view all keys, manage any key
- **Navigation**: Admin Dashboard → API Keys Management

**Use this page** when you need to create system-level keys or manage API keys across the organization.

For more details, see the [Personal API Keys Guide](../../idp-ui/docs/PERSONAL_API_KEYS.md).

## API Key Format

API keys follow a specific format with a prefix that identifies the key type:

- **User keys**: `idp_user_<random_32_chars>` (41 characters total)
  - Example: `idp_user_abc123def456ghi789jkl012mno345pqr678`
  - Tied to a specific user account
  - Inherit the user's permissions

- **System keys**: `idp_system_<random_32_chars>` (43 characters total)
  - Example: `idp_system_xyz789abc456def123ghi890jkl567mno234`
  - Not tied to any individual user
  - Persist beyond individual user tenure
  - Only administrators can create system keys

## Creating an API Key

### Prerequisites

You must first authenticate via OAuth2 Proxy (browser-based login) to create an API key.

### Using the UI (Recommended)

The easiest way to create and manage your personal API keys is through the IDP UI:

1. **Log in** to the IDP UI at `https://localhost:8443/ui/`
2. **Click "API Keys"** in the main navigation menu
3. **Click "Create New API Key"** button
4. **Fill in the details**:
   - Key Name: A descriptive name (e.g., "CI/CD Pipeline")
   - Expiration Days: How long the key should be valid (1-365 days, default: 90)
5. **Click "Create"** and immediately copy your API key
6. **Store the key securely** - it will only be shown once!

For detailed instructions on using the UI, see the [Personal API Keys Guide](../../idp-ui/docs/PERSONAL_API_KEYS.md).

### Using the API Directly

You can also create API keys programmatically using the API endpoints below.

### Creating a User API Key

**Endpoint**: `POST /api/v1/api-keys/user`

**Request**:
```bash
curl -X POST https://api.example.com/api/v1/api-keys/user \
  -H "Content-Type: application/json" \
  -H "Cookie: _oauth2_proxy=..." \
  -d '{
    "keyName": "CI/CD Pipeline Key",
    "expirationDays": 90
  }'
```

**Request Body**:
```json
{
  "keyName": "CI/CD Pipeline Key",
  "expirationDays": 90
}
```

**Fields**:
- `keyName` (required): Descriptive name for the key (1-100 characters)
- `expirationDays` (optional): Days until expiration (1-365, default: 90)
- `keyType` (optional): Automatically set to `USER` for this endpoint

**Response** (201 Created):
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

**⚠️ Important**: The `apiKey` field is shown only once. Store it securely - you cannot retrieve it again!

### Creating a System API Key (Admin Only)

**Endpoint**: `POST /api/v1/api-keys/system`

**Request**:
```bash
curl -X POST https://api.example.com/api/v1/api-keys/system \
  -H "Content-Type: application/json" \
  -H "Cookie: _oauth2_proxy=..." \
  -d '{
    "keyName": "Production Deployment Service",
    "expirationDays": 180,
    "keyType": "SYSTEM"
  }'
```

**Response** (201 Created):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "keyName": "Production Deployment Service",
  "keyPrefix": "idp_system_xyz",
  "keyType": "SYSTEM",
  "userEmail": null,
  "createdByEmail": "admin@example.com",
  "createdAt": "2024-01-15T10:30:00",
  "expiresAt": "2024-07-13T10:30:00",
  "lastUsedAt": null,
  "isActive": true,
  "isExpiringSoon": false,
  "status": "ACTIVE",
  "apiKey": "idp_system_xyz789abc456def123ghi890jkl567mno234"
}
```

## Using an API Key

### Authorization Header

Include your API key in the `Authorization` header using the Bearer scheme:

```
Authorization: Bearer <your_api_key>
```

### Example: List Stacks

```bash
curl -X GET https://api.example.com/api/v1/stacks \
  -H "Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678"
```

### Example: Create a Stack

```bash
curl -X POST https://api.example.com/api/v1/stacks \
  -H "Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-api-service",
    "stackType": "RESTFUL_API",
    "environment": "DEV"
  }'
```

### Example: Using with Python

```python
import requests

API_KEY = "idp_user_abc123def456ghi789jkl012mno345pqr678"
BASE_URL = "https://api.example.com/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# List stacks
response = requests.get(f"{BASE_URL}/stacks", headers=headers)
stacks = response.json()

# Create a stack
new_stack = {
    "name": "my-api-service",
    "stackType": "RESTFUL_API",
    "environment": "DEV"
}
response = requests.post(f"{BASE_URL}/stacks", json=new_stack, headers=headers)
created_stack = response.json()
```

### Example: Using with Node.js

```javascript
const axios = require('axios');

const API_KEY = 'idp_user_abc123def456ghi789jkl012mno345pqr678';
const BASE_URL = 'https://api.example.com/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// List stacks
const stacks = await client.get('/stacks');
console.log(stacks.data);

// Create a stack
const newStack = {
  name: 'my-api-service',
  stackType: 'RESTFUL_API',
  environment: 'DEV'
};
const created = await client.post('/stacks', newStack);
console.log(created.data);
```

## Managing API Keys

### List Your API Keys

**Endpoint**: `GET /api/v1/api-keys/user`

```bash
curl -X GET https://api.example.com/api/v1/api-keys/user \
  -H "Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678"
```

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "keyName": "CI/CD Pipeline Key",
    "keyPrefix": "idp_user_abc",
    "keyType": "USER",
    "userEmail": "developer@example.com",
    "createdByEmail": "developer@example.com",
    "createdAt": "2024-01-15T10:30:00",
    "expiresAt": "2024-04-15T10:30:00",
    "lastUsedAt": "2024-02-20T14:45:00",
    "isActive": true,
    "isExpiringSoon": false,
    "status": "ACTIVE"
  }
]
```

### Get API Key Details

**Endpoint**: `GET /api/v1/api-keys/{id}`

```bash
curl -X GET https://api.example.com/api/v1/api-keys/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678"
```

### Rotate an API Key

**Endpoint**: `POST /api/v1/api-keys/{id}/rotate`

Rotation generates a new key while keeping the old key active for a grace period (default: 24 hours).

```bash
curl -X POST https://api.example.com/api/v1/api-keys/550e8400-e29b-41d4-a716-446655440000/rotate \
  -H "Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678"
```

**Response** (200 OK):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "keyName": "CI/CD Pipeline Key",
  "keyPrefix": "idp_user_xyz",
  "keyType": "USER",
  "userEmail": "developer@example.com",
  "createdByEmail": "developer@example.com",
  "createdAt": "2024-02-20T15:00:00",
  "expiresAt": "2024-05-20T15:00:00",
  "lastUsedAt": null,
  "isActive": true,
  "isExpiringSoon": false,
  "status": "ACTIVE",
  "apiKey": "idp_user_xyz789abc456def123ghi890jkl567mno234"
}
```

**Grace Period**: Both the old and new keys will work for 24 hours, allowing you to update your systems without downtime.

### Revoke an API Key

**Endpoint**: `DELETE /api/v1/api-keys/{id}`

Revocation is immediate and cannot be undone.

```bash
curl -X DELETE https://api.example.com/api/v1/api-keys/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678"
```

**Response** (204 No Content)

### Update API Key Name

**Endpoint**: `PUT /api/v1/api-keys/{id}/name`

```bash
curl -X PUT https://api.example.com/api/v1/api-keys/550e8400-e29b-41d4-a716-446655440000/name \
  -H "Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678" \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "Updated Pipeline Key"
  }'
```

## API Key Lifecycle

### Expiration

- Keys expire after a configurable period (default: 90 days)
- Expiration can be set between 1-365 days when creating a key
- Keys show a warning status when expiring within 7 days
- Expired keys are automatically invalidated and cannot be used

### Status Values

- `ACTIVE`: Key is valid and can be used
- `EXPIRING_SOON`: Key expires within 7 days
- `EXPIRED`: Key has passed its expiration date
- `REVOKED`: Key has been manually revoked

### Rotation Best Practices

1. **Regular Rotation**: Rotate keys every 90 days or according to your security policy
2. **Grace Period**: Use the 24-hour grace period to update all systems
3. **Verify New Key**: Test the new key before the grace period ends
4. **Update Systems**: Update all systems using the old key within 24 hours

## Security Best Practices

### Storage

- **Never commit API keys to version control**
- Store keys in environment variables or secure secret management systems
- Use different keys for different environments (dev, staging, production)

### Environment Variables

```bash
# .env file (never commit this!)
IDP_API_KEY=idp_user_abc123def456ghi789jkl012mno345pqr678
IDP_API_URL=https://api.example.com/api/v1
```

```bash
# Load from environment
export IDP_API_KEY="idp_user_abc123def456ghi789jkl012mno345pqr678"
```

### Secret Management

**AWS Secrets Manager**:
```bash
# Store key
aws secretsmanager create-secret \
  --name idp-api-key \
  --secret-string "idp_user_abc123def456ghi789jkl012mno345pqr678"

# Retrieve key
aws secretsmanager get-secret-value \
  --secret-id idp-api-key \
  --query SecretString \
  --output text
```

**HashiCorp Vault**:
```bash
# Store key
vault kv put secret/idp api_key="idp_user_abc123def456ghi789jkl012mno345pqr678"

# Retrieve key
vault kv get -field=api_key secret/idp
```

### Key Naming

Use descriptive names that indicate the key's purpose:
- ✅ "Production CI/CD Pipeline"
- ✅ "Staging Deployment Service"
- ✅ "Development Testing"
- ❌ "My Key"
- ❌ "Test"

### Monitoring

- Review the last used timestamp regularly
- Revoke unused keys
- Monitor audit logs for suspicious activity
- Set up alerts for failed authentication attempts

## Audit Logs (Admin Only)

Administrators can view audit logs for all API key events.

**Endpoint**: `GET /api/v1/api-keys/audit-logs`

```bash
curl -X GET "https://api.example.com/api/v1/api-keys/audit-logs?userEmail=developer@example.com&startDate=2024-01-01T00:00:00&endDate=2024-12-31T23:59:59" \
  -H "Authorization: Bearer idp_system_xyz789abc456def123ghi890jkl567mno234"
```

**Query Parameters**:
- `userEmail` (optional): Filter by user email
- `startDate` (optional): Filter by start date (ISO 8601 format)
- `endDate` (optional): Filter by end date (ISO 8601 format)

**Response** (200 OK):
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "userEmail": "developer@example.com",
    "action": "API_KEY_CREATED",
    "timestamp": "2024-01-15T10:30:00",
    "keyPrefix": "idp_user_abc",
    "sourceIp": null
  },
  {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "userEmail": "developer@example.com",
    "action": "API_KEY_AUTHENTICATED",
    "timestamp": "2024-02-20T14:45:00",
    "keyPrefix": "idp_user_abc",
    "sourceIp": "192.168.1.100"
  }
]
```

**Event Types**:
- `API_KEY_CREATED`: Key was created
- `API_KEY_ROTATED`: Key was rotated
- `API_KEY_REVOKED`: Key was revoked
- `API_KEY_AUTHENTICATED`: Successful authentication
- `API_KEY_AUTH_FAILED`: Failed authentication attempt

## Error Handling

### Common Error Responses

**401 Unauthorized - Invalid API Key**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

**401 Unauthorized - Expired API Key**:
```json
{
  "error": "Unauthorized",
  "message": "API key has expired"
}
```

**401 Unauthorized - Revoked API Key**:
```json
{
  "error": "Unauthorized",
  "message": "API key has been revoked"
}
```

**403 Forbidden - Insufficient Permissions**:
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this API key"
}
```

**400 Bad Request - Duplicate Key Name**:
```json
{
  "error": "Bad Request",
  "message": "An API key with this name already exists"
}
```

## Troubleshooting

### API Key Not Working

1. **Check key format**: Ensure you're using the complete key including the prefix
2. **Verify expiration**: Check if the key has expired
3. **Check revocation status**: Ensure the key hasn't been revoked
4. **Verify header format**: Use `Authorization: Bearer <key>` (note the space after "Bearer")
5. **Check permissions**: Ensure your key has the necessary permissions for the operation

### Authentication Fails After Rotation

- Wait a few minutes for the rotation to complete
- Verify you're using the new key, not the old one
- Check that the grace period hasn't expired (24 hours by default)

### Cannot Create API Key

- Ensure you're authenticated via OAuth2 Proxy first
- Check that you haven't exceeded the maximum keys per user (default: 10)
- Verify the key name is unique among your keys
- Ensure expiration days is between 1-365

## OpenAPI/Swagger Documentation

Interactive API documentation is available at:

- **Development**: `http://localhost:8082/api/q/swagger-ui`
- **Production**: `https://api.example.com/api/q/swagger-ui`

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response schemas
- Interactive "Try it out" functionality
- Authentication configuration

## Configuration

API key behavior can be configured via application properties:

```properties
# Default expiration period in days
idp.api-key.default-expiration-days=90

# Grace period for key rotation in hours
idp.api-key.rotation-grace-period-hours=24

# Maximum number of keys per user
idp.api-key.max-keys-per-user=10

# BCrypt cost factor for key hashing
idp.api-key.bcrypt-cost-factor=12

# Key length (random portion)
idp.api-key.key-length=32
```

## Support

For issues or questions about API key authentication:
- Email: support@angryss.com
- Documentation: https://docs.example.com/api-keys
- Swagger UI: https://api.example.com/api/q/swagger-ui
