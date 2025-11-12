# Design Document

## Overview

This design introduces a user profile menu component that consolidates user-specific actions in a dropdown menu accessible via a profile icon in the application header. The primary goal is to improve the information architecture by moving the Personal API Keys feature from the main navigation to a more contextually appropriate location within the user profile menu.

## Architecture

### Component Structure

```
Header (existing)
├── ProfileMenu (new)
│   ├── ProfileIcon (new)
│   └── ProfileDropdown (new)
│       ├── UserInfo (new)
│       └── MenuItem[] (new)
```

### Component Hierarchy

1. **Header Component** (modified): The existing header will be updated to replace the current user info section with the new ProfileMenu component
2. **ProfileMenu Component** (new): Container component managing the dropdown state and click-outside behavior
3. **ProfileIcon Component** (new): Clickable icon button that triggers the dropdown
4. **ProfileDropdown Component** (new): The dropdown menu containing user information and action items
5. **UserInfo Component** (new): Displays user email/name at the top of the dropdown
6. **MenuItem Component** (new): Reusable menu item component for actions

## Components and Interfaces

### ProfileMenu Component

**Purpose**: Manages the profile dropdown state and handles user interactions

**Props**:
```typescript
interface ProfileMenuProps {
  user: User;
}
```

**State**:
```typescript
interface ProfileMenuState {
  isOpen: boolean;
}
```

**Behavior**:
- Toggles dropdown visibility on icon click
- Closes dropdown when clicking outside
- Closes dropdown when pressing Escape key
- Closes dropdown when navigating to a new route
- Uses React hooks: `useState` for dropdown state, `useRef` for click-outside detection, `useEffect` for event listeners

### ProfileIcon Component

**Purpose**: Visual button that opens the profile menu

**Props**:
```typescript
interface ProfileIconProps {
  isOpen: boolean;
  onClick: () => void;
  userEmail: string;
}
```

**Visual Design**:
- Circular icon with user's initials (derived from email)
- Background color based on current theme
- Hover state with subtle animation
- Active state indicator when dropdown is open
- Accessible with proper ARIA attributes

**Accessibility**:
- `role="button"`
- `aria-label="User profile menu"`
- `aria-expanded={isOpen}`
- `aria-haspopup="true"`
- Keyboard accessible (Enter/Space to activate)

### ProfileDropdown Component

**Purpose**: Renders the dropdown menu with user info and action items

**Props**:
```typescript
interface ProfileDropdownProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}
```

**Structure**:
```tsx
<div className="profile-dropdown" role="menu">
  <UserInfo user={user} />
  <div className="dropdown-divider" />
  <MenuItem 
    icon="🔑" 
    label="Personal API Keys" 
    to="/api-keys"
    onClick={onClose}
  />
  <div className="dropdown-divider" />
  <MenuItem 
    icon="🚪" 
    label="Sign Out" 
    onClick={handleSignOut}
    variant="danger"
  />
</div>
```

**Positioning**:
- Absolute positioning relative to ProfileIcon
- Right-aligned with the icon
- Appears below the icon with appropriate spacing
- Z-index ensures it appears above other content

### UserInfo Component

**Purpose**: Displays user information at the top of the dropdown

**Props**:
```typescript
interface UserInfoProps {
  user: User;
}
```

**Display**:
- User email (primary)
- User name if available (secondary)
- Non-interactive, informational only
- Styled to be visually distinct from menu items

### MenuItem Component

**Purpose**: Reusable menu item for actions

**Props**:
```typescript
interface MenuItemProps {
  icon?: string;
  label: string;
  to?: string;  // For navigation items
  onClick?: () => void;  // For action items
  variant?: 'default' | 'danger';
}
```

**Behavior**:
- If `to` is provided, renders as a Link component
- If `onClick` is provided, renders as a button
- Supports keyboard navigation
- Hover and focus states
- Optional icon display

## Data Models

### User Type (existing)

```typescript
interface User {
  name: string;
  email: string;
  roles?: string[];
}
```

No changes to existing data models are required.

## Styling and Theming

### CSS Structure

**New CSS file**: `ProfileMenu.css`

```css
/* Container */
.profile-menu {
  position: relative;
}

/* Profile Icon */
.profile-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

/* Dropdown */
.profile-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 240px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow);
  z-index: 1000;
}

/* Menu Items */
.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  transition: background 0.2s;
}
```

### Theme Support

All three themes (light, dark, frankenstein) will be supported:

**Light Theme**:
- Profile icon: Light gray background with dark text
- Dropdown: White background with subtle shadow

**Dark Theme**:
- Profile icon: Dark gray background with light text
- Dropdown: Dark background with lighter border

**Frankenstein Theme**:
- Profile icon: Themed background with stitching effect
- Dropdown: Themed background with bolt decorations
- Menu items: Uppercase text with stitch borders on hover
- Special effects: Glow on hover, texture overlay

### Responsive Design

