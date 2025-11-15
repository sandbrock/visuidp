# MetadataDisplay Component

A component for displaying key-value metadata pairs in a consistent, accessible format. Ideal for displaying API key details, resource information, or any structured metadata.

## Purpose

The `MetadataDisplay` component standardizes the presentation of metadata across the application. It:
- Displays key-value pairs in a semantic definition list (`<dl>`)
- Provides consistent styling and spacing
- Supports theme-aware colors and responsive layout
- Handles various value types (strings, numbers, React components)
- Maintains accessibility with proper HTML semantics

## Props

```typescript
interface MetadataItem {
  label: string;
  value: React.ReactNode;
}

interface MetadataDisplayProps {
  items: MetadataItem[];
  className?: string;
}
```

### Props Details

- **`items`** (MetadataItem[], required): Array of metadata items to display
  - `label`: The metadata label/key
  - `value`: The metadata value (can be string, number, or React component)
- **`className`** (string, optional): Additional CSS classes to apply to the container

## Usage Examples

### Basic Usage

```tsx
import { MetadataDisplay } from '@/components/common';

export function ApiKeyDetails({ apiKey }) {
  return (
    <MetadataDisplay
      items={[
        { label: 'Name', value: apiKey.keyName },
        { label: 'Type', value: apiKey.keyType },
        { label: 'Status', value: apiKey.status },
      ]}
    />
  );
}
```

### With Formatted Values

```tsx
import { MetadataDisplay } from '@/components/common';
import { formatDate } from '@/utils/date';

export function ApiKeyInfo({ apiKey }) {
  return (
    <MetadataDisplay
      items={[
        { label: 'Created', value: formatDate(apiKey.createdAt) },
        { label: 'Expires', value: formatDate(apiKey.expiresAt) },
        { label: 'Last Used', value: apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : 'Never' },
      ]}
    />
  );
}
```

### With React Components as Values

```tsx
import { MetadataDisplay } from '@/components/common';
import { Badge } from '@/components/ui';

export function ResourceMetadata({ resource }) {
  return (
    <MetadataDisplay
      items={[
        { label: 'Name', value: resource.name },
        { label: 'Status', value: <Badge variant={resource.status}>{resource.status}</Badge> },
        { label: 'Owner', value: <strong>{resource.owner}</strong> },
        { label: 'Tags', value: resource.tags.join(', ') },
      ]}
    />
  );
}
```

### In a Modal or Panel

```tsx
import { MetadataDisplay } from '@/components/common';
import { Modal } from '@/components/ui';

export function ResourceDetailsModal({ resource, isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resource Details">
      <MetadataDisplay
        items={[
          { label: 'ID', value: resource.id },
          { label: 'Name', value: resource.name },
          { label: 'Type', value: resource.type },
          { label: 'Created', value: new Date(resource.createdAt).toLocaleDateString() },
          { label: 'Region', value: resource.region },
          { label: 'Environment', value: resource.environment },
        ]}
      />
    </Modal>
  );
}
```

### With Custom Styling

```tsx
import { MetadataDisplay } from '@/components/common';

export function StyledMetadata({ data }) {
  return (
    <MetadataDisplay
      items={data}
      className="custom-metadata-style"
    />
  );
}
```

### Displaying Complex Data

```tsx
import { MetadataDisplay } from '@/components/common';
import { CopyButton } from '@/components/common';

export function ApiKeyDisplay({ apiKey }) {
  return (
    <MetadataDisplay
      items={[
        { label: 'Key ID', value: apiKey.id },
        {
          label: 'Key Value',
          value: (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <code>{apiKey.maskedValue}</code>
              <CopyButton value={apiKey.value} />
            </div>
          ),
        },
        { label: 'Permissions', value: apiKey.permissions.join(', ') },
        { label: 'Rotation Period', value: `${apiKey.rotationDays} days` },
      ]}
    />
  );
}
```

## Styling

The component uses CSS custom properties for theme support and is responsive.

### CSS Classes

- `.metadata-display`: Main container
- `.metadata-display__list`: The definition list (`<dl>`)
- `.metadata-display__item`: Individual metadata item wrapper
- `.metadata-display__label`: The label/key element (`<dt>`)
- `.metadata-display__value`: The value element (`<dd>`)

### CSS Custom Properties

The component respects the following CSS variables:

- `--color-border`: Border color (default: `#e0e0e0`)
- `--color-text-secondary`: Label text color (default: `#666`)
- `--color-text-primary`: Value text color (default: `#333`)
- `--color-border-dark`: Dark mode border color (default: `#444`)
- `--color-text-secondary-dark`: Dark mode label color (default: `#aaa`)
- `--color-text-primary-dark`: Dark mode value color (default: `#e0e0e0`)

### Customization

To customize the appearance, override the CSS classes:

```css
.metadata-display {
  /* Custom container styles */
}

.metadata-display__label {
  /* Custom label styles */
  font-weight: 700;
  text-transform: capitalize;
}

.metadata-display__value {
  /* Custom value styles */
  font-family: monospace;
}
```

## Accessibility

- Uses semantic HTML with `<dl>`, `<dt>`, and `<dd>` elements
- Proper label-value associations for screen readers
- Supports keyboard navigation
- Respects `prefers-color-scheme` for dark mode support

## Responsive Design

The component is responsive and adapts to smaller screens:

- On screens smaller than 640px, labels and values stack vertically
- Labels maintain proper alignment and spacing
- Text wrapping is handled gracefully

## Best Practices

1. **Use meaningful labels**: Labels should be clear and concise
   ```tsx
   { label: 'Created Date', value: date }  // Good
   { label: 'C', value: date }              // Poor
   ```

2. **Format values appropriately**: Process values before passing them
   ```tsx
   { label: 'Size', value: formatBytes(size) }
   { label: 'Date', value: formatDate(date) }
   ```

3. **Handle missing data**: Provide fallback values
   ```tsx
   { label: 'Last Used', value: lastUsed || 'Never' }
   { label: 'Description', value: description || 'No description' }
   ```

4. **Keep labels consistent**: Use consistent terminology across your app
   ```tsx
   // Consistent
   { label: 'Created', value: ... }
   { label: 'Modified', value: ... }
   { label: 'Deleted', value: ... }
   ```

5. **Use React components for complex values**: When values need interactivity
   ```tsx
   {
     label: 'Actions',
     value: (
       <div style={{ display: 'flex', gap: '0.5rem' }}>
         <EditButton />
         <DeleteButton />
       </div>
     )
   }
   ```

## Testing

```tsx
import { render, screen } from '@testing-library/react';
import { MetadataDisplay } from '@/components/common';

it('displays metadata items', () => {
  render(
    <MetadataDisplay
      items={[
        { label: 'Name', value: 'Test API Key' },
        { label: 'Type', value: 'Bearer' },
      ]}
    />
  );

  expect(screen.getByText('Name')).toBeInTheDocument();
  expect(screen.getByText('Test API Key')).toBeInTheDocument();
  expect(screen.getByText('Type')).toBeInTheDocument();
  expect(screen.getByText('Bearer')).toBeInTheDocument();
});

it('renders React components as values', () => {
  render(
    <MetadataDisplay
      items={[
        { label: 'Status', value: <strong data-testid="status">Active</strong> },
      ]}
    />
  );

  expect(screen.getByTestId('status')).toBeInTheDocument();
});
```

## Related Components

- **`FormField`**: For form input layout with labels
- **`ErrorMessage`**: For displaying error information
- **`SuccessMessage`**: For displaying success information
- **`InfoBox`**: For displaying informational content
- **`WarningBox`**: For displaying warning content
