# FormField Component Documentation

## 1. Overview
- **Component name:** `FormField`
- **Purpose:** Standardize label, hint, error, and required indicator layout around arbitrary form controls.
- **Key features:**
  - Automatic label association and optional auto-generated input IDs
  - Accessible error/hint wiring via `aria-describedby`
  - Theme-aware styling with error emphasis
  - Works with any child input/control via React composition

## 2. Import
```tsx
import { FormField } from '../components/common';
```

## 3. Props
```ts
interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactElement;
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | Yes | Visual/accessible label text. |
| `error` | `string` | No | Validation error message; toggles error styling. |
| `hint` | `string` | No | Helper text shown under the control. |
| `required` | `boolean` | No | Displays an asterisk with `aria-label="required"`. |
| `htmlFor` | `string` | No | ID of the child control; if omitted, FormField auto-generates one and injects it into the child. |
| `className` | `string` | No | Additional wrapper class. |
| `children` | `ReactElement` | Yes | Typically an input/control component. |

## 4. Usage Examples
### Basic
```tsx
<FormField label="Key Name" hint="Choose a descriptive name" required>
  <AngryTextBox value={name} onChange={setName} />
</FormField>
```

### Custom IDs
```tsx
<FormField label="Expiration" htmlFor="expirationDays" error={errors.expirationDays}>
  <AngryComboBox
    id="expirationDays"
    items={EXPIRATION_OPTIONS}
    value={expirationDays}
    onChange={setExpirationDays}
  />
</FormField>
```

## 5. Accessibility Notes
- Ensures label `htmlFor` matches control ID; generates IDs when absent.
- Aggregates `hint`/`error` identifiers into `aria-describedby` on the child control without overwriting existing values.
- Error message uses `role="alert"` for immediate SR announcement.
- Required indicator exposes `aria-label="required"`.

## 6. Theming & Styling
- Uses existing CSS variables (`--text-primary`, `--text-secondary`, `--accent-danger`).
- Error state adds a colored border accent via `.form-field--error`.
- Consumers can pass `className` for layout adjustments if necessary.

## 7. Testing Checklist
- Unit tests cover label rendering, required indicator, combined hint/error aria wiring, and auto-generated IDs (see `FormField.test.tsx`).
- Include this component in broader theming/accessibility regression suites once integrated into higher-level forms.

## 8. Migration Guidance
- Replace ad-hoc `.form-field` markup in modals/forms with `FormField` to centralize patterns.
- Remove duplicated hint/error divs after wrapping inputs.
- When migrating, prefer omitting `htmlFor` so the component manages IDs unless a stable identifier is required externally.

## 9. Related Resources
- OpenSpec change: `refactor-reusable-components`
- Spec delta: `openspec/changes/refactor-reusable-components/specs/ui-components/spec.md`
- Design doc section “Component Specifications → FormField”
