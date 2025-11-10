# Implementation Plan

- [x] 1. Update ThemeContext to support Frankenstein theme
  - Extend the Theme type to include 'frankenstein' as a third option
  - Update toggleTheme function to cycle through light → dark → frankenstein → light
  - Add setTheme function for direct theme selection
  - Ensure localStorage persistence works with the new theme value
  - Add validation to handle invalid theme values gracefully
  - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4, 5.1_

- [x] 2. Update ThemeToggle component for three-way toggle
  - Modify icon display logic to show ⚡ (lightning bolt) for Frankenstein theme
  - Update aria-label to reflect three-way toggle functionality
  - Add visual feedback for Frankenstein theme selection
  - Ensure smooth icon transitions between all three themes
  - _Requirements: 1.4, 4.1, 4.2, 4.4_

- [x] 3. Define Frankenstein theme CSS custom properties
  - Add [data-theme="frankenstein"] selector to App.css
  - Define all color variables (bg-primary, bg-secondary, bg-tertiary, text-primary, text-secondary, borders, shadows)
  - Define accent colors (accent-primary, accent-primary-hover, accent-secondary)
  - Define state colors (danger, danger-hover, success, success-hover)
  - Add Frankenstein-specific variables (bolt, stitch, glow, metal colors)
  - Add smooth transition properties for theme changes (400ms)
  - _Requirements: 1.1, 1.2, 5.2, 5.3_

- [x] 4. Implement Header component Frankenstein styling
  - Add [data-theme="frankenstein"] styles to Header.css
  - Implement stitching effect on header border using ::after pseudo-element
  - Style app title with lightning bolt color and glow effect
  - Add hover effects to navigation links with electrical glow
  - Style active navigation state with appropriate colors
  - Add electrical shadow effects to header
  - _Requirements: 1.1, 1.3, 1.5, 3.2_

- [x] 5. Implement Button component Frankenstein styling
  - Add [data-theme="frankenstein"] styles to AngryButton.css
  - Implement stitching pattern on buttons using ::before pseudo-element
  - Add electrical glow effect on hover
  - Style primary buttons with purple gradient
  - Style danger buttons with pulsing animation
  - Add transform effects for tactile feedback
  - _Requirements: 1.3, 2.2, 2.4, 3.1, 3.5_

- [x] 6. Implement Input component Frankenstein styling
  - Add [data-theme="frankenstein"] styles to AngryTextBox.css
  - Style input fields with appropriate background and border colors
  - Add electrical glow effect on focus
  - Style floating labels with color transitions
  - Ensure clear field boundaries and validation states
  - _Requirements: 1.1, 2.1, 2.3_

- [x] 7. Implement ComboBox and dropdown Frankenstein styling
  - Add [data-theme="frankenstein"] styles to AngryComboBox.css
  - Style dropdown popups with theme colors
  - Style list items with hover and active states
  - Add electrical glow effects to focused dropdowns
  - Ensure dropdown icons are visible and themed
  - _Requirements: 1.1, 2.1, 2.3_

- [x] 8. Implement global card and container Frankenstein styling
  - Add [data-theme="frankenstein"] styles to App.css for cards
  - Implement stitching effect on card borders using ::before pseudo-element
  - Add metal bolt decorations in corners using ::after pseudo-element
  - Style content cards with appropriate shadows and borders
  - Ensure consistent spacing and padding
  - _Requirements: 1.3, 3.1, 3.4_

- [x] 9. Implement Loading component Frankenstein styling
  - Add [data-theme="frankenstein"] styles to Loading.css
  - Create frankenstein-spin animation for spinner
  - Create frankenstein-glow animation for pulsing electrical effect
  - Add lightning bolt to loading text with flash animation
  - Ensure loading states are visually distinct
  - _Requirements: 1.3, 3.3_

- [x] 10. Implement Modal/Dialog Frankenstein styling
  - Add [data-theme="frankenstein"] styles for Syncfusion dialogs in App.css
  - Style dialog background with borders and shadows
  - Style dialog header with gradient and stitching border
  - Add electrical glow effects to modal shadows
  - Ensure modal content is readable with proper contrast
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 11. Implement page-specific Frankenstein styling
- [x] 11.1 Style Homepage component
  - Add [data-theme="frankenstein"] styles to Homepage.css
  - Ensure dashboard cards display correctly
  - Style welcome message and user information
  - _Requirements: 1.5_

- [x] 11.2 Style AdminDashboard component
  - Add [data-theme="frankenstein"] styles to AdminDashboard.css
  - Style statistics cards with stitching effects
  - Ensure admin controls are clearly visible
  - _Requirements: 1.5_

