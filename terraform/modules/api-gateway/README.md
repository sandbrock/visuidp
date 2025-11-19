# API Gateway HTTP API Module

This module creates an AWS API Gateway HTTP API with JWT authorizer for Microsoft Entra ID (formerly Azure AD) authentication.

## Features

- **HTTP API**: Cost-effective API Gateway (70% cheaper than REST API)
- **JWT Authorizer**: Built-in JWT validation with Entra ID
- **CORS Configuration**: Configurable CORS for frontend integration
- **CloudWatch Logging**: Error-level logging with configurable retention
- **Custom Domain**: Optional custom domain with ACM certificate
- **Demo Mode**: Optional authentication bypass for hackathon/demo purposes
- **Throttling**: Rate limiting and burst protection

## Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ HTTPS + JWT
       ▼
┌─────────────────────┐
│  API Gateway        │
│  HTTP API           │
│  ┌───────────────┐  │
│  │ JWT Authorizer│  │
│  │ (Entra ID)    │  │
│  └───────────────┘  │
└──────┬──────────────┘
       │ Validated Request
       ▼
┌─────────────────────┐
│  Lambda Function    │
│  (IDP API)          │
└─────────────────────┘
```

## Entra ID Setup

### 1. Register Application in Entra ID

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: `VisuIDP API`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: Leave empty (not needed for API)
5. Click **Register**

### 2. Configure Application

After registration, note the following values:

- **Application (client) ID**: This is your `entra_id_client_id`
- **Directory (tenant) ID**: This is your `entra_id_tenant_id`

### 3. Configure API Permissions (Optional)

If your API needs to access Microsoft Graph or other APIs:

1. Go to **API permissions**
2. Click **Add a permission**
3. Select the required permissions
4. Click **Grant admin consent**

### 4. Configure Token Configuration

1. Go to **Token configuration**
2. Click **Add optional claim**
3. Select **Access** token type
4. Add claims: `email`, `preferred_username`, `upn`
5. Click **Add**

### 5. Get OIDC Configuration

The OIDC issuer URL is:
```
https://login.microsoftonline.com/{tenant-id}/v2.0
```

You can verify the configuration at:
```
https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration
```

## Usage

### Basic Configuration

```hcl
module "api_gateway" {
  source = "./modules/api-gateway"

  api_name    = "visuidp-api-dev"
  environment = "dev"

  # Lambda integration
  lambda_function_arn        = module.lambda_api.function_arn
  lambda_function_invoke_arn = module.lambda_api.function_invoke_arn

  # Entra ID JWT authorizer
  entra_id_tenant_id  = "12345678-1234-1234-1234-123456789abc"
  entra_id_client_id  = "87654321-4321-4321-4321-cba987654321"
  entra_id_issuer_url = "https://login.microsoftonline.com/12345678-1234-1234-1234-123456789abc/v2.0"

  # CORS configuration
  cors_allowed_origins = ["https://example.com"]

  tags = {
    Environment = "dev"
    Project     = "VisuIDP"
  }
}
```

### With Custom Domain

```hcl
module "api_gateway" {
  source = "./modules/api-gateway"

  api_name    = "visuidp-api-prod"
  environment = "prod"

  # Lambda integration
  lambda_function_arn        = module.lambda_api.function_arn
  lambda_function_invoke_arn = module.lambda_api.function_invoke_arn

  # Entra ID JWT authorizer
  entra_id_tenant_id  = var.entra_id_tenant_id
  entra_id_client_id  = var.entra_id_client_id
  entra_id_issuer_url = var.entra_id_issuer_url

  # Custom domain
  domain_name     = "example.com"
  certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."

  # CORS configuration
  cors_allowed_origins = ["https://example.com"]

  tags = {
    Environment = "prod"
    Project     = "VisuIDP"
  }
}
```

### Demo Mode (No Authentication)

For hackathon demos or testing:

```hcl
module "api_gateway" {
  source = "./modules/api-gateway"

  api_name    = "visuidp-api-demo"
  environment = "demo"

  # Lambda integration
  lambda_function_arn        = module.lambda_api.function_arn
  lambda_function_invoke_arn = module.lambda_api.function_invoke_arn

  # Entra ID configuration (still required but not enforced)
  entra_id_tenant_id  = var.entra_id_tenant_id
  entra_id_client_id  = var.entra_id_client_id
  entra_id_issuer_url = var.entra_id_issuer_url

  # Enable demo mode - bypasses JWT authentication
  enable_demo_mode = true

  tags = {
    Environment = "demo"
    Project     = "VisuIDP"
  }
}
```

## Testing JWT Validation

### 1. Obtain JWT Token from Entra ID

Use the OAuth 2.0 authorization code flow or device code flow to obtain a JWT token.

Example using Azure CLI:
```bash
# Login to Azure
az login

# Get access token
TOKEN=$(az account get-access-token \
  --resource "api://{client-id}" \
  --query accessToken \
  --output tsv)

echo $TOKEN
```

### 2. Test API with JWT Token

```bash
# Set your API endpoint
API_ENDPOINT="https://abc123.execute-api.us-east-1.amazonaws.com"

# Make authenticated request
curl -X GET "${API_ENDPOINT}/v1/stacks" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

### 3. Test Invalid Token (Should Fail)

