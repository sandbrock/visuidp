# Visual Consistency Verification Checklist

## Testing Instructions
This checklist should be used to manually verify visual consistency across all forms in the IDP UI application.

## Prerequisites
- Development server running on http://localhost:8084/ui/
- Test user account with admin access
- Browser with developer tools (for responsive testing)

---

## 1. Text Input Consistency (AngryTextBox)

### Test: Floating Label Behavior
- [ ] **ApiKeyAuditLogs** - Navigate to Admin > API Key Audit Logs
  - [ ] User Email filter: Label floats on focus
  - [ ] User Email filter: Label floats when value present
  - [ ] Event Type filter: Label floats on focus
  - [ ] Event Type filter: Label floats when value present

- [ ] **StackForm** - Navigate to Development, click "New Stack"
  - [ ] Display Name: Label floats on focus
  - [ ] Display Name: Label floats when typing
  - [ ] Cloud Name: Label floats on focus
  - [ ] Description (multiline): Label floats on focus
  - [ ] Repository URL: Label floats on focus

- [ ] **BlueprintForm** - Navigate to Infrastructure, click "New"
  - [ ] Blueprint Name: Label floats on focus
  - [ ] Description (multiline): Label floats on focus
  - [ ] Resource Name: Label floats on focus (when adding resource)

- [ ] **ResourceTypeMappingManagement** - Navigate to Admin > Resource Type Mappings, click any cell
  - [ ] Resource Type (disabled): Label is floated
  - [ ] Cloud Provider (disabled): Label is floated
  - [ ] Terraform Module Location: Label floats on focus

- [ ] **PropertySchemaEditor** - Navigate from mapping grid, click "Add Property"
  - [ ] Property Name: Label floats on focus
  - [ ] Display Name: Label floats on focus
  - [ ] Description (multiline): Label floats on focus
  - [ ] Default Value: Label floats on focus
  - [ ] Validation rules: Labels float on focus

### Test: Visual Consistency
- [ ] All text inputs have same padding (12px 12px 8px 12px)
- [ ] All text inputs have same font size (14px)
- [ ] All text inputs have same border (1px solid)
- [ ] All text inputs have same border radius (6px)
- [ ] All text inputs have same background color
- [ ] All text inputs have same text color

### Test: Disabled State
- [ ] ResourceTypeMappingManagement: Disabled inputs have opacity 0.6
- [ ] ResourceTypeMappingManagement: Disabled inputs show not-allowed cursor

---

## 2. Dropdown Consistency (AngryComboBox)

### Test: Dropdown Styling
- [ ] **StackForm** - Create new stack
  - [ ] Cloud Provider dropdown: Opens on click
  - [ ] Cloud Provider dropdown: Shows arrow button
  - [ ] Cloud Provider dropdown: Shows clear button when value selected
  - [ ] Domain dropdown: Consistent styling with Cloud Provider
  - [ ] Category dropdown: Consistent styling with Domain
  - [ ] Stack Type dropdown: Consistent styling
  - [ ] Framework dropdown: Consistent styling
  - [ ] Framework Version dropdown: Consistent styling

- [ ] **BlueprintForm** - Create new blueprint
  - [ ] Resource cloud provider dropdown: Consistent styling
  - [ ] All dropdowns have same border, padding, font size

- [ ] **Infrastructure** - Blueprint management
  - [ ] Blueprint dropdown: Consistent styling

### Test: Filtering Behavior
- [ ] **StackForm** - Domain dropdown
  - [ ] Type partial text: Filters items (StartsWith)
  - [ ] Clear button appears when typing
  - [ ] Arrow keys navigate filtered items
  - [ ] Enter selects highlighted item
  - [ ] Escape closes dropdown

- [ ] **StackForm** - Category dropdown
  - [ ] Same filtering behavior as Domain
  - [ ] Disabled when no domain selected

### Test: Dropdown Items
- [ ] All dropdown items have same padding (8px 12px)
- [ ] Hover state shows background change
- [ ] Selected item shows different background
- [ ] Items have border between them
- [ ] Dropdown has max height with scroll

---

## 3. Checkbox Consistency

