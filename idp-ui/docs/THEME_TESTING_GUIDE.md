# Theme Testing Guide

## Quick Start

Run all theme-related tests:
```bash
npm test -- Theme
```

## Test Files

### 1. ThemeContext Tests
**File**: `src/contexts/ThemeContext.test.tsx`  
**Tests**: 15  
**Focus**: Core theme context functionality

```bash
npm test -- ThemeContext.test.tsx
```

### 2. ThemeToggle Component Tests
**File**: `src/components/ThemeToggle.test.tsx`  
**Tests**: 16  
**Focus**: Theme toggle button UI and interactions

```bash
npm test -- ThemeToggle.test.tsx
```

### 3. Theme Switching Integration Tests
**File**: `src/components/ThemeSwitchingIntegration.test.tsx`  
**Tests**: 17  
**Focus**: End-to-end theme switching scenarios

```bash
npm test -- ThemeSwitchingIntegration.test.tsx
```

## Test Coverage Summary

Total: **48 tests** covering:
- ✅ Full theme cycle (light → dark → frankenstein → light)
- ✅ Theme persistence in localStorage
- ✅ Theme restoration after page reload
- ✅ Theme switching on all major pages
- ✅ Smooth transitions between themes
- ✅ Invalid localStorage value handling
- ✅ Keyboard accessibility
- ✅ Multiple toggle synchronization
- ✅ Error handling and edge cases

## Watch Mode

Run tests in watch mode for development:
```bash
npm run test:watch -- Theme
```

## Verbose Output

Run with detailed output:
```bash
npm test -- --reporter=verbose Theme
```

## Requirements Verified

All tests verify requirements from task 16:
- **4.1**: Theme toggle control with appropriate icons
- **4.2**: Immediate theme application without reload
- **4.3**: Theme persistence in browser storage
- **4.4**: Theme restoration on return
- **5.1**: Integration with existing theme system

## Manual Testing Checklist

After automated tests pass, manually verify:

1. **Visual Transitions**
   - [ ] Theme changes are smooth (400ms transition)
   - [ ] No visual glitches during transition
   - [ ] All colors update correctly

2. **Cross-Browser**
   - [ ] Chrome (latest)
   - [ ] Firefox (latest)
   - [ ] Safari (latest)
   - [ ] Edge (latest)

3. **Responsive Design**
   - [ ] Mobile (320px - 768px)
   - [ ] Tablet (768px - 1024px)
   - [ ] Desktop (1024px+)

4. **Real Pages**
   - [ ] Homepage
   - [ ] AdminDashboard
   - [ ] StackList
   - [ ] Infrastructure
   - [ ] API Keys Management

5. **Performance**
   - [ ] No lag during theme switching
   - [ ] Smooth animations
   - [ ] No memory leaks

## Troubleshooting

### Tests Fail with localStorage Errors
The tests mock localStorage. If you see errors, ensure:
- Test setup file is loaded: `src/test/setup.ts`
- vitest.config.ts includes setupFiles

### Tests Timeout
Increase timeout in vitest.config.ts:
```typescript
test: {
  testTimeout: 10000
}
```

### DOM Attribute Not Updating
Ensure you're using `waitFor` for async updates:
```typescript
await waitFor(() => {
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
});
```

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run Theme Tests
  run: npm test -- Theme
```

## Coverage Report

Generate coverage report:
```bash
npm test -- --coverage Theme
```

## Related Documentation

- [Theme Switching Test Summary](./THEME_SWITCHING_TEST_SUMMARY.md)
- [Frankenstein Theme Design](./.kiro/specs/frankenstein-halloween-theme/design.md)
- [Frankenstein Theme Requirements](./.kiro/specs/frankenstein-halloween-theme/requirements.md)
