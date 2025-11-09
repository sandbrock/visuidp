# Design Document

## Overview

This design document outlines the implementation of a personal API keys management page for all authenticated users in the IDP UI. The solution reuses the existing `ApiKeysManagement` component with a new mode prop to differentiate between personal and admin contexts. A new route will be added for personal API keys, and navigation will be updated to make the feature discoverable to all users.

## Architecture

### Component Reuse Strategy

The existing `ApiKeysManagement` component will be enhanced to support two modes:
- **Personal Mode**: For regular users accessing `/api-keys` (shows only their own user keys)
- **Admin Mode**: For admins accessing `/admin/api-keys` (shows all keys including system keys)

This approach minimizes code duplication while providing appropriate context-specific behavior.

### Route Structure

```
Current Routes:
- /admin/api-keys (admin only) → ApiKeysManagement component

New Routes:
- /api-keys (all authenticated users) → ApiKeysManagement component in personal mode
- /admin/api-keys (admin only) → ApiKeysManagement component in admin mode (unchanged)
```

### Navigation Updates

The Header component will be updated to include a link to personal API keys in the main navigation, making it accessible alongside Development and Infrastructure sections.

## Components and Interfaces

### Enhanced ApiKeysManagement Component

**New Props:**

```typescript
interface ApiKeysManagementProps {
  user: User;
  mode?: 'personal' | 'admin'; // New prop, defaults to 'personal'
}
```

**Behavior Changes Based on Mode:**

| Feature | Personal Mode | Admin Mode |
|---------|---------------|------------|
| Page Title | "My API Keys" | "API Keys Management" |
| Breadcrumb | No admin context | Includes "Admin Dashboard" |
| System Key Creation | Hidden | Visible |
| Keys Displayed | User's own keys only | All keys (via different API endpoint) |
| Key Type Filter | Not needed | May show USER/SYSTEM types |

**Implementation Approach:**

```typescript
export const ApiKeysManagement = ({ user, mode = 'personal' }: ApiKeysManagementProps) => {
  const isAdminMode = mode === 'admin';
  
  // Conditional breadcrumb
  const breadcrumbItems = isAdminMode 
    ? [{ label: 'Admin Dashboard', path: '/admin' }, { label: 'API Keys Management' }]
    : [{ label: 'My API Keys' }];
  
  // Conditional page title
  const pageTitle = isAdminMode ? 'API Keys Management' : 'My API Keys';
  
  // Conditional description
  const pageDescription = isAdminMode
    ? 'Manage all API keys including system-level keys for programmatic access'
    : 'Manage your personal API keys for programmatic access to the IDP API';
  
  // Load keys based on mode
  const loadApiKeys = async () => {
    const data = isAdminMode 
      ? await apiService.getAllApiKeys(user.email)
      : await apiService.getUserApiKeys(user.email);
    setApiKeys(data);
  };
  
  // Rest of component logic remains the same
};
```

### ApiKeyCreateModal Component Updates

**Current Behavior:**
- Shows key type selector (USER/SYSTEM) for admin users
- Hides key type selector for non-admin users

**New Behavior:**
- Shows key type selector only when in admin mode AND user is admin
- In personal mode, always creates USER keys regardless of admin status

**Implementation:**

```typescript
interface ApiKeyCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdKey: ApiKeyCreated) => void;
  user: User;
  mode?: 'personal' | 'admin'; // New prop
}

export const ApiKeyCreateModal = ({ user, mode = 'personal', ... }: ApiKeyCreateModalProps) => {
  const isAdminMode = mode === 'admin';
  const showKeyTypeSelector = isAdminMode && user.isAdmin;
  
  // Force USER type in personal mode
  const effectiveKeyType = isAdminMode ? keyType : 'USER';
  
  // Rest of component logic
};
```

### Header Component Updates

**Current Navigation Structure:**
```typescript
<nav>
  <Link to="/">Development</Link>
  <Link to="/infrastructure">Infrastructure</Link>
  {user.isAdmin && <Link to="/admin">Admin</Link>}
</nav>
```

**New Navigation Structure:**
```typescript
<nav>
  <Link to="/">Development</Link>
  <Link to="/infrastructure">Infrastructure</Link>
  <Link to="/api-keys">API Keys</Link>  {/* New link for all users */}
  {user.isAdmin && <Link to="/admin">Admin</Link>}
</nav>
```

