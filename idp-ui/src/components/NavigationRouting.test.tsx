import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Header } from './Header';
import { ApiKeysManagement } from './ApiKeysManagement';
import { ProtectedRoute } from './ProtectedRoute';
import { ThemeProvider } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import type { User } from '../types/auth';
import type { ApiKeyResponse } from '../types/apiKey';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getUserApiKeys: vi.fn(),
    getSystemApiKeys: vi.fn(),
    createUserApiKey: vi.fn(),
    rotateApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
  },
}));

// Mock child components to simplify testing
vi.mock('./Breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: Array<{ label: string; path?: string }> }) => (
    <div data-testid="breadcrumb">
      {items.map((item, index) => (
        <span key={index} data-testid={`breadcrumb-item-${index}`}>
          {item.label}
        </span>
      ))}
    </div>
  ),
}));

vi.mock('./ApiKeyCreateModal', () => ({
  ApiKeyCreateModal: ({ isOpen }: any) => (
    isOpen ? <div data-testid="create-modal">Create Modal</div> : null
  ),
}));

vi.mock('./ApiKeyRotateModal', () => ({
  ApiKeyRotateModal: ({ isOpen }: any) => (
    isOpen ? <div data-testid="rotate-modal">Rotate Modal</div> : null
  ),
}));

vi.mock('./ApiKeyRevokeModal', () => ({
  ApiKeyRevokeModal: ({ isOpen }: any) => (
    isOpen ? <div data-testid="revoke-modal">Revoke Modal</div> : null
  ),
}));

