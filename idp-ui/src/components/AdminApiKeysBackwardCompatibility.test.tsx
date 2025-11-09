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

// Mock child components
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
  ApiKeyCreateModal: ({ isOpen, mode, user, onSuccess }: any) => (
    isOpen ? (
      <div data-testid="create-modal">
        <div data-testid="modal-mode">{mode}</div>
        <div data-testid="modal-user-admin">{user.isAdmin ? 'true' : 'false'}</div>
        <button 
          data-testid="create-user-key-btn"
          onClick={() => onSuccess({ 
            id: 'new-user-key', 
            keyName: 'New User Key', 
            apiKey: 'idp_user_newkey123',
            keyPrefix: 'idp_user_new'
          })}
        >
          Create User Key
        </button>
        {mode === 'admin' && user.isAdmin && (
          <button 
            data-testid="create-system-key-btn"
            onClick={() => onSuccess({ 
              id: 'new-system-key', 
              keyName: 'New System Key', 
              apiKey: 'idp_system_newkey456',
              keyPrefix: 'idp_system_new'
            })}
          >
            Create System Key
          </button>
        )}
      </div>
    ) : null
  ),
}));

vi.mock('./ApiKeyRotateModal', () => ({
  ApiKeyRotateModal: ({ isOpen, apiKey, onSuccess }: any) => (
    isOpen ? (
      <div data-testid="rotate-modal">
        <div data-testid="rotate-key-name">{apiKey?.keyName}</div>
        <button 
          data-testid="rotate-confirm-btn"
          onClick={() => onSuccess({ 
            id: apiKey.id, 
            keyName: apiKey.keyName, 
            apiKey: 'rotated_key_value',
            keyPrefix: apiKey.keyPrefix
          })}
        >
          Confirm Rotate
        </button>
      </div>
    ) : null
  ),
}));

vi.mock('./ApiKeyRevokeModal', () => ({
  ApiKeyRevokeModal: ({ isOpen, apiKey, onSuccess }: any) => (
    isOpen ? (
      <div data-testid="revoke-modal">
        <div data-testid="revoke-key-name">{apiKey?.keyName}</div>
        <button 
          data-testid="revoke-confirm-btn"
          onClick={() => onSuccess()}
        >
          Confirm Revoke
        </button>
      </div>
    ) : null
  ),
}));

