# Design Document

## Overview

This design addresses button styling issues that emerged after removing SyncFusion from the codebase. The Infrastructure component uses plain HTML buttons with non-existent CSS classes, and the header icons (profile and theme toggle) have visual artifacts. The solution involves replacing all plain HTML buttons with the AngryButton component and fixing CSS issues in the header icons.

## Architecture

### Current State

**Infrastructure Component Issues:**
- Uses plain HTML `<button>` elements with classes: `btn`, `btn-primary`, `btn-small`, `btn-outline`, `btn-danger`
- These CSS classes were removed during SyncFusion cleanup
- Buttons appear as black rectangles with no proper styling
- Located in: `idp-ui/src/components/Infrastructure.tsx`

**Header Icon Issues:**
- Profile icon and theme toggle have black squares/borders around them
- CSS may be using hardcoded colors instead of theme variables
- Border styling not adapting properly to themes
- Located in: `idp-ui/src/components/ProfileIcon.css`, `idp-ui/src/components/ThemeToggle.css`, `idp-ui/src/components/ProfileMenu.css`

### Target State

**Infrastructure Component:**
- All buttons use the AngryButton component
- Consistent styling across all button actions
- Proper semantic props for variants (primary, danger, outline, etc.)
- Proper size props for small buttons

**Header Icons:**
- Clean circular buttons without black squares
- Proper use of CSS variables for theming
- Consistent hover and active states
- Visual consistency across all themes

## Components and Interfaces

### 1. Infrastructure Component Button Replacement

**Current Button Usage:**
```tsx
// BEFORE - Plain HTML buttons with non-existent CSS classes
<button className="btn btn-primary btn-small" onClick={...}>New</button>
<button className="btn btn-outline btn-small" disabled={...} onClick={...}>Edit</button>
<button className="btn btn-danger btn-small" disabled={...} onClick={...}>Delete</button>
```

**Target Implementation:**
```tsx
// AFTER - AngryButton components with semantic props
<AngryButton isPrimary size="small" onClick={...}>New</AngryButton>
<AngryButton style="outline" size="small" disabled={...} onClick={...}>Edit</AngryButton>
<AngryButton variant="danger" size="small" disabled={...} onClick={...}>Delete</AngryButton>
```

**Button Mapping Strategy:**

| Current Class | AngryButton Props |
|--------------|-------------------|
| `btn btn-primary btn-small` | `isPrimary size="small"` |
| `btn btn-outline btn-small` | `style="outline" size="small"` |
| `btn btn-danger btn-small` | `variant="danger" size="small"` |
| `btn btn-primary` | `isPrimary` |
| `btn btn-outline` | `style="outline"` |

**Buttons to Replace in Infrastructure.tsx:**

1. **Blueprint Controls Section (lines ~650-660):**
   - "New" button → `<AngryButton isPrimary size="small">`
   - "Edit" button → `<AngryButton style="outline" size="small">`
   - "Delete" button → `<AngryButton variant="danger" size="small">`

2. **Resource Controls Section (lines ~730-750):**
   - "Create New Resource" button → `<AngryButton isPrimary size="small">`

3. **Resource Table Actions (lines ~800-820):**
   - "Edit" button → `<AngryButton style="outline" size="small">`
   - "Delete" button → `<AngryButton variant="danger" size="small">`

### 2. Profile Icon CSS Fixes

**Current Issue:**
The ProfileIcon.css file is empty (kept for backwards compatibility), but ProfileMenu.css contains the actual styles. The black square issue likely comes from:
- Hardcoded border colors not using CSS variables
- Box-shadow or outline creating visual artifacts
- Border styling not properly inheriting theme colors

**Design Decision:**
Review and fix ProfileMenu.css to ensure:
- All colors use CSS variables (e.g., `var(--border-primary)`, `var(--bg-tertiary)`)
- No hardcoded black colors (`#000`, `black`, `rgb(0,0,0)`)
- Proper border-radius for circular appearance
- Clean hover and active states

**Key CSS Properties to Review:**
```css
.profile-icon {
  border: 2px solid var(--border-primary);  /* Should use variable */
  background: var(--bg-tertiary);           /* Should use variable */
  /* Check for any hardcoded colors */
}
```

### 3. Theme Toggle CSS Fixes

**Current Issue:**
Similar to profile icon, the theme toggle may have:
- Hardcoded border colors
- Box-shadow creating black squares
- Border not adapting to theme

**Design Decision:**
Review and fix ThemeToggle.css to ensure:
- All colors use CSS variables
- No hardcoded black colors
- Proper circular border-radius
- Clean transitions between themes

**Key CSS Properties to Review:**
```css
.theme-toggle {
  border: 2px solid var(--border-primary);  /* Should use variable */
  background: transparent;                   /* Should be transparent or use variable */
  /* Check for any hardcoded colors */
}
```

### 4. CSS Variable Verification

