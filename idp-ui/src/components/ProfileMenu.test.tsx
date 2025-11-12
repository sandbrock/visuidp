import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { ProfileMenu } from './ProfileMenu';
import type { User } from '../types/auth';

// Mock the auth module
vi.mock('../auth', () => ({
  logout: vi.fn(),
}));

describe('ProfileMenu Component', () => {
  const mockUser: User = {
    name: 'Test User',
    email: 'test.user@example.com',
    roles: ['user']
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderProfileMenu = (user: User = mockUser) => {
    return render(
      <BrowserRouter>
        <ProfileMenu user={user} />
      </BrowserRouter>
    );
  };

  describe('Dropdown Opens on Icon Click', () => {
    it('should open dropdown when profile icon is clicked', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      expect(profileIcon).toHaveAttribute('aria-expanded', 'false');

      // Dropdown should not be visible initially
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // Click the profile icon
      await act(async () => {
        await user.click(profileIcon);
      });

      // Dropdown should now be visible
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(profileIcon).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should toggle dropdown when icon is clicked multiple times', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Close dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });

      // Open again
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });
  });

  describe('Dropdown Closes on Outside Click', () => {
    it('should close dropdown when clicking outside the menu', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Click outside the menu
      await act(async () => {
        await user.click(container);
      });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('should not close dropdown when clicking inside the menu', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      const dropdown = screen.getByRole('menu');

      // Click inside the dropdown (on the user info section)
      await act(async () => {
        await user.click(dropdown);
      });

      // Dropdown should still be visible
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Dropdown Closes on Escape Key Press', () => {
    it('should close dropdown when Escape key is pressed', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Press Escape key
      await act(async () => {
        await user.keyboard('{Escape}');
      });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('should return focus to profile icon after closing with Escape', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Press Escape key
      await act(async () => {
        await user.keyboard('{Escape}');
      });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(profileIcon).toHaveFocus();
      });
    });

    it('should not close dropdown when other keys are pressed', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Press arrow keys (which should not close the dropdown)
      await act(async () => {
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{ArrowUp}');
      });

      // Dropdown should still be visible
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Dropdown Closes on Route Change', () => {
    it('should close dropdown when route changes', async () => {
      const user = userEvent.setup();
      
      // Create a test component that can trigger route changes
      const TestComponent = () => {
        const location = useLocation();
        return (
          <div>
            <ProfileMenu user={mockUser} />
            <div data-testid="current-path">{location.pathname}</div>
            <button onClick={() => window.history.pushState({}, '', '/new-route')}>
              Change Route
            </button>
          </div>
        );
      };

      render(
        <BrowserRouter>
          <TestComponent />
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

      // Trigger route change by clicking a menu item
      const apiKeysLink = screen.getByText('Personal API Keys');
      
      await act(async () => {
        await user.click(apiKeysLink);
      });

      // Dropdown should close after navigation
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown immediately when location changes', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Click on Personal API Keys link to trigger navigation
      const apiKeysLink = screen.getByText('Personal API Keys');
      
      await act(async () => {
        await user.click(apiKeysLink);
      });

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when closed', () => {
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      expect(profileIcon).toHaveAttribute('aria-expanded', 'false');
      expect(profileIcon).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should have proper ARIA attributes when open', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(profileIcon).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('should focus first menu item when dropdown opens', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        // The first menu item (the link element) should have focus
        const firstMenuItem = screen.getByRole('menuitem', { name: /Navigate to Personal API Keys/i });
        expect(firstMenuItem).toHaveFocus();
      });
    });
  });

  describe('Component Structure', () => {
    it('should render profile-menu container', () => {
      const { container } = renderProfileMenu();
      
      const profileMenu = container.querySelector('.profile-menu');
      expect(profileMenu).toBeInTheDocument();
    });

    it('should render ProfileIcon component', () => {
      renderProfileMenu();
      
      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      expect(profileIcon).toBeInTheDocument();
    });

    it('should render ProfileDropdown when open', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });
  });
});
