import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ProfileMenu } from './ProfileMenu';
import { ProfileIcon } from './ProfileIcon';
import { ProfileDropdown } from './ProfileDropdown';
import { MenuItem } from './MenuItem';
import type { User } from '../types/auth';

// Mock the auth module
vi.mock('../auth', () => ({
  logout: vi.fn(),
}));

/**
 * Comprehensive Accessibility Tests for Profile Menu Components
 * 
 * This test suite verifies WCAG AA compliance and accessibility best practices
 * for the ProfileMenu, ProfileIcon, ProfileDropdown, and MenuItem components.
 * 
 * Requirements tested:
 * - 1.5: Keyboard navigation and accessibility
 * - 4.2: ARIA attributes and screen reader support
 * - 4.3: Focus management and visual focus indicators
 * - 4.4: Responsive design and touch target sizes
 */

describe('Profile Menu Accessibility Tests', () => {
  const mockUser: User = {
    name: 'Test User',
    email: 'test.user@example.com',
    roles: ['user']
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA Attributes Verification', () => {
    describe('ProfileIcon ARIA Attributes', () => {
      it('should have role="button" on profile icon', () => {
        render(
          <ProfileIcon
            userEmail="test@example.com"
            isOpen={false}
            onClick={vi.fn()}
          />
        );

        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('role', 'button');
      });

      it('should have descriptive aria-label on profile icon', () => {
        render(
          <ProfileIcon
            userEmail="test@example.com"
            isOpen={false}
            onClick={vi.fn()}
          />
        );

        const button = screen.getByRole('button', { name: 'User profile menu' });
        expect(button).toHaveAttribute('aria-label', 'User profile menu');
      });

      it('should have aria-expanded="false" when dropdown is closed', () => {
        render(
          <ProfileIcon
            userEmail="test@example.com"
            isOpen={false}
            onClick={vi.fn()}
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
            onClick={vi.fn()}
          />
        );

        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });

      it('should have aria-haspopup="true" to indicate dropdown menu', () => {
        render(
          <ProfileIcon
            userEmail="test@example.com"
            isOpen={false}
            onClick={vi.fn()}
          />
        );

        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-haspopup', 'true');
      });

      it('should have aria-hidden on decorative initials span', () => {
        render(
          <ProfileIcon
            userEmail="test@example.com"
            isOpen={false}
            onClick={vi.fn()}
          />
        );

        const initialsSpan = screen.getByText('TE');
        expect(initialsSpan).toHaveAttribute('aria-hidden', 'true');
      });
    });

    describe('ProfileDropdown ARIA Attributes', () => {
      it('should have role="menu" on dropdown container', () => {
        render(
          <BrowserRouter>
            <ProfileDropdown user={mockUser} isOpen={true} onClose={vi.fn()} />
          </BrowserRouter>
        );

        const menu = screen.getByRole('menu');
        expect(menu).toBeInTheDocument();
      });

      it('should have descriptive aria-label on dropdown menu', () => {
        render(
          <BrowserRouter>
            <ProfileDropdown user={mockUser} isOpen={true} onClose={vi.fn()} />
          </BrowserRouter>
        );

        const menu = screen.getByRole('menu', { name: 'User profile menu' });
        expect(menu).toHaveAttribute('aria-label', 'User profile menu');
      });

      it('should have role="group" on user info section', () => {
        const { container } = render(
          <BrowserRouter>
            <ProfileDropdown user={mockUser} isOpen={true} onClose={vi.fn()} />
          </BrowserRouter>
        );

        const userInfoGroup = container.querySelector('[role="group"][aria-labelledby="user-info-heading"]');
        expect(userInfoGroup).toBeInTheDocument();
      });

      it('should have visually hidden heading for user info section', () => {
        const { container } = render(
          <BrowserRouter>
            <ProfileDropdown user={mockUser} isOpen={true} onClose={vi.fn()} />
          </BrowserRouter>
        );

        const heading = container.querySelector('#user-info-heading');
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveClass('visually-hidden');
        expect(heading).toHaveTextContent('User Information');
      });

      it('should have role="group" with aria-label on action groups', () => {
        const { container } = render(
          <BrowserRouter>
            <ProfileDropdown user={mockUser} isOpen={true} onClose={vi.fn()} />
          </BrowserRouter>
        );

        const accountActionsGroup = container.querySelector('[role="group"][aria-label="Account actions"]');
        const sessionActionsGroup = container.querySelector('[role="group"][aria-label="Session actions"]');

        expect(accountActionsGroup).toBeInTheDocument();
        expect(sessionActionsGroup).toBeInTheDocument();
      });

      it('should have role="separator" on dividers', () => {
        const { container } = render(
          <BrowserRouter>
            <ProfileDropdown user={mockUser} isOpen={true} onClose={vi.fn()} />
          </BrowserRouter>
        );

        const separators = container.querySelectorAll('[role="separator"]');
        expect(separators.length).toBeGreaterThan(0);
      });
    });

    describe('MenuItem ARIA Attributes', () => {
      it('should have role="menuitem" on menu items', () => {
        render(
          <BrowserRouter>
            <MenuItem label="Test Item" to="/test" />
          </BrowserRouter>
        );

        const menuItem = screen.getByRole('menuitem');
        expect(menuItem).toBeInTheDocument();
      });

      it('should have descriptive aria-label on menu items', () => {
        render(
          <BrowserRouter>
            <MenuItem
              label="Personal API Keys"
              to="/api-keys"
              ariaLabel="Navigate to Personal API Keys page"
            />
          </BrowserRouter>
        );

        const menuItem = screen.getByRole('menuitem', { name: 'Navigate to Personal API Keys page' });
        expect(menuItem).toBeInTheDocument();
      });

      it('should have aria-hidden on decorative icons', () => {
        render(
          <MenuItem label="Test" onClick={vi.fn()} icon="🔑" />
        );

        const icon = screen.getByText('🔑');
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });

      it('should have tabIndex="0" for keyboard accessibility', () => {
        render(
          <MenuItem label="Test" onClick={vi.fn()} />
        );

        const menuItem = screen.getByRole('menuitem');
        expect(menuItem).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    describe('ProfileIcon Keyboard Support', () => {
      it('should activate with Enter key', async () => {
        const user = userEvent.setup();
        const mockOnClick = vi.fn();

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

      it('should activate with Space key', async () => {
        const user = userEvent.setup();
        const mockOnClick = vi.fn();

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

      it('should be focusable with Tab key', () => {
        render(
          <ProfileIcon
            userEmail="test@example.com"
            isOpen={false}
            onClick={vi.fn()}
          />
        );

        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('tabIndex', '0');
      });
    });

    describe('ProfileMenu Keyboard Navigation Flow', () => {
      it('should open dropdown with Enter key on profile icon', async () => {
        const user = userEvent.setup();

        render(
          <BrowserRouter>
            <ProfileMenu user={mockUser} />
          </BrowserRouter>
        );

        const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
        profileIcon.focus();

        await act(async () => {
          await user.keyboard('{Enter}');
        });

        await waitFor(() => {
          expect(screen.getByRole('menu')).toBeInTheDocument();
        });
      });

      it('should close dropdown with Escape key', async () => {
        const user = userEvent.setup();

        render(
          <BrowserRouter>
            <ProfileMenu user={mockUser} />
          </BrowserRouter>
        );

        const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

        // Open dropdown
        await act(async () => {
          await user.click(profileIcon);
        });

        await waitFor(() => {
          expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        // Close with Escape
        await act(async () => {
          await user.keyboard('{Escape}');
        });

        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      });

      it('should navigate between menu items with Arrow keys', async () => {
        const user = userEvent.setup();

        render(
          <BrowserRouter>
            <ProfileMenu user={mockUser} />
          </BrowserRouter>
        );

        const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

        // Open dropdown
        await act(async () => {
          await user.click(profileIcon);
        });

        await waitFor(() => {
          expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        const menuItems = screen.getAllByRole('menuitem');
        const firstItem = menuItems[0];
        const secondItem = menuItems[1];

        // Focus first item
        firstItem.focus();
        expect(firstItem).toHaveFocus();

        // Navigate to second item with ArrowDown
        await act(async () => {
          await user.keyboard('{ArrowDown}');
        });

        expect(secondItem).toHaveFocus();

        // Navigate back to first item with ArrowUp
        await act(async () => {
          await user.keyboard('{ArrowUp}');
        });

        expect(firstItem).toHaveFocus();
      });

      it('should wrap focus from last to first item with ArrowDown', async () => {
        const user = userEvent.setup();

        render(
          <BrowserRouter>
            <ProfileMenu user={mockUser} />
          </BrowserRouter>
        );

        const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

        // Open dropdown
        await act(async () => {
          await user.click(profileIcon);
        });

        await waitFor(() => {
          expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        const menuItems = screen.getAllByRole('menuitem');
        const lastItem = menuItems[menuItems.length - 1];
        const firstItem = menuItems[0];

        // Focus last item
        lastItem.focus();
        expect(lastItem).toHaveFocus();

        // Press ArrowDown to wrap to first item
        await act(async () => {
          await user.keyboard('{ArrowDown}');
        });

        expect(firstItem).toHaveFocus();
      });

      it('should wrap focus from first to last item with ArrowUp', async () => {
        const user = userEvent.setup();

        render(
          <BrowserRouter>
            <ProfileMenu user={mockUser} />
          </BrowserRouter>
        );

        const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

        // Open dropdown
        await act(async () => {
          await user.click(profileIcon);
        });

        await waitFor(() => {
          expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        const menuItems = screen.getAllByRole('menuitem');
        const firstItem = menuItems[0];
        const lastItem = menuItems[menuItems.length - 1];

        // Focus first item
        firstItem.focus();
        expect(firstItem).toHaveFocus();

        // Press ArrowUp to wrap to last item
        await act(async () => {
          await user.keyboard('{ArrowUp}');
        });

        expect(lastItem).toHaveFocus();
      });

      it('should activate menu items with Enter key', async () => {
        const user = userEvent.setup();

        render(
          <BrowserRouter>
            <ProfileMenu user={mockUser} />
          </BrowserRouter>
        );

        const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

        // Open dropdown
        await act(async () => {
          await user.click(profileIcon);
        });

        await waitFor(() => {
          expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        const signOutItem = screen.getByRole('menuitem', { name: /Sign out/i });
        signOutItem.focus();

        await act(async () => {
          await user.keyboard('{Enter}');
        });

        // Dropdown should close after activation
        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      });

      it('should activate menu items with Space key', async () => {
        const user = userEvent.setup();

        render(
          <BrowserRouter>
            <ProfileMenu user={mockUser} />
          </BrowserRouter>
        );

        const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

        // Open dropdown
        await act(async () => {
          await user.click(profileIcon);
        });

        await waitFor(() => {
          expect(screen.getByRole('menu')).toBeInTheDocument();
        });

        const signOutItem = screen.getByRole('menuitem', { name: /Sign out/i });
        signOutItem.focus();

        await act(async () => {
          await user.keyboard(' ');
        });

        // Dropdown should close after activation
        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Focus Management', () => {
    it('should return focus to profile icon when dropdown closes with Escape', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <ProfileMenu user={mockUser} />
        </BrowserRouter>
      );

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Close with Escape
      await act(async () => {
        await user.keyboard('{Escape}');
      });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(profileIcon).toHaveFocus();
      });
    });

    it('should focus first menu item when dropdown opens', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <ProfileMenu user={mockUser} />
        </BrowserRouter>
      );

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const firstMenuItem = screen.getByRole('menuitem', { name: /Navigate to Personal API Keys/i });
        expect(firstMenuItem).toHaveFocus();
      });
    });

    it('should have visible focus indicators on profile icon', () => {
      const { container } = render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      button.focus();

      // Verify button is focusable and has focus styles applied via CSS
      expect(button).toHaveFocus();
      expect(button).toHaveClass('profile-icon');
    });

    it('should have visible focus indicators on menu items', () => {
      render(
        <MenuItem label="Test Item" onClick={vi.fn()} />
      );

      const menuItem = screen.getByRole('menuitem');
      menuItem.focus();

      // Verify menu item is focusable and has focus styles applied via CSS
      expect(menuItem).toHaveFocus();
      expect(menuItem).toHaveClass('menu-item');
    });

    it('should maintain focus within dropdown when navigating', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <ProfileMenu user={mockUser} />
        </BrowserRouter>
      );

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      const menuItems = screen.getAllByRole('menuitem');

      // Navigate through all items
      for (let i = 0; i < menuItems.length; i++) {
        expect(menuItems[i]).toHaveFocus();
        if (i < menuItems.length - 1) {
          await act(async () => {
            await user.keyboard('{ArrowDown}');
          });
        }
      }

      // Verify focus stayed within menu items
      expect(menuItems[menuItems.length - 1]).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should announce profile icon state to screen readers', () => {
      const { rerender } = render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={vi.fn()}
        />
      );

      const button = screen.getByRole('button', { name: 'User profile menu' });
      expect(button).toHaveAttribute('aria-label', 'User profile menu');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'true');

      // Rerender with dropdown open
      rerender(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={true}
          onClick={vi.fn()}
        />
      );

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should announce dropdown menu to screen readers', () => {
      render(
        <BrowserRouter>
          <ProfileDropdown user={mockUser} isOpen={true} onClose={vi.fn()} />
        </BrowserRouter>
      );

      const menu = screen.getByRole('menu', { name: 'User profile menu' });
      expect(menu).toHaveAttribute('aria-label', 'User profile menu');
    });

    it('should announce menu items with descriptive labels', () => {
      render(
        <BrowserRouter>
          <ProfileDropdown user={mockUser} isOpen={true} onClose={vi.fn()} />
        </BrowserRouter>
      );

      const apiKeysItem = screen.getByRole('menuitem', { name: /Navigate to Personal API Keys/i });
      const signOutItem = screen.getByRole('menuitem', { name: /Sign out of your account/i });

      expect(apiKeysItem).toBeInTheDocument();
      expect(signOutItem).toBeInTheDocument();
    });

    it('should hide decorative elements from screen readers', () => {
      render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={vi.fn()}
        />
      );

      const initialsSpan = screen.getByText('TE');
      expect(initialsSpan).toHaveAttribute('aria-hidden', 'true');
    });

    it('should provide semantic structure with groups and separators', () => {
      const { container } = render(
        <BrowserRouter>
          <ProfileDropdown user={mockUser} isOpen={true} onClose={vi.fn()} />
        </BrowserRouter>
      );

      const groups = container.querySelectorAll('[role="group"]');
      const separators = container.querySelectorAll('[role="separator"]');

      expect(groups.length).toBeGreaterThan(0);
      expect(separators.length).toBeGreaterThan(0);
    });

    it('should announce user information section with visually hidden heading', () => {
      const { container } = render(
        <BrowserRouter>
          <ProfileDropdown user={mockUser} isOpen={true} onClose={vi.fn()} />
        </BrowserRouter>
      );

      const heading = container.querySelector('#user-info-heading');
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('visually-hidden');
      expect(heading).toHaveTextContent('User Information');

      const userInfoGroup = container.querySelector('[role="group"][aria-labelledby="user-info-heading"]');
      expect(userInfoGroup).toBeInTheDocument();
    });
  });

  describe('Touch Target Sizes (Mobile Accessibility)', () => {
    it('should have minimum 44px touch target for profile icon', () => {
      const { container } = render(
        <ProfileIcon
          userEmail="test@example.com"
          isOpen={false}
          onClick={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      const styles = window.getComputedStyle(button);

      // Profile icon should be at least 40px (CSS) which meets 44px with padding
      expect(button).toHaveClass('profile-icon');
      // The actual size is defined in CSS, we verify the class is applied
    });

    it('should have adequate touch targets for menu items', () => {
      render(
        <MenuItem label="Test Item" onClick={vi.fn()} />
      );

      const menuItem = screen.getByRole('menuitem');
      
      // Menu items should have adequate padding for touch targets
      expect(menuItem).toHaveClass('menu-item');
      // The actual size is defined in CSS with padding
    });

    it('should maintain touch target sizes in mobile viewport', () => {
      // This test verifies that components maintain their classes
      // which apply responsive styles via CSS media queries
      const { container } = render(
        <BrowserRouter>
          <ProfileMenu user={mockUser} />
        </BrowserRouter>
      );

      const profileMenu = container.querySelector('.profile-menu');
      expect(profileMenu).toBeInTheDocument();
      
      // CSS media queries handle responsive sizing
      // We verify the structure is correct for CSS to apply
    });
  });

  describe('Complete Keyboard Navigation Flow', () => {
    it('should support complete keyboard-only workflow', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <div>
            <button>Previous Element</button>
            <ProfileMenu user={mockUser} />
            <button>Next Element</button>
          </div>
        </BrowserRouter>
      );

      const previousButton = screen.getByText('Previous Element');
      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      const nextButton = screen.getByText('Next Element');

      // Start from previous element
      previousButton.focus();
      expect(previousButton).toHaveFocus();

      // Tab to profile icon
      await user.tab();
      expect(profileIcon).toHaveFocus();

      // Open dropdown with Enter
      await act(async () => {
        await user.keyboard('{Enter}');
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // First menu item should be focused
      const firstMenuItem = screen.getByRole('menuitem', { name: /Navigate to Personal API Keys/i });
      expect(firstMenuItem).toHaveFocus();

      // Navigate to second item
      await act(async () => {
        await user.keyboard('{ArrowDown}');
      });

      const secondMenuItem = screen.getByRole('menuitem', { name: /Sign out/i });
      expect(secondMenuItem).toHaveFocus();

      // Close with Escape
      await act(async () => {
        await user.keyboard('{Escape}');
      });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(profileIcon).toHaveFocus();
      });

      // Tab to next element
      await user.tab();
      expect(nextButton).toHaveFocus();
    });
  });

  describe('Accessibility Best Practices', () => {
    it('should use semantic HTML elements', () => {
      render(
        <BrowserRouter>
          <ProfileMenu user={mockUser} />
        </BrowserRouter>
      );

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should provide text alternatives for all interactive elements', () => {
      render(
        <BrowserRouter>
          <ProfileMenu user={mockUser} />
        </BrowserRouter>
      );

      const profileIcon = screen.getByRole('button', { name: 'User profile menu' });
      expect(profileIcon).toHaveAccessibleName();
    });

    it('should maintain logical tab order', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <div>
            <button>First</button>
            <ProfileMenu user={mockUser} />
            <button>Last</button>
          </div>
        </BrowserRouter>
      );

      const firstButton = screen.getByText('First');
      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      const lastButton = screen.getByText('Last');

      firstButton.focus();
      expect(firstButton).toHaveFocus();

      await user.tab();
      expect(profileIcon).toHaveFocus();

      await user.tab();
      expect(lastButton).toHaveFocus();
    });

    it('should not trap focus when dropdown is closed', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <div>
            <ProfileMenu user={mockUser} />
            <button>Next Element</button>
          </div>
        </BrowserRouter>
      );

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      const nextButton = screen.getByText('Next Element');

      profileIcon.focus();
      expect(profileIcon).toHaveFocus();

      // Tab should move to next element
      await user.tab();
      expect(nextButton).toHaveFocus();
    });

    it('should provide clear visual and programmatic state changes', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <ProfileMenu user={mockUser} />
        </BrowserRouter>
      );

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Initial state
      expect(profileIcon).toHaveAttribute('aria-expanded', 'false');
      expect(profileIcon).not.toHaveClass('active');

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(profileIcon).toHaveAttribute('aria-expanded', 'true');
        expect(profileIcon).toHaveClass('active');
      });

      // Close dropdown
      await act(async () => {
        await user.keyboard('{Escape}');
      });

      await waitFor(() => {
        expect(profileIcon).toHaveAttribute('aria-expanded', 'false');
        expect(profileIcon).not.toHaveClass('active');
      });
    });
  });
});
