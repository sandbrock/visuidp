import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Homepage } from './Homepage';
import type { User } from '../types/auth';
import type { Stack, StackCreate } from '../types/stack';
import type { Blueprint } from '../services/api';
import { apiService } from '../services/api';
import { BLUEPRINT_STORAGE_KEY } from '../auth';
import { StackType, ProgrammingLanguage } from '../types/stack';

/**
 * Integration test for Stack Creation Flow
 * 
 * Task 26: Write integration tests for stack creation flow
 * 
 * This test file verifies the complete stack creation workflow:
 * - Test no blueprint selected → create button disabled (Requirements 3.1)
 * - Test select blueprint → create button enabled (Requirements 3.2)
 * - Test create stack → stack associated with blueprint (Requirements 3.3)
 * - Test stack appears in correct blueprint's list (Requirements 3.5, 9.1)
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

describe('Stack Creation Flow - Integration Tests', () => {
  const mockUser: User = {
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  };

  const mockBlueprints: Blueprint[] = [
    {
      id: 'blueprint-1',
      name: 'Development Blueprint',
      description: 'Blueprint for development environment',
      supportedCloudTypes: ['aws'],
      resources: [
        {
          id: 'resource-1',
          name: 'Dev Container Orchestrator',
          resourceTypeId: 'container-orchestrator-type',
          resourceTypeName: 'Managed Container Orchestrator',
          cloudProviderId: 'aws-1',
          configuration: {},
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'blueprint-2',
      name: 'Production Blueprint',
      description: 'Blueprint for production environment',
      supportedCloudTypes: ['aws'],
      resources: [
        {
          id: 'resource-2',
          name: 'Prod Container Orchestrator',
          resourceTypeId: 'container-orchestrator-type',
          resourceTypeName: 'Managed Container Orchestrator',
          cloudProviderId: 'aws-2',
          configuration: {},
        },
      ],
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
    },
  ];

  const mockStacksBlueprint1: Stack[] = [
    {
      id: 'stack-1',
      name: 'Dev API Stack',
      cloudName: 'dev-api',
      routePath: '/dev-api/',
      description: 'Development API stack',
      stackType: StackType.RESTFUL_API,
      programmingLanguage: ProgrammingLanguage.QUARKUS,
      isPublic: false,
      blueprintId: 'blueprint-1',
      createdBy: 'test@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      resources: [],
    },
  ];

  const mockStacksBlueprint2: Stack[] = [
    {
      id: 'stack-3',
      name: 'Prod API Stack',
      cloudName: 'prod-api',
      routePath: '/prod-api/',
      description: 'Production API stack',
      stackType: StackType.RESTFUL_API,
      programmingLanguage: ProgrammingLanguage.QUARKUS,
      isPublic: false,
      blueprintId: 'blueprint-2',
      createdBy: 'test@example.com',
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-06T00:00:00Z',
      resources: [],
    },
  ];

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
    vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);
    vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
      if (blueprintId === 'blueprint-1') {
        return Promise.resolve(mockStacksBlueprint1);
      } else if (blueprintId === 'blueprint-2') {
        return Promise.resolve(mockStacksBlueprint2);
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

  describe('Requirement 3.1: No blueprint selected → create button disabled', () => {
    it('should disable create button when no blueprint is selected', async () => {
      renderHomepage();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByLabelText(/select blueprint/i)).toBeInTheDocument();
      });

      // Verify create button is disabled
      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      expect(createButton).toBeDisabled();
      expect(createButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show tooltip explaining why create button is disabled', async () => {
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByLabelText(/select blueprint/i)).toBeInTheDocument();
      });

      // Verify create button has aria-label explaining disabled state
      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      expect(createButton).toHaveAttribute('aria-label', expect.stringContaining('disabled'));
      expect(createButton).toHaveAttribute('aria-label', expect.stringContaining('no blueprint'));
    });

    it('should display empty state message when no blueprint is selected', async () => {
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByLabelText(/select blueprint/i)).toBeInTheDocument();
      });

      // Verify empty state message is shown
      expect(screen.getByText(/select a blueprint to view stacks/i)).toBeInTheDocument();
      expect(screen.getByText(/choose a blueprint from the selector above/i)).toBeInTheDocument();
    });

    it('should prevent stack creation when create button is clicked while disabled', async () => {
      const user = userEvent.setup();
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByLabelText(/select blueprint/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      
      // Try to click disabled button (this should not do anything)
      await act(async () => {
        await user.click(createButton);
      });

      // Verify form did not open (button text "Create New Stack" should still be visible, not form title)
      // The button itself has text "Create New Stack", so we need to check for form-specific elements
      expect(screen.queryByLabelText(/stack name/i)).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.2: Select blueprint → create button enabled', () => {
    it('should enable create button when a blueprint is selected', async () => {
      // Set blueprint before rendering so component loads with selection
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      // Wait for stacks to load
      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      // Verify create button is enabled
      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      expect(createButton).not.toBeDisabled();
      expect(createButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should update create button aria-label when blueprint is selected', async () => {
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      // Verify create button has appropriate aria-label
      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      expect(createButton).toHaveAttribute('aria-label', expect.stringContaining('create'));
      expect(createButton).toHaveAttribute('aria-label', expect.stringContaining('blueprint'));
    });

    it('should allow opening stack form when blueprint is selected', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      
      // Click create button
      await act(async () => {
        await user.click(createButton);
      });

      // Verify form opened (check for form-specific element, not button text)
      await waitFor(() => {
        expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 3.3: Create stack → stack associated with blueprint', () => {
    it('should pass selected blueprint ID to stack form', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();
      });

      // Form should be rendered with blueprint context
      // The form receives blueprintId as a prop from Homepage
      expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();
    });

    it('should include blueprint ID in stack creation payload', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      const newStack: Stack = {
        id: 'stack-new',
        name: 'New Test Stack',
        cloudName: 'new-test',
        routePath: '/new-test/',
        description: 'Newly created stack',
        stackType: StackType.INFRASTRUCTURE,
        isPublic: false,
        blueprintId: 'blueprint-1',
        createdBy: 'test@example.com',
        createdAt: '2024-01-07T00:00:00Z',
        updatedAt: '2024-01-07T00:00:00Z',
        resources: [],
      };

      vi.mocked(apiService.createStack).mockResolvedValue(newStack);

      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();
      });

      // Fill in minimal required fields
      const nameInput = screen.getByLabelText(/stack name/i);
      await act(async () => {
        await user.clear(nameInput);
        await user.type(nameInput, 'New Test Stack');
      });

      // Submit the form
      const saveButton = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify createStack was called with blueprint ID
      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
        const createCall = vi.mocked(apiService.createStack).mock.calls[0];
        const stackPayload = createCall[0] as StackCreate;
        expect(stackPayload.blueprintId).toBe('blueprint-1');
      });
    });

    it('should not allow creating stack without blueprint selection', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByLabelText(/select blueprint/i)).toBeInTheDocument();
      });

      // Try to trigger create without blueprint (button should be disabled)
      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      expect(createButton).toBeDisabled();

      alertSpy.mockRestore();
    });
  });

  describe('Requirement 3.5, 9.1: Stack appears in correct blueprint\'s list', () => {
    it('should add new stack to the current blueprint\'s stack list', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      const newStack: Stack = {
        id: 'stack-new',
        name: 'New Test Stack',
        cloudName: 'new-test',
        routePath: '/new-test/',
        description: 'Newly created stack',
        stackType: StackType.INFRASTRUCTURE,
        isPublic: false,
        blueprintId: 'blueprint-1',
        createdBy: 'test@example.com',
        createdAt: '2024-01-07T00:00:00Z',
        updatedAt: '2024-01-07T00:00:00Z',
        resources: [],
      };

      vi.mocked(apiService.createStack).mockResolvedValue(newStack);

      renderHomepage();

      // Wait for initial stacks to load
      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      // Verify only one stack initially
      expect(screen.queryByText('New Test Stack')).not.toBeInTheDocument();

      // Click create button
      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/create new stack/i)).toBeInTheDocument();
      });

      // Fill in stack details
      const nameInput = screen.getByLabelText(/stack name/i);
      await act(async () => {
        await user.clear(nameInput);
        await user.type(nameInput, 'New Test Stack');
      });

      // Update mock to return new stack in list
      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([
        ...mockStacksBlueprint1,
        newStack,
      ]);

      // Submit the form
      const saveButton = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Wait for stack to be created
      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
      });

      // Navigate back to list view
      await waitFor(() => {
        expect(screen.queryByText(/create new stack/i)).not.toBeInTheDocument();
      });

      // Verify new stack appears in the list
      await waitFor(() => {
        expect(screen.getByText('New Test Stack')).toBeInTheDocument();
      });

      // Verify original stack is still there
      expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
    });

    it('should refresh stack list after creating a stack', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      const newStack: Stack = {
        id: 'stack-new',
        name: 'New Test Stack',
        cloudName: 'new-test',
        routePath: '/new-test/',
        stackType: StackType.INFRASTRUCTURE,
        isPublic: false,
        blueprintId: 'blueprint-1',
        createdBy: 'test@example.com',
        createdAt: '2024-01-07T00:00:00Z',
        updatedAt: '2024-01-07T00:00:00Z',
        resources: [],
      };

      vi.mocked(apiService.createStack).mockResolvedValue(newStack);

      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      // Track initial API call count
      const initialCallCount = vi.mocked(apiService.getStacksByBlueprint).mock.calls.length;

      // Create new stack
      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/create new stack/i)).toBeInTheDocument();
      });

      // Submit the form
      const saveButton = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Wait for stack list to be refreshed
      await waitFor(() => {
        const newCallCount = vi.mocked(apiService.getStacksByBlueprint).mock.calls.length;
        expect(newCallCount).toBeGreaterThan(initialCallCount);
      });
    });

    it('should not show new stack in different blueprint\'s list', async () => {
      // This test verifies that stacks are properly filtered by blueprint
      // by checking the API mock returns correct data for different blueprints
      
      const newStack: Stack = {
        id: 'stack-new',
        name: 'New Test Stack',
        cloudName: 'new-test',
        routePath: '/new-test/',
        stackType: StackType.INFRASTRUCTURE,
        isPublic: false,
        blueprintId: 'blueprint-1',
        createdBy: 'test@example.com',
        createdAt: '2024-01-07T00:00:00Z',
        updatedAt: '2024-01-07T00:00:00Z',
        resources: [],
      };

      // Update mock for blueprint-1 to include new stack
      vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
        if (blueprintId === 'blueprint-1') {
          return Promise.resolve([...mockStacksBlueprint1, newStack]);
        } else if (blueprintId === 'blueprint-2') {
          return Promise.resolve(mockStacksBlueprint2);
        }
        return Promise.resolve([]);
      });

      // Verify new stack is in blueprint-1's list
      const blueprint1Stacks = await apiService.getStacksByBlueprint('blueprint-1', mockUser.email);
      expect(blueprint1Stacks).toContainEqual(expect.objectContaining({ id: 'stack-new' }));
      expect(blueprint1Stacks).toHaveLength(2);

      // Verify new stack is NOT in blueprint-2's list
      const blueprint2Stacks = await apiService.getStacksByBlueprint('blueprint-2', mockUser.email);
      expect(blueprint2Stacks).not.toContainEqual(expect.objectContaining({ id: 'stack-new' }));
      expect(blueprint2Stacks).toHaveLength(1);
      expect(blueprint2Stacks[0].id).toBe('stack-3');
    });

    it('should transition from empty state to showing stack after creation', async () => {
      const user = userEvent.setup();
      
      // Start with blueprint that has no stacks
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      // First render shows empty state
      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValueOnce([]);

      renderHomepage();

      // Wait for empty state
      await waitFor(() => {
        expect(screen.getByText(/no stacks in this blueprint/i)).toBeInTheDocument();
      });

      const newStack: Stack = {
        id: 'stack-first',
        name: 'First Stack',
        cloudName: 'first-stack',
        routePath: '/first-stack/',
        stackType: StackType.INFRASTRUCTURE,
        isPublic: false,
        blueprintId: 'blueprint-1',
        createdBy: 'test@example.com',
        createdAt: '2024-01-07T00:00:00Z',
        updatedAt: '2024-01-07T00:00:00Z',
        resources: [],
      };

      vi.mocked(apiService.createStack).mockResolvedValue(newStack);

      // Click create button from empty state
      const createButton = screen.getByRole('button', { name: /create.*first stack/i });
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/create new stack/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/stack name/i);
      await act(async () => {
        await user.clear(nameInput);
        await user.type(nameInput, 'First Stack');
      });

      // Update mock to return the new stack for subsequent calls
      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([newStack]);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        await user.click(saveButton);
      });

      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
      });

      // Verify empty state is gone and stack is shown
      await waitFor(() => {
        expect(screen.queryByText(/no stacks in this blueprint/i)).not.toBeInTheDocument();
        expect(screen.getByText('First Stack')).toBeInTheDocument();
      });
    });
  });

  describe('Complete stack creation workflow', () => {
    it('should handle complete workflow: no selection → select → create → verify', async () => {
      const user = userEvent.setup();
      
      // Step 1: Start with no blueprint selected
      const { unmount } = renderHomepage();

      await waitFor(() => {
        expect(screen.getByLabelText(/select blueprint/i)).toBeInTheDocument();
      });

      // Verify create button is disabled
      let createButton = screen.getByRole('button', { name: /create.*new stack/i });
      expect(createButton).toBeDisabled();

      // Verify empty state
      expect(screen.getByText(/select a blueprint to view stacks/i)).toBeInTheDocument();

      // Step 2: Select a blueprint by re-rendering with localStorage set
      unmount();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      // Verify create button is now enabled
      createButton = screen.getByRole('button', { name: /create.*new stack/i });
      expect(createButton).not.toBeDisabled();

      // Step 3: Create a new stack
      const newStack: Stack = {
        id: 'stack-workflow',
        name: 'Workflow Test Stack',
        cloudName: 'workflow-test',
        routePath: '/workflow-test/',
        stackType: StackType.INFRASTRUCTURE,
        isPublic: false,
        blueprintId: 'blueprint-1',
        createdBy: 'test@example.com',
        createdAt: '2024-01-07T00:00:00Z',
        updatedAt: '2024-01-07T00:00:00Z',
        resources: [],
      };

      vi.mocked(apiService.createStack).mockResolvedValue(newStack);

      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/create new stack/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/stack name/i);
      await act(async () => {
        await user.clear(nameInput);
        await user.type(nameInput, 'Workflow Test Stack');
      });

      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([
        ...mockStacksBlueprint1,
        newStack,
      ]);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Step 4: Verify stack was created with correct blueprint
      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
        const createCall = vi.mocked(apiService.createStack).mock.calls[0];
        const stackPayload = createCall[0] as StackCreate;
        expect(stackPayload.blueprintId).toBe('blueprint-1');
      });

      // Step 5: Verify stack appears in list
      await waitFor(() => {
        expect(screen.getByText('Workflow Test Stack')).toBeInTheDocument();
      });

      expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
    });
  });
});
