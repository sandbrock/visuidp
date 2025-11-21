import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './Header';
import { ThemeProvider } from '../contexts/ThemeContext';
import { DemoModeProvider } from '../contexts/DemoModeContext';
import type { User } from '../types/auth';
import * as auth from '../auth';

// Mock the auth module
vi.mock('../auth', () => ({
  logout: vi.fn(),
}));

describe('Header Integration Tests', () => {
  let localStorageMock: { [key: string]: string };
  const mockUser: User = {
    name: 'Test User',
    email: 'test.user@example.com',
    roles: ['user']
  };

  const mockAdminUser: User = {
    name: 'Admin User',
    email: 'admin.user@example.com',
    roles: ['admin']
  };

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
    vi.clearAllMocks();
  });

  const renderHeader = (user: User = mockUser) => {
    return render(
      <BrowserRouter>
        <DemoModeProvider>
          <ThemeProvider>
            <Header user={user} />
          </ThemeProvider>
        </DemoModeProvider>
      </BrowserRouter>
    );
  };

  describe('ProfileMenu appears in header', () => {
    it('should render ProfileMenu component in the header', () => {
      renderHeader();

      // Profile icon should be present
      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      expect(profileIcon).toBeInTheDocument();

      // Profile icon should be in the user-info section
      const userInfoSection = document.querySelector('.user-info');
      expect(userInfoSection).toBeInTheDocument();
      expect(userInfoSection).toContainElement(profileIcon);
    });

    it('should display user initials in profile icon', () => {
      renderHeader();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      expect(profileIcon).toHaveTextContent('TU'); // Test User initials
    });

    it('should render ProfileMenu for admin users', () => {
      renderHeader(mockAdminUser);

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      expect(profileIcon).toBeInTheDocument();
      expect(profileIcon).toHaveTextContent('AU'); // Admin User initials
    });
  });

  describe('API Keys link removed from main nav', () => {
    it('should not display API Keys link in header navigation', () => {
      renderHeader();

      const headerNav = document.querySelector('.header-nav');
      expect(headerNav).toBeInTheDocument();

      // Check that API Keys link is not in the navigation
      const apiKeysNavLink = headerNav?.querySelector('a[href="/api-keys"]');
      expect(apiKeysNavLink).not.toBeInTheDocument();

      // Verify other nav links are still present
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
      expect(screen.getByText('Stacks')).toBeInTheDocument();
    });

    it('should not have API Keys text anywhere in main navigation', () => {
      renderHeader();

      const headerNav = document.querySelector('.header-nav');
      expect(headerNav).toBeInTheDocument();

      // API Keys should not appear in the nav text
      const navText = headerNav?.textContent || '';
      expect(navText).not.toContain('API Keys');
      expect(navText).not.toContain('Personal API Keys');
    });
  });

  describe('Navigation to API Keys from profile dropdown', () => {
    it('should display Personal API Keys menu item in dropdown', async () => {
      const user = userEvent.setup();
      renderHeader();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Personal API Keys menu item should be present
      const apiKeysMenuItem = screen.getByText('Personal API Keys');
      expect(apiKeysMenuItem).toBeInTheDocument();
    });

    it('should navigate to /api-keys when Personal API Keys is clicked', async () => {
      const user = userEvent.setup();
      renderHeader();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Verify the link has correct href before clicking
      const apiKeysLink = screen.getByRole('menuitem', { name: /Navigate to Personal API Keys/i });
      expect(apiKeysLink).toHaveAttribute('href', '/api-keys');

      // Click Personal API Keys
      const apiKeysMenuItem = screen.getByText('Personal API Keys');
      
      await act(async () => {
        await user.click(apiKeysMenuItem);
      });

      // Verify navigation occurred (dropdown closes on navigation)
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown after clicking Personal API Keys', async () => {
      const user = userEvent.setup();
      renderHeader();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Click Personal API Keys
      const apiKeysMenuItem = screen.getByText('Personal API Keys');
      
      await act(async () => {
        await user.click(apiKeysMenuItem);
      });

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sign out functionality from dropdown', () => {
    it('should display Sign Out menu item in dropdown', async () => {
      const user = userEvent.setup();
      renderHeader();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Sign Out menu item should be present
      const signOutMenuItem = screen.getByText('Sign Out');
      expect(signOutMenuItem).toBeInTheDocument();
    });

    it('should call logout function when Sign Out is clicked', async () => {
      const user = userEvent.setup();
      const logoutSpy = vi.spyOn(auth, 'logout');
      
      renderHeader();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Click Sign Out
      const signOutMenuItem = screen.getByText('Sign Out');
      
      await act(async () => {
        await user.click(signOutMenuItem);
      });

      // Verify logout was called
      expect(logoutSpy).toHaveBeenCalledTimes(1);
    });

    it('should have danger variant styling on Sign Out button', async () => {
      const user = userEvent.setup();
      renderHeader();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Sign Out should have danger variant class
      const signOutButton = screen.getByRole('menuitem', { name: /Sign Out/i });
      expect(signOutButton).toHaveClass('menu-item-danger');
    });

    it('should not have old logout button in header', () => {
      renderHeader();

      // Old logout button should not exist
      const oldLogoutButton = document.querySelector('.logout-button');
      expect(oldLogoutButton).not.toBeInTheDocument();

      // Should not have any button with "Sign out" text in header (outside dropdown)
      const headerButtons = document.querySelectorAll('.app-header button');
      const signOutButtons = Array.from(headerButtons).filter(
        button => button.textContent?.includes('Sign out')
      );
      
      // Only the profile icon button should exist (not a sign out button)
      expect(signOutButtons.length).toBe(0);
    });
  });

  describe('Theme toggle remains functional', () => {
    it('should render ThemeToggle in user-info section', () => {
      renderHeader();

      const themeToggle = screen.getByRole('button', { name: /Current theme/i });
      expect(themeToggle).toBeInTheDocument();

      const userInfoSection = document.querySelector('.user-info');
      expect(userInfoSection).toContainElement(themeToggle);
    });

    it('should toggle theme when ThemeToggle is clicked', async () => {
      const user = userEvent.setup();
      localStorageMock['theme'] = 'light';

      renderHeader();

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      const themeToggle = screen.getByRole('button', { name: /Current theme/i });

      // Click to change theme
      await act(async () => {
        await user.click(themeToggle);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });

    it('should cycle through all themes', async () => {
      const user = userEvent.setup();
      localStorageMock['theme'] = 'light';

      renderHeader();

      const themeToggle = screen.getByRole('button', { name: /Current theme/i });

      // Light -> Dark
      await act(async () => {
        await user.click(themeToggle);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      // Dark -> Frankenstein
      await act(async () => {
        await user.click(themeToggle);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });

      // Frankenstein -> Light
      await act(async () => {
        await user.click(themeToggle);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });
    });

    it('should keep ThemeToggle functional when dropdown is open', async () => {
      const user = userEvent.setup();
      localStorageMock['theme'] = 'light';

      renderHeader();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      const themeToggle = screen.getByRole('button', { name: /Current theme/i });

      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Theme toggle should still work (clicking it will close dropdown due to click-outside)
      await act(async () => {
        await user.click(themeToggle);
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });

      // Note: Dropdown closes when clicking theme toggle due to click-outside detection
      // This is expected behavior - clicking outside the dropdown closes it
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('should position ThemeToggle before ProfileMenu', () => {
      renderHeader();

      const userInfoSection = document.querySelector('.user-info');
      expect(userInfoSection).toBeInTheDocument();

      const children = Array.from(userInfoSection?.children || []);
      const themeToggleIndex = children.findIndex(child => 
        child.querySelector('[aria-label*="Current theme"]')
      );
      const profileMenuIndex = children.findIndex(child => 
        child.classList.contains('profile-menu')
      );

      // ThemeToggle should come before ProfileMenu
      expect(themeToggleIndex).toBeLessThan(profileMenuIndex);
    });
  });

  describe('Complete integration workflow', () => {
    it('should support complete user workflow: open menu, navigate to API Keys, close menu', async () => {
      const user = userEvent.setup();
      renderHeader();

      // 1. Verify initial state
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // 2. Open profile menu
      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // 3. Verify menu contents
      expect(screen.getByText('Personal API Keys')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();

      // 4. Click API Keys
      const apiKeysMenuItem = screen.getByText('Personal API Keys');
      await act(async () => {
        await user.click(apiKeysMenuItem);
      });

      // 5. Verify menu closed
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('should support complete logout workflow', async () => {
      const user = userEvent.setup();
      const logoutSpy = vi.spyOn(auth, 'logout');
      
      renderHeader();

      // 1. Open profile menu
      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // 2. Click Sign Out
      const signOutMenuItem = screen.getByText('Sign Out');
      await act(async () => {
        await user.click(signOutMenuItem);
      });

      // 3. Verify logout was called
      expect(logoutSpy).toHaveBeenCalledTimes(1);
    });

    it('should maintain all header functionality with profile menu', async () => {
      const user = userEvent.setup();
      renderHeader();

      // 1. Verify navigation links work
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
      expect(screen.getByText('Stacks')).toBeInTheDocument();

      // 2. Verify theme toggle works
      const themeToggle = screen.getByRole('button', { name: /Current theme/i });
      expect(themeToggle).toBeInTheDocument();

      // 3. Verify profile menu works
      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // 4. Verify all components coexist properly
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(themeToggle).toBeInTheDocument();
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Admin user integration', () => {
    it('should show admin link and profile menu for admin users', async () => {
      const user = userEvent.setup();
      renderHeader(mockAdminUser);

      // Admin link should be visible
      expect(screen.getByText('Admin')).toBeInTheDocument();

      // Profile menu should work
      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Admin user info should be displayed
      expect(screen.getByText(mockAdminUser.email)).toBeInTheDocument();
    });
  });
});
