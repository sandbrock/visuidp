# AWS Identity Center Authentication via Amazon Cognito

This guide configures AWS IAM Identity Center authentication for the IDP API (Quarkus) using Amazon Cognito as an intermediary, allowing organization members to authenticate using their AWS Identity Center credentials while providing standard OIDC integration to Quarkus.

**Note**: This approach solves the SAML limitation in Quarkus 3.20.2 by using Cognito to handle SAML federation with Identity Center and provide OIDC to the application.

## Architecture Overview

- **AWS Identity Center**: Identity Provider (SAML)
- **Amazon Cognito**: Federation Bridge (SAML ↔ OIDC)
- **Quarkus API**: Service Provider (OIDC)
- **React Frontend**: Client Application

## Prerequisites

- AWS IAM Identity Center enabled in your AWS account
- Organization users configured in IAM Identity Center
- Java 21 and Maven 3.8+ for Quarkus development
- AWS CLI configured with appropriate permissions

## Step 1: Create Amazon Cognito User Pool

### 1. Create User Pool

1. Navigate to **AWS Console → Amazon Cognito**
2. Click **"Create user pool"**
3. Configure sign-in options:
   - **Authentication providers**: Select **"Federated identity providers"**
   - **User pool sign-in options**: Email
4. Configure security requirements (use defaults)
5. Configure sign-up experience (skip - users come from Identity Center)
6. Configure message delivery (use defaults)
7. **User pool name**: `idp-api-users`
8. **App client name**: `idp-api-client`
9. Click **"Create user pool"**

### 2. Configure Identity Provider

1. In your Cognito User Pool, go to **"Sign-in experience"** → **"Federated identity provider sign-in"**
2. Click **"Add identity provider"**
3. Select **"SAML"**
4. Configure SAML provider:
   - **Provider name**: `AWSIdentityCenter`
   - **Metadata document**: Upload or URL
   - **Metadata URL**: `https://portal.sso.{region}.amazonaws.com/saml/metadata/{instance-id}`
5. **Attribute mapping**:
   - **Email**: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`
   - **Name**: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name`
6. Click **"Add identity provider"**

### 3. Configure App Client

1. Go to **"App integration"** → **"App clients"**
2. Select your app client
3. **Hosted UI settings**:
   - **Allowed callback URLs**: 
     - `http://localhost:8082/q/oidc/code-flow`
     - `https://idp-dev.angryss.com/q/oidc/code-flow`
     - `https://idp.angryss.com/q/oidc/code-flow`
   - **Allowed sign-out URLs**:
     - `http://localhost:8082`
     - `https://idp-dev.angryss.com`
     - `https://idp.angryss.com`
   - **Identity providers**: Select **"AWSIdentityCenter"**
   - **OAuth 2.0 grant types**: Authorization code grant
   - **OpenID Connect scopes**: openid, email, profile

## Step 2: Create SAML Application in IAM Identity Center

### 1. Create SAML Application

1. Navigate to **AWS Console → IAM Identity Center**
2. Go to **Applications** → **Customer managed**
3. Click **"Add application"**
4. Select **"Add custom SAML 2.0 application"**
5. **Application name**: `Cognito-IDP-API`
6. Configure SAML settings:
   - **Application ACS URL**: `https://{cognito-domain}.auth.{region}.amazoncognito.com/saml2/idpresponse`
   - **Application SAML audience**: `urn:amazon:cognito:sp:{user-pool-id}`

### 2. Configure Attribute Mappings

1. In your SAML application, go to **"Attribute mappings"**
2. Map the following attributes:
   - **Subject**: `${user:email}`
   - **Name**: `${user:name}`
   - **Email**: `${user:email}`
   - **Groups**: `${user:groups}`

### 3. Assign Users

1. Go to **"Assigned users"** tab
2. Click **"Assign users"** or **"Assign groups"**
3. Select organization members who need access

## Step 3: Record Configuration Details

