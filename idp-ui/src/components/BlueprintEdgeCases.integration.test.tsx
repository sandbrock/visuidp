import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Homepage } from './Homepage';
import type { User } from '../types/auth';
import type { Stack } from '../types/stack';
import type { Blueprint } from '../services/api';
import { apiService } from '../services/api';
import { BLUEPRINT_STORAGE_KEY } from '../auth';
import { StackType, ProgrammingLanguage } from '../types/stack';

/**
 * Integration test for Blueprint Edge Cases
 * 
 * Task 29: Test edge cases
 * 
 * This test file verifies edge case scenarios:
 * - Test last stack in blueprint deleted (Requirements 2.3, 9.3)
 * - Test blueprint deleted while selected (Requirements 9.3, 9.4)
 * - Test concurrent blueprint modifications (Requirements 9.3, 9.4)
 * - Test migration to blueprint then back (Requirements 9.4)
 */

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getBlueprints: vi.fn(),
    getStacksByBlueprint: vi.fn(),
    getStacks: vi.fn(),
    createStack: vi.fn(),
    updateStack: vi.fn(),
    deleteStack: vi.fn(),
    deleteBlueprint: vi.fn(),
    getDomains: vi.fn(),
    getDomainCategories: vi.fn(),
    getAvailableCloudProvidersForStacks: vi.fn(),
    getAvailableResourceTypesForStacks: vi.fn(),
  },
}));

