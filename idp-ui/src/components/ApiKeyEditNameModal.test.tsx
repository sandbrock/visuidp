import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ApiKeyEditNameModal } from './ApiKeyEditNameModal';
import { apiService } from '../services/api';
import type { User } from '../types/auth';
import type { ApiKeyResponse } from '../types/apiKey';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    updateApiKeyName: vi.fn(),
  },
}));

describe('ApiKeyEditNameModal', () => {
  const mockUser: User = {
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
  };

  const mockApiKey: ApiKeyResponse = {
    id: 'key-1',
    keyName: 'Test Key',
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
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    expect(screen.getByText('Edit API Key Name')).toBeInTheDocument();
    expect(screen.getByText('Key Prefix')).toBeInTheDocument();
    expect(screen.getByText('idp_user_abc...')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ApiKeyEditNameModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    expect(screen.queryByText('Edit API Key Name')).not.toBeInTheDocument();
  });

  it('displays current key information', () => {
    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    expect(screen.getByText('idp_user_abc...')).toBeInTheDocument();
    expect(screen.getByText('USER')).toBeInTheDocument();
  });

  it('pre-fills the input with current key name', () => {
    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('Test Key');
  });

  it('disables update button when name is unchanged', () => {
    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const updateButton = screen.getByRole('button', { name: /update name/i });
    expect(updateButton).toBeDisabled();
  });

  it('enables update button when name is changed', async () => {
    const user = userEvent.setup();
    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Key Name');

    const updateButton = screen.getByRole('button', { name: /update name/i });
    expect(updateButton).not.toBeDisabled();
  });

  it('disables update button when name is empty', async () => {
    const user = userEvent.setup();
    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);

    const updateButton = screen.getByRole('button', { name: /update name/i });
    expect(updateButton).toBeDisabled();
  });

  it('calls API service with correct parameters on update', async () => {
    const user = userEvent.setup();
    const updatedKey = { ...mockApiKey, keyName: 'New Key Name' };
    vi.mocked(apiService.updateApiKeyName).mockResolvedValue(updatedKey);

    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Key Name');

    const updateButton = screen.getByRole('button', { name: /update name/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(apiService.updateApiKeyName).toHaveBeenCalledWith(
        'key-1',
        'New Key Name',
        'test@example.com'
      );
    });
  });

  it('calls onSuccess callback after successful update', async () => {
    const user = userEvent.setup();
    const updatedKey = { ...mockApiKey, keyName: 'New Key Name' };
    vi.mocked(apiService.updateApiKeyName).mockResolvedValue(updatedKey);

    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Key Name');

    const updateButton = screen.getByRole('button', { name: /update name/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(updatedKey);
    });
  });

  it('closes modal after successful update', async () => {
    const user = userEvent.setup();
    const updatedKey = { ...mockApiKey, keyName: 'New Key Name' };
    vi.mocked(apiService.updateApiKeyName).mockResolvedValue(updatedKey);

    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Key Name');

    const updateButton = screen.getByRole('button', { name: /update name/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays error message on API failure', async () => {
    const user = userEvent.setup();
    vi.mocked(apiService.updateApiKeyName).mockRejectedValue(
      new Error('Failed to update API key name')
    );

    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Key Name');

    const updateButton = screen.getByRole('button', { name: /update name/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update API key name')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables buttons while updating', async () => {
    const user = userEvent.setup();
    vi.mocked(apiService.updateApiKeyName).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <ApiKeyEditNameModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Key Name');

    const updateButton = screen.getByRole('button', { name: /update name/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });
});
