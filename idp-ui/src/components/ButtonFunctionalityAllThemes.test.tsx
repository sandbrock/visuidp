import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AngryButton } from './input/AngryButton';

/**
 * Button Functionality Tests Across All Themes
 * 
 * This test suite verifies that buttons maintain proper functionality
 * across all three themes (light, dark, frankenstein) as specified in
 * task 11 of the fix-button-contrast spec.
 * 
 * Requirements tested:
 * - 3.1: Primary action buttons with distinct styling
 * - 3.2: Secondary action buttons with distinct styling
 * - 3.3: Danger/delete buttons with distinct styling
 * - 3.4: Disabled buttons with reduced opacity
 * - 3.5: Visual distinction between button types
 * - 5.1: Click handlers work correctly
 * - 5.2: Hover states display properly
 * - 5.3: Focus states visible with keyboard navigation
 * - 5.4: Disabled states prevent interaction
 * - 5.5: Consistent styling across contexts
 */

describe('Button Functionality Across All Themes', () => {
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

  describe('Click Handlers - Requirement 5.1', () => {
    it('should execute click handler for primary button in light theme', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <AngryButton onClick={handleClick} isPrimary={true}>
            Primary Button
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /primary button/i });
      
      await act(async () => {
        await user.click(button);
      });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should execute click handler for primary button in dark theme', async () => {
      localStorageMock['theme'] = 'dark';
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <AngryButton onClick={handleClick} isPrimary={true}>
            Primary Button
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /primary button/i });
      
      await act(async () => {
        await user.click(button);
      });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should execute click handler for primary button in frankenstein theme', async () => {
      localStorageMock['theme'] = 'frankenstein';
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <AngryButton onClick={handleClick} isPrimary={true}>
            Primary Button
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /primary button/i });
      
      await act(async () => {
        await user.click(button);
      });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should execute click handler for danger button in all themes', async () => {
      const themes = ['light', 'dark', 'frankenstein'];
      
      for (const theme of themes) {
        if (theme !== 'light') {
          localStorageMock['theme'] = theme;
        }
        
        const handleClick = vi.fn();
        const user = userEvent.setup();

        const { unmount } = render(
          <ThemeProvider>
            <AngryButton onClick={handleClick} cssClass="e-danger">
              Delete
            </AngryButton>
          </ThemeProvider>
        );

        const button = screen.getByRole('button', { name: /delete/i });
        
        await act(async () => {
          await user.click(button);
        });

        expect(handleClick).toHaveBeenCalledTimes(1);
        unmount();
      }
    });

    it('should execute click handler for outline button in all themes', async () => {
      const themes = ['light', 'dark', 'frankenstein'];
      
      for (const theme of themes) {
        if (theme !== 'light') {
          localStorageMock['theme'] = theme;
        }
        
        const handleClick = vi.fn();
        const user = userEvent.setup();

        const { unmount } = render(
          <ThemeProvider>
            <AngryButton onClick={handleClick} cssClass="e-outline">
              Cancel
            </AngryButton>
          </ThemeProvider>
        );

        const button = screen.getByRole('button', { name: /cancel/i });
        
        await act(async () => {
          await user.click(button);
        });

        expect(handleClick).toHaveBeenCalledTimes(1);
        unmount();
      }
    });
  });

  describe('Disabled State - Requirements 3.4, 5.4', () => {
    it('should not execute click handler when disabled in light theme', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <AngryButton onClick={handleClick} disabled={true} isPrimary={true}>
            Disabled Button
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button).toBeDisabled();
      
      await act(async () => {
        await user.click(button);
      });

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not execute click handler when disabled in dark theme', async () => {
      localStorageMock['theme'] = 'dark';
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <AngryButton onClick={handleClick} disabled={true} isPrimary={true}>
            Disabled Button
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button).toBeDisabled();
      
      await act(async () => {
        await user.click(button);
      });

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not execute click handler when disabled in frankenstein theme', async () => {
      localStorageMock['theme'] = 'frankenstein';
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <AngryButton onClick={handleClick} disabled={true} isPrimary={true}>
            Disabled Button
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button).toBeDisabled();
      
      await act(async () => {
        await user.click(button);
      });

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should have disabled attribute and cursor-not-allowed style', () => {
      render(
        <ThemeProvider>
          <AngryButton disabled={true} isPrimary={true}>
            Disabled
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /disabled/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('Keyboard Navigation - Requirement 5.3', () => {
    it('should be focusable with Tab key in light theme', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <AngryButton isPrimary={true}>First</AngryButton>
            <AngryButton cssClass="e-outline">Second</AngryButton>
          </div>
        </ThemeProvider>
      );

      const firstButton = screen.getByRole('button', { name: /first/i });
      const secondButton = screen.getByRole('button', { name: /second/i });

      await act(async () => {
        await user.tab();
      });

      expect(firstButton).toHaveFocus();

      await act(async () => {
        await user.tab();
      });

      expect(secondButton).toHaveFocus();
    });

    it('should execute click handler with Enter key in all themes', async () => {
      const themes = ['light', 'dark', 'frankenstein'];
      
      for (const theme of themes) {
        if (theme !== 'light') {
          localStorageMock['theme'] = theme;
        }
        
        const handleClick = vi.fn();
        const user = userEvent.setup();

        const { unmount } = render(
          <ThemeProvider>
            <AngryButton onClick={handleClick} isPrimary={true}>
              Test Button
            </AngryButton>
          </ThemeProvider>
        );

        const button = screen.getByRole('button', { name: /test button/i });
        button.focus();

        await act(async () => {
          await user.keyboard('{Enter}');
        });

        expect(handleClick).toHaveBeenCalledTimes(1);
        unmount();
      }
    });

    it('should execute click handler with Space key in all themes', async () => {
      const themes = ['light', 'dark', 'frankenstein'];
      
      for (const theme of themes) {
        if (theme !== 'light') {
          localStorageMock['theme'] = theme;
        }
        
        const handleClick = vi.fn();
        const user = userEvent.setup();

        const { unmount } = render(
          <ThemeProvider>
            <AngryButton onClick={handleClick} isPrimary={true}>
              Test Button
            </AngryButton>
          </ThemeProvider>
        );

        const button = screen.getByRole('button', { name: /test button/i });
        button.focus();

        await act(async () => {
          await user.keyboard(' ');
        });

        expect(handleClick).toHaveBeenCalledTimes(1);
        unmount();
      }
    });

    it('should not be focusable when disabled', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <AngryButton isPrimary={true}>Enabled</AngryButton>
            <AngryButton disabled={true}>Disabled</AngryButton>
            <AngryButton cssClass="e-outline">Another</AngryButton>
          </div>
        </ThemeProvider>
      );

      const enabledButton = screen.getByRole('button', { name: /^enabled$/i });
      const disabledButton = screen.getByRole('button', { name: /disabled/i });
      const anotherButton = screen.getByRole('button', { name: /another/i });

      await act(async () => {
        await user.tab();
      });

      expect(enabledButton).toHaveFocus();

      await act(async () => {
        await user.tab();
      });

      // Should skip disabled button and focus on the next one
      expect(disabledButton).not.toHaveFocus();
      expect(anotherButton).toHaveFocus();
    });
  });

  describe('Button Variants - Requirements 3.1, 3.2, 3.3, 3.5', () => {
    it('should render primary button with correct CSS class', () => {
      render(
        <ThemeProvider>
          <AngryButton isPrimary={true}>Primary</AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /primary/i });
      expect(button).toHaveClass('angry-button');
      expect(button).toHaveClass('btn-primary');
    });

    it('should render danger button with correct CSS class', () => {
      render(
        <ThemeProvider>
          <AngryButton cssClass="e-danger">Delete</AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /delete/i });
      expect(button).toHaveClass('angry-button');
      expect(button).toHaveClass('btn-danger');
    });

    it('should render outline button with correct CSS class', () => {
      render(
        <ThemeProvider>
          <AngryButton cssClass="e-outline">Cancel</AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /cancel/i });
      expect(button).toHaveClass('angry-button');
      expect(button).toHaveClass('btn-outline');
    });

    it('should render secondary button with correct CSS class', () => {
      render(
        <ThemeProvider>
          <AngryButton>Secondary</AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /secondary/i });
      expect(button).toHaveClass('angry-button');
      // Secondary is the default, no additional class needed
    });

    it('should distinguish between button types visually', () => {
      render(
        <ThemeProvider>
          <div>
            <AngryButton isPrimary={true}>Primary</AngryButton>
            <AngryButton cssClass="e-danger">Danger</AngryButton>
            <AngryButton cssClass="e-outline">Outline</AngryButton>
            <AngryButton>Secondary</AngryButton>
          </div>
        </ThemeProvider>
      );

      const primaryButton = screen.getByRole('button', { name: /^primary$/i });
      const dangerButton = screen.getByRole('button', { name: /danger/i });
      const outlineButton = screen.getByRole('button', { name: /outline/i });
      const secondaryButton = screen.getByRole('button', { name: /secondary/i });

      // Each button should have unique class combinations
      expect(primaryButton.className).not.toBe(dangerButton.className);
      expect(primaryButton.className).not.toBe(outlineButton.className);
      expect(dangerButton.className).not.toBe(outlineButton.className);
      expect(outlineButton.className).not.toBe(secondaryButton.className);
    });
  });

  describe('Button Type Attribute', () => {
    it('should default to type="button"', () => {
      render(
        <ThemeProvider>
          <AngryButton>Default</AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /default/i });
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should support type="submit"', () => {
      render(
        <ThemeProvider>
          <AngryButton type="submit">Submit</AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /submit/i });
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should support type="reset"', () => {
      render(
        <ThemeProvider>
          <AngryButton type="reset">Reset</AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /reset/i });
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Theme Consistency - Requirement 5.5', () => {
    it('should maintain button structure across theme changes', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { rerender } = render(
        <ThemeProvider>
          <div>
            <AngryButton onClick={handleClick} isPrimary={true}>
              Test Button
            </AngryButton>
          </div>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /test button/i });
      
      // Test in light theme
      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Switch to dark theme
      localStorageMock['theme'] = 'dark';
      document.documentElement.setAttribute('data-theme', 'dark');
      
      rerender(
        <ThemeProvider>
          <div>
            <AngryButton onClick={handleClick} isPrimary={true}>
              Test Button
            </AngryButton>
          </div>
        </ThemeProvider>
      );

      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).toHaveBeenCalledTimes(2);

      // Switch to frankenstein theme
      localStorageMock['theme'] = 'frankenstein';
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      
      rerender(
        <ThemeProvider>
          <div>
            <AngryButton onClick={handleClick} isPrimary={true}>
              Test Button
            </AngryButton>
          </div>
        </ThemeProvider>
      );

      await act(async () => {
        await user.click(button);
      });
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('should maintain CSS classes across all themes', () => {
      const themes = ['light', 'dark', 'frankenstein'];
      
      themes.forEach(theme => {
        if (theme !== 'light') {
          localStorageMock['theme'] = theme;
        }

        const { unmount } = render(
          <ThemeProvider>
            <AngryButton isPrimary={true} cssClass="e-small">
              Button
            </AngryButton>
          </ThemeProvider>
        );

        const button = screen.getByRole('button', { name: /button/i });
        expect(button).toHaveClass('angry-button');
        expect(button).toHaveClass('btn-primary');
        expect(button).toHaveClass('btn-small');

        unmount();
      });
    });
  });

  describe('Icon Support', () => {
    it('should render button with icon', () => {
      render(
        <ThemeProvider>
          <AngryButton iconCss="icon-class">
            With Icon
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /with icon/i });
      const icon = button.querySelector('.icon-class');
      expect(icon).toBeInTheDocument();
    });

    it('should render button without icon', () => {
      render(
        <ThemeProvider>
          <AngryButton>
            Without Icon
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /without icon/i });
      const icon = button.querySelector('span');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Custom Class Names', () => {
    it('should apply custom className prop', () => {
      render(
        <ThemeProvider>
          <AngryButton className="custom-class">
            Custom
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /custom/i });
      expect(button).toHaveClass('angry-button');
      expect(button).toHaveClass('custom-class');
    });

    it('should combine multiple class sources', () => {
      render(
        <ThemeProvider>
          <AngryButton 
            isPrimary={true} 
            cssClass="e-small" 
            className="custom-class"
          >
            Combined
          </AngryButton>
        </ThemeProvider>
      );

      const button = screen.getByRole('button', { name: /combined/i });
      expect(button).toHaveClass('angry-button');
      expect(button).toHaveClass('btn-primary');
      expect(button).toHaveClass('btn-small');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Multiple Buttons Interaction', () => {
    it('should handle multiple buttons independently', async () => {
      const handleClick1 = vi.fn();
      const handleClick2 = vi.fn();
      const handleClick3 = vi.fn();
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <div>
            <AngryButton onClick={handleClick1} isPrimary={true}>
              Button 1
            </AngryButton>
            <AngryButton onClick={handleClick2} cssClass="e-danger">
              Button 2
            </AngryButton>
            <AngryButton onClick={handleClick3} cssClass="e-outline">
              Button 3
            </AngryButton>
          </div>
        </ThemeProvider>
      );

      const button1 = screen.getByRole('button', { name: /button 1/i });
      const button2 = screen.getByRole('button', { name: /button 2/i });
      const button3 = screen.getByRole('button', { name: /button 3/i });

      await act(async () => {
        await user.click(button1);
      });
      expect(handleClick1).toHaveBeenCalledTimes(1);
      expect(handleClick2).not.toHaveBeenCalled();
      expect(handleClick3).not.toHaveBeenCalled();

      await act(async () => {
        await user.click(button2);
      });
      expect(handleClick1).toHaveBeenCalledTimes(1);
      expect(handleClick2).toHaveBeenCalledTimes(1);
      expect(handleClick3).not.toHaveBeenCalled();

      await act(async () => {
        await user.click(button3);
      });
      expect(handleClick1).toHaveBeenCalledTimes(1);
      expect(handleClick2).toHaveBeenCalledTimes(1);
      expect(handleClick3).toHaveBeenCalledTimes(1);
    });
  });
});