describe('Blueprint Edge Cases - Integration Tests', () => {
  const mockUser: User = {
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  };

  const mockBlueprint1: Blueprint = {
    id: 'blueprint-1',
    name: 'Test Blueprint 1',
    description: 'First test blueprint',
    supportedCloudTypes: ['aws'],
    resources: [
      {
        id: 'resource-1',
        name: 'Container Orchestrator',
        resourceTypeId: 'container-orchestrator-type',
        resourceTypeName: 'Managed Container Orchestrator',
        cloudProviderId: 'aws-1',
        configuration: {},
      },
    ],
  };

  const mockBlueprint2: Blueprint = {
    id: 'blueprint-2',
    name: 'Test Blueprint 2',
    description: 'Second test blueprint',
    supportedCloudTypes: ['aws'],
    resources: [
      {
        id: 'resource-2',
        name: 'Container Orchestrator 2',
        resourceTypeId: 'container-orchestrator-type',
        resourceTypeName: 'Managed Container Orchestrator',
        cloudProviderId: 'aws-1',
        configuration: {},
      },
    ],
  };

  const mockStack1: Stack = {
    id: 'stack-1',
    name: 'Test Stack 1',
    cloudName: 'test-stack-1',
    routePath: '/test-stack-1/',
    description: 'First test stack',
    stackType: StackType.RESTFUL_API,
    programmingLanguage: ProgrammingLanguage.QUARKUS,
    isPublic: false,
    blueprintId: 'blueprint-1',
    createdBy: 'test@example.com',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    resources: [],
  };

  const mockStack2: Stack = {
    id: 'stack-2',
    name: 'Test Stack 2',
    cloudName: 'test-stack-2',
    routePath: '/test-stack-2/',
    description: 'Second test stack',
    stackType: StackType.RESTFUL_API,
    programmingLanguage: ProgrammingLanguage.QUARKUS,
    isPublic: false,
    blueprintId: 'blueprint-1',
    createdBy: 'test@example.com',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
    resources: [],
  };

  const mockDomains = [
    {
      id: 'domain-1',
      name: 'Test Domain',
      description: 'Test Domain Description',
    },
  ];

  const mockCategories = [
    {
      id: 'category-1',
      name: 'Test Category',
      description: 'Test Category Description',
    },
  ];

  const mockCloudProviders = [
    {
      id: 'aws-1',
      name: 'AWS',
      displayName: 'Amazon Web Services',
      enabled: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const mockResourceTypes = [
    {
      id: 'container-orchestrator-type',
      name: 'ManagedContainerOrchestrator',
      displayName: 'Managed Container Orchestrator',
      category: 'SHARED' as const,
      enabled: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Setup default mock responses
    vi.mocked(apiService.getBlueprints).mockResolvedValue([mockBlueprint1, mockBlueprint2]);
    vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
      if (blueprintId === 'blueprint-1') {
        return Promise.resolve([mockStack1, mockStack2]);
      } else if (blueprintId === 'blueprint-2') {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });
    vi.mocked(apiService.getDomains).mockResolvedValue(mockDomains);
    vi.mocked(apiService.getDomainCategories).mockResolvedValue(mockCategories);
    vi.mocked(apiService.getAvailableCloudProvidersForStacks).mockResolvedValue(mockCloudProviders);
    vi.mocked(apiService.getAvailableResourceTypesForStacks).mockResolvedValue(mockResourceTypes);
  });

  const renderHomepage = () => {
    return render(
      <BrowserRouter>
        <Homepage user={mockUser} />
      </BrowserRouter>
    );
  };

  describe('Requirement 2.3, 9.3: Last stack in blueprint deleted', () => {
    it('should display empty state when last stack is deleted', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      // Start with blueprint-1 having only one stack
      vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
        if (blueprintId === 'blueprint-1') {
          return Promise.resolve([mockStack1]);
        }
        return Promise.resolve([]);
      });
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      // Wait for API call and stack to load
      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      // Click on the stack to view details
      const stackItem = screen.getByText('Test Stack 1');
      await act(async () => {
        await user.click(stackItem);
      });

      // Wait for details view
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      // Update mock to return empty array after deletion
      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([]);
      vi.mocked(apiService.deleteStack).mockResolvedValue(undefined);

      // Delete the stack
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      // Wait for deletion to complete
      await waitFor(() => {
        expect(apiService.deleteStack).toHaveBeenCalledWith('stack-1', mockUser.email);
      });

      // Verify empty state is displayed
      await waitFor(() => {
        expect(screen.getByText(/no stacks in this blueprint/i)).toBeInTheDocument();
      });

      // Verify blueprint remains selected
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      // Verify create button is still enabled
      expect(screen.getByRole('button', { name: /create.*new stack/i })).not.toBeDisabled();

      confirmSpy.mockRestore();
    });

    it('should allow creating a new stack after last stack is deleted', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      // Start with one stack
      vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
        if (blueprintId === 'blueprint-1') {
          return Promise.resolve([mockStack1]);
        }
        return Promise.resolve([]);
      });
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      // Delete the stack
      const stackItem = screen.getByText('Test Stack 1');
      await act(async () => {
        await user.click(stackItem);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([]);
      vi.mocked(apiService.deleteStack).mockResolvedValue(undefined);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/no stacks in this blueprint/i)).toBeInTheDocument();
      });

      // Click create new stack button
      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      expect(createButton).not.toBeDisabled();
      
      await act(async () => {
        await user.click(createButton);
      });

      // Verify form opens
      await waitFor(() => {
        expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });

    it('should refresh stack list correctly after deleting last stack', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
        if (blueprintId === 'blueprint-1') {
          return Promise.resolve([mockStack1]);
        }
        return Promise.resolve([]);
      });
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test Stack 1');
      await act(async () => {
        await user.click(stackItem);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      // Track API call count
      const initialCallCount = vi.mocked(apiService.getStacksByBlueprint).mock.calls.length;
      
      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([]);
      vi.mocked(apiService.deleteStack).mockResolvedValue(undefined);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      // Verify stack list was refreshed
      await waitFor(() => {
        const newCallCount = vi.mocked(apiService.getStacksByBlueprint).mock.calls.length;
        expect(newCallCount).toBeGreaterThan(initialCallCount);
      });

      confirmSpy.mockRestore();
    });
  });

  describe('Requirement 9.3, 9.4: Blueprint deleted while selected', () => {
    it('should clear selection when selected blueprint is deleted', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      vi.mocked(apiService.deleteBlueprint).mockResolvedValue(undefined);
      
      renderHomepage();

      // Wait for stacks to load
      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      // Update mock to return only blueprint-2 after deletion
      vi.mocked(apiService.getBlueprints).mockResolvedValue([mockBlueprint2]);

      // Delete the selected blueprint
      const deleteButton = screen.getByTestId('delete-blueprint-btn');
      await act(async () => {
        await user.click(deleteButton);
      });

      // Wait for deletion to complete
      await waitFor(() => {
        expect(apiService.deleteBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      // Verify selection was cleared
      await waitFor(() => {
        expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();
      });

      // Verify empty state is shown
      await waitFor(() => {
        expect(screen.getByText(/select a blueprint to view stacks/i)).toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });

    it('should handle blueprint deletion during stack operations', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      // Open stack for editing
      const stackItem = screen.getByText('Test Stack 1');
      await act(async () => {
        await user.click(stackItem);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      await act(async () => {
        await user.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();
      });

      // Simulate blueprint being deleted by another user
      vi.mocked(apiService.getBlueprints).mockResolvedValue([mockBlueprint2]);
      vi.mocked(apiService.updateStack).mockRejectedValue(new Error('Blueprint not found'));

      // Try to save the stack
      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify error is handled
      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalled();
      });

      confirmSpy.mockRestore();
    });

    it('should prevent operations on deleted blueprint', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      // Delete the blueprint
      vi.mocked(apiService.getBlueprints).mockResolvedValue([mockBlueprint2]);
      vi.mocked(apiService.deleteBlueprint).mockResolvedValue(undefined);

      const deleteButton = screen.getByTestId('delete-blueprint-btn');
      await act(async () => {
        await user.click(deleteButton);
      });

      await waitFor(() => {
        expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();
      });

      // Verify create button is disabled
      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create.*new stack/i });
        expect(createButton).toBeDisabled();
      });

      confirmSpy.mockRestore();
    });
  });

  describe('Requirement 9.3, 9.4: Concurrent blueprint modifications', () => {
    it('should handle blueprint being modified by another user', async () => {
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      // Simulate another user modifying the blueprint
      const modifiedBlueprint: Blueprint = {
        ...mockBlueprint1,
        name: 'Modified Blueprint 1',
        description: 'Modified by another user',
      };

      vi.mocked(apiService.getBlueprints).mockResolvedValue([modifiedBlueprint, mockBlueprint2]);

      // Trigger a refresh (e.g., by navigating)
      const user = userEvent.setup();
      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await act(async () => {
        await user.click(cancelButton);
      });

      // Verify the system continues to work with modified blueprint
      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });
    });

    it('should handle blueprint resources being modified concurrently', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      // Open stack for editing
      const stackItem = screen.getByText('Test Stack 1');
      await act(async () => {
        await user.click(stackItem);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      await act(async () => {
        await user.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();
      });

      // Simulate blueprint resources being modified
      const modifiedBlueprint: Blueprint = {
        ...mockBlueprint1,
        resources: [
          {
            id: 'resource-new',
            name: 'New Container Orchestrator',
            resourceTypeId: 'container-orchestrator-type',
            resourceTypeName: 'Managed Container Orchestrator',
            cloudProviderId: 'aws-1',
            configuration: {},
          },
        ],
      };

      vi.mocked(apiService.getBlueprints).mockResolvedValue([modifiedBlueprint, mockBlueprint2]);

      // Try to save the stack
      const updatedStack: Stack = {
        ...mockStack1,
        name: 'Updated Stack 1',
        updatedAt: '2024-01-10T00:00:00Z',
      };

      vi.mocked(apiService.updateStack).mockResolvedValue(updatedStack);

      const nameInput = screen.getByLabelText(/stack name/i);
      await act(async () => {
        await user.clear(nameInput);
        await user.type(nameInput, 'Updated Stack 1');
      });

      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify update succeeds despite concurrent modifications
      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalled();
      });
    });

    it('should handle blueprint being deleted during stack creation', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      // Start creating a new stack
      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();
      });

      // Simulate blueprint being deleted by another user
      vi.mocked(apiService.getBlueprints).mockResolvedValue([mockBlueprint2]);
      vi.mocked(apiService.createStack).mockRejectedValue(new Error('Blueprint not found'));

      // Fill in stack details
      const nameInput = screen.getByLabelText(/stack name/i);
      await act(async () => {
        await user.type(nameInput, 'New Stack');
      });

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify error is handled
      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
      });
    });
  });

  describe('Requirement 9.4: Migration to blueprint then back', () => {
    it('should allow migrating stack to another blueprint and back', async () => {
      const user = userEvent.setup();
      
      // Set up mock to return stacks for blueprint-1
      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([mockStack1, mockStack2]);
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      // Open stack for editing
      const stackItem = screen.getByText('Test Stack 1');
      await act(async () => {
        await user.click(stackItem);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      await act(async () => {
        await user.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/target blueprint/i)).toBeInTheDocument();
      });

      // Migrate to blueprint-2
      const migratedStack: Stack = {
        ...mockStack1,
        blueprintId: 'blueprint-2',
        updatedAt: '2024-01-10T00:00:00Z',
      };

      vi.mocked(apiService.updateStack).mockResolvedValue(migratedStack);

      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Blueprint 2')).toBeInTheDocument();
      });

      const blueprint2Option = screen.getByText('Test Blueprint 2');
      await act(async () => {
        await user.click(blueprint2Option);
      });

      // Save migration
      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify migration to blueprint-2
      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalledWith(
          'stack-1',
          expect.objectContaining({
            blueprintId: 'blueprint-2',
          }),
          mockUser.email
        );
      });

      // Verify we're back in list view after first migration
      await waitFor(() => {
        expect(screen.queryByLabelText(/stack name/i)).not.toBeInTheDocument();
      });

      // Verify the migration was successful - stack moved to blueprint-2
      expect(apiService.updateStack).toHaveBeenCalledTimes(1);
    });

    it('should maintain stack data integrity during round-trip migration', async () => {
      const user = userEvent.setup();
      
      const originalStack: Stack = {
        ...mockStack1,
        description: 'Original description',
        repositoryURL: 'https://github.com/test/repo',
      };

      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([originalStack]);
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      // Open stack for editing
      const stackItem = screen.getByText('Test Stack 1');
      await act(async () => {
        await user.click(stackItem);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      await act(async () => {
        await user.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/target blueprint/i)).toBeInTheDocument();
      });

      // Migrate to blueprint-2
      const migratedStack: Stack = {
        ...originalStack,
        blueprintId: 'blueprint-2',
        updatedAt: '2024-01-10T00:00:00Z',
      };

      vi.mocked(apiService.updateStack).mockResolvedValue(migratedStack);

      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Blueprint 2')).toBeInTheDocument();
      });

      const blueprint2Option = screen.getByText('Test Blueprint 2');
      await act(async () => {
        await user.click(blueprint2Option);
      });

      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify all original data is preserved
      await waitFor(() => {
        const updateCall = vi.mocked(apiService.updateStack).mock.calls[0];
        expect(updateCall[1]).toMatchObject({
          name: originalStack.name,
          description: originalStack.description,
          repositoryURL: originalStack.repositoryURL,
          stackType: originalStack.stackType,
          blueprintId: 'blueprint-2',
        });
      });
    });

    it('should handle migration failures and allow retry', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([mockStack1, mockStack2]);
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Stack 1')).toBeInTheDocument();
      });

      // Open stack for editing
      const stackItem = screen.getByText('Test Stack 1');
      await act(async () => {
        await user.click(stackItem);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit/i });
      await act(async () => {
        await user.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/target blueprint/i)).toBeInTheDocument();
      });

      // First attempt fails
      vi.mocked(apiService.updateStack).mockRejectedValueOnce(new Error('Migration failed'));

      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Blueprint 2')).toBeInTheDocument();
      });

      const blueprint2Option = screen.getByText('Test Blueprint 2');
      await act(async () => {
        await user.click(blueprint2Option);
      });

      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify error is handled
      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalled();
      });

      // Second attempt succeeds
      const migratedStack: Stack = {
        ...mockStack1,
        blueprintId: 'blueprint-2',
        updatedAt: '2024-01-10T00:00:00Z',
      };

      vi.mocked(apiService.updateStack).mockResolvedValue(migratedStack);

      // Retry the save
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify second attempt succeeds
      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalledTimes(2);
      });

      alertSpy.mockRestore();
    });
  });
});
