# UI Components Documentation

This document provides an overview of the UI components available in the `idp-ui` project, including the new common reusable components.

## Common Components (`/src/components/common/`)

The common components are reusable, theme-aware UI components that provide consistent patterns across the application.

### FormField

A standardized form input layout with labels, hints, and error display.

```tsx
import { FormField } from '@/components/common';

<FormField 
  label="API Key Name" 
  required
  hint="Choose a descriptive name for your API key"
  error={error}
>
  <input 
    type="text" 
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
</FormField>
```

**Features:**
- Consistent label styling with required indicator
- Optional hint text for additional guidance
- Error message display with theme-aware colors
- Proper accessibility attributes

### Feedback Components

Standardized message components for different types of feedback.

#### ErrorMessage
```tsx
import { ErrorMessage } from '@/components/common';

<ErrorMessage message="Failed to create API key" />
```

#### SuccessMessage
```tsx
import { SuccessMessage } from '@/components/common';

<SuccessMessage message="API key created successfully" />
```

#### InfoBox
```tsx
import { InfoBox } from '@/components/common';

<InfoBox message="This action will affect all users" />
```

#### WarningBox
```tsx
import { WarningBox } from '@/components/common';

<WarningBox message="This action cannot be undone" />
```

**Features:**
- Theme-aware styling for all variants
- Consistent iconography and colors
- Accessible semantic markup
- Responsive design

### LoadingButton

A button component with built-in loading state management.

```tsx
import { LoadingButton } from '@/components/common';

<LoadingButton 
  isLoading={isCreating}
  loadingText="Creating..."
  onClick={handleCreate}
  isPrimary
>
  Create API Key
</LoadingButton>
```

**Features:**
- Automatic disabling during loading
- Spinner animation with loading text
- Inherits all AngryButton styling and variants
- Accessible loading state announcements

### ConfirmationDialog

A modal dialog for confirming user actions with different severity levels.

```tsx
import { ConfirmationDialog } from '@/components/common';

<ConfirmationDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Delete API Key?"
  message="This action cannot be undone."
  variant="danger"
  isProcessing={isDeleting}
/>
```

**Features:**
- Three variants: primary, warning, danger
- Processing state handling
- Accessible modal behavior
- Theme-aware styling

### MetadataDisplay

A component for displaying key-value metadata pairs.

```tsx
import { MetadataDisplay } from '@/components/common';

<MetadataDisplay 
  title="API Key Details"
  data={{
    'Key ID': 'ak_123456789',
    'Created': '2024-01-15',
    'Status': 'Active',
    'Last Used': '2024-01-20'
  }}
/>
```

**Features:**
- Responsive grid layout
- Theme-aware styling
- Automatic alternating row colors
- Accessible table markup

## Legacy Components

### Modal

Base modal component for custom dialogs.

```tsx
import { Modal } from '@/components';

<Modal isOpen={isOpen} onClose={onClose}>
  <div className="custom-content">
    Custom modal content
  </div>
</Modal>
```

### AngryButton

The base button component with multiple variants.

```tsx
import { AngryButton } from '@/components/input';

<AngryButton isPrimary onClick={handleClick}>
  Primary Button
</AngryButton>

<AngryButton variant="danger" onClick={handleDelete}>
  Delete
</AngryButton>
```

**Variants:**
- `isPrimary` - Primary action button
- `variant="danger"` - Destructive action
- `variant="success"` - Positive action
- `variant="warning"` - Warning action
- `style="outline"` - Outline style

### Form Inputs

Various input components for forms.

```tsx
import { 
  AngryTextBox, 
  AngryComboBox, 
  AngryDatePicker,
  AngryCheckBoxGroup 
} from '@/components/input';

<AngryTextBox 
  value={text}
  onChange={setText}
  placeholder="Enter text"
/>

<AngryComboBox 
  options={options}
  value={selected}
  onChange={setSelected}
/>

<AngryDatePicker 
  value={date}
  onChange={setDate}
/>

<AngryCheckBoxGroup 
  options={checkboxOptions}
  selected={selectedItems}
  onChange={setSelectedItems}
/>
```

## Theme Support

All components support the three application themes:

- **Light** - Default light theme
- **Dark** - Dark mode theme
- **Frankenstein** - Special themed design

Components automatically adapt to the current theme using CSS custom properties.

## Accessibility

All components follow accessibility best practices:

- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Semantic HTML markup

## Migration Guide

For detailed migration instructions from legacy components to common components, see the [Migration Guide](./src/components/common/MIGRATION_GUIDE.md).

## Best Practices

1. **Prefer Common Components**: Use common components over custom implementations when possible
2. **Consistent Patterns**: Follow established patterns for forms, feedback, and interactions
3. **Theme Awareness**: Ensure custom styles don't break theme switching
4. **Accessibility First**: Test components with keyboard navigation and screen readers
5. **Responsive Design**: Test components across different screen sizes

## Component Development

When creating new components:

1. Check if a common component already exists
2. Follow the established patterns in common components
3. Include comprehensive documentation
4. Write tests for accessibility and functionality
5. Ensure theme compatibility

## File Structure

```
src/components/
├── common/                    # Reusable common components
│   ├── FormField/            # Form field layout component
│   ├── Feedback/             # Message components (Error, Success, Info, Warning)
│   ├── LoadingButton/        # Button with loading state
│   ├── ConfirmationDialog/   # Confirmation modal
│   ├── MetadataDisplay/      # Key-value display
│   ├── index.ts              # Barrel exports
│   └── MIGRATION_GUIDE.md    # Migration documentation
├── input/                     # Form input components
├── [legacy-components]/      # Existing component files
└── index.ts                   # Component exports
```

## Contributing

When adding new common components:

1. Create a new directory under `common/`
2. Follow the established component structure
3. Include comprehensive documentation
4. Add proper TypeScript types
5. Write tests for functionality and accessibility
6. Update this documentation and the barrel export file

For detailed examples and advanced usage, see the individual component README files in the `common/` directory.
