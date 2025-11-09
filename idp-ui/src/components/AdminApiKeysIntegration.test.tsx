import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ApiKeysManagement } from './ApiKeysManagement';
import { ProtectedRoute } from './ProtectedRoute';
import { apiService } from '../services/api';
import type { User } from '../types/auth';
import type { ApiKeyResponse } from '../types/apiKey';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getUserApiKeys: vi.fn(),
    getAllApiKeys: vi.fn(),
    createUserApiKey: vi.fn(),
    createSystemApiKey: vi.fn(),
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
  ApiKeyCreateModal: ({ isOpen, mode, user }: any) => (
    isOpen ? (
      <div data-testid="create-modal">
        <div data-testid="modal-mode">{mode}</div>
        <div data-testid="modal-user-admin">{user.isAdmin ? 'true' : 'false'}</div>
      </div>
    ) : null
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

describe('Admin API Keys Route Integration Tests', () => {
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
      keyName: 'User Key 1',
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
    {
      id: 'key-2',
      keyName: 'User Key 2',
      keyPrefix: 'idp_user_xyz',
      keyType: 'USER',
      userEmail: 'other@example.com',
      createdByEmail: 'other@example.com',
      createdAt: '2024-01-02T00:00:00Z',
      expiresAt: '2024-12-31T00:00:00Z',
      isActive: true,
      isExpiringSoon: false,
      status: 'ACTIVE',
    },
  ];

  const mockSystemApiKeys: ApiKeyResponse[] = [
    {
      id: 'key-3',
      keyName: 'System CI/CD Key',
      keyPrefix: 'idp_system_def',
      keyType: 'SYSTEM',
      userEmail: null,
      createdByEmail: 'admin@example.com',
      createdAt: '2024-01-03T00:00:00Z',
      expiresAt: '2025-12-31T00:00:00Z',
      isActive: true,
      isExpiringSoon: false,
      status: 'ACTIVE',
    },
  ];

  const mockAllApiKeys: ApiKeyResponse[] = [
    ...mockUserApiKeys,
    ...mockSystemApiKeys,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route Protection', () => {
    it('should require admin privileges for /admin/api-keys route', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);

      render(
        <MemoryRouter initialEntries={['/admin/api-keys']}>
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
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
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'API Keys Management' })).not.toBeInTheDocument();
      });

      // API should not be called for unauthorized access
      expect(apiService.getAllApiKeys).not.toHaveBeenCalled();
    });

    it('should allow admin users to access /admin/api-keys route', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);

      render(
        <MemoryRouter initialEntries={['/admin/api-keys']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
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

      // Admin user should see the admin API keys page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'API Keys Management' })).toBeInTheDocument();
      });

      // API should be called
      expect(apiService.getAllApiKeys).toHaveBeenCalledWith(mockAdminUser.email);
    });

    it('should not allow non-admin users to bypass protection', async () => {
      const nonAdminUser = { ...mockRegularUser, isAdmin: false };
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);

      render(
        <MemoryRouter initialEntries={['/admin/api-keys']}>
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
            <Route 
              path="/admin/api-keys" 
              element={
                <ProtectedRoute user={nonAdminUser} requireAdmin={true}>
                  <ApiKeysManagement user={nonAdminUser} mode="admin" />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </MemoryRouter>
      );

      // Should redirect to home
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      expect(apiService.getAllApiKeys).not.toHaveBeenCalled();
    });
  });

  describe('Route Rendering', () => {
    it('should render ApiKeysManagement component with mode="admin" on /admin/api-keys route', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);

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
        // Verify admin mode title
        expect(screen.getByRole('heading', { name: 'API Keys Management' })).toBeInTheDocument();
        
        // Verify admin mode description
        expect(screen.getByText(/manage all api keys including system-level keys/i)).toBeInTheDocument();
        
        // Verify admin mode breadcrumb includes "Admin Dashboard"
        expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('Admin Dashboard');
        expect(screen.getByTestId('breadcrumb-item-1')).toHaveTextContent('API Keys Management');
      });
    });

    it('should call getAllApiKeys API when rendering admin route', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);

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
        expect(apiService.getAllApiKeys).toHaveBeenCalledWith(mockAdminUser.email);
        expect(apiService.getAllApiKeys).toHaveBeenCalledTimes(1);
        expect(apiService.getUserApiKeys).not.toHaveBeenCalled();
      });
    });

    it('should display admin breadcrumb navigation with correct links', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);

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
        const breadcrumb = screen.getByTestId('breadcrumb');
        expect(breadcrumb).toBeInTheDocument();
        
        // Should have two breadcrumb items
        expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('Admin Dashboard');
        expect(screen.getByTestId('breadcrumb-item-1')).toHaveTextContent('API Keys Management');
      });
    });
  });

  describe('All Keys Display', () => {
    it('should display all keys including system keys on admin page', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);

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
        // Should show user keys
        expect(screen.getByText('User Key 1')).toBeInTheDocument();
        expect(screen.getByText('User Key 2')).toBeInTheDocument();
        expect(screen.getByText(/idp_user_abc/)).toBeInTheDocument();
        expect(screen.getByText(/idp_user_xyz/)).toBeInTheDocument();
        
        // Should show system keys
        expect(screen.getByText('System CI/CD Key')).toBeInTheDocument();
        expect(screen.getByText(/idp_system_def/)).toBeInTheDocument();
      });
    });

    it('should display both USER and SYSTEM key types on admin page', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);

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
        // Should show USER type badges
        const userBadges = screen.getAllByText('USER');
        expect(userBadges.length).toBeGreaterThan(0);
        
        // Should show SYSTEM type badge
        expect(screen.getByText('SYSTEM')).toBeInTheDocument();
      });
    });

    it('should display keys from multiple users on admin page', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);

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
        // Should show keys from user@example.com
        expect(screen.getByText('User Key 1')).toBeInTheDocument();
        
        // Should show keys from other@example.com
        expect(screen.getByText('User Key 2')).toBeInTheDocument();
        
        // Should show system key (no user email)
        expect(screen.getByText('System CI/CD Key')).toBeInTheDocument();
      });
    });

    it('should show empty state with admin context when no keys exist', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue([]);

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
        // Should show admin empty state (not personal empty state)
        expect(screen.getByText(/no api keys found/i)).toBeInTheDocument();
        
        // Should NOT show personal empty state benefits
        expect(screen.queryByText(/authenticate cli tools and scripts/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('System Key Creation', () => {
    it('should show create button on admin page', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);

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
        const createButton = screen.getByRole('button', { name: /create new api key/i });
        expect(createButton).toBeInTheDocument();
      });
    });

    it('should open create modal with admin mode when create button is clicked', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);
      const user = userEvent.setup();

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

      const createButton = screen.getByRole('button', { name: /create new api key/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('create-modal')).toBeInTheDocument();
        expect(screen.getByTestId('modal-mode')).toHaveTextContent('admin');
        expect(screen.getByTestId('modal-user-admin')).toHaveTextContent('true');
      });
    });

    it('should pass admin mode to create modal for system key creation', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue([]);
      const user = userEvent.setup();

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

      // Click create button from empty state
      const createButtons = screen.getAllByRole('button', { name: /create new api key/i });
      await user.click(createButtons[0]);

      await waitFor(() => {
        const modal = screen.getByTestId('create-modal');
        expect(modal).toBeInTheDocument();
        
        // Verify modal receives admin mode
        expect(screen.getByTestId('modal-mode')).toHaveTextContent('admin');
      });
    });
  });

  describe('Admin vs Personal Route Comparison', () => {
    it('should show different titles for admin and personal routes', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue([mockUserApiKeys[0]]);

      // Render admin route
      const { unmount } = render(
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

      unmount();

      // Render personal route
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

    it('should show different breadcrumbs for admin and personal routes', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue([mockUserApiKeys[0]]);

      // Render admin route
      const { unmount } = render(
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

      unmount();

      // Render personal route
      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockAdminUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('My API Keys');
        expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
      });
    });

    it('should call different API endpoints for admin and personal routes', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue([mockUserApiKeys[0]]);

      // Render admin route
      const { unmount } = render(
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
        expect(apiService.getAllApiKeys).toHaveBeenCalledWith(mockAdminUser.email);
        expect(apiService.getUserApiKeys).not.toHaveBeenCalled();
      });

      unmount();
      vi.clearAllMocks();

      // Render personal route
      render(
        <MemoryRouter initialEntries={['/api-keys']}>
          <Routes>
            <Route path="/api-keys" element={<ApiKeysManagement user={mockAdminUser} mode="personal" />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(apiService.getUserApiKeys).toHaveBeenCalledWith(mockAdminUser.email);
        expect(apiService.getAllApiKeys).not.toHaveBeenCalled();
      });
    });
  });
});
