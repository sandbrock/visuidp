# LoadingButton Component

A button component that extends `AngryButton` with built-in loading state management. Displays a spinner and loading text while an async operation is in progress.

## Purpose

The `LoadingButton` component standardizes the presentation of buttons with loading states across the application. It:
- Automatically disables the button during loading
- Displays a spinner animation
- Shows custom loading text
- Maintains all `AngryButton` styling and variants

## Props

```typescript
interface LoadingButtonProps extends Omit<AngryButtonProps, 'children'> {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}
```

### Props Details

- **`isLoading`** (boolean, required): Whether the button is in loading state
- **`loadingText`** (string, optional): Text to display while loading. Defaults to `"Loading..."`
- **`children`** (React.ReactNode, required): Text to display when not loading
- **All `AngryButton` props** are supported except `children` (e.g., `isPrimary`, `variant`, `size`, `style`, `onClick`, `disabled`, `type`, `className`)

## Usage Examples

### Basic Usage

```tsx
import { LoadingButton } from '@/components/common';
import { useState } from 'react';

export function CreateApiKeyButton() {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createApiKey();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <LoadingButton isLoading={isCreating} onClick={handleCreate} isPrimary>
      Create API Key
    </LoadingButton>
  );
}
```

### With Custom Loading Text

```tsx
<LoadingButton 
  isLoading={isSubmitting} 
  loadingText="Submitting..."
  onClick={handleSubmit}
>
  Submit Form
</LoadingButton>
```

### With Different Variants

```tsx
// Danger variant
<LoadingButton 
  isLoading={isDeleting} 
  loadingText="Deleting..."
  variant="danger"
  onClick={handleDelete}
>
  Delete
</LoadingButton>

// Success variant
<LoadingButton 
  isLoading={isSaving} 
  loadingText="Saving..."
  variant="success"
  onClick={handleSave}
>
  Save Changes
</LoadingButton>
```

### With Size and Style Props

```tsx
<LoadingButton 
  isLoading={isLoading}
  size="small"
  style="outline"
  onClick={handleClick}
>
  Small Outline Button
</LoadingButton>
```

### In a Form Context

```tsx
import { LoadingButton } from '@/components/common';
import { FormField } from '@/components/common';

export function RegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await registerUser(email);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormField label="Email" required>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
        />
      </FormField>
      <LoadingButton 
        isLoading={isSubmitting}
        type="submit"
        isPrimary
      >
        Register
      </LoadingButton>
    </form>
  );
}
```

## Styling

The component uses CSS animations for the spinner. The spinner inherits the text color from the button variant.

### CSS Classes

- `.loading-button`: Main button wrapper
- `.loading-button--loading`: Applied when `isLoading` is true
- `.loading-button__spinner`: The animated spinner element
- `.loading-button__text`: The text content wrapper

### Customization

To customize the spinner appearance, override the animation:

```css
.loading-button__spinner {
  /* Your custom spinner styles */
  width: 1.2em;
  height: 1.2em;
  border-width: 3px;
}

@keyframes loading-button-spin {
  /* Your custom animation */
}
```

## Accessibility

- The spinner has `aria-hidden="true"` to prevent screen readers from announcing it
- The button is properly disabled during loading, preventing accidental double-clicks
- Loading text is announced to screen readers when the state changes

## Best Practices

1. **Always manage loading state**: Use a state variable to track the async operation
   ```tsx
   const [isLoading, setIsLoading] = useState(false);
   ```

2. **Disable related inputs**: When the button is loading, consider disabling related form inputs
   ```tsx
   <input disabled={isLoading} />
   <LoadingButton isLoading={isLoading} />
   ```

3. **Use meaningful loading text**: Be specific about what's happening
   ```tsx
   loadingText="Creating API key..."  // Good
   loadingText="Processing..."        // Less specific
   ```

4. **Handle errors gracefully**: Always ensure loading state is cleared even on error
   ```tsx
   try {
     await apiCall();
   } finally {
     setIsLoading(false);
   }
   ```

5. **Provide feedback**: Combine with success/error messages for complete UX
   ```tsx
   <LoadingButton isLoading={isCreating} onClick={handleCreate} />
   {error && <ErrorMessage message={error} />}
   {success && <SuccessMessage message="Created successfully!" />}
   ```

## Testing

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadingButton } from '@/components/common';

it('disables button and shows loading text', () => {
  render(
    <LoadingButton isLoading={true} loadingText="Saving...">
      Save
    </LoadingButton>
  );

  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByText('Saving...')).toBeInTheDocument();
});

it('calls onClick when clicked and not loading', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();

  render(
    <LoadingButton isLoading={false} onClick={handleClick}>
      Click me
    </LoadingButton>
  );

  await user.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});
```

## Related Components

- **`AngryButton`**: The base button component that `LoadingButton` extends
- **`ConfirmationDialog`**: Often used with `LoadingButton` for confirmation workflows
- **`FormField`**: Commonly used together in forms