**Ensure Theme Variables are Defined:**
All themes (light, dark, Frankenstein) should define:
- `--border-primary`: Primary border color
- `--border-secondary`: Secondary border color
- `--bg-primary`: Primary background
- `--bg-secondary`: Secondary background
- `--bg-tertiary`: Tertiary background
- `--accent-primary`: Primary accent color
- `--text-primary`: Primary text color

**Location:** `idp-ui/src/index.css` or theme-specific CSS files

## Data Models

No data model changes required. This is purely a UI/styling fix.

## Error Handling

### Potential Issues

1. **Missing AngryButton Import**
   - **Issue**: Infrastructure.tsx may not import AngryButton
   - **Solution**: Verify import statement exists: `import { AngryButton } from './input';`
   - **Current State**: Import already exists in Infrastructure.tsx

2. **Button Click Handlers**
   - **Issue**: AngryButton onClick prop type may differ from plain HTML button
   - **Solution**: AngryButton accepts `React.MouseEventHandler | (() => void)`, which is compatible
   - **Validation**: TypeScript compilation will catch any type mismatches

3. **CSS Variable Undefined**
   - **Issue**: Theme may not define required CSS variables
   - **Solution**: Add fallback values in CSS: `var(--border-primary, #ccc)`
   - **Validation**: Visual inspection in all themes

4. **Visual Regression**
   - **Issue**: Button sizes or spacing may change
   - **Solution**: Use `size="small"` prop to maintain compact button size
   - **Validation**: Visual comparison before/after changes

## Testing Strategy

### Manual Testing

1. **Infrastructure Component Testing:**
   - Navigate to `/ui/infrastructure` (Blueprints screen)
   - Verify all buttons render with proper styling
   - Test button interactions:
     - Click "New" → form appears
     - Click "Edit" → form appears with blueprint data
     - Click "Delete" → confirmation and deletion
     - Click "Create New Resource" → resource form appears
   - Test disabled states (Edit/Delete when no blueprint selected)
   - Verify button hover states

2. **Header Icon Testing:**
   - Verify profile icon displays as clean circle
   - Verify theme toggle displays as clean circle
   - Test hover states on both icons
   - Test active state on profile icon (dropdown open)
   - Verify no black squares or visual artifacts

3. **Theme Testing:**
   - Test all buttons in light theme
   - Test all buttons in dark theme
   - Test all buttons in Frankenstein theme
   - Verify consistent styling across themes
   - Verify theme-specific effects (Frankenstein stitching, etc.)

4. **Responsive Testing:**
   - Test on desktop (1920x1080)
   - Test on tablet (768px width)
   - Test on mobile (375px width)
   - Verify buttons remain usable at all sizes

### Automated Testing

1. **TypeScript Compilation:**
   - Run `npm run build` to verify no type errors
   - Ensure AngryButton props are correctly typed

2. **Existing Tests:**
   - Run `npm test` to ensure no regressions
   - Verify button-related tests still pass

## Implementation Phases

### Phase 1: Replace Infrastructure Component Buttons
1. Locate all plain HTML `<button>` elements in Infrastructure.tsx
2. Replace with AngryButton components using appropriate props
3. Verify TypeScript compilation succeeds
4. Test button functionality

### Phase 2: Fix Profile Icon Styling
1. Review ProfileMenu.css for hardcoded colors
2. Replace hardcoded colors with CSS variables
3. Add fallback values for CSS variables
4. Test in all themes

### Phase 3: Fix Theme Toggle Styling
1. Review ThemeToggle.css for hardcoded colors
2. Replace hardcoded colors with CSS variables
3. Add fallback values for CSS variables
4. Test in all themes

### Phase 4: Verification and Testing
1. Visual inspection of all changes
2. Test in all themes (light, dark, Frankenstein)
3. Test responsive behavior
4. Verify no regressions in other components

## Success Criteria

1. **All Buttons Use AngryButton**: No plain HTML buttons with CSS classes in Infrastructure.tsx
2. **Proper Button Styling**: All buttons display with correct colors, sizes, and variants
3. **Clean Header Icons**: Profile icon and theme toggle display as clean circles without black squares
4. **Theme Consistency**: All buttons and icons work correctly in all three themes
5. **No TypeScript Errors**: Code compiles without errors
6. **No Visual Regressions**: Other components remain unaffected

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Button size changes affect layout | Medium | Low | Use `size="small"` to maintain compact size |
| CSS variables undefined in some themes | High | Low | Add fallback values in CSS |
| Breaking existing button tests | Medium | Low | Run test suite after changes |
| Visual inconsistency across themes | Medium | Low | Test thoroughly in all themes |

## Dependencies

- AngryButton component (already exists)
- CSS variables defined in theme files (already exist)
- No external dependencies required

## Timeline Estimate

- Phase 1 (Infrastructure buttons): 30 minutes
- Phase 2 (Profile icon CSS): 15 minutes
- Phase 3 (Theme toggle CSS): 15 minutes
- Phase 4 (Testing): 30 minutes

**Total Estimate**: 1.5 hours
