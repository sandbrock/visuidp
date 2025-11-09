# Design Document

## Overview

This design outlines the approach for standardizing all form inputs across the IDP UI to use Angry control components. The migration will be performed systematically, component by component, ensuring that functionality is preserved while achieving visual and code consistency. The design includes creating new Angry controls where needed and updating existing forms to use the standardized components.

## Architecture

### Component Hierarchy

```
idp-ui/src/components/input/
├── AngryButton.tsx (existing)
├── AngryCheckBox.tsx (existing)
├── AngryComboBox.tsx (existing)
├── AngryTextBox.tsx (existing)
├── AngryDatePicker.tsx (new)
├── AngryCheckBoxGroup.tsx (new)
└── index.ts (updated exports)
```

### Migration Strategy

The migration follows a phased approach:

1. **Phase 1: Create Missing Controls** - Build AngryDatePicker and AngryCheckBoxGroup components
2. **Phase 2: Migrate Simple Forms** - Update forms with straightforward input replacements
3. **Phase 3: Migrate Complex Forms** - Update forms with dynamic or conditional inputs
4. **Phase 4: Validation** - Ensure all forms maintain functionality and consistency

## Components and Interfaces

### New Component: AngryDatePicker

A date input control that provides consistent styling with the existing Angry controls.

**Interface:**
```typescript
interface AngryDatePickerProps {
  id: string;
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  min?: string; // Minimum date (YYYY-MM-DD)
  max?: string; // Maximum date (YYYY-MM-DD)
}
```

**Features:**
- Floating label behavior consistent with AngryTextBox
- Native HTML5 date input for browser compatibility
- Consistent styling with other Angry controls
- Support for min/max date constraints

### New Component: AngryCheckBoxGroup

A multi-select checkbox group for selecting multiple options from a list.

**Interface:**
```typescript
interface AngryCheckBoxGroupProps {
  id: string;
  items: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  layout?: 'vertical' | 'horizontal';
}
```

**Features:**
- Renders multiple checkboxes with consistent styling
- Supports vertical or horizontal layout
- Optional group label
- Individual checkbox styling matches AngryCheckBox

## Data Models

### Form Migration Mapping

The following forms require migration:

| Component | Current Inputs | Target Angry Controls | Complexity |
|-----------|---------------|----------------------|------------|
| StackForm | `<input type="text">` (category) | AngryTextBox | Low |
| BlueprintForm | `<input type="checkbox">` (cloud providers) | AngryCheckBoxGroup | Medium |
| ResourceTypeMappingManagement | `<input type="text">` (read-only), `<input type="checkbox">` | AngryTextBox, AngryCheckBox | Medium |
| PropertySchemaEditor | `<input type="text">`, `<input type="number">`, `<input type="checkbox">` | AngryTextBox, AngryCheckBox | High |
| ApiKeyAuditLogs | `<input type="date">` | AngryDatePicker | Low |
| Infrastructure | `<input type="checkbox">` | AngryCheckBox | Low |

### Migration Priority

1. **High Priority**: ApiKeyAuditLogs, Infrastructure (simple replacements)
2. **Medium Priority**: StackForm, ResourceTypeMappingManagement (moderate changes)
3. **Low Priority**: BlueprintForm, PropertySchemaEditor (complex dynamic forms)

## Error Handling

### Migration Validation

Each migrated form must pass the following validation checks:

1. **Visual Consistency**: All inputs match the Angry control styling
2. **Functional Parity**: All existing functionality works as before
3. **Accessibility**: ARIA labels and keyboard navigation are preserved
4. **State Management**: Form state and validation logic remain intact

### Fallback Strategy

If a migration introduces issues:
1. Revert the specific component change
2. Document the issue
3. Create a custom Angry control variant if needed
4. Re-attempt migration with the new variant

## Testing Strategy

### Unit Testing

For each new Angry control:
- Test rendering with various prop combinations
- Test user interactions (typing, clicking, selecting)
- Test disabled states
- Test validation and error states

### Integration Testing

For each migrated form:
- Test form submission with valid data
- Test form validation with invalid data
- Test all user interaction flows
- Test accessibility features (keyboard navigation, screen readers)

### Visual Regression Testing

- Compare screenshots of forms before and after migration
- Ensure consistent spacing, colors, and typography
- Verify responsive behavior across different screen sizes

## Implementation Details

### AngryDatePicker Implementation

The AngryDatePicker will use the native HTML5 date input for maximum browser compatibility while applying custom styling to match other Angry controls.

**Key Features:**
- Floating label that moves up when a date is selected
- Consistent border and focus states
- Support for placeholder text
- Min/max date validation

**Styling Approach:**
- Reuse CSS patterns from AngryTextBox
- Apply custom styling to the date input's calendar icon
- Ensure consistent height and padding with other inputs

### AngryCheckBoxGroup Implementation

The AngryCheckBoxGroup will render multiple AngryCheckBox components in a structured layout.

**Key Features:**
- Flexible layout (vertical or horizontal)
- Optional group label
- Individual checkbox state management
- Consistent spacing between checkboxes

**Styling Approach:**
- Use flexbox for layout control
- Apply consistent spacing using CSS variables
- Support for disabled state on entire group or individual items

### Form Migration Pattern

Each form migration will follow this pattern:

