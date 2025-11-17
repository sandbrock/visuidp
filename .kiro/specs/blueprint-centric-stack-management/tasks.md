# Implementation Plan

- [x] 1. Create BlueprintSelector component
  - Create new component file with blueprint dropdown and action buttons
  - Implement blueprint fetching and state management
  - Add localStorage persistence for selected blueprint
  - Style component to match existing design system
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Add backend API endpoint for filtered stack queries
  - Create GET /v1/stacks endpoint with blueprintId query parameter
  - Implement filtering logic in StackRepository
  - Add authorization checks for blueprint access
  - Return stacks filtered by blueprintId
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Update Homepage component with blueprint selection state
  - Add selectedBlueprintId state to Homepage
  - Implement handleBlueprintChange method
  - Add useEffect to restore selection from localStorage
  - Pass blueprint context to child components
  - Update handleCreateNew to validate blueprint selection
  - _Requirements: 1.5, 3.1, 3.2, 3.3, 10.1, 10.5_

- [x] 4. Integrate BlueprintSelector into Homepage
  - Import and render BlueprintSelector at top of Homepage
  - Wire up blueprint selection callback
  - Position selector above StackList
  - Add conditional rendering based on blueprint availability
  - _Requirements: 1.1, 1.4_

- [x] 5. Modify StackList to accept and use blueprintId prop
  - Add selectedBlueprintId prop to StackListProps
  - Update fetchStacks to call new filtered API endpoint
  - Remove collection tab functionality
  - Implement empty state for no blueprint selected
  - Implement empty state for blueprint with no stacks
  - Implement empty state for no blueprints available
  - Conditionally enable/disable Create Stack button
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6. Update apiService with getStacksByBlueprint method
  - Add getStacksByBlueprint method to apiService
  - Implement API call with blueprintId query parameter
  - Add error handling for invalid blueprint IDs
  - Update TypeScript types if needed
  - _Requirements: 2.1, 2.2_

- [x] 7. Remove blueprint picker from StackForm
  - Remove blueprint selection dropdown from form
  - Remove blueprint-related state variables
  - Remove blueprint filtering logic
  - Remove blueprint requirement helper text
  - Clean up unused imports and code
  - _Requirements: 4.1, 4.2_

- [x] 8. Add blueprintId as required prop to StackForm
  - Add blueprintId to StackFormProps interface
  - Update StackForm to receive blueprintId from parent
  - Use blueprintId prop in form submission
  - Update resource validation to use blueprintId prop
  - _Requirements: 4.3, 4.4, 4.5, 10.1, 10.2, 10.3_

- [x] 9. Update Homepage to pass blueprintId to StackForm
  - Pass selectedBlueprintId to StackForm when creating
  - Pass selectedBlueprintId to StackForm when editing
  - Add validation to prevent form opening without blueprint
  - _Requirements: 3.2, 3.3, 10.1_

- [x] 10. Add stack migration UI to StackForm (edit mode only)
  - Add "Move to Different Blueprint" section in edit mode
  - Create target blueprint dropdown (exclude current blueprint)
  - Add targetBlueprintId state variable
  - Add migrationWarnings state variable
  - Implement handleBlueprintMigration method
  - Display migration warnings to user
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 11. Implement blueprint migration validation logic
  - Create validateBlueprintCompatibility function
  - Check for required Container Orchestrator resources
  - Check for required Storage resources
  - Validate blueprint resource availability
  - Generate user-friendly warning messages
  - _Requirements: 5.4, 5.5_

- [x] 12. Update stack submission to handle blueprint migration
  - Modify handleSubmit to include targetBlueprintId if changed
  - Update API call to support blueprint migration
  - Handle migration validation errors
  - Refresh parent component after successful migration
  - _Requirements: 5.3, 5.4, 5.5_

- [x] 13. Add blueprint information to StackDetails component
  - Add blueprintName prop to StackDetailsProps
  - Display blueprint name in metadata section
  - Add link to navigate to blueprint in Infrastructure page
  - Update Homepage to fetch and pass blueprint name
  - _Requirements: 10.4_

