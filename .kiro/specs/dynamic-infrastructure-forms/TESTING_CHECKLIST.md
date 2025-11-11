# Dynamic Infrastructure Forms - Quick Testing Checklist

## Pre-Testing Setup
- [ ] Backend running (`./mvnw quarkus:dev`)
- [ ] Frontend running (`npm run dev`)
- [ ] Test data configured (resource types, cloud providers, schemas)
- [ ] Browser DevTools open

## Core Functionality (Quick Check)

### Property Types
- [ ] STRING properties render and save correctly
- [ ] NUMBER properties validate numeric input
- [ ] BOOLEAN properties render as checkboxes
- [ ] LIST properties render as dropdowns (with allowed values)

### Validation
- [ ] Required fields show asterisk and prevent submission
- [ ] Min/max validation works for NUMBER properties
- [ ] Pattern validation works for STRING properties
- [ ] Validation errors display inline with red styling
- [ ] Errors clear when corrected

### Theme Support
- [ ] Light theme displays correctly
- [ ] Dark theme displays correctly
- [ ] Theme switching works smoothly

### States
- [ ] Loading state shows during schema fetch
- [ ] Error state shows with retry button on API failure
- [ ] Empty state shows when no schema defined
- [ ] Form displays correctly after successful load

### Integration
- [ ] Create Blueprint resource with dynamic properties
- [ ] Edit existing Blueprint resource
- [ ] Switch cloud providers (form updates)
- [ ] Switch resource types (form updates)
- [ ] Save form with valid data
- [ ] Form prevents save with invalid data

### Performance
- [ ] Schema caching works (no API call on second load)
- [ ] Form renders quickly (< 1 second)
- [ ] No console errors or warnings

### Responsive Design
- [ ] Desktop layout (1920x1080)
- [ ] Laptop layout (1366x768)
- [ ] Tablet layout (768x1024)
- [ ] Mobile layout (375x667)

## Critical Issues to Watch For

### Blockers
- [ ] Form doesn't load at all
- [ ] Cannot save valid data
- [ ] Console errors prevent functionality
- [ ] API calls fail consistently

### High Priority
- [ ] Validation doesn't work
- [ ] Theme switching breaks styling
- [ ] Required fields not enforced
- [ ] Data loss on save

### Medium Priority
- [ ] Styling inconsistencies
- [ ] Performance issues (> 2s load time)
- [ ] Help text not displaying
- [ ] Cache not working

### Low Priority
- [ ] Minor visual glitches
- [ ] Edge case handling
- [ ] Accessibility improvements

## Quick Test Scenarios

### Scenario 1: Happy Path (5 minutes)
1. Navigate to Infrastructure page
2. Create new Blueprint
3. Add resource (Storage, AWS)
4. Fill in all properties
5. Save successfully
6. Verify resource appears in list

### Scenario 2: Validation (3 minutes)
1. Create resource with required fields
2. Leave required field empty
3. Try to save (should fail)
4. Fill required field
5. Save successfully

### Scenario 3: Theme Switching (2 minutes)
1. Open form in light theme
2. Toggle to dark theme
3. Verify styling updates
4. Toggle back to light
5. Verify no issues

### Scenario 4: Error Handling (3 minutes)
1. Stop backend API
2. Try to load form
3. Verify error message
4. Start backend
5. Click retry
6. Verify form loads

### Scenario 5: Caching (2 minutes)
1. Load form (observe API call)
2. Navigate away
3. Navigate back
4. Load same form (no API call)
5. Verify instant display

## Sign-Off

**Tested By**: _______________
**Date**: _______________
**Browser**: _______________
**Result**: [ ] PASS [ ] FAIL

**Notes**:
_______________________________________
_______________________________________
_______________________________________

**Critical Issues Found**: _______________

**Ready for Production**: [ ] YES [ ] NO

---

For detailed testing procedures, see MANUAL_TESTING_GUIDE.md
