# Frankenstein Theme Accessibility Testing Guide

## Quick Testing Checklist

This guide provides step-by-step instructions for manually verifying the accessibility of the Frankenstein theme.

---

## 1. Contrast Ratio Testing (5 minutes)

### Using Chrome DevTools

1. **Open the application** in Chrome with Frankenstein theme active
2. **Right-click** on any text element → **Inspect**
3. **Click the color swatch** in the Styles panel next to any color value
4. **Check the contrast ratio** displayed in the color picker
   - Look for ✓ AA or ✓ AAA indicators
   - Minimum required: 4.5:1 for normal text, 3:1 for large text

### Key Elements to Test
- [ ] Primary text on background (`#e8f5e8` on `#1a1f1a`)
- [ ] Secondary text on background (`#a8c5a8` on `#1a1f1a`)
- [ ] Button text on button background
- [ ] Error text on background (`#ff006e` on `#1a1f1a`)
- [ ] Link text on background
- [ ] Input text on input background

**Expected Result**: All elements should show ✓ AA or better

---

## 2. Focus Indicator Testing (10 minutes)

### Keyboard Navigation Test

1. **Open the application** with Frankenstein theme
2. **Press Tab** repeatedly to navigate through all interactive elements
3. **Verify** that each element shows a visible focus indicator:
   - Purple outline with electrical glow
   - Clear distinction from unfocused state
   - Not obscured by other elements

### Elements to Test
- [ ] Theme toggle button (⚡ icon)
- [ ] Navigation links (Admin, Homepage, Stacks, etc.)
- [ ] Form input fields
- [ ] Buttons (Create, Save, Cancel, Delete)
- [ ] Dropdown/ComboBox controls
- [ ] Modal close buttons
- [ ] Links within content

### Test Procedure
```
1. Click in browser address bar
2. Press Tab to enter page
3. Continue pressing Tab
4. Verify purple glow appears on each element
5. Press Shift+Tab to go backwards
6. Verify focus indicators remain visible
```

**Expected Result**: Every interactive element should show a purple electrical glow when focused

---

## 3. Keyboard Navigation Testing (15 minutes)

### Full Keyboard Navigation Test

#### Basic Navigation
- [ ] **Tab**: Moves focus forward through interactive elements
- [ ] **Shift+Tab**: Moves focus backward
- [ ] **Enter**: Activates buttons and links
- [ ] **Space**: Activates buttons and checkboxes
- [ ] **Escape**: Closes modals and dropdowns

#### Form Controls
- [ ] **Arrow keys**: Navigate dropdown options
- [ ] **Enter**: Select dropdown option
- [ ] **Space**: Toggle checkboxes
- [ ] **Tab**: Move between form fields

#### Modal Dialogs
1. **Open a modal** (e.g., Create API Key)
2. **Verify**:
   - [ ] Focus moves into modal
   - [ ] Tab cycles through modal elements only
   - [ ] Cannot tab to background elements
   - [ ] Escape key closes modal
   - [ ] Focus returns to trigger button when closed

#### Theme Toggle
1. **Tab to theme toggle button** (⚡ icon)
2. **Press Enter or Space**
3. **Verify**: Theme cycles through light → dark → frankenstein → light

**Expected Result**: All functionality accessible via keyboard, no mouse required

---

## 4. ARIA Label Testing (10 minutes)

### Using Chrome DevTools Accessibility Tree

1. **Open DevTools** → **Elements** tab
2. **Click the Accessibility icon** (person icon) next to Styles
3. **Inspect elements** and verify:

#### Theme Toggle
- [ ] Has `aria-label` describing current theme and next action
- [ ] Example: "Current theme: frankenstein. Switch to light mode"

#### Form Inputs
- [ ] Each input has associated `<label>` element
- [ ] Label text is descriptive
- [ ] Required fields indicated

#### Buttons
- [ ] All buttons have descriptive text or `aria-label`
- [ ] Purpose is clear (e.g., "Create API Key", "Delete Stack")

#### Error Messages
- [ ] Have `role="alert"` attribute
- [ ] Have `aria-live="polite"` for announcements

#### Modals
- [ ] Have `aria-labelledby` pointing to header
- [ ] Have `aria-describedby` pointing to content
- [ ] Have `modal={true}` attribute

**Expected Result**: All interactive elements have descriptive, accurate labels

---

## 5. Screen Reader Testing (20 minutes)

### Windows - NVDA (Free)