**Visual Design:**
- API Keys link should have the same styling as Development and Infrastructure
- Active state should highlight when on `/api-keys` route
- Icon: 🔑 (key emoji) or similar icon from the design system

### App.tsx Route Updates

**New Route Addition:**

```typescript
<Routes>
  {/* Existing routes */}
  <Route path="/" element={<Development user={user} />} />
  <Route path="/infrastructure" element={<Infrastructure user={user} />} />
  
  {/* New personal API keys route - accessible to all authenticated users */}
  <Route 
    path="/api-keys" 
    element={<ApiKeysManagement user={user} mode="personal" />} 
  />
  
  {/* Admin routes */}
  <Route 
    path="/admin" 
    element={
      <ProtectedRoute user={user} requireAdmin={true}>
        <AdminDashboard user={user} />
      </ProtectedRoute>
    } 
  />
  
  {/* Admin API keys route - admin only, shows all keys */}
  <Route 
    path="/admin/api-keys" 
    element={
      <ProtectedRoute user={user} requireAdmin={true}>
        <ApiKeysManagement user={user} mode="admin" />
      </ProtectedRoute>
    } 
  />
  
  {/* Other admin routes */}
</Routes>
```

## Data Flow

### Personal Mode Flow

```
User clicks "API Keys" in navigation
  ↓
Navigate to /api-keys
  ↓
ApiKeysManagement component renders with mode="personal"
  ↓
Component calls apiService.getUserApiKeys(user.email)
  ↓
Backend returns only keys where user_email matches current user
  ↓
Display keys with personal context (no system keys, simplified breadcrumb)
```

### Admin Mode Flow

```
Admin clicks "API Keys Management" in admin dashboard
  ↓
Navigate to /admin/api-keys
  ↓
ApiKeysManagement component renders with mode="admin"
  ↓
Component calls apiService.getAllApiKeys(user.email)
  ↓
Backend returns all keys (user keys + system keys)
  ↓
Display keys with admin context (system key creation, admin breadcrumb)
```

## UI/UX Design

### Personal API Keys Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Breadcrumb: My API Keys                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  My API Keys                    [Create New API Key]    │
│  Manage your personal API keys for programmatic access  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Name │ Prefix │ Type │ Created │ Expires │ ... │    │
│  ├────────────────────────────────────────────────┤    │
│  │ My Dev Key │ idp_user_abc... │ USER │ ... │   │    │
│  │ CI/CD Key  │ idp_user_xyz... │ USER │ ... │   │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │ About API Keys                               │       │
│  │ • API keys provide programmatic access       │       │
│  │ • Keys are shown only once - save securely   │       │
│  │ • Keys expire after configured period        │       │
│  │ • Rotate keys regularly for security         │       │
│  └─────────────────────────────────────────────┘       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Admin API Keys Page Layout (Unchanged)

