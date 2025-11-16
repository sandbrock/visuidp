# Implementation Plan

- [x] 1. Replace plain HTML buttons in Infrastructure component with AngryButton
  - Locate all `<button>` elements with CSS classes (`btn`, `btn-primary`, `btn-small`, etc.) in Infrastructure.tsx
  - Replace blueprint control buttons (New, Edit, Delete) with AngryButton components using appropriate props
  - Replace resource control button (Create New Resource) with AngryButton component
  - Replace resource table action buttons (Edit, Delete) with AngryButton components
  - Map CSS classes to AngryButton props: `btn-primary` → `isPrimary`, `btn-outline` → `style="outline"`, `btn-danger` → `variant="danger"`, `btn-small` → `size="small"`
  - Verify AngryButton import exists in Infrastructure.tsx
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Fix profile icon CSS styling issues
  - Review ProfileMenu.css for hardcoded black colors or borders
  - Replace any hardcoded colors with CSS variables (e.g., `var(--border-primary)`, `var(--bg-tertiary)`)
  - Add fallback values to CSS variables for safety
  - Ensure border-radius maintains circular appearance
  - Verify hover and active states use theme-appropriate colors
  - Test profile icon in all themes (light, dark, Frankenstein)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Fix theme toggle CSS styling issues
  - Review ThemeToggle.css for hardcoded black colors or borders
  - Replace any hardcoded colors with CSS variables
  - Add fallback values to CSS variables for safety
  - Ensure border-radius maintains circular appearance
  - Verify hover states use theme-appropriate colors
  - Test theme toggle in all themes (light, dark, Frankenstein)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Verify button consistency across application
  - Search codebase for other instances of plain HTML buttons with CSS classes
  - Document any remaining plain HTML buttons for future cleanup
  - Verify AngryButton is the standard button component throughout the application
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Remove global button styles from index.css
  - Review global button styles in `idp-ui/src/index.css` (lines 28-42)
  - Remove or scope the global `button` selector styles that interfere with component-specific styling
  - Ensure the removal doesn't break other button styling in the application
  - Add specific overrides in ProfileMenu.css and ThemeToggle.css if needed to ensure icons display correctly
  - Verify profile icon and theme toggle display without black borders or unwanted backgrounds
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Test visual consistency across all themes
  - Test Infrastructure component buttons in light theme
  - Test Infrastructure component buttons in dark theme
  - Test Infrastructure component buttons in Frankenstein theme
  - Test profile icon and theme toggle in all themes
  - Verify button states (hover, active, disabled) work correctly in all themes
  - Verify no visual regressions in other components
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Run automated tests and TypeScript compilation
  - Run `npm run build` to verify TypeScript compilation succeeds
  - Run `npm test` to ensure no test regressions
  - Fix any TypeScript errors or test failures
  - _Requirements: All requirements_