- [x] 11.3 Style StackList and StackForm components
  - Add [data-theme="frankenstein"] styles to StackList.css and StackForm.css
  - Style stack cards with theme colors
  - Ensure form fields maintain clear boundaries
  - _Requirements: 1.5, 2.3_

- [x] 11.4 Style Infrastructure/Blueprint components
  - Add [data-theme="frankenstein"] styles to BlueprintForm.css and Infrastructure.css
  - Style blueprint cards and forms
  - Ensure resource type displays are themed
  - _Requirements: 1.5_

- [x] 11.5 Style API Keys management components
  - Add [data-theme="frankenstein"] styles to ApiKeysManagement.css
  - Style API key cards and modals
  - Ensure audit logs are readable
  - _Requirements: 1.5_

- [x] 12. Add Frankenstein-specific animations and effects
  - Create keyframe animations for electrical glow effects
  - Create keyframe animations for pulsing danger states
  - Create keyframe animations for lightning flash effects
  - Add transition effects for theme switching
  - Ensure animations are performant (use transform and opacity)
  - _Requirements: 1.3, 2.4, 3.3, 3.5_

- [x] 13. Implement error state styling for Frankenstein theme
  - Add [data-theme="frankenstein"] styles for error messages
  - Style validation errors with appropriate colors
  - Ensure error borders are clearly visible
  - Add electrical glow to error states
  - Verify contrast ratios meet WCAG AA standards
  - _Requirements: 2.1, 2.5_

- [x] 14. Add background texture for laboratory aesthetic
  - Create or source subtle noise texture SVG
  - Add background texture to main content areas
  - Set appropriate opacity (5-10%) to avoid overwhelming content
  - Ensure texture doesn't impact performance
  - _Requirements: 1.3, 3.4_

- [x] 15. Verify accessibility compliance
  - Test all text contrast ratios using browser DevTools
  - Verify focus indicators are visible on all interactive elements
  - Test keyboard navigation through all components
  - Verify aria-labels are descriptive and accurate
  - Test with screen reader (NVDA, JAWS, or VoiceOver)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 16. Test theme switching functionality
  - Test full cycle: light → dark → frankenstein → light
  - Verify theme persists after page reload
  - Test theme switching on all major pages
  - Verify smooth transitions between themes
  - Test with invalid localStorage values
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1_

- [x] 17. Test responsive design across devices
  - Test on mobile devices (320px - 768px width)
  - Test on tablet devices (768px - 1024px width)
  - Test on desktop (1024px+ width)
  - Verify all visual effects work on smaller screens
  - Ensure touch interactions work properly
  - _Requirements: 1.5, 2.2_

- [x] 18. Cross-browser compatibility testing
  - Test in Chrome (latest)
  - Test in Firefox (latest)
  - Test in Safari (latest)
  - Test in Edge (latest)
  - Verify CSS custom properties work correctly
  - Check animation performance across browsers
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 19. Performance optimization
  - Measure theme switching performance
  - Optimize animation frame rates
  - Minimize CSS selector specificity where possible
  - Verify no layout thrashing during transitions
  - Check for memory leaks in theme switching
  - _Requirements: 2.4_

- [x] 20. Documentation
  - Document Frankenstein theme color palette
  - Document CSS custom properties usage
  - Add comments to complex CSS animations
  - Update README with theme information
  - _Requirements: 5.1, 5.2, 5.3_


## Character-Focused Design Updates

- [x] 21. Update Frankenstein theme color palette to character-focused design
  - Replace purple/electrical colors with greenish-gray monster skin tones in App.css
  - Update --bg-primary to #1a1d1a (dark gray-green laboratory)
  - Update --text-primary to #d4e4d4 (pale greenish-white corpse-like tone)
  - Update --accent-primary to #7a9b7a (greenish skin tone)
  - Update --frankenstein-skin to #8ba888 (monster's greenish skin color)
  - Update --frankenstein-stitch to #2d2520 (dark brown/black surgical stitching)
  - Update --frankenstein-bolt to #7a7d7a (metallic gray neck bolts)
  - Update --danger to #8b0000 (dark blood red)
  - Update --success to #6b8e23 (olive drab green)
  - Remove purple electrical glow colors
  - _Requirements: 1.1, 1.2_

- [x] 22. Update Header component with character-focused styling
  - Replace electrical glow effects with character elements in Header.css
  - Add neck bolt decoration (⬢) to header using ::before pseudo-element
  - Update stitching pattern to be more prominent (3px border)
  - Change title color to --frankenstein-skin with dark shadow
  - Update nav link hover to use greenish skin tone instead of purple
  - Remove electrical spark effects
  - Add uppercase text-transform for gothic feel
  - _Requirements: 1.1, 1.3, 3.2_

