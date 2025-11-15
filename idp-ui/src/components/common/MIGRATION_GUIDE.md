# Component Migration Guide

This guide helps developers migrate existing components to use the new reusable common components and create new components following the established patterns.

## Overview

The `idp-ui/src/components/common/` directory contains reusable components that standardize UI patterns across the application. Using these components reduces code duplication, improves consistency, and simplifies maintenance.

## Available Common Components

### Core Components
- **FormField** - Standardized form input layout with labels, hints, and error display
- **Feedback** - Error, success, info, and warning message components
- **LoadingButton** - Button with built-in loading state management
- **ConfirmationDialog** - Modal dialog for confirming user actions
- **MetadataDisplay** - Key-value metadata presentation

## Migration Patterns

### 1. Form Field Migration

#### Before (Custom Implementation)
```tsx
// Old approach with custom CSS
<div className="form-field">
  <label className="form-label">
    API Key Name
    <span className="required">*</span>
  </label>
  <input 
    type="text" 
    className="form-input"
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
  <div className="field-hint">
    Choose a descriptive name for your API key
  </div>
  {error && (
    <div className="error-message">
      {error}
    </div>
  )}
</div>

// CSS in component file
.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}
.field-hint {
  font-size: 12px;
  color: var(--text-secondary);
}
.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px 16px;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
}
```

#### After (Using FormField)
```tsx
// New approach with common component
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

// No custom CSS needed - styles are handled by FormField.css
```

### 2. Error Message Migration

#### Before (Custom Implementation)
```tsx
// Old approach
{error && (
  <div className="error-message">
    {error}
  </div>
)}

// CSS
.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px 16px;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
  font-size: 14px;
}

[data-theme="dark"] .error-message {
  background-color: #4a1a1a;
  color: #ff6b6b;
  border-color: #6a2a2a;
}
```

#### After (Using ErrorMessage)
```tsx
// New approach
import { ErrorMessage } from '@/components/common';

<ErrorMessage message={error} />

// No custom CSS needed - theme-aware styling included
```

### 3. Success Message Migration

#### Before (Custom Implementation)
```tsx
// Old approach
{success && (
  <div className="success-message">
    {success}
  </div>
)}

// CSS
.success-message {
  background-color: #d4edda;
  color: #155724;
  padding: 12px 16px;
  border-radius: 4px;
  border: 1px solid #c3e6cb;
}
```

#### After (Using SuccessMessage)
```tsx
// New approach
import { SuccessMessage } from '@/components/common';

<SuccessMessage message={success} />
```

### 4. Loading Button Migration

#### Before (Custom Implementation)
```tsx
// Old approach
<button 
  className={`btn ${isCreating ? 'loading' : ''}`}
  onClick={handleCreate}
  disabled={isCreating}
>
  {isCreating ? (
    <>
      <span className="spinner"></span>
      Creating...
    </>
  ) : (
    'Create API Key'
  )}
</button>

// CSS
.btn.loading {
  opacity: 0.7;
  cursor: not-allowed;
}
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
```

#### After (Using LoadingButton)
```tsx
// New approach
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

### 5. Confirmation Dialog Migration

#### Before (Custom Modal)
```tsx
// Old approach with custom modal
<Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)}>
  <div className="confirmation-content">
    <h3>Delete API Key?</h3>
    <p>This action cannot be undone.</p>
    <div className="modal-actions">
      <button onClick={() => setShowConfirm(false)}>
        Cancel
      </button>
      <button 
        className="btn-danger"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  </div>
</Modal>

// CSS
.confirmation-content h3 {
  color: var(--text-primary);
  margin-bottom: 16px;
}
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.btn-danger {
  background-color: #dc3545;
  color: white;
}
```

#### After (Using ConfirmationDialog)
```tsx
// New approach
import { ConfirmationDialog } from '@/components/common';

<ConfirmationDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Delete API Key?"
  message="This action cannot be undone."
  confirmText="Delete"
  variant="danger"
  isProcessing={isDeleting}
/>
```

### 6. Metadata Display Migration

#### Before (Custom Implementation)
```tsx
// Old approach
<div className="metadata-section">
  <h4>API Key Details</h4>
  <div className="metadata-grid">
    <div className="metadata-item">
      <span className="metadata-label">Key ID:</span>
      <span className="metadata-value">{keyId}</span>
    </div>
    <div className="metadata-item">
      <span className="metadata-label">Created:</span>
      <span className="metadata-value">{createdDate}</span>
    </div>
    <div className="metadata-item">
      <span className="metadata-label">Status:</span>
      <span className="metadata-value">{status}</span>
    </div>
  </div>
</div>

// CSS
.metadata-section {
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
}
.metadata-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.metadata-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-primary);
}
.metadata-label {
  font-weight: 600;
  color: var(--text-secondary);
}
.metadata-value {
  color: var(--text-primary);
}
```

#### After (Using MetadataDisplay)
```tsx
// New approach
import { MetadataDisplay } from '@/components/common';

<MetadataDisplay 
  title="API Key Details"
  data={{
    'Key ID': keyId,
    'Created': createdDate,
    'Status': status
  }}
/>
```

## Step-by-Step Migration Process

### 1. Identify Migration Opportunities

Look for these patterns in your components:
- Custom form field layouts with labels, hints, and errors
- Error/success/warning message implementations
- Loading states in buttons
- Custom confirmation modals
- Key-value metadata displays

### 2. Plan the Migration

1. **Import the common components** you need
2. **Replace custom implementations** with common components
3. **Remove unused CSS** from component-specific files
4. **Update props and state management** if needed
5. **Test the changes** thoroughly

### 3. Execute the Migration

#### Example: Migrating a Form Component

```tsx
// BEFORE: ApiKeyCreateModal.tsx
import React, { useState } from 'react';
import './ApiKeyCreateModal.css';

