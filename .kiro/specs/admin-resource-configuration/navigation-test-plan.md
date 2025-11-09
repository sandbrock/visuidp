# Navigation Test Plan for PropertySchemaEditor

## Overview
This document outlines the manual testing procedures to verify the navigation context and state management implementation for the PropertySchemaEditor component.

## Test Scenarios

### Test 1: Navigation from AdminDashboard
**Entry Point:** Admin Dashboard → Incomplete Mappings → "Add Properties" button

**Steps:**
1. Navigate to `/admin` (Admin Dashboard)
2. Locate the "Incomplete Mappings" section
3. Click "Add Properties" button on any incomplete mapping
4. Verify navigation to `/admin/property-schemas/:mappingId`

**Expected Results:**
- ✓ URL should be `/admin/property-schemas/{mappingId}`
- ✓ Breadcrumb should show: "Admin Dashboard / Property Schema Editor"
- ✓ Header should display the resource type and cloud provider names
- ✓ Back button should navigate to `/admin`
- ✓ Breadcrumb "Admin Dashboard" link should navigate to `/admin`

**Location State Verification:**
```javascript
{
  from: '/admin',
  resourceTypeName: 'Resource Type Name',
  cloudProviderName: 'Cloud Provider Name'
}
```

---

### Test 2: Navigation from ResourceTypeMappingManagement
**Entry Point:** Resource Type Mappings Grid → "Configure Properties" button

**Steps:**
1. Navigate to `/admin/resource-type-mappings`
2. Locate a mapping cell in the grid
3. Click "Configure Properties" button
4. Verify navigation to `/admin/property-schemas/:mappingId`

**Expected Results:**
- ✓ URL should be `/admin/property-schemas/{mappingId}`
- ✓ Breadcrumb should show: "Admin Dashboard / Resource Type Mappings / Property Schema Editor"
- ✓ Header should display the resource type and cloud provider names
- ✓ Back button should navigate to `/admin/resource-type-mappings`
- ✓ Breadcrumb "Resource Type Mappings" link should navigate to `/admin/resource-type-mappings`

**Location State Verification:**
```javascript
{
  from: '/admin/resource-type-mappings',
  resourceTypeName: 'Resource Type Name',
  cloudProviderName: 'Cloud Provider Name'
}
```

---

### Test 3: Direct URL Access with Mapping ID
**Entry Point:** Direct browser URL entry

**Steps:**
1. Copy a valid mapping ID from the application
2. Navigate directly to `/admin/property-schemas/{mappingId}` in browser
3. Verify page loads correctly

**Expected Results:**
- ✓ Page should load successfully
- ✓ Breadcrumb should show default path: "Admin Dashboard / Resource Type Mappings / Property Schema Editor"
- ✓ Header should display the resource type and cloud provider names from the loaded mapping
- ✓ Back button should use browser history or navigate to `/admin/resource-type-mappings`
- ✓ No console errors related to missing navigation context

---

### Test 4: Query Parameter Navigation
**Entry Point:** URL with query parameters

**Steps:**
1. Get a valid resourceTypeId and cloudProviderId
2. Navigate to `/admin/property-schemas?resourceTypeId={id}&cloudProviderId={id}`
3. Verify page loads correctly

**Expected Results:**
- ✓ Page should load successfully
- ✓ Correct mapping should be resolved from the query parameters
- ✓ Breadcrumb should show default path
- ✓ Header should display the resource type and cloud provider names
- ✓ Console should log the query parameter lookup process

---

### Test 5: Error Handling - Invalid Mapping ID
**Entry Point:** Direct URL with invalid mapping ID

**Steps:**
1. Navigate to `/admin/property-schemas/invalid-uuid-12345`
2. Verify error handling

**Expected Results:**
- ✓ Error message should display: "Mapping not found with ID: invalid-uuid-12345"
- ✓ Back button should be available
- ✓ Console should log the error
- ✓ No application crash

---

### Test 6: Error Handling - Missing Query Parameters
**Entry Point:** URL with incomplete query parameters

**Steps:**
1. Navigate to `/admin/property-schemas?resourceTypeId=xxx` (missing cloudProviderId)
2. Verify error handling

**Expected Results:**
- ✓ Error message should display: "Missing required parameters: resourceTypeId and cloudProviderId..."
- ✓ Back button should be available
- ✓ Console should log the error
- ✓ Helpful error message guides user to navigate from mappings page

---

### Test 7: Browser Back Button
**Entry Point:** After navigating to PropertySchemaEditor

**Steps:**
1. Navigate to PropertySchemaEditor from any entry point
2. Click browser back button
3. Verify navigation behavior

**Expected Results:**
- ✓ Should navigate back to the previous page
- ✓ Previous page state should be preserved
- ✓ No navigation errors

---

### Test 8: Breadcrumb Navigation
**Entry Point:** PropertySchemaEditor page

**Steps:**
1. Navigate to PropertySchemaEditor from ResourceTypeMappingManagement
2. Click "Admin Dashboard" in breadcrumb
3. Verify navigation to `/admin`
4. Navigate back to PropertySchemaEditor
5. Click "Resource Type Mappings" in breadcrumb
6. Verify navigation to `/admin/resource-type-mappings`

**Expected Results:**
- ✓ All breadcrumb links should navigate correctly
- ✓ Current page (last breadcrumb item) should not be clickable
- ✓ Navigation should be smooth without errors

---

## Console Logging Verification

The implementation includes console logging for debugging. Verify the following logs appear:

### Successful Mapping Load by ID:
```
Loading mapping by ID: {mappingId}
Found mapping: {mapping object}
```

### Successful Mapping Load by Query Params:
```
Loading mapping by query params: { resourceTypeId: 'xxx', cloudProviderId: 'yyy' }
Found mapping: {mapping object}
```

### Error Cases:
```
Mapping not found for ID: {mappingId}
Missing required query parameters
Mapping not found for: { resourceTypeId: 'xxx', cloudProviderId: 'yyy' }
```

---

## Implementation Verification Checklist

- [x] URL parameter parsing implemented (mappingId from route params)
- [x] Query parameter parsing implemented (resourceTypeId, cloudProviderId)
- [x] Location state extraction implemented
- [x] Navigation context interface defined
- [x] Dynamic breadcrumb building based on navigation context
- [x] Back button handler with fallback logic
- [x] Display names from navigation context used in header
- [x] Console logging for debugging
- [x] Error handling for missing/invalid parameters
- [x] TypeScript types properly defined
- [x] No TypeScript diagnostics errors

---

## Notes

- The implementation prioritizes navigation context from location state when available
- Fallback mechanisms ensure the page works even with direct URL access
- Console logging helps debug navigation issues during development
- Error messages are user-friendly and provide guidance
