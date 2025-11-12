import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from '../App';
import { Header } from './Header';
import { ApiKeysManagement } from './ApiKeysManagement';
import { ProtectedRoute } from './ProtectedRoute';
import { ThemeProvider } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import * as auth from '../auth';
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

// Mock the auth module
vi.mock('../auth', () => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
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

describe('Personal API Keys Route Integration Tests', () => {
  const mockRegularUser: User = {
    email: 'user@example.com',
    name: 'Regular User',
    roles: ['user'],
  };

  const mockAdminUser: User = {
    email: 'admin@example.com',
    name: 'Admin User',
    roles: ['admin'],
    isAdmin: true,
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

  const mockOtherUserKeys: ApiKeyResponse[] = [
    {
      id: 'key-2',
      keyName: 'Other User Key',
      keyPrefix: 'idp_user_xyz',
      keyType: 'USER',
      userEmail: 'other@example.com',
      createdByEmail: 'other@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-12-31T00:00:00Z',
      isActive: true,
      isExpiringSoon: false,
      status: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route Accessibility', () => {
    it('should allow non-admin users to access /api-keys route', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);

      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
      });
    });

    it('should not require admin privileges for /api-keys route', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);

      // Render without ProtectedRoute wrapper (simulating the actual App.tsx structure)
      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      // Should render successfully without redirect
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
        expect(apiService.getUserApiKeys).toHaveBeenCalledWith(mockRegularUser.email);
      });
    });

    it('should allow admin users to access /api-keys route', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockAdminUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
      });
    });
  });

  describe('Route Rendering', () => {
    it('should render ApiKeysManagement component with mode="personal" on /api-keys route', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);

      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        // Verify personal mode title
        expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
        
        // Verify personal mode description
        expect(screen.getByText(/manage your personal api keys for programmatic access/i)).toBeInTheDocument();
        
        // Verify personal mode breadcrumb (no admin context)
        expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('My API Keys');
        expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
      });
    });

    it('should call getUserApiKeys API when rendering personal route', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);

      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(apiService.getUserApiKeys).toHaveBeenCalledWith(mockRegularUser.email);
        expect(apiService.getUserApiKeys).toHaveBeenCalledTimes(1);
        expect(apiService.getSystemApiKeys).not.toHaveBeenCalled();
      });
    });
  });

  describe('Navigation from Header', () => {
    it('should display API Keys link in Header for regular users', () => {
      render(
        <ThemeProvider>
          <MemoryRouter>
            <Header user={mockRegularUser} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const apiKeysLink = screen.getByRole('link', { name: /api keys/i });
      expect(apiKeysLink).toBeInTheDocument();
      expect(apiKeysLink).toHaveAttribute('href', '/api-keys');
    });

    it('should display API Keys link in Header for admin users', () => {
      render(
        <ThemeProvider>
          <MemoryRouter>
            <Header user={mockAdminUser} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const apiKeysLink = screen.getByRole('link', { name: /api keys/i });
      expect(apiKeysLink).toBeInTheDocument();
      expect(apiKeysLink).toHaveAttribute('href', '/api-keys');
    });

    it('should navigate to /api-keys when clicking API Keys link in Header', async () => {
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

      // Initially on home page
      expect(screen.getByText('Home Page')).toBeInTheDocument();

      // Click API Keys link
      const apiKeysLink = screen.getByRole('link', { name: /api keys/i });
      await user.click(apiKeysLink);

      // Should navigate to API Keys page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
      });
    });

    it('should highlight API Keys link as active when on /api-keys route', () => {
      render(
        <ThemeProvider>
          <MemoryRouter initialEntries={['/api-keys']}>
            <Header user={mockRegularUser} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const apiKeysLink = screen.getByRole('link', { name: /api keys/i });
      expect(apiKeysLink).toHaveClass('active');
    });
  });

  describe('User Keys Display', () => {
    it('should display only the current user\'s own keys on personal page', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);

      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        // Should show user's own key
        expect(screen.getByText('My Personal Key')).toBeInTheDocument();
        expect(screen.getByText(/idp_user_abc/)).toBeInTheDocument();
        
        // Should not show other users' keys
        expect(screen.queryByText('Other User Key')).not.toBeInTheDocument();
        expect(screen.queryByText(/idp_user_xyz/)).not.toBeInTheDocument();
      });
    });

    it('should only display USER type keys on personal page', async () => {
      const userKeysOnly: ApiKeyResponse[] = [
        {
          id: 'key-1',
          keyName: 'User Key',
          keyPrefix: 'idp_user_abc',
          keyType: 'USER',
          userEmail: 'user@example.com',
          createdByEmail: 'user@example.com',
          createdAt: '2024-01-01T00:00:00Z',
          expiresAt: '2024-12-31T00:00:00Z',
          isActive: true,
          isExpiringSoon: false,
          status: 'ACTIVE',
        },
      ];

      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(userKeysOnly);

      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('User Key')).toBeInTheDocument();
        expect(screen.getByText('USER')).toBeInTheDocument();
        
        // Should not show SYSTEM type indicator
        expect(screen.queryByText('SYSTEM')).not.toBeInTheDocument();
      });
    });

    it('should show empty state when user has no API keys', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockRegularUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/no api keys yet/i)).toBeInTheDocument();
        expect(screen.getByText(/authenticate cli tools and scripts/i)).toBeInTheDocument();
      });
    });
  });

  describe('Admin vs Personal Route Distinction', () => {
    it('should require admin privileges for /admin/api-keys route', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/api-keys']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route 
              path="/admin/api-keys" 
              element={
                <ProtectedRoute user={mockRegularUser} requireAdmin={true}>
                  <ApiKeysManagement user={mockRegularUser} mode="admin" />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </MemoryRouter>
      );

      // Non-admin user should be redirected to home
      await waitFor(() => {
        expect(screen.getByText('Home Page')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'API Keys Management' })).not.toBeInTheDocument();
      });
    });

    it('should allow admin users to access both /api-keys and /admin/api-keys routes', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue([]);
      vi.mocked(apiService.getSystemApiKeys).mockResolvedValue([]);

      // Test personal route
      const { unmount } = render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockAdminUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
      });

      unmount();

      // Test admin route
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
      });
    });
  });
});