- [x] 14. Update stack list refresh logic after operations
  - Ensure stack list refreshes after creation
  - Ensure stack list refreshes after edit
  - Ensure stack list refreshes after deletion
  - Ensure stack list updates after migration
  - Handle blueprint context changes during refresh
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 15. Implement localStorage management for blueprint selection
  - Store blueprint ID on selection change
  - Retrieve blueprint ID on component mount
  - Validate stored blueprint ID against available blueprints
  - Clear stored ID if blueprint no longer exists
  - Clear stored ID on logout (if applicable)
  - _Requirements: 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 16. Add error handling for blueprint operations
  - Handle no blueprints available scenario
  - Handle blueprint load failure with retry
  - Handle invalid stored blueprint ID
  - Handle blueprint deleted during session
  - Display appropriate error messages and actions
  - _Requirements: 1.4, 8.1, 8.4_

- [x] 17. Add error handling for stack creation
  - Prevent stack creation when no blueprint selected
  - Add tooltip to disabled Create Stack button
  - Handle blueprint deletion during stack creation
  - Display clear error messages
  - _Requirements: 3.1, 3.4_

- [x] 18. Add error handling for stack migration
  - Validate compatibility before allowing migration
  - Display specific validation failure messages
  - Prevent save if critical incompatibilities exist
  - Handle migration save failures gracefully
  - Revert to original blueprint on failure
  - _Requirements: 5.4, 5.5_

- [x] 19. Update CSS styling for new components
  - Style BlueprintSelector component
  - Update Homepage layout for blueprint selector
  - Style migration section in StackForm
  - Style empty states in StackList
  - Ensure responsive design
  - Maintain theme consistency
  - _Requirements: 1.1, 5.1, 8.1, 8.2, 8.3_

- [x] 20. Add accessibility features
  - Ensure keyboard navigation for BlueprintSelector
  - Add ARIA labels to blueprint controls
  - Ensure screen reader support for empty states
  - Add ARIA labels to migration controls
  - Test tab order and focus management
  - Ensure disabled button states are announced
  - _Requirements: 1.1, 5.1, 8.3, 8.4, 8.5_

- [x] 21. Write unit tests for BlueprintSelector
  - Test blueprint dropdown rendering
  - Test onBlueprintChange callback
  - Test action button states
  - Test empty blueprint list handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 22. Write unit tests for modified Homepage
  - Test localStorage persistence
  - Test blueprint selection restoration
  - Test blueprint context propagation
  - Test validation before stack operations
  - _Requirements: 1.5, 3.1, 3.2, 10.1, 10.5_

- [x] 23. Write unit tests for modified StackList
  - Test filtered stack fetching
  - Test empty state rendering
  - Test create button conditional enabling
  - Test blueprint selection change handling
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 8.1, 8.2_

- [x] 24. Write unit tests for modified StackForm
  - Test blueprint picker removal
  - Test blueprint context usage
  - Test migration validation logic
  - Test migration warning display
  - Test migration prevention for incompatible blueprints
  - _Requirements: 4.1, 4.2, 4.3, 5.4, 5.5_

- [x] 25. Write integration tests for blueprint selection flow
  - Test select blueprint → stack list updates
  - Test create stack → stack appears in list
  - Test switch blueprint → stack list changes
  - Test delete blueprint → selection cleared
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.3, 9.1_

- [x] 26. Write integration tests for stack creation flow
  - Test no blueprint selected → create button disabled
  - Test select blueprint → create button enabled
  - Test create stack → stack associated with blueprint
  - Test stack appears in correct blueprint's list
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 9.1_

- [x] 27. Write integration tests for stack migration flow
  - Test open stack in edit mode → migration control visible
  - Test select compatible blueprint → no warnings
  - Test select incompatible blueprint → warnings displayed
  - Test save migration → stack moves to new blueprint
  - Test original blueprint's list updates
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.4_

- [x] 28. Write integration tests for state persistence
  - Test select blueprint → refresh page → selection restored
  - Test create stack → navigate away → return → stack visible
  - Test logout → login → selection cleared (if applicable)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 29. Test edge cases
  - Test last stack in blueprint deleted
  - Test blueprint deleted while selected
  - Test concurrent blueprint modifications
  - Test migration to blueprint then back
  - _Requirements: 2.3, 9.3, 9.4_

- [x] 30. Perform manual testing and validation
  - Test complete user flow from blueprint selection to stack creation
  - Test migration scenarios with various stack types
  - Test error scenarios and recovery paths
  - Test accessibility with keyboard and screen reader
  - Test responsive design on different screen sizes
  - Verify all requirements are met
  - _Requirements: All_
