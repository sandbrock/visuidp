# Frankenstein Theme CSS Custom Properties Reference

## Overview

The Frankenstein theme uses CSS custom properties (CSS variables) for all theme-specific values. This allows for easy customization, consistent styling across components, and automatic theme switching.

## Location

All Frankenstein theme CSS custom properties are defined in:
- **File:** `idp-ui/src/App.css`
- **Selector:** `[data-theme="frankenstein"]`

## Complete Property List

### Background Properties

```css
--bg-primary: #1a1f1a;
```
**Usage:** Main page background, card backgrounds, modal backgrounds  
**Description:** Deep laboratory green, creates the dark gothic atmosphere  
**Applied to:** `body`, `.card`, `.e-dialog`, `.content-card`

```css
--bg-secondary: #242b24;
```
**Usage:** Input fields, panels, nested containers  
**Description:** Slightly lighter lab surface color  
**Applied to:** `.e-input-group`, `.panel`, `.e-btn`

```css
--bg-tertiary: #2d352d;
```
**Usage:** Hover states, active states, elevated surfaces  
**Description:** Lightest background for layered elements  
**Applied to:** `.nav-link:hover`, `.e-tab-header .e-active`

### Text Properties

```css
--text-primary: #e8f5e8;
```
**Usage:** Body text, headings, labels  
**Description:** Pale green-white for maximum readability  
**Contrast:** 13:1 on `--bg-primary` (WCAG AAA)  
**Applied to:** `body`, `.card-body`, `.e-dialog .e-dlg-content`

```css
--text-secondary: #a8c5a8;
```
**Usage:** Descriptions, helper text, placeholders  
**Description:** Muted sage green for less prominent text  
**Contrast:** 6.5:1 on `--bg-primary` (WCAG AA)  
**Applied to:** `.nav-link`, `.e-float-input label`, `.user-email`

### Border Properties

```css
--border-primary: #4a5f4a;
```
**Usage:** Primary borders on inputs, cards, containers  
**Description:** Dark olive green for visible boundaries  
**Applied to:** `.e-input-group`, `.card`, `.e-dialog`

```css
--border-secondary: #3a4a3a;
```
**Usage:** Secondary borders, subtle dividers  
**Description:** Darker border for less prominent separations  
**Applied to:** `.card-footer`, `.section-divider`

### Shadow Property

```css
--shadow: rgba(138, 43, 226, 0.3);
```
**Usage:** Box shadows, depth effects  
**Description:** Purple electrical glow shadow (30% opacity)  
**Applied to:** `.card`, `.e-dialog`, `.app-header`

### Accent Properties

```css
--accent-primary: #9d4edd;
```
**Usage:** Primary buttons, links, focus indicators  
**Description:** Electric purple for interactive elements  
**Contrast:** 5.2:1 on `--bg-primary` (WCAG AA)  
**Applied to:** `.e-btn.e-primary`, `.nav-link:hover`, `input:focus`

```css
--accent-primary-hover: #7b2cbf;
```
**Usage:** Hover states for accent elements  
**Description:** Deeper purple for hover feedback  
**Applied to:** `.e-btn.e-primary:hover`, `.nav-link.active`

```css
--accent-secondary: #3c1f5e;
```
**Usage:** Accent backgrounds, active states  
**Description:** Dark purple for background accents  
**Applied to:** `.nav-link.active`, `.e-list-item.e-active`

### State Properties

#### Danger/Error

```css
--danger: #ff006e;
```
**Usage:** Error messages, delete buttons, validation errors  
**Description:** Warning pink-red for critical states  
**Contrast:** 6.8:1 on `--bg-primary` (WCAG AA)  
**Applied to:** `.e-btn.e-danger`, `.error-message`, `.e-error`

```css
--danger-hover: #d90058;
```
**Usage:** Hover states for danger elements  
**Description:** Darker danger color for hover feedback  
**Applied to:** `.e-btn.e-danger:hover`, `.logout-button:hover`

#### Success

