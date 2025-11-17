# Manual Testing Checklist - Blueprint-Centric Stack Management

## Test Environment Setup

- [ ] Backend running: `cd idp-api && ./mvnw quarkus:dev`
- [ ] Frontend running: `cd idp-ui && npm run dev`
- [ ] Docker services running: `cd idp-api && docker compose up -d`
- [ ] Access application at: `https://localhost:8443/ui/development`
- [ ] Clear browser localStorage before testing
- [ ] Test with fresh database state

## 1. Blueprint Selection Flow (Requirements 1.1-1.5)

### Initial Page Load
- [ ] Navigate to `/development` page
- [ ] Verify BlueprintSelector appears at top of page
- [ ] Verify "Select a blueprint" message displays when none selected
- [ ] Verify Create Stack button is disabled

### No Blueprints Scenario (Requirement 8.1, 8.4)
- [ ] With no blueprints in system, verify message: "No blueprints available. Create a blueprint in the Infrastructure page first."
- [ ] Verify call-to-action button navigates to Infrastructure page
- [ ] Verify Create Stack button remains disabled

### Blueprint Selection (Requirements 1.1-1.3)
- [ ] Create at least 2 blueprints in Infrastructure page
- [ ] Return to Development page
- [ ] Open blueprint dropdown
- [ ] Verify all blueprints appear in dropdown
- [ ] Select a blueprint
- [ ] Verify selection persists in dropdown
- [ ] Verify stack list updates to show only that blueprint's stacks

### Blueprint Actions (Requirement 1.1)
- [ ] Verify "New Blueprint" button navigates to Infrastructure page
- [ ] Select a blueprint
- [ ] Verify "Edit Blueprint" button is enabled
- [ ] Click "Edit Blueprint" - verify navigation to Infrastructure page with blueprint selected
- [ ] Verify "Delete Blueprint" button is enabled
- [ ] Click "Delete Blueprint" - verify confirmation dialog appears

## 2. Blueprint-Filtered Stack List (Requirements 2.1-2.5)

### Empty State (Requirement 8.2, 8.5)
- [ ] Select blueprint with no stacks
- [ ] Verify message: "No stacks in this blueprint. Create your first stack to get started."
- [ ] Verify call-to-action button opens stack creation form
- [ ] Verify Create Stack button is enabled

### Stack Display (Requirement 2.4)
- [ ] Create stacks in multiple blueprints
- [ ] Select first blueprint
- [ ] Verify only stacks from that blueprint display
- [ ] Verify stack name, description, type, and timestamp shown
- [ ] Select second blueprint
- [ ] Verify stack list updates to show only second blueprint's stacks

### Blueprint Change (Requirement 2.3)
- [ ] Select blueprint A with 3 stacks
- [ ] Note the stacks displayed
- [ ] Switch to blueprint B with 2 different stacks
- [ ] Verify stack list immediately updates
- [ ] Verify correct stacks for blueprint B display
- [ ] Switch back to blueprint A
- [ ] Verify original 3 stacks display again

## 3. Stack Creation Flow (Requirements 3.1-3.5)

### Blueprint Requirement (Requirements 3.1, 3.4)
- [ ] Clear blueprint selection
- [ ] Verify Create Stack button is disabled
- [ ] Hover over disabled button - verify tooltip explains blueprint requirement
- [ ] Select a blueprint
- [ ] Verify Create Stack button becomes enabled

### Create New Stack (Requirements 3.2, 3.3, 3.5)
- [ ] Select a blueprint
- [ ] Click "Create New Stack"
- [ ] Verify stack form opens
- [ ] Verify NO blueprint picker dropdown in form
- [ ] Fill in stack details (name, type, etc.)
- [ ] Submit form
- [ ] Verify new stack appears in current blueprint's stack list
- [ ] Verify stack is associated with selected blueprint

### Multiple Stack Types (Requirement 6.1-6.5)
- [ ] Create Infrastructure-only stack - verify no resource selection required
- [ ] Create RESTful API stack - verify Container Orchestrator selection appears
- [ ] Create Web Application stack - verify Storage resource selection appears
- [ ] Verify resource selections show only resources from selected blueprint
- [ ] If only one resource available, verify it's auto-selected

## 4. Stack Form Simplification (Requirements 4.1-4.5)

### Form Structure
- [ ] Open stack form for creation
- [ ] Verify NO blueprint selection dropdown present
- [ ] Verify form is cleaner without blueprint picker
- [ ] Verify blueprint context used for resource validation

### Edit Mode
- [ ] Open existing stack for editing
- [ ] Verify NO blueprint selection dropdown present
- [ ] Verify current blueprint resources available for selection
- [ ] Verify form uses blueprint context from parent page

## 5. Stack Migration (Requirements 5.1-5.5)

