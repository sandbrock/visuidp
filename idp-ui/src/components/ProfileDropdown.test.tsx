import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ProfileDropdown } from './ProfileDropdown';
import type { User } from '../types/auth';

// Mock the auth module
vi.mock('../auth', () => ({
  logout: vi.fn(),
}));

describe('ProfileDropdown Component', () => {
  const mockOnClose = vi.fn();
  const mockUser: User = {
    name: 'Test User',
    email: 'test.user@example.com',
    roles: ['user']
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderProfileDropdown = (user: User = mockUser, isOpen: boolean = true) => {
    return render(
      <BrowserRouter>
        <ProfileDropdown user={user} isOpen={isOpen} onClose={mockOnClose} />
      </BrowserRouter>
    );
  };

  describe('User Information Display', () => {
    it('should display user email', () => {
      renderProfileDropdown();

      expect(screen.getByText('test.user@example.com')).toBeInTheDocument();
    });

    it('should display user name', () => {
      renderProfileDropdown();

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should display user information in UserInfo component', () => {
      const { container } = renderProfileDropdown();

      const userInfo = container.querySelector('.user-info');
      expect(userInfo).toBeInTheDocument();
      expect(userInfo).toHaveTextContent('test.user@example.com');
      expect(userInfo).toHaveTextContent('Test User');
    });

    it('should display user information at the top of dropdown', () => {
      renderProfileDropdown();

      const dropdown = screen.getByRole('menu');
      const userInfoGroup = dropdown.querySelector('[role="group"][aria-labelledby="user-info-heading"]');
      
      expect(userInfoGroup).toBeInTheDocument();
      expect(userInfoGroup).toHaveTextContent('test.user@example.com');
    });
  });

  describe('Fallback for Missing User Information', () => {
    it('should display fallback email when email is missing', () => {
      const userWithoutEmail: User = {
        name: 'Test User',
        email: '',
        roles: ['user']
      };

      renderProfileDropdown(userWithoutEmail);

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('should display fallback name when name is missing', () => {
      const userWithoutName: User = {
        name: '',
        email: 'test@example.com',
        roles: ['user']
      };

      renderProfileDropdown(userWithoutName);

      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should display both fallbacks when user information is missing', () => {
      const userWithoutInfo: User = {
        name: '',
        email: '',
        roles: ['user']
      };

      renderProfileDropdown(userWithoutInfo);

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should handle undefined user properties gracefully', () => {
      const userWithUndefined: User = {
        name: undefined as any,
        email: undefined as any,
        roles: ['user']
      };

      renderProfileDropdown(userWithUndefined);

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });

  describe('Menu Items Rendering', () => {
    it('should render Personal API Keys menu item', () => {
      renderProfileDropdown();

      const apiKeysItem = screen.getByRole('menuitem', { name: /Navigate to Personal API Keys/i });
      expect(apiKeysItem).toBeInTheDocument();
      expect(apiKeysItem).toHaveTextContent('Personal API Keys');
    });

    it('should render Sign Out menu item', () => {
      renderProfileDropdown();

      const signOutItem = screen.getByRole('menuitem', { name: /Sign out of your account/i });
      expect(signOutItem).toBeInTheDocument();
      expect(signOutItem).toHaveTextContent('Sign Out');
    });

    it('should render menu items with icons', () => {
      renderProfileDropdown();

      const apiKeysItem = screen.getByText('Personal API Keys');
      const signOutItem = screen.getByText('Sign Out');

      expect(apiKeysItem.parentElement).toHaveTextContent('🔑');
      expect(signOutItem.parentElement).toHaveTextContent('🚪');
    });

    it('should render dividers between sections', () => {
      const { container } = renderProfileDropdown();

      const dividers = container.querySelectorAll('.dropdown-divider');
      expect(dividers).toHaveLength(2);
    });

    it('should render menu items in correct order', () => {
      renderProfileDropdown();

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(2);
      expect(menuItems[0]).toHaveTextContent('Personal API Keys');
      expect(menuItems[1]).toHaveTextContent('Sign Out');
    });

    it('should render Personal API Keys as a link', () => {
      renderProfileDropdown();

      const apiKeysItem = screen.getByRole('menuitem', { name: /Navigate to Personal API Keys/i });
      expect(apiKeysItem.tagName).toBe('A');
      expect(apiKeysItem).toHaveAttribute('href', '/api-keys');
    });

    it('should render Sign Out as a button', () => {
      renderProfileDropdown();

      const signOutItem = screen.getByRole('menuitem', { name: /Sign out of your account/i });
      expect(signOutItem.tagName).toBe('BUTTON');
    });

    it('should apply danger variant to Sign Out menu item', () => {
      renderProfileDropdown();

      const signOutItem = screen.getByRole('menuitem', { name: /Sign out of your account/i });
      expect(signOutItem).toHaveClass('menu-item-danger');
    });
  });

  describe('onClose Callback on Menu Item Click', () => {
    it('should call onClose when Personal API Keys is clicked', async () => {
      const user = userEvent.setup();
      renderProfileDropdown();

      const apiKeysItem = screen.getByRole('menuitem', { name: /Navigate to Personal API Keys/i });

      await act(async () => {
        await user.click(apiKeysItem);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Sign Out is clicked', async () => {
      const user = userEvent.setup();
      renderProfileDropdown();

      const signOutItem = screen.getByRole('menuitem', { name: /Sign out of your account/i });

      await act(async () => {
        await user.click(signOutItem);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose before logout when Sign Out is clicked', async () => {
      const user = userEvent.setup();
      const { logout } = await import('../auth');
      
      renderProfileDropdown();

      const signOutItem = screen.getByRole('menuitem', { name: /Sign out of your account/i });

      await act(async () => {
        await user.click(signOutItem);
      });

      expect(mockOnClose).toHaveBeenCalled();
      expect(logout).toHaveBeenCalled();
    });

    it('should not call onClose when clicking on user info section', async () => {
      const user = userEvent.setup();
      renderProfileDropdown();

      const userEmail = screen.getByText('test.user@example.com');

      await act(async () => {
        await user.click(userEmail);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not call onClose when clicking on dividers', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileDropdown();

      const divider = container.querySelector('.dropdown-divider');

      if (divider) {
        await act(async () => {
          await user.click(divider);
        });
      }

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Dropdown Visibility', () => {
    it('should render dropdown when isOpen is true', () => {
      renderProfileDropdown(mockUser, true);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should not render dropdown when isOpen is false', () => {
      renderProfileDropdown(mockUser, false);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should toggle visibility based on isOpen prop', () => {
      const { rerender } = render(
        <BrowserRouter>
          <ProfileDropdown user={mockUser} isOpen={false} onClose={mockOnClose} />
        </BrowserRouter>
      );

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      rerender(
        <BrowserRouter>
          <ProfileDropdown user={mockUser} isOpen={true} onClose={mockOnClose} />
        </BrowserRouter>
      );

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="menu" on dropdown container', () => {
      renderProfileDropdown();

      const dropdown = screen.getByRole('menu');
      expect(dropdown).toBeInTheDocument();
    });

    it('should have aria-label on dropdown menu', () => {
      renderProfileDropdown();

      const dropdown = screen.getByRole('menu', { name: 'User profile menu' });
      expect(dropdown).toBeInTheDocument();
    });

    it('should have proper role groups for sections', () => {
      const { container } = renderProfileDropdown();

      const groups = container.querySelectorAll('[role="group"]');
      expect(groups.length).toBeGreaterThan(0);
    });

    it('should have aria-label on action groups', () => {
      const { container } = renderProfileDropdown();

      const accountActionsGroup = container.querySelector('[role="group"][aria-label="Account actions"]');
      const sessionActionsGroup = container.querySelector('[role="group"][aria-label="Session actions"]');

      expect(accountActionsGroup).toBeInTheDocument();
      expect(sessionActionsGroup).toBeInTheDocument();
    });

    it('should have visually hidden heading for user info', () => {
      const { container } = renderProfileDropdown();

      const heading = container.querySelector('#user-info-heading');
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('visually-hidden');
      expect(heading).toHaveTextContent('User Information');
    });

    it('should have role="separator" on dividers', () => {
      const { container } = renderProfileDropdown();

      const dividers = container.querySelectorAll('[role="separator"]');
      expect(dividers.length).toBeGreaterThan(0);
    });

    it('should have proper aria-label on menu items', () => {
      renderProfileDropdown();

      const apiKeysItem = screen.getByRole('menuitem', { name: 'Navigate to Personal API Keys page' });
      const signOutItem = screen.getByRole('menuitem', { name: 'Sign out of your account' });

      expect(apiKeysItem).toBeInTheDocument();
      expect(signOutItem).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render with profile-dropdown class', () => {
      const { container } = renderProfileDropdown();

      const dropdown = container.querySelector('.profile-dropdown');
      expect(dropdown).toBeInTheDocument();
    });

    it('should contain UserInfo component', () => {
      const { container } = renderProfileDropdown();

      const userInfo = container.querySelector('.user-info');
      expect(userInfo).toBeInTheDocument();
    });

    it('should contain MenuItem components', () => {
      const { container } = renderProfileDropdown();

      const menuItems = container.querySelectorAll('.menu-item');
      expect(menuItems.length).toBeGreaterThan(0);
    });

    it('should have proper structure with groups and dividers', () => {
      const { container } = renderProfileDropdown();

      const dropdown = container.querySelector('.profile-dropdown');
      expect(dropdown).toBeInTheDocument();

      // Check for user info group
      const userInfoGroup = dropdown?.querySelector('[role="group"][aria-labelledby="user-info-heading"]');
      expect(userInfoGroup).toBeInTheDocument();

      // Check for dividers
      const dividers = dropdown?.querySelectorAll('.dropdown-divider');
      expect(dividers?.length).toBe(2);

      // Check for action groups
      const accountActionsGroup = dropdown?.querySelector('[role="group"][aria-label="Account actions"]');
      const sessionActionsGroup = dropdown?.querySelector('[role="group"][aria-label="Session actions"]');
      expect(accountActionsGroup).toBeInTheDocument();
      expect(sessionActionsGroup).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support arrow key navigation between menu items', async () => {
      const user = userEvent.setup();
      renderProfileDropdown();

      const menuItems = screen.getAllByRole('menuitem');
      const firstItem = menuItems[0];
      const secondItem = menuItems[1];

      // Focus first item
      firstItem.focus();
      expect(firstItem).toHaveFocus();

      // Press ArrowDown to move to second item
      await act(async () => {
        await user.keyboard('{ArrowDown}');
      });

      expect(secondItem).toHaveFocus();
    });

    it('should wrap to first item when pressing ArrowDown on last item', async () => {
      const user = userEvent.setup();
      renderProfileDropdown();

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

    it('should wrap to last item when pressing ArrowUp on first item', async () => {
      const user = userEvent.setup();
      renderProfileDropdown();

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
  });
});
