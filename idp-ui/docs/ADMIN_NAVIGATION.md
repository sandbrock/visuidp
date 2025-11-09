# Admin Navigation and Routing

## Overview

The admin section of the IDP Portal is protected by role-based access control. Only users with the "admin" role can access admin routes and see the admin navigation link.

## Implementation

### Role-Based Access Control

1. **User Type Enhancement** (`src/types/auth.ts`)
   - Added `roles?: string[]` field to the `User` interface
   - Created `isAdmin()` helper function to check if a user has admin role

2. **Backend Changes** (`UserController.java`)
   - Updated `/v1/user/me` endpoint to return user roles
   - Roles are determined by checking `SecurityContext.isUserInRole()`
   - Supports "admin" and "user" roles

3. **Protected Route Component** (`src/components/ProtectedRoute.tsx`)
   - Wraps admin routes to enforce role-based access
   - Redirects non-admin users to home page
   - Can be configured with `requireAdmin` prop

### Navigation

The Header component (`src/components/Header.tsx`) conditionally displays the "Admin" navigation link:

```tsx
{userIsAdmin && (
  <Link to="/admin" className="nav-link">
    Admin
  </Link>
)}
```

### Admin Routes

All admin routes are protected in `App.tsx`:

- `/admin` - Admin Dashboard (overview of all configuration)
- `/admin/cloud-providers` - Cloud Provider Management
- `/admin/resource-types` - Resource Type Management
- `/admin/resource-type-mappings` - Resource Type Cloud Mapping Management

Each route is wrapped with `ProtectedRoute`:

```tsx
<Route 
  path="/admin" 
  element={
    <ProtectedRoute user={user} requireAdmin={true}>
      <AdminDashboard user={user} />
    </ProtectedRoute>
  } 
/>
```

## Admin Dashboard

The Admin Dashboard (`/admin`) provides:

- Statistics cards showing counts of providers, resource types, mappings, and properties
- Quick navigation to management pages
- List of incomplete mappings that need property schemas
- Configuration overview of all entities

## Security

### Backend Authorization

All admin API endpoints are protected with `@RolesAllowed("admin")` annotation:

```java
@Path("/v1/admin/cloud-providers")
@RolesAllowed("admin")
public class CloudProvidersController {
    // ...
}
```

### Frontend Protection

1. **Route Protection**: Non-admin users are redirected if they try to access admin routes
2. **UI Hiding**: Admin navigation link is hidden from non-admin users
3. **API Calls**: Admin API calls will return 403 Forbidden for non-admin users

## Role Assignment

Roles are assigned based on Azure Entra ID groups:

1. OAuth2 Proxy forwards group information in `X-Auth-Request-Groups` header
2. `TraefikAuthenticationMechanism` parses the groups
3. Configured admin group is mapped to "admin" role
4. All authenticated users get "user" role

## Development

For local development without OAuth2 Proxy, you can set the `VITE_DEV_AUTH_GROUPS` environment variable:

```bash
# In .env file or environment
VITE_DEV_AUTH_GROUPS=user,admin
```

This will add the groups to API requests during development.

## Testing

To test admin functionality:

1. Ensure your user is in the configured admin group in Azure Entra ID
2. Log in through the OAuth2 Proxy
3. The "Admin" link should appear in the navigation
4. You should be able to access all admin routes

To test non-admin behavior:

1. Remove your user from the admin group
2. Log in again
3. The "Admin" link should not appear
4. Attempting to access admin routes directly should redirect to home page
