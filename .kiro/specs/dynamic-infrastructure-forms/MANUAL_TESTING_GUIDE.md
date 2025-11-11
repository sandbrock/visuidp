# Manual Testing Guide: Dynamic Infrastructure Forms

## Overview

This guide provides a comprehensive manual testing checklist for the Dynamic Infrastructure Forms feature. Follow each section to verify all functionality works as expected.

## Prerequisites

Before starting manual testing:

1. **Backend Setup**:
   - Ensure `idp-api` is running (`./mvnw quarkus:dev`)
   - Database is populated with test data (resource types, cloud providers, property schemas)
   - API is accessible at `http://localhost:8082`

2. **Frontend Setup**:
   - Ensure `idp-ui` is running (`npm run dev`)
   - Application is accessible at `http://localhost:8083`
   - Browser DevTools open for console monitoring

3. **Test Data Requirements**:
   - At least 2-3 resource types configured (e.g., Storage, Database, Container Orchestrator)
   - At least 2-3 cloud providers configured (e.g., AWS, Azure, GCP)
   - Property schemas configured for various combinations with different data types

## Testing Checklist

### 1. Property Data Types Testing

#### 1.1 STRING Properties
- [ ] Navigate to Infrastructure page
- [ ] Create new Blueprint resource
- [ ] Select resource type and cloud provider with STRING properties
- [ ] Verify STRING input renders as text box (AngryTextBox)
- [ ] Enter valid string value
- [ ] Verify value is saved correctly
- [ ] Test with empty string (if not required)
- [ ] Test with special characters (e.g., `@#$%^&*()`)
- [ ] Test with very long strings (>100 characters)

**Expected**: STRING properties display as text inputs, accept any text, and save correctly.

#### 1.2 NUMBER Properties
- [ ] Select resource type with NUMBER properties
- [ ] Verify NUMBER input renders as numeric text box
- [ ] Try entering letters - should be prevented
- [ ] Enter valid integer (e.g., `42`)
- [ ] Enter valid decimal (e.g., `3.14`)
- [ ] Enter negative number (if allowed)
- [ ] Test min/max validation (if configured)
- [ ] Verify validation error displays for out-of-range values

**Expected**: NUMBER properties only accept numeric input, validate ranges, and display errors for invalid values.

#### 1.3 BOOLEAN Properties
- [ ] Select resource type with BOOLEAN properties
- [ ] Verify BOOLEAN input renders as checkbox
- [ ] Check the checkbox (set to true)
- [ ] Uncheck the checkbox (set to false)
- [ ] Verify label displays next to checkbox
- [ ] Save and verify value persists correctly
- [ ] Test default value (if configured)

**Expected**: BOOLEAN properties display as checkboxes, toggle correctly, and save true/false values.

#### 1.4 LIST Properties (with allowed values)
- [ ] Select resource type with LIST properties (with allowedValues)
- [ ] Verify LIST input renders as dropdown (AngryComboBox)
- [ ] Open dropdown and verify all allowed values are present
- [ ] Select a value from dropdown
- [ ] Verify selected value displays correctly
- [ ] Save and verify value persists
- [ ] Test default value (if configured)

**Expected**: LIST properties with allowed values display as dropdowns with predefined options.

#### 1.5 LIST Properties (without allowed values)
- [ ] Select resource type with LIST properties (no allowedValues)
- [ ] Verify LIST input renders as text box
- [ ] Enter comma-separated values
- [ ] Save and verify values persist

**Expected**: LIST properties without allowed values display as text inputs.

### 2. Validation Testing

#### 2.1 Required Fields
- [ ] Select resource type with required properties
- [ ] Verify asterisk (*) displays next to required field labels
- [ ] Leave required field empty
- [ ] Attempt to save form
- [ ] Verify validation error displays: "{displayName} is required"
- [ ] Verify error styling (red border, error text)
- [ ] Fill in required field
- [ ] Verify error clears automatically
- [ ] Save successfully

**Expected**: Required fields show asterisk, prevent submission when empty, and display clear error messages.

#### 2.2 Min/Max Validation (NUMBER)
- [ ] Select resource type with NUMBER property having min/max rules
- [ ] Enter value below minimum
- [ ] Verify error: "{displayName} must be between {min} and {max}"
- [ ] Enter value above maximum
- [ ] Verify same error displays
- [ ] Enter value within range
- [ ] Verify error clears
- [ ] Save successfully