From your Cognito User Pool, note:
- **User Pool ID**: `{region}_{pool-id}`
- **App Client ID**: From app client details
- **App Client Secret**: From app client details
- **Cognito Domain**: `https://{your-domain}.auth.{region}.amazoncognito.com`
- **OIDC Issuer URL**: `https://cognito-idp.{region}.amazonaws.com/{user-pool-id}`

## Step 4: Configure Quarkus Application

### Dependencies

Add to `pom.xml`:

```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-oidc</artifactId>
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-security</artifactId>
</dependency>
```

### Application Properties

#### Base Configuration (`application.properties`)
```properties
# CORS configuration
quarkus.http.cors=true
quarkus.http.cors.headers=accept,authorization,content-type,x-requested-with
quarkus.http.cors.methods=GET,POST,PUT,DELETE,OPTIONS
```

#### Local Development (`application-local.properties`)
```properties
# OIDC configuration for Amazon Cognito
quarkus.oidc.auth-server-url=${COGNITO_ISSUER_URL}
quarkus.oidc.client-id=${COGNITO_CLIENT_ID}
quarkus.oidc.credentials.secret=${COGNITO_CLIENT_SECRET}
quarkus.oidc.application-type=web-app

# Local CORS
quarkus.http.cors.origins=http://localhost:8083
```

#### Development Environment (`application-dev.properties`)
```properties
# OIDC configuration for Amazon Cognito
quarkus.oidc.auth-server-url=${COGNITO_ISSUER_URL}
quarkus.oidc.client-id=${COGNITO_CLIENT_ID}
quarkus.oidc.credentials.secret=${COGNITO_CLIENT_SECRET}
quarkus.oidc.application-type=web-app

# Dev CORS
quarkus.http.cors.origins=https://idp-dev.angryss.com
```

#### Production Environment (`application-prod.properties`)
```properties
# OIDC configuration for Amazon Cognito
quarkus.oidc.auth-server-url=${COGNITO_ISSUER_URL}
quarkus.oidc.client-id=${COGNITO_CLIENT_ID}
quarkus.oidc.credentials.secret=${COGNITO_CLIENT_SECRET}
quarkus.oidc.application-type=web-app

# Production CORS
quarkus.http.cors.origins=https://idp.angryss.com
```

### Environment Variables

Set these environment variables:

```bash
# Amazon Cognito OIDC Configuration
export COGNITO_ISSUER_URL="https://cognito-idp.us-west-2.amazonaws.com/us-west-2_XXXXXXXXX"
export COGNITO_CLIENT_ID="your-cognito-app-client-id"
export COGNITO_CLIENT_SECRET="your-cognito-app-client-secret"
```

### Secure Endpoints

```java
@Path("/v1")
@Authenticated
public class ProjectResource {
    
    @GET
    @Path("/projects")
    public List<Project> getProjects(@Context SecurityContext ctx) {
        // Access user info via SecurityContext
        String userId = ctx.getUserPrincipal().getName();
        return projectService.getAllProjects();
    }
}
```

## Step 5: Configure React Frontend

### Authentication Service

Create `src/auth.js`:

