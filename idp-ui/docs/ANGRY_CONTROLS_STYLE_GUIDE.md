# Angry Controls Style Guide

## Quick Reference for Developers

This guide provides quick reference information for using Angry controls consistently across the IDP UI application.

---

## Import Statement

```typescript
import { AngryTextBox, AngryComboBox, AngryCheckBox, AngryCheckBoxGroup, AngryButton, AngryDatePicker } from './input';
```

---

## AngryTextBox

### Basic Usage
```tsx
<AngryTextBox
  id="fieldName"
  value={value}
  onChange={(v) => setValue(v)}
  placeholder="Field Label"
/>
```

### Multiline
```tsx
<AngryTextBox
  id="description"
  value={description}
  onChange={(v) => setDescription(v)}
  placeholder="Description"
  multiline={true}
/>
```

### With Auto-Focus
```tsx
const inputRef = useRef<any>(null);

<AngryTextBox
  id="name"
  value={name}
  onChange={(v) => setName(v)}
  placeholder="Name"
  componentRef={inputRef}
  autoFocus={true}
/>
```

### Disabled
```tsx
<AngryTextBox
  id="readOnly"
  value={value}
  onChange={() => {}}
  placeholder="Read Only"
  disabled={true}
/>
```

### Styling Notes
- Floating label automatically moves on focus/value
- Padding: 12px 12px 8px 12px
- Font size: 14px
- Border radius: 6px
- Uses CSS variables for theming

---

## AngryComboBox

### Basic Usage
```tsx
<AngryComboBox
  id="category"
  value={selectedId}
  onChange={(val: string) => setSelectedId(val)}
  items={items.map(item => ({ text: item.name, value: item.id }))}
  placeholder="Select Category"
/>
```

### Disabled
```tsx
<AngryComboBox
  id="dependent"
  value={value}
  onChange={handleChange}
  items={items}
  placeholder="Select Option"
  disabled={!parentSelected}
/>
```

### Behavior Notes
- StartsWith filtering (not contains)
- Keyboard navigation: Arrow keys, Enter, Escape, Tab
- Clear button appears when value is present
- Arrow button toggles dropdown
- Max dropdown height: 300px with scroll

---

## AngryCheckBox

### Basic Usage
```tsx
<AngryCheckBox
  label="Enable this feature"
  checked={isEnabled}
  onChange={(checked) => setIsEnabled(checked)}
/>
```

### With ID
```tsx
<AngryCheckBox
  id="publicFlag"
  label="Make this public"
  checked={isPublic}
  onChange={(checked) => setIsPublic(checked)}
/>
```

### Disabled
```tsx
<AngryCheckBox
  label="Disabled option"
  checked={false}
  onChange={() => {}}
  disabled={true}
/>
```

### Styling Notes
- Checkbox size: 18px x 18px
- Gap between checkbox and label: 8px
- Label font size: 14px
- Uses browser accent color

---

## AngryCheckBoxGroup

### Basic Usage
```tsx
<AngryCheckBoxGroup
  id="cloudProviders"
  label="Supported Cloud Providers"
  items={providers.map(p => ({ value: p.id, label: p.displayName }))}
  selectedValues={selectedProviderIds}
  onChange={setSelectedProviderIds}
  layout="vertical"
/>
```

### Horizontal Layout
```tsx
<AngryCheckBoxGroup
  id="options"
  items={options}
  selectedValues={selected}
  onChange={setSelected}
  layout="horizontal"
/>
```

### Without Group Label
```tsx
<AngryCheckBoxGroup
  id="features"
  items={features}
  selectedValues={selectedFeatures}
  onChange={setSelectedFeatures}
/>
```

### Styling Notes
- Group label: 14px, font-weight 500
- Vertical layout: flex-direction column
- Horizontal layout: flex-direction row with wrap
- Gap between items: 12px

---

## AngryButton

