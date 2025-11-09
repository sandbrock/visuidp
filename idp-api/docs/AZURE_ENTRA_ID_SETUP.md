# Azure Entra ID Configuration Guide

This guide provides step-by-step instructions for configuring Azure Entra ID (formerly Azure AD) as the identity provider for your IDP API using Traefik.

## Prerequisites

- Azure subscription with administrative access
- Docker and Docker Compose installed
- Traefik configured and running

## Azure Entra ID App Registration

### Step 1: Create App Registration

1. Navigate to the [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** > **App registrations**
3. Click **+ New registration**
4. Configure the application:
   - **Name**: `IDP API` (or your preferred name)
   - **Supported account types**: Choose based on your organization needs
   - **Redirect URI**: `http://localhost:8080/_oauth` (for local development)

### Step 2: Note Down Required Values

After creating the app registration, note these values from the **Overview** page:

- **Application (client) ID**: Copy this value
- **Directory (tenant) ID**: Copy this value

### Step 3: Create Client Secret

1. Go to **Certificates & secrets** in the left sidebar
2. Click **+ New client secret**
3. Configure:
   - **Description**: `IDP API Secret`
   - **Expires**: Choose appropriate expiration (recommend 12-24 months)
4. **Important**: Copy the secret value immediately (you won't be able to see it again)

### Step 4: Configure API Permissions

1. Go to **API permissions** in the left sidebar
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `email` ✅ (always available)
   - `openid` ✅ (always available)
   - `profile` ✅ (always available)
   - `User.Read` (if you need user profile information)

   **⚠️ Group Membership Permissions:**
   - `GroupMember.Read.All` - **Requires admin consent and may not be available in all Azure AD tiers**
   - If you get "Not granted for Default Directory":
     - This permission requires a Global Administrator to grant consent
     - May not be available in Azure AD Free tier
     - **Alternative**: Skip this permission for basic functionality
     - Group information can be obtained through other means if needed

6. Click **Grant admin consent** for the permissions (may require Global Admin approval)

### Step 1: Update .env File

Create or update your `.env` file with the Azure AD credentials:

```bash
# Azure AD Configuration
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here

# Domain Configuration (for production)
DOMAIN=your-domain.com
```

### Step 2: Replace Placeholder Values

Replace the placeholder values with your actual Azure AD credentials:
- `your-tenant-id-here` → Your Directory (tenant) ID
- `your-client-id-here` → Your Application (client) ID
- `your-client-secret-here` → Your client secret value

## Traefik Configuration

The Traefik configuration is already set up for Azure Entra ID integration. Here are the key files:

### traefik/dynamic.yml

This file contains the routing configuration with Azure AD middleware:

```yaml
http:
  middlewares:
    azure-ad:
      forwardAuth:
        address: "http://traefik:8080/_oauth"
        trustForwardHeader: true
        authResponseHeaders:
          - X-Forwarded-User
          - X-Forwarded-Email
          - X-Forwarded-Groups
          - X-Forwarded-Preferred-Username

  routers:
    # Health check endpoint (no auth required)
    health:
      rule: "Path(`/api/q/health`)"
      service: idp-api-service
      entryPoints:
        - web
        - websecure
      priority: 100

    # Protected API routes
    api:
      rule: "PathPrefix(`/api`)"
      service: idp-api-service
      middlewares:
        - azure-ad
      entryPoints:
        - web
        - websecure

    # Protected UI routes
    ui:
      rule: "PathPrefix(`/ui`)"
      service: idp-ui-service
      middlewares:
        - azure-ad
      entryPoints:
        - web
        - websecure

  services:
    idp-api-service:
      loadBalancer:
        servers:
          - url: "http://172.22.8.222:8082"

    idp-ui-service:
      loadBalancer:
        servers:
          - url: "http://172.22.8.222:8083"
```

### traefik/oidc.yml

This file contains the Azure AD OIDC provider configuration:

```yaml
# Azure AD OIDC Configuration for Traefik
http:
  middlewares:
    azure-ad-auth:
      plugin:
        oidc:
          provider:
            url: "https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0"
            clientId: "${AZURE_CLIENT_ID}"
            clientSecret: "${AZURE_CLIENT_SECRET}"
          scopes:
            - "openid"
            - "profile"
            - "email"
          redirectUrl: "http://localhost:8080/_oauth"
          stateCookie:
            name: "oidc_state"
            secure: true
            httpOnly: true
            sameSite: "lax"
          sessionCookie:
            name: "oidc_session"
            secure: true
            httpOnly: true
            sameSite: "lax"
          headers:
            X-Forwarded-User: "preferred_username"
            X-Forwarded-Email: "email"
            X-Forwarded-Groups: "groups"
            X-Forwarded-Preferred-Username: "preferred_username"
```

## Docker Configuration

### docker-compose.yml Changes

The following changes were made to support Azure Entra ID:

1. **Removed Authentik services**: All Authentik-related containers were removed
2. **Added OIDC configuration volume**: Added `./traefik/oidc.yml:/etc/traefik/oidc.yml:ro`
3. **Updated Traefik command**: Added `--providers.file.filename=/etc/traefik/oidc.yml`

## Testing the Configuration

### Step 1: Start Services

```bash
docker compose up -d traefik
```

### Step 2: Test Health Endpoint

The health endpoint should be accessible without authentication:

```bash
curl -I http://localhost:8080/api/q/health
```

Expected response: `HTTP/1.1 200 OK`

### Step 3: Test Authentication Flow

1. Access a protected endpoint: `http://localhost:8080/api/`
2. You should be redirected to Azure AD login
3. After successful authentication, you'll be redirected back with authentication headers

### Step 4: Verify Headers

Your application will receive these headers from Azure AD:
- `X-Forwarded-User`: User's preferred username
- `X-Forwarded-Email`: User's email address
- `X-Forwarded-Groups`: User's group memberships (if configured)
- `X-Forwarded-Preferred-Username`: User's preferred username

## Production Deployment

### Enable TLS for Production

For production deployment, uncomment the TLS configuration in `traefik/dynamic.yml`:

```yaml
tls:
  certResolver: letsencrypt
```

### Update Redirect URL

Update the redirect URL in `traefik/oidc.yml` for production:

```yaml
redirectUrl: "https://${DOMAIN}/_oauth"
```

### Domain Configuration

1. Point your domain to your Traefik instance
2. Update the `DOMAIN` environment variable
3. Configure Let's Encrypt with your domain

## Troubleshooting

### Common Issues

1. **"invalid_client" error**: Check your client ID and secret
2. **"invalid_tenant" error**: Verify your tenant ID
3. **Redirect URI mismatch**: Ensure redirect URI matches exactly in Azure AD app registration
4. **Certificate errors**: For local development, ensure TLS is disabled

### Debug Mode

Enable debug logging in Traefik:

```bash
# In docker-compose.yml, add to traefik command
- --log.level=DEBUG
```

### Check Traefik Logs

```bash
docker compose logs traefik
```

## Security Considerations

1. **Client Secret**: Never commit client secrets to version control
2. **HTTPS**: Always use HTTPS in production
3. **Token Validation**: The OIDC plugin handles token validation automatically
4. **Session Management**: Configure appropriate session timeouts
5. **Permissions**: Only grant necessary API permissions in Azure AD

## Next Steps

1. Test the authentication flow thoroughly
2. Configure your application to use the forwarded headers
3. Set up proper error handling for authentication failures
4. Consider implementing user session management
5. Plan for production deployment with proper TLS configuration

## Related Documentation

- [Traefik OIDC Plugin Documentation](https://doc.traefik.io/traefik/plugins/oidc/)
- [Azure AD App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [OIDC Protocol Specification](https://openid.net/specs/openid-connect-core-1_0.html)
