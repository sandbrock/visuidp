# Frankenstein Theme Verification Checklist

This document provides a comprehensive checklist for manually verifying the Frankenstein theme implementation across all pages of the IDP application.

## Prerequisites

1. Start the development server: `npm run dev`
2. Open the application in a browser
3. Enable Frankenstein theme using the theme toggle button (⬢ icon)

## Theme Switching Verification

### ✓ Theme Toggle Functionality
- [ ] Click theme toggle to cycle: Light → Dark → Frankenstein → Light
- [ ] Verify Frankenstein theme shows bolt icon (⬢) or zombie emoji (🧟), NOT lightning bolt (⚡)
- [ ] Verify theme persists after page reload
- [ ] Verify smooth transition between themes (400ms)
- [ ] Check localStorage contains `"theme": "frankenstein"`

## Color Palette Verification

### ✓ Greenish Character Colors (NO Purple)
Open browser DevTools and check CSS custom properties on `<html data-theme="frankenstein">`:

- [ ] `--bg-primary`: #1a1d1a (dark gray-green)
- [ ] `--text-primary`: #d4e4d4 (pale greenish-white)
- [ ] `--accent-primary`: #7a9b7a (greenish skin tone)
- [ ] `--frankenstein-skin`: #8ba888 (monster's greenish skin)
- [ ] `--frankenstein-stitch`: #2d2520 (dark brown/black stitching)
- [ ] `--frankenstein-bolt`: #7a7d7a (metallic gray bolts)
- [ ] `--danger`: #8b0000 (dark blood red)
- [ ] `--success`: #6b8e23 (olive drab green)

### ✓ NO Purple/Electrical Elements
- [ ] No purple colors in any CSS variables
- [ ] No purple glow effects on hover states
- [ ] No electrical spark animations
- [ ] No lightning bolt emoji (⚡) in Frankenstein theme

## Component-Specific Verification

### Header Component
Navigate to any page and inspect the header:

