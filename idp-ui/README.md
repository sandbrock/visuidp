# IDP UI - React Frontend with OAuth2 Proxy Authentication

This React application is configured to work with OAuth2 Proxy for AWS Identity Center authentication. It runs on port 8083 and integrates with the IDP API backend through OAuth2 Proxy.

## Architecture

- **OAuth2 Proxy**: Port 8080 (Authentication Gateway)
- **Quarkus API**: Port 8082 (Backend API)
- **React UI**: Port 8083 (Frontend Application)
- **PostgreSQL**: Port 5432 (Database)
- **pgAdmin**: Port 8081 (Database Admin)

## Authentication Flow

1. User accesses `http://localhost:8080` (OAuth2 Proxy)
2. OAuth2 Proxy redirects to AWS Identity Center for authentication
3. After successful authentication, OAuth2 Proxy forwards requests to the React app
4. React app makes API calls through OAuth2 Proxy to the Quarkus backend
5. All requests include authentication headers from OAuth2 Proxy

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for OAuth2 Proxy and database)
- AWS Identity Center configured (see `../idp-api/docs/SAML_CONFIGURATION.md`)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Supporting Services

From the `idp-api` directory, start OAuth2 Proxy and database:

```bash
cd ../idp-api
docker-compose up -d
```

This starts:
- OAuth2 Proxy on port 8080
- PostgreSQL on port 5432
- pgAdmin on port 8081

### 3. Start the React Application

```bash
npm run dev
```

The application will start on port 8083.

## Development

### Running in Development Mode

```bash
# Start the development server
npm run dev

# The app will be available at http://localhost:8083
# But users should access it through OAuth2 Proxy at http://localhost:8080
```

### Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

### Linting

```bash
npm run lint
```

## Usage

### Accessing the Application

**Important**: Always access the application through OAuth2 Proxy:

- ✅ **Correct**: `http://localhost:8080/ui` (through Traefik with Azure Entra ID authentication)
- ⚠️ **Development**: `http://localhost:8083/ui` (direct access - no authentication, for development only)

### Authentication Flow

Authentication is handled entirely by Traefik with Azure Entra ID:

1. **User accesses** `http://localhost:8080/ui`
2. **Traefik checks authentication** - if not authenticated, redirects to Azure Entra ID
3. **Azure Entra ID handles login** and redirects back to Traefik
4. **Traefik forwards authenticated requests** to the React app with user headers
5. **React app receives user info** from the API (which gets it from Traefik headers)

### Application States

The application handles three states:

1. **Loading**: Checking authentication status with the API
2. **Unauthenticated**: Shows information about accessing through the correct URL
3. **Authenticated**: Shows the main application with user info and logout option

### API Integration

The application includes an authentication service (`src/auth.ts`) that:

- Makes authenticated API calls to the backend
- Handles logout (clears Traefik session)
- Gets user information from API endpoints that receive Traefik headers

Example API usage:

```typescript
import { apiService } from './services/api';

// Get current user
const user = await getCurrentUser();

// Make authenticated API calls
const projects = await apiService.getProjects();
```

## Configuration

### Vite Configuration

The Vite configuration (`vite.config.ts`) is set to:
- Run on port 8083
- Use `/ui/` as the base path for all environments
- Allow external connections (`host: true`)
- Support both development and preview modes

### Traefik Integration

The application expects Traefik to:
- Handle Azure Entra ID authentication
- Forward authenticated requests to the React app
- Provide user information via HTTP headers to the API backend

## File Structure

```
src/
├── auth.ts                 # Authentication service
├── services/
│   └── api.ts             # API service for backend calls
├── components/
│   ├── Loading.tsx        # Loading component
│   ├── Login.tsx          # Login component
│   └── Header.tsx         # Header with user info
├── App.tsx                # Main application component
└── App.css                # Application styles
```

## Environment Variables

The application uses these implicit configurations:

- **Frontend Port**: 8083 (configured in Vite)
- **OAuth2 Proxy**: Port 8080 (expected to be running)
- **API Base URL**: `/api/v1` (proxied through OAuth2 Proxy)

## Troubleshooting

### Common Issues

1. **Authentication not working**
   - Ensure you're accessing through `http://localhost:8080`, not `http://localhost:8083`
   - Check that OAuth2 Proxy is running: `docker-compose ps`
   - Verify AWS Identity Center configuration

2. **API calls failing**
   - Check that the Quarkus backend is running on port 8082
   - Verify OAuth2 Proxy is forwarding requests correctly
   - Check browser network tab for authentication headers

3. **CORS errors**
   - Ensure the Quarkus backend has proper CORS configuration
   - Verify OAuth2 Proxy is configured as the allowed origin

### Debug Mode

To enable debug logging in OAuth2 Proxy, update the Docker Compose environment:

```yaml
environment:
  - OAUTH2_PROXY_LOGGING_LEVEL=debug
```

Then check the logs:

```bash
docker-compose logs oauth2-proxy
```

## Production Deployment

For production deployment:

1. Build the React application: `npm run build`
2. Serve the built files through a web server
3. Configure OAuth2 Proxy with production URLs
4. Use HTTPS for all endpoints
5. Configure proper session timeouts and security headers

## Features

### Personal API Keys Management

All authenticated users can manage their personal API keys through the UI:

- **Access**: Click "API Keys" in the main navigation menu
- **Create**: Generate new API keys for programmatic access
- **Rotate**: Safely rotate keys with a 24-hour grace period
- **Revoke**: Immediately invalidate keys you no longer need
- **Monitor**: View key usage and expiration status

For detailed instructions, see the [Personal API Keys Guide](docs/PERSONAL_API_KEYS.md).

### Admin Features

Administrators have access to additional features:

- **Admin Dashboard**: Comprehensive system overview
- **API Keys Management**: View and manage all API keys (user + system)
- **Resource Configuration**: Manage cloud providers, resource types, and mappings
- **Audit Logs**: View API key usage and authentication events

## Documentation

### User Guides

- **[Personal API Keys Guide](docs/PERSONAL_API_KEYS.md)** - Complete guide for managing your API keys
- **[Admin Navigation Guide](docs/ADMIN_NAVIGATION.md)** - Admin dashboard navigation
- **[Architecture Documentation](docs/ARCHITECTURE.md)** - Frontend architecture details

### API Documentation

- **[API Key Authentication Guide](../idp-api/docs/API_KEY_AUTHENTICATION.md)** - Using API keys programmatically
- **[Complete API Documentation](../idp-api/docs/API_DOCUMENTATION.md)** - Full API reference

## Related Documentation

- [SAML Configuration Guide](../idp-api/docs/SAML_CONFIGURATION.md)
- [OAuth2 Proxy Documentation](https://oauth2-proxy.github.io/oauth2-proxy/)
- [AWS Identity Center Documentation](https://docs.aws.amazon.com/singlesignon/)

## Technology Stack

- **React 19** with TypeScript
- **Vite** for build tooling and development server
- **OAuth2 Proxy** for authentication
- **AWS Identity Center** for identity provider
- **ESLint** for code linting