```
┌─────────────────────────────────────────────────────────┐
│ Breadcrumb: Admin Dashboard > API Keys Management      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  API Keys Management            [Create New API Key]    │
│  Manage all API keys including system-level keys        │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Name │ Prefix │ Type │ Owner │ Created │ ... │  │    │
│  ├────────────────────────────────────────────────┤    │
│  │ System CI │ idp_system_... │ SYSTEM │ - │ ... │    │
│  │ User Key  │ idp_user_...   │ USER │ user@... │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Navigation Header Update

**Before:**
```
[IDP Logo]  Development  Infrastructure  Admin
```

**After:**
```
[IDP Logo]  Development  Infrastructure  API Keys  Admin
```

### Empty State for Personal API Keys

When a user has no API keys yet:

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│                    🔑                                    │
│                                                          │
│           No API Keys Yet                               │
│                                                          │
│  Create your first API key to enable programmatic       │
│  access to the IDP API. API keys allow you to:          │
│                                                          │
│  • Authenticate CLI tools and scripts                   │
│  • Integrate with CI/CD pipelines                       │
│  • Automate infrastructure provisioning                 │
│                                                          │
│           [Create Your First API Key]                   │
│                                                          │
│  Learn more about API keys in our documentation         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Error Handling

### Authorization Errors

**Scenario**: User tries to access admin API keys page without admin role
- **Handling**: ProtectedRoute component already handles this
- **Result**: Redirect or show unauthorized message

**Scenario**: User tries to create system API key from personal page
- **Handling**: System key option is hidden in personal mode
- **Result**: Not possible through UI

### API Errors

All existing error handling in ApiKeysManagement component remains unchanged:
- Failed to load keys → Display error message with retry button
- Failed to create key → Display error in modal
- Failed to rotate/revoke → Display error message

## Testing Strategy

### Component Tests

1. **ApiKeysManagement Component**
   - Test rendering in personal mode (correct title, breadcrumb, no system key option)
   - Test rendering in admin mode (admin title, admin breadcrumb, system key option visible)
   - Test that personal mode calls getUserApiKeys
   - Test that admin mode calls getAllApiKeys
   - Test that mode prop defaults to 'personal'

2. **ApiKeyCreateModal Component**
   - Test that key type selector is hidden in personal mode
   - Test that key type selector is visible in admin mode for admins
   - Test that USER key type is forced in personal mode
   - Test that key creation uses correct API endpoint based on mode

3. **Header Component**
   - Test that API Keys link is visible for all authenticated users
   - Test that API Keys link navigates to /api-keys
   - Test that active state highlights correctly on /api-keys route

4. **App.tsx Routes**
   - Test that /api-keys route is accessible without admin role
   - Test that /api-keys route renders ApiKeysManagement with mode="personal"
   - Test that /admin/api-keys route requires admin role
   - Test that /admin/api-keys route renders ApiKeysManagement with mode="admin"

### Integration Tests

1. **Personal API Keys Flow**
   - User navigates to /api-keys
   - User creates a personal API key
   - User rotates a personal API key
   - User revokes a personal API key
   - Verify only user's own keys are displayed

2. **Admin API Keys Flow**
   - Admin navigates to /admin/api-keys
   - Admin creates a system API key
   - Admin views all keys (user + system)
   - Verify system key creation option is available

3. **Navigation Flow**
   - User clicks API Keys in header → navigates to /api-keys
   - Admin clicks API Keys Management in admin dashboard → navigates to /admin/api-keys
   - Verify breadcrumbs are correct in each context

### User Acceptance Testing

1. Regular user can access and manage personal API keys
2. Admin can access both personal and admin API keys pages
3. Personal page shows only user's own keys
4. Admin page shows all keys including system keys
5. Navigation is intuitive and discoverable

## Accessibility Considerations

- API Keys navigation link should have proper ARIA labels
- Breadcrumb navigation should use semantic HTML
- Empty state should be keyboard accessible
- All existing accessibility features in ApiKeysManagement component are maintained

## Performance Considerations

- No additional API calls introduced (reusing existing endpoints)
- Component reuse minimizes bundle size impact
- No performance degradation expected

## Migration Strategy

### Deployment Steps

1. Update ApiKeysManagement component to accept mode prop
2. Update ApiKeyCreateModal component to accept mode prop
3. Add new /api-keys route in App.tsx
4. Update Header component with API Keys navigation link
5. Update existing /admin/api-keys route to pass mode="admin"
6. Deploy to production

### Backward Compatibility

- All existing admin functionality remains unchanged
- Existing /admin/api-keys route continues to work
- No breaking changes to API calls
- No database changes required

### User Communication

- Announce new personal API keys feature in release notes
- Update documentation to show both personal and admin access paths
- Provide examples of using personal API keys for common use cases

## Documentation Updates

### User Documentation

1. **Getting Started with API Keys**
   - How to access personal API keys page
   - How to create your first API key
   - How to use API keys for authentication

2. **API Key Management**
   - Creating personal API keys
   - Rotating keys
   - Revoking keys
   - Best practices for key security

3. **Admin Documentation**
   - Difference between personal and admin API keys pages
   - Managing system-level API keys
   - Viewing audit logs

### Developer Documentation

- Update component documentation for ApiKeysManagement
- Document mode prop and its behavior
- Update routing documentation

## Future Enhancements

Potential future improvements (not in scope for this spec):

1. **Quick Access Widget**: Add API keys widget to homepage/dashboard
2. **Key Usage Analytics**: Show usage statistics for each key
3. **Key Permissions**: Allow fine-grained permissions per key
4. **Key Templates**: Pre-configured key settings for common use cases
5. **Notification System**: Email notifications for expiring keys