```bash
# Test with invalid token
curl -X GET "${API_ENDPOINT}/v1/stacks" \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json"

# Expected response: 401 Unauthorized
```

### 4. Test Without Token (Should Fail)

```bash
# Test without authorization header
curl -X GET "${API_ENDPOINT}/v1/stacks" \
  -H "Content-Type: application/json"

# Expected response: 401 Unauthorized
```

## JWT Token Structure

The JWT token from Entra ID contains claims that can be accessed in your Lambda function:

```json
{
  "aud": "87654321-4321-4321-4321-cba987654321",
  "iss": "https://login.microsoftonline.com/12345678-1234-1234-1234-123456789abc/v2.0",
  "iat": 1234567890,
  "exp": 1234571490,
  "sub": "user-id-from-entra-id",
  "email": "user@example.com",
  "preferred_username": "user@example.com",
  "name": "John Doe",
  "oid": "object-id-from-entra-id"
}
```

## Accessing JWT Claims in Lambda

API Gateway passes validated JWT claims to Lambda in the request context:

```java
// Quarkus Lambda Handler
@Override
public APIGatewayProxyResponseEvent handleRequest(
    APIGatewayProxyRequestEvent input, 
    Context context) {
    
    // Extract JWT claims from request context
    Map<String, Object> authorizer = input.getRequestContext().getAuthorizer();
    Map<String, Object> jwt = (Map<String, Object>) authorizer.get("jwt");
    Map<String, Object> claims = (Map<String, Object>) jwt.get("claims");
    
    String email = (String) claims.get("email");
    String userId = (String) claims.get("sub");
    String name = (String) claims.get("name");
    
    // Use claims for authorization logic
    // ...
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| api_name | Name of the API Gateway | string | - | yes |
| environment | Environment name | string | - | yes |
| lambda_function_arn | ARN of the Lambda function | string | - | yes |
| lambda_function_invoke_arn | Invoke ARN of the Lambda function | string | - | yes |
| entra_id_tenant_id | Entra ID tenant ID | string | - | yes |
| entra_id_client_id | Entra ID client ID | string | - | yes |
| entra_id_issuer_url | Entra ID OIDC issuer URL | string | - | yes |
| cors_allowed_origins | CORS allowed origins | list(string) | ["*"] | no |
| domain_name | Custom domain name | string | "" | no |
| certificate_arn | ACM certificate ARN | string | "" | no |
| log_retention_days | CloudWatch log retention in days | number | 3 | no |
| enable_demo_mode | Enable demo mode (bypasses JWT authentication) | bool | false | no |
| tags | Tags to apply to resources | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| api_id | ID of the API Gateway |
| api_endpoint | Endpoint of the API Gateway |
| api_url | URL of the API Gateway |
| api_domain | Domain of the API Gateway |
| custom_domain_name | Custom domain name (if configured) |
| stage_name | Name of the API Gateway stage |

## Cost Optimization

This module is optimized for minimal cost:

- **HTTP API**: 70% cheaper than REST API ($1 vs $3.50 per million requests)
- **JWT Authorizer**: Built-in validation, no Lambda authorizer costs
- **CloudWatch Logs**: Short retention (3-7 days) for cost savings
- **Error-level logging**: Reduces log ingestion costs
- **Free Tier**: First 1M requests/month are free

## Security Best Practices

1. **Use HTTPS Only**: API Gateway enforces HTTPS by default
2. **Validate JWT Audience**: Ensure `entra_id_client_id` matches your application
3. **Validate JWT Issuer**: Ensure `entra_id_issuer_url` matches your tenant
4. **Enable Throttling**: Protect against DDoS attacks
5. **Use Custom Domain**: Avoid exposing AWS-generated URLs
6. **Monitor Access Logs**: Review CloudWatch logs for suspicious activity
7. **Rotate Credentials**: Regularly rotate Entra ID client secrets (if using client credentials flow)

## Troubleshooting

### JWT Validation Fails

**Symptom**: API returns 401 Unauthorized with valid token

**Possible Causes**:
1. **Incorrect Audience**: `entra_id_client_id` doesn't match token's `aud` claim
2. **Incorrect Issuer**: `entra_id_issuer_url` doesn't match token's `iss` claim
3. **Token Expired**: Check token's `exp` claim
4. **Wrong Token Type**: Ensure you're using an access token, not an ID token

**Solution**:
```bash
# Decode JWT token to inspect claims
echo $TOKEN | cut -d. -f2 | base64 -d | jq .

# Verify audience and issuer match your configuration
```

### CORS Errors

**Symptom**: Browser shows CORS error

**Solution**:
1. Ensure `cors_allowed_origins` includes your frontend domain
2. Check that frontend sends `Authorization` header
3. Verify `allow_credentials = true` in CORS configuration

### Lambda Not Invoked

**Symptom**: API Gateway returns error before reaching Lambda

**Solution**:
1. Check Lambda permission allows API Gateway invocation
2. Verify Lambda function ARN is correct
3. Check CloudWatch logs for API Gateway errors

## References

- [AWS API Gateway HTTP API Documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [AWS API Gateway JWT Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
- [Microsoft Entra ID Documentation](https://learn.microsoft.com/en-us/azure/active-directory/)
- [OpenID Connect Protocol](https://openid.net/connect/)