**Expected**: Min/max validation works correctly and displays appropriate error messages.

#### 2.3 Pattern Validation (STRING)
- [ ] Select resource type with STRING property having pattern rule
- [ ] Enter invalid format (e.g., invalid email if pattern is email)
- [ ] Verify error: "{displayName} format is invalid"
- [ ] Enter valid format
- [ ] Verify error clears
- [ ] Save successfully

**Expected**: Pattern validation enforces format rules and displays clear error messages.

#### 2.4 Allowed Values Validation (LIST)
- [ ] Select resource type with LIST property (dropdown)
- [ ] Select valid value from dropdown
- [ ] Verify no validation error
- [ ] Save successfully

**Expected**: Dropdown selections are always valid (no manual entry allowed).

### 3. Theme Testing

#### 3.1 Light Theme
- [ ] Ensure application is in light theme
- [ ] Navigate to Infrastructure page with dynamic form
- [ ] Verify form background matches light theme
- [ ] Verify input controls use light theme colors
- [ ] Verify labels are readable (dark text on light background)
- [ ] Verify help text is visible and styled correctly
- [ ] Verify validation errors are visible (red text)
- [ ] Verify borders and spacing match existing forms

**Expected**: All form elements match light theme styling consistently.

#### 3.2 Dark Theme
- [ ] Toggle to dark theme using theme switcher
- [ ] Verify form background updates to dark theme
- [ ] Verify input controls use dark theme colors
- [ ] Verify labels are readable (light text on dark background)
- [ ] Verify help text is visible in dark theme
- [ ] Verify validation errors are visible (red text with good contrast)
- [ ] Verify borders and spacing remain consistent

**Expected**: All form elements match dark theme styling consistently.

#### 3.3 Theme Switching
- [ ] Start in light theme with form open
- [ ] Toggle to dark theme
- [ ] Verify smooth transition (no flashing)
- [ ] Toggle back to light theme
- [ ] Verify form returns to light styling
- [ ] Repeat toggle 3-4 times rapidly
- [ ] Verify no visual glitches or errors

**Expected**: Theme switching works smoothly without visual issues.

### 4. Loading States Testing

#### 4.1 Initial Load
- [ ] Clear browser cache
- [ ] Navigate to Infrastructure page
- [ ] Create new Blueprint resource
- [ ] Select resource type and cloud provider
- [ ] Observe loading indicator while schema fetches
- [ ] Verify loading message displays: "Loading properties..."
- [ ] Verify form appears after loading completes
- [ ] Check browser console for errors (should be none)

**Expected**: Loading indicator displays during schema fetch, then form renders.

#### 4.2 Schema Caching
- [ ] With form loaded, navigate away from Infrastructure page
- [ ] Navigate back to Infrastructure page
- [ ] Create another resource with same type/provider
- [ ] Observe that form loads instantly (from cache)
- [ ] Verify no loading indicator (cached)
- [ ] Check Network tab - no API call made

**Expected**: Second load uses cache and displays instantly without API call.

#### 4.3 Different Resource Type/Provider
- [ ] With form loaded, change resource type
- [ ] Observe loading indicator for new schema
- [ ] Verify new properties display
- [ ] Change cloud provider
- [ ] Observe loading indicator again
- [ ] Verify properties update for new provider

**Expected**: Changing type/provider triggers new schema fetch and displays loading state.

### 5. Error States Testing

#### 5.1 API Error Handling
- [ ] Stop the backend API (`idp-api`)
- [ ] Navigate to Infrastructure page
- [ ] Create new Blueprint resource
- [ ] Select resource type and cloud provider
- [ ] Observe error message displays
- [ ] Verify error text: "Unable to load property configuration. Please try again."
- [ ] Verify retry button is present
- [ ] Start backend API
- [ ] Click retry button
- [ ] Verify form loads successfully

**Expected**: API errors display clear message with retry option.

#### 5.2 Network Timeout
- [ ] Use browser DevTools to throttle network (Slow 3G)
- [ ] Navigate to Infrastructure page
- [ ] Create new Blueprint resource
- [ ] Select resource type and cloud provider
- [ ] Observe loading state persists longer
- [ ] Wait for timeout or success
- [ ] Verify appropriate handling (loading or error)

**Expected**: Slow network shows loading state, eventually succeeds or shows error.

