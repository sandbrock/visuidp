import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { StackList } from './StackList';
import type { User } from '../types/auth';
import type { Stack } from '../types/stack';
import { StackType, ProgrammingLanguage } from '../types/stack';
import { apiService } from '../services/api';
import type { Blueprint } from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getStacksByBlueprint: vi.fn(),
    getBlueprints: vi.fn(),
  },
}));

describe('StackList - Blueprint-Centric Tests', () => {
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
      blueprintId: 'blueprint-1',
      createdBy: 'test@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      resources: [],
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
      blueprintId: 'blueprint-1',
      createdBy: 'test@example.com',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
      resources: [],
    },
  ];

  const mockBlueprints: Blueprint[] = [
    {
      id: 'blueprint-1',
      name: 'Test Blueprint',
      description: 'A test blueprint',
      supportedCloudTypes: ['aws'],
      resources: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue(mockStacks);
    vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);
  });

  const renderStackList = (selectedBlueprintId: string | null = 'blueprint-1') => {
    return render(
      <StackList
        selectedBlueprintId={selectedBlueprintId}
        onStackSelect={mockOnStackSelect}
        onCreateNew={mockOnCreateNew}
        user={mockUser}
      />
    );
  };

  describe('Requirement 2.1: Filtered stack fetching', () => {
    it('should fetch stacks filtered by blueprint ID when blueprint is selected', async () => {
      renderStackList('blueprint-1');

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });
    });

    it('should not fetch stacks when no blueprint is selected', async () => {
      renderStackList(null);

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).not.toHaveBeenCalled();
      });
    });

    it('should refetch stacks when blueprint selection changes', async () => {
      const { rerender } = renderStackList('blueprint-1');

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      vi.clearAllMocks();

      rerender(
        <StackList
          selectedBlueprintId="blueprint-2"
          onStackSelect={mockOnStackSelect}
          onCreateNew={mockOnCreateNew}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-2', mockUser.email);
      });
    });

    it('should display fetched stacks for selected blueprint', async () => {
      renderStackList('blueprint-1');

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
        expect(screen.getByText('Stack 2')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 2.2 & 2.3: Empty state rendering', () => {
    it('should display "Select a blueprint" message when no blueprint is selected', async () => {
      renderStackList(null);

      await waitFor(() => {
        expect(screen.getByText('Select a blueprint to view stacks')).toBeInTheDocument();
        expect(screen.getByText('Choose a blueprint from the selector above to see its stacks.')).toBeInTheDocument();
      });
    });

    it('should display "No stacks in this blueprint" when blueprint has no stacks', async () => {
      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([]);

      renderStackList('blueprint-1');

      await waitFor(() => {
        expect(screen.getByText('No stacks in this blueprint')).toBeInTheDocument();
        expect(screen.getByText('Create your first stack to get started.')).toBeInTheDocument();
      });
    });

    it('should display "No blueprints available" when no blueprints exist', async () => {
      vi.mocked(apiService.getBlueprints).mockResolvedValue([]);

      renderStackList(null);

      await waitFor(() => {
        expect(screen.getByText('No blueprints available')).toBeInTheDocument();
        expect(screen.getByText('Create a blueprint in the Infrastructure page first.')).toBeInTheDocument();
      });
    });

    it('should show "Go to Infrastructure" button when no blueprints exist', async () => {
      vi.mocked(apiService.getBlueprints).mockResolvedValue([]);

      renderStackList(null);

      await waitFor(() => {
        const button = screen.getByText('Go to Infrastructure');
        expect(button).toBeInTheDocument();
      });
    });

    it('should show "Create Your First Stack" button when blueprint has no stacks', async () => {
      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([]);

      renderStackList('blueprint-1');

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /create.*stack/i });
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Requirement 3.1 & 8.1, 8.2: Create button conditional enabling', () => {
    it('should enable create button when blueprint is selected', async () => {
      renderStackList('blueprint-1');

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create.*new stack/i });
        expect(createButton).not.toBeDisabled();
      });
    });

    it('should disable create button when no blueprint is selected', async () => {
      renderStackList(null);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create new stack.*disabled/i });
        expect(createButton).toBeDisabled();
      });
    });

    it('should disable create button when no blueprints exist', async () => {
      vi.mocked(apiService.getBlueprints).mockResolvedValue([]);

      renderStackList(null);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create new stack.*disabled/i });
        expect(createButton).toBeDisabled();
      });
    });

    it('should call onCreateNew when create button is clicked with blueprint selected', async () => {
      const user = userEvent.setup();
      renderStackList('blueprint-1');

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      await act(async () => {
        await user.click(createButton);
      });

      expect(mockOnCreateNew).toHaveBeenCalled();
    });

    it('should have appropriate aria-label when button is disabled', async () => {
      renderStackList(null);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /disabled because no blueprint is selected/i });
        expect(createButton).toBeInTheDocument();
      });
    });
  });

  describe('Blueprint selection change handling', () => {
    it('should clear stacks when blueprint selection is cleared', async () => {
      const { rerender } = renderStackList('blueprint-1');

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      rerender(
        <StackList
          selectedBlueprintId={null}
          onStackSelect={mockOnStackSelect}
          onCreateNew={mockOnCreateNew}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Stack 1')).not.toBeInTheDocument();
        expect(screen.getByText('Select a blueprint to view stacks')).toBeInTheDocument();
      });
    });

    it('should update stacks when switching between blueprints', async () => {
      const blueprint2Stacks: Stack[] = [
        {
          id: '3',
          name: 'Stack 3',
          cloudName: 'stack-3',
          routePath: '/stack-3/',
          description: 'Third test stack',
          stackType: StackType.INFRASTRUCTURE,
          isPublic: false,
          blueprintId: 'blueprint-2',
          createdBy: 'test@example.com',
          createdAt: '2024-01-05T00:00:00Z',
          updatedAt: '2024-01-06T00:00:00Z',
          resources: [],
        },
      ];

      const { rerender } = renderStackList('blueprint-1');

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue(blueprint2Stacks);

      rerender(
        <StackList
          selectedBlueprintId="blueprint-2"
          onStackSelect={mockOnStackSelect}
          onCreateNew={mockOnCreateNew}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Stack 1')).not.toBeInTheDocument();
        expect(screen.getByText('Stack 3')).toBeInTheDocument();
      });
    });
  });

  describe('Stack list functionality', () => {
    it('should handle stack selection', async () => {
      const user = userEvent.setup();
      renderStackList('blueprint-1');

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

    it('should handle keyboard navigation for stack selection', async () => {
      const user = userEvent.setup();
      renderStackList('blueprint-1');

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      const stackCard = screen.getByText('Stack 1').closest('.stack-card');
      expect(stackCard).toBeInTheDocument();

      (stackCard as HTMLElement).focus();
      await act(async () => {
        await user.keyboard('{Enter}');
      });

      expect(mockOnStackSelect).toHaveBeenCalledWith(mockStacks[0]);
    });

    it('should display stack metadata correctly', async () => {
      renderStackList('blueprint-1');

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
        expect(screen.getByText('First test stack')).toBeInTheDocument();
        expect(screen.getByText(/RESTful API/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Updated:/i).length).toBeGreaterThan(0);
      });
    });

    it('should display "No description provided" for stacks without description', async () => {
      const stacksWithoutDescription: Stack[] = [
        {
          ...mockStacks[0],
          description: undefined,
        },
      ];

      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue(stacksWithoutDescription);

      renderStackList('blueprint-1');

      await waitFor(() => {
        expect(screen.getByText('No description provided')).toBeInTheDocument();
      });
    });
  });

  describe('Loading and error states', () => {
    it('should display loading state while fetching stacks', () => {
      vi.mocked(apiService.getStacksByBlueprint).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockStacks), 100))
      );

      renderStackList('blueprint-1');

      expect(screen.getByText(/loading stacks/i)).toBeInTheDocument();
    });

    it('should handle error state when fetching stacks fails', async () => {
      vi.mocked(apiService.getStacksByBlueprint).mockRejectedValue(new Error('Failed to fetch'));

      renderStackList('blueprint-1');

      await waitFor(() => {
        expect(screen.getByText(/unable to load stacks/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(apiService.getStacksByBlueprint).mockRejectedValue(new Error('Failed to fetch'));

      renderStackList('blueprint-1');

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should show generic error message when fetching fails', async () => {
      vi.mocked(apiService.getStacksByBlueprint).mockRejectedValue(new Error('Failed to fetch'));

      renderStackList('blueprint-1');

      await waitFor(() => {
        // The error message will vary based on environment mode
        // In tests, it should show a generic error message
        const errorText = screen.getByText(/failed to load stacks|backend api not available/i);
        expect(errorText).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for stack list region', async () => {
      renderStackList('blueprint-1');

      await waitFor(() => {
        const region = screen.getByRole('region', { name: /stack list/i });
        expect(region).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels for empty states', async () => {
      renderStackList(null);

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels for stack cards', async () => {
      renderStackList('blueprint-1');

      await waitFor(() => {
        const stackCard = screen.getByRole('listitem', { name: /stack: stack 1/i });
        expect(stackCard).toBeInTheDocument();
      });
    });

    it('should have proper aria-disabled attribute on disabled button', async () => {
      renderStackList(null);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create new stack.*disabled/i });
        expect(createButton).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should have proper aria-live for error messages', async () => {
      vi.mocked(apiService.getStacksByBlueprint).mockRejectedValue(new Error('Failed to fetch'));

      renderStackList('blueprint-1');

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });

  describe('Stack card structure', () => {
    it('should render stack cards with correct structure', async () => {
      const { container } = renderStackList('blueprint-1');

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      const stackCards = container.querySelectorAll('.stack-card');
      expect(stackCards.length).toBe(2);

      stackCards.forEach((card) => {
        expect(card.querySelector('.stack-card-header')).toBeInTheDocument();
        expect(card.querySelector('.stack-description')).toBeInTheDocument();
        expect(card.querySelector('.stack-meta')).toBeInTheDocument();
        expect(card.querySelector('.stack-type')).toBeInTheDocument();
        expect(card.querySelector('.stack-updated')).toBeInTheDocument();
      });
    });

    it('should make stack cards keyboard accessible', async () => {
      renderStackList('blueprint-1');

      await waitFor(() => {
        expect(screen.getByText('Stack 1')).toBeInTheDocument();
      });

      const stackCard = screen.getByText('Stack 1').closest('.stack-card');
      expect(stackCard).toHaveAttribute('tabIndex', '0');
      expect(stackCard).toHaveAttribute('role', 'listitem');
    });
  });
});
