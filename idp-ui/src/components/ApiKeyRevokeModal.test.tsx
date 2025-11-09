import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ApiKeyRevokeModal } from './ApiKeyRevokeModal';
import { apiService } from '../services/api';
import type { User } from '../types/auth';
import type { ApiKeyResponse } from '../types/apiKey';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    revokeApiKey: vi.fn(),
  },
}));

// Mock the Modal component
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
              className={`modal-button-${btn.variant}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    ) : null
  ),
}));

describe('ApiKeyRevokeModal', () => {
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
    isActive: true,
    isExpiringSoon: false,
    status: 'ACTIVE',
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the modal when open', () => {
    render(
      <ApiKeyRevokeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it('displays API key information', () => {
    render(
      <ApiKeyRevokeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    expect(screen.getByText('Test Key')).toBeInTheDocument();
    expect(screen.getByText(/idp_user_abc/i)).toBeInTheDocument();
  });

  it('displays warning about irreversible action', () => {
    render(
      <ApiKeyRevokeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });

  it('revokes the API key when confirmed', async () => {
    vi.mocked(apiService.revokeApiKey).mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <ApiKeyRevokeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const revokeButton = screen.getByTestId('modal-button-1');
    await user.click(revokeButton);

    await waitFor(() => {
      expect(apiService.revokeApiKey).toHaveBeenCalledWith(mockApiKey.id, mockUser.email);
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles revocation errors', async () => {
    vi.mocked(apiService.revokeApiKey).mockRejectedValue(new Error('Revocation failed'));
    const user = userEvent.setup();

    render(
      <ApiKeyRevokeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const revokeButton = screen.getByTestId('modal-button-1');
    await user.click(revokeButton);

    await waitFor(() => {
      expect(screen.getByText(/revocation failed/i)).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes modal when cancel is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ApiKeyRevokeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const cancelButton = screen.getByText(/cancel/i);
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
    expect(apiService.revokeApiKey).not.toHaveBeenCalled();
  });
});
