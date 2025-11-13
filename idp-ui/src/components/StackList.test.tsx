import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { StackList } from './StackList';
import type { User } from '../types/auth';
import type { Stack } from '../types/stack';
import { StackType, ProgrammingLanguage } from '../types/stack';
import { apiService } from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getStacks: vi.fn(),
    getCollections: vi.fn(),
    getCollectionStacks: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('StackList - Removed Columns Tests', () => {
  const mockUser: User = {
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  };

  const mockOnStackSelect = vi.fn();
  const mockOnCreateNew = vi.fn();

  const mockStacks: Stack[] = [
    {
      id: '1',
      name: 'Stack 1',
      cloudName: 'stack-1',
      routePath: '/stack-1/',
      description: 'First test stack',
      stackType: StackType.RESTFUL_API,
      programmingLanguage: ProgrammingLanguage.QUARKUS,
      isPublic: false,
      createdBy: 'test@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: '2',
      name: 'Stack 2',
      cloudName: 'stack-2',
      routePath: '/stack-2/',
      description: 'Second test stack',
      stackType: StackType.JAVASCRIPT_WEB_APPLICATION,
      programmingLanguage: ProgrammingLanguage.REACT,
      isPublic: true,
      createdBy: 'test@example.com',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    (apiService.getStacks as any).mockResolvedValue(mockStacks);
    (apiService.getCollections as any).mockResolvedValue([]);
  });

  const renderStackList = () => {
    return render(
      <StackList
        onStackSelect={mockOnStackSelect}
        onCreateNew={mockOnCreateNew}
        user={mockUser}
      />
    );
  };

  describe('Requirement 6.1: Removed columns are not shown', () => {
    it('should not display Domain column header', async () => {
      renderStackList();

      await waitFor(() => {
        expect(screen.queryByText(/^Domain$/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: /domain/i })).not.toBeInTheDocument();
      });
    });

    it('should not display Category column header', async () => {
      renderStackList();

      await waitFor(() => {
        expect(screen.queryByText(/^Category$/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: /category/i })).not.toBeInTheDocument();
      });
    });

    it('should not display Cloud Provider column header', async () => {
      renderStackList();

      await waitFor(() => {
        expect(screen.queryByText(/^Cloud Provider$/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: /cloud provider/i })).not.toBeInTheDocument();
      });
    });

    it('should not display domain data in stack cards', async () => {
      renderStackList();

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      // Check that domain information is not displayed
      const stackCards = screen.getAllByText(/Stack \d/);
      expect(stackCards.length).toBeGreaterThan(0);

      // Verify no domain-related text is present
      expect(screen.queryByText(/domain:/i)).not.toBeInTheDocument();
    });

    it('should not display category data in stack cards', async () => {
      renderStackList();

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      // Verify no category-related text is present
      expect(screen.queryByText(/category:/i)).not.toBeInTheDocument();
    });

    it('should not display cloud provider data in stack cards', async () => {
      renderStackList();

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      // Verify no cloud provider-related text is present in the cards
      // Note: "Cloud Name" is different from "Cloud Provider" and should not be checked here
      expect(screen.queryByText(/cloud provider:/i)).not.toBeInTheDocument();
    });
  });

  describe('Requirement 6.2: Only expected columns are displayed', () => {
    it('should display stack name', async () => {
      renderStackList();

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
        expect(screen.getByText('Stack 2')).toBeInTheDocument();
      });
    });

    it('should display stack type', async () => {
      renderStackList();

      await waitFor(() => {
        expect(screen.getByText(/RESTful API/i)).toBeInTheDocument();
        expect(screen.getByText(/JavaScript Web Application/i)).toBeInTheDocument();
      });
    });

    it('should display updated date', async () => {
      renderStackList();

      await waitFor(() => {
        // Check that some date information is displayed
        const stackCards = screen.getAllByText(/Updated:/i);
        expect(stackCards.length).toBeGreaterThan(0);
      });
    });

    it('should display description', async () => {
      renderStackList();

      await waitFor(() => {
        expect(screen.getByText('First test stack')).toBeInTheDocument();
        expect(screen.getByText('Second test stack')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 6.3: Stack list functionality remains intact', () => {
    it('should load and display stacks', async () => {
      renderStackList();

      await waitFor(() => {
        expect(apiService.getStacks).toHaveBeenCalledWith(mockUser.email);
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
        expect(screen.getByText('Stack 2')).toBeInTheDocument();
      });
    });

    it('should handle stack selection', async () => {
      const user = userEvent.setup();
      renderStackList();

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      const stackCard = screen.getByText('Stack 1').closest('.stack-card');
      expect(stackCard).toBeInTheDocument();

      await act(async () => {
        await user.click(stackCard!);
      });

      expect(mockOnStackSelect).toHaveBeenCalledWith(mockStacks[0]);
    });

    it('should handle create new stack button', async () => {
      const user = userEvent.setup();
      renderStackList();

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create new stack/i });
      await act(async () => {
        await user.click(createButton);
      });

      expect(mockOnCreateNew).toHaveBeenCalled();
    });

    it('should display empty state when no stacks exist', async () => {
      (apiService.getStacks as any).mockResolvedValue([]);

      renderStackList();

      await waitFor(() => {
        expect(screen.getByText(/no stacks yet/i)).toBeInTheDocument();
      });
    });

    it('should handle loading state', () => {
      (apiService.getStacks as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockStacks), 100))
      );

      renderStackList();

      expect(screen.getByText(/loading stacks/i)).toBeInTheDocument();
    });

    it('should handle error state', async () => {
      (apiService.getStacks as any).mockRejectedValue(new Error('Failed to fetch'));

      renderStackList();

      await waitFor(() => {
        expect(screen.getByText(/unable to load stacks/i)).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 6.5: Tab functionality works correctly', () => {
    it('should switch between All and Collection tabs', async () => {
      const user = userEvent.setup();
      renderStackList();

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      // Find and click the "By Collection" tab
      const collectionTab = screen.getByText(/by collection/i);
      await act(async () => {
        await user.click(collectionTab);
      });

      await waitFor(() => {
        expect(apiService.getCollections).toHaveBeenCalled();
      });
    });

    it('should persist tab selection in localStorage', async () => {
      const user = userEvent.setup();
      renderStackList();

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      // Switch to collection tab
      const collectionTab = screen.getByText(/by collection/i);
      await act(async () => {
        await user.click(collectionTab);
      });

      await waitFor(() => {
        expect(localStorageMock.getItem('stackListTab')).toBe('collection');
      });
    });
  });

  describe('Stack card structure verification', () => {
    it('should render stack cards with correct structure', async () => {
      const { container } = renderStackList();

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      const stackCards = container.querySelectorAll('.stack-card');
      expect(stackCards.length).toBe(2);

      // Verify each card has expected elements
      stackCards.forEach((card) => {
        expect(card.querySelector('.stack-card-header')).toBeInTheDocument();
        expect(card.querySelector('.stack-description')).toBeInTheDocument();
        expect(card.querySelector('.stack-meta')).toBeInTheDocument();
        expect(card.querySelector('.stack-type')).toBeInTheDocument();
        expect(card.querySelector('.stack-updated')).toBeInTheDocument();
      });
    });

    it('should not have domain, category, or cloud provider elements in cards', async () => {
      const { container } = renderStackList();

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      const stackCards = container.querySelectorAll('.stack-card');

      stackCards.forEach((card) => {
        // Verify removed fields are not present
        expect(card.textContent).not.toMatch(/domain:/i);
        expect(card.textContent).not.toMatch(/category:/i);
        expect(card.textContent).not.toMatch(/cloud provider:/i);
      });
    });
  });
});
