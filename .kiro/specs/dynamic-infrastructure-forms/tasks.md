# Implementation Plan

- [x] 1. Create PropertySchemaService for fetching and caching schemas
  - Create service class with in-memory caching
  - Implement getSchema method that fetches from backend API
  - Implement cache key generation based on context, resource type, and cloud provider
  - Implement clearCache method for manual cache invalidation
  - Add error handling for API failures
  - _Requirements: 1.1, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Create TypeScript types for property schemas
  - Define PropertySchema interface matching backend DTO structure
  - Define ValidationRules interface for validation rule structure
  - Define PropertySchemaResponse interface for API response
  - Add types to types/admin.ts or create new types/propertySchema.ts
  - _Requirements: 1.1, 1.4, 1.5_

- [x] 3. Add API service methods for fetching property schemas
  - Add getResourceSchemaForBlueprint method to apiService
  - Add getResourceSchemaForStack method to apiService
  - Implement error handling for 404 (no schema) and 500 (server error)
  - Add TypeScript return types
  - _Requirements: 1.1, 9.4, 10.3_

- [x] 4. Create PropertyInput component for individual property rendering
- [x] 4.1 Create base PropertyInput component structure
  - Create component file with props interface
  - Implement property type detection logic
  - Add error display section
  - Add help text display section
  - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 4.2 Implement STRING property rendering
  - Use AngryTextBox for string inputs
  - Apply pattern validation if specified in validation rules
  - Display validation errors inline
  - Support minLength and maxLength validation
  - _Requirements: 1.4, 4.3, 4.4, 13.1, 13.2, 13.3_

- [x] 4.3 Implement NUMBER property rendering
  - Use AngryTextBox with numeric input type
  - Prevent non-numeric character entry
  - Apply min and max validation if specified
  - Display validation errors for out-of-range values
  - Handle both integer and decimal numbers
  - _Requirements: 1.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 4.4 Implement BOOLEAN property rendering
  - Use AngryCheckBox for boolean inputs
  - Display property label next to checkbox
  - Handle true/false values correctly
  - Apply default values if specified
  - _Requirements: 1.4, 7.1, 7.2, 7.3, 7.4_

- [x] 4.5 Implement LIST property rendering
  - Use AngryComboBox when allowedValues are provided in validation rules
  - Populate dropdown with allowed values
  - Display user-friendly labels for options
  - Validate selected value is in allowed values
  - Fallback to AngryTextBox for lists without allowed values
  - _Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4.6 Add theme support to PropertyInput
  - Use CSS variables for all styling
  - Ensure compatibility with light and dark themes
  - Match visual style of existing form inputs
  - Test theme toggling
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 5. Create DynamicResourceForm component
- [x] 5.1 Create component structure and state management
  - Create component file with props interface
  - Implement state for schema, loading, error, and validation errors
  - Add useEffect hook to fetch schema when props change
  - Implement loading state display
  - Implement error state display
  - _Requirements: 1.1, 1.2, 10.2, 10.3_

- [x] 5.2 Implement schema fetching logic
  - Use PropertySchemaService to fetch schema
  - Handle loading state during fetch
  - Handle error state on fetch failure
  - Implement retry mechanism for failed fetches
  - Cache schema using PropertySchemaService
  - _Requirements: 1.1, 9.5, 10.1, 10.4_

- [x] 5.3 Implement property rendering logic
  - Sort properties by displayOrder field
  - Map over properties and render PropertyInput for each
  - Pass property schema, value, onChange, and error to PropertyInput
  - Handle empty schema case (no properties defined)
  - _Requirements: 1.3, 1.4, 1.5, 9.4, 12.1, 12.2_

- [x] 5.4 Implement validation logic
  - Create validateProperty method for single property validation
  - Create validateAll method to validate all properties
  - Check required fields
  - Apply validation rules (min, max, pattern, allowedValues)
  - Return validation errors in Record<string, string> format
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.5 Implement property change handling
  - Create handlePropertyChange method
  - Update values object with new property value
  - Clear validation error for changed property
  - Call onChange prop with updated values
  - _Requirements: 1.1, 13.3_

- [x] 5.6 Implement default value application
  - Apply default values when creating new resources
  - Skip default values when editing existing resources
  - Handle default values for all data types
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5.7 Add theme support to DynamicResourceForm
  - Use CSS variables for form styling
  - Ensure section headers and containers match theme
  - Test with light and dark themes
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 5.8 Add empty state and error state UI
  - Display message when no properties are defined
  - Display error message with retry button on fetch failure
  - Provide guidance for users (contact administrator)
  - _Requirements: 9.4, 12.1, 12.2, 12.3, 12.4_

