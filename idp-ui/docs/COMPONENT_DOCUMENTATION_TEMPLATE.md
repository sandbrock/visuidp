# Component Documentation Template

> Copy this file when documenting a reusable component. Keep descriptions concise and emphasize TypeScript props, accessibility, theming, and migration notes.

## 1. Overview
- **Component name:** `ComponentName`
- **Purpose:** Brief description of the problem it solves.
- **Key features:**
  - Feature 1
  - Feature 2
  - Feature 3

## 2. Import
```tsx
import { ComponentName } from '../components/common';
```

## 3. Props
```ts
interface ComponentNameProps {
  // Document every prop with comments
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `exampleProp` | `string` | Yes | Short explanation |

## 4. Usage Examples
### Basic
```tsx
<ComponentName exampleProp="value">
  {/* children */}
</ComponentName>
```

### Advanced
```tsx
<ComponentName exampleProp="value" optionalProp={42} />
```

## 5. Accessibility Notes
- Roles / aria attributes
- Keyboard interactions
- Screen reader considerations

## 6. Theming & Styling
- CSS variables used
- Customization hooks (className, style, etc.)

## 7. Testing Checklist
- Unit tests covering key states
- Theming / visual regression tests
- Accessibility tests (if applicable)

## 8. Migration Guidance
- Components or patterns this replaces
- Step-by-step migration tips
- Known gotchas

## 9. Related Resources
- Links to specs, design docs, or other components