### Test: Single Checkbox (AngryCheckBox)
- [ ] **StackForm** - "Make this stack public"
  - [ ] Checkbox size: 18px x 18px
  - [ ] Label spacing: 8px gap
  - [ ] Label font size: 14px
  - [ ] Hover shows pointer cursor

- [ ] **ResourceTypeMappingManagement** - "Enable this mapping"
  - [ ] Same checkbox size and styling
  - [ ] Same label spacing and font

- [ ] **PropertySchemaEditor** - "Required Field"
  - [ ] Same checkbox size and styling
  - [ ] Same label spacing and font

### Test: Checkbox Group (AngryCheckBoxGroup)
- [ ] **BlueprintForm** - "Supported Cloud Providers"
  - [ ] Group label: 14px, font-weight 500
  - [ ] Vertical layout with 12px gap
  - [ ] All checkboxes same size (18px)
  - [ ] All labels same font size (14px)
  - [ ] Consistent spacing between items

### Test: Disabled State
- [ ] Disabled checkboxes have opacity 0.6
- [ ] Disabled checkboxes show not-allowed cursor
- [ ] Disabled labels have reduced opacity

---

## 4. Button Consistency (AngryButton)

### Test: Button Variants
- [ ] **StackForm** - Form actions
  - [ ] Cancel button: Outline variant
  - [ ] Save/Update button: Primary variant (blue background)
  - [ ] Both buttons same height
  - [ ] Both buttons same font size (0.875rem)
  - [ ] Both buttons same padding (0.5rem 1rem)

- [ ] **ApiKeyAuditLogs** - Pagination
  - [ ] Small buttons: Reduced padding (0.25rem 0.5rem)
  - [ ] Small buttons: Reduced font size (0.75rem)
  - [ ] Disabled state: Opacity 0.6

- [ ] **PropertySchemaEditor** - Actions
  - [ ] Back button: Outline variant
  - [ ] Preview/Edit button: Outline variant
  - [ ] Add Property button: Primary variant
  - [ ] Edit button: Small variant
  - [ ] Delete button: Small danger variant

### Test: Button States
- [ ] Hover: Slight lift effect (translateY(-1px))
- [ ] Hover: Box shadow appears
- [ ] Active: Returns to original position
- [ ] Disabled: Opacity 0.6, no hover effect
- [ ] Focus: 2px outline with offset