- [x] 23. Update Button components with surgical stitching and bolts
  - Replace purple gradients with greenish skin tone backgrounds in AngryButton.css
  - Make stitching pattern more visible (2px dashed border in ::before)
  - Add bolt decoration (●) to button corners using ::after
  - Update hover effects to use skin tone colors instead of purple glow
  - Change primary button background to --accent-primary
  - Update danger button to use dark blood red without purple pulse
  - _Requirements: 1.3, 2.2, 2.4, 3.1_

- [x] 24. Update Input components with character-focused colors
  - Replace purple focus glow with greenish skin tone in AngryTextBox.css
  - Update border colors to use --frankenstein-stitch
  - Change focus state to use --frankenstein-skin color
  - Remove electrical glow effects from shadows
  - Update label colors to match new palette
  - _Requirements: 1.1, 2.1, 2.3_

- [x] 25. Update ComboBox and dropdown with character styling
  - Replace purple accents with greenish skin tones in AngryComboBox.css
  - Update dropdown borders to use --frankenstein-stitch
  - Change hover states to use skin tone colors
  - Remove electrical glow effects
  - _Requirements: 1.1, 2.1, 2.3_

- [x] 26. Update card components with prominent bolts and stitching
  - Make stitching more prominent (3px border, 2px dashed inner border) in App.css
  - Replace gear icon (⚙) with neck bolt symbol (⬢) in ::after
  - Add second bolt decoration using background-image radial-gradient
  - Update card borders to use --frankenstein-stitch
  - Change shadow colors from purple to dark black
  - _Requirements: 1.3, 3.1, 3.4_

- [x] 27. Update Loading component with character-focused animation
  - Replace purple glow animation with simpler spin in Loading.css
  - Update spinner colors to use --frankenstein-skin and --frankenstein-bolt
  - Remove electrical glow keyframes
  - Replace lightning bolt (⚡) with loading dots animation
  - Add uppercase text-transform and letter-spacing for gothic feel
  - _Requirements: 1.3, 3.3_

- [x] 28. Update Modal/Dialog with character styling
  - Replace purple glow with dark shadows in App.css dialog styles
  - Update dialog borders to use --frankenstein-stitch (4px)
  - Add bolt decoration (⬢) to dialog header using ::before
  - Change header colors to use --frankenstein-skin
  - Add uppercase text-transform for gothic feel
  - Remove electrical glow effects
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 29. Update ThemeToggle icon for character theme
  - Change Frankenstein theme icon from ⚡ to ⬢ (bolt) or 🧟 in ThemeToggle.tsx
  - Update hover effect to use greenish glow instead of electrical spark
  - Update aria-label to reference "monster" or "Frankenstein" theme
  - _Requirements: 1.4, 4.1_

- [x] 30. Update page-specific components with new color palette
- [x] 30.1 Update Homepage.css with character colors
  - Replace any purple accents with greenish skin tones
  - Update card styling to match new palette
  - _Requirements: 1.5_

- [x] 30.2 Update AdminDashboard.css with character colors
  - Replace purple accents with greenish skin tones
  - Update statistics card colors
  - _Requirements: 1.5_

- [x] 30.3 Update StackList.css and StackForm.css with character colors
  - Replace purple accents with greenish skin tones
  - Update form field colors to match new palette
  - _Requirements: 1.5, 2.3_

- [x] 30.4 Update BlueprintForm.css and Infrastructure.css with character colors
  - Replace purple accents with greenish skin tones
  - Update blueprint card styling
  - _Requirements: 1.5_

- [x] 30.5 Update ApiKeysManagement.css with character colors
  - Replace purple accents with greenish skin tones
  - Update API key card styling
  - _Requirements: 1.5_

- [x] 31. Update background texture to greenish laboratory aesthetic
  - Modify or replace texture to have greenish tint instead of neutral
  - Ensure texture evokes rough, patched skin rather than just laboratory
  - Verify opacity is appropriate (8-12%)
  - _Requirements: 1.3, 3.4_

- [x] 32. Verify accessibility with new color palette
  - Test contrast ratios for new greenish colors using browser DevTools
  - Verify text-primary (#d4e4d4) on bg-primary (#1a1d1a) meets WCAG AA
  - Verify accent-primary (#7a9b7a) on bg-primary meets WCAG AA
  - Check danger state (#8b0000) contrast on light backgrounds
  - Test focus indicators are visible with new colors
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 33. Test updated theme across all pages
  - Verify character aesthetic is consistent across Homepage, Admin, Stacks, Blueprints
  - Check that bolts and stitching appear correctly on all components
  - Ensure no purple/electrical elements remain
  - Test theme switching between light, dark, and updated Frankenstein theme
  - _Requirements: 1.5, 4.2, 4.3_
