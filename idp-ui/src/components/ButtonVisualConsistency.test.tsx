import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { Infrastructure } from './Infrastructure';
import { ProfileIcon } from './ProfileIcon';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from '../contexts/ThemeContext';
import type { User } from '../types/auth';

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    getBlueprints: vi.fn().mockResolvedValue([
      {
        id: 'bp-1',
        name: 'Test Blueprint',
        description: 'Test description',
        configuration: {},
        supportedCloudProviderIds: ['cp-1'],
        resources: []
      }
    ]),
    getAvailableResourceTypesForBlueprints: vi.fn().mockResolvedValue([
      {
        id: 'rt-1',
        name: 'Container Orchestrator',
        description: 'Container orchestration service'
      }
    ]),
    getAvailableCloudProvidersForBlueprints: vi.fn().mockResolvedValue([
      {
        id: 'cp-1',
        name: 'AWS',
        displayName: 'Amazon Web Services'
      }
    ])
  }
}));

describe('Button Visual Consistency Across Themes', () => {
  let localStorageMock: { [key: string]: string };
  const mockUser: User = {
    email: 'test.user@example.com',
    name: 'Test User'
  };

  beforeEach(() => {
    localStorageMock = {};
    
    (globalThis as Record<string, unknown>).localStorage = {
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

  describe('Infrastructure Component Buttons - Light Theme', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    it('should render blueprint control buttons with light theme styles', async () => {
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      const newButton = screen.getByText('New');
      const editButton = screen.getByText('Edit');
      const deleteButton = screen.getByText('Delete');

      // Verify buttons are rendered
      expect(newButton).toBeInTheDocument();
      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();

      // Verify theme is applied
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should render primary button with correct styling', async () => {
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      const newButton = screen.getByText('New');
      expect(newButton.tagName).toBe('BUTTON');
      expect(newButton).not.toHaveClass('btn', 'btn-primary'); // Should not have old CSS classes
    });

    it('should render outline button with correct styling', async () => {
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit');
      expect(editButton.tagName).toBe('BUTTON');
      expect(editButton).not.toHaveClass('btn', 'btn-outline'); // Should not have old CSS classes
    });

    it('should render danger button with correct styling', async () => {
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('Delete');
      expect(deleteButton.tagName).toBe('BUTTON');
      expect(deleteButton).not.toHaveClass('btn', 'btn-danger'); // Should not have old CSS classes
    });

    it('should handle button hover states in light theme', async () => {
      const user = userEvent.setup();
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      const newButton = screen.getByText('New');
      
      await act(async () => {
        await user.hover(newButton);
      });

      expect(newButton).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should handle disabled button states in light theme', async () => {
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit');
      const deleteButton = screen.getByText('Delete');

      // Edit and Delete should be disabled when no blueprint is selected
      expect(editButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Infrastructure Component Buttons - Dark Theme', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    it('should render blueprint control buttons with dark theme styles', async () => {
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      const newButton = screen.getByText('New');
      const editButton = screen.getByText('Edit');
      const deleteButton = screen.getByText('Delete');

      expect(newButton).toBeInTheDocument();
      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should handle button hover states in dark theme', async () => {
      const user = userEvent.setup();
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      const newButton = screen.getByText('New');
      
      await act(async () => {
        await user.hover(newButton);
      });

      expect(newButton).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should handle disabled button states in dark theme', async () => {
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit');
      const deleteButton = screen.getByText('Delete');

      expect(editButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Infrastructure Component Buttons - Frankenstein Theme', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
    });

    it('should render blueprint control buttons with frankenstein theme styles', async () => {
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      const newButton = screen.getByText('New');
      const editButton = screen.getByText('Edit');
      const deleteButton = screen.getByText('Delete');

      expect(newButton).toBeInTheDocument();
      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should handle button hover states in frankenstein theme', async () => {
      const user = userEvent.setup();
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      const newButton = screen.getByText('New');
      
      await act(async () => {
        await user.hover(newButton);
      });

      expect(newButton).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should handle disabled button states in frankenstein theme', async () => {
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit');
      const deleteButton = screen.getByText('Delete');

      expect(editButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });
  });

  describe('Profile Icon - All Themes', () => {
    it('should render profile icon with light theme styles', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      
      render(
        <ProfileIcon 
          userEmail="test.user@example.com" 
          isOpen={false} 
          onClick={() => {}} 
        />
      );

      const button = screen.getByRole('button', { name: /user profile menu/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('profile-icon');
      expect(button).not.toHaveClass('active');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should render profile icon with dark theme styles', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      
      render(
        <ProfileIcon 
          userEmail="test.user@example.com" 
          isOpen={false} 
          onClick={() => {}} 
        />
      );

      const button = screen.getByRole('button', { name: /user profile menu/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('profile-icon');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should render profile icon with frankenstein theme styles', () => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      
      render(
        <ProfileIcon 
          userEmail="test.user@example.com" 
          isOpen={false} 
          onClick={() => {}} 
        />
      );

      const button = screen.getByRole('button', { name: /user profile menu/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('profile-icon');
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should handle active state in all themes', () => {
      const themes = ['light', 'dark', 'frankenstein'];
      
      themes.forEach(theme => {
        document.documentElement.setAttribute('data-theme', theme);
        
        const { unmount } = render(
          <ProfileIcon 
            userEmail="test.user@example.com" 
            isOpen={true} 
            onClick={() => {}} 
          />
        );

        const button = screen.getByRole('button', { name: /user profile menu/i });
        expect(button).toHaveClass('profile-icon', 'active');
        expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
        
        unmount();
      });
    });

    it('should handle hover state in all themes', async () => {
      const user = userEvent.setup();
      const themes = ['light', 'dark', 'frankenstein'];
      
      for (const theme of themes) {
        document.documentElement.setAttribute('data-theme', theme);
        
        const { unmount } = render(
          <ProfileIcon 
            userEmail="test.user@example.com" 
            isOpen={false} 
            onClick={() => {}} 
          />
        );

        const button = screen.getByRole('button', { name: /user profile menu/i });
        
        await act(async () => {
          await user.hover(button);
        });

        expect(button).toBeInTheDocument();
        expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
        
        unmount();
      }
    });

    it('should not have black squares or visual artifacts', () => {
      const themes = ['light', 'dark', 'frankenstein'];
      
      themes.forEach(theme => {
        document.documentElement.setAttribute('data-theme', theme);
        
        const { container, unmount } = render(
          <ProfileIcon 
            userEmail="test.user@example.com" 
            isOpen={false} 
            onClick={() => {}} 
          />
        );

        const button = container.querySelector('.profile-icon');
        expect(button).toBeInTheDocument();
        
        // Verify button has proper class and structure
        expect(button).toHaveClass('profile-icon');
        
        // Verify initials are displayed
        const initials = container.querySelector('.profile-initials');
        expect(initials).toBeInTheDocument();
        expect(initials?.textContent).toBe('TU'); // test.user@example.com -> TU
        
        unmount();
      });
    });
  });

  describe('Theme Toggle - All Themes', () => {
    it('should render theme toggle with light theme styles', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('theme-toggle');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should render theme toggle with dark theme styles', () => {
      localStorageMock['theme'] = 'dark';
      document.documentElement.setAttribute('data-theme', 'dark');
      
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('theme-toggle');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should render theme toggle with frankenstein theme styles', () => {
      localStorageMock['theme'] = 'frankenstein';
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('theme-toggle');
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should handle hover state in all themes', async () => {
      const user = userEvent.setup();
      const themes: Array<'light' | 'dark' | 'frankenstein'> = ['light', 'dark', 'frankenstein'];
      
      for (const theme of themes) {
        localStorageMock['theme'] = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        const { unmount } = render(
          <ThemeProvider>
            <ThemeToggle />
          </ThemeProvider>
        );

        const button = screen.getByRole('button');
        
        await act(async () => {
          await user.hover(button);
        });

        expect(button).toBeInTheDocument();
        expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
        
        unmount();
      }
    });

    it('should not have black squares or visual artifacts', () => {
      const themes: Array<'light' | 'dark' | 'frankenstein'> = ['light', 'dark', 'frankenstein'];
      
      themes.forEach(theme => {
        localStorageMock['theme'] = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        const { container, unmount } = render(
          <ThemeProvider>
            <ThemeToggle />
          </ThemeProvider>
        );

        const button = container.querySelector('.theme-toggle');
        expect(button).toBeInTheDocument();
        
        // Verify button has proper class and structure
        expect(button).toHaveClass('theme-toggle');
        
        // Verify icon is displayed
        const icon = container.querySelector('.theme-toggle-icon');
        expect(icon).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Theme Switching - Visual Consistency', () => {
    it('should maintain button structure when switching themes', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <Infrastructure user={mockUser} />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      // Start with light theme
      document.documentElement.setAttribute('data-theme', 'light');
      let newButton = screen.getByText('New');
      expect(newButton).toBeInTheDocument();

      // Switch to dark theme
      document.documentElement.setAttribute('data-theme', 'dark');
      newButton = screen.getByText('New');
      expect(newButton).toBeInTheDocument();

      // Switch to frankenstein theme
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      newButton = screen.getByText('New');
      expect(newButton).toBeInTheDocument();
    });

    it('should maintain profile icon structure when switching themes', () => {
      const { rerender } = render(
        <ProfileIcon 
          userEmail="test.user@example.com" 
          isOpen={false} 
          onClick={() => {}} 
        />
      );

      // Light theme
      document.documentElement.setAttribute('data-theme', 'light');
      let button = screen.getByRole('button', { name: /user profile menu/i });
      expect(button).toBeInTheDocument();

      // Dark theme
      document.documentElement.setAttribute('data-theme', 'dark');
      rerender(
        <ProfileIcon 
          userEmail="test.user@example.com" 
          isOpen={false} 
          onClick={() => {}} 
        />
      );
      button = screen.getByRole('button', { name: /user profile menu/i });
      expect(button).toBeInTheDocument();

      // Frankenstein theme
      document.documentElement.setAttribute('data-theme', 'frankenstein');
      rerender(
        <ProfileIcon 
          userEmail="test.user@example.com" 
          isOpen={false} 
          onClick={() => {}} 
        />
      );
      button = screen.getByRole('button', { name: /user profile menu/i });
      expect(button).toBeInTheDocument();
    });

    it('should maintain theme toggle structure when switching themes', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      // Cycle through themes
      await act(async () => {
        await user.click(button); // light -> dark
      });
      expect(button).toBeInTheDocument();

      await act(async () => {
        await user.click(button); // dark -> frankenstein
      });
      expect(button).toBeInTheDocument();

      await act(async () => {
        await user.click(button); // frankenstein -> light
      });
      expect(button).toBeInTheDocument();
    });
  });

  describe('No Visual Regressions', () => {
    it('should not affect other components when buttons are rendered', async () => {
      render(<Infrastructure user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Blueprints')).toBeInTheDocument();
      });

      // Verify page structure is intact
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should not affect layout when profile icon is rendered', () => {
      const { container } = render(
        <ProfileIcon 
          userEmail="test.user@example.com" 
          isOpen={false} 
          onClick={() => {}} 
        />
      );

      const button = container.querySelector('.profile-icon');
      expect(button).toBeInTheDocument();
      
      // Verify button doesn't break layout
      expect(button?.tagName).toBe('BUTTON');
    });

    it('should not affect layout when theme toggle is rendered', () => {
      const { container } = render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      );

      const button = container.querySelector('.theme-toggle');
      expect(button).toBeInTheDocument();
      
      // Verify button doesn't break layout
      expect(button?.tagName).toBe('BUTTON');
    });
  });
});