### Primary Button
```tsx
<AngryButton
  onClick={handleSave}
  isPrimary={true}
>
  Save
</AngryButton>
```

### Outline Button
```tsx
<AngryButton
  onClick={handleCancel}
  style="outline"
>
  Cancel
</AngryButton>
```

### Small Button
```tsx
<AngryButton
  onClick={handleEdit}
  style="small"
>
  Edit
</AngryButton>
```

### Danger Button
```tsx
<AngryButton
  onClick={handleDelete}
  style="danger small"
>
  Delete
</AngryButton>
```

### Submit Button
```tsx
<AngryButton
  type="submit"
  disabled={loading}
  isPrimary={true}
>
  {loading ? 'Saving...' : 'Save'}
</AngryButton>
```

### Available Variants
- `isPrimary={true}` - Blue background
- `style="success"` - Green background
- `style="warning"` - Yellow background
- `style="danger"` - Red background
- `style="outline"` - Transparent with border
- `style="small"` - Reduced size
- `style="flat"` - No background or border

### Styling Notes
- Base padding: 0.5rem 1rem
- Small padding: 0.25rem 0.5rem
- Font size: 0.875rem (small: 0.75rem)
- Border radius: 0.25rem
- Hover: Lift effect with shadow

---

## AngryDatePicker

### Basic Usage
```tsx
<AngryDatePicker
  id="startDate"
  value={startDate}
  onChange={setStartDate}
  placeholder="Start Date"
/>
```

### With Min/Max
```tsx
<AngryDatePicker
  id="endDate"
  value={endDate}
  onChange={setEndDate}
  placeholder="End Date"
  min="2024-01-01"
  max="2024-12-31"
/>
```

### Disabled
```tsx
<AngryDatePicker
  id="lockedDate"
  value={date}
  onChange={() => {}}
  placeholder="Locked Date"
  disabled={true}
/>
```

### Styling Notes
- Same styling as AngryTextBox
- Floating label behavior
- Native HTML5 date input
- Calendar icon styled with opacity transitions

---

## Form Layout Best Practices

### Standard Form Group
```tsx
<div className="form-group">
  <AngryTextBox
    id="name"
    value={name}
    onChange={setName}
    placeholder="Name *"
  />
</div>
```

### Form Group with Label (for non-floating controls)
```tsx
<div className="form-group">
  <label htmlFor="options">Options</label>
  <AngryCheckBoxGroup
    id="options"
    items={options}
    selectedValues={selected}
    onChange={setSelected}
  />
</div>
```

### Form Actions
```tsx
<div className="form-actions">
  <AngryButton
    onClick={onCancel}
    disabled={loading}
    style="outline"
  >
    Cancel
  </AngryButton>
  <AngryButton
    type="submit"
    disabled={loading}
    isPrimary={true}
  >
    {loading ? 'Saving...' : 'Save'}
  </AngryButton>
</div>
```

---

## CSS Variables Reference

### Background Colors
- `--bg-primary` - Main background
- `--bg-secondary` - Input backgrounds
- `--bg-tertiary` - Hover states

### Text Colors
- `--text-primary` - Main text
- `--text-secondary` - Labels, hints

### Border Colors
- `--border-primary` - Main borders
- `--border-secondary` - Subtle borders

### Accent Colors
- `--accent-primary` - Focus, active states
- `--accent-secondary` - Selected items

### Status Colors
- `--danger` - Errors, delete actions

---

## Common Patterns

### Dependent Dropdowns
```tsx
// Parent dropdown
<AngryComboBox
  id="domain"
  value={selectedDomainId || ''}
  onChange={(val: string) => {
    setSelectedDomainId(val || null);
    setSelectedCategoryId(null); // Reset dependent
  }}
  items={domains.map(d => ({ text: d.name, value: d.id }))}
  placeholder="Domain"
/>

// Dependent dropdown
<AngryComboBox
  id="category"
  value={selectedCategoryId || ''}
  onChange={(val: string) => setSelectedCategoryId(val || null)}
  items={categories.map(c => ({ text: c.name, value: c.id }))}
  placeholder="Category"
  disabled={!selectedDomainId}
/>
```