1. **Download NVDA**: https://www.nvaccess.org/download/
2. **Install and start NVDA**
3. **Open the application** with Frankenstein theme
4. **Navigate using**:
   - **Tab**: Move through interactive elements
   - **H**: Jump between headings
   - **B**: Jump between buttons
   - **K**: Jump between links
   - **F**: Jump between form fields

#### Test Scenarios

**Theme Toggle**
1. Tab to theme toggle button
2. Listen for: "Current theme: frankenstein. Switch to light mode. Button"
3. Press Enter
4. Listen for theme change announcement

**Form Input**
1. Tab to a form field
2. Listen for: "[Label]. Edit text. Required." (if required)
3. Type some text
4. Listen for character/word echo

**Form Validation Error**
1. Submit form with empty required field
2. Listen for: "Alert. [Field name] is required."
3. Tab to error field
4. Listen for: "Invalid entry. [Field name]. Edit text."

**Button**
1. Tab to a button
2. Listen for: "[Button text]. Button."
3. Press Enter
4. Listen for action confirmation

**Modal Dialog**
1. Activate button that opens modal
2. Listen for: "Dialog. [Modal title]. Modal."
3. Press Escape
4. Listen for: "Dialog closed."

### macOS - VoiceOver (Built-in)

1. **Enable VoiceOver**: Cmd+F5
2. **Navigate using**:
   - **Tab**: Move through interactive elements
   - **VO+Right Arrow**: Move to next item
   - **VO+Left Arrow**: Move to previous item
   - **VO+Space**: Activate element

**Expected Result**: All content is announced clearly and accurately

---

## 6. Color Blindness Testing (5 minutes)

### Using Browser Extension

1. **Install**: "Colorblind - Dalton" Chrome extension
2. **Open the application** with Frankenstein theme
3. **Test each color blindness type**:
   - [ ] Protanopia (red-blind)
   - [ ] Deuteranopia (green-blind)
   - [ ] Tritanopia (blue-blind)
   - [ ] Achromatopsia (total color blindness)

### Verify for Each Type
- [ ] Error states identifiable (icon + text, not just color)
- [ ] Success states identifiable (icon + text)
- [ ] Buttons distinguishable by text labels
- [ ] Navigation active state clear (not just color)
- [ ] Form validation visible (border + icon + text)

**Expected Result**: All information conveyed through multiple indicators, not color alone

---

## 7. Zoom and Responsive Testing (10 minutes)

### Zoom Testing

1. **Open the application** with Frankenstein theme
2. **Zoom to 150%**: Ctrl/Cmd + (plus key)
   - [ ] Text remains readable
   - [ ] Layout intact
   - [ ] No horizontal scrolling
3. **Zoom to 200%**: Continue pressing Ctrl/Cmd +
   - [ ] Text remains readable
   - [ ] Layout reflows appropriately
   - [ ] All functionality accessible
   - [ ] No content overlap
4. **Zoom to 300%**: Continue pressing Ctrl/Cmd +
   - [ ] Content still accessible
   - [ ] Vertical scrolling acceptable

### Mobile Responsive Testing

1. **Open DevTools** → **Toggle device toolbar** (Ctrl+Shift+M)
2. **Test different devices**:
   - [ ] iPhone SE (375px width)
   - [ ] iPad (768px width)
   - [ ] Desktop (1920px width)
3. **Verify**:
   - [ ] Cards stack on mobile
   - [ ] Touch targets adequate (44x44px minimum)
   - [ ] Text readable without zooming
   - [ ] No horizontal scrolling

**Expected Result**: Content accessible and functional at 200% zoom and on all device sizes

---

## 8. Animation Safety Testing (5 minutes)

### Flash Rate Verification

1. **Open the application** with Frankenstein theme
2. **Observe animations**:
   - [ ] Lightning flash effect
   - [ ] Electrical glow pulsing
   - [ ] Danger button pulsing
   - [ ] Loading spinner
3. **Verify**:
   - [ ] No rapid flashing (< 3 flashes per second)
   - [ ] Smooth, gentle transitions
   - [ ] No jarring movements

### Reduced Motion Testing

1. **Enable reduced motion**:
   - **Windows**: Settings → Ease of Access → Display → Show animations
   - **macOS**: System Preferences → Accessibility → Display → Reduce motion
2. **Reload the application**
3. **Verify**:
   - [ ] Animations disabled or significantly reduced
   - [ ] Functionality still works
   - [ ] Focus indicators still visible (without animation)

