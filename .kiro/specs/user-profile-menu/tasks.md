# Implementation Plan

- [x] 1. Create ProfileMenu component structure
  - Create `ProfileMenu.tsx` component file with state management for dropdown visibility
  - Implement click-outside detection using useRef and useEffect hooks
  - Add Escape key handler to close dropdown
  - Add route change listener to close dropdown on navigation
  - _Requirements: 1.3, 1.4, 5.2, 5.3_

- [x] 2. Create ProfileIcon component
  - [x] 2.1 Implement ProfileIcon component with user initials display
    - Create `ProfileIcon.tsx` component file
    - Implement getInitials utility function to extract initials from email
    - Add circular icon styling with theme-aware colors
    - Implement hover and active states
    - _Requirements: 1.1, 1.2, 4.4_

  - [x] 2.2 Add accessibility attributes to ProfileIcon
    - Add ARIA role, label, expanded, and haspopup attributes
    - Implement keyboard event handlers (Enter, Space)
    - Ensure focus management and visual focus indicators
    - _Requirements: 1.5, 4.2, 4.3_

- [x] 3. Create ProfileDropdown component
  - [x] 3.1 Implement ProfileDropdown structure and positioning
    - Create `ProfileDropdown.tsx` component file
    - Implement absolute positioning relative to ProfileIcon
    - Add conditional rendering based on isOpen state
    - Style dropdown with theme-aware colors and shadows
    - _Requirements: 1.3, 4.1_

  - [x] 3.2 Add UserInfo section to dropdown
    - Create UserInfo component displaying user email and name
    - Style user info to be visually distinct from menu items
    - Handle missing user information with fallbacks
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.3 Create MenuItem component for dropdown actions
    - Create reusable MenuItem component supporting both Link and button variants
    - Implement icon display, label, and variant styling
    - Add hover and focus states
    - Support keyboard navigation
    - _Requirements: 2.2, 2.4, 4.2_

  - [x] 3.4 Add menu items to ProfileDropdown
    - Add "Personal API Keys" menu item linking to /api-keys
    - Add "Sign Out" menu item with logout functionality
    - Add visual dividers between sections
    - Implement onClose callback when menu items are clicked
    - _Requirements: 2.1, 2.2, 5.1_

- [x] 4. Create ProfileMenu styles
  - [x] 4.1 Create base ProfileMenu.css with light theme styles
    - Create `ProfileMenu.css` file with component styles
    - Style profile-menu container, profile-icon, and profile-dropdown
    - Add menu-item and user-info styles
    - Implement smooth transitions and animations
    - _Requirements: 1.2, 4.4_

  - [x] 4.2 Add dark theme styles to ProfileMenu.css
    - Add dark theme color overrides using CSS variables
    - Ensure proper contrast and readability
    - Test dropdown visibility and shadows
    - _Requirements: 4.4_

  - [x] 4.3 Add Frankenstein theme styles to ProfileMenu.css
    - Add Frankenstein theme styling with stitching effects
    - Add bolt decorations and texture overlays
    - Implement glow effects on hover
    - Style menu items with uppercase text and themed borders
    - _Requirements: 4.4_

  - [x] 4.4 Add responsive styles for mobile devices
    - Add media query for screens ≤ 768px
    - Adjust dropdown width for mobile viewports
    - Ensure touch target sizes meet 44px minimum
    - Test profile icon sizing on mobile
    - _Requirements: 4.1_

- [x] 5. Integrate ProfileMenu into Header component
  - [x] 5.1 Update Header component to use ProfileMenu
    - Import ProfileMenu component in Header.tsx
    - Replace user-info section with ThemeToggle and ProfileMenu
    - Remove user email display and logout button from header
    - Pass user prop to ProfileMenu
    - _Requirements: 1.1, 2.3_

  - [x] 5.2 Remove API Keys link from main navigation
    - Remove API Keys Link from header-nav section
    - Update Header.css to remove any API Keys specific styles
    - Verify navigation layout remains balanced
    - _Requirements: 2.3_

  - [x] 5.3 Update Header.css for new layout
    - Adjust user-info section styling for new component arrangement
    - Ensure proper spacing between ThemeToggle and ProfileMenu
    - Verify responsive behavior on mobile
    - Test all three themes for visual consistency
    - _Requirements: 1.1, 4.4_

- [x] 6. Add accessibility enhancements
  - Implement focus trap within dropdown when open
  - Add aria-label to all interactive elements
  - Ensure proper heading hierarchy
  - Test with screen reader (announce dropdown state and menu items)
  - Verify keyboard navigation flow (Tab, Enter, Space, Escape, Arrow keys)
  - _Requirements: 1.5, 4.2, 4.3, 4.4_

- [x] 7. Write component tests
  - [x] 7.1 Write ProfileMenu component tests
    - Test dropdown opens on icon click
    - Test dropdown closes on outside click
    - Test dropdown closes on Escape key press
    - Test dropdown closes on route change
    - _Requirements: 1.3, 1.4, 5.2, 5.3_

  - [x] 7.2 Write ProfileIcon component tests
    - Test user initials generation from email
    - Test active state when dropdown is open
    - Test keyboard interactions (Enter, Space)
    - Test accessibility attributes
    - _Requirements: 1.2, 1.5, 4.2, 4.3_

  - [x] 7.3 Write ProfileDropdown component tests
    - Test user information display
    - Test menu items rendering
    - Test onClose callback on menu item click
    - Test fallback for missing user information
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3_

  - [x] 7.4 Write MenuItem component tests
    - Test Link variant rendering
    - Test button variant rendering
    - Test variant styling (default, danger)
    - Test icon display
    - _Requirements: 2.2, 2.4_

  - [x] 7.5 Write Header integration tests
    - Test ProfileMenu appears in header
    - Test API Keys link removed from main nav
    - Test navigation to API Keys from profile dropdown
    - Test sign out functionality from dropdown
    - Test theme toggle remains functional
    - _Requirements: 1.1, 2.1, 2.3, 5.1_

- [x] 8. Perform accessibility testing
  - Run automated accessibility tests with testing library
  - Test keyboard navigation flow manually
  - Test with screen reader (NVDA or JAWS)
  - Verify ARIA attributes are correct
  - Test focus management and visual focus indicators
  - Verify color contrast ratios meet WCAG AA standards
  - _Requirements: 1.5, 4.2, 4.3, 4.4_

- [x] 9. Perform visual regression testing
  - Test profile menu in light theme (desktop and mobile)
  - Test profile menu in dark theme (desktop and mobile)
  - Test profile menu in Frankenstein theme (desktop and mobile)
  - Test dropdown positioning and alignment
  - Test hover and active states
  - Test animations and transitions
  - _Requirements: 1.2, 4.1, 4.4_