- [x] 6. Integrate DynamicResourceForm into Infrastructure component
- [x] 6.1 Import DynamicResourceForm component
  - Add import statement for DynamicResourceForm
  - Add import statement for PropertySchemaService if needed
  - _Requirements: 9.1_

- [x] 6.2 Replace hardcoded cloud-specific property forms
  - Remove renderAWSProperties function
  - Remove renderAzureProperties function
  - Remove renderGCPProperties function
  - Remove renderCloudSpecificPropertiesForm function
  - Replace with DynamicResourceForm component in resource form
  - _Requirements: 9.1, 9.2_

- [x] 6.3 Update resource form data handling
  - Ensure cloudSpecificProperties is passed to DynamicResourceForm
  - Update handleResourceFormChange to handle cloudSpecificProperties updates
  - Test that property values are saved correctly
  - _Requirements: 1.1, 9.2_

- [x] 6.4 Test integration with existing Infrastructure component
  - Test creating new Blueprint resource with dynamic properties
  - Test editing existing Blueprint resource
  - Test switching cloud providers (schema changes)
  - Test switching resource types (schema changes)
  - Test form submission with valid data
  - Test form submission with invalid data
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 7. Update StackForm component to use DynamicResourceForm
- [x] 7.1 Integrate DynamicResourceForm into StackForm
  - Import DynamicResourceForm component
  - Replace any hardcoded cloud-specific property forms in StackForm
  - Update stack resource form data handling
  - _Requirements: 9.1, 9.2, 14.2_

- [x] 7.2 Test StackForm integration
  - Test creating new Stack resource with dynamic properties
  - Test editing existing Stack resource
  - Test validation and error handling
  - _Requirements: 14.2, 14.3, 14.4, 14.5_

- [x] 8. Create CSS styles for dynamic form components
  - Create DynamicResourceForm.css with theme-aware styles
  - Create PropertyInput.css with theme-aware styles
  - Use CSS variables for colors, backgrounds, borders
  - Ensure consistent spacing and typography
  - Test with light and dark themes
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 9. Write unit tests for PropertySchemaService
  - Test schema fetching with valid response
  - Test caching behavior (second call uses cache)
  - Test cache key generation
  - Test cache clearing
  - Test error handling for API failures
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 10. Write unit tests for PropertyInput component
  - Test rendering for STRING data type
  - Test rendering for NUMBER data type
  - Test rendering for BOOLEAN data type
  - Test rendering for LIST data type with allowed values
  - Test rendering for LIST data type without allowed values
  - Test value change handling
  - Test validation error display
  - Test help text display
  - Test required field indicator
  - Test disabled state
  - _Requirements: 1.4, 1.5, 2.1, 3.1, 4.1, 6.1, 7.1, 8.1_

- [x] 11. Write unit tests for DynamicResourceForm component
  - Test rendering with empty schema
  - Test rendering with multiple properties
  - Test property sorting by displayOrder
  - Test loading state display
  - Test error state display
  - Test empty state display (no properties defined)
  - Test property value changes
  - Test validation for required fields
  - Test validation for min/max rules
  - Test validation for pattern rules
  - Test default value application
  - Test retry mechanism on fetch failure
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 4.1, 5.1, 9.4, 10.2, 12.1_

- [x] 12. Write integration tests for Infrastructure component
  - Test creating Blueprint resource with dynamic properties
  - Test editing Blueprint resource with dynamic properties
  - Test switching cloud providers updates schema
  - Test switching resource types updates schema
  - Test form submission with valid data
  - Test form submission with invalid data (validation errors)
  - Test error handling when schema fetch fails
  - Test empty state when no schema is defined
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.3, 12.1, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 13. Perform manual testing and refinement
  - Test with various resource types and cloud providers
  - Test all property data types (STRING, NUMBER, BOOLEAN, LIST)
  - Test validation scenarios (required, min/max, pattern)
  - Test theme switching (light to dark and back)
  - Test loading and error states
  - Test empty state (no properties defined)
  - Verify performance (schema caching, rendering speed)
  - Test on different screen sizes (responsive design)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1, 14.1_

- [x] 14. Update documentation
  - Document DynamicResourceForm component usage
  - Document PropertyInput component usage
  - Document PropertySchemaService API
  - Add examples of property schema configuration
  - Update Infrastructure component documentation
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 15. Fix NUMBER property default values to remove quotation marks
  - Update database migration V2__data.sql to store NUMBER default values as JSON numbers instead of JSON strings
  - Change minClusterSize default_value from '"1"' to '1'
  - Change maxClusterSize default_value from '"10"' to '10'
  - Verify other NUMBER properties in the database have correct JSON numeric default values
  - Test that numeric default values display without quotation marks in the UI
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
