# Design Document: Frankenstein Halloween Theme

## Overview

This design document outlines the implementation of a Frankenstein's monster-themed visual experience for the IDP application. The theme transforms the application's appearance to evoke the iconic character from classic Universal monster films, featuring the monster's greenish skin tone, prominent surgical stitching, metallic neck bolts, and gothic laboratory aesthetics while maintaining full usability and accessibility. The design leverages the existing theme system architecture, extending it with a third theme option alongside the current light and dark themes.

The Frankenstein theme emphasizes the "stitched together" nature of the multi-technology platform through character-authentic visual elements: surgical stitching patterns representing how components are sewn together, metallic bolt decorations symbolizing the connections between systems, greenish-gray color palettes inspired by the monster's iconic appearance, and rough, patched textures that evoke the creature's assembled nature. This creates an immediately recognizable Frankenstein's monster aesthetic that judges will instantly connect to the hackathon category.

## Architecture

### Theme System Extension

The existing theme system uses:
- **ThemeContext**: React context managing theme state with localStorage persistence
- **CSS Custom Properties**: Theme-specific variables defined in `App.css` under `[data-theme="light"]` and `[data-theme="dark"]` selectors
- **ThemeToggle Component**: UI control for switching themes

The Frankenstein theme will extend this system by:
1. Adding `'frankenstein'` as a third theme type in the ThemeContext
2. Defining a new `[data-theme="frankenstein"]` CSS selector with custom properties
3. Enhancing the ThemeToggle component to cycle through three themes
4. Maintaining backward compatibility with existing light/dark theme preferences

### Theme Switching Flow

```
User clicks ThemeToggle
  ↓
ThemeContext updates state: light → dark → frankenstein → light
  ↓
localStorage persists new theme value
  ↓
document.documentElement.setAttribute('data-theme', 'frankenstein')
  ↓
CSS custom properties update via [data-theme="frankenstein"] selector
  ↓
All components re-render with new theme variables
  ↓
Smooth 400ms transition applied to color changes
```

## Components and Interfaces

### 1. ThemeContext Updates

**File**: `idp-ui/src/contexts/ThemeContext.tsx`

**Changes**:
- Extend `Theme` type: `type Theme = 'light' | 'dark' | 'frankenstein';`
- Update `toggleTheme` function to cycle through three themes
- Maintain localStorage compatibility (existing preferences remain valid)

**Interface**:
```typescript
type Theme = 'light' | 'dark' | 'frankenstein';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void; // Add explicit setter for direct theme selection
}
```

### 2. ThemeToggle Component Enhancement

**File**: `idp-ui/src/components/ThemeToggle.tsx`

**Changes**:
- Update icon display logic to show three states:
  - Light: ☀️ (sun)
  - Dark: 🌙 (moon)
  - Frankenstein: 🧟 (zombie/monster) or ⬢ (bolt/hex)
- Update aria-label to reflect three-way toggle
- Add visual feedback for Frankenstein theme selection

**Visual Design**:
- Maintain circular button shape
- Add subtle greenish glow on hover when in Frankenstein mode
- Rotate icon on theme change for smooth transition
- Use bolt icon (⬢) to represent the iconic neck bolts

### 3. CSS Custom Properties (Theme Variables)

**File**: `idp-ui/src/App.css`

**New Selector**: `[data-theme="frankenstein"]`

**Color Palette**:
```css
[data-theme="frankenstein"] {
  /* Primary backgrounds - inspired by monster's greenish skin and laboratory */
  --bg-primary: #1a1d1a;           /* Dark gray-green laboratory */
  --bg-secondary: #252b25;         /* Slightly lighter surface */
  --bg-tertiary: #2f362f;          /* Elevated surfaces */
  
  /* Text colors - pale, corpse-like tones */
  --text-primary: #d4e4d4;         /* Pale greenish-white (like dead skin) */
  --text-secondary: #9db89d;       /* Muted sage green */
  
  /* Borders - stitching and metal accents */
  --border-primary: #4a5a4a;       /* Dark olive green */
  --border-secondary: #3a453a;     /* Darker border variant */
  
  /* Shadows - dark, dramatic laboratory lighting */
  --shadow: rgba(0, 0, 0, 0.5);    /* Deep shadows */
  
  /* Accent colors - monster's greenish skin tone */
  --accent-primary: #7a9b7a;       /* Greenish skin tone */
  --accent-primary-hover: #5f7d5f; /* Deeper green */
  --accent-secondary: #3d4f3d;     /* Dark green background */
  
  /* Danger states - blood red */
  --danger: #8b0000;               /* Dark blood red */
  --danger-hover: #660000;         /* Darker blood red */
  
  /* Success states - sickly green */
  --success: #6b8e23;              /* Olive drab green */
  --success-hover: #556b2f;        /* Darker olive */
  
  /* Special Frankenstein-specific variables */
  --frankenstein-skin: #8ba888;    /* Monster's greenish skin color */
  --frankenstein-stitch: #2d2520;  /* Dark brown/black surgical stitching */
  --frankenstein-bolt: #7a7d7a;    /* Metallic gray neck bolts */
  --frankenstein-scar: #6d7a6d;    /* Scar tissue color */
  --frankenstein-metal: #4a4d4a;   /* Dark metal/iron */
}
```