describe('Navigation and Routing Behavior Tests', () => {
  const mockRegularUser: User = {
    email: 'user@example.com',
    name: 'Regular User',
    roles: ['user'],
  };

  const mockAdminUser: User = {
    email: 'admin@example.com',
    name: 'Admin User',
    roles: ['admin'],
  };

  const mockUserApiKeys: ApiKeyResponse[] = [
    {
      id: 'key-1',
      keyName: 'My Personal Key',
      keyPrefix: 'idp_user_abc',
      keyType: 'USER',
      userEmail: 'user@example.com',
      createdByEmail: 'user@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-12-31T00:00:00Z',
      lastUsedAt: '2024-01-15T00:00:00Z',
      isActive: true,
      isExpiringSoon: false,
      status: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Keys Link Visibility in Header', () => {
    it('should display API Keys link in Header for all authenticated users', () => {
      render(
        <ThemeProvider>
          <MemoryRouter>
            <Header user={mockRegularUser} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const apiKeysLink = screen.getByRole('link', { name: /🔑 api keys/i });
      expect(apiKeysLink).toBeInTheDocument();
      expect(apiKeysLink).toHaveAttribute('href', '/api-keys');
    });

    it('should display API Keys link for regular non-admin users', () => {
      const regularUser: User = {
        email: 'regular@example.com',
        name: 'Regular User',
        roles: ['user'],
      };

      render(
        <ThemeProvider>
          <MemoryRouter>
            <Header user={regularUser} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const apiKeysLink = screen.getByRole('link', { name: /🔑 api keys/i });
      expect(apiKeysLink).toBeInTheDocument();
    });

    it('should display API Keys link for admin users', () => {
      render(
        <ThemeProvider>
          <MemoryRouter>
            <Header user={mockAdminUser} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const apiKeysLink = screen.getByRole('link', { name: /🔑 api keys/i });
      expect(apiKeysLink).toBeInTheDocument();
    });

    it('should position API Keys link between Stacks and Admin links', () => {
      render(
        <ThemeProvider>
          <MemoryRouter>
            <Header user={mockAdminUser} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const allLinks = screen.getAllByRole('link');
      const linkTexts = allLinks.map(link => link.textContent);
      
      const apiKeysIndex = linkTexts.findIndex(text => text?.includes('API Keys'));
      const stacksIndex = linkTexts.findIndex(text => text?.includes('Stacks'));
      const adminIndex = linkTexts.findIndex(text => text === 'Admin');
      
      expect(apiKeysIndex).toBeGreaterThan(stacksIndex);
      expect(apiKeysIndex).toBeLessThan(adminIndex);
    });
  });

  describe('Navigation to /api-keys Route', () => {
    it('should navigate to /api-keys when clicking API Keys link', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <Header user={mockRegularUser} />
            <Routes>
              <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
              <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      // Initially on home page
      expect(screen.getByTestId('home-page')).toBeInTheDocument();

      // Click API Keys link
      const apiKeysLink = screen.getByRole('link', { name: /🔑 api keys/i });
      await user.click(apiKeysLink);

      // Should navigate to API Keys page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
        expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
      });
    });

    it('should load personal API keys when navigating to /api-keys', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <Header user={mockRegularUser} />
            <Routes>
              <Route path="/" element={<div>Home Page</div>} />
              <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      const apiKeysLink = screen.getByRole('link', { name: /🔑 api keys/i });
      await user.click(apiKeysLink);

      await waitFor(() => {
        expect(apiService.getUserApiKeys).toHaveBeenCalledWith(mockRegularUser.email);
        expect(screen.getByText('My Personal Key')).toBeInTheDocument();
      });
    });

    it('should navigate from different routes to /api-keys', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/infrastructure']}>
            <Header user={mockRegularUser} />
            <Routes>
              <Route path="/infrastructure" element={<div data-testid="infrastructure-page">Infrastructure</div>} />
              <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      // Initially on infrastructure page
      expect(screen.getByTestId('infrastructure-page')).toBeInTheDocument();

      // Navigate to API Keys
      const apiKeysLink = screen.getByRole('link', { name: /🔑 api keys/i });
      await user.click(apiKeysLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
      });
    });
  });

  describe('Active State Highlighting on /api-keys Route', () => {
    it('should highlight API Keys link as active when on /api-keys route', () => {
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/api-keys']}>
            <Header user={mockRegularUser} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const apiKeysLink = screen.getByRole('link', { name: /🔑 api keys/i });
      expect(apiKeysLink).toHaveClass('nav-link');
      expect(apiKeysLink).toHaveClass('active');
    });

    it('should not highlight API Keys link when on other routes', () => {
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <Header user={mockRegularUser} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const apiKeysLink = screen.getByRole('link', { name: /🔑 api keys/i });
      expect(apiKeysLink).toHaveClass('nav-link');
      expect(apiKeysLink).not.toHaveClass('active');
    });

    it('should update active state when navigating to /api-keys', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <Header user={mockRegularUser} />
            <Routes>
              <Route path="/" element={<div>Home</div>} />
              <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      const apiKeysLink = screen.getByRole('link', { name: /🔑 api keys/i });
      
      // Initially not active
      expect(apiKeysLink).not.toHaveClass('active');

      // Click to navigate
      await user.click(apiKeysLink);

      // Should become active
      await waitFor(() => {
        expect(apiKeysLink).toHaveClass('active');
      });
    });

    it('should remove active state when navigating away from /api-keys', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/api-keys']}>
            <Header user={mockRegularUser} />
            <Routes>
              <Route path="/" element={<div>Home</div>} />
              <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      const apiKeysLink = screen.getByRole('link', { name: /🔑 api keys/i });
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      
      // Initially active on /api-keys
      expect(apiKeysLink).toHaveClass('active');

      // Navigate away
      await user.click(dashboardLink);

      // Should no longer be active
      await waitFor(() => {
        expect(apiKeysLink).not.toHaveClass('active');
      });
    });
  });

  describe('Admin Access to Both Routes', () => {
    it('should allow admins to access /api-keys route', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);

      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockAdminUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
        expect(apiService.getUserApiKeys).toHaveBeenCalledWith(mockAdminUser.email);
      });
    });

    it('should allow admins to access /admin/api-keys route', async () => {
      vi.mocked(apiService.getSystemApiKeys).mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={['/admin/api-keys']}>
          <Routes>
            <Route 
              path="/admin/api-keys" 
              element={
                <ProtectedRoute user={mockAdminUser} requireAdmin={true}>
                  <ApiKeysManagement user={mockAdminUser} mode="admin" />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'API Keys Management' })).toBeInTheDocument();
        expect(apiService.getSystemApiKeys).toHaveBeenCalledWith(mockAdminUser.email);
      });
    });

    it('should allow admins to navigate between personal and admin API keys pages', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      vi.mocked(apiService.getSystemApiKeys).mockResolvedValue([]);
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/api-keys']}>
            <Header user={mockAdminUser} />
            <Routes>
              <Route path="/api-keys" element={<ApiKeysManagement user={mockAdminUser} mode="personal" />} />
              <Route path="/admin" element={<div data-testid="admin-dashboard">Admin Dashboard</div>} />
              <Route 
                path="/admin/api-keys" 
                element={
                  <ProtectedRoute user={mockAdminUser} requireAdmin={true}>
                    <ApiKeysManagement user={mockAdminUser} mode="admin" />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      // Start on personal API keys page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
      });

      // Navigate to admin dashboard
      const adminLink = screen.getByRole('link', { name: /admin/i });
      await user.click(adminLink);

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });
    });

    it('should show different content for admin on personal vs admin routes', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue([mockUserApiKeys[0]]);
      vi.mocked(apiService.getSystemApiKeys).mockResolvedValue([
        mockUserApiKeys[0],
        {
          id: 'key-2',
          keyName: 'System Key',
          keyPrefix: 'idp_system_xyz',
          keyType: 'SYSTEM',
          userEmail: undefined,
          createdByEmail: 'admin@example.com',
          createdAt: '2024-01-01T00:00:00Z',
          expiresAt: '2025-12-31T00:00:00Z',
          isActive: true,
          isExpiringSoon: false,
          status: 'ACTIVE',
        },
      ]);

      // Render personal route
      const { unmount } = render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockAdminUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
        expect(apiService.getUserApiKeys).toHaveBeenCalled();
      });

      unmount();
      vi.clearAllMocks();

      // Render admin route
      render(
        <MemoryRouter initialEntries={['/admin/api-keys']}>
          <Routes>
            <Route 
              path="/admin/api-keys" 
              element={
                <ProtectedRoute user={mockAdminUser} requireAdmin={true}>
                  <ApiKeysManagement user={mockAdminUser} mode="admin" />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'API Keys Management' })).toBeInTheDocument();
        expect(apiService.getSystemApiKeys).toHaveBeenCalled();
      });
    });
  });

  describe('Breadcrumb Navigation in Both Contexts', () => {
    it('should show personal breadcrumb on /api-keys route', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);

      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
        expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('My API Keys');
        expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
      });
    });

    it('should show admin breadcrumb on /admin/api-keys route', async () => {
      vi.mocked(apiService.getSystemApiKeys).mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={['/admin/api-keys']}>
          <Routes>
            <Route 
              path="/admin/api-keys" 
              element={
                <ProtectedRoute user={mockAdminUser} requireAdmin={true}>
                  <ApiKeysManagement user={mockAdminUser} mode="admin" />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
        expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('Admin Dashboard');
        expect(screen.getByTestId('breadcrumb-item-1')).toHaveTextContent('API Keys Management');
      });
    });

    it('should have different breadcrumb structure for personal vs admin contexts', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      vi.mocked(apiService.getSystemApiKeys).mockResolvedValue([]);

      // Render personal route
      const { unmount } = render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockAdminUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const breadcrumbItems = screen.getAllByTestId(/breadcrumb-item-/);
        expect(breadcrumbItems).toHaveLength(1); // Only "My API Keys"
        expect(breadcrumbItems[0]).toHaveTextContent('My API Keys');
      });

      unmount();

      // Render admin route
      render(
        <MemoryRouter initialEntries={['/admin/api-keys']}>
          <Routes>
            <Route 
              path="/admin/api-keys" 
              element={
                <ProtectedRoute user={mockAdminUser} requireAdmin={true}>
                  <ApiKeysManagement user={mockAdminUser} mode="admin" />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const breadcrumbItems = screen.getAllByTestId(/breadcrumb-item-/);
        expect(breadcrumbItems).toHaveLength(2); // "Admin Dashboard" and "API Keys Management"
        expect(breadcrumbItems[0]).toHaveTextContent('Admin Dashboard');
        expect(breadcrumbItems[1]).toHaveTextContent('API Keys Management');
      });
    });

    it('should maintain breadcrumb consistency when navigating within personal context', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);

      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('My API Keys');
      });

      // Breadcrumb should remain consistent
      expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('My API Keys');
      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
    });

    it('should maintain breadcrumb consistency when navigating within admin context', async () => {
      vi.mocked(apiService.getSystemApiKeys).mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={['/admin/api-keys']}>
          <Routes>
            <Route 
              path="/admin/api-keys" 
              element={
                <ProtectedRoute user={mockAdminUser} requireAdmin={true}>
                  <ApiKeysManagement user={mockAdminUser} mode="admin" />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('Admin Dashboard');
        expect(screen.getByTestId('breadcrumb-item-1')).toHaveTextContent('API Keys Management');
      });

      // Breadcrumb should remain consistent
      expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('Admin Dashboard');
      expect(screen.getByTestId('breadcrumb-item-1')).toHaveTextContent('API Keys Management');
    });
  });
});
