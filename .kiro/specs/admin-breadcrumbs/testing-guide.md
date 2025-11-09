# Breadcrumb Testing Guide

## Quick Start

This guide provides step-by-step instructions for manually testing the breadcrumb navigation implementation.

## Prerequisites

1. **Start the application:**
   ```bash
   # Terminal 1: Start backend (from idp-api directory)
   cd idp-api
   docker compose up -d
   ./mvnw quarkus:dev

   # Terminal 2: Start frontend (from idp-ui directory)
   cd idp-ui
   npm run dev
   ```

2. **Access the application:**
   - Open browser to: `https://localhost:8443/ui/`
   - Log in if authentication is required
   - Navigate to Admin Dashboard

## Test Scenarios

### Scenario 1: Cloud Provider Management

**Steps:**
1. From Admin Dashboard, click "Manage" button on Cloud Providers card
2. Observe the breadcrumb at the top of the page

**Expected Results:**
- ✅ Breadcrumb displays: "Admin Dashboard / Cloud Provider Management"
- ✅ "Admin Dashboard" is a blue clickable link
- ✅ "Cloud Provider Management" is gray non-clickable text
- ✅ Separator "/" appears between items

**Navigation Test:**
3. Click "Admin Dashboard" link in breadcrumb

**Expected Results:**
- ✅ Returns to Admin Dashboard page
- ✅ No console errors
- ✅ Navigation is immediate

---

### Scenario 2: Resource Type Management

**Steps:**
1. From Admin Dashboard, click "Manage" button on Resource Types card
2. Observe the breadcrumb at the top of the page

**Expected Results:**
- ✅ Breadcrumb displays: "Admin Dashboard / Resource Type Management"
- ✅ "Admin Dashboard" is a blue clickable link
- ✅ "Resource Type Management" is gray non-clickable text
- ✅ Separator "/" appears between items

**Navigation Test:**
3. Click "Admin Dashboard" link in breadcrumb

**Expected Results:**
- ✅ Returns to Admin Dashboard page
- ✅ No console errors
- ✅ Navigation is immediate

---

### Scenario 3: Resource Type Mapping Management

**Steps:**
1. From Admin Dashboard, click "Manage" button on Resource Type Mappings card
2. Observe the breadcrumb at the top of the page

**Expected Results:**
- ✅ Breadcrumb displays: "Admin Dashboard / Resource Type Mapping Management"
- ✅ "Admin Dashboard" is a blue clickable link
- ✅ "Resource Type Mapping Management" is gray non-clickable text
- ✅ Separator "/" appears between items

**Navigation Test:**
3. Click "Admin Dashboard" link in breadcrumb

**Expected Results:**
- ✅ Returns to Admin Dashboard page
- ✅ No console errors
- ✅ Navigation is immediate

---

### Scenario 4: Property Schema Editor (From Dashboard)

**Steps:**
1. From Admin Dashboard, locate "Incomplete Mappings" section
2. Click "Add Properties" button on any incomplete mapping
3. Observe the breadcrumb at the top of the page

**Expected Results:**
- ✅ Breadcrumb displays: "Admin Dashboard / Property Schema Editor"
- ✅ "Admin Dashboard" is a blue clickable link
- ✅ "Property Schema Editor" is gray non-clickable text

**Navigation Test:**
4. Click "Admin Dashboard" link in breadcrumb

**Expected Results:**
- ✅ Returns to Admin Dashboard page
- ✅ No console errors

---

### Scenario 5: Property Schema Editor (From Mappings)

**Steps:**
1. Navigate to Resource Type Mapping Management
2. Click "Configure Properties" button on any mapping cell
3. Observe the breadcrumb at the top of the page

**Expected Results:**
- ✅ Breadcrumb displays: "Admin Dashboard / Resource Type Mappings / Property Schema Editor"
- ✅ "Admin Dashboard" is a blue clickable link
- ✅ "Resource Type Mappings" is a blue clickable link
- ✅ "Property Schema Editor" is gray non-clickable text

**Navigation Test:**
4. Click "Resource Type Mappings" link in breadcrumb

**Expected Results:**
- ✅ Returns to Resource Type Mapping Management page
- ✅ No console errors

5. Navigate back to Property Schema Editor
6. Click "Admin Dashboard" link in breadcrumb

**Expected Results:**
- ✅ Returns to Admin Dashboard page
- ✅ No console errors