### Migration Control Display (Requirement 5.1)
- [ ] Open stack in edit mode
- [ ] Verify "Move to Different Blueprint" section appears
- [ ] Verify section only appears in edit mode (not create mode)

### Blueprint Selection (Requirement 5.2)
- [ ] Click migration control
- [ ] Verify dropdown lists all blueprints EXCEPT current one
- [ ] Verify current blueprint is excluded from list

### Compatible Migration (Requirement 5.3)
- [ ] Create RESTful API stack in blueprint A (with Container Orchestrator)
- [ ] Create blueprint B with Container Orchestrator
- [ ] Edit the stack
- [ ] Select blueprint B in migration control
- [ ] Verify NO warnings appear
- [ ] Save changes
- [ ] Verify stack moves to blueprint B
- [ ] Verify stack appears in blueprint B's list
- [ ] Verify stack removed from blueprint A's list

### Incompatible Migration (Requirements 5.4, 5.5)
- [ ] Create RESTful API stack in blueprint A (with Container Orchestrator)
- [ ] Create blueprint C WITHOUT Container Orchestrator
- [ ] Edit the stack
- [ ] Select blueprint C in migration control
- [ ] Verify warning: "Target blueprint does not have a Container Orchestrator"
- [ ] Verify Save button is disabled or shows error
- [ ] Cancel migration
- [ ] Verify stack remains in blueprint A

### Migration Validation Scenarios
- [ ] Test Web App stack → blueprint without Storage (should warn)
- [ ] Test stack with specific blueprint resource → blueprint without that resource (should warn)
- [ ] Test Infrastructure-only stack → any blueprint (should succeed)

## 6. State Persistence (Requirements 7.1-7.5)

### localStorage Persistence (Requirements 7.1, 7.2)
- [ ] Select a blueprint
- [ ] Open browser DevTools → Application → Local Storage
- [ ] Verify blueprint ID is stored
- [ ] Refresh the page
- [ ] Verify same blueprint is automatically selected
- [ ] Verify stack list shows correct stacks

### Invalid Blueprint Handling (Requirement 7.4)
- [ ] Select a blueprint and note its ID
- [ ] Delete that blueprint via Infrastructure page
- [ ] Return to Development page
- [ ] Verify selection is cleared
- [ ] Verify prompt to select new blueprint appears

### Logout Scenario (Requirement 7.5)
- [ ] Select a blueprint
- [ ] Log out (if applicable)
- [ ] Log back in
- [ ] Verify blueprint selection is cleared
- [ ] Verify user must select blueprint again

## 7. Stack List Updates (Requirements 9.1-9.5)

### After Creation (Requirement 9.1)
- [ ] Select a blueprint
- [ ] Note current stack count
- [ ] Create new stack
- [ ] Verify stack list automatically refreshes
- [ ] Verify new stack appears in list
- [ ] Verify stack count increased by 1

### After Edit (Requirement 9.2)
- [ ] Edit an existing stack (change name/description)
- [ ] Save changes
- [ ] Return to stack list
- [ ] Verify changes are reflected in list
- [ ] Verify updated timestamp changed

### After Delete (Requirement 9.3)
- [ ] Select a stack
- [ ] Delete the stack
- [ ] Verify stack immediately removed from list
- [ ] Verify stack count decreased by 1

### After Migration (Requirement 9.4)
- [ ] Select blueprint A with stack X
- [ ] Edit stack X and migrate to blueprint B
- [ ] Save changes
- [ ] Verify stack X removed from blueprint A's list
- [ ] Switch to blueprint B
- [ ] Verify stack X appears in blueprint B's list

### From Stack Details (Requirement 9.5)
- [ ] View stack details
- [ ] Click back to list
- [ ] Verify list shows current information
- [ ] Edit stack from details view
- [ ] Return to list
- [ ] Verify updates reflected

## 8. Blueprint Context Propagation (Requirements 10.1-10.5)

### Form Context (Requirements 10.1, 10.2)
- [ ] Select blueprint A
- [ ] Open stack form
- [ ] Verify form receives blueprint context
- [ ] Verify resource validation uses blueprint A's resources

### Submission Context (Requirement 10.3)
- [ ] Create stack with blueprint A selected
- [ ] Submit form
- [ ] Verify API payload includes blueprint A's ID
- [ ] Verify stack created with correct blueprint association

### Details Display (Requirement 10.4)
- [ ] Open stack details
- [ ] Verify blueprint name is displayed
- [ ] Verify link to blueprint in Infrastructure page (if applicable)

### Navigation Context (Requirement 10.5)
- [ ] Select blueprint A
- [ ] Create stack
- [ ] Edit stack
- [ ] View stack details
- [ ] Return to list
- [ ] Verify blueprint A remains selected throughout

## 9. Error Handling

