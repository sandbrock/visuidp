import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ApiKeyRotateModal } from './ApiKeyRotateModal';
import { apiService } from '../services/api';
import type { User } from '../types/auth';
import type { ApiKeyResponse, ApiKeyCreated } from '../types/apiKey';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    rotateApiKey: vi.fn(),
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
  AngryButton: ({ onClick, children, iconCss }: any) => (
    <button onClick={onClick} data-icon={iconCss}>
      {children}
    </button>
  ),
}));

describe('ApiKeyRotateModal', () => {
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

  const mockRotatedKey: ApiKeyCreated = {
    ...mockApiKey,
    id: 'key-1-rotated',
    apiKey: 'idp_user_newkeyabcdefghijklmnopqrstuvwxyz',
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the modal when open', () => {
    render(
      <ApiKeyRotateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText(/test key/i)).toBeInTheDocument();
  });

  it('displays grace period information', () => {
    render(
      <ApiKeyRotateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    expect(screen.getByText(/24-hour grace period/i)).toBeInTheDocument();
  });

  it('rotates the API key when confirmed', async () => {
    vi.mocked(apiService.rotateApiKey).mockResolvedValue(mockRotatedKey);
    const user = userEvent.setup();

    render(
      <ApiKeyRotateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const rotateButton = screen.getByTestId('modal-button-1');
    await user.click(rotateButton);

    await waitFor(() => {
      expect(apiService.rotateApiKey).toHaveBeenCalledWith(mockApiKey.id, mockUser.email);
      expect(mockOnSuccess).toHaveBeenCalledWith(mockRotatedKey);
    });
  });

  it('displays the new API key after rotation', async () => {
    vi.mocked(apiService.rotateApiKey).mockResolvedValue(mockRotatedKey);
    const user = userEvent.setup();

    render(
      <ApiKeyRotateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const rotateButton = screen.getByTestId('modal-button-1');
    await user.click(rotateButton);

    await waitFor(() => {
      expect(screen.getByText(mockRotatedKey.apiKey)).toBeInTheDocument();
    });
  });

  it('shows copy button for the new key', async () => {
    vi.mocked(apiService.rotateApiKey).mockResolvedValue(mockRotatedKey);
    const user = userEvent.setup();

    render(
      <ApiKeyRotateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const rotateButton = screen.getByTestId('modal-button-1');
    await user.click(rotateButton);

    await waitFor(() => {
      expect(screen.getByText(/copy to clipboard/i)).toBeInTheDocument();
    });
  });

  it('handles rotation errors', async () => {
    vi.mocked(apiService.rotateApiKey).mockRejectedValue(new Error('Rotation failed'));
    const user = userEvent.setup();

    render(
      <ApiKeyRotateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        apiKey={mockApiKey}
        user={mockUser}
      />
    );

    const rotateButton = screen.getByTestId('modal-button-1');
    await user.click(rotateButton);

    await waitFor(() => {
      expect(screen.getByText(/rotation failed/i)).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