### 6. Empty State Testing

#### 6.1 No Schema Defined
- [ ] Configure resource type/cloud provider with NO property schemas
- [ ] Navigate to Infrastructure page
- [ ] Create new Blueprint resource
- [ ] Select the resource type/provider with no schema
- [ ] Verify message displays: "No cloud-specific properties are configured..."
- [ ] Verify guidance text: "Contact your administrator..."
- [ ] Verify form can still be saved (no properties required)
- [ ] Save resource successfully

**Expected**: Clear message when no properties defined, form still functional.

#### 6.2 Empty Schema (Zero Properties)
- [ ] Configure resource type/cloud provider with schema but zero properties
- [ ] Navigate to Infrastructure page
- [ ] Create new Blueprint resource
- [ ] Select the resource type/provider
- [ ] Verify same empty state message displays
- [ ] Save resource successfully

**Expected**: Same behavior as no schema defined.

### 7. Default Values Testing

#### 7.1 Creating New Resource
- [ ] Select resource type with properties having default values
- [ ] Verify default values are pre-populated in form
- [ ] Verify for STRING, NUMBER, BOOLEAN, and LIST types
- [ ] Modify a default value
- [ ] Save resource
- [ ] Verify modified value is saved (not default)

**Expected**: Default values pre-populate when creating new resources.

#### 7.2 Editing Existing Resource
- [ ] Create and save a resource with custom values
- [ ] Edit the same resource
- [ ] Verify existing values display (not defaults)
- [ ] Verify no default values override existing values
- [ ] Save without changes
- [ ] Verify values remain unchanged

**Expected**: Editing existing resources shows current values, not defaults.

### 8. Help Text Testing

#### 8.1 Single-Line Help Text
- [ ] Select resource type with properties having short descriptions
- [ ] Verify help text displays below input control
- [ ] Verify help text is styled differently (smaller, lighter)
- [ ] Verify help text doesn't interfere with input
- [ ] Verify help text is readable in both themes

**Expected**: Help text displays clearly below inputs without interference.

#### 8.2 Multi-Line Help Text
- [ ] Select resource type with properties having long descriptions
- [ ] Verify multi-line help text displays correctly
- [ ] Verify text wraps appropriately
- [ ] Verify spacing is consistent
- [ ] Verify readability in both themes

**Expected**: Long help text wraps and displays clearly.

#### 8.3 No Help Text
- [ ] Select resource type with properties having no description
- [ ] Verify no help text section displays
- [ ] Verify spacing remains consistent
- [ ] Verify form looks clean without help text

**Expected**: Properties without descriptions don't show empty help text areas.

### 9. Property Ordering Testing

#### 9.1 Display Order
- [ ] Configure properties with specific displayOrder values (1, 2, 3, etc.)
- [ ] Navigate to Infrastructure page
- [ ] Create new Blueprint resource
- [ ] Select resource type/provider
- [ ] Verify properties display in correct order (by displayOrder)
- [ ] Verify order is consistent across page refreshes

**Expected**: Properties display in order specified by displayOrder field.

#### 9.2 Missing Display Order
- [ ] Configure properties with some having displayOrder, some without
- [ ] Verify properties with displayOrder appear first
- [ ] Verify properties without displayOrder appear after (in any order)

**Expected**: Properties with displayOrder are prioritized, others follow.

### 10. Integration Testing

#### 10.1 Blueprint Resource Creation
- [ ] Navigate to Infrastructure page
- [ ] Create new Blueprint
- [ ] Add resource with dynamic properties
- [ ] Fill in all required properties
- [ ] Save Blueprint
- [ ] Verify Blueprint saves successfully
- [ ] Verify resource appears in resource list
- [ ] Verify cloud-specific properties are saved

**Expected**: Complete Blueprint creation workflow works end-to-end.

#### 10.2 Blueprint Resource Editing
- [ ] Open existing Blueprint with resources
- [ ] Edit a resource with dynamic properties
- [ ] Modify property values
- [ ] Save changes
- [ ] Verify changes persist
- [ ] Reload page and verify changes still present

**Expected**: Editing existing resources works correctly.

#### 10.3 Stack Resource Creation
- [ ] Navigate to Stack creation/editing
- [ ] Add resource with dynamic properties
- [ ] Fill in properties
- [ ] Save Stack
- [ ] Verify Stack saves successfully
- [ ] Verify resource properties are saved