### Blueprint Load Failure (Requirement 1.4)
- [ ] Stop backend server
- [ ] Refresh Development page
- [ ] Verify error message: "Failed to load blueprints. Please try again."
- [ ] Verify "Retry" button appears
- [ ] Restart backend
- [ ] Click "Retry"
- [ ] Verify blueprints load successfully

### Stack Creation Errors (Requirement 3.4)
- [ ] Attempt to create stack with invalid data
- [ ] Verify appropriate error messages display
- [ ] Verify form doesn't close on error
- [ ] Verify user can correct and retry

### Migration Errors (Requirement 5.5)
- [ ] Attempt incompatible migration
- [ ] Verify specific validation messages
- [ ] Verify cannot save with errors
- [ ] Cancel and verify stack unchanged

## 10. Accessibility Testing (Requirement 20)

### Keyboard Navigation
- [ ] Tab through BlueprintSelector controls
- [ ] Verify logical tab order: Dropdown → New → Edit → Delete
- [ ] Open dropdown with Enter/Space
- [ ] Navigate dropdown options with Arrow keys
- [ ] Select option with Enter
- [ ] Tab to Create Stack button
- [ ] Activate with Enter/Space
- [ ] Tab through stack list items
- [ ] Navigate stack form with keyboard only

### ARIA Labels (Requirements 20.2, 20.4)
- [ ] Inspect BlueprintSelector with DevTools
- [ ] Verify aria-label on dropdown
- [ ] Verify aria-label on action buttons
- [ ] Inspect migration controls
- [ ] Verify aria-label on migration dropdown
- [ ] Verify aria-describedby for warnings

### Screen Reader Support (Requirement 20.3)
- [ ] Enable screen reader (NVDA/JAWS/VoiceOver)
- [ ] Navigate to Development page
- [ ] Verify "Select a blueprint" message is announced
- [ ] Select blueprint - verify selection announced
- [ ] Navigate to empty state - verify message announced
- [ ] Navigate to Create Stack button
- [ ] Verify disabled state announced with reason
- [ ] Enable button by selecting blueprint
- [ ] Verify enabled state announced

### Disabled Button States (Requirement 20.6)
- [ ] With no blueprint selected, focus Create Stack button
- [ ] Verify screen reader announces disabled state
- [ ] Verify tooltip/aria-describedby explains why disabled
- [ ] Select blueprint
- [ ] Verify screen reader announces enabled state

### Focus Management (Requirement 20.5)
- [ ] Open stack form
- [ ] Verify focus moves to first form field
- [ ] Submit form
- [ ] Verify focus returns to appropriate element
- [ ] Open migration control
- [ ] Verify focus moves to dropdown

## 11. Responsive Design

### Desktop (1920x1080)
- [ ] Verify BlueprintSelector displays horizontally
- [ ] Verify stack list shows in grid/table format
- [ ] Verify all controls are easily accessible
- [ ] Verify no horizontal scrolling

### Laptop (1366x768)
- [ ] Verify layout adjusts appropriately
- [ ] Verify all content remains accessible
- [ ] Verify no overlapping elements

### Tablet (768x1024)
- [ ] Verify BlueprintSelector remains usable
- [ ] Verify stack list adapts to smaller width
- [ ] Verify buttons remain accessible
- [ ] Verify form is usable

### Mobile (375x667)
- [ ] Verify BlueprintSelector stacks vertically if needed
- [ ] Verify dropdown is touch-friendly
- [ ] Verify stack list shows in single column
- [ ] Verify Create Stack button is accessible
- [ ] Verify form fields are appropriately sized
- [ ] Verify no horizontal scrolling

## 12. Theme Consistency (Requirement 19.6)

### Light Theme
- [ ] Switch to light theme
- [ ] Verify BlueprintSelector styling matches design system
- [ ] Verify empty states are readable
- [ ] Verify migration section styling is consistent
- [ ] Verify all colors have appropriate contrast

### Dark Theme
- [ ] Switch to dark theme
- [ ] Verify all components adapt correctly
- [ ] Verify text remains readable
- [ ] Verify borders and separators are visible
- [ ] Verify focus indicators are visible

### Frankenstein Theme (if applicable)
- [ ] Switch to Frankenstein theme
- [ ] Verify all components render correctly
- [ ] Verify theme-specific styling applied

## 13. Edge Cases (Requirement 29)

### Last Stack Deleted
- [ ] Create blueprint with single stack
- [ ] Delete the stack
- [ ] Verify blueprint remains selected
- [ ] Verify empty state displays
- [ ] Verify Create Stack button still enabled

### Blueprint Deleted While Selected
- [ ] Select a blueprint
- [ ] In another tab/window, delete that blueprint
- [ ] Return to Development page
- [ ] Perform action (create stack, refresh, etc.)
- [ ] Verify graceful error handling
- [ ] Verify selection cleared
- [ ] Verify prompt to select new blueprint

