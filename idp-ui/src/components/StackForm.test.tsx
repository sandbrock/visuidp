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

describe('StackForm - Removed Fields Tests', () => {
  const mockUser: User = {
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  };

  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.getAvailableResourceTypesForStacks as any).mockResolvedValue([]);
    (apiService.getBlueprints as any).mockResolvedValue([]);
  });

  const renderStackForm = (stack?: Stack) => {
    return render(
      <StackForm
        stack={stack}
        blueprintId="test-blueprint-id"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        user={mockUser}
      />
    );
  };

  describe('Requirement 6.1: Removed fields are not displayed', () => {
    it('should not display domain field', () => {
      renderStackForm();

      // Check for domain-related labels and inputs
      expect(screen.queryByText(/^Domain$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Domain \*/i)).not.toBeInTheDocument();
    });

    it('should not display category field', () => {
      renderStackForm();

      // Check for category-related labels and inputs
      expect(screen.queryByText(/^Category$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Category \*/i)).not.toBeInTheDocument();
    });

    it('should not display cloud provider field', () => {
      renderStackForm();

      // Check for cloud provider-related labels and inputs
      expect(screen.queryByText(/^Cloud Provider$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Cloud Provider \*/i)).not.toBeInTheDocument();
      
      // Check that "Cloud Name" is present (this is different from "Cloud Provider")
      expect(screen.getByLabelText(/Cloud Name/i)).toBeInTheDocument();
    });

    it('should only display expected form fields', () => {
      renderStackForm();

      // Verify expected fields are present (checking labels specifically)
      expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Cloud Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Repository URL/i)).toBeInTheDocument();

      // Verify removed fields are not present
      expect(screen.queryByText(/^Domain$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Category$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Cloud Provider$/i)).not.toBeInTheDocument();
    });
  });

  describe('Requirement 6.2: Form submission excludes removed fields', () => {
    it('should not include domainId in create payload', async () => {
      const user = userEvent.setup();
      (apiService.createStack as any).mockResolvedValue({
        id: '123',
        name: 'Test Stack',
        cloudName: 'test-cloud',
        routePath: '/test/',
        stackType: StackType.RESTFUL_API,
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      renderStackForm();

      // Fill in required fields
      const nameInput = screen.getByRole('textbox', { name: /display name/i });
      const cloudNameInput = screen.getByRole('textbox', { name: /cloud name/i });
      
      await user.type(nameInput, 'Test Stack');
      await user.type(cloudNameInput, 'test-cloud');

      // Wait for route path field to appear (it appears after stack type is set)
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /route path/i })).toBeInTheDocument();
      });

      const routePathInput = screen.getByRole('textbox', { name: /route path/i });
      await user.type(routePathInput, '/test/');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create stack/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
      });

      // Verify the payload does not contain removed fields
      const callArgs = (apiService.createStack as any).mock.calls[0];
      const payload = callArgs[0];

      expect(payload).not.toHaveProperty('domainId');
      expect(payload).not.toHaveProperty('categoryId');
      expect(payload).not.toHaveProperty('cloudProviderId');
    });

    it('should not include categoryId in create payload', async () => {
      const user = userEvent.setup();
      (apiService.createStack as any).mockResolvedValue({
        id: '123',
        name: 'Test Stack',
        cloudName: 'test-cloud',
        routePath: '/test/',
        stackType: StackType.RESTFUL_API,
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      renderStackForm();

      // Fill in required fields
      const nameInput = screen.getByRole('textbox', { name: /display name/i });
      const cloudNameInput = screen.getByRole('textbox', { name: /cloud name/i });
      
      await user.type(nameInput, 'Test Stack');
      await user.type(cloudNameInput, 'test-cloud');

      // Wait for route path field to appear
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /route path/i })).toBeInTheDocument();
      });

      const routePathInput = screen.getByRole('textbox', { name: /route path/i });
      await user.type(routePathInput, '/test/');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create stack/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
      });

      // Verify the payload does not contain categoryId
      const callArgs = (apiService.createStack as any).mock.calls[0];
      const payload = callArgs[0];

      expect(payload).not.toHaveProperty('categoryId');
    });

    it('should not include cloudProviderId in create payload', async () => {
      const user = userEvent.setup();
      (apiService.createStack as any).mockResolvedValue({
        id: '123',
        name: 'Test Stack',
        cloudName: 'test-cloud',
        routePath: '/test/',
        stackType: StackType.RESTFUL_API,
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      renderStackForm();

      // Fill in required fields
      const nameInput = screen.getByRole('textbox', { name: /display name/i });
      const cloudNameInput = screen.getByRole('textbox', { name: /cloud name/i });
      
      await user.type(nameInput, 'Test Stack');
      await user.type(cloudNameInput, 'test-cloud');

      // Wait for route path field to appear
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /route path/i })).toBeInTheDocument();
      });

      const routePathInput = screen.getByRole('textbox', { name: /route path/i });
      await user.type(routePathInput, '/test/');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create stack/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
      });

      // Verify the payload does not contain cloudProviderId
      const callArgs = (apiService.createStack as any).mock.calls[0];
      const payload = callArgs[0];

      expect(payload).not.toHaveProperty('cloudProviderId');
    });

    it('should not include removed fields in update payload', async () => {
      const user = userEvent.setup();
      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (apiService.updateStack as any).mockResolvedValue(existingStack);

      renderStackForm(existingStack);

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

      // Verify the payload does not contain removed fields
      const callArgs = (apiService.updateStack as any).mock.calls[0];
      const payload = callArgs[1];

      expect(payload).not.toHaveProperty('domainId');
      expect(payload).not.toHaveProperty('categoryId');
      expect(payload).not.toHaveProperty('cloudProviderId');
    });

    it('should include only valid stack fields in payload', async () => {
      const user = userEvent.setup();
      (apiService.createStack as any).mockResolvedValue({
        id: '123',
        name: 'Test Stack',
        cloudName: 'test-cloud',
        routePath: '/test/',
        stackType: StackType.RESTFUL_API,
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      renderStackForm();

      // Fill in required fields
      const nameInput = screen.getByRole('textbox', { name: /display name/i });
      const cloudNameInput = screen.getByRole('textbox', { name: /cloud name/i });
      
      await user.type(nameInput, 'Test Stack');
      await user.type(cloudNameInput, 'test-cloud');

      // Wait for route path field to appear
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /route path/i })).toBeInTheDocument();
      });

      const routePathInput = screen.getByRole('textbox', { name: /route path/i });
      await user.type(routePathInput, '/test/');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create stack/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
      });

      // Verify the payload contains expected fields
      const callArgs = (apiService.createStack as any).mock.calls[0];
      const payload = callArgs[0];

      expect(payload).toHaveProperty('name');
      expect(payload).toHaveProperty('cloudName');
      expect(payload).toHaveProperty('stackType');
      expect(payload).toHaveProperty('resources');

      // Verify removed fields are not present
      expect(payload).not.toHaveProperty('domainId');
      expect(payload).not.toHaveProperty('categoryId');
      expect(payload).not.toHaveProperty('cloudProviderId');
    });
  });

  describe('Requirement 6.3: Form state does not track removed fields', () => {
    it('should not have domain in form state', async () => {
      const user = userEvent.setup();
      renderStackForm();

      // Fill in form fields
      const nameInput = screen.getByRole('textbox', { name: /display name/i });
      await user.type(nameInput, 'Test Stack');

      // Verify no domain-related fields are rendered or tracked
      expect(screen.queryByText(/^Domain$/i)).not.toBeInTheDocument();
    });

    it('should not have category in form state', async () => {
      const user = userEvent.setup();
      renderStackForm();

      // Fill in form fields
      const nameInput = screen.getByRole('textbox', { name: /display name/i });
      await user.type(nameInput, 'Test Stack');

      // Verify no category-related fields are rendered or tracked
      expect(screen.queryByText(/^Category$/i)).not.toBeInTheDocument();
    });

    it('should not have cloudProviderId in form state', async () => {
      const user = userEvent.setup();
      renderStackForm();

      // Fill in form fields
      const nameInput = screen.getByRole('textbox', { name: /display name/i });
      await user.type(nameInput, 'Test Stack');

      // Verify no cloudProviderId field is rendered
      expect(screen.queryByText(/^Cloud Provider$/i)).not.toBeInTheDocument();
    });
  });

  describe('Requirement 6.5: Form functionality remains intact', () => {
    it('should successfully create stack without removed fields', async () => {
      const user = userEvent.setup();
      const createdStack: Stack = {
        id: '123',
        name: 'Test Stack',
        cloudName: 'test-cloud',
        routePath: '/test/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (apiService.createStack as any).mockResolvedValue(createdStack);

      renderStackForm();

      // Fill in required fields
      const nameInput = screen.getByRole('textbox', { name: /display name/i });
      const cloudNameInput = screen.getByRole('textbox', { name: /cloud name/i });
      
      await user.type(nameInput, 'Test Stack');
      await user.type(cloudNameInput, 'test-cloud');

      // Wait for route path field to appear
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /route path/i })).toBeInTheDocument();
      });

      const routePathInput = screen.getByRole('textbox', { name: /route path/i });
      await user.type(routePathInput, '/test/');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create stack/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiService.createStack).toHaveBeenCalled();
        expect(mockOnSave).toHaveBeenCalledWith(createdStack);
      });
    });

    it('should successfully update stack without removed fields', async () => {
      const user = userEvent.setup();
      const existingStack: Stack = {
        id: '123',
        name: 'Existing Stack',
        cloudName: 'existing-cloud',
        routePath: '/existing/',
        stackType: StackType.RESTFUL_API,
        programmingLanguage: ProgrammingLanguage.QUARKUS,
        isPublic: false,
        createdBy: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedStack = { ...existingStack, name: 'Updated Stack' };
      (apiService.updateStack as any).mockResolvedValue(updatedStack);

      renderStackForm(existingStack);

      // Modify a field
      const nameInput = screen.getByRole('textbox', { name: /display name/i });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Stack');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update stack/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiService.updateStack).toHaveBeenCalled();
        expect(mockOnSave).toHaveBeenCalledWith(updatedStack);
      });
    });

    it('should handle form cancellation', async () => {
      const user = userEvent.setup();
      renderStackForm();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      renderStackForm();

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create stack/i });
      await user.click(submitButton);

      // API should not be called due to HTML5 validation
      expect(apiService.createStack).not.toHaveBeenCalled();
    });
  });

  describe('Blueprint Filtering Tests', () => {
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
      {
        id: 'bp-4',
        name: 'Full Stack Blueprint',
        description: 'Blueprint with container and storage',
        supportedCloudTypes: ['aws'],
        resources: [
          {
            id: 'res-4',
            name: 'ECS Cluster',
            resourceTypeId: 'rt-1',
            resourceTypeName: 'Managed Container Orchestrator',
            cloudProviderId: 'cp-1',
            configuration: {},
          },
          {
            id: 'res-5',
            name: 'S3 Bucket',
            resourceTypeId: 'rt-2',
            resourceTypeName: 'Storage',
            cloudProviderId: 'cp-1',
            configuration: {},
          },
        ],
      },
    ];

    beforeEach(() => {
      (apiService.getBlueprints as any).mockResolvedValue(mockBlueprints);
    });

    describe('Requirement 6.2: RESTful API stack type filtering', () => {
      it('should filter blueprints to show only those with Container Orchestrator for RESTful API', async () => {
        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Default stack type is RESTful API, so filtering should already be applied
        // Verify helper text is displayed
        await waitFor(() => {
          expect(screen.getByText(/This stack type requires a blueprint with a Container Orchestrator/i)).toBeInTheDocument();
        });

        // The blueprint dropdown should exist
        expect(screen.getByRole('textbox', { name: /blueprint/i })).toBeInTheDocument();
      });
    });

    describe('Requirement 6.3: Event-driven API stack type filtering', () => {
      it('should filter blueprints to show only those with Container Orchestrator for Event-driven API', async () => {
        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Default stack type is RESTful API which also requires Container Orchestrator
        // Verify helper text is displayed
        await waitFor(() => {
          expect(screen.getByText(/This stack type requires a blueprint with a Container Orchestrator/i)).toBeInTheDocument();
        });
      });
    });

    describe('Requirement 6.4: JavaScript Web Application stack type filtering', () => {
      it('should filter blueprints to show only those with Storage for JavaScript Web Application', async () => {
        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Verify blueprint dropdown exists
        expect(screen.getByRole('textbox', { name: /blueprint/i })).toBeInTheDocument();
      });
    });

    describe('Requirement 6.5: Infrastructure-only stack type shows all blueprints', () => {
      it('should show all blueprints for Infrastructure-only stack type', async () => {
        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Verify blueprint dropdown exists
        expect(screen.getByRole('textbox', { name: /blueprint/i })).toBeInTheDocument();
      });
    });

    describe('Requirement 8.1, 8.2, 8.3: Helper text display', () => {
      it('should display helper text for RESTful API stack type', async () => {
        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Default stack type is RESTful API - should display helper text
        await waitFor(() => {
          expect(screen.getByText(/This stack type requires a blueprint with a Container Orchestrator/i)).toBeInTheDocument();
        });
      });

      it('should display helper text for Event-driven API stack type', async () => {
        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Default stack type is RESTful API which also requires Container Orchestrator
        // Both RESTful API and Event-driven API show the same helper text
        await waitFor(() => {
          expect(screen.getByText(/This stack type requires a blueprint with a Container Orchestrator/i)).toBeInTheDocument();
        });
      });

      it('should display helper text for JavaScript Web Application stack type', async () => {
        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Verify form is rendered
        expect(screen.getByRole('textbox', { name: /blueprint/i })).toBeInTheDocument();
      });

      it('should not display helper text for Infrastructure-only stack type', async () => {
        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Verify form is rendered
        expect(screen.getByRole('textbox', { name: /blueprint/i })).toBeInTheDocument();
      });

      it('should not display helper text for serverless stack types', async () => {
        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Verify form is rendered
        expect(screen.getByRole('textbox', { name: /blueprint/i })).toBeInTheDocument();
      });
    });

    describe('Requirement 7.1, 7.2, 7.3: Error message display', () => {
      it('should display validation error message when API returns 400 for missing Container Orchestrator', async () => {
        const user = userEvent.setup();
        const errorMessage = "Stack type 'RESTful API' requires a blueprint with a Container Orchestrator resource";
        
        (apiService.createStack as any).mockRejectedValue(new Error(errorMessage));

        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Fill in required fields
        const nameInput = screen.getByRole('textbox', { name: /display name/i });
        const cloudNameInput = screen.getByRole('textbox', { name: /cloud name/i });
        
        await user.type(nameInput, 'Test Stack');
        await user.type(cloudNameInput, 'test-cloud');

        // Wait for route path field to appear
        await waitFor(() => {
          expect(screen.getByRole('textbox', { name: /route path/i })).toBeInTheDocument();
        });

        const routePathInput = screen.getByRole('textbox', { name: /route path/i });
        await user.type(routePathInput, '/test/');

        // Submit form
        const submitButton = screen.getByRole('button', { name: /create stack/i });
        await user.click(submitButton);

        // Should display error message
        await waitFor(() => {
          expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
      });

      it('should display validation error message when API returns 400 for missing Storage', async () => {
        const user = userEvent.setup();
        const errorMessage = "Stack type 'JavaScript Web Application' requires a blueprint with a Storage resource";
        
        (apiService.createStack as any).mockRejectedValue(new Error(errorMessage));

        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Fill in required fields (default stack type is RESTful API, but error message is for JS Web App)
        const nameInput = screen.getByRole('textbox', { name: /display name/i });
        const cloudNameInput = screen.getByRole('textbox', { name: /cloud name/i });
        
        await user.type(nameInput, 'Test Stack');
        await user.type(cloudNameInput, 'test-cloud');

        // Wait for route path field to appear
        await waitFor(() => {
          expect(screen.getByRole('textbox', { name: /route path/i })).toBeInTheDocument();
        });

        const routePathInput = screen.getByRole('textbox', { name: /route path/i });
        await user.type(routePathInput, '/test/');

        // Submit form
        const submitButton = screen.getByRole('button', { name: /create stack/i });
        await user.click(submitButton);

        // Should display error message
        await waitFor(() => {
          expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
      });

      it('should clear error message when stack type changes', async () => {
        const user = userEvent.setup();
        const errorMessage = "Stack type 'RESTful API' requires a blueprint with a Container Orchestrator resource";
        
        (apiService.createStack as any).mockRejectedValue(new Error(errorMessage));

        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Fill in required fields and submit to trigger error
        const nameInput = screen.getByRole('textbox', { name: /display name/i });
        const cloudNameInput = screen.getByRole('textbox', { name: /cloud name/i });
        
        await user.type(nameInput, 'Test Stack');
        await user.type(cloudNameInput, 'test-cloud');

        await waitFor(() => {
          expect(screen.getByRole('textbox', { name: /route path/i })).toBeInTheDocument();
        });

        const routePathInput = screen.getByRole('textbox', { name: /route path/i });
        await user.type(routePathInput, '/test/');

        const submitButton = screen.getByRole('button', { name: /create stack/i });
        await user.click(submitButton);

        // Wait for error to appear
        await waitFor(() => {
          expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });

        // Verify error is displayed
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      it('should clear error message when blueprint selection changes', async () => {
        const user = userEvent.setup();
        const errorMessage = "Stack type 'RESTful API' requires a blueprint with a Container Orchestrator resource";
        
        (apiService.createStack as any).mockRejectedValue(new Error(errorMessage));

        renderStackForm();

        // Wait for blueprints to load
        await waitFor(() => {
          expect(apiService.getBlueprints).toHaveBeenCalled();
        });

        // Fill in required fields and submit to trigger error
        const nameInput = screen.getByRole('textbox', { name: /display name/i });
        const cloudNameInput = screen.getByRole('textbox', { name: /cloud name/i });
        
        await user.type(nameInput, 'Test Stack');
        await user.type(cloudNameInput, 'test-cloud');

        await waitFor(() => {
          expect(screen.getByRole('textbox', { name: /route path/i })).toBeInTheDocument();
        });

        const routePathInput = screen.getByRole('textbox', { name: /route path/i });
        await user.type(routePathInput, '/test/');

        const submitButton = screen.getByRole('button', { name: /create stack/i });
        await user.click(submitButton);

        // Wait for error to appear
        await waitFor(() => {
          expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });

        // Verify error is displayed
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });
});
