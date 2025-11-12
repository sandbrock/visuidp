import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ApiKeysManagement } from './ApiKeysManagement';
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
    updateApiKeyName: vi.fn(),
  },
}));

// Mock the child components to simplify testing
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
  ApiKeyCreateModal: ({ isOpen, onSuccess }: any) => (
    isOpen ? (
      <div data-testid="create-modal">
        <button onClick={() => onSuccess({ id: 'new-key', keyName: 'New Key', apiKey: 'test-key' })}>
          Create
        </button>
      </div>
    ) : null
  ),
}));

vi.mock('./ApiKeyRotateModal', () => ({
  ApiKeyRotateModal: ({ isOpen, onSuccess }: any) => (
    isOpen ? (
      <div data-testid="rotate-modal">
        <button onClick={() => onSuccess({ id: 'rotated-key', keyName: 'Rotated Key', apiKey: 'rotated-key' })}>
          Rotate
        </button>
      </div>
    ) : null
  ),
}));

vi.mock('./ApiKeyRevokeModal', () => ({
  ApiKeyRevokeModal: ({ isOpen, onSuccess }: any) => (
    isOpen ? (
      <div data-testid="revoke-modal">
        <button onClick={() => onSuccess()}>Revoke</button>
      </div>
    ) : null
  ),
}));

vi.mock('./ApiKeyEditNameModal', () => ({
  ApiKeyEditNameModal: ({ isOpen, onSuccess, apiKey }: any) => (
    isOpen ? (
      <div data-testid="edit-name-modal">
        <button onClick={() => onSuccess({ ...apiKey, keyName: 'Updated Name' })}>
          Update Name
        </button>
      </div>
    ) : null
  ),
}));

