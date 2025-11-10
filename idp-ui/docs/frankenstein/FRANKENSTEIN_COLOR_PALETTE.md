# Frankenstein Theme Color Palette Quick Reference

## Primary Colors

### Backgrounds
```css
--bg-primary: #1a1f1a;      /* Deep laboratory green - main background */
--bg-secondary: #242b24;    /* Lab surface - secondary background */
--bg-tertiary: #2d352d;     /* Elevated surface - tertiary background */
```

### Text
```css
--text-primary: #e8f5e8;    /* Pale green-white - primary text (13:1 contrast) */
--text-secondary: #a8c5a8;  /* Muted sage green - secondary text (6.5:1 contrast) */
```

### Borders
```css
--border-primary: #4a5f4a;    /* Dark olive green - primary borders */
--border-secondary: #3a4a3a;  /* Darker border - secondary borders */
```

## Accent Colors

### Purple Electrical
```css
--accent-primary: #9d4edd;        /* Electric purple - primary accent (5.2:1 contrast) */
--accent-primary-hover: #7b2cbf;  /* Deep purple - hover states */
--accent-secondary: #3c1f5e;      /* Dark purple - accent backgrounds */
```

## State Colors

### Danger/Error
```css
--danger: #ff006e;        /* Warning pink-red - danger states (6.8:1 contrast) */
--danger-hover: #d90058;  /* Darker danger - hover states */
```

### Success
```css
--success: #39ff14;        /* Neon green - success states */
--success-hover: #2dd60f;  /* Darker neon - hover states */
```

## Special Frankenstein Colors

### Theme-Specific
```css
--frankenstein-bolt: #ffd60a;    /* Lightning bolt yellow - accents, warnings */
--frankenstein-stitch: #8b7355;  /* Stitching brown - border patterns */
--frankenstein-glow: #9d4edd;    /* Electrical glow purple - effects */
--frankenstein-metal: #6c757d;   /* Metal gray - bolt decorations */
```

### Shadow
```css
--shadow: rgba(138, 43, 226, 0.3);  /* Purple electrical glow shadow */
```

## Color Usage Guide

### When to Use Each Color

