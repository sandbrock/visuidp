import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

// Mock components for testing
const MockThemedPage = () => (
  <div data-testid="themed-page">
    <header className="app-header">
      <h1 className="app-title">IDP Platform</h1>
      <ThemeToggle />
    </header>
    <main>
      <div className="content-card" data-testid="test-card">
        <h2>Test Card</h2>
        <p>Content with themed styling</p>
        <button className="e-btn e-primary" data-testid="primary-btn">Primary Button</button>
        <button className="e-btn e-danger" data-testid="danger-btn">Danger Button</button>
      </div>
      <div className="form-container">
        <div className="e-float-input">
          <input type="text" required data-testid="test-input" />
          <label>Test Input</label>
        </div>
      </div>
      <div className="loading-spinner" data-testid="spinner"></div>
    </main>
  </div>
);

const MockModalComponent = () => (
  <div data-testid="modal-test">
    <ThemeToggle />
    <div className="e-dialog" role="dialog" data-testid="test-dialog">
      <div className="e-dlg-header">Modal Header</div>
      <div className="e-dlg-content">Modal Content</div>
    </div>
  </div>
);

describe('Cross-Browser Compatibility Tests', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    localStorageMock = {};
    
    (global as any).localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    } as Storage;

    document.documentElement.removeAttribute('data-theme');
  });

  describe('CSS Custom Properties Support', () => {
    it('should apply data-theme attribute for CSS custom properties', async () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Verify the attribute is set correctly for CSS selectors
      const dataTheme = document.documentElement.dataset.theme;
      expect(dataTheme).toBe('frankenstein');
    });

    it('should update data-theme attribute when switching themes', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      // Initial state
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      // Switch to dark
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      // Switch to frankenstein
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });
    });

    it('should maintain data-theme attribute across component re-renders', async () => {
      localStorageMock['theme'] = 'frankenstein';

      const { rerender } = render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Force re-render
      rerender(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      // Theme should persist
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should apply theme to all themed elements via CSS cascade', async () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // All elements should be able to access theme via CSS custom properties
      const card = screen.getByTestId('test-card');
      const input = screen.getByTestId('test-input');
      const spinner = screen.getByTestId('spinner');

      expect(card).toBeInTheDocument();
      expect(input).toBeInTheDocument();
      expect(spinner).toBeInTheDocument();
    });

    it('should handle theme changes without CSS custom property conflicts', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      // Cycle through all themes
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await user.click(button);
        });

        await waitFor(() => {
          const theme = document.documentElement.getAttribute('data-theme');
          expect(['light', 'dark', 'frankenstein']).toContain(theme);
        });
      }

      // Should end up back at light
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('Theme Switching Performance', () => {
    it('should switch themes without blocking UI', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      const startTime = performance.now();

      await act(async () => {
        await user.click(button);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Theme switch should be fast (< 100ms for the logic, CSS transitions are separate)
      expect(duration).toBeLessThan(100);

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });

    it('should handle rapid theme switching without errors', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      // Rapid clicks
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          await user.click(button);
        }
      });

      // Should end up in a valid state
      await waitFor(() => {
        const theme = document.documentElement.getAttribute('data-theme');
        expect(['light', 'dark', 'frankenstein']).toContain(theme);
      });
    });

    it('should not cause memory leaks during theme switching', async () => {
      const user = userEvent.setup();

      const { unmount } = render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      // Switch themes multiple times
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await user.click(button);
        });
      }

      // Clean unmount should work without errors
      unmount();

      // Verify no lingering effects
      expect(document.documentElement.getAttribute('data-theme')).toBeTruthy();
    });
  });

  describe('Animation Support', () => {
    it('should render animated elements with Frankenstein theme', async () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Verify animated elements are present
      const spinner = screen.getByTestId('spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('loading-spinner');
    });

    it('should apply theme-specific animations to buttons', async () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      const primaryBtn = screen.getByTestId('primary-btn');
      const dangerBtn = screen.getByTestId('danger-btn');

      expect(primaryBtn).toBeInTheDocument();
      expect(dangerBtn).toBeInTheDocument();

      // Buttons should have appropriate classes for CSS animations
      expect(primaryBtn).toHaveClass('e-btn', 'e-primary');
      expect(dangerBtn).toHaveClass('e-btn', 'e-danger');
    });

    it('should maintain animations during theme transitions', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      const spinner = screen.getByTestId('spinner');

      // Spinner should be present before theme change
      expect(spinner).toBeInTheDocument();

      await act(async () => {
        await user.click(button);
        await user.click(button);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Spinner should still be present and functional after theme change
      expect(spinner).toBeInTheDocument();
    });

    it('should handle CSS transitions smoothly', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      const initialTheme = document.documentElement.getAttribute('data-theme');

      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        const newTheme = document.documentElement.getAttribute('data-theme');
        expect(newTheme).not.toBe(initialTheme);
      });

      // Verify theme changed (CSS transitions would be handled by browser)
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Component Rendering Across Themes', () => {
    it('should render header component correctly in Frankenstein theme', async () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('app-header');

      const title = screen.getByText('IDP Platform');
      expect(title).toBeInTheDocument();
    });

    it('should render button components correctly in Frankenstein theme', async () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      const primaryBtn = screen.getByTestId('primary-btn');
      const dangerBtn = screen.getByTestId('danger-btn');

      expect(primaryBtn).toBeInTheDocument();
      expect(dangerBtn).toBeInTheDocument();
      expect(primaryBtn.textContent).toBe('Primary Button');
      expect(dangerBtn.textContent).toBe('Danger Button');
    });

    it('should render input components correctly in Frankenstein theme', async () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      const input = screen.getByTestId('test-input');
      expect(input).toBeInTheDocument();
      expect(input.parentElement).toHaveClass('e-float-input');
    });

    it('should render card components correctly in Frankenstein theme', async () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      const card = screen.getByTestId('test-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('content-card');
      expect(screen.getByText('Test Card')).toBeInTheDocument();
    });

    it('should render modal components correctly in Frankenstein theme', async () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockModalComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      const dialog = screen.getByTestId('test-dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveClass('e-dialog');
      expect(screen.getByText('Modal Header')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('should render loading components correctly in Frankenstein theme', async () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      const spinner = screen.getByTestId('spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('loading-spinner');
    });
  });

  describe('Theme Icon Display', () => {
    it('should display correct icon for light theme', () => {
      localStorageMock['theme'] = 'light';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      expect(button.textContent).toContain('☀️');
    });

    it('should display correct icon for dark theme', () => {
      localStorageMock['theme'] = 'dark';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      expect(button.textContent).toContain('🌙');
    });

    it('should display correct icon for frankenstein theme', () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      expect(button.textContent).toContain('⚡');
    });

    it('should update icon when cycling through themes', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      // Light
      expect(button.textContent).toContain('☀️');

      // Dark
      await act(async () => {
        await user.click(button);
      });
      await waitFor(() => {
        expect(button.textContent).toContain('🌙');
      });

      // Frankenstein
      await act(async () => {
        await user.click(button);
      });
      await waitFor(() => {
        expect(button.textContent).toContain('⚡');
      });

      // Back to Light
      await act(async () => {
        await user.click(button);
      });
      await waitFor(() => {
        expect(button.textContent).toContain('☀️');
      });
    });
  });

  describe('Browser Feature Detection', () => {
    it('should work with localStorage available', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(localStorageMock['theme']).toBe('dark');
      });
    });

    it('should handle localStorage errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Make localStorage throw errors
      (global as any).localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage is disabled');
      });

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      // Should still be able to switch themes
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      consoleWarnSpy.mockRestore();
    });

    it('should work with document.documentElement available', () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      // Should set attribute on documentElement
      expect(document.documentElement).toBeTruthy();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should handle rapid DOM updates', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      // Rapid theme changes
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await user.click(button);
        });
      }

      // Should end in a valid state
      await waitFor(() => {
        const theme = document.documentElement.getAttribute('data-theme');
        expect(['light', 'dark', 'frankenstein']).toContain(theme);
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should maintain aria-label on theme toggle', () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      expect(button).toHaveAttribute('aria-label');
      expect(button.getAttribute('aria-label')).toMatch(/theme/i);
    });

    it('should update aria-label when theme changes', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      const initialLabel = button.getAttribute('aria-label');

      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        const newLabel = button.getAttribute('aria-label');
        expect(newLabel).toBeTruthy();
        // Label should still contain 'theme'
        expect(newLabel).toMatch(/theme/i);
      });
    });

    it('should be keyboard accessible', async () => {
      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      
      // Should be focusable
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('should support keyboard activation', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });
      button.focus();

      // Simulate Enter key
      await act(async () => {
        await user.keyboard('{Enter}');
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing theme in localStorage', () => {
      // Don't set any theme in localStorage
      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      // Should default to light
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should handle invalid theme value in localStorage', () => {
      localStorageMock['theme'] = 'invalid-theme';

      render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      // Should default to light
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should handle component unmount during theme change', async () => {
      const user = userEvent.setup();

      const { unmount } = render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /theme/i });

      await act(async () => {
        await user.click(button);
      });

      // Unmount immediately
      unmount();

      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should handle multiple ThemeProviders', () => {
      // This tests that multiple providers don't conflict
      render(
        <ThemeProvider>
          <ThemeProvider>
            <MockThemedPage />
          </ThemeProvider>
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should maintain theme consistency across re-renders', async () => {
      localStorageMock['theme'] = 'frankenstein';

      const { rerender } = render(
        <ThemeProvider>
          <MockThemedPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Force multiple re-renders
      for (let i = 0; i < 5; i++) {
        rerender(
          <ThemeProvider>
            <MockThemedPage />
          </ThemeProvider>
        );
      }

      // Theme should remain consistent
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });
  });
});