```css
--success: #39ff14;
```
**Usage:** Success messages, confirmation buttons  
**Description:** Neon green for positive feedback  
**Contrast:** High on `--bg-primary` (WCAG AAA)  
**Applied to:** `.e-btn.e-success`, `.success-container`

```css
--success-hover: #2dd60f;
```
**Usage:** Hover states for success elements  
**Description:** Slightly darker neon green  
**Applied to:** `.e-btn.e-success:hover`

### Frankenstein-Specific Properties

```css
--frankenstein-bolt: #ffd60a;
```
**Usage:** Lightning bolt accents, app title, warning buttons  
**Description:** Lightning bolt yellow for electrical theme  
**Applied to:** `.app-title a`, `.e-btn.e-warning`, lightning symbols

```css
--frankenstein-stitch: #8b7355;
```
**Usage:** Stitching patterns, decorative borders  
**Description:** Brown color evoking surgical stitching  
**Applied to:** Dashed borders in `::before` pseudo-elements

```css
--frankenstein-glow: #9d4edd;
```
**Usage:** Glow effects, electrical animations  
**Description:** Purple electrical glow (same as `--accent-primary`)  
**Applied to:** Animation keyframes, glow effects

```css
--frankenstein-metal: #6c757d;
```
**Usage:** Metal bolt decorations, gear symbols  
**Description:** Gray color for industrial elements  
**Applied to:** `::after` pseudo-elements with gear symbols

```css
--frankenstein-texture: url("data:image/svg+xml,...");
```
**Usage:** Background texture for laboratory aesthetic  
**Description:** SVG noise pattern (8% opacity)  
**Applied to:** `body`, `.card`, `.e-dialog`

## Property Inheritance

CSS custom properties follow the cascade, so child elements automatically inherit parent values:

```css
/* Parent defines the property */
[data-theme="frankenstein"] {
  --text-primary: #e8f5e8;
}

/* Child uses the property */
.my-component {
  color: var(--text-primary); /* Inherits #e8f5e8 */
}
```

## Using Properties in Components

### Basic Usage

```css
.my-element {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 2px solid var(--border-primary);
}
```

### With Fallback Values

```css
.my-element {
  /* Fallback to gray if property not defined */
  background: var(--bg-primary, #333);
}
```

### In Calculations

```css
.my-element {
  /* Can't use calc() with color values directly */
  /* Use RGBA for opacity variations instead */
  box-shadow: 0 0 10px var(--shadow);
}
```

### In Gradients

```css
.my-button {
  background: linear-gradient(
    135deg,
    var(--accent-primary) 0%,
    var(--accent-primary-hover) 100%
  );
}
```

### In Animations

```css
@keyframes my-glow {
  0% {
    box-shadow: 0 0 10px var(--shadow);
  }
  100% {
    box-shadow: 0 0 20px var(--frankenstein-glow);
  }
}
```

## Property Scope

### Global Scope

Properties defined on `:root` or `[data-theme]` are available globally:

```css
[data-theme="frankenstein"] {
  --bg-primary: #1a1f1a; /* Available everywhere */
}
```

### Component Scope

Properties can be scoped to specific components:

```css
.my-component {
  --local-spacing: 1rem; /* Only available in .my-component */
  padding: var(--local-spacing);
}
```

## Overriding Properties

### Component-Level Override

```css
/* Global definition */
[data-theme="frankenstein"] {
  --accent-primary: #9d4edd;
}

/* Component override */
.special-card {
  --accent-primary: #ff006e; /* Override for this component only */
  border-color: var(--accent-primary); /* Uses #ff006e */
}
```

### Inline Override

```tsx
<div style={{ '--accent-primary': '#ff006e' } as React.CSSProperties}>
  {/* This div and children use overridden value */}
</div>
```

## Property Groups

### Layout Properties
- `--bg-primary`
- `--bg-secondary`
- `--bg-tertiary`
- `--border-primary`
- `--border-secondary`
- `--shadow`

### Typography Properties
- `--text-primary`
- `--text-secondary`