1. **Import Angry Controls**: Add necessary imports from `./input`
2. **Replace Native Inputs**: Swap HTML inputs with Angry controls
3. **Update Event Handlers**: Adjust onChange handlers to match Angry control signatures
4. **Update Styling**: Remove custom input styling, rely on Angry control styles
5. **Test Functionality**: Verify all form behaviors work correctly

### Example Migration: StackForm Category Input

**Before:**
```tsx
<div className="form-group">
  <label htmlFor="category">Category</label>
  <input
    type="text"
    id="category"
    value={categoryInput}
    list="category-options"
    onChange={(e) => onCategoryInputChange(e.target.value)}
    onBlur={onCategoryBlurOrEnter}
    placeholder="Start typing to search categories"
    disabled={!selectedDomainId}
  />
  <datalist id="category-options">
    {categories.map(c => (
      <option key={c.id} value={c.name} />
    ))}
  </datalist>
</div>
```

**After:**
```tsx
<div className="form-group">
  <AngryComboBox
    id="category"
    value={selectedCategoryId || ''}
    onChange={(val: string) => {
      const category = categories.find(c => c.id === val);
      if (category) {
        setCategoryInput(category.name);
        setSelectedCategoryId(category.id);
        setFormData(prev => ({ ...prev, categoryId: category.id }));
      }
    }}
    items={categories.map(c => ({ text: c.name, value: c.id }))}
    placeholder="Category"
    disabled={!selectedDomainId}
  />
</div>
```

**Rationale**: The AngryComboBox already provides typeahead/filtering functionality, making it a better fit than a plain text input with datalist. This simplifies the code and provides a more consistent user experience.

### Example Migration: BlueprintForm Cloud Provider Checkboxes

**Before:**
```tsx
<div className="form-group">
  <label>Supported Cloud Providers *</label>
  <div className="cloud-provider-checkboxes">
    {cloudProviders.map(provider => (
      <label key={provider.id} className="checkbox-label">
        <input
          type="checkbox"
          checked={selectedCloudProviderIds.includes(provider.id)}
          onChange={() => handleCloudProviderToggle(provider.id)}
        />
        <span>{provider.displayName}</span>
      </label>
    ))}
  </div>
</div>
```

**After:**
```tsx
<div className="form-group">
  <AngryCheckBoxGroup
    id="cloudProviders"
    label="Supported Cloud Providers *"
    items={cloudProviders.map(p => ({ value: p.id, label: p.displayName }))}
    selectedValues={selectedCloudProviderIds}
    onChange={setSelectedCloudProviderIds}
    layout="vertical"
  />
</div>
```

**Rationale**: The AngryCheckBoxGroup encapsulates the checkbox list pattern, reducing boilerplate and ensuring consistent styling.

### Example Migration: ApiKeyAuditLogs Date Filters

**Before:**
```tsx
<div className="filter-field">
  <label htmlFor="filter-start-date">Start Date</label>
  <input
    type="date"
    id="filter-start-date"
    value={filterStartDate}
    onChange={(e) => setFilterStartDate(e.target.value)}
  />
</div>
```

**After:**
```tsx
<div className="filter-field">
  <AngryDatePicker
    id="filter-start-date"
    value={filterStartDate}
    onChange={setFilterStartDate}
    placeholder="Start Date"
  />
</div>
```

**Rationale**: The AngryDatePicker provides consistent styling and floating label behavior, matching other form inputs.

## Design Decisions and Rationales

### Decision 1: Create AngryCheckBoxGroup Instead of Using Individual AngryCheckBox

**Rationale**: Multiple forms use checkbox groups for multi-select scenarios. Creating a dedicated component reduces code duplication and ensures consistent layout and spacing.

### Decision 2: Use Native HTML5 Date Input for AngryDatePicker

**Rationale**: Native date inputs provide built-in calendar pickers, localization, and accessibility features. Custom date pickers are complex and often have accessibility issues. By styling the native input, we get the best of both worlds.

### Decision 3: Migrate StackForm Category Input to AngryComboBox

**Rationale**: The current implementation uses a text input with datalist for typeahead. AngryComboBox already provides superior filtering and selection UX, making it a better choice. This also simplifies the component logic.

### Decision 4: Phased Migration Approach

**Rationale**: Migrating all forms at once is risky and difficult to test. A phased approach allows for incremental validation and reduces the chance of introducing bugs.

### Decision 5: Preserve Existing Functionality Over Perfect Consistency

**Rationale**: While consistency is important, breaking existing functionality is unacceptable. If a form has unique requirements that don't fit the standard Angry controls, we'll create a variant or custom solution rather than forcing a poor fit.

## Accessibility Considerations

All Angry controls must maintain or improve accessibility:

- **Keyboard Navigation**: All inputs must be fully keyboard accessible
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Clear focus indicators and logical tab order
- **Error Messaging**: Accessible error announcements
- **Color Contrast**: WCAG AA compliance for all text and interactive elements

## Performance Considerations

- **Bundle Size**: New components should be lightweight and tree-shakeable
- **Render Performance**: Avoid unnecessary re-renders in form components
- **Lazy Loading**: Consider code-splitting for complex forms if needed

## Future Enhancements

Potential future improvements beyond this migration:

1. **AngryMultiSelect**: A multi-select dropdown for selecting multiple items from a large list
2. **AngryRadioGroup**: A radio button group component
3. **AngryTextArea**: An enhanced textarea with character count and auto-resize
4. **Form Validation Library**: Centralized validation logic for all Angry controls
5. **Storybook Documentation**: Interactive documentation for all Angry controls
