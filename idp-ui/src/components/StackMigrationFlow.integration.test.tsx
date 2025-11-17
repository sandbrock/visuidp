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
 * Integration test for Stack Migration Flow
 * 
 * Task 27: Write integration tests for stack migration flow
 * 
 * This test file verifies the complete stack migration workflow:
 * - Test open stack in edit mode → migration control visible (Requirements 5.1)
 * - Test select compatible blueprint → no warnings (Requirements 5.2, 5.3)
 * - Test select incompatible blueprint → warnings displayed (Requirements 5.4, 5.5)
 * - Test save migration → stack moves to new blueprint (Requirements 5.3, 5.4, 5.5)
 * - Test original blueprint's list updates (Requirements 9.4)
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

describe('Stack Migration Flow - Integration Tests', () => {
  const mockUser: User = {
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  };

  // Blueprint with Container Orchestrator (compatible with API stacks)
  const mockBlueprintWithOrchestrator: Blueprint = {
    id: 'blueprint-1',
    name: 'API Blueprint',
    description: 'Blueprint with Container Orchestrator',
    supportedCloudTypes: ['aws'],
    resources: [
      {
        id: 'resource-1',
        name: 'API Container Orchestrator',
        resourceTypeId: 'container-orchestrator-type',
        resourceTypeName: 'Managed Container Orchestrator',
        cloudProviderId: 'aws-1',
        configuration: {},
      },
    ],
  };

  // Blueprint with Storage (compatible with web apps)
  const mockBlueprintWithStorage: Blueprint = {
    id: 'blueprint-2',
    name: 'Web Blueprint',
    description: 'Blueprint with Storage',
    supportedCloudTypes: ['aws'],
    resources: [
      {
        id: 'resource-2',
        name: 'Web Storage',
        resourceTypeId: 'storage-type',
        resourceTypeName: 'Storage',
        cloudProviderId: 'aws-2',
        configuration: {},
      },
    ],
  };

  // Blueprint without required resources (incompatible)
  const mockBlueprintIncompatible: Blueprint = {
    id: 'blueprint-3',
    name: 'Empty Blueprint',
    description: 'Blueprint without resources',
    supportedCloudTypes: ['aws'],
    resources: [],
  };

  // API Stack that requires Container Orchestrator
  const mockApiStack: Stack = {
    id: 'stack-api',
    name: 'Test API Stack',
    cloudName: 'test-api',
    routePath: '/test-api/',
    description: 'API stack for testing',
    stackType: StackType.RESTFUL_API,
    programmingLanguage: ProgrammingLanguage.QUARKUS,
    isPublic: false,
    blueprintId: 'blueprint-1',
    blueprintResourceId: 'resource-1',
    createdBy: 'test@example.com',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    resources: [],
  };

  // Web App Stack that requires Storage
  const mockWebStack: Stack = {
    id: 'stack-web',
    name: 'Test Web Stack',
    cloudName: 'test-web',
    routePath: '/test-web/',
    description: 'Web stack for testing',
    stackType: StackType.JAVASCRIPT_WEB_APPLICATION,
    programmingLanguage: ProgrammingLanguage.REACT,
    isPublic: true,
    blueprintId: 'blueprint-2',
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
    {
      id: 'storage-type',
      name: 'Storage',
      displayName: 'Storage',
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
    vi.mocked(apiService.getBlueprints).mockResolvedValue([
      mockBlueprintWithOrchestrator,
      mockBlueprintWithStorage,
      mockBlueprintIncompatible,
    ]);
    
    vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
      if (blueprintId === 'blueprint-1') {
        return Promise.resolve([mockApiStack]);
      } else if (blueprintId === 'blueprint-2') {
        return Promise.resolve([mockWebStack]);
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

  describe('Requirement 5.1: Open stack in edit mode → migration control visible', () => {
    it('should display migration control when editing a stack', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      // Wait for API calls to complete
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
        expect(apiService.getStacksByBlueprint).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Wait for stack to appear in the list
      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click on the stack to view details
      const stackItem = screen.getByText('Test API Stack');
      await act(async () => {
        await user.click(stackItem);
      });

      // Wait for details view
      await waitFor(() => {
        expect(screen.getByText(/test api stack/i)).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await act(async () => {
        await user.click(editButton);
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();
      });

      // Verify migration section is visible
      expect(screen.getByText(/move to different blueprint/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/target blueprint/i)).toBeInTheDocument();
    });

    it('should not display migration control when creating a new stack', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      // Wait for stack list to load
      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      // Click create new stack button
      const createButton = screen.getByRole('button', { name: /create.*new stack/i });
      await act(async () => {
        await user.click(createButton);
      });

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();
      });

      // Verify migration section is NOT visible
      expect(screen.queryByText(/move to different blueprint/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/target blueprint/i)).not.toBeInTheDocument();
    });

    it('should list available blueprints excluding current blueprint', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test API Stack');
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

      // Open the target blueprint dropdown
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      // Verify current blueprint (API Blueprint) is not in the list
      // but other blueprints are available
      await waitFor(() => {
        // Should see "Keep current blueprint" option
        expect(screen.getByText(/keep current blueprint/i)).toBeInTheDocument();
        
        // Should see other blueprints
        expect(screen.getByText('Web Blueprint')).toBeInTheDocument();
        expect(screen.getByText('Empty Blueprint')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.2, 5.3: Select compatible blueprint → no warnings', () => {
    it('should not show warnings when selecting a compatible blueprint for API stack', async () => {
      const user = userEvent.setup();
      
      // Create a second blueprint with Container Orchestrator (compatible with API stacks)
      const compatibleBlueprint: Blueprint = {
        id: 'blueprint-compatible',
        name: 'Compatible API Blueprint',
        description: 'Another blueprint with Container Orchestrator',
        supportedCloudTypes: ['aws'],
        resources: [
          {
            id: 'resource-compatible',
            name: 'Compatible Container Orchestrator',
            resourceTypeId: 'container-orchestrator-type',
            resourceTypeName: 'Managed Container Orchestrator',
            cloudProviderId: 'aws-1',
            configuration: {},
          },
        ],
      };

      vi.mocked(apiService.getBlueprints).mockResolvedValue([
        mockBlueprintWithOrchestrator,
        compatibleBlueprint,
        mockBlueprintIncompatible,
      ]);

      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test API Stack');
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

      // Select the compatible blueprint
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Compatible API Blueprint')).toBeInTheDocument();
      });

      const compatibleOption = screen.getByText('Compatible API Blueprint');
      await act(async () => {
        await user.click(compatibleOption);
      });

      // Verify no warnings are displayed
      await waitFor(() => {
        expect(screen.queryByText(/migration warnings/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/does not have/i)).not.toBeInTheDocument();
      });
    });

    it('should allow saving migration to compatible blueprint without confirmation', async () => {
      const user = userEvent.setup();
      
      const compatibleBlueprint: Blueprint = {
        id: 'blueprint-compatible',
        name: 'Compatible API Blueprint',
        description: 'Another blueprint with Container Orchestrator',
        supportedCloudTypes: ['aws'],
        resources: [
          {
            id: 'resource-compatible',
            name: 'Compatible Container Orchestrator',
            resourceTypeId: 'container-orchestrator-type',
            resourceTypeName: 'Managed Container Orchestrator',
            cloudProviderId: 'aws-1',
            configuration: {},
          },
        ],
      };

      vi.mocked(apiService.getBlueprints).mockResolvedValue([
        mockBlueprintWithOrchestrator,
        compatibleBlueprint,
      ]);

      const migratedStack: Stack = {
        ...mockApiStack,
        blueprintId: 'blueprint-compatible',
        updatedAt: '2024-01-10T00:00:00Z',
      };

      vi.mocked(apiService.updateStack).mockResolvedValue(migratedStack);

      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test API Stack');
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

      // Select the compatible blueprint
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Compatible API Blueprint')).toBeInTheDocument();
      });

      const compatibleOption = screen.getByText('Compatible API Blueprint');
      await act(async () => {
        await user.click(compatibleOption);
      });

      // Save the migration
      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify updateStack was called with the new blueprint ID
      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalled();
        const updateCall = vi.mocked(apiService.updateStack).mock.calls[0];
        expect(updateCall[1]).toHaveProperty('blueprintId', 'blueprint-compatible');
      });
    });
  });

  describe('Requirement 5.4, 5.5: Select incompatible blueprint → warnings displayed', () => {
    it('should display warnings when selecting incompatible blueprint for API stack', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test API Stack');
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

      // Select the incompatible blueprint (no Container Orchestrator)
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Empty Blueprint')).toBeInTheDocument();
      });

      const incompatibleOption = screen.getByText('Empty Blueprint');
      await act(async () => {
        await user.click(incompatibleOption);
      });

      // Verify warnings are displayed
      await waitFor(() => {
        expect(screen.getByText(/migration warnings/i)).toBeInTheDocument();
        expect(screen.getByText(/does not have a container orchestrator/i)).toBeInTheDocument();
      });
    });

    it('should display warnings when selecting blueprint without Storage for web app', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-2');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test Web Stack')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test Web Stack');
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

      // Select blueprint without Storage
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Empty Blueprint')).toBeInTheDocument();
      });

      const incompatibleOption = screen.getByText('Empty Blueprint');
      await act(async () => {
        await user.click(incompatibleOption);
      });

      // Verify warnings are displayed
      await waitFor(() => {
        expect(screen.getByText(/migration warnings/i)).toBeInTheDocument();
        expect(screen.getByText(/does not have a storage resource/i)).toBeInTheDocument();
      });
    });

    it('should display warning when blueprint resource is not available in target', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      // Create a blueprint with different resources
      const differentBlueprint: Blueprint = {
        id: 'blueprint-different',
        name: 'Different Blueprint',
        description: 'Blueprint with different resources',
        supportedCloudTypes: ['aws'],
        resources: [
          {
            id: 'resource-different',
            name: 'Different Container Orchestrator',
            resourceTypeId: 'container-orchestrator-type',
            resourceTypeName: 'Managed Container Orchestrator',
            cloudProviderId: 'aws-1',
            configuration: {},
          },
        ],
      };

      vi.mocked(apiService.getBlueprints).mockResolvedValue([
        mockBlueprintWithOrchestrator,
        differentBlueprint,
      ]);

      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test API Stack');
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

      // Select blueprint with different resources
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Different Blueprint')).toBeInTheDocument();
      });

      const differentOption = screen.getByText('Different Blueprint');
      await act(async () => {
        await user.click(differentOption);
      });

      // Verify warning about blueprint resource
      await waitFor(() => {
        expect(screen.getByText(/migration warnings/i)).toBeInTheDocument();
        expect(screen.getByText(/selected blueprint resource is not available/i)).toBeInTheDocument();
      });
    });

    it('should require confirmation when saving migration with warnings', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test API Stack');
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

      // Select incompatible blueprint
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Empty Blueprint')).toBeInTheDocument();
      });

      const incompatibleOption = screen.getByText('Empty Blueprint');
      await act(async () => {
        await user.click(incompatibleOption);
      });

      // Wait for warnings to appear
      await waitFor(() => {
        expect(screen.getByText(/migration warnings/i)).toBeInTheDocument();
      });

      // Try to save
      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify confirmation dialog was shown
      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
        expect(confirmSpy.mock.calls[0][0]).toContain('compatibility warnings');
      });

      // Verify updateStack was NOT called (user cancelled)
      expect(apiService.updateStack).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('Requirement 5.3, 5.4, 5.5, 9.4: Save migration → stack moves to new blueprint', () => {
    it('should successfully migrate stack to compatible blueprint', async () => {
      const user = userEvent.setup();
      
      const compatibleBlueprint: Blueprint = {
        id: 'blueprint-compatible',
        name: 'Compatible API Blueprint',
        description: 'Another blueprint with Container Orchestrator',
        supportedCloudTypes: ['aws'],
        resources: [
          {
            id: 'resource-compatible',
            name: 'Compatible Container Orchestrator',
            resourceTypeId: 'container-orchestrator-type',
            resourceTypeName: 'Managed Container Orchestrator',
            cloudProviderId: 'aws-1',
            configuration: {},
          },
        ],
      };

      vi.mocked(apiService.getBlueprints).mockResolvedValue([
        mockBlueprintWithOrchestrator,
        compatibleBlueprint,
      ]);

      const migratedStack: Stack = {
        ...mockApiStack,
        blueprintId: 'blueprint-compatible',
        updatedAt: '2024-01-10T00:00:00Z',
      };

      vi.mocked(apiService.updateStack).mockResolvedValue(migratedStack);

      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test API Stack');
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

      // Select the compatible blueprint
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Compatible API Blueprint')).toBeInTheDocument();
      });

      const compatibleOption = screen.getByText('Compatible API Blueprint');
      await act(async () => {
        await user.click(compatibleOption);
      });

      // Save the migration
      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify updateStack was called with the new blueprint ID
      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalledWith(
          'stack-api',
          expect.objectContaining({
            blueprintId: 'blueprint-compatible',
          }),
          mockUser.email
        );
      });

      // Verify we're back in details view
      await waitFor(() => {
        expect(screen.getByText(/test api stack/i)).toBeInTheDocument();
      });
    });

    it('should allow migration with warnings if user confirms', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      const migratedStack: Stack = {
        ...mockApiStack,
        blueprintId: 'blueprint-3',
        updatedAt: '2024-01-10T00:00:00Z',
      };

      vi.mocked(apiService.updateStack).mockResolvedValue(migratedStack);

      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test API Stack');
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

      // Select incompatible blueprint
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Empty Blueprint')).toBeInTheDocument();
      });

      const incompatibleOption = screen.getByText('Empty Blueprint');
      await act(async () => {
        await user.click(incompatibleOption);
      });

      // Wait for warnings
      await waitFor(() => {
        expect(screen.getByText(/migration warnings/i)).toBeInTheDocument();
      });

      // Save with confirmation
      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify confirmation was requested
      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
      });

      // Verify migration proceeded
      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalledWith(
          'stack-api',
          expect.objectContaining({
            blueprintId: 'blueprint-3',
          }),
          mockUser.email
        );
      });

      confirmSpy.mockRestore();
    });

    it('should handle migration failure gracefully', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      const compatibleBlueprint: Blueprint = {
        id: 'blueprint-compatible',
        name: 'Compatible API Blueprint',
        description: 'Another blueprint with Container Orchestrator',
        supportedCloudTypes: ['aws'],
        resources: [
          {
            id: 'resource-compatible',
            name: 'Compatible Container Orchestrator',
            resourceTypeId: 'container-orchestrator-type',
            resourceTypeName: 'Managed Container Orchestrator',
            cloudProviderId: 'aws-1',
            configuration: {},
          },
        ],
      };

      vi.mocked(apiService.getBlueprints).mockResolvedValue([
        mockBlueprintWithOrchestrator,
        compatibleBlueprint,
      ]);

      vi.mocked(apiService.updateStack).mockRejectedValue(
        new Error('Migration failed: Blueprint validation error')
      );

      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test API Stack');
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

      // Select the compatible blueprint
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Compatible API Blueprint')).toBeInTheDocument();
      });

      const compatibleOption = screen.getByText('Compatible API Blueprint');
      await act(async () => {
        await user.click(compatibleOption);
      });

      // Try to save
      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/migration failed/i)).toBeInTheDocument();
      });

      // Verify we're still in edit mode (not navigated away)
      expect(screen.getByLabelText(/stack name/i)).toBeInTheDocument();

      alertSpy.mockRestore();
    });
  });

  describe('Requirement 9.4: Original blueprint\'s list updates after migration', () => {
    it('should update selected blueprint and refresh list after successful migration', async () => {
      const user = userEvent.setup();
      
      const compatibleBlueprint: Blueprint = {
        id: 'blueprint-compatible',
        name: 'Compatible API Blueprint',
        description: 'Another blueprint with Container Orchestrator',
        supportedCloudTypes: ['aws'],
        resources: [
          {
            id: 'resource-compatible',
            name: 'Compatible Container Orchestrator',
            resourceTypeId: 'container-orchestrator-type',
            resourceTypeName: 'Managed Container Orchestrator',
            cloudProviderId: 'aws-1',
            configuration: {},
          },
        ],
      };

      vi.mocked(apiService.getBlueprints).mockResolvedValue([
        mockBlueprintWithOrchestrator,
        compatibleBlueprint,
      ]);

      const migratedStack: Stack = {
        ...mockApiStack,
        blueprintId: 'blueprint-compatible',
        updatedAt: '2024-01-10T00:00:00Z',
      };

      vi.mocked(apiService.updateStack).mockResolvedValue(migratedStack);

      // Start with original blueprint selected
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      // Verify initial blueprint selection
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      const stackItem = screen.getByText('Test API Stack');
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

      // Select the compatible blueprint
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Compatible API Blueprint')).toBeInTheDocument();
      });

      const compatibleOption = screen.getByText('Compatible API Blueprint');
      await act(async () => {
        await user.click(compatibleOption);
      });

      // Update mock to return empty list for original blueprint
      vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
        if (blueprintId === 'blueprint-1') {
          return Promise.resolve([]); // Stack removed from original blueprint
        } else if (blueprintId === 'blueprint-compatible') {
          return Promise.resolve([migratedStack]); // Stack now in new blueprint
        }
        return Promise.resolve([]);
      });

      // Save the migration
      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Verify migration was saved
      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalled();
      });

      // Verify selected blueprint was updated to the new blueprint
      await waitFor(() => {
        expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-compatible');
      });

      // Navigate back to list
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i });
      await act(async () => {
        await user.click(backButton);
      });

      // Verify stack list was refreshed for the new blueprint
      await waitFor(() => {
        expect(apiService.getStacksByBlueprint).toHaveBeenCalledWith(
          'blueprint-compatible',
          mockUser.email
        );
      });
    });

    it('should remove stack from original blueprint list after migration', async () => {
      const user = userEvent.setup();
      
      const compatibleBlueprint: Blueprint = {
        id: 'blueprint-compatible',
        name: 'Compatible API Blueprint',
        description: 'Another blueprint with Container Orchestrator',
        supportedCloudTypes: ['aws'],
        resources: [
          {
            id: 'resource-compatible',
            name: 'Compatible Container Orchestrator',
            resourceTypeId: 'container-orchestrator-type',
            resourceTypeName: 'Managed Container Orchestrator',
            cloudProviderId: 'aws-1',
            configuration: {},
          },
        ],
      };

      // Add a second stack to the original blueprint
      const secondStack: Stack = {
        id: 'stack-api-2',
        name: 'Second API Stack',
        cloudName: 'second-api',
        routePath: '/second-api/',
        description: 'Second API stack',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'blueprint-1',
        createdBy: 'test@example.com',
        createdAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-06T00:00:00Z',
        resources: [],
      };

      vi.mocked(apiService.getBlueprints).mockResolvedValue([
        mockBlueprintWithOrchestrator,
        compatibleBlueprint,
      ]);

      // Initially return both stacks for blueprint-1
      vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
        if (blueprintId === 'blueprint-1') {
          return Promise.resolve([mockApiStack, secondStack]);
        }
        return Promise.resolve([]);
      });

      const migratedStack: Stack = {
        ...mockApiStack,
        blueprintId: 'blueprint-compatible',
        updatedAt: '2024-01-10T00:00:00Z',
      };

      vi.mocked(apiService.updateStack).mockResolvedValue(migratedStack);

      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      
      renderHomepage();

      // Verify both stacks are initially visible
      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
        expect(screen.getByText('Second API Stack')).toBeInTheDocument();
      });

      const stackItem = screen.getByText('Test API Stack');
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

      // Select the compatible blueprint
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Compatible API Blueprint')).toBeInTheDocument();
      });

      const compatibleOption = screen.getByText('Compatible API Blueprint');
      await act(async () => {
        await user.click(compatibleOption);
      });

      // After migration, update mock to reflect the change
      vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
        if (blueprintId === 'blueprint-1') {
          // Only second stack remains in original blueprint
          return Promise.resolve([secondStack]);
        } else if (blueprintId === 'blueprint-compatible') {
          // Migrated stack now in new blueprint
          return Promise.resolve([migratedStack]);
        }
        return Promise.resolve([]);
      });

      // Save the migration
      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalled();
      });

      // The selected blueprint should now be the new one
      await waitFor(() => {
        expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-compatible');
      });
    });
  });

  describe('Complete migration workflow', () => {
    it('should handle complete migration workflow from start to finish', async () => {
      const user = userEvent.setup();
      
      const compatibleBlueprint: Blueprint = {
        id: 'blueprint-compatible',
        name: 'Compatible API Blueprint',
        description: 'Another blueprint with Container Orchestrator',
        supportedCloudTypes: ['aws'],
        resources: [
          {
            id: 'resource-compatible',
            name: 'Compatible Container Orchestrator',
            resourceTypeId: 'container-orchestrator-type',
            resourceTypeName: 'Managed Container Orchestrator',
            cloudProviderId: 'aws-1',
            configuration: {},
          },
        ],
      };

      vi.mocked(apiService.getBlueprints).mockResolvedValue([
        mockBlueprintWithOrchestrator,
        compatibleBlueprint,
        mockBlueprintIncompatible,
      ]);

      const migratedStack: Stack = {
        ...mockApiStack,
        blueprintId: 'blueprint-compatible',
        updatedAt: '2024-01-10T00:00:00Z',
      };

      vi.mocked(apiService.updateStack).mockResolvedValue(migratedStack);

      // Step 1: Start with blueprint-1 selected
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByText('Test API Stack')).toBeInTheDocument();
      });

      // Step 2: Open stack details
      const stackItem = screen.getByText('Test API Stack');
      await act(async () => {
        await user.click(stackItem);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      // Step 3: Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit/i });
      await act(async () => {
        await user.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/move to different blueprint/i)).toBeInTheDocument();
      });

      // Step 4: Try incompatible blueprint first (should show warnings)
      const targetBlueprintSelect = screen.getByLabelText(/target blueprint/i);
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Empty Blueprint')).toBeInTheDocument();
      });

      const incompatibleOption = screen.getByText('Empty Blueprint');
      await act(async () => {
        await user.click(incompatibleOption);
      });

      await waitFor(() => {
        expect(screen.getByText(/migration warnings/i)).toBeInTheDocument();
      });

      // Step 5: Change to compatible blueprint (warnings should disappear)
      await act(async () => {
        await user.click(targetBlueprintSelect);
      });

      await waitFor(() => {
        expect(screen.getByText('Compatible API Blueprint')).toBeInTheDocument();
      });

      const compatibleOption = screen.getByText('Compatible API Blueprint');
      await act(async () => {
        await user.click(compatibleOption);
      });

      await waitFor(() => {
        expect(screen.queryByText(/migration warnings/i)).not.toBeInTheDocument();
      });

      // Step 6: Save migration
      vi.mocked(apiService.getStacksByBlueprint).mockImplementation((blueprintId) => {
        if (blueprintId === 'blueprint-compatible') {
          return Promise.resolve([migratedStack]);
        }
        return Promise.resolve([]);
      });

      const saveButton = screen.getByRole('button', { name: /update stack/i });
      await act(async () => {
        await user.click(saveButton);
      });

      // Step 7: Verify migration completed
      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalledWith(
          'stack-api',
          expect.objectContaining({
            blueprintId: 'blueprint-compatible',
          }),
          mockUser.email
        );
      });

      // Step 8: Verify blueprint selection updated
      await waitFor(() => {
        expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-compatible');
      });
    });
  });
});
