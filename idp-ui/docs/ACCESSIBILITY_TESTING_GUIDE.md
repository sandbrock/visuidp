# Accessibility Testing Guide

## Quick Reference for Manual Accessibility Testing

This guide provides step-by-step instructions for manually testing button accessibility in the IDP UI application.

---

## 1. Keyboard Navigation Testing

### Setup
- Open the application in your browser
- Navigate to a page with buttons (Blueprint editor, Stack form, etc.)
- Do not use your mouse for this test

### Test Steps

#### Test 1: Tab Navigation
1. Click in the browser address bar
2. Press `Tab` key repeatedly
3. Observe focus moving through interactive elements

**Expected Results**:
- Focus moves to each enabled button
- Focus indicator (3px outline) is clearly visible
- Disabled buttons are skipped
- Focus order is logical (top to bottom, left to right)

#### Test 2: Enter Key Activation
1. Tab to a button
2. Press `Enter` key

**Expected Results**:
- Button action is triggered
- Same behavior as clicking with mouse

#### Test 3: Space Key Activation
1. Tab to a button
2. Press `Space` key

**Expected Results**:
- Button action is triggered
- Same behavior as clicking with mouse

#### Test 4: Disabled Button Protection
1. Tab to a disabled button (if visible in tab order, this is a bug)
2. Try pressing `Enter` or `Space`

**Expected Results**:
- Disabled buttons should be skipped in tab order
- If focused, they should not respond to keyboard activation

---

## 2. Screen Reader Testing

### Tools
- **Windows**: NVDA (free) or JAWS (paid)
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca (free)

### NVDA Setup (Windows)
1. Download from https://www.nvaccess.org/
2. Install and launch NVDA
3. Press `Insert + N` to open NVDA menu
4. Navigate to Preferences > Settings > Speech
5. Ensure speech rate is comfortable

### VoiceOver Setup (macOS)
1. Press `Cmd + F5` to enable VoiceOver
2. Press `Cmd + Option + F8` to open VoiceOver Utility
3. Adjust speech rate in Speech settings

### Test Steps

#### Test 1: Button Label Announcement
1. Enable screen reader
2. Navigate to a page with buttons
3. Tab through buttons

**Expected Announcements**:
- "Create New Resource, button"
- "Edit, button"
- "Delete, button"
- "Save, button"

#### Test 2: Button Type Identification
1. Tab to a primary button
2. Listen to announcement

**Expected**:
- Button should be announced with its label
- Visual styling (primary, danger) may not be announced, but label should be clear

#### Test 3: Disabled State Announcement
1. Tab to or navigate to a disabled button
2. Listen to announcement

**Expected**:
- "Disabled Button, button, unavailable" or similar
- Screen reader should indicate the button cannot be activated

#### Test 4: Button Activation
1. Tab to a button
2. Press `Enter` or `Space`
3. Listen for feedback

**Expected**:
- Action should occur
- Screen reader may announce result (e.g., "Dialog opened")

---

## 3. Color Blindness Simulation

### Chrome DevTools Method
1. Open Chrome DevTools (`F12`)
2. Press `Cmd/Ctrl + Shift + P` to open command palette
3. Type "Render" and select "Show Rendering"
4. Scroll to "Emulate vision deficiencies"
5. Test each deficiency type

### Test Each Deficiency Type

#### Protanopia (Red-Blind)
1. Select "Protanopia" from dropdown
2. Navigate to pages with buttons
3. Verify buttons are distinguishable

**Check**:
- Primary buttons vs. secondary buttons
- Danger buttons (red) are identifiable without color
- Border width and font weight provide distinction

#### Deuteranopia (Green-Blind)
1. Select "Deuteranopia" from dropdown
2. Navigate to pages with buttons
3. Verify buttons are distinguishable

**Check**:
- All button types remain distinguishable
- Frankenstein theme (green-based) remains usable

#### Tritanopia (Blue-Blind)
1. Select "Tritanopia" from dropdown
2. Navigate to pages with buttons
3. Verify buttons are distinguishable

**Check**:
- Primary buttons (blue in light theme) are identifiable
- All button types remain distinguishable

#### Achromatopsia (No Color)
1. Select "Achromatopsia" from dropdown
2. Navigate to pages with buttons
3. Verify buttons are distinguishable

**Check**:
- Buttons are distinguishable by shape, size, and position
- Border width (2px) provides visual distinction
- Font weight (600) improves readability

---

## 4. Lighthouse Accessibility Audit

### Setup
1. Open Chrome DevTools (`F12`)
2. Click "Lighthouse" tab
3. If not visible, click the `>>` icon and select Lighthouse

### Test Steps
1. Select "Accessibility" category only (uncheck others for faster results)
2. Select "Desktop" or "Mobile" device
3. Click "Analyze page load"
4. Wait for audit to complete

### Review Results

#### Score Interpretation
- **90-100**: Excellent - No major issues
- **50-89**: Needs improvement - Address reported issues
- **0-49**: Poor - Significant accessibility problems

#### Common Issues to Check
- Color contrast failures
- Missing ARIA attributes
- Keyboard navigation problems
- Missing alt text on images
- Form label issues

#### Expected Results for Buttons
- ✅ All buttons have accessible names
- ✅ All buttons have sufficient color contrast
- ✅ All buttons are keyboard accessible
- ✅ Focus indicators are visible

---

## 5. axe DevTools Scan

### Setup
1. Install axe DevTools browser extension:
   - Chrome: https://chrome.google.com/webstore (search "axe DevTools")
   - Firefox: https://addons.mozilla.org/firefox/ (search "axe DevTools")
2. Restart browser after installation

