import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileIcon, getInitials } from './ProfileIcon';

describe('ProfileIcon Component', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Initials Generation', () => {
    it('should extract initials from email with first.last format', () => {
      expect(getInitials('john.doe@example.com')).toBe('JD');
    });

    it('should extract initials from email with multiple dots', () => {
      expect(getInitials('mary.jane.watson@example.com')).toBe('MJ');
    });

    it('should extract first two characters from simple email', () => {
      expect(getInitials('jane@example.com')).toBe('JA');
    });

    it('should extract first two characters from username without dots', () => {
      expect(getInitials('user@example.com')).toBe('US');
    });

    it('should handle single character email', () => {
      expect(getInitials('a@example.com')).toBe('A');
    });

    it('should return "U" for empty email', () => {
      expect(getInitials('')).toBe('U');
    });

    it('should convert initials to uppercase', () => {
      expect(getInitials('john.doe@example.com')).toBe('JD');
      expect(getInitials('JOHN.DOE@example.com')).toBe('JD');
    });

    it('should display correct initials in the component', () => {
      render(
        <ProfileIcon
          userEmail="test.user@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('TU')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should not have active class when dropdown is closed', () => {
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('active');
    });

    it('should have active class when dropdown is open', () => {
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={true}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('active');
    });

    it('should toggle active class based on isOpen prop', () => {
      const { rerender } = render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('active');

      rerender(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={true}
          onClick={mockOnClick}
        />
      );

      expect(button).toHaveClass('active');
    });
  });

  describe('Keyboard Interactions', () => {
    it('should call onClick when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Space key is pressed', async () => {
      const user = userEvent.setup();
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard(' ');

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick for other keys', async () => {
      const user = userEvent.setup();
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{Tab}');
      await user.keyboard('a');

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should call onClick when clicked with mouse', async () => {
      const user = userEvent.setup();
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should be focusable with keyboard navigation', () => {
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Accessibility Attributes', () => {
    it('should have role="button"', () => {
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should have aria-label describing the button purpose', () => {
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button', { name: 'User profile menu' });
      expect(button).toBeInTheDocument();
    });

    it('should have aria-expanded="false" when dropdown is closed', () => {
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have aria-expanded="true" when dropdown is open', () => {
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={true}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-haspopup="true"', () => {
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should have aria-hidden on initials span', () => {
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const initialsSpan = screen.getByText('TE');
      expect(initialsSpan).toHaveAttribute('aria-hidden', 'true');
    });

    it('should update aria-expanded when isOpen changes', () => {
      const { rerender } = render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      rerender(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={true}
          onClick={mockOnClick}
        />
      );

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Component Structure', () => {
    it('should render with profile-icon class', () => {
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('profile-icon');
    });

    it('should render initials inside a span with profile-initials class', () => {
      const { container } = render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      const initialsSpan = container.querySelector('.profile-initials');
      expect(initialsSpan).toBeInTheDocument();
      expect(initialsSpan).toHaveTextContent('TE');
    });

    it('should forward ref to button element', () => {
      const ref = { current: null };
      render(
        <ProfileIcon
          ref={ref}
          userEmail="test@example.com"
          isOpen={false}
          onClick={mockOnClick}
        />
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});