### Conditional Fields
```tsx
{stackType === StackType.RESTFUL_API && (
  <div className="form-group">
    <AngryTextBox
      id="routePath"
      value={routePath}
      onChange={setRoutePath}
      placeholder="Route Path *"
    />
  </div>
)}
```

### Multi-Select with Filtering
```tsx
// Store selected IDs
const [selectedIds, setSelectedIds] = useState<string[]>([]);

// Use AngryCheckBoxGroup
<AngryCheckBoxGroup
  id="providers"
  label="Cloud Providers *"
  items={providers.map(p => ({ value: p.id, label: p.displayName }))}
  selectedValues={selectedIds}
  onChange={setSelectedIds}
  layout="vertical"
/>

// Filter other data based on selection
const filteredItems = items.filter(item => 
  selectedIds.includes(item.providerId)
);
```

---

## Accessibility Guidelines

### Always Provide Labels
```tsx
// Good - floating label
<AngryTextBox
  id="name"
  value={name}
  onChange={setName}
  placeholder="Name"
/>

// Good - explicit label for checkbox group
<AngryCheckBoxGroup
  id="options"
  label="Select Options"
  items={options}
  selectedValues={selected}
  onChange={setSelected}
/>
```

### Mark Required Fields
```tsx
<AngryTextBox
  id="email"
  value={email}
  onChange={setEmail}
  placeholder="Email *"
/>
```

### Provide Help Text
```tsx
<div className="form-group">
  <AngryTextBox
    id="routePath"
    value={routePath}
    onChange={setRoutePath}
    placeholder="Route Path *"
  />
  <small className="form-text text-muted">
    The route path must start and end with a forward slash (e.g., /my-route-path/).
  </small>
</div>
```

---

## Testing Checklist

When adding a new form with Angry controls:

- [ ] All text inputs use AngryTextBox
- [ ] All dropdowns use AngryComboBox
- [ ] All checkboxes use AngryCheckBox or AngryCheckBoxGroup
- [ ] All buttons use AngryButton
- [ ] All date inputs use AngryDatePicker
- [ ] Floating labels work correctly
- [ ] Disabled states work correctly
- [ ] Form submits correctly
- [ ] Keyboard navigation works
- [ ] Dark mode looks good
- [ ] Mobile view works
- [ ] No TypeScript errors
- [ ] No console errors

---

## Migration from Native Inputs

### Before (Native Input)
```tsx
<div className="form-group">
  <label htmlFor="name">Name</label>
  <input
    type="text"
    id="name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Enter name"
  />
</div>
```

### After (AngryTextBox)
```tsx
<div className="form-group">
  <AngryTextBox
    id="name"
    value={name}
    onChange={(v) => setName(v)}
    placeholder="Name"
  />
</div>
```

### Before (Native Select)
```tsx
<div className="form-group">
  <label htmlFor="category">Category</label>
  <select
    id="category"
    value={categoryId}
    onChange={(e) => setCategoryId(e.target.value)}
  >
    <option value="">Select...</option>
    {categories.map(c => (
      <option key={c.id} value={c.id}>{c.name}</option>
    ))}
  </select>
</div>
```

### After (AngryComboBox)
```tsx
<div className="form-group">
  <AngryComboBox
    id="category"
    value={categoryId}
    onChange={(val: string) => setCategoryId(val)}
    items={categories.map(c => ({ text: c.name, value: c.id }))}
    placeholder="Category"
  />
</div>
```

---

## Support

For questions or issues with Angry controls:
1. Check this style guide
2. Review existing forms for examples
3. Check component source code in `src/components/input/`
4. Review visual consistency documentation

---

**Last Updated**: November 7, 2025  
**Version**: 1.0