describe('ApiKeysManagement', () => {
  const mockUser: User = {
    email: 'test@example.com',
    name: 'Test User',
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
      keyName: 'Test Key 1',
      keyPrefix: 'idp_user_abc',
      keyType: 'USER',
      userEmail: 'test@example.com',
      createdByEmail: 'test@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-12-31T00:00:00Z',
      lastUsedAt: '2024-01-15T00:00:00Z',
      isActive: true,
      isExpiringSoon: false,
      status: 'ACTIVE',
    },
    {
      id: 'key-2',
      keyName: 'Test Key 2',
      keyPrefix: 'idp_user_def',
      keyType: 'USER',
      userEmail: 'test@example.com',
      createdByEmail: 'test@example.com',
      createdAt: '2024-01-02T00:00:00Z',
      expiresAt: '2024-02-01T00:00:00Z',
      isActive: true,
      isExpiringSoon: true,
      status: 'EXPIRING_SOON',
    },
  ];

  const mockAllApiKeys: ApiKeyResponse[] = [
    ...mockUserApiKeys,
    {
      id: 'key-3',
      keyName: 'System Key',
      keyPrefix: 'idp_system_xyz',
      keyType: 'SYSTEM',
      createdByEmail: 'admin@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: '2025-01-01T00:00:00Z',
      isActive: true,
      isExpiringSoon: false,
      status: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mode Behavior', () => {
    describe('Personal Mode', () => {
      it('renders correctly in personal mode with correct title', async () => {
        vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
        render(<ApiKeysManagement user={mockUser} mode="personal" />);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
        });
      });

      it('renders correctly in personal mode with correct breadcrumb', async () => {
        vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
        render(<ApiKeysManagement user={mockUser} mode="personal" />);

        await waitFor(() => {
          expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('My API Keys');
          expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
        });
      });

      it('calls getUserApiKeys in personal mode', async () => {
        vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
        render(<ApiKeysManagement user={mockUser} mode="personal" />);

        await waitFor(() => {
          expect(apiService.getUserApiKeys).toHaveBeenCalledWith(mockUser.email);
          expect(apiService.getSystemApiKeys).not.toHaveBeenCalled();
        });
      });

      it('displays personal mode description', async () => {
        vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
        render(<ApiKeysManagement user={mockUser} mode="personal" />);

        await waitFor(() => {
          expect(screen.getByText(/manage your personal api keys for programmatic access/i)).toBeInTheDocument();
        });
      });

      it('shows personal empty state message when no keys exist', async () => {
        vi.mocked(apiService.getUserApiKeys).mockResolvedValue([]);
        render(<ApiKeysManagement user={mockUser} mode="personal" />);

        await waitFor(() => {
          expect(screen.getByText(/no api keys yet/i)).toBeInTheDocument();
          expect(screen.getByText(/authenticate cli tools and scripts/i)).toBeInTheDocument();
          expect(screen.getByText(/integrate with ci\/cd pipelines/i)).toBeInTheDocument();
        });
      });
    });

    describe('Admin Mode', () => {
      it('renders correctly in admin mode with correct title', async () => {
        vi.mocked(apiService.getSystemApiKeys).mockResolvedValue(mockAllApiKeys);
        render(<ApiKeysManagement user={mockAdminUser} mode="admin" />);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'API Keys Management' })).toBeInTheDocument();
        });
      });

      it('renders correctly in admin mode with correct breadcrumb', async () => {
        vi.mocked(apiService.getSystemApiKeys).mockResolvedValue(mockAllApiKeys);
        render(<ApiKeysManagement user={mockAdminUser} mode="admin" />);

        await waitFor(() => {
          expect(screen.getByTestId('breadcrumb-item-0')).toHaveTextContent('Admin Dashboard');
          expect(screen.getByTestId('breadcrumb-item-1')).toHaveTextContent('API Keys Management');
        });
      });

      it('calls getSystemApiKeys in admin mode', async () => {
        vi.mocked(apiService.getSystemApiKeys).mockResolvedValue(mockAllApiKeys);
        render(<ApiKeysManagement user={mockAdminUser} mode="admin" />);

        await waitFor(() => {
          expect(apiService.getSystemApiKeys).toHaveBeenCalledWith(mockAdminUser.email);
          expect(apiService.getUserApiKeys).not.toHaveBeenCalled();
        });
      });

      it('displays admin mode description', async () => {
        vi.mocked(apiService.getSystemApiKeys).mockResolvedValue(mockAllApiKeys);
        render(<ApiKeysManagement user={mockAdminUser} mode="admin" />);

        await waitFor(() => {
          expect(screen.getByText(/manage all api keys including system-level keys/i)).toBeInTheDocument();
        });
      });

      it('shows admin empty state message when no keys exist', async () => {
        vi.mocked(apiService.getSystemApiKeys).mockResolvedValue([]);
        render(<ApiKeysManagement user={mockAdminUser} mode="admin" />);

        await waitFor(() => {
          expect(screen.getByText(/no api keys found/i)).toBeInTheDocument();
          expect(screen.queryByText(/authenticate cli tools and scripts/i)).not.toBeInTheDocument();
        });
      });
    });

    describe('Default Mode', () => {
      it('defaults to personal mode when mode prop is not provided', async () => {
        vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
        render(<ApiKeysManagement user={mockUser} />);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: 'My API Keys' })).toBeInTheDocument();
          expect(apiService.getUserApiKeys).toHaveBeenCalledWith(mockUser.email);
          expect(apiService.getSystemApiKeys).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('General Functionality', () => {
    it('renders loading state initially', () => {
      vi.mocked(apiService.getUserApiKeys).mockImplementation(() => new Promise(() => {}));
      render(<ApiKeysManagement user={mockUser} />);
      expect(screen.getByText(/loading api keys/i)).toBeInTheDocument();
    });

    it('displays API keys after loading', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      render(<ApiKeysManagement user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Test Key 1')).toBeInTheDocument();
        expect(screen.getByText('Test Key 2')).toBeInTheDocument();
      });
    });

    it('opens create modal when create button is clicked', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      const user = userEvent.setup();
      render(<ApiKeysManagement user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Test Key 1')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create new api key/i });
      await user.click(createButton);

      expect(screen.getByTestId('create-modal')).toBeInTheDocument();
    });

    it('displays status badges correctly', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      render(<ApiKeysManagement user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
      });
    });

    it('shows action buttons for active keys', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      render(<ApiKeysManagement user={mockUser} />);

      await waitFor(() => {
        const rotateButtons = screen.getAllByRole('button', { name: /rotate/i });
        const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
        expect(rotateButtons.length).toBeGreaterThan(0);
        expect(revokeButtons.length).toBeGreaterThan(0);
      });
    });

    it('opens edit name modal when edit name button is clicked', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      const user = userEvent.setup();
      render(<ApiKeysManagement user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Test Key 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit name/i });
      await user.click(editButtons[0]);

      expect(screen.getByTestId('edit-name-modal')).toBeInTheDocument();
    });

    it('reloads API keys after successful name update', async () => {
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue(mockUserApiKeys);
      const user = userEvent.setup();
      render(<ApiKeysManagement user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Test Key 1')).toBeInTheDocument();
      });

      // Clear the mock to track subsequent calls
      vi.mocked(apiService.getUserApiKeys).mockClear();
      vi.mocked(apiService.getUserApiKeys).mockResolvedValue([
        { ...mockUserApiKeys[0], keyName: 'Updated Name' },
        mockUserApiKeys[1],
      ]);

      const editButtons = screen.getAllByRole('button', { name: /edit name/i });
      await user.click(editButtons[0]);

      const updateButton = screen.getByRole('button', { name: /update name/i });
      await user.click(updateButton);

      // Verify that getUserApiKeys was called again to reload the list
      await waitFor(() => {
        expect(apiService.getUserApiKeys).toHaveBeenCalledWith(mockUser.email);
      });
    });
  });
});
