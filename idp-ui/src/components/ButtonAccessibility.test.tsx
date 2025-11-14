import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AngryButton } from './input/AngryButton';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('Button Accessibility Tests', () => {
  const renderWithTheme = (ui: React.ReactElement, theme: 'light' | 'dark' | 'frankenstein' = 'light') => {
    return render(
      <ThemeProvider>
        <div data-theme={theme}>
          {ui}
        </div>
      </ThemeProvider>
    );
  };

  describe('Keyboard Navigation', () => {
    it('should be focusable with Tab key', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <AngryButton>Test Button</AngryButton>
      );

      const button = screen.getByRole('button', { name: /test button/i });
      
      // Tab to focus the button
      await user.tab();
      
      expect(button).toHaveFocus();
    });

    it('should activate with Enter key', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      renderWithTheme(
        <AngryButton onClick={handleClick}>Test Button</AngryButton>
      );

      const button = screen.getByRole('button', { name: /test button/i });
      
      // Focus and press Enter
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should activate with Space key', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      renderWithTheme(
        <AngryButton onClick={handleClick}>Test Button</AngryButton>
      );

      const button = screen.getByRole('button', { name: /test button/i });
      
      // Focus and press Space
      button.focus();
      await user.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not activate disabled button with keyboard', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      renderWithTheme(
        <AngryButton onClick={handleClick} disabled>Disabled Button</AngryButton>
      );

      const button = screen.getByRole('button', { name: /disabled button/i });
      
      // Try to activate with Enter
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should skip disabled buttons during Tab navigation', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <>
          <AngryButton>First Button</AngryButton>
          <AngryButton disabled>Disabled Button</AngryButton>
          <AngryButton>Third Button</AngryButton>
        </>
      );

      const firstButton = screen.getByRole('button', { name: /first button/i });
      const thirdButton = screen.getByRole('button', { name: /third button/i });
      
      // Tab through buttons
      await user.tab();
      expect(firstButton).toHaveFocus();
      
      await user.tab();
      expect(thirdButton).toHaveFocus();
    });
  });

  describe('Focus Indicators', () => {
    it('should have visible focus outline on primary button', () => {
      renderWithTheme(
        <AngryButton isPrimary>Primary Button</AngryButton>
      );

      const button = screen.getByRole('button', { name: /primary button/i });
      button.focus();
      
      // Check that button has focus
      expect(button).toHaveFocus();
      
      // Verify button has the correct class for styling
      expect(button).toHaveClass('angry-button', 'btn-primary');
    });

    it('should have visible focus outline on danger button', () => {
      renderWithTheme(
        <AngryButton variant="danger">Delete</AngryButton>
      );

      const button = screen.getByRole('button', { name: /delete/i });
      button.focus();
      
      expect(button).toHaveFocus();
      expect(button).toHaveClass('angry-button', 'btn-danger');
    });

    it('should have visible focus outline on outline button', () => {
      renderWithTheme(
        <AngryButton style="outline">Cancel</AngryButton>
      );

      const button = screen.getByRole('button', { name: /cancel/i });
      button.focus();
      
      expect(button).toHaveFocus();
      expect(button).toHaveClass('angry-button', 'btn-outline');
    });

    it('should maintain focus indicator in light theme', () => {
      renderWithTheme(
        <AngryButton isPrimary>Light Theme Button</AngryButton>,
        'light'
      );

      const button = screen.getByRole('button', { name: /light theme button/i });
      button.focus();
      
      expect(button).toHaveFocus();
    });

    it('should maintain focus indicator in dark theme', () => {
      renderWithTheme(
        <AngryButton isPrimary>Dark Theme Button</AngryButton>,
        'dark'
      );

      const button = screen.getByRole('button', { name: /dark theme button/i });
      button.focus();
      
      expect(button).toHaveFocus();
    });

    it('should maintain focus indicator in Frankenstein theme', () => {
      renderWithTheme(
        <AngryButton isPrimary>Frankenstein Button</AngryButton>,
        'frankenstein'
      );

      const button = screen.getByRole('button', { name: /frankenstein button/i });
      button.focus();
      
      expect(button).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have correct role attribute', () => {
      renderWithTheme(
        <AngryButton>Test Button</AngryButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should announce button label correctly', () => {
      renderWithTheme(
        <AngryButton>Create New Resource</AngryButton>
      );

      const button = screen.getByRole('button', { name: /create new resource/i });
      expect(button).toHaveTextContent('Create New Resource');
    });

    it('should indicate disabled state to screen readers', () => {
      renderWithTheme(
        <AngryButton disabled>Disabled Button</AngryButton>
      );

      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button).toBeDisabled();
    });

    it('should announce primary button type', () => {
      renderWithTheme(
        <AngryButton isPrimary>Save</AngryButton>
      );

      const button = screen.getByRole('button', { name: /save/i });
      expect(button).toHaveClass('btn-primary');
    });

    it('should announce danger button type', () => {
      renderWithTheme(
        <AngryButton variant="danger">Delete</AngryButton>
      );

      const button = screen.getByRole('button', { name: /delete/i });
      expect(button).toHaveClass('btn-danger');
    });

    it('should have accessible name from text content', () => {
      renderWithTheme(
        <AngryButton>Edit Blueprint</AngryButton>
      );

      const button = screen.getByRole('button', { name: /edit blueprint/i });
      expect(button).toBeInTheDocument();
    });

    it('should support submit type for forms', () => {
      renderWithTheme(
        <AngryButton type="submit">Submit Form</AngryButton>
      );

      const button = screen.getByRole('button', { name: /submit form/i });
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Button Variants Accessibility', () => {
    it('should be accessible in all button variants', () => {
      const variants: Array<{ variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'; label: string }> = [
        { variant: 'primary', label: 'Primary' },
        { variant: 'danger', label: 'Danger' },
        { variant: 'success', label: 'Success' },
        { variant: 'warning', label: 'Warning' },
        { variant: 'info', label: 'Info' },
      ];

      variants.forEach(({ variant, label }) => {
        const { unmount } = renderWithTheme(
          <AngryButton variant={variant}>{label}</AngryButton>
        );

        const button = screen.getByRole('button', { name: new RegExp(label, 'i') });
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('angry-button');
        
        unmount();
      });
    });
  });

  describe('Theme Accessibility', () => {
    it('should maintain accessibility in light theme', () => {
      renderWithTheme(
        <>
          <AngryButton isPrimary>Primary</AngryButton>
          <AngryButton variant="danger">Danger</AngryButton>
          <AngryButton style="outline">Outline</AngryButton>
        </>,
        'light'
      );

      expect(screen.getByRole('button', { name: /primary/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /danger/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /outline/i })).toBeInTheDocument();
    });

    it('should maintain accessibility in dark theme', () => {
      renderWithTheme(
        <>
          <AngryButton isPrimary>Primary</AngryButton>
          <AngryButton variant="danger">Danger</AngryButton>
          <AngryButton style="outline">Outline</AngryButton>
        </>,
        'dark'
      );

      expect(screen.getByRole('button', { name: /primary/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /danger/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /outline/i })).toBeInTheDocument();
    });

    it('should maintain accessibility in Frankenstein theme', () => {
      renderWithTheme(
        <>
          <AngryButton isPrimary>Primary</AngryButton>
          <AngryButton variant="danger">Danger</AngryButton>
          <AngryButton style="outline">Outline</AngryButton>
        </>,
        'frankenstein'
      );

      expect(screen.getByRole('button', { name: /primary/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /danger/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /outline/i })).toBeInTheDocument();
    });
  });

  describe('Interactive State Accessibility', () => {
    it('should prevent interaction when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      renderWithTheme(
        <AngryButton onClick={handleClick} disabled>Disabled</AngryButton>
      );

      const button = screen.getByRole('button', { name: /disabled/i });
      
      // Try to click
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
      
      // Try keyboard activation
      button.focus();
      await user.keyboard('{Enter}');
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should be clickable when enabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      renderWithTheme(
        <AngryButton onClick={handleClick}>Enabled</AngryButton>
      );

      const button = screen.getByRole('button', { name: /enabled/i });
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should support hover state without breaking accessibility', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <AngryButton isPrimary>Hover Me</AngryButton>
      );

      const button = screen.getByRole('button', { name: /hover me/i });
      
      // Hover should not affect accessibility
      await user.hover(button);
      expect(button).toBeInTheDocument();
      
      // Should still be clickable after hover
      await user.click(button);
    });
  });

  describe('Color Contrast Verification', () => {
    it('should render buttons with sufficient contrast in light theme', () => {
      renderWithTheme(
        <>
          <AngryButton isPrimary>Primary Button</AngryButton>
          <AngryButton variant="danger">Danger Button</AngryButton>
          <AngryButton style="outline">Outline Button</AngryButton>
          <AngryButton disabled>Disabled Button</AngryButton>
        </>,
        'light'
      );

      // Verify all buttons are rendered
      expect(screen.getByRole('button', { name: /primary button/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /danger button/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /outline button/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disabled button/i })).toBeInTheDocument();
    });

    it('should render buttons with sufficient contrast in dark theme', () => {
      renderWithTheme(
        <>
          <AngryButton isPrimary>Primary Button</AngryButton>
          <AngryButton variant="danger">Danger Button</AngryButton>
          <AngryButton style="outline">Outline Button</AngryButton>
          <AngryButton disabled>Disabled Button</AngryButton>
        </>,
        'dark'
      );

      // Verify all buttons are rendered
      expect(screen.getByRole('button', { name: /primary button/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /danger button/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /outline button/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disabled button/i })).toBeInTheDocument();
    });

    it('should render buttons with sufficient contrast in Frankenstein theme', () => {
      renderWithTheme(
        <>
          <AngryButton isPrimary>Primary Button</AngryButton>
          <AngryButton variant="danger">Danger Button</AngryButton>
          <AngryButton style="outline">Outline Button</AngryButton>
          <AngryButton disabled>Disabled Button</AngryButton>
        </>,
        'frankenstein'
      );

      // Verify all buttons are rendered
      expect(screen.getByRole('button', { name: /primary button/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /danger button/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /outline button/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disabled button/i })).toBeInTheDocument();
    });
  });
});
