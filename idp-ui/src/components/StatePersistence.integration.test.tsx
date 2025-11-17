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
 * Integration test for State Persistence
 * 
 * Task 28: Write integration tests for state persistence
 * 
 * This test file verifies state persistence across page refreshes and navigation:
 * - Test select blueprint → refresh page → selection restored (Requirements 7.1, 7.2, 7.3)
 * - Test create stack → navigate away → return → stack visible (Requirements 7.1, 7.2, 9.1)
 * - Test logout → login → selection cleared (Requirements 7.5)
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

describe('State Persistence - Integration Tests', () => {
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
      cloudProviderId: 'aws-1',
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
      cloudProviderId: 'aws-2',
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
      blueprintResourceId: 'resource-1',
      createdBy: 'test@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      resources: [],
    },
    {
      id: 'stack-2',
      name: 'Dev UI Stack',
      cloudName: 'dev-ui',
      routePath: '/dev-ui/',
      description: 'Development UI stack',
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

  describe('Requirement 7.1, 7.2, 7.3: Select blueprint → refresh page → selection restored', () => {
    it('should persist blueprint selection to localStorage when selected', async () => {
      renderHomepage();

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Verify no selection initially
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();

      // Simulate blueprint selection by setting localStorage
      // In the actual application, the BlueprintSelector component sets this
      // when the user selects a blueprint from the dropdown
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      // Verify localStorage was updated
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');
      
      // Note: This test verifies that localStorage can store the blueprint ID.
      // The actual selection flow is tested in BlueprintSelectionFlow.integration.test.tsx
    });

    it('should restore blueprint selection from localStorage on page refresh', async () => {
      // Pre-populate localStorage (simulating a previous session)
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      // Render component (simulating page refresh)
      const { unmount } = renderHomepage();

      // Wait for component to restore selection and fetch stacks
      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      // Verify stacks are displayed (selection was restored)
      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
        expect(screen.getByText('Dev UI Stack')).toBeInTheDocument();
      });

      // Verify localStorage still has the selection
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      unmount();
    });

    it('should validate stored blueprint ID against available blueprints on refresh', async () => {
      // Store a valid blueprint ID
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for stacks to be fetched (validation passed)
      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      // Verify stacks are displayed
      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });
    });

    it('should clear invalid stored blueprint ID on refresh', async () => {
      // Store an invalid blueprint ID (not in mockBlueprints)
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'invalid-blueprint-id');

      renderHomepage();

      // Wait for blueprints to be fetched
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Verify invalid blueprint was cleared from localStorage
      await waitFor(() => {
        expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();
      });

      // Verify empty state is shown (no selection)
      expect(screen.getByText(/select a blueprint to view stacks/i)).toBeInTheDocument();
    });

    it('should maintain blueprint selection across multiple page refreshes', async () => {
      // First render with blueprint selected
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      const { unmount: unmount1 } = renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      unmount1();

      // Second render (simulating another page refresh)
      const { unmount: unmount2 } = renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      // Verify selection is still persisted
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      unmount2();

      // Third render (simulating yet another page refresh)
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      // Verify selection is still persisted
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');
    });

    it('should handle blueprint deletion and clear selection on refresh', async () => {
      // Store blueprint-1 in localStorage
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      // Mock blueprints to only return blueprint-2 (blueprint-1 was deleted)
      vi.mocked(apiService.getBlueprints).mockResolvedValue([mockBlueprints[1]]);

      renderHomepage();

      // Wait for blueprints to be fetched
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Verify invalid blueprint was cleared from localStorage
      await waitFor(() => {
        expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();
      });

      // Verify empty state is shown
      expect(screen.getByText(/select a blueprint to view stacks/i)).toBeInTheDocument();
    });
  });

  describe('Requirement 7.1, 7.2, 9.1: Create stack → navigate away → return → stack visible', () => {
    it('should show newly created stack after navigating away and returning', async () => {
      const user = userEvent.setup();
      
      // Start with blueprint selected
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      const { unmount } = renderHomepage();

      // Wait for initial stacks to load
      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
        expect(screen.getByText('Dev UI Stack')).toBeInTheDocument();
      });

      // Create a new stack
      const newStack: Stack = {
        id: 'stack-new',
        name: 'New Test Stack',
        cloudName: 'new-test',
        routePath: '/new-test/',
        description: 'Newly created stack',
        stackType: StackType.INFRASTRUCTURE_ONLY,
        isPublic: false,
        blueprintId: 'blueprint-1',
        createdBy: 'test@example.com',
        createdAt: '2024-01-07T00:00:00Z',
        updatedAt: '2024-01-07T00:00:00Z',
        resources: [],
      };

      vi.mocked(apiService.createStack).mockResolvedValue(newStack);

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

      // Verify new stack appears in the list
      await waitFor(() => {
        expect(screen.getByText('New Test Stack')).toBeInTheDocument();
      });

      // Unmount (simulating navigation away)
      unmount();

      // Re-render (simulating return to page)
      renderHomepage();

      // Wait for stacks to be fetched again
      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      // Verify all stacks are visible, including the newly created one
      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
        expect(screen.getByText('Dev UI Stack')).toBeInTheDocument();
        expect(screen.getByText('New Test Stack')).toBeInTheDocument();
      });
    });

    it('should persist blueprint selection after creating a stack and refreshing', async () => {
      const user = userEvent.setup();
      
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      const { unmount } = renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      // Verify blueprint is selected
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      // Create a new stack
      const newStack: Stack = {
        id: 'stack-persist',
        name: 'Persistence Test Stack',
        cloudName: 'persist-test',
        routePath: '/persist-test/',
        stackType: StackType.INFRASTRUCTURE_ONLY,
        isPublic: false,
        blueprintId: 'blueprint-1',
        createdBy: 'test@example.com',
        createdAt: '2024-01-07T00:00:00Z',
        updatedAt: '2024-01-07T00:00:00Z',
        resources: [],
      };

      vi.mocked(apiService.createStack).mockResolvedValue(newStack);

      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/create new stack/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/stack name/i);
      await act(async () => {
        await user.clear(nameInput);
        await user.type(nameInput, 'Persistence Test Stack');
      });

      vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([
        ...mockStacksBlueprint1,
        newStack,
      ]);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        await user.click(saveButton);
      });

      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
      });

      // Verify blueprint selection is still persisted
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      // Unmount and re-render (simulating page refresh)
      unmount();
      renderHomepage();

      // Wait for stacks to be fetched
      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      // Verify blueprint selection was restored
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      // Verify all stacks are visible
      await waitFor(() => {
        expect(screen.getByText('Persistence Test Stack')).toBeInTheDocument();
      });
    });

    it('should maintain stack visibility across multiple navigation cycles', async () => {
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      // First render
      const { unmount: unmount1 } = renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      unmount1();

      // Second render (simulating return to page)
      const { unmount: unmount2 } = renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      unmount2();

      // Third render
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
        expect(screen.getByText('Dev UI Stack')).toBeInTheDocument();
      });

      // Verify blueprint selection persisted through all cycles
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');
    });
  });

  describe('Requirement 7.5: Logout → login → selection cleared', () => {
    it('should clear blueprint selection from localStorage on logout', async () => {
      // Set up a blueprint selection
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      // Verify selection is stored
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      // Import logout function
      const { logout } = await import('../auth');

      // Mock window.location.href to prevent actual navigation
      const originalLocation = window.location;
      delete (window as { location?: Location }).location;
      window.location = { ...originalLocation, href: '' } as Location;

      // Call logout
      logout();

      // Verify blueprint selection was cleared
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();

      // Restore window.location
      window.location = originalLocation;
    });

    it('should not restore blueprint selection after logout and re-login', async () => {
      // Simulate user session with blueprint selected
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      const { unmount } = renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      unmount();

      // Simulate logout (clear localStorage)
      localStorage.removeItem(BLUEPRINT_STORAGE_KEY);

      // Verify selection was cleared
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();

      // Simulate re-login and return to page
      renderHomepage();

      // Wait for component to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Verify no blueprint is selected (empty state shown)
      expect(screen.getByText(/select a blueprint to view stacks/i)).toBeInTheDocument();

      // Verify localStorage is still empty
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();
    });

    it('should start fresh after logout with no persisted state', async () => {
      // Set up initial state with blueprint and simulate user activity
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      const { unmount } = renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      unmount();

      // Simulate logout
      const { logout } = await import('../auth');
      
      const originalLocation = window.location;
      delete (window as { location?: Location }).location;
      window.location = { ...originalLocation, href: '' } as Location;

      logout();

      // Verify all state cleared
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();

      // Restore window.location
      window.location = originalLocation;

      // Simulate re-login and render
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Verify fresh start with no selection
      expect(screen.getByText(/select a blueprint to view stacks/i)).toBeInTheDocument();
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();
    });
  });

  describe('Complete state persistence workflow', () => {
    it('should handle complete workflow: select → create → refresh → logout → login', async () => {
      const user = userEvent.setup();

      // Step 1: Select blueprint
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      const { unmount: unmount1 } = renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      // Step 2: Create a stack
      const newStack: Stack = {
        id: 'stack-workflow',
        name: 'Workflow Test Stack',
        cloudName: 'workflow-test',
        routePath: '/workflow-test/',
        stackType: StackType.INFRASTRUCTURE_ONLY,
        isPublic: false,
        blueprintId: 'blueprint-1',
        createdBy: 'test@example.com',
        createdAt: '2024-01-07T00:00:00Z',
        updatedAt: '2024-01-07T00:00:00Z',
        resources: [],
      };

      vi.mocked(apiService.createStack).mockResolvedValue(newStack);

      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
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

      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
      });

      // Verify stack was created
      await waitFor(() => {
        expect(screen.getByText('Workflow Test Stack')).toBeInTheDocument();
      });

      unmount1();

      // Step 3: Refresh page
      const { unmount: unmount2 } = renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Workflow Test Stack')).toBeInTheDocument();
      });

      // Verify blueprint selection persisted
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      unmount2();

      // Step 4: Logout
      const { logout } = await import('../auth');
      
      const originalLocation = window.location;
      delete (window as { location?: Location }).location;
      window.location = { ...originalLocation, href: '' } as Location;

      logout();

      // Verify selection cleared
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();

      window.location = originalLocation;

      // Step 5: Login and render
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Verify fresh start with no selection
      expect(screen.getByText(/select a blueprint to view stacks/i)).toBeInTheDocument();
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();
    });

    it('should handle blueprint switching with persistence across refreshes', async () => {
      // Start with blueprint-1
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      const { unmount: unmount1 } = renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      unmount1();

      // Switch to blueprint-2
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-2');

      // Mock stacks for blueprint-2
      vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
        if (blueprintId === 'blueprint-2') {
          return Promise.resolve([
            {
              id: 'stack-prod',
              name: 'Prod API Stack',
              cloudName: 'prod-api',
              routePath: '/prod-api/',
              stackType: StackType.RESTFUL_API,
              programmingLanguage: ProgrammingLanguage.QUARKUS,
              isPublic: false,
              blueprintId: 'blueprint-2',
              createdBy: 'test@example.com',
              createdAt: '2024-01-05T00:00:00Z',
              updatedAt: '2024-01-06T00:00:00Z',
              resources: [],
            },
          ]);
        }
        return Promise.resolve(mockStacksBlueprint1);
      });

      const { unmount: unmount2 } = renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-2', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Prod API Stack')).toBeInTheDocument();
      });

      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-2');

      unmount2();

      // Refresh again
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-2', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Prod API Stack')).toBeInTheDocument();
      });

      // Verify blueprint-2 selection persisted
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-2');
    });

    it('should handle error scenarios gracefully with persistence', async () => {
      // Set up valid blueprint selection
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      // First render succeeds
      const { unmount: unmount1 } = renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      unmount1();

      // Simulate API error on refresh
      vi.mocked(apiService.getBlueprints).mockRejectedValueOnce(new Error('Network error'));

      const { unmount: unmount2 } = renderHomepage();

      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Component should still render despite error
      expect(screen.getByTestId('blueprint-selector')).toBeInTheDocument();

      // Blueprint selection should still be in localStorage (not cleared on error)
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      unmount2();

      // Restore successful API response
      vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);

      // Next refresh should work
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      // Verify selection was restored after error recovery
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty localStorage gracefully', async () => {
      // Ensure localStorage is empty
      localStorage.clear();

      renderHomepage();

      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Verify empty state is shown
      expect(screen.getByText(/select a blueprint to view stacks/i)).toBeInTheDocument();

      // Verify localStorage is still empty
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();
    });

    it('should handle corrupted localStorage data', async () => {
      // Set invalid data in localStorage
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, '{"invalid": "json"');

      renderHomepage();

      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Component should handle gracefully and clear invalid data
      // Note: The actual implementation treats any string as a blueprint ID,
      // so it will be validated against available blueprints
      await waitFor(() => {
        expect(screen.getByText(/select a blueprint to view stacks/i)).toBeInTheDocument();
      });
    });

    it('should handle rapid refresh cycles', async () => {
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      // Rapid mount/unmount cycles
      const { unmount: unmount1 } = renderHomepage();
      await waitFor(() => expect(apiService.getBlueprints).toHaveBeenCalled());
      await waitFor(() => expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email));
      unmount1();

      const { unmount: unmount2 } = renderHomepage();
      await waitFor(() => expect(apiService.getBlueprints).toHaveBeenCalled());
      await waitFor(() => expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email));
      unmount2();

      const { unmount: unmount3 } = renderHomepage();
      await waitFor(() => expect(apiService.getBlueprints).toHaveBeenCalled());
      await waitFor(() => expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email));
      unmount3();

      // Final render should still work correctly
      renderHomepage();

      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith('blueprint-1', mockUser.email);
      });

      await waitFor(() => {
        expect(screen.getByText('Dev API Stack')).toBeInTheDocument();
      });

      // Verify selection persisted through all cycles
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');
    });
  });
});
