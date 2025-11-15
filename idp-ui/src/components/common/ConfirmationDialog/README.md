# ConfirmationDialog Component

A modal dialog component for confirming user actions. Extends the `Modal` component with pre-configured buttons and styling for confirmation workflows.

## Purpose

The `ConfirmationDialog` component standardizes confirmation dialogs across the application. It:
- Provides a consistent UI for confirmation prompts
- Supports multiple severity levels (primary, warning, danger)
- Handles loading/processing states
- Manages button variants based on the confirmation type
- Provides accessible modal behavior

## Props

```typescript
interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isProcessing?: boolean;
  width?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}
```

### Props Details

- **`isOpen`** (boolean, required): Whether the dialog is visible
- **`onClose`** (function, required): Called when the dialog should close (cancel button, close icon, or backdrop click)
- **`onConfirm`** (function, required): Called when the confirm button is clicked
- **`title`** (string, required): Dialog title
- **`message`** (string | React.ReactNode, required): Dialog message/content
- **`confirmText`** (string, optional): Text for the confirm button. Defaults to `"Confirm"`
- **`cancelText`** (string, optional): Text for the cancel button. Defaults to `"Cancel"`
- **`variant`** (string, optional): Visual variant - `'primary'`, `'warning'`, or `'danger'`. Defaults to `'primary'`
- **`isProcessing`** (boolean, optional): Whether an async operation is in progress. Disables buttons when true. Defaults to `false`
- **`width`** (string, optional): Dialog width. Defaults to `'400px'`
- **`closeOnBackdropClick`** (boolean, optional): Whether clicking the backdrop closes the dialog. Defaults to `true`
- **`closeOnEscape`** (boolean, optional): Whether pressing Escape closes the dialog. Defaults to `true`

## Usage Examples

### Basic Confirmation

```tsx
import { ConfirmationDialog } from '@/components/common';
import { useState } from 'react';

export function DeleteButton() {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    await deleteItem();
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Delete</button>
      
      <ConfirmationDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
```

### With Processing State

```tsx
export function DeleteButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteItem();
      setIsOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={handleDelete}
      title="Delete Item"
      message="Are you sure?"
      isProcessing={isDeleting}
      variant="danger"
    />
  );
}
```

### Warning Variant

```tsx
<ConfirmationDialog
  isOpen={showWarning}
  onClose={() => setShowWarning(false)}
  onConfirm={handleProceed}
  title="Important Notice"
  message="This action will affect all users. Please proceed with caution."
  confirmText="Proceed"
  cancelText="Go Back"
  variant="warning"
/>
```

### With React Node Content

```tsx
<ConfirmationDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleConfirm}
  title="Confirm Changes"
  message={
    <div>
      <p>You are about to make the following changes:</p>
      <ul>
        <li>Update user permissions</li>
        <li>Reset password</li>
        <li>Disable two-factor authentication</li>
      </ul>
      <p>Continue?</p>
    </div>
  }
  confirmText="Apply Changes"
  variant="warning"
/>
```

### API Key Rotation Example

```tsx
import { ConfirmationDialog, LoadingButton } from '@/components/common';

export function ApiKeyRotateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const handleRotate = async () => {
    setIsRotating(true);
    try {
      await rotateApiKey();
      setIsOpen(false);
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <>
      <LoadingButton 
        isLoading={isRotating}
        onClick={() => setIsOpen(true)}
        variant="warning"
      >
        Rotate Key
      </LoadingButton>

      <ConfirmationDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleRotate}
        title="Rotate API Key"
        message="Rotating your API key will invalidate the current key. Any applications using the old key will need to be updated. This action cannot be undone."
        confirmText="Rotate"
        cancelText="Cancel"
        variant="warning"
        isProcessing={isRotating}
      />
    </>
  );
}
```

### Revoke API Key Example

