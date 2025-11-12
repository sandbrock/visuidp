import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './Header';
import { ThemeProvider } from '../contexts/ThemeContext';
import type { User } from '../types/auth';

describe('Header Layout and Styling', () => {
  let localStorageMock: { [key: string]: string };
  const mockUser: User = {
    name: 'Test User',
    email: 'test.user@example.com',
    roles: ['user']
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
  });

  describe('User Info Section Layout', () => {
    it('should render user-info section with ThemeToggle and ProfileMenu', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <Header user={mockUser} />
          </ThemeProvider>
        </BrowserRouter>
      );

      const userInfoSection = document.querySelector('.user-info');
      expect(userInfoSection).toBeInTheDocument();

      // Should contain ThemeToggle
      const themeToggle = screen.getByRole('button', { name: /Current theme/ });
      expect(themeToggle).toBeInTheDocument();

      // Should contain ProfileMenu (profile icon)
      const profileIcon = screen.getByRole('button', { name: /User profile menu/ });
      expect(profileIcon).toBeInTheDocument();
    });

    it('should have proper CSS classes for layout', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <Header user={mockUser} />
          </ThemeProvider>
        </BrowserRouter>
      );

      const header = document.querySelector('.app-header');
      expect(header).toBeInTheDocument();

      const headerContent = document.querySelector('.header-content');
      expect(headerContent).toBeInTheDocument();

      const headerLeft = document.querySelector('.header-left');
      expect(headerLeft).toBeInTheDocument();

      const userInfo = document.querySelector('.user-info');
      expect(userInfo).toBeInTheDocument();
    });

    it('should not render old user email or logout button', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <Header user={mockUser} />
          </ThemeProvider>
        </BrowserRouter>
      );

      // Old elements should not exist
      const userEmail = document.querySelector('.user-email');
      expect(userEmail).not.toBeInTheDocument();

      const logoutButton = document.querySelector('.logout-button');
      expect(logoutButton).not.toBeInTheDocument();
    });
  });

  describe('Theme Consistency', () => {
    it('should render correctly in light theme', () => {
      localStorageMock['theme'] = 'light';

      render(
        <BrowserRouter>
          <ThemeProvider>
            <Header user={mockUser} />
          </ThemeProvider>
        </BrowserRouter>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      
      const header = document.querySelector('.app-header');
      expect(header).toBeInTheDocument();
    });

    it('should render correctly in dark theme', () => {
      localStorageMock['theme'] = 'dark';

      render(
        <BrowserRouter>
          <ThemeProvider>
            <Header user={mockUser} />
          </ThemeProvider>
        </BrowserRouter>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      
      const header = document.querySelector('.app-header');
      expect(header).toBeInTheDocument();
    });

    it('should render correctly in frankenstein theme', () => {
      localStorageMock['theme'] = 'frankenstein';

      render(
        <BrowserRouter>
          <ThemeProvider>
            <Header user={mockUser} />
          </ThemeProvider>
        </BrowserRouter>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
      
      const header = document.querySelector('.app-header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Navigation Structure', () => {
    it('should render navigation links', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <Header user={mockUser} />
          </ThemeProvider>
        </BrowserRouter>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
      expect(screen.getByText('Stacks')).toBeInTheDocument();
    });

    it('should not show API Keys link in main navigation', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <Header user={mockUser} />
          </ThemeProvider>
        </BrowserRouter>
      );

      // API Keys should not be in the header nav
      const headerNav = document.querySelector('.header-nav');
      expect(headerNav).toBeInTheDocument();
      
      const apiKeysLink = headerNav?.querySelector('a[href="/api-keys"]');
      expect(apiKeysLink).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should have responsive classes', () => {
      render(
        <BrowserRouter>
          <ThemeProvider>
            <Header user={mockUser} />
          </ThemeProvider>
        </BrowserRouter>
      );

      const headerContent = document.querySelector('.header-content');
      expect(headerContent).toBeInTheDocument();

      const headerLeft = document.querySelector('.header-left');
      expect(headerLeft).toBeInTheDocument();

      const userInfo = document.querySelector('.user-info');
      expect(userInfo).toBeInTheDocument();
    });
  });
});