**Expected**: Dynamic forms work in Stack context as well as Blueprint context.

#### 10.4 Switching Cloud Providers
- [ ] Create resource with AWS selected
- [ ] Fill in AWS-specific properties
- [ ] Change cloud provider to Azure
- [ ] Verify form updates with Azure properties
- [ ] Verify previous AWS values are cleared
- [ ] Fill in Azure properties
- [ ] Save successfully

**Expected**: Switching providers updates form and clears previous values.

#### 10.5 Switching Resource Types
- [ ] Create resource with Storage type selected
- [ ] Fill in Storage properties
- [ ] Change resource type to Database
- [ ] Verify form updates with Database properties
- [ ] Verify previous Storage values are cleared
- [ ] Fill in Database properties
- [ ] Save successfully

**Expected**: Switching resource types updates form and clears previous values.

### 11. Performance Testing

#### 11.1 Schema Caching Performance
- [ ] Open browser DevTools Network tab
- [ ] Navigate to Infrastructure page
- [ ] Create first resource (observe API call)
- [ ] Note response time
- [ ] Create second resource with same type/provider
- [ ] Verify no API call (cached)
- [ ] Verify instant form display

**Expected**: Caching eliminates redundant API calls and improves performance.

#### 11.2 Rendering Performance
- [ ] Select resource type with 10+ properties
- [ ] Observe form rendering time
- [ ] Verify form renders in < 1 second
- [ ] Interact with inputs (type, select, check)
- [ ] Verify no lag or delay in interactions
- [ ] Check browser console for performance warnings

**Expected**: Forms with many properties render quickly and respond smoothly.

#### 11.3 Large Property Values
- [ ] Enter very long string (1000+ characters) in STRING property
- [ ] Verify input handles large value
- [ ] Save form
- [ ] Verify save completes successfully
- [ ] Reload and verify large value displays correctly

**Expected**: Large property values are handled without performance issues.

### 12. Responsive Design Testing

#### 12.1 Desktop (1920x1080)
- [ ] Set browser to full screen desktop size
- [ ] Navigate to Infrastructure page with dynamic form
- [ ] Verify form layout is clean and spacious
- [ ] Verify labels and inputs are properly aligned
- [ ] Verify help text is readable
- [ ] Verify no horizontal scrolling needed

**Expected**: Form looks professional and spacious on desktop.

#### 12.2 Laptop (1366x768)
- [ ] Resize browser to laptop size
- [ ] Verify form remains usable
- [ ] Verify no layout breaking
- [ ] Verify inputs remain accessible
- [ ] Verify scrolling works if needed

**Expected**: Form adapts to laptop screen size.

#### 12.3 Tablet (768x1024)
- [ ] Resize browser to tablet size
- [ ] Verify form layout adjusts
- [ ] Verify inputs are touch-friendly
- [ ] Verify labels don't overlap inputs
- [ ] Verify dropdowns work on touch

**Expected**: Form is usable on tablet-sized screens.

#### 12.4 Mobile (375x667)
- [ ] Resize browser to mobile size
- [ ] Verify form stacks vertically
- [ ] Verify inputs are full-width
- [ ] Verify text is readable
- [ ] Verify touch interactions work
- [ ] Verify no horizontal scrolling

**Expected**: Form adapts to mobile screens with vertical stacking.

### 13. Browser Compatibility Testing

#### 13.1 Chrome
- [ ] Test all above scenarios in Chrome
- [ ] Verify no console errors
- [ ] Verify all features work

**Expected**: Full functionality in Chrome.

#### 13.2 Firefox
- [ ] Test key scenarios in Firefox
- [ ] Verify styling is consistent
- [ ] Verify no console errors
- [ ] Verify all features work

**Expected**: Full functionality in Firefox.

#### 13.3 Safari (if available)
- [ ] Test key scenarios in Safari
- [ ] Verify styling is consistent
- [ ] Verify no console errors
- [ ] Verify all features work

**Expected**: Full functionality in Safari.

#### 13.4 Edge
- [ ] Test key scenarios in Edge
- [ ] Verify styling is consistent
- [ ] Verify no console errors
- [ ] Verify all features work

**Expected**: Full functionality in Edge.

### 14. Accessibility Testing