```tsx
export function ApiKeyRevokeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await revokeApiKey();
      setIsOpen(false);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={handleRevoke}
      title="Revoke API Key"
      message={
        <>
          <p>
            <strong>Warning:</strong> This will permanently revoke the API key.
          </p>
          <p>
            Any applications using this key will immediately lose access.
          </p>
          <p>This action cannot be undone.</p>
        </>
      }
      confirmText="Revoke"
      cancelText="Keep Key"
      variant="danger"
      isProcessing={isRevoking}
    />
  );
}
```

## Variants

### Primary (Default)

Used for general confirmations with no special emphasis.

```tsx
<ConfirmationDialog
  variant="primary"
  confirmText="Confirm"
  message="Are you sure?"
  // ...
/>
```

### Warning

Used for actions that have significant consequences but are reversible.

```tsx
<ConfirmationDialog
  variant="warning"
  confirmText="Proceed"
  message="This action will affect multiple items."
  // ...
/>
```

### Danger

Used for destructive actions that cannot be undone.

```tsx
<ConfirmationDialog
  variant="danger"
  confirmText="Delete"
  message="This action cannot be undone."
  // ...
/>
```

## Styling

The component applies variant-specific styling to the content and buttons:

### CSS Classes

- `.confirmation-dialog`: Main dialog wrapper
- `.confirmation-dialog--primary`: Applied for primary variant
- `.confirmation-dialog--warning`: Applied for warning variant
- `.confirmation-dialog--danger`: Applied for danger variant
- `.confirmation-dialog--processing`: Applied when `isProcessing` is true
- `.confirmation-dialog__content`: The message content wrapper

### Customization

To customize the dialog appearance:

```css
.confirmation-dialog--danger .confirmation-dialog__content {
  color: var(--color-text-danger, #d32f2f);
  font-weight: 500;
}

.confirmation-dialog--processing {
  opacity: 0.9;
}
```

## Accessibility

- Proper ARIA attributes for modal behavior
- Focus management (focus trap within the dialog)
- Keyboard navigation support (Tab, Shift+Tab, Escape)
- Semantic HTML with proper heading hierarchy
- Screen reader announcements for dialog state changes

## Best Practices

1. **Use appropriate variants**: Match the variant to the action severity
   ```tsx
   // Destructive action
   variant="danger"
   
   // Significant but reversible
   variant="warning"
   
   // General confirmation
   variant="primary"
   ```

2. **Provide clear messaging**: Be specific about what will happen
   ```tsx
   // Good
   message="This will delete the API key and all associated logs."
   
   // Vague
   message="Are you sure?"
   ```

3. **Handle processing state**: Always manage the loading state
   ```tsx
   const [isProcessing, setIsProcessing] = useState(false);
   
   const handleConfirm = async () => {
     setIsProcessing(true);
     try {
       await action();
     } finally {
       setIsProcessing(false);
     }
   };
   ```

4. **Combine with feedback components**: Show results after confirmation
   ```tsx
   <ConfirmationDialog {...props} />
   {error && <ErrorMessage message={error} />}
   {success && <SuccessMessage message="Action completed!" />}
   ```

5. **Prevent accidental actions**: Use danger variant for destructive actions
   ```tsx
   <ConfirmationDialog
     variant="danger"
     confirmText="Delete Permanently"
     // ...
   />
   ```

## Testing

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationDialog } from '@/components/common';

it('calls onConfirm when confirm button is clicked', async () => {
  const user = userEvent.setup();
  const handleConfirm = vi.fn();

  render(
    <ConfirmationDialog
      isOpen={true}
      onClose={vi.fn()}
      onConfirm={handleConfirm}
      title="Confirm"
      message="Are you sure?"
    />
  );

  await user.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(handleConfirm).toHaveBeenCalled();
});

it('disables buttons when isProcessing is true', () => {
  render(
    <ConfirmationDialog
      isOpen={true}
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      title="Confirm"
      message="Processing..."
      isProcessing={true}
    />
  );

  expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
});
```

## Related Components

- **`Modal`**: The base modal component that `ConfirmationDialog` extends
- **`LoadingButton`**: Often used with `ConfirmationDialog` to trigger confirmations
- **`ErrorMessage`**: Display errors that occur during confirmation
- **`SuccessMessage`**: Display success feedback after confirmation