### Test: Button Colors
- [ ] Primary: Blue background (#4a90e2)
- [ ] Success: Green background (#28a745)
- [ ] Warning: Yellow background (#ffc107)
- [ ] Danger: Red background (#dc3545)
- [ ] Outline: Transparent background with border

---

## 5. Date Picker Consistency (AngryDatePicker)

### Test: Date Picker Styling
- [ ] **ApiKeyAuditLogs** - Date filters
  - [ ] Start Date: Same styling as text inputs
  - [ ] Start Date: Floating label behavior
  - [ ] Start Date: Calendar icon visible
  - [ ] End Date: Consistent with Start Date
  - [ ] Both date pickers same height as text inputs

### Test: Date Picker Behavior
- [ ] Click input: Opens native date picker
- [ ] Calendar icon: Clickable, opens picker
- [ ] Label floats when date selected
- [ ] Clear date: Label returns to center
- [ ] Disabled state: Opacity 0.6, icon grayed out

---

## 6. Dark Mode Consistency

### Test: Theme Switching
- [ ] Click theme toggle in header
- [ ] All inputs change background color
- [ ] All text changes color
- [ ] All borders change color
- [ ] Smooth transition (0.3s)

### Test: Dark Mode Components
- [ ] **AngryTextBox**: Dark background, light text
- [ ] **AngryComboBox**: Dark background, light text
- [ ] **AngryComboBox Dropdown**: Dark background, light text
- [ ] **AngryCheckBox**: Visible in dark mode
- [ ] **AngryButton**: Proper contrast in dark mode
- [ ] **AngryDatePicker**: Dark background, light text

### Test: Dark Mode Hover States
- [ ] Dropdown items: Visible hover state
- [ ] Buttons: Visible hover state
- [ ] Checkboxes: Visible focus state

---

## 7. Responsive Behavior

### Test: Mobile View (max-width: 768px)
- [ ] Open browser dev tools
- [ ] Set viewport to 375px width (mobile)
- [ ] **StackForm**: All inputs full width
- [ ] **StackForm**: Form remains usable
- [ ] **BlueprintForm**: Checkbox group wraps properly
- [ ] **ApiKeyAuditLogs**: Filter grid adapts
- [ ] Content padding reduces to 1rem

### Test: Tablet View (768px - 1024px)
- [ ] Set viewport to 768px width
- [ ] All forms remain readable
- [ ] Buttons don't wrap unnecessarily
- [ ] Dropdowns don't overflow

### Test: Desktop View (>1024px)
- [ ] Set viewport to 1920px width
- [ ] Content max-width: 1200px
- [ ] Content centered
- [ ] Forms don't stretch too wide

---

## 8. Accessibility Testing

### Test: Keyboard Navigation
- [ ] **StackForm**: Tab through all inputs in order
- [ ] **StackForm**: Enter submits form
- [ ] **AngryComboBox**: Arrow keys navigate items
- [ ] **AngryComboBox**: Enter selects item
- [ ] **AngryComboBox**: Escape closes dropdown
- [ ] **AngryCheckBox**: Space toggles checkbox
- [ ] **AngryButton**: Enter/Space activates button

### Test: Focus Indicators
- [ ] All inputs show focus indicator
- [ ] Focus indicators visible in light mode
- [ ] Focus indicators visible in dark mode
- [ ] Focus indicators have sufficient contrast

### Test: Screen Reader (Optional)
- [ ] All inputs have associated labels
- [ ] Disabled states announced
- [ ] Required fields announced
- [ ] Error messages announced

---

## 9. Cross-Browser Testing

### Test: Chrome/Edge
- [ ] All forms render correctly
- [ ] All interactions work
- [ ] Date picker uses native control

### Test: Firefox
- [ ] All forms render correctly
- [ ] All interactions work
- [ ] Date picker uses native control

### Test: Safari (if available)
- [ ] All forms render correctly
- [ ] All interactions work
- [ ] Date picker uses native control

---

## 10. Form-Specific Validation

### Test: ApiKeyAuditLogs
- [ ] Date filters work correctly
- [ ] Text filters work correctly
- [ ] Clear filters button resets all inputs
- [ ] Pagination buttons styled consistently

### Test: StackForm
- [ ] All required fields marked with *
- [ ] Category disabled when no domain selected
- [ ] Framework version disabled when no framework selected
- [ ] Public checkbox only shows for API stack types
- [ ] Route path only shows for relevant stack types

### Test: BlueprintForm
- [ ] Cloud provider multi-select works
- [ ] Resources filtered by selected cloud providers
- [ ] Resource forms render correctly
- [ ] Add/Remove resource buttons work

### Test: ResourceTypeMappingManagement
- [ ] Grid cells clickable
- [ ] Modal opens with correct data
- [ ] Read-only fields properly disabled
- [ ] Enable/Disable toggle works

### Test: PropertySchemaEditor
- [ ] Drag and drop reordering works
- [ ] Add property modal opens
- [ ] Edit property modal opens with data
- [ ] Delete confirmation works
- [ ] Preview mode shows form correctly

---

## Summary Checklist

### Visual Consistency
- [ ] All text inputs have consistent floating labels
- [ ] All dropdowns have consistent styling and filtering
- [ ] All checkboxes have consistent styling
- [ ] All buttons have consistent styling
- [ ] All date pickers have consistent styling

### Functional Consistency
- [ ] All forms submit correctly
- [ ] All validations work
- [ ] All interactions are smooth
- [ ] No console errors

### Theme Consistency
- [ ] Light mode looks good
- [ ] Dark mode looks good
- [ ] Theme switching works smoothly

### Responsive Consistency
- [ ] Mobile view works
- [ ] Tablet view works
- [ ] Desktop view works

### Accessibility Consistency
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Labels properly associated

---

## Sign-Off

**Tester Name**: _________________

**Date**: _________________

**Browser(s) Tested**: _________________

**Issues Found**: _________________

**Status**: [ ] PASS  [ ] FAIL

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