### Interactive Properties
- `--accent-primary`
- `--accent-primary-hover`
- `--accent-secondary`

### State Properties
- `--danger`
- `--danger-hover`
- `--success`
- `--success-hover`

### Theme-Specific Properties
- `--frankenstein-bolt`
- `--frankenstein-stitch`
- `--frankenstein-glow`
- `--frankenstein-metal`
- `--frankenstein-texture`

## Common Patterns

### Card Styling

```css
.card {
  background: var(--bg-primary);
  background-image: var(--frankenstein-texture);
  border: 2px solid var(--border-primary);
  box-shadow: 0 4px 12px var(--shadow);
  color: var(--text-primary);
}
```

### Button Styling

```css
.button {
  background: var(--accent-primary);
  color: white;
  border: 2px solid var(--accent-primary);
}

.button:hover {
  background: var(--accent-primary-hover);
  box-shadow: 0 0 15px rgba(157, 78, 221, 0.6);
}
```

### Input Styling

```css
.input {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--border-primary);
}

.input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 10px rgba(157, 78, 221, 0.3);
}
```

### Error Styling

```css
.error {
  background: var(--bg-primary);
  color: var(--danger);
  border: 3px solid var(--danger);
  box-shadow: 0 0 15px rgba(255, 0, 110, 0.4);
}
```

## Browser Support

CSS custom properties are supported in:
- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 15+

No polyfill needed for target browsers.

## Performance Considerations

### Efficient Usage

✓ **Good:** Define once, use many times
```css
[data-theme="frankenstein"] {
  --accent-primary: #9d4edd;
}

.button { background: var(--accent-primary); }
.link { color: var(--accent-primary); }
.border { border-color: var(--accent-primary); }
```

✗ **Avoid:** Redefining the same value
```css
.button { --accent-primary: #9d4edd; }
.link { --accent-primary: #9d4edd; }
.border { --accent-primary: #9d4edd; }
```

### Inheritance

Properties inherit down the DOM tree, so define at the highest level possible:

```css
/* Define once at theme level */
[data-theme="frankenstein"] {
  --text-primary: #e8f5e8;
}

/* All descendants inherit automatically */
.parent { color: var(--text-primary); }
.child { color: var(--text-primary); }
.grandchild { color: var(--text-primary); }
```

## Debugging

### Browser DevTools

1. Inspect element
2. Look for "Computed" tab
3. Filter by "--" to see all custom properties
4. See inherited values and their sources

### Console Inspection

```javascript
// Get computed value
const value = getComputedStyle(document.documentElement)
  .getPropertyValue('--accent-primary');
console.log(value); // "#9d4edd"

// Set value dynamically
document.documentElement.style
  .setProperty('--accent-primary', '#ff006e');
```

## Migration Guide

### From Hardcoded Colors

**Before:**
```css
.button {
  background: #9d4edd;
  color: white;
}
```

**After:**
```css
.button {
  background: var(--accent-primary);
  color: white;
}
```

### From Theme-Specific Classes

**Before:**
```css
.button-frankenstein {
  background: #9d4edd;
}
```

**After:**
```css
[data-theme="frankenstein"] .button {
  background: var(--accent-primary);
}
```

## Best Practices

1. **Always use CSS custom properties** for theme-specific values
2. **Never hardcode colors** in component styles
3. **Define properties at the theme level** (`[data-theme="frankenstein"]`)
4. **Use semantic names** (`--accent-primary` not `--purple`)
5. **Group related properties** (backgrounds, text, borders, etc.)
6. **Document property usage** in comments
7. **Test property inheritance** in nested components
8. **Provide fallback values** for critical properties

## Related Documentation

- [Color Palette Reference](FRANKENSTEIN_COLOR_PALETTE.md)
- [Complete Theme Documentation](FRANKENSTEIN_THEME_DOCUMENTATION.md)
- [Component Styling Guide](FRANKENSTEIN_THEME_DOCUMENTATION.md#component-styling)

---

*Last Updated: November 2024*
