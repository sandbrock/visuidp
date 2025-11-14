# Implementation Plan

- [x] 1. Remove Syncfusion CSS from App.css
  - Remove all CSS selectors targeting Syncfusion classes (`.e-btn`, `.e-input-group`, `.e-tab`, `.e-combobox`, `.e-ddl`, `.e-float-input`, `.e-error`)
  - Remove theme-specific Syncfusion overrides for light, dark, and frankenstein themes
  - Remove Syncfusion button style overrides
  - Remove Syncfusion input validation error state styles
  - Remove comments referencing Syncfusion
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Remove Syncfusion CSS from other style files
  - Remove Syncfusion button overrides from `idp-ui/src/index.css`
  - Remove Syncfusion-specific styles from `idp-ui/src/components/Infrastructure.css`
  - Remove comments about Syncfusion material-style highlights and ripple effects
  - _Requirements: 1.1, 1.3_

- [x] 3. Refactor AngryButton component to remove Syncfusion compatibility
  - Remove `mapCssClass` function that maps Syncfusion class names
  - Remove `cssClass` prop from component interface
  - Remove `iconCss` prop (Syncfusion convention) or document if still needed
  - Add semantic `variant` prop if needed for button types
  - Update component to use only semantic props (`isPrimary`, `className`, `variant`)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4. Update all AngryButton usages to remove cssClass prop
  - Search for all usages of `<AngryButton cssClass=` in the codebase
  - Replace `cssClass="e-primary"` with `isPrimary={true}` or appropriate semantic prop
  - Replace `cssClass="e-danger"` with `variant="danger"` or appropriate semantic prop
  - Replace other Syncfusion class usages with semantic equivalents
  - _Requirements: 4.1, 4.4_

- [x] 5. Remove Syncfusion focus handling from components
  - Remove `focusIn()` fallback logic from AngryTextBox component
  - Update focus handling to use only standard DOM `focus()` method
  - Remove Syncfusion-specific comments about focus methods in StackForm
  - Update focus handling in StackForm to use standard DOM methods
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Clean up Syncfusion references in test files
  - Remove Syncfusion comparison tests from ButtonCrossBrowser.test.tsx
  - Remove test elements with Syncfusion-specific test IDs (e.g., `syncfusion-primary`, `syncfusion-danger`)
  - Update test descriptions to remove Syncfusion mentions
  - Ensure tests focus only on custom component behavior
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7. Update Frankenstein theme documentation
  - Update `FRANKENSTEIN_ERROR_STATES_SUMMARY.md` to remove Syncfusion component sections
  - Update `FRANKENSTEIN_THEME_DOCUMENTATION.md` to remove Syncfusion references
  - Update `FRANKENSTEIN_ERROR_CONTRAST_VERIFICATION.md` to remove Syncfusion component mentions
  - Replace "Syncfusion Components" sections with "Custom Components" where appropriate
  - Update examples to use custom component class names instead of Syncfusion classes
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 8. Clean up configuration files
  - Remove `syncfusion-license.txt` entry from `.gitignore`
  - Verify no other configuration files contain Syncfusion references
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Perform final verification sweep
  - Search entire codebase for remaining "syncfusion" references (case-insensitive)
  - Search for remaining Syncfusion class patterns (`.e-btn`, `.e-input`, etc.)
  - Verify TypeScript compilation succeeds with no errors
  - Run test suite to ensure all tests pass
  - _Requirements: All requirements_

- [x] 10. Manual testing and visual verification
  - Test application in light theme for visual regressions
  - Test application in dark theme for visual regressions
  - Test application in frankenstein theme for visual regressions
  - Test form submission flows and focus navigation
  - Test button interactions and styling in all variants
  - Test input components and error states
  - Verify cross-browser compatibility (Chrome, Firefox, Safari)
  - _Requirements: All requirements_
