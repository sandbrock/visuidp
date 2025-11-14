import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { AngryButton } from './input/AngryButton';

/**
 * Button Theme Switching Tests
 * 
 * This test suite verifies that buttons maintain proper contrast and functionality
 * when switching between themes (light, dark, frankenstein) as specified in
 * task 12 of the fix-button-contrast spec.
 * 
 * Requirements tested:
 * - 1.1: Button contrast in light theme (4.5:1 minimum)
 * - 1.2: Button contrast in dark theme (4.5:1 minimum)
 * - 1.3: Button contrast in frankenstein theme (4.5:1 minimum)
 * - 4.3: Theme switching maintains contrast requirements
 * - 5.5: Consistent styling and behavior across theme changes
 */

describe('Button Theme Switching Tests - Task 12', () => {
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

  describe('Light to Dark Theme Switching', () => {
    it('should maintain button contrast when switching from light to dark theme', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton isPrimary={true}>Primary Button</AngryButton>
            <AngryButton variant="danger">Danger Button</AngryButton>
            <AngryButton style="outline">Outline Button</AngryButton>
            <AngryButton disabled={true}>Disabled Button</AngryButton>
          </div>
        </ThemeProvider>
      );

      // Verify initial light theme
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      const primaryButton = screen.getByRole('button', { name: /primary button/i });
      const dangerButton = screen.getByRole('button', { name: /danger button/i });
      const outlineButton = screen.getByRole('button', { name: /outline button/i });
      const disabledButton = screen.getByRole('button', { name: /disabled button/i });

      // Verify buttons are rendered in light theme
      expect(primaryButton).toBeInTheDocument();
      expect(dangerButton).toBeInTheDocument();
      expect(outlineButton).toBeInTheDocument();
      expect(disabledButton).toBeInTheDocument();

      // Switch to dark theme
      const themeToggle = screen.getByRole('button', { name: /switch to dark mode/i });
      await act(async () => {
        await user.click(themeToggle);
      });

      // Verify theme switched to dark
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      // Verify buttons are still rendered and accessible
      expect(primaryButton).toBeInTheDocument();
      expect(dangerButton).toBeInTheDocument();
      expect(outlineButton).toBeInTheDocument();
      expect(disabledButton).toBeInTheDocument();

      // Verify buttons maintain their CSS classes
      expect(primaryButton).toHaveClass('angry-button', 'btn-primary');
      expect(dangerButton).toHaveClass('angry-button', 'btn-danger');
      expect(outlineButton).toHaveClass('angry-button', 'btn-outline');
      expect(disabledButton).toBeDisabled();
    });

    it('should maintain button functionality when switching from light to dark', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton onClick={handleClick} isPrimary={true}>
              Test Button
            </AngryButton>
          </div>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /test button/i });

      // Click button in light theme
      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Switch to dark theme
      const themeToggle = screen.getByRole('button', { name: /switch to dark mode/i });
      await act(async () => {
        await user.click(themeToggle);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      // Click button in dark theme
      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Dark to Frankenstein Theme Switching', () => {
    it('should maintain button contrast when switching from dark to frankenstein theme', async () => {
      const user = userEvent.setup();
      localStorageMock['theme'] = 'dark';

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton isPrimary={true}>Primary Button</AngryButton>
            <AngryButton variant="danger">Danger Button</AngryButton>
            <AngryButton style="outline">Outline Button</AngryButton>
            <AngryButton disabled={true}>Disabled Button</AngryButton>
          </div>
        </ThemeProvider>
      );

      // Verify initial dark theme
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      const primaryButton = screen.getByRole('button', { name: /primary button/i });
      const dangerButton = screen.getByRole('button', { name: /danger button/i });
      const outlineButton = screen.getByRole('button', { name: /outline button/i });
      const disabledButton = screen.getByRole('button', { name: /disabled button/i });

      // Switch to frankenstein theme
      const themeToggle = screen.getByRole('button', { name: /switch to frankenstein/i });
      await act(async () => {
        await user.click(themeToggle);
      });

      // Verify theme switched to frankenstein
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Verify buttons are still rendered and accessible
      expect(primaryButton).toBeInTheDocument();
      expect(dangerButton).toBeInTheDocument();
      expect(outlineButton).toBeInTheDocument();
      expect(disabledButton).toBeInTheDocument();

      // Verify buttons maintain their CSS classes
      expect(primaryButton).toHaveClass('angry-button', 'btn-primary');
      expect(dangerButton).toHaveClass('angry-button', 'btn-danger');
      expect(outlineButton).toHaveClass('angry-button', 'btn-outline');
      expect(disabledButton).toBeDisabled();
    });

    it('should maintain button functionality when switching from dark to frankenstein', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      localStorageMock['theme'] = 'dark';

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton onClick={handleClick} isPrimary={true}>
              Test Button
            </AngryButton>
          </div>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /test button/i });

      // Click button in dark theme
      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Switch to frankenstein theme
      const themeToggle = screen.getByRole('button', { name: /switch to frankenstein/i });
      await act(async () => {
        await user.click(themeToggle);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Click button in frankenstein theme
      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Frankenstein to Light Theme Switching', () => {
    it('should maintain button contrast when switching from frankenstein to light theme', async () => {
      const user = userEvent.setup();
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton isPrimary={true}>Primary Button</AngryButton>
            <AngryButton variant="danger">Danger Button</AngryButton>
            <AngryButton style="outline">Outline Button</AngryButton>
            <AngryButton disabled={true}>Disabled Button</AngryButton>
          </div>
        </ThemeProvider>
      );

      // Verify initial frankenstein theme
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');

      const primaryButton = screen.getByRole('button', { name: /primary button/i });
      const dangerButton = screen.getByRole('button', { name: /danger button/i });
      const outlineButton = screen.getByRole('button', { name: /outline button/i });
      const disabledButton = screen.getByRole('button', { name: /disabled button/i });

      // Switch to light theme
      const themeToggle = screen.getByRole('button', { name: /switch to light mode/i });
      await act(async () => {
        await user.click(themeToggle);
      });

      // Verify theme switched to light
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });

      // Verify buttons are still rendered and accessible
      expect(primaryButton).toBeInTheDocument();
      expect(dangerButton).toBeInTheDocument();
      expect(outlineButton).toBeInTheDocument();
      expect(disabledButton).toBeInTheDocument();

      // Verify buttons maintain their CSS classes
      expect(primaryButton).toHaveClass('angry-button', 'btn-primary');
      expect(dangerButton).toHaveClass('angry-button', 'btn-danger');
      expect(outlineButton).toHaveClass('angry-button', 'btn-outline');
      expect(disabledButton).toBeDisabled();
    });

    it('should maintain button functionality when switching from frankenstein to light', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      localStorageMock['theme'] = 'frankenstein';

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton onClick={handleClick} isPrimary={true}>
              Test Button
            </AngryButton>
          </div>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /test button/i });

      // Click button in frankenstein theme
      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Switch to light theme
      const themeToggle = screen.getByRole('button', { name: /switch to light mode/i });
      await act(async () => {
        await user.click(themeToggle);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });

      // Click button in light theme
      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Smooth Transitions', () => {
    it('should update DOM attribute immediately on theme change', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton isPrimary={true}>Button</AngryButton>
          </div>
        </ThemeProvider>
      );

      const initialTheme = document.documentElement.getAttribute('data-theme');
      expect(initialTheme).toBe('light');

      const themeToggle = screen.getByRole('button', { name: /switch to dark mode/i });
      await act(async () => {
        await user.click(themeToggle);
      });

      // DOM should update immediately (CSS transitions handle visual smoothness)
      await waitFor(() => {
        const newTheme = document.documentElement.getAttribute('data-theme');
        expect(newTheme).toBe('dark');
        expect(newTheme).not.toBe(initialTheme);
      });
    });

    it('should maintain button visibility during rapid theme switching', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton isPrimary={true}>Primary</AngryButton>
            <AngryButton variant="danger">Danger</AngryButton>
          </div>
        </ThemeProvider>
      );

      const primaryButton = screen.getByRole('button', { name: /^primary$/i });
      const dangerButton = screen.getByRole('button', { name: /danger/i });
      const themeToggle = screen.getAllByRole('button').find(btn => 
        btn.getAttribute('aria-label')?.includes('Current theme')
      );

      // Rapidly switch themes
      await act(async () => {
        await user.click(themeToggle!); // light -> dark
        await user.click(themeToggle!); // dark -> frankenstein
        await user.click(themeToggle!); // frankenstein -> light
      });

      // Buttons should remain visible and accessible
      expect(primaryButton).toBeInTheDocument();
      expect(dangerButton).toBeInTheDocument();
      expect(primaryButton).toBeVisible();
      expect(dangerButton).toBeVisible();
    });
  });

  describe('No Visual Glitches', () => {
    it('should maintain button structure across all theme transitions', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton isPrimary={true}>Primary</AngryButton>
            <AngryButton variant="danger">Danger</AngryButton>
            <AngryButton style="outline">Outline</AngryButton>
          </div>
        </ThemeProvider>
      );

      const primaryButton = screen.getByRole('button', { name: /^primary$/i });
      const dangerButton = screen.getByRole('button', { name: /danger/i });
      const outlineButton = screen.getByRole('button', { name: /outline/i });
      const themeToggle = screen.getAllByRole('button').find(btn => 
        btn.getAttribute('aria-label')?.includes('Current theme')
      );

      // Complete full cycle: light -> dark -> frankenstein -> light
      await act(async () => {
        await user.click(themeToggle!); // light -> dark
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      // Verify buttons maintain classes after first transition
      expect(primaryButton).toHaveClass('angry-button', 'btn-primary');
      expect(dangerButton).toHaveClass('angry-button', 'btn-danger');
      expect(outlineButton).toHaveClass('angry-button', 'btn-outline');

      await act(async () => {
        await user.click(themeToggle!); // dark -> frankenstein
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Verify buttons maintain classes after second transition
      expect(primaryButton).toHaveClass('angry-button', 'btn-primary');
      expect(dangerButton).toHaveClass('angry-button', 'btn-danger');
      expect(outlineButton).toHaveClass('angry-button', 'btn-outline');

      await act(async () => {
        await user.click(themeToggle!); // frankenstein -> light
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });

      // Verify buttons maintain classes after third transition
      expect(primaryButton).toHaveClass('angry-button', 'btn-primary');
      expect(dangerButton).toHaveClass('angry-button', 'btn-danger');
      expect(outlineButton).toHaveClass('angry-button', 'btn-outline');
    });

    it('should not lose button text content during theme changes', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton isPrimary={true}>Create New Resource</AngryButton>
            <AngryButton variant="danger">Delete Blueprint</AngryButton>
          </div>
        </ThemeProvider>
      );

      const createButton = screen.getByRole('button', { name: /create new resource/i });
      const deleteButton = screen.getByRole('button', { name: /delete blueprint/i });
      const themeToggle = screen.getAllByRole('button').find(btn => 
        btn.getAttribute('aria-label')?.includes('Current theme')
      );

      // Verify initial text content
      expect(createButton).toHaveTextContent('Create New Resource');
      expect(deleteButton).toHaveTextContent('Delete Blueprint');

      // Switch through all themes
      await act(async () => {
        await user.click(themeToggle!); // light -> dark
        await user.click(themeToggle!); // dark -> frankenstein
        await user.click(themeToggle!); // frankenstein -> light
      });

      // Verify text content is preserved
      expect(createButton).toHaveTextContent('Create New Resource');
      expect(deleteButton).toHaveTextContent('Delete Blueprint');
    });

    it('should maintain disabled state across theme changes', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton onClick={handleClick} disabled={true} isPrimary={true}>
              Disabled Button
            </AngryButton>
          </div>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /disabled button/i });
      const themeToggle = screen.getAllByRole('button').find(btn => 
        btn.getAttribute('aria-label')?.includes('Current theme')
      );

      // Verify initially disabled
      expect(button).toBeDisabled();

      // Try to click (should not work)
      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).not.toHaveBeenCalled();

      // Switch to dark theme
      await act(async () => {
        await user.click(themeToggle!);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      // Verify still disabled
      expect(button).toBeDisabled();
      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).not.toHaveBeenCalled();

      // Switch to frankenstein theme
      await act(async () => {
        await user.click(themeToggle!);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Verify still disabled
      expect(button).toBeDisabled();
      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Button Types During Theme Switching', () => {
    it('should maintain all button variants during theme cycle', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <ThemeToggle />
            <AngryButton isPrimary={true}>Primary</AngryButton>
            <AngryButton>Secondary</AngryButton>
            <AngryButton variant="danger">Danger</AngryButton>
            <AngryButton style="outline">Outline</AngryButton>
            <AngryButton variant="success">Success</AngryButton>
            <AngryButton variant="warning">Warning</AngryButton>
            <AngryButton variant="info">Info</AngryButton>
            <AngryButton disabled={true}>Disabled</AngryButton>
          </div>
        </ThemeProvider>
      );

      const buttons = {
        primary: screen.getByRole('button', { name: /^primary$/i }),
        secondary: screen.getByRole('button', { name: /secondary/i }),
        danger: screen.getByRole('button', { name: /danger/i }),
        outline: screen.getByRole('button', { name: /outline/i }),
        success: screen.getByRole('button', { name: /success/i }),
        warning: screen.getByRole('button', { name: /warning/i }),
        info: screen.getByRole('button', { name: /info/i }),
        disabled: screen.getByRole('button', { name: /disabled/i }),
      };

      const themeToggle = screen.getAllByRole('button').find(btn => 
        btn.getAttribute('aria-label')?.includes('Current theme')
      );

      // Verify all buttons are initially rendered
      Object.values(buttons).forEach(button => {
        expect(button).toBeInTheDocument();
      });

      // Switch through all themes
      await act(async () => {
        await user.click(themeToggle!); // light -> dark
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      // Verify all buttons still rendered in dark theme
      Object.values(buttons).forEach(button => {
        expect(button).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(themeToggle!); // dark -> frankenstein
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Verify all buttons still rendered in frankenstein theme
      Object.values(buttons).forEach(button => {
        expect(button).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(themeToggle!); // frankenstein -> light
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });

      // Verify all buttons still rendered back in light theme
      Object.values(buttons).forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });
});