- [ ] Header has dark greenish background (#1a1d1a)
- [ ] Header has 3px solid border with stitch color (#2d2520)
- [ ] Neck bolt decoration (⬢) appears in header (via ::before pseudo-element)
- [ ] Stitching pattern visible on header border (dashed/repeating pattern)
- [ ] App title has greenish skin color (#8ba888) with dark shadow
- [ ] App title is uppercase with letter-spacing
- [ ] Nav links have greenish hover state (not purple)
- [ ] Active nav link has dark background with stitch border

### Button Components
Find any button on the page (e.g., "Create Stack", "Save", "Cancel"):

- [ ] Buttons have 2px solid border with stitch color (#2d2520)
- [ ] Visible stitching pattern inside button (1px dashed border via ::before)
- [ ] Bolt decoration (●) appears in button corner (via ::after)
- [ ] Primary buttons have greenish skin background (#7a9b7a), not purple
- [ ] Hover state uses greenish colors, not purple glow
- [ ] Danger buttons have dark blood red (#8b0000), not purple
- [ ] Button hover includes translateY(-2px) transform

### Input Components
Navigate to any form (e.g., Stack Form, Blueprint Form):

- [ ] Input fields have dark greenish background (#252b25)
- [ ] Input borders use stitch color (#2d2520)
- [ ] Focus state shows greenish skin color (#8ba888), not purple
- [ ] No purple glow on focus
- [ ] Labels transition to greenish color on focus
- [ ] Validation errors use dark blood red (#8b0000)

### Card Components
Look for cards on Homepage, Admin Dashboard, or Stack List:

- [ ] Cards have 3px solid border with stitch color (#2d2520)
- [ ] Prominent stitching pattern inside card (2px dashed border via ::before)
- [ ] Neck bolt symbol (⬢) appears in card corner (via ::after)
- [ ] Additional bolt decoration in opposite corner (radial-gradient)
- [ ] Card shadows are dark black, not purple
- [ ] Card background is dark greenish (#1a1d1a)

### Dropdown/ComboBox Components
Find any dropdown (e.g., resource type selector):

- [ ] Dropdown borders use stitch color (#2d2520)
- [ ] Dropdown background is dark greenish (#252b25)
- [ ] Hover states use greenish skin tone, not purple
- [ ] No purple glow effects
- [ ] Selected items have greenish highlight

### Modal/Dialog Components
Open any modal (e.g., API Key creation, confirmation dialogs):

- [ ] Modal has 4px solid border with stitch color (#2d2520)
- [ ] Modal header has greenish background (#252b25)
- [ ] Bolt decoration (⬢) in modal header (via ::before)
- [ ] Modal header text is uppercase with letter-spacing
- [ ] Modal shadows are dark black, not purple
- [ ] Modal content has dark greenish background

### Loading States
Trigger a loading state (e.g., navigate between pages):

- [ ] Loading spinner uses greenish skin and bolt colors
- [ ] No purple glow animation
- [ ] Loading text is uppercase with letter-spacing
- [ ] Loading dots animation (not lightning bolt)
- [ ] Simple spin animation (not electrical effects)

## Page-Specific Verification

### Homepage
Navigate to `/ui/`:

- [ ] Dashboard cards have stitching and bolt decorations
- [ ] Welcome message uses greenish text colors
- [ ] User information is readable with proper contrast
- [ ] All interactive elements have greenish hover states
- [ ] No purple elements visible

### Admin Dashboard
Navigate to `/ui/admin`:

- [ ] Statistics cards have prominent stitching effects
- [ ] Bolt decorations appear on stat cards
- [ ] Admin controls use greenish color scheme
- [ ] API Keys section uses character colors
- [ ] Audit logs are readable with proper contrast
- [ ] No purple elements visible

### Stack List
Navigate to `/ui/stacks`:

- [ ] Stack cards have stitching and bolt decorations
- [ ] Stack status indicators use appropriate colors
- [ ] Action buttons use greenish hover states
- [ ] Filter/search inputs have greenish focus states
- [ ] No purple elements visible

### Stack Form
Navigate to `/ui/stacks/new` or edit an existing stack:

- [ ] Form container has stitching border
- [ ] All input fields have greenish focus states
- [ ] Dropdown selectors use character colors
- [ ] Save/Cancel buttons have proper styling
- [ ] Validation errors use dark blood red
- [ ] No purple elements visible

### Blueprint Management
Navigate to `/ui/admin/blueprints`:

- [ ] Blueprint cards have stitching and bolts
- [ ] Resource type displays use greenish colors
- [ ] Form fields have proper character styling
- [ ] No purple elements visible

### Infrastructure Configuration
Navigate to infrastructure configuration pages:

- [ ] Configuration forms use greenish color scheme
- [ ] All inputs have proper focus states
- [ ] Nested forms maintain consistent styling
- [ ] No purple elements visible

### API Keys Management
Navigate to `/ui/admin/api-keys` or personal API keys:

- [ ] API key cards have stitching and bolt decorations
- [ ] Create/Revoke/Rotate modals use character styling
- [ ] Audit log entries are readable
- [ ] Action buttons use greenish hover states
- [ ] No purple elements visible

## Accessibility Verification

### Contrast Ratios
Use browser DevTools or axe DevTools to verify:

- [ ] Text primary on bg primary: ≥ 4.5:1 (WCAG AA)
- [ ] Accent primary on bg primary: ≥ 4.5:1
- [ ] Danger color on light backgrounds: ≥ 4.5:1
- [ ] All interactive elements meet contrast requirements

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators are visible (greenish outline/border)
- [ ] Theme toggle works with Enter/Space keys
- [ ] All forms are keyboard accessible
- [ ] Modal dialogs trap focus properly

### Screen Reader Testing (Optional)
- [ ] Theme toggle announces current theme
- [ ] Form labels are properly associated
- [ ] Error messages are announced
- [ ] Modal dialogs announce title and content

## Background Texture Verification

- [ ] Subtle greenish texture visible on main content areas
- [ ] Texture opacity is appropriate (8-12%)
- [ ] Texture evokes rough, patched skin aesthetic
- [ ] Texture doesn't overwhelm content
- [ ] Texture doesn't impact performance

## Cross-Browser Testing

Test in multiple browsers:

### Chrome
- [ ] All colors display correctly
- [ ] Animations are smooth
- [ ] Pseudo-elements render properly
- [ ] No layout issues

### Firefox
- [ ] All colors display correctly
- [ ] Animations are smooth
- [ ] Pseudo-elements render properly
- [ ] No layout issues

### Safari
- [ ] All colors display correctly
- [ ] Animations are smooth
- [ ] Pseudo-elements render properly
- [ ] No layout issues

### Edge
- [ ] All colors display correctly
- [ ] Animations are smooth
- [ ] Pseudo-elements render properly
- [ ] No layout issues

## Responsive Design Testing

Test at different viewport sizes:

### Mobile (320px - 768px)
- [ ] All elements scale appropriately
- [ ] Stitching and bolts remain visible
- [ ] Touch interactions work properly
- [ ] No horizontal scrolling
- [ ] Text remains readable

### Tablet (768px - 1024px)
- [ ] Layout adapts properly
- [ ] All visual effects work correctly
- [ ] Touch interactions work properly

### Desktop (1024px+)
- [ ] Full layout displays correctly
- [ ] All visual effects are prominent
- [ ] Hover states work properly

## Performance Verification

- [ ] Theme switching is smooth (no lag)
- [ ] Animations don't cause jank
- [ ] Page load time is acceptable
- [ ] No memory leaks during theme switching
- [ ] CSS doesn't cause layout thrashing

## Final Verification

- [ ] Character aesthetic is consistent across ALL pages
- [ ] Bolts and stitching appear correctly on ALL components
- [ ] NO purple or electrical elements remain ANYWHERE
- [ ] Theme switching works perfectly: light → dark → frankenstein → light
- [ ] Theme persists after browser reload
- [ ] All accessibility requirements are met
- [ ] Application remains fully functional in Frankenstein theme

## Sign-Off

- **Tester Name**: ___________________________
- **Date**: ___________________________
- **Browser(s) Tested**: ___________________________
- **Issues Found**: ___________________________
- **Overall Status**: ☐ Pass ☐ Fail ☐ Pass with Minor Issues

## Notes

Use this space to document any issues, observations, or recommendations:

---