**Desktop (> 768px)**:
- Profile menu in top-right corner
- Dropdown right-aligned

**Mobile (≤ 768px)**:
- Profile icon remains visible
- Dropdown adjusts to viewport width
- Touch-friendly sizing (minimum 44px touch targets)

## Integration Points

### Header Component Changes

**Current Structure**:
```tsx
<div className="user-info">
  <span className="user-email">{user.email}</span>
  <AngryButton onClick={logout}>Sign out</AngryButton>
  <ThemeToggle />
</div>
```

**New Structure**:
```tsx
<div className="user-info">
  <ThemeToggle />
  <ProfileMenu user={user} />
</div>
```

### Navigation Changes

**Remove from main navigation**:
- API Keys link (`/api-keys`) will be removed from the header nav

**Add to profile dropdown**:
- Personal API Keys menu item linking to `/api-keys`

### Route Handling

No changes to routing are required. The `/api-keys` route remains the same; only the navigation entry point changes.

## Error Handling

### Missing User Information

**Scenario**: User object is missing email or name

**Handling**:
- Display generic initials (e.g., "U")
- Show "User" as fallback in dropdown
- Log warning to console

### Click Outside Detection

**Scenario**: Multiple dropdowns or modals open simultaneously

**Handling**:
- Use event capturing to ensure proper order
- Check if click target is within dropdown before closing
- Prevent event propagation when clicking inside dropdown

### Navigation Failures

**Scenario**: Navigation to `/api-keys` fails

**Handling**:
- Standard React Router error handling
- Dropdown closes regardless of navigation success

## Testing Strategy

### Unit Tests

1. **ProfileMenu Component**:
   - Opens dropdown on icon click
   - Closes dropdown on outside click
   - Closes dropdown on Escape key
   - Closes dropdown on route change

2. **ProfileIcon Component**:
   - Renders user initials correctly
   - Shows active state when dropdown is open
   - Handles keyboard interactions

3. **ProfileDropdown Component**:
   - Renders user information
   - Renders menu items
   - Calls onClose when menu item is clicked

4. **MenuItem Component**:
   - Renders as Link when `to` prop is provided
   - Renders as button when `onClick` prop is provided
   - Applies correct variant styling

### Integration Tests

1. **Header Integration**:
   - Profile menu appears in header
   - Theme toggle remains functional
   - Sign out functionality works from dropdown

2. **Navigation Integration**:
   - API Keys link removed from main nav
   - API Keys accessible from profile dropdown
   - Navigation to API Keys page works

3. **Theme Integration**:
   - Profile menu styled correctly in all themes
   - Theme transitions work smoothly
   - Frankenstein theme effects apply correctly

### Accessibility Tests

1. **Keyboard Navigation**:
   - Tab to profile icon
   - Enter/Space to open dropdown
   - Arrow keys to navigate menu items
   - Escape to close dropdown

2. **Screen Reader**:
   - Profile icon announces correctly
   - Dropdown state announced
   - Menu items have proper labels

3. **Focus Management**:
   - Focus returns to icon when dropdown closes
   - Focus trap within dropdown when open

### Visual Regression Tests

1. **Desktop Layout**:
   - Profile menu positioning
   - Dropdown alignment
   - All three themes

2. **Mobile Layout**:
   - Profile icon sizing
   - Dropdown width adjustment
   - Touch target sizes

## Implementation Notes

### Click Outside Detection Pattern

Use a common React pattern with `useRef` and `useEffect`:

```typescript
const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  if (isOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isOpen]);
```

### User Initials Generation

Extract initials from email:

```typescript
const getInitials = (email: string): string => {
  const parts = email.split('@')[0].split('.');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
};
```

### Animation Considerations

- Use CSS transitions for smooth open/close
- Consider `transform` and `opacity` for performance
- Respect `prefers-reduced-motion` media query

## Migration Strategy

### Phase 1: Create New Components
- Build ProfileMenu, ProfileIcon, ProfileDropdown, MenuItem components
- Add comprehensive tests
- Ensure accessibility compliance

### Phase 2: Integrate into Header
- Replace user info section with ProfileMenu
- Keep existing functionality working
- Maintain theme support

### Phase 3: Update Navigation
- Remove API Keys link from main nav
- Verify all routes still accessible
- Update any documentation

### Phase 4: Polish and Test
- Cross-browser testing
- Accessibility audit
- Visual regression testing
- Performance verification

## Performance Considerations

- Lazy render dropdown content (only when open)
- Debounce click outside handler if needed
- Minimize re-renders with proper memoization
- Keep component tree shallow

## Security Considerations

- No sensitive data displayed in profile menu
- Sign out functionality remains secure
- No new authentication concerns introduced
- User email display follows existing patterns

## Future Enhancements

Potential future additions to the profile menu:
- User preferences/settings
- Notification preferences
- Account management link
- Help/documentation link
- Keyboard shortcuts reference
