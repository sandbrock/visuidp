# Implementation Plan

- [x] 1. Create AngryDatePicker component
  - Implement AngryDatePicker component with floating label behavior
  - Create CSS file with styling consistent with AngryTextBox
  - Support min/max date constraints
  - Handle disabled state
  - _Requirements: 4.1_

- [x] 2. Create AngryCheckBoxGroup component
  - Implement AngryCheckBoxGroup component that renders multiple AngryCheckBox components
  - Support vertical and horizontal layout options
  - Implement group label rendering
  - Handle disabled state for entire group
  - Create CSS file with consistent spacing and layout
  - _Requirements: 4.2_

- [x] 3. Update input components index file
  - Export AngryDatePicker from index.ts
  - Export AngryCheckBoxGroup from index.ts
  - _Requirements: 4.1, 4.2_

- [x] 4. Migrate ApiKeyAuditLogs component
  - Replace date input fields with AngryDatePicker for start date filter
  - Replace date input field with AngryDatePicker for end date filter
  - Update event handlers to work with AngryDatePicker onChange signature
  - Remove custom date input styling
  - Verify filter functionality works correctly
  - _Requirements: 1.1, 2.1, 3.5, 5.1, 5.2, 5.3_

- [x] 5. Migrate Infrastructure component
  - Replace checkbox inputs with AngryCheckBox for cloud provider selection
  - Update event handlers to work with AngryCheckBox onChange signature
  - Remove custom checkbox styling
  - Verify cloud provider selection functionality works correctly
  - _Requirements: 1.3, 2.3, 3.6, 5.1, 5.2, 5.3_

- [x] 6. Migrate StackForm category input
  - Replace text input with datalist with AngryComboBox
  - Update category selection logic to work with AngryComboBox
  - Remove onCategoryInputChange and onCategoryBlurOrEnter handlers
  - Update categoryInput state management
  - Verify category typeahead and selection works correctly
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 5.1, 5.2, 5.3_

- [x] 7. Migrate BlueprintForm cloud provider checkboxes
  - Replace native checkbox inputs with AngryCheckBoxGroup
  - Update handleCloudProviderToggle to work with AngryCheckBoxGroup onChange
  - Remove cloud-provider-checkboxes CSS class and related styles
  - Verify multi-select cloud provider functionality works correctly
  - Verify resource filtering when cloud providers change
  - _Requirements: 1.3, 2.3, 3.2, 5.1, 5.2, 5.3_

- [x] 8. Migrate ResourceTypeMappingManagement component
  - Replace read-only text inputs with AngryTextBox (disabled state)
  - Replace checkbox input with AngryCheckBox for enabled toggle
  - Update event handlers to work with Angry control signatures
  - Remove custom input styling
  - Verify form submission and validation works correctly
  - _Requirements: 1.1, 1.3, 2.1, 2.3, 3.3, 5.1, 5.2, 5.3_

- [x] 9. Migrate PropertySchemaEditor dynamic inputs
  - Replace STRING type input with AngryTextBox
  - Replace NUMBER type input with AngryTextBox (type="number")
  - Replace BOOLEAN type input with AngryCheckBox
  - Update renderDefaultValueInput function to use Angry controls
  - Update event handlers for all input types
  - Verify dynamic property editing works correctly
  - Verify default value handling for all data types
  - _Requirements: 1.1, 1.3, 2.1, 2.3, 3.4, 5.1, 5.2, 5.3_

- [x] 10. Verify all forms maintain functionality
  - Test StackForm: create and edit stack with category selection
  - Test BlueprintForm: create and edit blueprint with cloud provider selection
  - Test ResourceTypeMappingManagement: edit mapping configuration
  - Test PropertySchemaEditor: add and edit properties with different data types
  - Test ApiKeyAuditLogs: filter logs by date range
  - Test Infrastructure: select cloud providers
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11. Verify visual consistency across all forms
  - Check that all text inputs have consistent floating label behavior
  - Check that all dropdowns have consistent styling and filtering
  - Check that all checkboxes have consistent styling
  - Check that all buttons have consistent styling
  - Verify responsive behavior on different screen sizes
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 12. Remove unused native input styling
  - Search for and remove CSS classes specific to native inputs that are no longer used
  - Clean up any orphaned input-related CSS
  - Verify no visual regressions after cleanup
  - _Requirements: 1.5_