```javascript
const getAuthConfig = () => {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost') {
    return {
      loginUrl: 'http://localhost:8082/q/oidc/code-flow',
      logoutUrl: 'http://localhost:8082/q/oidc/logout',
      apiBaseUrl: 'http://localhost:8082/api/v1'
    };
  } else if (hostname === 'idp-dev.angryss.com') {
    return {
      loginUrl: 'https://idp-dev.angryss.com/q/oidc/code-flow',
      logoutUrl: 'https://idp-dev.angryss.com/q/oidc/logout',
      apiBaseUrl: 'https://idp-dev.angryss.com/api/v1'
    };
  } else if (hostname === 'idp.angryss.com') {
    return {
      loginUrl: 'https://idp.angryss.com/q/oidc/code-flow',
      logoutUrl: 'https://idp.angryss.com/q/oidc/logout',
      apiBaseUrl: 'https://idp.angryss.com/api/v1'
    };
  }
  
  return {
    loginUrl: 'https://idp.angryss.com/q/oidc/code-flow',
    logoutUrl: 'https://idp.angryss.com/q/oidc/logout',
    apiBaseUrl: 'https://idp.angryss.com/api/v1'
  };
};

const AUTH_CONFIG = getAuthConfig();

export const login = () => {
  window.location.href = AUTH_CONFIG.loginUrl;
};

export const logout = () => {
  window.location.href = AUTH_CONFIG.logoutUrl;
};

export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${AUTH_CONFIG.apiBaseUrl}/user/me`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      return response.json();
    }
    return null;
  } catch (error) {
    return null;
  }
};
```

### App Integration

Update `src/App.js`:

```javascript
import { useState, useEffect } from 'react';
import { login, logout, getCurrentUser } from './auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    getCurrentUser().then(userData => {
      setUser(userData);
      setLoading(false);
    });
  }, []);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return (
      <div>
        <h1>IDP Portal</h1>
        <button onClick={login}>Login with AWS</button>
      </div>
    );
  }
  
  return (
    <main>
      <h1>Hello {user.name}</h1>
      <button onClick={logout}>Sign out</button>
    </main>
  );
}

export default App;
```

## Authentication Flow

1. **User clicks "Login"** → Quarkus redirects to Cognito
2. **Cognito redirects** → AWS Identity Center SAML login
3. **User authenticates** → With AWS Identity Center credentials
4. **Identity Center sends SAML assertion** → To Cognito
5. **Cognito issues OIDC tokens** → Back to Quarkus
6. **User is authenticated** → In your application

## Testing

### Local Development

1. Set environment variables:
   ```bash
   export COGNITO_ISSUER_URL="https://cognito-idp.us-west-2.amazonaws.com/us-west-2_XXXXXXXXX"
   export COGNITO_CLIENT_ID="your-cognito-client-id"
   export COGNITO_CLIENT_SECRET="your-cognito-client-secret"
   ```

2. Start services:
   ```bash
   # Start API
   ./mvnw quarkus:dev
   
   # Start React frontend
   npm start
   ```

3. Navigate to `http://localhost:3000`
4. Click "Login with AWS"
5. You'll be redirected to AWS Identity Center login
6. Authenticate with your organization's AWS credentials
7. Verify successful authentication and API access

## Production Considerations

- Store Cognito client secrets in AWS Secrets Manager
- Use AWS WAF to protect Cognito endpoints
- Configure proper CORS policies for production domains
- Enable CloudWatch logging for authentication events
- Set up monitoring for authentication failures
- Configure Cognito advanced security features
- Use custom domains for Cognito hosted UI
- Implement proper session management

## Benefits of This Approach

- **Standard OIDC**: Quarkus uses standard OIDC (no SAML complexity)
- **AWS Integration**: Users authenticate with AWS Identity Center credentials
- **Managed Service**: Cognito handles SAML federation complexity
- **Scalable**: Production-ready AWS services
- **Flexible**: Easy to add additional identity providers to Cognito

## Troubleshooting

### Common Issues

1. **SAML Configuration**: Verify ACS URL and audience in Identity Center match Cognito requirements
2. **Attribute Mapping**: Ensure SAML attributes are properly mapped in both Identity Center and Cognito
3. **User Assignment**: Verify users are assigned to the SAML application in Identity Center
4. **Cognito Domain**: Ensure Cognito domain is properly configured
5. **Callback URLs**: Verify redirect URIs match exactly in Cognito app client

### Debug Configuration

```properties
quarkus.log.category."io.quarkus.oidc".level=DEBUG
quarkus.oidc.authentication.cookie-same-site=lax
```

### Useful AWS CLI Commands

```bash
# Get Cognito User Pool details
aws cognito-idp describe-user-pool --user-pool-id us-west-2_XXXXXXXXX

# List Identity Center applications
aws sso-admin list-applications --instance-arn arn:aws:sso:::instance/ssoins-XXXXXXXXX
```