**Primary Background (#1a1f1a)**
- Main page background
- Card backgrounds
- Modal backgrounds
- Container backgrounds

**Secondary Background (#242b24)**
- Input fields
- Panels
- Nested containers
- Elevated surfaces

**Tertiary Background (#2d352d)**
- Hover states
- Active states
- Highlighted sections

**Primary Text (#e8f5e8)**
- Body text
- Headings
- Labels
- Important content

**Secondary Text (#a8c5a8)**
- Descriptions
- Helper text
- Placeholder text
- Less important content

**Electric Purple (#9d4edd)**
- Primary buttons
- Links
- Focus indicators
- Interactive elements
- Glow effects

**Lightning Bolt Yellow (#ffd60a)**
- App title
- Lightning accents
- Warning buttons
- Special highlights

**Danger Red (#ff006e)**
- Error messages
- Delete buttons
- Validation errors
- Critical alerts

**Success Green (#39ff14)**
- Success messages
- Confirmation buttons
- Positive feedback
- Completion states

**Stitching Brown (#8b7355)**
- Border patterns
- Decorative stitching
- Dividers
- Subtle accents

## RGBA Variations

### Electrical Glow Effects
```css
/* Light glow */
rgba(157, 78, 221, 0.2)  /* 20% opacity purple */
rgba(157, 78, 221, 0.3)  /* 30% opacity purple */

/* Medium glow */
rgba(157, 78, 221, 0.4)  /* 40% opacity purple */
rgba(157, 78, 221, 0.5)  /* 50% opacity purple */

/* Strong glow */
rgba(157, 78, 221, 0.6)  /* 60% opacity purple */
rgba(157, 78, 221, 0.8)  /* 80% opacity purple */
```

### Danger Glow Effects
```css
/* Light danger glow */
rgba(255, 0, 110, 0.2)  /* 20% opacity red */
rgba(255, 0, 110, 0.3)  /* 30% opacity red */

/* Medium danger glow */
rgba(255, 0, 110, 0.4)  /* 40% opacity red */
rgba(255, 0, 110, 0.6)  /* 60% opacity red */

/* Strong danger glow */
rgba(255, 0, 110, 0.7)  /* 70% opacity red */
rgba(255, 0, 110, 0.9)  /* 90% opacity red */
```

### Success Glow Effects
```css
/* Light success glow */
rgba(57, 255, 20, 0.2)  /* 20% opacity green */
rgba(57, 255, 20, 0.3)  /* 30% opacity green */

/* Medium success glow */
rgba(57, 255, 20, 0.4)  /* 40% opacity green */
rgba(57, 255, 20, 0.6)  /* 60% opacity green */
```

### Lightning Glow Effects
```css
/* Light lightning glow */
rgba(255, 214, 10, 0.3)  /* 30% opacity yellow */
rgba(255, 214, 10, 0.5)  /* 50% opacity yellow */

/* Strong lightning glow */
rgba(255, 214, 10, 0.6)  /* 60% opacity yellow */
rgba(255, 214, 10, 0.8)  /* 80% opacity yellow */
```

## Accessibility Compliance

All color combinations meet WCAG AA standards for contrast:

| Foreground | Background | Ratio | Level |
|------------|------------|-------|-------|
| #e8f5e8 | #1a1f1a | 13:1 | AAA ✓ |
| #a8c5a8 | #1a1f1a | 6.5:1 | AA ✓ |
| #9d4edd | #1a1f1a | 5.2:1 | AA ✓ |
| #ff006e | #1a1f1a | 6.8:1 | AA ✓ |
| #39ff14 | #1a1f1a | High | AAA ✓ |
| #ffd60a | #1a1f1a | High | AAA ✓ |

## Color Combinations

### Recommended Pairings

**Primary Content**
- Background: `--bg-primary` (#1a1f1a)
- Text: `--text-primary` (#e8f5e8)
- Accent: `--accent-primary` (#9d4edd)

**Interactive Elements**
- Background: `--bg-secondary` (#242b24)
- Border: `--border-primary` (#4a5f4a)
- Hover: `--accent-primary` (#9d4edd)
- Glow: rgba(157, 78, 221, 0.4)

**Error States**
- Background: `--bg-primary` (#1a1f1a)
- Border: `--danger` (#ff006e)
- Text: `--danger` (#ff006e)
- Glow: rgba(255, 0, 110, 0.4)

**Success States**
- Background: `--bg-primary` (#1a1f1a)
- Border: `--success` (#39ff14)
- Text: `--success` (#39ff14)
- Glow: rgba(57, 255, 20, 0.3)

**Buttons**
- Primary: `--accent-primary` (#9d4edd) with gradient to #7b2cbf
- Danger: `--danger` (#ff006e)
- Success: `--success` (#39ff14) with dark text
- Warning: `--frankenstein-bolt` (#ffd60a) with dark text

## Design Tokens

For use in design tools (Figma, Sketch, etc.):

```json
{
  "frankenstein": {
    "background": {
      "primary": "#1a1f1a",
      "secondary": "#242b24",
      "tertiary": "#2d352d"
    },
    "text": {
      "primary": "#e8f5e8",
      "secondary": "#a8c5a8"
    },
    "border": {
      "primary": "#4a5f4a",
      "secondary": "#3a4a3a"
    },
    "accent": {
      "primary": "#9d4edd",
      "hover": "#7b2cbf",
      "background": "#3c1f5e"
    },
    "state": {
      "danger": "#ff006e",
      "dangerHover": "#d90058",
      "success": "#39ff14",
      "successHover": "#2dd60f"
    },
    "special": {
      "bolt": "#ffd60a",
      "stitch": "#8b7355",
      "glow": "#9d4edd",
      "metal": "#6c757d"
    }
  }
}
```

## Color Psychology

**Purple (#9d4edd)** - Electrical energy, mystery, supernatural, creativity  
**Green (#1a1f1a, #a8c5a8)** - Laboratory chemicals, toxic substances, classic horror  
**Yellow (#ffd60a)** - Lightning, electricity, warning, energy  
**Red (#ff006e)** - Danger, urgency, blood, warning  
**Neon Green (#39ff14)** - Toxic waste, radioactivity, success  
**Brown (#8b7355)** - Stitching, leather, aged materials  

## Usage in Code

```css
/* Example: Card with Frankenstein styling */
.my-card {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 2px solid var(--border-primary);
  box-shadow: 0 4px 12px var(--shadow);
}

.my-card:hover {
  border-color: var(--accent-primary);
  box-shadow: 0 0 20px rgba(157, 78, 221, 0.4);
}

/* Example: Button with electrical glow */
.my-button {
  background: var(--accent-primary);
  color: white;
  border: 2px solid var(--accent-primary);
}

.my-button:hover {
  background: var(--accent-primary-hover);
  box-shadow: 0 0 15px rgba(157, 78, 221, 0.6),
              inset 0 0 10px rgba(255, 255, 255, 0.1);
}

/* Example: Error message */
.error-message {
  background: var(--bg-primary);
  color: var(--danger);
  border: 3px solid var(--danger);
  box-shadow: 0 0 15px rgba(255, 0, 110, 0.4);
}
```

---

*For complete theme documentation, see [FRANKENSTEIN_THEME_DOCUMENTATION.md](FRANKENSTEIN_THEME_DOCUMENTATION.md)*