#### 14.1 Keyboard Navigation
- [ ] Navigate to form using only keyboard (Tab key)
- [ ] Verify all inputs are reachable via Tab
- [ ] Verify focus indicators are visible
- [ ] Verify Enter key submits form
- [ ] Verify Escape key closes modals (if any)

**Expected**: Full keyboard accessibility.

#### 14.2 Screen Reader (if available)
- [ ] Enable screen reader (NVDA, JAWS, VoiceOver)
- [ ] Navigate through form
- [ ] Verify labels are announced
- [ ] Verify help text is announced
- [ ] Verify validation errors are announced
- [ ] Verify required fields are indicated

**Expected**: Screen reader announces all relevant information.

#### 14.3 Color Contrast
- [ ] Use browser DevTools accessibility checker
- [ ] Verify all text meets WCAG AA contrast ratios
- [ ] Verify error messages have sufficient contrast
- [ ] Verify help text has sufficient contrast
- [ ] Test in both light and dark themes

**Expected**: All text meets accessibility contrast requirements.

### 15. Edge Cases Testing

#### 15.1 Rapid Property Changes
- [ ] Open form with multiple properties
- [ ] Rapidly change values in multiple inputs
- [ ] Verify all changes are captured
- [ ] Save form
- [ ] Verify all values saved correctly

**Expected**: Rapid changes are handled correctly.

#### 15.2 Special Characters in Values
- [ ] Enter special characters: `<script>alert('xss')</script>`
- [ ] Verify input is sanitized or escaped
- [ ] Save form
- [ ] Reload and verify no XSS vulnerability
- [ ] Verify value displays safely

**Expected**: Special characters are handled safely.

#### 15.3 Concurrent Editing
- [ ] Open same Blueprint in two browser tabs
- [ ] Edit resource in tab 1
- [ ] Edit same resource in tab 2
- [ ] Save in tab 1
- [ ] Save in tab 2
- [ ] Verify last save wins (or conflict handling)

**Expected**: Concurrent edits are handled gracefully.

#### 15.4 Browser Back Button
- [ ] Create resource with dynamic form
- [ ] Fill in properties
- [ ] Navigate to different page
- [ ] Click browser back button
- [ ] Verify form state is preserved (or cleared appropriately)

**Expected**: Browser navigation doesn't cause errors.

#### 15.5 Page Refresh During Edit
- [ ] Open resource for editing
- [ ] Modify property values
- [ ] Refresh page (F5)
- [ ] Verify unsaved changes are lost (expected)
- [ ] Verify form reloads correctly
- [ ] Verify no errors occur

**Expected**: Page refresh resets form without errors.

## Test Results Template

Use this template to document your testing results:

```markdown
## Test Session: [Date]
**Tester**: [Name]
**Browser**: [Browser Name & Version]
**Screen Size**: [Resolution]

### Results Summary
- Total Tests: [Number]
- Passed: [Number]
- Failed: [Number]
- Blocked: [Number]

### Failed Tests
1. [Test Name]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]
   - **Steps to Reproduce**: [Steps]
   - **Screenshots**: [Link or attachment]
   - **Priority**: [High/Medium/Low]

### Issues Found
1. [Issue Description]
   - **Severity**: [Critical/High/Medium/Low]
   - **Component**: [Component name]
   - **Recommendation**: [Suggested fix]

### Performance Notes
- Schema fetch time: [Time in ms]
- Form render time: [Time in ms]
- Cache effectiveness: [Observations]

### Browser Console Errors
- [List any console errors or warnings]

### Recommendations
- [List any improvements or refinements needed]
```

## Sign-Off Criteria

The feature is ready for production when:

- [ ] All test scenarios pass in primary browser (Chrome)
- [ ] All test scenarios pass in at least 2 other browsers
- [ ] No critical or high-severity bugs remain
- [ ] Performance meets acceptable thresholds (< 1s load time)
- [ ] Accessibility requirements are met
- [ ] Theme consistency is verified in both light and dark modes
- [ ] All validation scenarios work correctly
- [ ] Error handling is robust and user-friendly
- [ ] Documentation is complete and accurate

## Notes

- Focus on user experience and edge cases
- Document any unexpected behavior
- Take screenshots of visual issues
- Note any performance concerns
- Verify against all requirements in requirements.md
- Test with realistic data volumes
- Consider real-world usage patterns

---

**Last Updated**: [Date]
**Version**: 1.0