### Concurrent Modifications
- [ ] Open stack in edit mode in two tabs
- [ ] Modify in first tab and save
- [ ] Modify in second tab and save
- [ ] Verify appropriate conflict handling

### Migration Back and Forth
- [ ] Create stack in blueprint A
- [ ] Migrate to blueprint B
- [ ] Verify successful migration
- [ ] Migrate back to blueprint A
- [ ] Verify successful migration
- [ ] Verify no data loss
- [ ] Verify resource selections remain valid

## 14. Requirements Verification

### Requirement 1: Blueprint Selection as Primary Navigation
- [ ] 1.1: Blueprint selector displays at top ✓
- [ ] 1.2: Message when no blueprint selected ✓
- [ ] 1.3: Stack list filters by selected blueprint ✓
- [ ] 1.4: Message when no blueprints exist ✓
- [ ] 1.5: Selection persists in localStorage ✓

### Requirement 2: Blueprint-Filtered Stack List
- [ ] 2.1: Retrieves stacks by blueprintId ✓
- [ ] 2.2: Empty state for blueprint with no stacks ✓
- [ ] 2.3: Updates on blueprint change ✓
- [ ] 2.4: Displays stack metadata ✓
- [ ] 2.5: Create button enabled when blueprint selected ✓

### Requirement 3: Blueprint Requirement for Stack Creation
- [ ] 3.1: Create button disabled without blueprint ✓
- [ ] 3.2: Form opens with blueprint context ✓
- [ ] 3.3: Stack associated with selected blueprint ✓
- [ ] 3.4: Error when no blueprints exist ✓
- [ ] 3.5: New stack added to blueprint's list ✓

### Requirement 4: Simplified Stack Form
- [ ] 4.1: No blueprint dropdown in create mode ✓
- [ ] 4.2: No blueprint dropdown in edit mode ✓
- [ ] 4.3: Uses blueprint context for submission ✓
- [ ] 4.4: Uses blueprint context for resources ✓
- [ ] 4.5: Uses blueprint context for validation ✓

### Requirement 5: Stack Blueprint Migration
- [ ] 5.1: Migration control in edit mode ✓
- [ ] 5.2: Dropdown excludes current blueprint ✓
- [ ] 5.3: Updates blueprintId on migration ✓
- [ ] 5.4: Validates resource compatibility ✓
- [ ] 5.5: Prevents incompatible migrations ✓

### Requirement 6: Resource Selection Consistency
- [ ] 6.1: Shows Container Orchestrators for API stacks ✓
- [ ] 6.2: Shows Storage for Web App stacks ✓
- [ ] 6.3: Auto-selects single resource ✓
- [ ] 6.4: Requires selection for multiple resources ✓
- [ ] 6.5: Updates on stack type change ✓

### Requirement 7: Navigation State Persistence
- [ ] 7.1: Stores blueprint ID in localStorage ✓
- [ ] 7.2: Retrieves on page load ✓
- [ ] 7.3: Auto-selects valid blueprint ✓
- [ ] 7.4: Clears invalid blueprint ✓
- [ ] 7.5: Clears on logout ✓

### Requirement 8: Empty State Handling
- [ ] 8.1: Message for no blueprints ✓
- [ ] 8.2: Message for no stacks ✓
- [ ] 8.3: Call-to-action buttons ✓
- [ ] 8.4: Navigation to Infrastructure page ✓
- [ ] 8.5: Opens stack creation form ✓

### Requirement 9: Stack List Display Updates
- [ ] 9.1: Refreshes after creation ✓
- [ ] 9.2: Refreshes after edit ✓
- [ ] 9.3: Updates after delete ✓
- [ ] 9.4: Updates after migration ✓
- [ ] 9.5: Shows updated info from details ✓

### Requirement 10: Blueprint Context Propagation
- [ ] 10.1: Form receives blueprint ID ✓
- [ ] 10.2: Validation uses blueprint context ✓
- [ ] 10.3: Submission includes blueprint ID ✓
- [ ] 10.4: Details display blueprint name ✓
- [ ] 10.5: Context maintained during navigation ✓

## Test Results Summary

**Date:** _______________  
**Tester:** _______________  
**Environment:** _______________

**Total Tests:** _____  
**Passed:** _____  
**Failed:** _____  
**Blocked:** _____

### Critical Issues Found:
1. 
2. 
3. 

### Minor Issues Found:
1. 
2. 
3. 

### Notes:


### Sign-off:
- [ ] All critical functionality working
- [ ] All requirements verified
- [ ] Accessibility requirements met
- [ ] Responsive design verified
- [ ] Ready for production

**Approved by:** _______________  
**Date:** _______________
