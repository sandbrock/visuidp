import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

// Test component that uses the theme context
const TestComponent = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <button data-testid="toggle-button" onClick={toggleTheme}>
        Toggle Theme
      </button>
      <button data-testid="set-light" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
      <button data-testid="set-frankenstein" onClick={() => setTheme('frankenstein')}>
        Set Frankenstein
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Create a fresh localStorage mock for each test
    localStorageMock = {};
    
    global.localStorage = {
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

    // Clear document.documentElement attributes
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Theme Initialization', () => {
    it('should default to light theme when no theme is stored', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should load light theme from localStorage', () => {
      localStorageMock['theme'] = 'light';

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should load dark theme from localStorage', () => {
      localStorageMock['theme'] = 'dark';

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should load frankenstein theme from localStorage', () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('frankenstein');
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should default to light theme when invalid theme is stored', () => {
      localStorageMock['theme'] = 'invalid-theme';

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      global.localStorage.getItem = vi.fn(() => {
        throw new Error('localStorage not available');
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load theme preference:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Theme Toggle Cycle', () => {
    it('should cycle from light to dark to frankenstein to light', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Start with light
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');

      // Toggle to dark
      await act(async () => {
        await user.click(screen.getByTestId('toggle-button'));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(localStorageMock['theme']).toBe('dark');

      // Toggle to frankenstein
      await act(async () => {
        await user.click(screen.getByTestId('toggle-button'));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('frankenstein');
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      expect(localStorageMock['theme']).toBe('frankenstein');

      // Toggle back to light
      await act(async () => {
        await user.click(screen.getByTestId('toggle-button'));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(localStorageMock['theme']).toBe('light');
    });

    it('should complete multiple full cycles correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // First cycle
      await act(async () => {
        await user.click(screen.getByTestId('toggle-button')); // light -> dark
        await user.click(screen.getByTestId('toggle-button')); // dark -> frankenstein
        await user.click(screen.getByTestId('toggle-button')); // frankenstein -> light
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      });

      // Second cycle
      await act(async () => {
        await user.click(screen.getByTestId('toggle-button')); // light -> dark
        await user.click(screen.getByTestId('toggle-button')); // dark -> frankenstein
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('frankenstein');
      });
    });
  });

  describe('Direct Theme Setting', () => {
    it('should set theme directly to light', async () => {
      const user = userEvent.setup();
      localStorageMock['theme'] = 'dark';
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await act(async () => {
        await user.click(screen.getByTestId('set-light'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(localStorageMock['theme']).toBe('light');
    });

    it('should set theme directly to dark', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await act(async () => {
        await user.click(screen.getByTestId('set-dark'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(localStorageMock['theme']).toBe('dark');
    });

    it('should set theme directly to frankenstein', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await act(async () => {
        await user.click(screen.getByTestId('set-frankenstein'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('frankenstein');
      });
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      expect(localStorageMock['theme']).toBe('frankenstein');
    });
  });

  describe('Theme Persistence', () => {
    it('should persist theme changes to localStorage', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await act(async () => {
        await user.click(screen.getByTestId('set-frankenstein'));
      });

      await waitFor(() => {
        expect(localStorageMock['theme']).toBe('frankenstein');
      });
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'frankenstein');
    });

    it('should handle localStorage save errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      global.localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage quota exceeded');
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await act(async () => {
        await user.click(screen.getByTestId('set-dark'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save theme preference:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('DOM Attribute Updates', () => {
    it('should update data-theme attribute on document element', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      await act(async () => {
        await user.click(screen.getByTestId('set-dark'));
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      await act(async () => {
        await user.click(screen.getByTestId('set-frankenstein'));
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useTheme is used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleErrorSpy.mockRestore();
    });
  });
});
