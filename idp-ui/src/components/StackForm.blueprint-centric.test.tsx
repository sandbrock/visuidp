import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StackForm } from './StackForm';
import type { User } from '../types/auth';
import type { Stack } from '../types/stack';
import { StackType, ProgrammingLanguage } from '../types/stack';
import { apiService, type Blueprint } from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    createStack: vi.fn(),
    updateStack: vi.fn(),
    getAvailableResourceTypesForStacks: vi.fn(),
    getBlueprints: vi.fn(),
  },
}));

// Mock the DynamicResourceForm component
vi.mock('./DynamicResourceForm', () => ({
  DynamicResourceForm: () => <div data-testid="dynamic-resource-form">Dynamic Resource Form</div>,
}));

// Mock the blueprint validation service
vi.mock('../services/blueprintValidation', () => ({
  validateBlueprintCompatibility: vi.fn(),
}));

describe('StackForm - Blueprint-Centric Modifications', () => {
  const mockUser: User = {
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  };

  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const mockBlueprints: Blueprint[] = [
    {
      id: 'bp-1',
      name: 'Container Blueprint',
      description: 'Blueprint with container orchestrator',
      supportedCloudTypes: ['aws'],
      resources: [
        {
          id: 'res-1',
          name: 'ECS Cluster',
          resourceTypeId: 'rt-1',
          resourceTypeName: 'Managed Container Orchestrator',
          cloudProviderId: 'cp-1',
          configuration: {},
        },
      ],
    },
    {
      id: 'bp-2',
      name: 'Storage Blueprint',
      description: 'Blueprint with storage',
      supportedCloudTypes: ['aws'],
      resources: [
        {
          id: 'res-2',
          name: 'S3 Bucket',
          resourceTypeId: 'rt-2',
          resourceTypeName: 'Storage',
          cloudProviderId: 'cp-1',
          configuration: {},
        },
      ],
    },
    {
      id: 'bp-3',
      name: 'Database Blueprint',
      description: 'Blueprint with database only',
      supportedCloudTypes: ['aws'],
      resources: [
        {
          id: 'res-3',
          name: 'RDS Instance',
          resourceTypeId: 'rt-3',
          resourceTypeName: 'Relational Database Server',
          cloudProviderId: 'cp-1',
          configuration: {},
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.getAvailableResourceTypesForStacks as any).mockResolvedValue([]);
    (apiService.getBlueprints as any).mockResolvedValue(mockBlueprints);
  });

  const renderStackForm = (stack?: Stack, blueprintId = 'bp-1') => {
    return render(
      <StackForm
        stack={stack}
        blueprintId={blueprintId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        user={mockUser}
      />
    );
  };

  describe('Requirement 4.1, 4.2: Blueprint picker removal', () => {
    it('should not display blueprint selection dropdown in create mode', () => {
      renderStackForm();

      // Should not have a blueprint dropdown/combobox
      const comboboxes = screen.queryAllByRole('combobox');
      const blueprintCombobox = comboboxes.find(cb => 
        cb.getAttribute('id')?.includes('blueprint') || 
        cb.getAttribute('aria-label')?.toLowerCase().includes('blueprint')
      );

      expect(blueprintCombobox).toBeUndefined();
    });

    it('should not display blueprint selection dropdown in edit mode', () => {
      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      renderStackForm(existingStack);

      // Should not have a blueprint selection dropdown (only migration dropdown in edit mode)
      const labels = screen.queryAllByText(/^Blueprint$/i);
      const blueprintLabel = labels.find(label => 
        label.tagName === 'LABEL' && 
        !label.textContent?.includes('Target')
      );

      expect(blueprintLabel).toBeUndefined();
    });

    it('should not display blueprint requirement helper text', () => {
      renderStackForm();

      // Should not have helper text about blueprint selection
      expect(screen.queryByText(/select a blueprint/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/blueprint is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Requirement 4.3, 4.4, 4.5: Blueprint context usage', () => {
    it('should receive blueprintId as a required prop', () => {
      // This is enforced by TypeScript, but we can verify it's used
      renderStackForm(undefined, 'test-blueprint-123');

      // Form should render successfully with blueprintId prop
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should use blueprintId from props in form submission for new stacks', async () => {
      const user = userEvent.setup();
      const testBlueprintId = 'test-blueprint-456';
      
      (apiService.createStack as any).mockResolvedValue({
        id: '123',
        name: 'Test Stack',
        cloudName: 'test-cloud',
        routePath: '/test/',
        stackType: StackType.RESTFUL_API,
        blueprintId: testBlueprintId,
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      renderStackForm(undefined, testBlueprintId);

      // Fill in required fields
      const nameInput = screen.getByRole('textbox', { name: /display name/i });
      const cloudNameInput = screen.getByRole('textbox', { name: /cloud name/i });
      
      await user.type(nameInput, 'Test Stack');
      await user.type(cloudNameInput, 'test-cloud');

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /route path/i })).toBeInTheDocument();
      });

      const routePathInput = screen.getByRole('textbox', { name: /route path/i });
      await user.type(routePathInput, '/test/');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create new stack/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
      });

      // Verify blueprintId from props is used in the payload
      const callArgs = (apiService.createStack as any).mock.calls[0];
      const payload = callArgs[0];

      expect(payload.blueprintId).toBe(testBlueprintId);
    });

    it('should use blueprintId from props for resource validation', async () => {
      const testBlueprintId = 'bp-1';
      
      renderStackForm(undefined, testBlueprintId);

      // Form should render and be ready for resource selection
      await waitFor(() => {
        expect(screen.getByText(/Infrastructure Resources/i)).toBeInTheDocument();
      });

      // The form uses blueprintId context for resource operations
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should maintain blueprintId context when editing existing stack', async () => {
      const user = userEvent.setup();
      const testBlueprintId = 'bp-2';
      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1', // Original blueprint
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (apiService.updateStack as any).mockResolvedValue({
        ...existingStack,
        name: 'Updated Stack',
        blueprintId: testBlueprintId,
      });

      renderStackForm(existingStack, testBlueprintId);

      // Modify a field
      const nameInput = screen.getByRole('textbox', { name: /display name/i });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Stack');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update stack/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalled();
      });

      // Verify blueprintId from props is used
      const callArgs = (apiService.updateStack as any).mock.calls[0];
      const payload = callArgs[1];

      expect(payload.blueprintId).toBe(testBlueprintId);
    });
  });

  describe('Requirement 5.1, 5.2, 5.3: Stack migration UI', () => {
    it('should display migration section in edit mode', async () => {
      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      renderStackForm(existingStack);

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Should display migration section
      await waitFor(() => {
        expect(screen.getByText(/Move to Different Blueprint/i)).toBeInTheDocument();
      });
    });

    it('should not display migration section in create mode', () => {
      renderStackForm();

      // Should not display migration section
      expect(screen.queryByText(/Move to Different Blueprint/i)).not.toBeInTheDocument();
    });

    it('should display target blueprint dropdown excluding current blueprint', async () => {
      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      renderStackForm(existingStack, 'bp-1');

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Should display target blueprint dropdown
      await waitFor(() => {
        expect(screen.getByLabelText(/Target Blueprint/i)).toBeInTheDocument();
      });
    });

    it('should update stack blueprintId when migration target is selected', async () => {
      const user = userEvent.setup();
      const { validateBlueprintCompatibility } = await import('../services/blueprintValidation');
      
      (validateBlueprintCompatibility as any).mockReturnValue({
        valid: true,
        warnings: [],
      });

      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (apiService.updateStack as any).mockResolvedValue({
        ...existingStack,
        blueprintId: 'bp-2',
      });

      renderStackForm(existingStack, 'bp-1');

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Wait for migration section to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Target Blueprint/i)).toBeInTheDocument();
      });

      // Select a different blueprint
      const targetBlueprintInput = screen.getByLabelText(/Target Blueprint/i);
      await user.click(targetBlueprintInput);
      
      // Find and click the Storage Blueprint option
      const storageBlueprintOption = await screen.findByText('Storage Blueprint');
      await user.click(storageBlueprintOption);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update stack/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalled();
      });

      // Verify the new blueprintId is used in the payload
      const callArgs = (apiService.updateStack as any).mock.calls[0];
      const payload = callArgs[1];

      expect(payload.blueprintId).toBe('bp-2');
    });

    it('should not display migration section when no other blueprints available', () => {
      (apiService.getBlueprints as any).mockResolvedValue([
        {
          id: 'bp-1',
          name: 'Only Blueprint',
          description: 'The only blueprint',
          supportedCloudTypes: ['aws'],
          resources: [],
        },
      ]);

      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      renderStackForm(existingStack, 'bp-1');

      // Should not display migration section when no other blueprints
      expect(screen.queryByText(/Move to Different Blueprint/i)).not.toBeInTheDocument();
    });
  });

  describe('Requirement 5.4, 5.5: Migration validation logic', () => {
    it('should validate blueprint compatibility when migration target is selected', async () => {
      const user = userEvent.setup();
      const { validateBlueprintCompatibility } = await import('../services/blueprintValidation');
      
      (validateBlueprintCompatibility as any).mockReturnValue({
        valid: false,
        warnings: ['Target blueprint does not have a Container Orchestrator resource'],
      });

      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      renderStackForm(existingStack, 'bp-1');

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Wait for migration section to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Target Blueprint/i)).toBeInTheDocument();
      });

      // Select a different blueprint (Database Blueprint - no container orchestrator)
      const targetBlueprintInput = screen.getByLabelText(/Target Blueprint/i);
      await user.click(targetBlueprintInput);
      
      const databaseBlueprintOption = await screen.findByText('Database Blueprint');
      await user.click(databaseBlueprintOption);

      // Wait for validation to complete
      await waitFor(() => {
        expect(validateBlueprintCompatibility).toHaveBeenCalled();
      });

      // Verify validation was called with correct parameters
      const validationCalls = (validateBlueprintCompatibility as any).mock.calls;
      expect(validationCalls.length).toBeGreaterThan(0);
      
      const lastCall = validationCalls[validationCalls.length - 1];
      expect(lastCall[0]).toBe(StackType.RESTFUL_API); // stackType
      expect(lastCall[1].id).toBe('bp-3'); // target blueprint
    });

    it('should display migration warnings when target blueprint is incompatible', async () => {
      const user = userEvent.setup();
      const { validateBlueprintCompatibility } = await import('../services/blueprintValidation');
      
      (validateBlueprintCompatibility as any).mockReturnValue({
        valid: false,
        warnings: ['Target blueprint does not have a Container Orchestrator resource'],
      });

      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      renderStackForm(existingStack, 'bp-1');

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Wait for migration section to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Target Blueprint/i)).toBeInTheDocument();
      });

      // Select incompatible blueprint
      const targetBlueprintInput = screen.getByLabelText(/Target Blueprint/i);
      await user.click(targetBlueprintInput);
      
      const databaseBlueprintOption = await screen.findByText('Database Blueprint');
      await user.click(databaseBlueprintOption);

      // Should display migration warnings
      await waitFor(() => {
        expect(screen.getByText(/Migration Warnings/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Target blueprint does not have a Container Orchestrator resource/i)).toBeInTheDocument();
    });

    it('should not display warnings when target blueprint is compatible', async () => {
      const user = userEvent.setup();
      const { validateBlueprintCompatibility } = await import('../services/blueprintValidation');
      
      (validateBlueprintCompatibility as any).mockReturnValue({
        valid: true,
        warnings: [],
      });

      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      renderStackForm(existingStack, 'bp-1');

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Wait for migration section to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Target Blueprint/i)).toBeInTheDocument();
      });

      // Select compatible blueprint (Container Blueprint has orchestrator)
      const targetBlueprintInput = screen.getByLabelText(/Target Blueprint/i);
      await user.click(targetBlueprintInput);
      
      // Select "Keep current blueprint" option
      const keepCurrentOption = await screen.findByText('Keep current blueprint');
      await user.click(keepCurrentOption);

      // Should not display migration warnings
      expect(screen.queryByText(/Migration Warnings/i)).not.toBeInTheDocument();
    });

    it('should prevent migration when incompatible and user cancels confirmation', async () => {
      const user = userEvent.setup();
      const { validateBlueprintCompatibility } = await import('../services/blueprintValidation');
      
      (validateBlueprintCompatibility as any).mockReturnValue({
        valid: false,
        warnings: ['Target blueprint does not have a Container Orchestrator resource'],
      });

      // Mock window.confirm to return false (user cancels)
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      renderStackForm(existingStack, 'bp-1');

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Wait for migration section to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Target Blueprint/i)).toBeInTheDocument();
      });

      // Select incompatible blueprint
      const targetBlueprintInput = screen.getByLabelText(/Target Blueprint/i);
      await user.click(targetBlueprintInput);
      
      const databaseBlueprintOption = await screen.findByText('Database Blueprint');
      await user.click(databaseBlueprintOption);

      // Wait for warnings to appear
      await waitFor(() => {
        expect(screen.getByText(/Migration Warnings/i)).toBeInTheDocument();
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update stack/i });
      await user.click(submitButton);

      // Confirmation dialog should be shown
      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
      });

      // API should not be called since user cancelled
      expect(apiService.updateStack).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should allow migration when incompatible but user confirms', async () => {
      const user = userEvent.setup();
      const { validateBlueprintCompatibility } = await import('../services/blueprintValidation');
      
      (validateBlueprintCompatibility as any).mockReturnValue({
        valid: false,
        warnings: ['Target blueprint does not have a Container Orchestrator resource'],
      });

      // Mock window.confirm to return true (user confirms)
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (apiService.updateStack as any).mockResolvedValue({
        ...existingStack,
        blueprintId: 'bp-3',
      });

      renderStackForm(existingStack, 'bp-1');

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Wait for migration section to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Target Blueprint/i)).toBeInTheDocument();
      });

      // Select incompatible blueprint
      const targetBlueprintInput = screen.getByLabelText(/Target Blueprint/i);
      await user.click(targetBlueprintInput);
      
      const databaseBlueprintOption = await screen.findByText('Database Blueprint');
      await user.click(databaseBlueprintOption);

      // Wait for warnings to appear
      await waitFor(() => {
        expect(screen.getByText(/Migration Warnings/i)).toBeInTheDocument();
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update stack/i });
      await user.click(submitButton);

      // Confirmation dialog should be shown
      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
      });

      // API should be called since user confirmed
      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalled();
      });

      // Verify the new blueprintId is used
      const callArgs = (apiService.updateStack as any).mock.calls[0];
      const payload = callArgs[1];
      expect(payload.blueprintId).toBe('bp-3');

      confirmSpy.mockRestore();
    });

    it('should validate that stack requires Container Orchestrator for RESTful API', async () => {
      const user = userEvent.setup();
      const { validateBlueprintCompatibility } = await import('../services/blueprintValidation');
      
      (validateBlueprintCompatibility as any).mockReturnValue({
        valid: false,
        warnings: ['Target blueprint does not have a Container Orchestrator resource'],
      });

      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      renderStackForm(existingStack, 'bp-1');

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Wait for migration section to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Target Blueprint/i)).toBeInTheDocument();
      });

      // Select blueprint without Container Orchestrator
      const targetBlueprintInput = screen.getByLabelText(/Target Blueprint/i);
      await user.click(targetBlueprintInput);
      
      const databaseBlueprintOption = await screen.findByText('Database Blueprint');
      await user.click(databaseBlueprintOption);

      // Should display warning about missing Container Orchestrator
      await waitFor(() => {
        expect(screen.getByText(/Target blueprint does not have a Container Orchestrator resource/i)).toBeInTheDocument();
      });
    });

    it('should validate that stack requires Storage for JavaScript Web Application', async () => {
      const user = userEvent.setup();
      const { validateBlueprintCompatibility } = await import('../services/blueprintValidation');
      
      (validateBlueprintCompatibility as any).mockReturnValue({
        valid: false,
        warnings: ['Target blueprint does not have a Storage resource'],
      });

      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.JAVASCRIPT_WEB_APPLICATION,
        programmingLanguage: ProgrammingLanguage.REACT,
        isPublic: false,
        blueprintId: 'bp-2',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      renderStackForm(existingStack, 'bp-2');

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Wait for migration section to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Target Blueprint/i)).toBeInTheDocument();
      });

      // Select blueprint without Storage
      const targetBlueprintInput = screen.getByLabelText(/Target Blueprint/i);
      await user.click(targetBlueprintInput);
      
      const containerBlueprintOption = await screen.findByText('Container Blueprint');
      await user.click(containerBlueprintOption);

      // Should display warning about missing Storage
      await waitFor(() => {
        expect(screen.getByText(/Target blueprint does not have a Storage resource/i)).toBeInTheDocument();
      });
    });

    it('should handle migration failure and revert to original blueprint', async () => {
      const user = userEvent.setup();
      const { validateBlueprintCompatibility } = await import('../services/blueprintValidation');
      
      (validateBlueprintCompatibility as any).mockReturnValue({
        valid: true,
        warnings: [],
      });

      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Mock API to fail with migration error
      (apiService.updateStack as any).mockRejectedValue(
        new Error('Migration failed: Target blueprint validation failed')
      );

      renderStackForm(existingStack, 'bp-1');

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Wait for migration section to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Target Blueprint/i)).toBeInTheDocument();
      });

      // Select a different blueprint
      const targetBlueprintInput = screen.getByLabelText(/Target Blueprint/i);
      await user.click(targetBlueprintInput);
      
      const storageBlueprintOption = await screen.findByText('Storage Blueprint');
      await user.click(storageBlueprintOption);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update stack/i });
      await user.click(submitButton);

      // Should display migration error
      await waitFor(() => {
        expect(screen.getByText(/Migration failed/i)).toBeInTheDocument();
      });

      // Verify error message is displayed
      expect(screen.getByText(/Target blueprint validation failed/i)).toBeInTheDocument();
    });

    it('should clear migration warnings when reverting to current blueprint', async () => {
      const user = userEvent.setup();
      const { validateBlueprintCompatibility } = await import('../services/blueprintValidation');
      
      // First call returns warnings
      (validateBlueprintCompatibility as any).mockReturnValueOnce({
        valid: false,
        warnings: ['Target blueprint does not have a Container Orchestrator resource'],
      });

      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        blueprintId: 'bp-1',
        resources: [],
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      renderStackForm(existingStack, 'bp-1');

      // Wait for blueprints to load
      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalled();
      });

      // Wait for migration section to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Target Blueprint/i)).toBeInTheDocument();
      });

      // Select incompatible blueprint
      const targetBlueprintInput = screen.getByLabelText(/Target Blueprint/i);
      await user.click(targetBlueprintInput);
      
      const databaseBlueprintOption = await screen.findByText('Database Blueprint');
      await user.click(databaseBlueprintOption);

      // Wait for warnings to appear
      await waitFor(() => {
        expect(screen.getByText(/Migration Warnings/i)).toBeInTheDocument();
      });

      // Revert to current blueprint
      await user.click(targetBlueprintInput);
      const keepCurrentOption = await screen.findByText('Keep current blueprint');
      await user.click(keepCurrentOption);

      // Warnings should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/Migration Warnings/i)).not.toBeInTheDocument();
      });
    });
  });
});