describe('Admin API Keys Backward Compatibility Tests', () => {
  const mockAdminUser: User = {
    email: 'admin@example.com',
    name: 'Admin User',
    roles: ['admin'],
  };

  const mockUserApiKeys: ApiKeyResponse[] = [
    {
      id: 'user-key-1',
      keyName: 'User Key 1',
      keyPrefix: 'idp_user_abc',
      keyType: 'USER',
      userEmail: 'user1@example.com',
      createdByEmail: 'user1@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-12-31T00:00:00Z',
      lastUsedAt: '2024-01-15T00:00:00Z',
      isActive: true,
      isExpiringSoon: false,
      status: 'ACTIVE',
    },
    {
      id: 'user-key-2',
      keyName: 'User Key 2',
      keyPrefix: 'idp_user_xyz',
      keyType: 'USER',
      userEmail: 'user2@example.com',
      createdByEmail: 'user2@example.com',
      createdAt: '2024-01-02T00:00:00Z',
      expiresAt: '2024-12-31T00:00:00Z',
      isActive: true,
      isExpiringSoon: false,
      status: 'ACTIVE',
    },
  ];

  const mockSystemApiKeys: ApiKeyResponse[] = [
    {
      id: 'system-key-1',
      keyName: 'System CI/CD Key',
      keyPrefix: 'idp_system_ci',
      keyType: 'SYSTEM',
      userEmail: undefined,
      createdByEmail: 'admin@example.com',
      createdAt: '2024-01-03T00:00:00Z',
      expiresAt: '2025-12-31T00:00:00Z',
      isActive: true,
      isExpiringSoon: false,
      status: 'ACTIVE',
    },
    {
      id: 'system-key-2',
      keyName: 'System Monitoring Key',
      keyPrefix: 'idp_system_mon',
      keyType: 'SYSTEM',
      userEmail: undefined,
      createdByEmail: 'admin@example.com',
      createdAt: '2024-01-04T00:00:00Z',
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

  describe('1. Admin Route Protection - Unchanged', () => {
    it('should continue to require admin privileges for /admin/api-keys route', async () => {
      const nonAdminUser: User = {
        email: 'user@example.com',
        name: 'Regular User',
        roles: ['user'],
      };

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

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'API Keys Management' })).not.toBeInTheDocument();
      });

      expect(apiService.getAllApiKeys).not.toHaveBeenCalled();
    });

    it('should continue to allow admin users to access /admin/api-keys route', async () => {
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
        expect(screen.getByRole('heading', { name: 'API Keys Management' })).toBeInTheDocument();
      });

      expect(apiService.getAllApiKeys).toHaveBeenCalledWith(mockAdminUser.email);
    });
  });

  describe('2. Admin Page Rendering - Unchanged', () => {
    it('should continue to display "API Keys Management" title on admin page', async () => {
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
        expect(screen.getByRole('heading', { name: 'API Keys Management' })).toBeInTheDocument();
      });
    });

    it('should continue to display admin breadcrumb with "Admin Dashboard"', async () => {
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
        expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('Admin Dashboard');
        expect(screen.getByTestId('breadcrumb-item-1')).toHaveTextContent('API Keys Management');
      });
    });

    it('should continue to display admin description text', async () => {
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
        expect(screen.getByText(/manage all api keys including system-level keys/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. All Keys Display - Unchanged', () => {
    it('should continue to display all user keys on admin page', async () => {
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
        expect(screen.getByText('User Key 1')).toBeInTheDocument();
        expect(screen.getByText('User Key 2')).toBeInTheDocument();
        expect(screen.getByText(/idp_user_abc/)).toBeInTheDocument();
        expect(screen.getByText(/idp_user_xyz/)).toBeInTheDocument();
      });
    });

    it('should continue to display all system keys on admin page', async () => {
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
        expect(screen.getByText('System CI/CD Key')).toBeInTheDocument();
        expect(screen.getByText('System Monitoring Key')).toBeInTheDocument();
        expect(screen.getByText(/idp_system_ci/)).toBeInTheDocument();
        expect(screen.getByText(/idp_system_mon/)).toBeInTheDocument();
      });
    });

    it('should continue to call getAllApiKeys API endpoint', async () => {
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

    it('should continue to display both USER and SYSTEM type badges', async () => {
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
        const userBadges = screen.getAllByText('USER');
        expect(userBadges.length).toBe(2);
        
        const systemBadges = screen.getAllByText('SYSTEM');
        expect(systemBadges.length).toBe(2);
      });
    });
  });

  describe('4. System Key Creation - Unchanged', () => {
    it('should continue to show create button on admin page', async () => {
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

    it('should continue to open create modal with admin mode', async () => {
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

    it('should continue to allow system key creation in admin mode', async () => {
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
        expect(screen.getByTestId('create-system-key-btn')).toBeInTheDocument();
      });
    });
  });

  describe('5. Key Operations - Unchanged', () => {
    it('should continue to support rotating keys', async () => {
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
        expect(screen.getByText('User Key 1')).toBeInTheDocument();
      });

      const rotateButtons = screen.getAllByRole('button', { name: /rotate/i });
      await user.click(rotateButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('rotate-modal')).toBeInTheDocument();
      });
    });

    it('should continue to support revoking keys', async () => {
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
        expect(screen.getByText('User Key 1')).toBeInTheDocument();
      });

      const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
      await user.click(revokeButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('revoke-modal')).toBeInTheDocument();
      });
    });

    it('should continue to display key metadata (status, dates, etc.)', async () => {
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
        // Check for status badges
        const activeBadges = screen.getAllByText('Active');
        expect(activeBadges.length).toBeGreaterThan(0);
        
        // Check for key prefixes
        expect(screen.getByText(/idp_user_abc/)).toBeInTheDocument();
        expect(screen.getByText(/idp_system_ci/)).toBeInTheDocument();
      });
    });
  });

  describe('6. Empty State - Unchanged', () => {
    it('should continue to show admin empty state when no keys exist', async () => {
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
        expect(screen.getByText(/no api keys found/i)).toBeInTheDocument();
        // Should NOT show personal empty state
        expect(screen.queryByText(/authenticate cli tools and scripts/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('7. Error Handling - Unchanged', () => {
    it('should continue to handle API errors gracefully', async () => {
      vi.mocked(apiService.getAllApiKeys).mockRejectedValue(new Error('API Error'));

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
        // Error message is displayed in a div with class "error-message"
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('should continue to display error message and allow retry', async () => {
      vi.mocked(apiService.getAllApiKeys).mockRejectedValue(new Error('Failed to fetch'));

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
        // Error is displayed
        expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
        // Page still renders with empty state
        expect(screen.getByText(/no api keys found/i)).toBeInTheDocument();
      });
    });
  });

  describe('8. Integration with Admin Dashboard', () => {
    it('should continue to be accessible from admin dashboard navigation', async () => {
      vi.mocked(apiService.getAllApiKeys).mockResolvedValue(mockAllApiKeys);

      // Simulate navigation from admin dashboard
      render(
        <MemoryRouter initialEntries={['/admin', '/admin/api-keys']} initialIndex={1}>
          <Routes>
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
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'API Keys Management' })).toBeInTheDocument();
        // Breadcrumb should link back to admin dashboard
        expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('Admin Dashboard');
      });
    });
  });
});
