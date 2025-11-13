import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { StackForm } from './StackForm';
import type { User } from '../types/auth';
import type { Stack } from '../types/stack';
import { StackType, ProgrammingLanguage } from '../types/stack';
import { apiService } from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    createStack: vi.fn(),
    updateStack: vi.fn(),
    getAvailableResourceTypesForStacks: vi.fn(),
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
  });

  const renderStackForm = (stack?: Stack) => {
    return render(
      <StackForm
        stack={stack}
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
      expect(screen.getByText(/Cloud Name \*/i)).toBeInTheDocument();
    });

    it('should only display expected form fields', () => {
      renderStackForm();

      // Verify expected fields are present
      expect(screen.getByText(/Display Name \*/i)).toBeInTheDocument();
      expect(screen.getByText(/Cloud Name \*/i)).toBeInTheDocument();
      expect(screen.getByText(/Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Repository URL/i)).toBeInTheDocument();

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
});
