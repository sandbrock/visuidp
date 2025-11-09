# Manual Test Plan: Blueprint Resource Persistence

## Test Environment Setup

### Prerequisites
1. Backend API running on port 8082 (`./mvnw quarkus:dev` from `idp-api/`)
2. Frontend UI running on port 8083 (`npm run dev` from `idp-ui/`)
3. Docker services running (PostgreSQL, Traefik, OAuth2 Proxy)
4. Access application at `https://localhost:8443/ui/`
5. Authenticated user session

### Test Data Requirements
- At least one cloud provider configured (AWS, Azure, or GCP)
- At least one resource type available (Container Orchestrator, Database Server, Service Bus, or Storage)
- Test blueprint for resource operations

---

## Test Case 1: Create New Resource in Blueprint

**Objective:** Verify that creating a new resource persists to the database

**Requirements Tested:** 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.5

### Steps:
1. Navigate to Infrastructure page
2. Select an existing blueprint from dropdown (or create a new one)
3. Click "Create New Resource" button
4. Fill in resource form:
   - Name: "Test Database Server"
   - Description: "Test database for manual testing"
   - Resource Type: Select "Relational Database Server"
   - Cloud Service Name: "test-db-server"
   - Engine: "postgres"
   - Version: "16"
   - Cloud Provider: Select available provider (e.g., AWS)
   - Fill cloud-specific properties as needed
5. Click "Create Resource" button
6. Verify success (no error message appears)
7. Verify resource appears in the resources table
8. Note the resource details (name, type, cloud provider)

### Verification:
- [ ] Form submission button shows "Creating..." during save
- [ ] No error message appears after submission
- [ ] Resource appears in the resources table immediately
- [ ] Resource shows correct name, type, and cloud provider

### Persistence Check:
9. Refresh the browser page (F5 or Ctrl+R)
10. Select the same blueprint from dropdown
11. Verify the created resource still appears in the resources table
12. Verify all resource details match what was entered

**Expected Result:** ✅ Resource persists after page refresh with all correct details

---

## Test Case 2: Update Existing Resource

**Objective:** Verify that updating a resource persists changes to the database

**Requirements Tested:** 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.5

### Steps:
1. Navigate to Infrastructure page
2. Select blueprint containing the resource created in Test Case 1
3. Click "Edit" button on the "Test Database Server" resource
4. Modify resource fields:
   - Name: "Updated Database Server"
   - Description: "Updated description for testing"
   - Cloud Service Name: "updated-db-server"
   - Version: "15" (change from "16")
5. Click "Update Resource" button
6. Verify success (no error message appears)
7. Verify resource shows updated values in the table

### Verification:
- [ ] Form submission button shows "Updating..." during save
- [ ] No error message appears after submission
- [ ] Resource table immediately reflects updated values
- [ ] Resource name changed to "Updated Database Server"
- [ ] Description updated correctly

### Persistence Check:
8. Refresh the browser page (F5 or Ctrl+R)
9. Select the same blueprint from dropdown
10. Verify the resource shows updated values
11. Click "Edit" on the resource
12. Verify form fields show the updated values

**Expected Result:** ✅ Resource updates persist after page refresh with all changes saved

---

## Test Case 3: Delete Resource from Blueprint

**Objective:** Verify that deleting a resource removes it from the database

**Requirements Tested:** 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.5

### Steps:
1. Navigate to Infrastructure page
2. Select blueprint containing the "Updated Database Server" resource
3. Note the current number of resources in the table
4. Click "Delete" button on the "Updated Database Server" resource
5. Verify confirmation dialog appears
6. Click "OK" to confirm deletion
7. Verify resource is removed from the table
8. Verify resource count decreased by 1

### Verification:
- [ ] Confirmation dialog appears with resource name
- [ ] No error message appears after deletion
- [ ] Resource immediately disappears from table
- [ ] Resource count is correct

### Persistence Check:
9. Refresh the browser page (F5 or Ctrl+R)
10. Select the same blueprint from dropdown
11. Verify the deleted resource does NOT appear in the table
12. Verify resource count remains decreased

