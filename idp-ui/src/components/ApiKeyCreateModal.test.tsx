import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ApiKeyCreateModal } from './ApiKeyCreateModal';
import { apiService } from '../services/api';
import type { User } from '../types/auth';
import type { ApiKeyCreated } from '../types/apiKey';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    createUserApiKey: vi.fn(),
    createSystemApiKey: vi.fn(),
  },
}));

// Mock Modal component
vi.mock('./Modal', () => ({
  Modal: ({ isOpen, children, buttons, title }: any) => (
    isOpen ? (
      <div data-testid="modal" role="dialog">
        <h2>{title}</h2>
        {children}
        <div data-testid="modal-buttons">
          {buttons?.map((btn: any, idx: number) => (
            <button
              key={idx}
              onClick={btn.onClick}
              disabled={btn.disabled}
              data-testid={`modal-button-${idx}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    ) : null
  ),
}));

vi.mock('./input', () => ({
  AngryTextBox: ({ value, onChange, placeholder, id }: any) => (
    <input
      data-testid={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
  AngryComboBox: ({ value, onChange, items, id }: any) => (
    <select
      data-testid={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {items?.map((item: any) => (
        <option key={item.value} value={item.value}>
          {item.text}
        </option>
      ))}
    </select>
  ),
  AngryButton: ({ onClick, children, iconCss }: any) => (
    <button onClick={onClick} data-icon={iconCss}>
      {children}
    </button>
  ),
}));

describe('ApiKeyCreateModal', () => {
  const mockUser: User = {
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
  };

  const mockAdminUser: User = {
    email: 'admin@example.com',
    name: 'Admin User',
    roles: ['admin'],
  };

  const mockCreatedKey: ApiKeyCreated = {
    id: 'new-key-id',
    keyName: 'Test Key',
    keyPrefix: 'idp_user_abc',
    keyType: 'USER',
    userEmail: 'test@example.com',
    createdByEmail: 'test@example.com',
    createdAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-12-31T00:00:00Z',
    isActive: true,
    isExpiringSoon: false,
    status: 'ACTIVE',
    apiKey: 'idp_user_abcdefghijklmnopqrstuvwxyz123456',
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the modal when open', () => {
    render(
      <ApiKeyCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={mockUser}
      />
    );

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByTestId('keyName')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ApiKeyCreateModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={mockUser}
      />
    );

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('creates a user API key with valid input', async () => {
    vi.mocked(apiService.createUserApiKey).mockResolvedValue(mockCreatedKey);
    const user = userEvent.setup();

    render(
      <ApiKeyCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={mockUser}
      />
    );

    const keyNameInput = screen.getByTestId('keyName');
    await user.clear(keyNameInput);
    await user.type(keyNameInput, 'Test Key');

    const createButton = screen.getByText(/create api key/i);
    await user.click(createButton);

    await waitFor(() => {
      expect(apiService.createUserApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          keyName: 'Test Key',
          expirationDays: 90,
          keyType: 'USER',
        }),
        mockUser.email
      );
      expect(mockOnSuccess).toHaveBeenCalledWith(mockCreatedKey);
    });
  });

  it('displays the created API key', async () => {
    vi.mocked(apiService.createUserApiKey).mockResolvedValue(mockCreatedKey);
    const user = userEvent.setup();

    render(
      <ApiKeyCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={mockUser}
      />
    );

    const keyNameInput = screen.getByTestId('keyName');
    await user.clear(keyNameInput);
    await user.type(keyNameInput, 'Test Key');

    const createButton = screen.getByText(/create api key/i);
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(mockCreatedKey.apiKey)).toBeInTheDocument();
    });
  });

  it('shows key type selector for admin users in admin mode', () => {
    render(
      <ApiKeyCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={mockAdminUser}
        mode="admin"
      />
    );

    expect(screen.getByTestId('keyType')).toBeInTheDocument();
  });

  it('hides key type selector for non-admin users', () => {
    render(
      <ApiKeyCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={mockUser}
      />
    );

    expect(screen.queryByTestId('keyType')).not.toBeInTheDocument();
  });

  it('validates that key name is required', async () => {
    const user = userEvent.setup();

    render(
      <ApiKeyCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        user={mockUser}
      />
    );

    // The button should be disabled when key name is empty
    const createButton = screen.getByText(/create api key/i);
    expect(createButton).toBeDisabled();

    expect(apiService.createUserApiKey).not.toHaveBeenCalled();
  });

  describe('Mode-based behavior', () => {
    it('hides key type selector in personal mode', () => {
      render(
        <ApiKeyCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockAdminUser}
          mode="personal"
        />
      );

      expect(screen.queryByTestId('keyType')).not.toBeInTheDocument();
    });

    it('shows key type selector in admin mode for admin users', () => {
      render(
        <ApiKeyCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockAdminUser}
          mode="admin"
        />
      );

      expect(screen.getByTestId('keyType')).toBeInTheDocument();
    });

    it('hides key type selector in admin mode for non-admin users', () => {
      render(
        <ApiKeyCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockUser}
          mode="admin"
        />
      );

      expect(screen.queryByTestId('keyType')).not.toBeInTheDocument();
    });

    it('forces keyType to USER in personal mode', async () => {
      vi.mocked(apiService.createUserApiKey).mockResolvedValue(mockCreatedKey);
      const user = userEvent.setup();

      render(
        <ApiKeyCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockAdminUser}
          mode="personal"
        />
      );

      const keyNameInput = screen.getByTestId('keyName');
      await user.clear(keyNameInput);
      await user.type(keyNameInput, 'Test Key');

      const createButton = screen.getByText(/create api key/i);
      await user.click(createButton);

      await waitFor(() => {
        expect(apiService.createUserApiKey).toHaveBeenCalledWith(
          expect.objectContaining({
            keyName: 'Test Key',
            expirationDays: 90,
            keyType: 'USER',
          }),
          mockAdminUser.email
        );
      });
    });

    it('calls createUserApiKey with correct parameters in personal mode', async () => {
      vi.mocked(apiService.createUserApiKey).mockResolvedValue(mockCreatedKey);
      const user = userEvent.setup();

      render(
        <ApiKeyCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockUser}
          mode="personal"
        />
      );

      const keyNameInput = screen.getByTestId('keyName');
      await user.clear(keyNameInput);
      await user.type(keyNameInput, 'My Personal Key');

      // Change expiration to 60 days
      const expirationSelect = screen.getByTestId('expirationDays');
      await user.selectOptions(expirationSelect, '60');

      const createButton = screen.getByText(/create api key/i);
      await user.click(createButton);

      await waitFor(() => {
        expect(apiService.createUserApiKey).toHaveBeenCalledWith(
          {
            keyName: 'My Personal Key',
            expirationDays: 60,
            keyType: 'USER',
          },
          mockUser.email
        );
        expect(mockOnSuccess).toHaveBeenCalledWith(mockCreatedKey);
      });
    });

    it('allows SYSTEM key creation in admin mode for admin users', async () => {
      const mockSystemKey: ApiKeyCreated = {
        ...mockCreatedKey,
        keyType: 'SYSTEM',
        keyPrefix: 'idp_system_xyz',
        userEmail: null,
      };
      vi.mocked(apiService.createSystemApiKey).mockResolvedValue(mockSystemKey);
      const user = userEvent.setup();

      render(
        <ApiKeyCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockAdminUser}
          mode="admin"
        />
      );

      const keyNameInput = screen.getByTestId('keyName');
      await user.clear(keyNameInput);
      await user.type(keyNameInput, 'System Key');

      // Select SYSTEM key type
      const keyTypeSelect = screen.getByTestId('keyType');
      await user.selectOptions(keyTypeSelect, 'SYSTEM');

      const createButton = screen.getByText(/create api key/i);
      await user.click(createButton);

      await waitFor(() => {
        expect(apiService.createSystemApiKey).toHaveBeenCalledWith(
          expect.objectContaining({
            keyName: 'System Key',
            expirationDays: 90,
            keyType: 'SYSTEM',
          }),
          mockAdminUser.email
        );
        expect(mockOnSuccess).toHaveBeenCalledWith(mockSystemKey);
      });
    });

    it('defaults to personal mode when mode prop is not provided', () => {
      render(
        <ApiKeyCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          user={mockAdminUser}
        />
      );

      // Should not show key type selector even for admin user when mode defaults to personal
      expect(screen.queryByTestId('keyType')).not.toBeInTheDocument();
    });
  });
});
