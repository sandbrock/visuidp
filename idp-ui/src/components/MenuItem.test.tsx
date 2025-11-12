import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { MenuItem } from './MenuItem';

describe('MenuItem Component', () => {
  describe('Link Variant Rendering', () => {
    it('should render as Link when "to" prop is provided', () => {
      render(
        <BrowserRouter>
          <MenuItem label="Test Link" to="/test-path" />
        </BrowserRouter>
      );

      const link = screen.getByRole('menuitem');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/test-path');
    });

    it('should render label text in Link variant', () => {
      render(
        <BrowserRouter>
          <MenuItem label="Personal API Keys" to="/api-keys" />
        </BrowserRouter>
      );

      expect(screen.getByText('Personal API Keys')).toBeInTheDocument();
    });

    it('should render icon in Link variant when provided', () => {
      render(
        <BrowserRouter>
          <MenuItem label="Test Link" to="/test" icon="🔑" />
        </BrowserRouter>
      );

      expect(screen.getByText('🔑')).toBeInTheDocument();
    });

    it('should not render icon in Link variant when not provided', () => {
      const { container } = render(
        <BrowserRouter>
          <MenuItem label="Test Link" to="/test" />
        </BrowserRouter>
      );

      const iconSpan = container.querySelector('.menu-item-icon');
      expect(iconSpan).not.toBeInTheDocument();
    });

    it('should call onClick when Link is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(
        <BrowserRouter>
          <MenuItem label="Test Link" to="/test" onClick={mockOnClick} />
        </BrowserRouter>
      );

      const link = screen.getByRole('menuitem');
      await user.click(link);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should have menuitem role for Link variant', () => {
      render(
        <BrowserRouter>
          <MenuItem label="Test Link" to="/test" />
        </BrowserRouter>
      );

      const link = screen.getByRole('menuitem');
      expect(link).toHaveAttribute('role', 'menuitem');
    });

    it('should be keyboard accessible with tabIndex 0 for Link variant', () => {
      render(
        <BrowserRouter>
          <MenuItem label="Test Link" to="/test" />
        </BrowserRouter>
      );

      const link = screen.getByRole('menuitem');
      expect(link).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Button Variant Rendering', () => {
    it('should render as button when "onClick" prop is provided without "to"', () => {
      const mockOnClick = vi.fn();

      render(<MenuItem label="Test Button" onClick={mockOnClick} />);

      const button = screen.getByRole('menuitem');
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should render label text in button variant', () => {
      const mockOnClick = vi.fn();

      render(<MenuItem label="Sign Out" onClick={mockOnClick} />);

      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should render icon in button variant when provided', () => {
      const mockOnClick = vi.fn();

      render(<MenuItem label="Sign Out" onClick={mockOnClick} icon="🚪" />);

      expect(screen.getByText('🚪')).toBeInTheDocument();
    });

    it('should not render icon in button variant when not provided', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <MenuItem label="Test Button" onClick={mockOnClick} />
      );

      const iconSpan = container.querySelector('.menu-item-icon');
      expect(iconSpan).not.toBeInTheDocument();
    });

    it('should call onClick when button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(<MenuItem label="Test Button" onClick={mockOnClick} />);

      const button = screen.getByRole('menuitem');
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should have menuitem role for button variant', () => {
      const mockOnClick = vi.fn();

      render(<MenuItem label="Test Button" onClick={mockOnClick} />);

      const button = screen.getByRole('menuitem');
      expect(button).toHaveAttribute('role', 'menuitem');
    });

    it('should be keyboard accessible with tabIndex 0 for button variant', () => {
      const mockOnClick = vi.fn();

      render(<MenuItem label="Test Button" onClick={mockOnClick} />);

      const button = screen.getByRole('menuitem');
      expect(button).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Variant Styling', () => {
    it('should apply default variant class by default', () => {
      const mockOnClick = vi.fn();

      render(<MenuItem label="Test" onClick={mockOnClick} />);

      const button = screen.getByRole('menuitem');
      expect(button).toHaveClass('menu-item');
      expect(button).toHaveClass('menu-item-default');
    });

    it('should apply default variant class when explicitly specified', () => {
      const mockOnClick = vi.fn();

      render(
        <MenuItem label="Test" onClick={mockOnClick} variant="default" />
      );

      const button = screen.getByRole('menuitem');
      expect(button).toHaveClass('menu-item-default');
    });

    it('should apply danger variant class when specified', () => {
      const mockOnClick = vi.fn();

      render(<MenuItem label="Sign Out" onClick={mockOnClick} variant="danger" />);

      const button = screen.getByRole('menuitem');
      expect(button).toHaveClass('menu-item');
      expect(button).toHaveClass('menu-item-danger');
    });

    it('should apply danger variant to Link component', () => {
      render(
        <BrowserRouter>
          <MenuItem label="Delete" to="/delete" variant="danger" />
        </BrowserRouter>
      );

      const link = screen.getByRole('menuitem');
      expect(link).toHaveClass('menu-item-danger');
    });

    it('should apply base menu-item class to all variants', () => {
      const mockOnClick = vi.fn();

      const { rerender } = render(
        <MenuItem label="Test" onClick={mockOnClick} variant="default" />
      );

      let button = screen.getByRole('menuitem');
      expect(button).toHaveClass('menu-item');

      rerender(<MenuItem label="Test" onClick={mockOnClick} variant="danger" />);

      button = screen.getByRole('menuitem');
      expect(button).toHaveClass('menu-item');
    });
  });

  describe('Icon Display', () => {
    it('should display icon with aria-hidden attribute', () => {
      const mockOnClick = vi.fn();

      render(<MenuItem label="Test" onClick={mockOnClick} icon="🔑" />);

      const icon = screen.getByText('🔑');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should apply menu-item-icon class to icon span', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <MenuItem label="Test" onClick={mockOnClick} icon="🔑" />
      );

      const iconSpan = container.querySelector('.menu-item-icon');
      expect(iconSpan).toBeInTheDocument();
      expect(iconSpan).toHaveTextContent('🔑');
    });

    it('should render label with menu-item-label class', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <MenuItem label="Test Label" onClick={mockOnClick} />
      );

      const labelSpan = container.querySelector('.menu-item-label');
      expect(labelSpan).toBeInTheDocument();
      expect(labelSpan).toHaveTextContent('Test Label');
    });

    it('should render both icon and label when both provided', () => {
      const mockOnClick = vi.fn();
      const { container } = render(
        <MenuItem label="Personal API Keys" onClick={mockOnClick} icon="🔑" />
      );

      const iconSpan = container.querySelector('.menu-item-icon');
      const labelSpan = container.querySelector('.menu-item-label');

      expect(iconSpan).toBeInTheDocument();
      expect(iconSpan).toHaveTextContent('🔑');
      expect(labelSpan).toBeInTheDocument();
      expect(labelSpan).toHaveTextContent('Personal API Keys');
    });

    it('should support different icon types', () => {
      const mockOnClick = vi.fn();

      const { rerender } = render(
        <MenuItem label="Test" onClick={mockOnClick} icon="🔑" />
      );
      expect(screen.getByText('🔑')).toBeInTheDocument();

      rerender(<MenuItem label="Test" onClick={mockOnClick} icon="🚪" />);
      expect(screen.getByText('🚪')).toBeInTheDocument();

      rerender(<MenuItem label="Test" onClick={mockOnClick} icon="⚙️" />);
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should call onClick when Enter key is pressed on button', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(<MenuItem label="Test" onClick={mockOnClick} />);

      const button = screen.getByRole('menuitem');
      button.focus();

      await user.keyboard('{Enter}');

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Space key is pressed on button', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(<MenuItem label="Test" onClick={mockOnClick} />);

      const button = screen.getByRole('menuitem');
      button.focus();

      await user.keyboard(' ');

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Enter key is pressed on Link', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(
        <BrowserRouter>
          <MenuItem label="Test" to="/test" onClick={mockOnClick} />
        </BrowserRouter>
      );

      const link = screen.getByRole('menuitem');
      link.focus();

      await user.keyboard('{Enter}');

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Space key is pressed on Link', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(
        <BrowserRouter>
          <MenuItem label="Test" to="/test" onClick={mockOnClick} />
        </BrowserRouter>
      );

      const link = screen.getByRole('menuitem');
      link.focus();

      await user.keyboard(' ');

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick for other keys', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(<MenuItem label="Test" onClick={mockOnClick} />);

      const button = screen.getByRole('menuitem');
      button.focus();

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{Tab}');
      await user.keyboard('a');

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should use label as aria-label by default', () => {
      const mockOnClick = vi.fn();

      render(<MenuItem label="Personal API Keys" onClick={mockOnClick} />);

      const button = screen.getByRole('menuitem', { name: 'Personal API Keys' });
      expect(button).toBeInTheDocument();
    });

    it('should use custom aria-label when provided', () => {
      const mockOnClick = vi.fn();

      render(
        <MenuItem
          label="Sign Out"
          onClick={mockOnClick}
          ariaLabel="Sign out of your account"
        />
      );

      const button = screen.getByRole('menuitem', {
        name: 'Sign out of your account',
      });
      expect(button).toBeInTheDocument();
    });

    it('should apply aria-label to Link variant', () => {
      render(
        <BrowserRouter>
          <MenuItem
            label="API Keys"
            to="/api-keys"
            ariaLabel="Manage your API keys"
          />
        </BrowserRouter>
      );

      const link = screen.getByRole('menuitem', { name: 'Manage your API keys' });
      expect(link).toBeInTheDocument();
    });

    it('should have aria-hidden on icon to prevent screen reader announcement', () => {
      const mockOnClick = vi.fn();

      render(<MenuItem label="Test" onClick={mockOnClick} icon="🔑" />);

      const icon = screen.getByText('🔑');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle MenuItem without onClick or to props', () => {
      render(<MenuItem label="Static Item" />);

      const button = screen.getByRole('menuitem');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should prioritize Link rendering when both to and onClick are provided', () => {
      const mockOnClick = vi.fn();

      render(
        <BrowserRouter>
          <MenuItem label="Test" to="/test" onClick={mockOnClick} />
        </BrowserRouter>
      );

      const element = screen.getByRole('menuitem');
      expect(element.tagName).toBe('A');
      expect(element).toHaveAttribute('href', '/test');
    });

    it('should handle empty label gracefully', () => {
      const mockOnClick = vi.fn();

      render(<MenuItem label="" onClick={mockOnClick} />);

      const button = screen.getByRole('menuitem');
      expect(button).toBeInTheDocument();
    });

    it('should handle long labels', () => {
      const mockOnClick = vi.fn();
      const longLabel = 'This is a very long menu item label that might wrap';

      render(<MenuItem label={longLabel} onClick={mockOnClick} />);

      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });
  });
});