export function ApiKeyCreateModal() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="api-key-create-modal">
      <div className="api-key-create-form">
        <div className="form-field">
          <label className="form-label">Name</label>
          <input 
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="field-hint">
            Choose a descriptive name
          </div>
          {error && (
            <div className="error-message">{error}</div>
          )}
        </div>
        
        <button 
          className="create-button"
          disabled={isCreating}
          onClick={handleCreate}
        >
          {isCreating ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  );
}

// AFTER: ApiKeyCreateModal.tsx
import React, { useState } from 'react';
import { FormField, LoadingButton, ErrorMessage } from '@/components/common';

export function ApiKeyCreateModal() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="api-key-create-modal">
      <div className="api-key-create-form">
        <FormField 
          label="Name"
          hint="Choose a descriptive name"
          error={error}
        >
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        
        <LoadingButton 
          isLoading={isCreating}
          loadingText="Creating..."
          onClick={handleCreate}
          isPrimary
        >
          Create
        </LoadingButton>
      </div>
    </div>
  );
}
```

### 4. Clean Up CSS

After migrating, remove the now-unused CSS rules:

```css
/* REMOVE these from ApiKeyCreateModal.css */
.form-field { /* ... */ }
.form-label { /* ... */ }
.field-hint { /* ... */ }
.error-message { /* ... */ }
.create-button { /* ... */ }
```

## Best Practices for New Components

### 1. Use Common Components by Default

When creating new components, start with the common components:

```tsx
// GOOD: Use common components
export function NewFeatureForm() {
  return (
    <form>
      <FormField label="Name" required>
        <input />
      </FormField>
      
      <FormField label="Description" hint="Optional">
        <textarea />
      </FormField>
      
      <LoadingButton isLoading={isSubmitting} type="submit" isPrimary>
        Create
      </LoadingButton>
      
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message="Created successfully!" />}
    </form>
  );
}
```

### 2. Combine Components Effectively

```tsx
// GOOD: Combine components for complete workflows
export function DeleteResourceButton() {
  return (
    <>
      <LoadingButton 
        isLoading={isDeleting}
        onClick={() => setShowConfirm(true)}
        variant="danger"
      >
        Delete
      </LoadingButton>
      
      <ConfirmationDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Resource?"
        message="This action cannot be undone."
        variant="danger"
        isProcessing={isDeleting}
      />
    </>
  );
}
```

### 3. Follow Accessibility Guidelines

Common components already include accessibility features. Ensure you:

- Use semantic HTML with common components
- Provide proper labels and hints
- Don't override accessibility attributes unless necessary

### 4. Customization Guidelines

When you need customization:

```tsx
// GOOD: Use className prop for styling overrides
<FormField 
  label="Special Field"
  className="custom-field"
>
  <input className="custom-input" />
</FormField>

// GOOD: Use style prop for one-off customizations
<ErrorMessage 
  message="Critical error" 
  style={{ fontWeight: 'bold' }}
/>
```

## Testing Migrated Components

### 1. Visual Regression Testing
- Ensure components look the same after migration
- Test across all themes (light, dark, frankenstein)
- Check responsive behavior

### 2. Functional Testing
- Verify all interactions work correctly
- Test loading states and error handling
- Ensure accessibility features are preserved

### 3. Integration Testing
- Test components in their actual usage contexts
- Verify form submissions and API interactions
- Check error handling and success states

## Troubleshooting

### Common Issues and Solutions

#### Issue: Styles not applying after migration
**Solution**: Ensure you're importing the common components correctly and have removed conflicting CSS.

```tsx
// Correct import
import { FormField } from '@/components/common';

// Remove old CSS imports if no longer needed
// import './OldForm.css'; // Remove this
```

#### Issue: TypeScript errors after migration
**Solution**: Check that you're using the correct prop types for common components.

```tsx
// Correct prop usage
<FormField 
  label="Name"           // string
  required={true}        // boolean
  hint="Optional hint"   // string
  error={error}          // string | undefined
>
  <input />              // React.ReactNode
</FormField>
```

#### Issue: Theme support not working
**Solution**: Common components are theme-aware. Ensure you're not overriding theme variables.

```css
/* GOOD: Don't override theme variables */
.custom-field {
  /* Add custom styles, but avoid overriding color variables */
  margin: 16px 0;
}

/* AVOID: Overriding theme variables */
.custom-field .form-field__label {
  color: #123456; /* This breaks theme support */
}
```

## Migration Checklist

- [ ] Identify components that need migration
- [ ] Import required common components
- [ ] Replace custom implementations
- [ ] Remove unused CSS rules
- [ ] Update TypeScript types if needed
- [ ] Test visual appearance across themes
- [ ] Verify functionality and interactions
- [ ] Test accessibility features
- [ ] Update component documentation
- [ ] Run full test suite

## Resources

- [FormField Documentation](./FormField/README.md)
- [Feedback Components Documentation](./Feedback/README.md)
- [LoadingButton Documentation](./LoadingButton/README.md)
- [ConfirmationDialog Documentation](./ConfirmationDialog/README.md)
- [MetadataDisplay Documentation](./MetadataDisplay/README.md)

## Getting Help

If you encounter issues during migration:

1. Check the component documentation for proper usage
2. Look at existing migrated components for examples
3. Test with different themes and screen sizes
4. Verify TypeScript types are correct
5. Run the test suite to catch regressions

Remember: The goal is consistency and maintainability. When in doubt, prefer using the common components over custom implementations.
