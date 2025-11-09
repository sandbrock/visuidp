# Design Document

## Overview

This design adds breadcrumb navigation to three admin management pages (Cloud Provider Management, Resource Type Management, and Resource Type Mapping Management) by integrating the existing Breadcrumb component. The implementation follows the pattern already established in the Property Schema Editor component.

## Architecture

### Component Structure

The solution leverages the existing `Breadcrumb` component without modifications:

```
idp-ui/src/components/
├── Breadcrumb.tsx (existing, no changes)
├── Breadcrumb.css (existing, no changes)
├── CloudProviderManagement.tsx (modified)
├── ResourceTypeManagement.tsx (modified)
└── ResourceTypeMappingManagement.tsx (modified)
```

### Navigation Flow

```
Admin Dashboard (/admin)
├── Cloud Provider Management (/admin/cloud-providers)
├── Resource Type Management (/admin/resource-types)
└── Resource Type Mapping Management (/admin/resource-type-mappings)
```

Each management page will display a two-level breadcrumb:
- Level 1: "Admin Dashboard" (clickable, navigates to /admin)
- Level 2: Current page name (non-clickable, current location indicator)

## Components and Interfaces

### Breadcrumb Component (Existing)

The existing `Breadcrumb` component accepts an array of `BreadcrumbItem` objects:

```typescript
interface BreadcrumbItem {
  label: string;
  path?: string;  // Optional: if provided, item is clickable
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}
```

### Management Page Modifications

Each management page will:
1. Import the `Breadcrumb` component
2. Define a static breadcrumb items array
3. Render the breadcrumb at the top of the component, before the existing header

#### Example Integration Pattern

```typescript
import { Breadcrumb } from './Breadcrumb';

export const CloudProviderManagement = ({ user }: CloudProviderManagementProps) => {
  const breadcrumbItems = [
    { label: 'Admin Dashboard', path: '/admin' },
    { label: 'Cloud Provider Management' }
  ];

  return (
    <div className="cloud-provider-management">
      <Breadcrumb items={breadcrumbItems} />
      {/* Existing content */}
    </div>
  );
};
```

## Data Models

No new data models are required. The implementation uses the existing `BreadcrumbItem` interface.

## Error Handling

No specific error handling is required for breadcrumbs. Navigation errors are handled by React Router at the application level.

## Testing Strategy

### Manual Testing

1. Navigate to each admin management page and verify:
   - Breadcrumb displays correctly
   - "Admin Dashboard" link navigates to /admin
   - Current page name is displayed as non-clickable text
   - Visual styling matches Property Schema Editor breadcrumbs

2. Test navigation flow:
   - Start at Admin Dashboard
   - Navigate to each management page
   - Click breadcrumb to return to Admin Dashboard
   - Verify no console errors

### Visual Consistency

Compare breadcrumb appearance across all admin pages:
- Property Schema Editor (existing reference)
- Cloud Provider Management (new)
- Resource Type Management (new)
- Resource Type Mapping Management (new)

Verify consistent:
- Font size and weight
- Colors (light and dark themes)
- Spacing and margins
- Hover states
- Separator styling

## Implementation Notes

### CSS Considerations

The existing `Breadcrumb.css` includes theme-aware styling for both light and dark modes. No CSS modifications are needed.

### Positioning

Breadcrumbs should be placed:
- Inside the main component wrapper div
- Before the existing `.header` div
- With the existing bottom margin from `Breadcrumb.css` (1.5rem)

### Accessibility

The existing Breadcrumb component includes proper ARIA attributes:
- `aria-label="Breadcrumb"` on the nav element
- `aria-current="page"` on the current page indicator

No additional accessibility work is required.