**Expected Result**: No seizure-inducing flashing; reduced motion preference respected

---

## 9. High Contrast Mode Testing (5 minutes)

### Windows High Contrast Mode

1. **Enable High Contrast**: Alt+Left Shift+Print Screen
2. **Open the application** with Frankenstein theme
3. **Verify**:
   - [ ] Text remains readable
   - [ ] Borders visible
   - [ ] Focus indicators visible
   - [ ] Buttons distinguishable

**Expected Result**: Theme remains functional in high contrast mode

---

## 10. Touch Target Testing (5 minutes)

### Mobile Device or DevTools

1. **Open DevTools** → **Toggle device toolbar**
2. **Enable touch simulation**
3. **Test interactive elements**:
   - [ ] Buttons at least 44x44px
   - [ ] Links at least 44x44px (mobile)
   - [ ] Form inputs adequate height (40px+)
   - [ ] Adequate spacing between elements (8px+)

### Measurement Tool
1. **Right-click element** → **Inspect**
2. **Check computed dimensions** in DevTools
3. **Verify minimum sizes**

**Expected Result**: All touch targets meet minimum size requirements

---

## Quick Pass/Fail Checklist

Use this for rapid verification:

### Visual
- [ ] All text has sufficient contrast (4.5:1 minimum)
- [ ] Focus indicators visible on all interactive elements
- [ ] Error states use multiple indicators (color + icon + text)
- [ ] Layout works at 200% zoom

### Keyboard
- [ ] All functionality accessible via keyboard
- [ ] Tab order is logical
- [ ] No keyboard traps
- [ ] Escape closes modals

### Screen Reader
- [ ] All elements have descriptive labels
- [ ] Form inputs announce labels and states
- [ ] Errors announced immediately
- [ ] Navigation is logical

### Safety
- [ ] No rapid flashing (< 3 Hz)
- [ ] Reduced motion preference respected
- [ ] Color not sole indicator of information

---

## Common Issues and Solutions

### Issue: Focus indicator not visible
**Solution**: Check for `outline: none` without replacement focus style

### Issue: Screen reader not announcing element
**Solution**: Add `aria-label` or ensure proper label association

### Issue: Keyboard trap in modal
**Solution**: Verify modal has proper focus management and Escape handler

### Issue: Low contrast error
**Solution**: Adjust color values to meet 4.5:1 minimum ratio

### Issue: Animation too fast/jarring
**Solution**: Reduce animation speed or add easing function

---

## Automated Testing Tools

### Browser Extensions
- **axe DevTools**: Comprehensive accessibility testing
- **WAVE**: Visual accessibility evaluation
- **Lighthouse**: Built into Chrome DevTools (Audits tab)

### Running Lighthouse Audit
1. **Open DevTools** → **Lighthouse** tab
2. **Select**: Accessibility
3. **Click**: Generate report
4. **Review**: Issues and recommendations

**Target Score**: 95+ (100 is ideal)

---

## Reporting Issues

If you find accessibility issues:

1. **Document**:
   - Element affected
   - Expected behavior
   - Actual behavior
   - WCAG criterion violated
   - Steps to reproduce

2. **Severity**:
   - **Critical**: Blocks functionality
   - **High**: Significantly impacts usability
   - **Medium**: Impacts some users
   - **Low**: Minor inconvenience

3. **Include**:
   - Screenshots
   - Screen reader output
   - Contrast ratio measurements
   - Browser/OS information

---

## Resources

### WCAG Guidelines
- https://www.w3.org/WAI/WCAG21/quickref/

### Testing Tools
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **NVDA Screen Reader**: https://www.nvaccess.org/
- **axe DevTools**: https://www.deque.com/axe/devtools/

### Color Blindness Simulators
- **Colorblind - Dalton**: Chrome extension
- **Color Oracle**: Desktop application

---

## Completion Criteria

The Frankenstein theme passes accessibility testing when:

- ✅ All text meets WCAG AA contrast ratios (4.5:1 minimum)
- ✅ All interactive elements have visible focus indicators
- ✅ All functionality accessible via keyboard
- ✅ All elements have descriptive ARIA labels
- ✅ Screen readers announce all content correctly
- ✅ No seizure-inducing animations
- ✅ Information not conveyed by color alone
- ✅ Content accessible at 200% zoom
- ✅ Lighthouse accessibility score 95+

---

**Last Updated**: November 9, 2025
**Version**: 1.0