**Expected Result:** ✅ Resource deletion persists after page refresh

---

## Test Case 4: Multiple Resources in Single Blueprint

**Objective:** Verify that multiple resources can be managed in one blueprint

**Requirements Tested:** 1.1, 2.1, 3.1, 4.1, 4.2, 5.1, 5.2

### Steps:
1. Navigate to Infrastructure page
2. Select or create a test blueprint
3. Create first resource:
   - Name: "Container Cluster"
   - Type: "Container Orchestrator"
   - Cloud Service Name: "test-cluster"
4. Verify first resource appears
5. Create second resource:
   - Name: "Message Queue"
   - Type: "Service Bus"
   - Cloud Service Name: "test-queue"
6. Verify both resources appear
7. Create third resource:
   - Name: "Object Storage"
   - Type: "Storage"
   - Cloud Service Name: "test-storage"
8. Verify all three resources appear in table

### Verification:
- [ ] All three resources appear in the table
- [ ] Each resource shows correct name and type
- [ ] Resources are listed in order

### Persistence Check:
9. Refresh the browser page
10. Select the same blueprint
11. Verify all three resources still appear
12. Edit the second resource (Message Queue)
13. Change name to "Updated Message Queue"
14. Save and verify change
15. Refresh page again
16. Verify all three resources appear with the updated name

**Expected Result:** ✅ Multiple resources persist correctly with independent operations

---

## Test Case 5: Error Handling - Invalid Data

**Objective:** Verify error messages display for validation failures

**Requirements Tested:** 1.3, 1.4, 2.3, 2.4, 5.2, 5.4

### Steps:
1. Navigate to Infrastructure page
2. Select a blueprint
3. Click "Create New Resource"
4. Leave "Resource Name" field empty
5. Try to submit form
6. Verify submit button is disabled

### Verification:
- [ ] Submit button is disabled when required fields are empty
- [ ] Form does not submit with invalid data

### Additional Validation:
7. Fill in Resource Name: "Test Resource"
8. Leave Resource Type unselected
9. Verify submit button remains disabled
10. Select Resource Type
11. Verify submit button becomes enabled

**Expected Result:** ✅ Form validation prevents submission of invalid data

---

## Test Case 6: Error Handling - Network Failure Simulation

**Objective:** Verify error messages display for network failures

**Requirements Tested:** 5.1, 5.2, 5.4

### Steps:
1. Navigate to Infrastructure page
2. Select a blueprint
3. Open browser DevTools (F12)
4. Go to Network tab
5. Enable "Offline" mode or throttle to "Offline"
6. Click "Create New Resource"
7. Fill in valid resource data
8. Click "Create Resource"
9. Wait for operation to complete
10. Verify error message appears

### Verification:
- [ ] Error message displays: "Failed to create resource. Please try again."
- [ ] Form data is preserved (not cleared)
- [ ] User can fix issue and retry

### Recovery:
11. Disable "Offline" mode in DevTools
12. Click "Create Resource" again (with same data)
13. Verify resource is created successfully
14. Verify no error message appears

**Expected Result:** ✅ Network errors are handled gracefully with clear messages

---

## Test Case 7: Loading States During API Calls

**Objective:** Verify loading indicators work properly

**Requirements Tested:** 5.5

### Steps:
1. Navigate to Infrastructure page
2. Select a blueprint
3. Click "Create New Resource"
4. Fill in valid resource data
5. Open browser DevTools Network tab
6. Throttle network to "Slow 3G"
7. Click "Create Resource"
8. Observe button text during operation

### Verification:
- [ ] Button text changes to "Creating..." during save
- [ ] Button is disabled during save
- [ ] Button returns to "Create Resource" after completion
- [ ] Button is re-enabled after completion

### Additional Loading States:
9. Click "Edit" on an existing resource
10. Make changes
11. Click "Update Resource"
12. Verify button shows "Updating..." during save

13. Click "Delete" on a resource
14. Confirm deletion
15. Verify buttons are disabled during deletion

**Expected Result:** ✅ Loading states provide clear feedback during operations

---

## Test Case 8: Success Message Display

