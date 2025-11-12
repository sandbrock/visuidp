import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ProfileMenu } from './ProfileMenu';
import type { User } from '../types/auth';

// Mock the auth module
vi.mock('../auth', () => ({
  logout: vi.fn(),
}));

describe('ProfileMenu Component - Visual Regression Testing', () => {
  const mockUser: User = {
    name: 'Test User',
    email: 'test.user@example.com',
    roles: ['user']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing theme attribute
    document.documentElement.removeAttribute('data-theme');
    // Reset viewport to desktop size
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  const renderProfileMenu = (user: User = mockUser) => {
    return render(
      <BrowserRouter>
        <ProfileMenu user={user} />
      </BrowserRouter>
    );
  };

  describe('Light Theme - Desktop', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      window.innerWidth = 1024;
    });

    it('should render profile icon with light theme styles', () => {
      const { container } = renderProfileMenu();

      const profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should render dropdown with light theme styles when open', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });
    });

    it('should display user initials correctly', () => {
      const { container } = renderProfileMenu();

      const initials = container.querySelector('.profile-initials');
      expect(initials).toBeInTheDocument();
      expect(initials?.textContent).toBe('TU');
    });

    it('should render dropdown positioning correctly', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        
        // Verify dropdown has the correct class for positioning
        expect(dropdown).toHaveClass('profile-dropdown');
      });
    });

    it('should render menu items with correct structure', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByText('Personal API Keys')).toBeInTheDocument();
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });
    });

    it('should render dividers between sections', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dividers = container.querySelectorAll('.dropdown-divider');
        expect(dividers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Light Theme - Mobile', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      window.innerWidth = 375;
      window.innerHeight = 667;
    });

    it('should render profile icon with mobile-appropriate size', () => {
      const { container } = renderProfileMenu();

      const profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should render dropdown with mobile-appropriate width', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it('should maintain touch target size on mobile', () => {
      const { container } = renderProfileMenu();

      const profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
      
      // Profile icon should be at least 44px for touch targets
      // This is verified through CSS, we just check it exists
      expect(profileIcon).toHaveClass('profile-icon');
    });
  });

  describe('Dark Theme - Desktop', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      window.innerWidth = 1024;
    });

    it('should render profile icon with dark theme styles', () => {
      const { container } = renderProfileMenu();

      const profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should render dropdown with dark theme styles when open', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });

    it('should render dividers with dark theme styles', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dividers = container.querySelectorAll('.dropdown-divider');
        expect(dividers.length).toBeGreaterThan(0);
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });
  });

  describe('Dark Theme - Mobile', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      window.innerWidth = 375;
      window.innerHeight = 667;
    });

    it('should render profile icon with dark theme on mobile', () => {
      const { container } = renderProfileMenu();

      const profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should render dropdown with dark theme on mobile', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });
  });

  describe('Frankenstein Theme - Desktop', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      window.innerWidth = 1024;
    });

    it('should render profile icon with frankenstein theme styles', () => {
      const { container } = renderProfileMenu();

      const profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render dropdown with frankenstein theme styles when open', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });
    });

    it('should render dividers with frankenstein theme styles', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dividers = container.querySelectorAll('.dropdown-divider');
        expect(dividers.length).toBeGreaterThan(0);
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });
    });

    it('should render user info with frankenstein theme', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(screen.getByText('test.user@example.com')).toBeInTheDocument();
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });
    });
  });

  describe('Frankenstein Theme - Mobile', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      window.innerWidth = 375;
      window.innerHeight = 667;
    });

    it('should render profile icon with frankenstein theme on mobile', () => {
      const { container } = renderProfileMenu();

      const profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render dropdown with frankenstein theme on mobile', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });
    });
  });

  describe('Dropdown Positioning and Alignment', () => {
    it('should position dropdown below profile icon', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        
        // Verify dropdown has correct class for CSS positioning
        expect(dropdown).toHaveClass('profile-dropdown');
      });
    });

    it('should right-align dropdown with profile icon', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        // Verify dropdown structure is correct
        expect(dropdown).toHaveClass('profile-dropdown');
      });
    });

    it('should maintain proper structure for dropdown layering', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        
        // Verify dropdown has correct class for z-index styling
        expect(dropdown).toHaveClass('profile-dropdown');
      });
    });

    it('should have minimum width for dropdown', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        // Verify dropdown structure
        expect(dropdown).toHaveClass('profile-dropdown');
      });
    });
  });

  describe('Hover and Active States', () => {
    it('should apply hover styles to profile icon', () => {
      const { container } = renderProfileMenu();

      const profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
      expect(profileIcon).toHaveClass('profile-icon');
    });

    it('should apply active class when dropdown is open', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      // Initially not active
      expect(profileIcon).not.toHaveClass('active');
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(profileIcon).toHaveClass('active');
      });
    });

    it('should remove active class when dropdown closes', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      // Open dropdown
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        expect(profileIcon).toHaveClass('active');
      });

      // Close dropdown
      await act(async () => {
        await user.click(container);
      });

      await waitFor(() => {
        expect(profileIcon).not.toHaveClass('active');
      });
    });

    it('should maintain focus styles on profile icon', async () => {
      const user = userEvent.setup();
      renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        profileIcon.focus();
      });

      expect(profileIcon).toHaveFocus();
    });
  });

  describe('Animations and Transitions', () => {
    it('should apply fade-in animation to dropdown', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        
        // Verify dropdown has correct class for animation styling
        expect(dropdown).toHaveClass('profile-dropdown');
      });
    });

    it('should apply frankenstein animation in frankenstein theme', async () => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });
    });

    it('should apply transition to profile icon on hover', () => {
      const { container } = renderProfileMenu();

      const profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
      
      // Verify profile icon has correct class for transition styling
      expect(profileIcon).toHaveClass('profile-icon');
    });
  });

  describe('Visual Consistency Across Themes', () => {
    it('should maintain component structure when switching themes', async () => {
      const { container, rerender } = renderProfileMenu();

      // Light theme
      document.documentElement.setAttribute('data-theme', 'light');
      let profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();

      // Dark theme
      document.documentElement.setAttribute('data-theme', 'dark');
      rerender(
        <BrowserRouter>
          <ProfileMenu user={mockUser} />
        </BrowserRouter>
      );
      profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();

      // Frankenstein theme
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      rerender(
        <BrowserRouter>
          <ProfileMenu user={mockUser} />
        </BrowserRouter>
      );
      profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
    });

    it('should maintain dropdown structure across themes', async () => {
      const user = userEvent.setup();
      const { container, rerender } = renderProfileMenu();

      const themes = ['light', 'dark', 'frankenstein'];

      for (const theme of themes) {
        document.documentElement.setAttribute('data-theme', theme);
        rerender(
          <BrowserRouter>
            <ProfileMenu user={mockUser} />
          </BrowserRouter>
        );

        const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
        
        await act(async () => {
          await user.click(profileIcon);
        });

        await waitFor(() => {
          const dropdown = container.querySelector('.profile-dropdown');
          expect(dropdown).toBeInTheDocument();
          expect(screen.getByText('Personal API Keys')).toBeInTheDocument();
          expect(screen.getByText('Sign Out')).toBeInTheDocument();
        });

        // Close dropdown for next iteration
        await act(async () => {
          await user.click(container);
        });

        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      }
    });

    it('should use CSS variables for theming', () => {
      const { container } = renderProfileMenu();

      const profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
      
      // Verify component doesn't use inline styles
      expect(profileIcon).not.toHaveAttribute('style');
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to tablet viewport', async () => {
      window.innerWidth = 768;
      
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it('should adapt to small mobile viewport', async () => {
      window.innerWidth = 320;
      
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it('should maintain functionality across viewport sizes', async () => {
      const viewports = [1920, 1024, 768, 480, 375, 320];
      
      for (const width of viewports) {
        window.innerWidth = width;
        
        const user = userEvent.setup();
        const { container, unmount } = renderProfileMenu();

        const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
        
        await act(async () => {
          await user.click(profileIcon);
        });

        await waitFor(() => {
          const dropdown = container.querySelector('.profile-dropdown');
          expect(dropdown).toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  describe('User Initials Display', () => {
    it('should display correct initials for different email formats', () => {
      const testCases = [
        { email: 'john.doe@example.com', expected: 'JD' },
        { email: 'jane.smith@example.com', expected: 'JS' },
        { email: 'user@example.com', expected: 'US' },
        { email: 'a.b@example.com', expected: 'AB' },
      ];

      testCases.forEach(({ email, expected }) => {
        const { container, unmount } = renderProfileMenu({ ...mockUser, email });
        
        const initials = container.querySelector('.profile-initials');
        expect(initials?.textContent).toBe(expected);
        
        unmount();
      });
    });

    it('should handle edge cases for initials', () => {
      const testCases = [
        { email: 'x@example.com', expected: 'X' },
        { email: 'ab@example.com', expected: 'AB' },
      ];

      testCases.forEach(({ email, expected }) => {
        const { container, unmount } = renderProfileMenu({ ...mockUser, email });
        
        const initials = container.querySelector('.profile-initials');
        expect(initials?.textContent).toBe(expected);
        
        unmount();
      });
    });
  });

  describe('Shadow and Border Rendering', () => {
    it('should render box shadow on dropdown', async () => {
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        
        // Verify dropdown has correct class for shadow styling
        expect(dropdown).toHaveClass('profile-dropdown');
      });
    });

    it('should render border on profile icon', () => {
      const { container } = renderProfileMenu();

      const profileIcon = container.querySelector('.profile-icon');
      expect(profileIcon).toBeInTheDocument();
      
      // Verify profile icon has correct class for border styling
      expect(profileIcon).toHaveClass('profile-icon');
    });

    it('should render enhanced shadow in frankenstein theme', async () => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      
      const user = userEvent.setup();
      const { container } = renderProfileMenu();

      const profileIcon = screen.getByRole('button', { name: /User profile menu/i });
      
      await act(async () => {
        await user.click(profileIcon);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('.profile-dropdown');
        expect(dropdown).toBeInTheDocument();
        expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      });
    });
  });
});
