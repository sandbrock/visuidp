# Frankenstein Theme Animations

This document describes all the animations and effects implemented for the Frankenstein Halloween theme.

## Animation Keyframes

All animations are defined in `src/App.css` and use GPU-accelerated properties (transform, opacity, box-shadow) for optimal performance.

### 1. Electrical Glow Effects

**`frankenstein-electrical-glow`**
- Duration: 2s infinite
- Effect: Pulsing purple electrical energy glow
- Usage: General electrical effects on interactive elements
- Performance: Uses box-shadow only

**`frankenstein-electrical-glow-intense`**
- Duration: 1.5s infinite
- Effect: More intense electrical glow with multiple shadow layers
- Usage: Hover states and emphasized elements
- Performance: Uses box-shadow only

### 2. Danger State Animations

**`frankenstein-pulse-danger`**
- Duration: 2s infinite
- Effect: Pulsing red/pink glow for danger buttons
- Usage: Applied automatically to `.e-btn.e-danger` and `.angry-button.btn-danger`
- Performance: Uses box-shadow only

**`frankenstein-pulse-danger-hover`**
- Duration: 1s infinite
- Effect: Faster, more intense pulsing on hover
- Usage: Applied automatically on danger button hover
- Performance: Uses box-shadow only

### 3. Lightning Flash Effects

**`frankenstein-lightning-flash`**
- Duration: 1.5s infinite
- Effect: Quick bright flash with opacity and text-shadow changes
- Usage: Lightning bolt indicators, loading states
- Performance: Uses opacity and text-shadow

**`frankenstein-lightning-flash-slow`**
- Duration: 4s infinite
- Effect: Slower, more subtle ambient lightning effect
- Usage: Background ambient effects
- Performance: Uses opacity and filter (brightness)

### 4. Success and Warning Glows

**`frankenstein-glow-success`**
- Duration: 2s infinite
- Effect: Toxic green pulsing glow
- Usage: Success states, confirmation messages
- Performance: Uses box-shadow only

**`frankenstein-glow-warning`**
- Duration: 2s infinite
- Effect: Lightning bolt yellow pulsing glow
- Usage: Warning states, caution messages
- Performance: Uses box-shadow only

### 5. Interactive Effects

**`frankenstein-spark`**
- Duration: 0.6s (one-shot)
- Effect: Quick electrical spark with scale and opacity
- Usage: Click feedback, activation effects
- Performance: Uses transform (scale), opacity, box-shadow

**`frankenstein-charge-buildup`**
- Duration: 2s (forwards)
- Effect: Gradual electrical charge buildup with color transition
- Usage: Loading states, processing indicators
- Performance: Uses box-shadow and border-color

**`frankenstein-shimmer`**
- Duration: Variable
- Effect: Shimmer effect across element
- Usage: Interactive element highlights
- Performance: Uses background-position

### 6. Error and Alert Animations

**`frankenstein-shake-error`**
- Duration: 0.5s (one-shot)
- Effect: Horizontal shake for error feedback
- Usage: Form validation errors, failed actions
- Performance: Uses transform (translateX) only

**`frankenstein-heartbeat`**
- Duration: 2s infinite
- Effect: Double-pulse heartbeat pattern for critical alerts
- Usage: Critical warnings, urgent notifications
- Performance: Uses transform (scale) and box-shadow

### 7. Transition Effects

**`frankenstein-fade-in-electric`**
- Duration: 0.5s (forwards)
- Effect: Fade in with electrical glow and upward movement
- Usage: Element appearance, modal opening
- Performance: Uses opacity, transform (translateY), box-shadow

**`frankenstein-modal-appear`**
- Duration: 0.3s (forwards)
- Effect: Modal/dialog appearance with scale and electrical glow
- Usage: Applied automatically to `.e-dialog.e-popup-open`
- Performance: Uses opacity, transform (scale, translateY), box-shadow

**`frankenstein-theme-transition`**
- Duration: Variable
- Effect: Smooth theme switching with opacity and glow
- Usage: Theme toggle transitions
- Performance: Uses opacity and box-shadow

### 8. Loading Animations

**`frankenstein-spin`** (in Loading.css)
- Duration: 1s infinite linear
- Effect: Continuous rotation for spinner
- Usage: Loading spinner
- Performance: Uses transform (rotate) only

**`frankenstein-glow`** (in Loading.css)
- Duration: 2s infinite
- Effect: Pulsing electrical glow on spinner
- Usage: Combined with spin for loading indicator
- Performance: Uses box-shadow only

**`flash`** (in Loading.css)
- Duration: 1.5s infinite
- Effect: Lightning bolt flash on loading text
- Usage: Loading text decoration
- Performance: Uses opacity and text-shadow

## Utility Classes

Apply these classes to elements to use the animations:

```css
.electrical-glow          /* Pulsing electrical glow */
.electrical-glow-intense  /* Intense electrical glow */
.lightning-flash          /* Quick lightning flash */
.lightning-flash-slow     /* Slow ambient lightning */
.spark-effect            /* One-shot spark effect */
.glow-success            /* Success state glow */
.glow-warning            /* Warning state glow */
.charge-buildup          /* Charge buildup animation */
.fade-in-electric        /* Fade in with electrical effect */
.shake-error             /* Error shake animation */
.heartbeat               /* Heartbeat pulse */
.animate-transform       /* Enable transform/opacity transitions */
.no-transition           /* Disable all transitions */
```

## Automatic Animations

These animations are applied automatically without utility classes:

1. **Danger Buttons**: All danger buttons pulse automatically
2. **Modal Appearance**: Dialogs animate in with electrical effect
3. **Loading Spinner**: Spins and glows automatically
4. **Loading Text**: Lightning bolt flashes automatically
5. **Button Hover**: Electrical glow on hover (all buttons)
6. **Card Hover**: Subtle electrical glow on hover

## Theme Transitions

All color-based properties transition smoothly when switching themes:
- Duration: 400ms
- Properties: background-color, color, border-color, box-shadow
- Timing: ease

Transform and opacity animations use 300ms for snappier feedback.

## Performance Considerations

All animations follow these performance best practices:

1. **GPU Acceleration**: Use transform and opacity where possible
2. **Avoid Layout Thrashing**: No animations on width, height, top, left
3. **Efficient Properties**: box-shadow, transform, opacity are GPU-accelerated
4. **Reasonable Durations**: 0.3s - 2s for most animations
5. **Infinite Animations**: Only on small elements (buttons, icons)
6. **One-shot Animations**: Use `forwards` to prevent repeated calculations

## Browser Compatibility

All animations use standard CSS3 keyframes and are supported in:
- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 15+

No vendor prefixes required for target browsers.

## Usage Examples

### Adding electrical glow to a custom element:
```html
<div className="electrical-glow">
  This element will pulse with electrical energy
</div>
```

### Creating a critical alert:
```html
<div className="heartbeat">
  ⚠️ Critical Alert
</div>
```

### Animating element appearance:
```html
<div className="fade-in-electric">
  Content fades in with electrical effect
</div>
```

### Error feedback:
```javascript
// Add shake-error class temporarily
element.classList.add('shake-error');
setTimeout(() => element.classList.remove('shake-error'), 500);
```

## Testing

To test animations:

1. Switch to Frankenstein theme using theme toggle
2. Interact with buttons (hover, click danger buttons)
3. Open modals/dialogs
4. Trigger loading states
5. Submit forms with errors
6. Hover over cards and interactive elements

All animations should be smooth, performant, and enhance the gothic laboratory aesthetic without hindering usability.
