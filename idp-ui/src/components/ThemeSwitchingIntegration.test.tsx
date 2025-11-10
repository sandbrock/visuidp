import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

// Mock page components to simulate navigation
const MockHomePage = () => (
  <div data-testid="home-page">
    <h1>Home Page</h1>
    <ThemeToggle />
    <div className="content-card">Content</div>
  </div>
);

const MockAdminPage = () => (
  <div data-testid="admin-page">
    <h1>Admin Page</h1>
    <ThemeToggle />
    <div className="admin-card">Admin Content</div>
  </div>
);

const MockStackPage = () => (
  <div data-testid="stack-page">
    <h1>Stack Page</h1>
    <ThemeToggle />
    <div className="stack-list">Stack Items</div>
  </div>
);

describe('Theme Switching Integration Tests', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    localStorageMock = {};
    
    (globalThis as any).localStorage = {
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

  describe('Theme Persistence Across Page Navigation', () => {
    it('should maintain theme when navigating between pages', async () => {
      const user = userEvent.setup();

      // Render home page
      const { unmount: unmountHome } = render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      const homeButton = screen.getByRole('button');
      
      // Switch to frankenstein theme on home page
      await act(async () => {
        await user.click(homeButton); // light -> dark
        await user.click(homeButton); // dark -> frankenstein
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
        expect(localStorageMock['theme']).toBe('frankenstein');
      });

      // Unmount home page (simulate navigation)
      unmountHome();

      // Render admin page (simulate navigation to new page)
      render(
        <ThemeProvider>
          <MockAdminPage />
        </ThemeProvider>
      );

      // Theme should be restored from localStorage
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      const adminButton = screen.getByRole('button');
      expect(adminButton.textContent).toContain('⚡');
    });

    it('should persist theme through multiple page transitions', async () => {
      const user = userEvent.setup();

      // Start on home page
      const { unmount: unmountHome } = render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      // Set to dark theme
      await act(async () => {
        await user.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(localStorageMock['theme']).toBe('dark');
      });

      unmountHome();

      // Navigate to admin page
      const { unmount: unmountAdmin } = render(
        <ThemeProvider>
          <MockAdminPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      unmountAdmin();

      // Navigate to stack page
      render(
        <ThemeProvider>
          <MockStackPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      const stackButton = screen.getByRole('button');
      expect(stackButton.textContent).toContain('🌙');
    });
  });

  describe('Theme Restoration After Page Reload', () => {
    it('should restore light theme after reload', () => {
      localStorageMock['theme'] = 'light';

      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(screen.getByRole('button').textContent).toContain('☀️');
    });

    it('should restore dark theme after reload', () => {
      localStorageMock['theme'] = 'dark';

      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(screen.getByRole('button').textContent).toContain('🌙');
    });

    it('should restore frankenstein theme after reload', () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      expect(screen.getByRole('button').textContent).toContain('⚡');
    });
  });

  describe('Full Theme Cycle Integration', () => {
    it('should complete full cycle and persist each step', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      // Light (initial)
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(localStorageMock['theme']).toBe('light');

      // Light -> Dark
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorageMock['theme']).toBe('dark');
        expect(button.textContent).toContain('🌙');
      });

      // Dark -> Frankenstein
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
        expect(localStorageMock['theme']).toBe('frankenstein');
        expect(button.textContent).toContain('⚡');
      });

      // Frankenstein -> Light
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(localStorageMock['theme']).toBe('light');
        expect(button.textContent).toContain('☀️');
      });
    });

    it('should handle rapid theme switching', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      // Rapidly click through themes
      await act(async () => {
        await user.click(button); // light -> dark
        await user.click(button); // dark -> frankenstein
        await user.click(button); // frankenstein -> light
        await user.click(button); // light -> dark
        await user.click(button); // dark -> frankenstein
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
        expect(localStorageMock['theme']).toBe('frankenstein');
      });
    });
  });

  describe('Invalid localStorage Values', () => {
    it('should handle empty string in localStorage', () => {
      localStorageMock['theme'] = '';

      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(screen.getByRole('button').textContent).toContain('☀️');
    });

    it('should handle random string in localStorage', () => {
      localStorageMock['theme'] = 'random-theme';

      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(screen.getByRole('button').textContent).toContain('☀️');
    });

    it('should handle numeric value in localStorage', () => {
      localStorageMock['theme'] = '123';

      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(screen.getByRole('button').textContent).toContain('☀️');
    });

    it('should handle null value in localStorage', () => {
      // localStorage returns null when key doesn't exist
      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(screen.getByRole('button').textContent).toContain('☀️');
    });

    it('should recover from invalid value and allow theme switching', async () => {
      const user = userEvent.setup();
      localStorageMock['theme'] = 'invalid';

      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      // Should default to light
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      // Should be able to switch themes normally
      await act(async () => {
        await user.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorageMock['theme']).toBe('dark');
      });
    });
  });

  describe('Smooth Transitions', () => {
    it('should update DOM attribute immediately on theme change', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      const initialTheme = document.documentElement.getAttribute('data-theme');
      expect(initialTheme).toBe('light');

      await act(async () => {
        await user.click(screen.getByRole('button'));
      });

      // DOM should update immediately (CSS transitions handle the visual smoothness)
      await waitFor(() => {
        const newTheme = document.documentElement.getAttribute('data-theme');
        expect(newTheme).toBe('dark');
        expect(newTheme).not.toBe(initialTheme);
      });
    });

    it('should maintain theme consistency across all elements', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <MockHomePage />
            <div data-testid="additional-content" className="card">
              Additional Content
            </div>
          </div>
        </ThemeProvider>
      );

      await act(async () => {
        await user.click(screen.getByRole('button'));
        await user.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        // All elements should see the same theme via data-theme attribute
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Additional content should be present and themed
      expect(screen.getByTestId('additional-content')).toBeInTheDocument();
    });
  });

  describe('Multiple ThemeToggle Synchronization', () => {
    it('should synchronize theme across multiple toggle buttons on same page', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <div data-testid="header">
              <ThemeToggle />
            </div>
            <div data-testid="sidebar">
              <ThemeToggle />
            </div>
            <div data-testid="footer">
              <ThemeToggle />
            </div>
          </div>
        </ThemeProvider>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);

      // All should start with light theme
      buttons.forEach(button => {
        expect(button.textContent).toContain('☀️');
      });

      // Click first button
      await act(async () => {
        await user.click(buttons[0]);
      });

      // All should update to dark theme
      await waitFor(() => {
        buttons.forEach(button => {
          expect(button.textContent).toContain('🌙');
        });
      });

      // Click second button
      await act(async () => {
        await user.click(buttons[1]);
      });

      // All should update to frankenstein theme
      await waitFor(() => {
        buttons.forEach(button => {
          expect(button.textContent).toContain('⚡');
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle theme switching when localStorage is disabled', async () => {
      const user = userEvent.setup();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Make localStorage throw errors
      (globalThis as any).localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage is disabled');
      });

      render(
        <ThemeProvider>
          <MockHomePage />
        </ThemeProvider>
      );

      // Should still be able to switch themes (just won't persist)
      await act(async () => {
        await user.click(screen.getByRole('button'));
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle concurrent theme changes', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <ThemeToggle />
          </div>
        </ThemeProvider>
      );

      const buttons = screen.getAllByRole('button');

      // Click both buttons rapidly
      await act(async () => {
        await Promise.all([
          user.click(buttons[0]),
          user.click(buttons[1]),
        ]);
      });

      // Should end up in a consistent state
      await waitFor(() => {
        const theme = document.documentElement.getAttribute('data-theme');
        expect(['light', 'dark', 'frankenstein']).toContain(theme);
        
        // Both buttons should show the same theme
        const icon0 = buttons[0].textContent;
        const icon1 = buttons[1].textContent;
        expect(icon0).toBe(icon1);
      });
    });
  });
});