### Test Steps
1. Navigate to a page with buttons
2. Open browser DevTools (`F12`)
3. Click "axe DevTools" tab
4. Click "Scan ALL of my page"
5. Wait for scan to complete

### Review Results

#### Issue Severity Levels
- **Critical**: Must fix - Blocks users
- **Serious**: Should fix - Major barrier
- **Moderate**: Should fix - Noticeable barrier
- **Minor**: Consider fixing - Small barrier

#### Expected Results for Buttons
- ✅ No critical or serious issues
- ✅ All buttons pass color contrast checks
- ✅ All buttons have accessible names
- ✅ No keyboard trap issues
- ✅ Focus indicators are visible

#### Common Button Issues
- Insufficient color contrast
- Missing accessible names
- Incorrect ARIA attributes
- Keyboard navigation problems

---

## 6. Focus Indicator Verification

### Visual Test
1. Navigate to a page with buttons
2. Press `Tab` to focus each button
3. Observe the focus indicator

**Expected**:
- 3px outline visible around focused button
- Outline color contrasts with button background
- Outline visible in all themes (light, dark, Frankenstein)
- Outline does not obscure button text

### Measurement Test (Optional)
1. Focus a button
2. Open browser DevTools
3. Inspect the focused button
4. Check computed styles for `outline` property

**Expected**:
- `outline-width: 3px`
- `outline-style: solid`
- `outline-color: <theme-specific color>`
- `outline-offset: 2px`

---

## 7. Theme-Specific Testing

### Test Each Theme

#### Light Theme
1. Ensure light theme is active
2. Run all tests above
3. Verify button contrast and visibility

**Check**:
- Primary buttons: Dark blue background, white text
- Danger buttons: Dark red background, white text
- Outline buttons: Dark border, dark text
- Disabled buttons: Light gray background, medium gray text

#### Dark Theme
1. Switch to dark theme
2. Run all tests above
3. Verify button contrast and visibility

**Check**:
- Primary buttons: Light blue background, dark text
- Danger buttons: Light red background, dark text
- Outline buttons: Light border, light text
- Disabled buttons: Dark gray background, light gray text

#### Frankenstein Theme
1. Switch to Frankenstein theme
2. Run all tests above
3. Verify button contrast and visibility

**Check**:
- Primary buttons: Light green background, dark text
- Danger buttons: Bright red background, white text
- Outline buttons: Green border, light text
- Disabled buttons: Dark green-gray background, medium green text
- Stitching and bolt decorations remain visible

---

## 8. Cross-Browser Testing

### Browsers to Test
- Chrome/Chromium
- Firefox
- Safari (macOS)
- Edge

### Test Steps for Each Browser
1. Open application in browser
2. Navigate to pages with buttons
3. Test keyboard navigation (Tab, Enter, Space)
4. Verify focus indicators are visible
5. Check button contrast and readability

**Expected**:
- Consistent behavior across all browsers
- Focus indicators visible in all browsers
- Button styling consistent across browsers

---

## 9. Responsive Design Testing

### Test Different Screen Sizes
1. Open browser DevTools
2. Toggle device toolbar (`Cmd/Ctrl + Shift + M`)
3. Test different device sizes:
   - Mobile (375px width)
   - Tablet (768px width)
   - Desktop (1920px width)

**Check**:
- Buttons remain accessible at all sizes
- Focus indicators remain visible
- Button text remains readable
- Touch targets are at least 44x44px on mobile

---

## 10. Real Device Testing

### Mobile Devices
1. Open application on mobile device
2. Test touch interactions
3. Test with device screen reader:
   - iOS: VoiceOver (Settings > Accessibility > VoiceOver)
   - Android: TalkBack (Settings > Accessibility > TalkBack)

**Check**:
- Buttons are large enough to tap (44x44px minimum)
- Buttons respond to touch
- Screen reader announces buttons correctly
- Focus indicators visible when using external keyboard

---

## Common Issues and Solutions

### Issue: Focus indicator not visible
**Solution**: Check CSS for `outline: none` or `outline: 0` - remove these

### Issue: Button not keyboard accessible
**Solution**: Ensure button uses `<button>` element, not `<div>` with click handler

### Issue: Screen reader not announcing button
**Solution**: Ensure button has text content or `aria-label` attribute

### Issue: Disabled button still focusable
**Solution**: Ensure `disabled` attribute is set, not just `aria-disabled`

### Issue: Color contrast too low
**Solution**: Use darker text on light backgrounds, lighter text on dark backgrounds

---

## Checklist

Use this checklist for each page with buttons:

- [ ] All buttons focusable with Tab key
- [ ] Focus indicators visible (3px outline)
- [ ] Buttons activate with Enter key
- [ ] Buttons activate with Space key
- [ ] Disabled buttons skip in tab order
- [ ] Screen reader announces button labels
- [ ] Screen reader announces disabled state
- [ ] Buttons distinguishable in color blind modes
- [ ] Lighthouse accessibility score 90+
- [ ] axe DevTools scan shows no critical issues
- [ ] Buttons work in all three themes
- [ ] Buttons work in all tested browsers
- [ ] Touch targets adequate on mobile (44x44px)

---

## Resources

### Tools
- **NVDA**: https://www.nvaccess.org/
- **JAWS**: https://www.freedomscientific.com/products/software/jaws/
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **Color Oracle**: https://colororacle.org/
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/

### Guidelines
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM**: https://webaim.org/
- **A11y Project**: https://www.a11yproject.com/

### Testing
- **Lighthouse**: Built into Chrome DevTools
- **Chrome DevTools Accessibility**: https://developer.chrome.com/docs/devtools/accessibility/

---

**Document Version**: 1.0  
**Last Updated**: November 11, 2025  
**Maintained By**: IDP UI Development Team