**Objective:** Verify success feedback is provided (if implemented)

**Requirements Tested:** 5.1, 5.3

### Steps:
1. Navigate to Infrastructure page
2. Select a blueprint
3. Create a new resource
4. Observe for success message or confirmation

### Verification:
- [ ] Success indication is provided (message, toast, or visual feedback)
- [ ] User understands operation completed successfully

**Note:** Current implementation may not have explicit success messages. Verify that:
- Resource appears in table immediately (implicit success)
- No error message appears (implicit success)

**Expected Result:** ✅ User receives clear feedback that operation succeeded

---

## Test Case 9: Cloud-Specific Properties Persistence

**Objective:** Verify cloud-specific properties are saved and loaded correctly

**Requirements Tested:** 1.1, 1.2, 2.1, 2.2, 4.1, 4.2

### Steps:
1. Navigate to Infrastructure page
2. Select a blueprint
3. Create a new Storage resource with AWS cloud provider:
   - Name: "AWS Storage Test"
   - Type: "Storage"
   - Cloud Service Name: "test-s3-bucket"
   - Cloud Provider: AWS
   - Storage Class: "STANDARD_IA"
   - Versioning: "Enabled"
   - Encryption: "aws:kms"
   - Block Public Access: "Enabled"
4. Save resource
5. Verify resource appears in table

### Persistence Check:
6. Refresh browser page
7. Select same blueprint
8. Click "Edit" on "AWS Storage Test" resource
9. Verify cloud-specific properties are loaded:
   - Storage Class: "STANDARD_IA"
   - Versioning: "Enabled"
   - Encryption: "aws:kms"
   - Block Public Access: "Enabled"

**Expected Result:** ✅ Cloud-specific properties persist correctly

---

## Test Case 10: Resource Type Configuration Persistence

**Objective:** Verify resource type-specific configuration persists

**Requirements Tested:** 1.1, 1.2, 2.1, 2.2, 4.1, 4.2

### Steps:
1. Navigate to Infrastructure page
2. Select a blueprint
3. Create a Relational Database Server resource:
   - Name: "Postgres Server"
   - Type: "Relational Database Server"
   - Cloud Service Name: "prod-postgres"
   - Engine: "postgres"
   - Version: "15"
   - Cloud Provider: Select available
4. Save resource
5. Refresh page
6. Edit the resource
7. Verify configuration fields:
   - Engine: "postgres"
   - Version: "15"

**Expected Result:** ✅ Resource type configuration persists correctly

---

## Test Summary Checklist

After completing all test cases, verify:

- [ ] All test cases passed
- [ ] Resource creation persists across page refreshes
- [ ] Resource updates persist across page refreshes
- [ ] Resource deletion persists across page refreshes
- [ ] Multiple resources can be managed independently
- [ ] Error messages display correctly for validation failures
- [ ] Error messages display correctly for network failures
- [ ] Loading states work properly during API calls
- [ ] Form data is preserved on errors
- [ ] Cloud-specific properties persist correctly
- [ ] Resource type configurations persist correctly

---

## Known Issues / Notes

Document any issues found during testing:

1. Issue: _______________
   - Steps to reproduce: _______________
   - Expected: _______________
   - Actual: _______________

2. Issue: _______________
   - Steps to reproduce: _______________
   - Expected: _______________
   - Actual: _______________

---

## Test Execution Log

| Test Case | Date | Tester | Result | Notes |
|-----------|------|--------|--------|-------|
| TC1: Create Resource | | | | |
| TC2: Update Resource | | | | |
| TC3: Delete Resource | | | | |
| TC4: Multiple Resources | | | | |
| TC5: Invalid Data | | | | |
| TC6: Network Failure | | | | |
| TC7: Loading States | | | | |
| TC8: Success Messages | | | | |
| TC9: Cloud Properties | | | | |
| TC10: Type Configuration | | | | |

---

## Sign-off

**Tester Name:** _______________

**Date:** _______________

**Overall Result:** ☐ PASS  ☐ FAIL  ☐ PASS WITH ISSUES

**Comments:** _______________