### 4. Special Visual Effects

**Surgical Stitching Pattern**:
- Applied prominently to section dividers and card borders
- Implemented using CSS pseudo-elements with visible dashed/dotted borders
- Dark brown/black color (#2d2520) to evoke surgical stitching
- Cross-stitch pattern using X marks or dashed lines

**Neck Bolt Decorations**:
- Metallic bolt/rivet elements placed at corners of cards and headers
- Implemented using CSS pseudo-elements or Unicode characters (⬢, ●)
- Gray metallic color (#7a7d7a) to represent the iconic neck bolts
- Subtle 3D effect with shadows to make bolts appear raised

**Scar Tissue Effects**:
- Irregular border patterns on hover states
- Implemented using jagged or uneven borders
- Lighter green color (#6d7a6d) to represent scar tissue
- Applied to interactive elements to emphasize "patched together" aesthetic

**Skin Texture**:
- Subtle rough texture on backgrounds
- Implemented using CSS background-image with noise or canvas pattern
- Greenish tint to evoke the monster's skin tone
- Low opacity (8-12%) to add depth without overwhelming content

**Angular Shapes**:
- Slightly squared-off corners on some elements
- Reminiscent of the flat-top head silhouette
- Applied to headers and major containers

## Data Models

No new data models required. The theme preference is stored as a string in localStorage:

```typescript
// Stored in localStorage
{
  "theme": "frankenstein" | "light" | "dark"
}
```

## Detailed Component Styling

### Header Component

**File**: `idp-ui/src/components/Header.css`

**Frankenstein-specific styles**:
```css
[data-theme="frankenstein"] .app-header {
  background: var(--bg-primary);
  border-bottom: 3px solid var(--frankenstein-stitch);
  box-shadow: 0 4px 12px var(--shadow);
  position: relative;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

/* Prominent stitching effect on header border */
[data-theme="frankenstein"] .app-header::after {
  content: '';
  position: absolute;
  bottom: -3px;
  left: 0;
  right: 0;
  height: 3px;
  background: repeating-linear-gradient(
    90deg,
    var(--frankenstein-stitch) 0px,
    var(--frankenstein-stitch) 8px,
    transparent 8px,
    transparent 12px
  );
}

/* Neck bolts in header corners */
[data-theme="frankenstein"] .app-header::before {
  content: '⬢';
  position: absolute;
  top: 50%;
  left: 20px;
  transform: translateY(-50%);
  font-size: 16px;
  color: var(--frankenstein-bolt);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

[data-theme="frankenstein"] .app-title a {
  color: var(--frankenstein-skin);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

[data-theme="frankenstein"] .nav-link {
  color: var(--text-secondary);
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

[data-theme="frankenstein"] .nav-link:hover {
  color: var(--frankenstein-skin);
  border-color: var(--frankenstein-stitch);
  background: var(--bg-secondary);
}

[data-theme="frankenstein"] .nav-link.active {
  color: var(--text-primary);
  background: var(--accent-secondary);
  border: 1px solid var(--frankenstein-stitch);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}
```

### Button Components

**File**: `idp-ui/src/components/input/AngryButton.css`

**Frankenstein-specific styles**:
```css
[data-theme="frankenstein"] .e-btn {
  border: 2px solid var(--frankenstein-stitch);
  transition: all 0.3s ease;
  position: relative;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* Visible stitching on buttons */
[data-theme="frankenstein"] .e-btn::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  bottom: 4px;
  border: 1px dashed var(--frankenstein-stitch);
  border-radius: inherit;
  pointer-events: none;
}

/* Bolt decorations on buttons */
[data-theme="frankenstein"] .e-btn::after {
  content: '●';
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 8px;
  color: var(--frankenstein-bolt);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

[data-theme="frankenstein"] .e-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--frankenstein-skin);
  box-shadow: 0 4px 8px var(--shadow);
  transform: translateY(-2px);
}

[data-theme="frankenstein"] .e-btn.e-primary {
  background: var(--accent-primary);
  border-color: var(--frankenstein-stitch);
  color: var(--bg-primary);
  font-weight: 600;
}

[data-theme="frankenstein"] .e-btn.e-primary:hover {
  background: var(--accent-primary-hover);
  box-shadow: 0 4px 12px var(--shadow),
              inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

[data-theme="frankenstein"] .e-btn.e-danger {
  background: var(--danger);
  border-color: var(--frankenstein-stitch);
  color: var(--text-primary);
}

[data-theme="frankenstein"] .e-btn.e-danger:hover {
  background: var(--danger-hover);
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.5);
}
```

### Input Components

**File**: `idp-ui/src/components/input/AngryTextBox.css`

**Frankenstein-specific styles**:
```css
[data-theme="frankenstein"] .e-input-group,
[data-theme="frankenstein"] .e-float-input input,
[data-theme="frankenstein"] .e-float-input textarea {
  background: var(--bg-secondary);
  border: 2px solid var(--frankenstein-stitch);
  color: var(--text-primary);
  transition: all 0.3s ease;
}

[data-theme="frankenstein"] .e-input-group:focus-within,
[data-theme="frankenstein"] .e-float-input:focus-within {
  border-color: var(--frankenstein-skin);
  background: var(--bg-tertiary);
  box-shadow: 0 2px 8px var(--shadow),
              inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

[data-theme="frankenstein"] .e-float-input label {
  color: var(--text-secondary);
  font-weight: 500;
}

[data-theme="frankenstein"] .e-float-input.e-input-focus label,
[data-theme="frankenstein"] .e-float-input.e-valid-input label {
  color: var(--frankenstein-skin);
}
```

### Card and Container Components

**Global card styling**:
```css
[data-theme="frankenstein"] .card,
[data-theme="frankenstein"] .content-card,
[data-theme="frankenstein"] .form-container {
  background: var(--bg-primary);
  border: 3px solid var(--frankenstein-stitch);
  border-radius: 4px;
  box-shadow: 0 6px 16px var(--shadow);
  position: relative;
  padding: 1.5rem;
}

/* Prominent stitching effect on cards */
[data-theme="frankenstein"] .card::before,
[data-theme="frankenstein"] .content-card::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  bottom: 10px;
  border: 2px dashed var(--frankenstein-stitch);
  border-radius: 2px;
  pointer-events: none;
  opacity: 0.6;
}

/* Neck bolt decorations in corners */
[data-theme="frankenstein"] .card::after,
[data-theme="frankenstein"] .content-card::after {
  content: '⬢';
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 14px;
  color: var(--frankenstein-bolt);
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

/* Additional bolt in opposite corner for symmetry */
[data-theme="frankenstein"] .card,
[data-theme="frankenstein"] .content-card {
  background-image: 
    radial-gradient(circle at 8px 8px, var(--frankenstein-bolt) 3px, transparent 3px);
  background-repeat: no-repeat;
  background-position: left 8px top 8px;
}
```

### Loading States

**File**: `idp-ui/src/components/Loading.css`

**Frankenstein-specific animation**:
```css
[data-theme="frankenstein"] .loading-spinner {
  border: 4px solid var(--bg-tertiary);
  border-top: 4px solid var(--frankenstein-skin);
  border-right: 4px solid var(--frankenstein-bolt);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: frankenstein-spin 1.2s linear infinite;
  box-shadow: 0 4px 12px var(--shadow);
}

@keyframes frankenstein-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Stitched loading indicator */
[data-theme="frankenstein"] .loading-text {
  color: var(--frankenstein-skin);
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
}

[data-theme="frankenstein"] .loading-text::after {
  content: '...';
  animation: loading-dots 1.5s steps(3, end) infinite;
}

@keyframes loading-dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}
```

### Modal/Dialog Components

**Syncfusion dialog overrides**:
```css
[data-theme="frankenstein"] .e-dialog {
  background: var(--bg-primary);
  border: 4px solid var(--frankenstein-stitch);
  border-radius: 4px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.8);
}

[data-theme="frankenstein"] .e-dialog .e-dlg-header {
  background: var(--bg-secondary);
  border-bottom: 3px solid var(--frankenstein-stitch);
  color: var(--frankenstein-skin);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
}

/* Bolt decoration on dialog header */
[data-theme="frankenstein"] .e-dialog .e-dlg-header::before {
  content: '⬢';
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--frankenstein-bolt);
  font-size: 14px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

[data-theme="frankenstein"] .e-dialog .e-dlg-content {
  color: var(--text-primary);
  background: var(--bg-primary);
}
```

## Error Handling

### Accessibility Compliance

All Frankenstein theme colors must meet WCAG AA standards:

**Contrast Ratios**:
- Text primary (#d4e4d4) on bg-primary (#1a1d1a): ~11.5:1 ✓
- Text secondary (#9db89d) on bg-primary (#1a1d1a): ~6.2:1 ✓
- Accent primary (#7a9b7a) on bg-primary (#1a1d1a): ~4.8:1 ✓
- Frankenstein skin (#8ba888) on bg-primary (#1a1d1a): ~5.5:1 ✓
- Danger (#8b0000) on text-primary (#d4e4d4): ~5.1:1 ✓

**Fallback Handling**:
- If localStorage is unavailable, default to 'light' theme
- If invalid theme value is stored, reset to 'light'
- Graceful degradation if CSS custom properties are unsupported (very old browsers)

### Theme Persistence Edge Cases

```typescript
// In ThemeContext
const [theme, setTheme] = useState<Theme>(() => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'frankenstein') {
      return saved as Theme;
    }
  } catch (error) {
    console.warn('Failed to load theme preference:', error);
  }
  return 'light'; // Safe default
});
```

## Testing Strategy

### Visual Testing

1. **Cross-browser compatibility**:
   - Test in Chrome, Firefox, Safari, Edge
   - Verify CSS custom properties work correctly
   - Check animation performance

2. **Responsive design**:
   - Test on mobile (320px - 768px)
   - Test on tablet (768px - 1024px)
   - Test on desktop (1024px+)

3. **Theme switching**:
   - Verify smooth transitions between all three themes
   - Check localStorage persistence
   - Test theme restoration on page reload

### Accessibility Testing

1. **Contrast ratios**:
   - Use browser DevTools or axe DevTools
   - Verify all text meets WCAG AA standards
   - Check focus indicators are visible

2. **Keyboard navigation**:
   - Tab through all interactive elements
   - Verify focus states are visible in Frankenstein theme
   - Test theme toggle with keyboard (Enter/Space)

3. **Screen reader testing**:
   - Verify aria-labels are descriptive
   - Check that theme changes are announced
   - Test with NVDA/JAWS/VoiceOver

### Functional Testing

1. **Theme toggle**:
   - Click through full cycle: light → dark → frankenstein → light
   - Verify icon changes correctly
   - Check aria-label updates

2. **Persistence**:
   - Set theme to Frankenstein
   - Reload page
   - Verify Frankenstein theme is restored

3. **Component rendering**:
   - Test all major pages (Homepage, Admin, Stacks, Blueprints)
   - Verify all Syncfusion components render correctly
   - Check custom Angry components maintain styling

### Performance Testing

1. **Animation performance**:
   - Monitor frame rate during theme transitions
   - Check for layout thrashing
   - Verify animations don't block user interaction

2. **CSS load time**:
   - Measure impact of additional CSS rules
   - Verify no significant performance degradation

## Implementation Notes

### CSS Organization

All Frankenstein theme styles will be added to existing CSS files using the `[data-theme="frankenstein"]` selector. This maintains the current architecture and keeps theme-specific styles co-located with their components.

**File modification strategy**:
1. `App.css`: Add Frankenstein theme variables
2. Component CSS files: Add `[data-theme="frankenstein"]` selectors as needed
3. No new CSS files required

### Animation Performance

Use CSS transforms and opacity for animations (GPU-accelerated):
- ✓ `transform: translateY()`, `scale()`, `rotate()`
- ✓ `opacity`
- ✗ Avoid animating `width`, `height`, `top`, `left` (causes reflow)

### Browser Support

Target modern browsers with CSS custom properties support:
- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 15+

No polyfills required for target audience (internal developer platform).

## Design Decisions and Rationales

### Why Greenish-Gray Palette?

- **Green tones**: Directly inspired by the monster's iconic greenish skin in classic Universal films
- **Gray undertones**: Evokes the corpse-like, reanimated nature of the creature
- **Dark backgrounds**: Represents the dark laboratory and gothic atmosphere
- **Combination**: Creates immediate recognition of the Frankenstein character while maintaining readability

### Why Prominent Stitching and Bolts?

- **Character authenticity**: The monster's most recognizable features are the stitches and neck bolts
- **Metaphor**: Directly represents "stitching together" multiple technologies
- **Visual interest**: Adds texture and character-specific details
- **Recognition**: Makes the theme immediately identifiable as Frankenstein's monster

### Why Maintain Three Themes?

- **User choice**: Some users may prefer light or dark themes for productivity
- **Hackathon flexibility**: Judges can toggle to see the creative theme
- **Accessibility**: Users with specific visual needs can choose optimal theme

### Why Extend Existing System?

- **Minimal disruption**: No breaking changes to existing code
- **Maintainability**: Follows established patterns
- **Testability**: Existing theme tests can be extended
- **Performance**: No additional JavaScript overhead

## Future Enhancements (Out of Scope)

These features could be added in future iterations:

1. **Animated background**: Subtle lightning strikes in background
2. **Sound effects**: Optional electrical zap sounds on interactions
3. **Custom fonts**: Gothic or laboratory-style typography
4. **Particle effects**: Floating sparks or electrical particles
5. **Theme-specific illustrations**: Custom icons for Frankenstein theme
6. **Holiday themes**: Additional themes for other occasions
7. **Theme customization**: User-configurable color schemes
