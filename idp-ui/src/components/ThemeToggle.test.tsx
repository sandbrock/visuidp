import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('ThemeToggle Component', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    localStorageMock = {};
    
    (globalThis as Record<string, unknown>).localStorage = {
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

  describe('Icon Display', () => {
    it('should display sun icon for light theme', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button.textContent).toContain('☀️');
    });

    it('should display moon icon for dark theme', () => {
      localStorageMock['theme'] = 'dark';

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button.textContent).toContain('🌙');
    });

    it('should display bolt icon for frankenstein theme', () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button.textContent).toContain('⚡');
    });
  });

  describe('Aria Labels', () => {
    it('should have correct aria-label for light theme', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Current theme: light. Switch to dark mode');
    });

    it('should have correct aria-label for dark theme', () => {
      localStorageMock['theme'] = 'dark';

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Current theme: dark. Switch to Frankenstein monster theme');
    });

    it('should have correct aria-label for frankenstein theme', () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Current theme: frankenstein. Switch to light mode');
    });
  });

  describe('Title Attribute', () => {
    it('should have correct title for light theme', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Switch to dark mode');
    });

    it('should have correct title for dark theme', () => {
      localStorageMock['theme'] = 'dark';

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Switch to Frankenstein monster theme');
    });

    it('should have correct title for frankenstein theme', () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Switch to light mode');
    });
  });

  describe('Theme Switching Interaction', () => {
    it('should cycle through themes when clicked', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      // Start with light (sun icon)
      expect(button.textContent).toContain('☀️');

      // Click to switch to dark
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(button.textContent).toContain('🌙');
      });

      // Click to switch to frankenstein
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(button.textContent).toContain('⬢');
      });

      // Click to switch back to light
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(button.textContent).toContain('☀️');
      });
    });

    it('should update aria-label after each click', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      // Light theme
      expect(button).toHaveAttribute('aria-label', 'Current theme: light. Switch to dark mode');

      // Switch to dark
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-label', 'Current theme: dark. Switch to Frankenstein monster theme');
      });

      // Switch to frankenstein
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-label', 'Current theme: frankenstein. Switch to light mode');
      });

      // Switch back to light
      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-label', 'Current theme: light. Switch to dark mode');
      });
    });
  });

  describe('CSS Classes', () => {
    it('should have theme-toggle class', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('theme-toggle');
    });

    it('should have theme-toggle-icon class on icon span', () => {
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const iconSpan = document.querySelector('.theme-toggle-icon');
      expect(iconSpan).toBeInTheDocument();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should be keyboard accessible with Enter key', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      button.focus();

      expect(button.textContent).toContain('☀️');

      await act(async () => {
        await user.keyboard('{Enter}');
      });

      await waitFor(() => {
        expect(button.textContent).toContain('🌙');
      });
    });

    it('should be keyboard accessible with Space key', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      button.focus();

      expect(button.textContent).toContain('☀️');

      await act(async () => {
        await user.keyboard(' ');
      });

      await waitFor(() => {
        expect(button.textContent).toContain('🌙');
      });
    });
  });

  describe('Multiple Instances', () => {
    it('should synchronize multiple ThemeToggle instances', async () => {
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
      expect(buttons).toHaveLength(2);

      // Both should start with sun icon
      expect(buttons[0].textContent).toContain('☀️');
      expect(buttons[1].textContent).toContain('☀️');

      // Click first button
      await act(async () => {
        await user.click(buttons[0]);
      });

      // Both should update to moon icon
      await waitFor(() => {
        expect(buttons[0].textContent).toContain('🌙');
        expect(buttons[1].textContent).toContain('🌙');
      });
    });
  });
});