---

## Visual Consistency Tests

### Test 1: Compare Breadcrumb Styling

**Steps:**
1. Visit each of the following pages in sequence:
   - Cloud Provider Management
   - Resource Type Management
   - Resource Type Mapping Management
   - Property Schema Editor

2. For each page, observe:
   - Font size and weight
   - Link color
   - Separator style
   - Spacing and alignment
   - Position relative to page header

**Expected Results:**
- ✅ All breadcrumbs have identical styling
- ✅ All breadcrumbs are positioned the same way
- ✅ All breadcrumbs have the same spacing
- ✅ No visual inconsistencies

---

### Test 2: Hover Effects

**Steps:**
1. On any admin page with breadcrumbs, hover over "Admin Dashboard" link

**Expected Results:**
- ✅ Cursor changes to pointer
- ✅ Link gets underlined
- ✅ Link color changes to darker blue (#0052a3)

2. Hover over the current page name (last item)

**Expected Results:**
- ✅ Cursor remains default (not pointer)
- ✅ No underline appears
- ✅ No color change

---

## Theme Testing

### Test 1: Light Theme

**Steps:**
1. Ensure application is in light theme (check theme toggle)
2. Visit each admin management page
3. Observe breadcrumb colors

**Expected Results:**
- ✅ Links are blue (#0066cc)
- ✅ Link hover is darker blue (#0052a3)
- ✅ Separator is gray (#666)
- ✅ Current page is dark gray (#333)
- ✅ Good contrast and readability

---

### Test 2: Dark Theme

**Steps:**
1. Click theme toggle to switch to dark theme
2. Visit each admin management page
3. Observe breadcrumb colors

**Expected Results:**
- ✅ Links are light blue (#4da6ff)
- ✅ Link hover is lighter blue (#66b3ff)
- ✅ Separator is light gray (#999)
- ✅ Current page is light gray (#e0e0e0)
- ✅ Good contrast and readability

---

### Test 3: Theme Switching

**Steps:**
1. Navigate to Cloud Provider Management
2. Toggle theme from light to dark
3. Observe breadcrumb appearance
4. Toggle theme from dark to light
5. Observe breadcrumb appearance

**Expected Results:**
- ✅ Breadcrumb colors update immediately
- ✅ No visual glitches during transition
- ✅ All colors match the active theme

---

## Keyboard Navigation Tests

### Test 1: Tab Navigation

**Steps:**
1. Navigate to any admin management page
2. Press Tab key repeatedly
3. Observe focus indicator

**Expected Results:**
- ✅ Breadcrumb link receives focus
- ✅ Focus indicator is visible
- ✅ Tab order is logical (left to right)

---

### Test 2: Enter Key Activation

**Steps:**
1. Navigate to any admin management page
2. Tab to breadcrumb link
3. Press Enter key

**Expected Results:**
- ✅ Navigation occurs
- ✅ Returns to Admin Dashboard
- ✅ No errors

---

## Accessibility Tests

### Test 1: ARIA Attributes

**Steps:**
1. Open browser DevTools
2. Navigate to any admin management page
3. Inspect breadcrumb element

**Expected Results:**
- ✅ `<nav>` element has `aria-label="Breadcrumb"`
- ✅ Current page has `aria-current="page"`
- ✅ Separator has `aria-hidden="true"`

---

### Test 2: Screen Reader (Optional)

**Steps:**
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate to any admin management page
3. Navigate to breadcrumb

**Expected Results:**
- ✅ Screen reader announces "Breadcrumb navigation"
- ✅ Screen reader reads link text correctly
- ✅ Screen reader indicates current page

---

## Edge Case Tests

### Test 1: Rapid Clicking

**Steps:**
1. Navigate to any admin management page
2. Rapidly click "Admin Dashboard" breadcrumb link multiple times

**Expected Results:**
- ✅ No duplicate navigation
- ✅ No console errors
- ✅ Application remains stable

---

### Test 2: Browser Back Button

**Steps:**
1. Navigate: Dashboard → Cloud Providers → Dashboard (via breadcrumb)
2. Click browser back button
3. Observe current page

**Expected Results:**
- ✅ Returns to Cloud Provider Management
- ✅ Breadcrumb displays correctly
- ✅ No navigation errors

---

### Test 3: Direct URL Access

**Steps:**
1. Directly navigate to: `https://localhost:8443/ui/admin/cloud-providers`
2. Observe breadcrumb

**Expected Results:**
- ✅ Breadcrumb displays correctly
- ✅ "Admin Dashboard" link works
- ✅ No errors

---

## Browser Compatibility Tests

### Test in Multiple Browsers

**Browsers to Test:**
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

**For Each Browser:**
1. Navigate to each admin management page
2. Verify breadcrumb appearance
3. Test breadcrumb navigation
4. Test hover effects
5. Test both themes

**Expected Results:**
- ✅ Consistent appearance across browsers
- ✅ Consistent behavior across browsers
- ✅ No browser-specific issues

---

## Responsive Design Tests

### Test 1: Narrow Screen

**Steps:**
1. Resize browser window to 768px width
2. Navigate to each admin management page
3. Observe breadcrumb layout

**Expected Results:**
- ✅ Breadcrumb remains visible
- ✅ Text wraps if necessary
- ✅ No horizontal scrolling
- ✅ Layout remains usable

---

### Test 2: Very Narrow Screen

**Steps:**
1. Resize browser window to 375px width (mobile)
2. Navigate to each admin management page
3. Observe breadcrumb layout

**Expected Results:**
- ✅ Breadcrumb remains visible
- ✅ Text wraps appropriately
- ✅ Touch targets are adequate
- ✅ Layout remains usable

---

## Console Error Check

**Throughout All Tests:**

**Expected Results:**
- ✅ No console errors
- ✅ No console warnings
- ✅ No network errors
- ✅ No React warnings

---

## Test Results Template

```
Test Date: _______________
Tester: _______________
Browser: _______________
OS: _______________

Scenario 1 (Cloud Providers):        [ ] Pass  [ ] Fail
Scenario 2 (Resource Types):         [ ] Pass  [ ] Fail
Scenario 3 (Mappings):                [ ] Pass  [ ] Fail
Scenario 4 (Property Editor - Dash):  [ ] Pass  [ ] Fail
Scenario 5 (Property Editor - Map):   [ ] Pass  [ ] Fail

Visual Consistency:                   [ ] Pass  [ ] Fail
Hover Effects:                        [ ] Pass  [ ] Fail
Light Theme:                          [ ] Pass  [ ] Fail
Dark Theme:                           [ ] Pass  [ ] Fail
Theme Switching:                      [ ] Pass  [ ] Fail
Keyboard Navigation:                  [ ] Pass  [ ] Fail
Accessibility:                        [ ] Pass  [ ] Fail
Edge Cases:                           [ ] Pass  [ ] Fail
Browser Compatibility:                [ ] Pass  [ ] Fail
Responsive Design:                    [ ] Pass  [ ] Fail

Console Errors:                       [ ] None  [ ] Found

Overall Status:                       [ ] Pass  [ ] Fail

Notes:
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## Quick Smoke Test (5 minutes)

If time is limited, perform this abbreviated test:

1. ✅ Navigate to Cloud Provider Management
2. ✅ Verify breadcrumb displays correctly
3. ✅ Click "Admin Dashboard" link
4. ✅ Navigate to Resource Type Management
5. ✅ Verify breadcrumb displays correctly
6. ✅ Click "Admin Dashboard" link
7. ✅ Toggle theme
8. ✅ Verify breadcrumb colors change
9. ✅ Check console for errors

**If all pass:** Implementation is likely correct
**If any fail:** Perform full test suite

---

## Reporting Issues

If you find any issues during testing:

1. **Document the issue:**
   - What page were you on?
   - What action did you perform?
   - What was the expected result?
   - What actually happened?
   - Browser and OS information
   - Screenshot if applicable

2. **Check console:**
   - Any errors or warnings?
   - Copy full error messages

3. **Reproduce:**
   - Can you reproduce the issue?
   - Does it happen consistently?

4. **Report:**
   - Create a bug report with all information
   - Include steps to reproduce
   - Assign appropriate priority

---

## Success Criteria

The implementation is considered successful when:

- ✅ All navigation scenarios work correctly
- ✅ Visual consistency is maintained across all pages
- ✅ Both themes display correctly
- ✅ Keyboard navigation works
- ✅ No console errors
- ✅ Accessibility requirements are met
- ✅ Works in all target browsers

---

**Happy Testing!** 🎉
