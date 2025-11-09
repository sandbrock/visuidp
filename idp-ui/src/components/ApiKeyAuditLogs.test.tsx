import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ApiKeyAuditLogs } from './ApiKeyAuditLogs';
import { apiService } from '../services/api';
import type { User } from '../types/auth';
import type { ApiKeyAuditLog } from '../types/apiKey';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getApiKeyAuditLogs: vi.fn(),
  },
}));

// Mock the Breadcrumb component
vi.mock('./Breadcrumb', () => ({
  Breadcrumb: () => <div data-testid="breadcrumb">Breadcrumb</div>,
}));

// Mock input components
vi.mock('./input', () => ({
  AngryButton: ({ onClick, children, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  AngryTextBox: ({ value, onChange, placeholder, id }: any) => (
    <input
      data-testid={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
  AngryDatePicker: ({ value, onChange, placeholder, id }: any) => (
    <input
      data-testid={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

describe('ApiKeyAuditLogs', () => {
  const mockUser: User = {
    email: 'admin@example.com',
    name: 'Admin User',
    roles: ['admin'],
  };

  const mockAuditLogs: ApiKeyAuditLog[] = [
    {
      id: 'log-1',
      userEmail: 'user1@example.com',
      action: 'API_KEY_CREATED',
      timestamp: '2024-01-01T10:00:00Z',
      keyPrefix: 'idp_user_abc',
      sourceIp: '192.168.1.1',
    },
    {
      id: 'log-2',
      userEmail: 'user2@example.com',
      action: 'API_KEY_ROTATED',
      timestamp: '2024-01-02T11:00:00Z',
      keyPrefix: 'idp_user_def',
      sourceIp: '192.168.1.2',
    },
    {
      id: 'log-3',
      userEmail: 'user1@example.com',
      action: 'API_KEY_REVOKED',
      timestamp: '2024-01-03T12:00:00Z',
      keyPrefix: 'idp_user_abc',
      sourceIp: '192.168.1.1',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.getApiKeyAuditLogs).mockImplementation(() => new Promise(() => {}));
    render(<ApiKeyAuditLogs user={mockUser} />);
    expect(screen.getByText(/loading audit logs/i)).toBeInTheDocument();
  });

  it('displays audit logs after loading', async () => {
    vi.mocked(apiService.getApiKeyAuditLogs).mockResolvedValue(mockAuditLogs);
    render(<ApiKeyAuditLogs user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('user1@example.com').length).toBe(2);
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      expect(screen.getByText('API_KEY_CREATED')).toBeInTheDocument();
      expect(screen.getByText('API_KEY_ROTATED')).toBeInTheDocument();
      expect(screen.getByText('API_KEY_REVOKED')).toBeInTheDocument();
    });
  });

  it('displays empty state when no logs exist', async () => {
    vi.mocked(apiService.getApiKeyAuditLogs).mockResolvedValue([]);
    render(<ApiKeyAuditLogs user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText(/no audit logs found/i)).toBeInTheDocument();
    });
  });

  it('filters logs by user email', async () => {
    vi.mocked(apiService.getApiKeyAuditLogs).mockResolvedValue(mockAuditLogs);
    const user = userEvent.setup();
    render(<ApiKeyAuditLogs user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('user1@example.com').length).toBeGreaterThan(0);
    });

    const emailFilter = screen.getByTestId('filter-user-email');
    await user.type(emailFilter, 'user1');

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Header row + 2 matching rows (user1 appears twice)
      expect(rows.length).toBe(3);
    });
  });

  it('filters logs by event type', async () => {
    vi.mocked(apiService.getApiKeyAuditLogs).mockResolvedValue(mockAuditLogs);
    const user = userEvent.setup();
    render(<ApiKeyAuditLogs user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('API_KEY_CREATED')).toBeInTheDocument();
    });

    const eventTypeFilter = screen.getByTestId('filter-event-type');
    await user.type(eventTypeFilter, 'CREATED');

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Header row + 1 matching row
      expect(rows.length).toBe(2);
    });
  });

  it('clears filters when clear button is clicked', async () => {
    vi.mocked(apiService.getApiKeyAuditLogs).mockResolvedValue(mockAuditLogs);
    const user = userEvent.setup();
    render(<ApiKeyAuditLogs user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('user1@example.com').length).toBeGreaterThan(0);
    });

    const emailFilter = screen.getByTestId('filter-user-email');
    await user.type(emailFilter, 'user1');

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(3); // Filtered
    });

    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    await user.click(clearButton);

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(4); // All logs + header
    });
  });

  it('displays pagination when there are many logs', async () => {
    const manyLogs = Array.from({ length: 30 }, (_, i) => ({
      id: `log-${i}`,
      userEmail: `user${i}@example.com`,
      action: 'API_KEY_CREATED',
      timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      keyPrefix: `idp_user_${i}`,
      sourceIp: '192.168.1.1',
    }));

    vi.mocked(apiService.getApiKeyAuditLogs).mockResolvedValue(manyLogs);
    render(<ApiKeyAuditLogs user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText(/first/i)).toBeInTheDocument();
      expect(screen.getByText(/next/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(apiService.getApiKeyAuditLogs).mockRejectedValue(new Error('Failed to load logs'));
    render(<ApiKeyAuditLogs user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load logs/i)).toBeInTheDocument();
    });
  });

  it('filters logs by date range', async () => {
    vi.mocked(apiService.getApiKeyAuditLogs).mockResolvedValue(mockAuditLogs);
    const user = userEvent.setup();
    render(<ApiKeyAuditLogs user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText('user1@example.com').length).toBeGreaterThan(0);
    });

    const startDateFilter = screen.getByTestId('filter-start-date');
    const endDateFilter = screen.getByTestId('filter-end-date');
    
    await user.type(startDateFilter, '2024-01-02');
    await user.type(endDateFilter, '2024-01-02');

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Header row + 1 matching row (only log-2 is on 2024-01-02)
      expect(rows.length).toBe(2);
    });
  });
});
