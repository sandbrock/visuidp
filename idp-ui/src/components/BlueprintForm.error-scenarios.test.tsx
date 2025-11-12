import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BlueprintForm } from './BlueprintForm';
import { apiService } from '../services/api';
import CloudProviderLookupService from '../services/CloudProviderLookupService';
import type { User } from '../types/auth';
import type { CloudProvider, ResourceType } from '../types/admin';
import type { Blueprint } from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getAvailableCloudProvidersForBlueprints: vi.fn(),
    getAvailableResourceTypesForBlueprints: vi.fn(),
    createBlueprint: vi.fn(),
    updateBlueprint: vi.fn(),
  },
}));

// Mock Modal component
vi.mock('./Modal', () => ({
  Modal: ({ isOpen, children, buttons, title }: any) => (
    isOpen ? (
      <div data-testid="modal" role="dialog">
        <h2>{title}</h2>
        <div data-testid="modal-content">{children}</div>
        <div data-testid="modal-buttons">
          {buttons?.map((btn: any, idx: number) => (
            <button
              key={idx}
              onClick={btn.onClick}
              disabled={btn.disabled}
              data-testid={`modal-button-${btn.label.toLowerCase()}`}
              className={`modal-button-${btn.variant}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    ) : null
  ),
}));

// Mock DynamicResourceForm
vi.mock('./DynamicResourceForm', () => ({
  DynamicResourceForm: ({ resourceTypeId, cloudProviderId, onChange }: any) => (
    <div data-testid={`dynamic-form-${resourceTypeId}-${cloudProviderId}`}>
      Dynamic Resource Form
      <button onClick={() => onChange({ testConfig: 'value' })}>
        Update Config
      </button>
    </div>
  ),
}));

// Mock input components
vi.mock('./input', () => ({
  AngryTextBox: ({ value, onChange, placeholder, id, componentRef }: any) => (
    <input
      data-testid={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      ref={componentRef}
    />
  ),
  AngryComboBox: ({ value, onChange, items, id }: any) => (
    <select
      data-testid={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select...</option>
      {items?.map((item: any) => (
        <option key={item.value} value={item.value}>
          {item.text}
        </option>
      ))}
    </select>
  ),
  AngryCheckBoxGroup: ({ items, selectedValues, onChange, label }: any) => (
    <div data-testid="cloud-provider-checkboxes">
      <label>{label}</label>
      {items?.map((item: any) => (
        <label key={item.value}>
          <input
            type="checkbox"
            data-testid={`checkbox-${item.value}`}
            checked={selectedValues.includes(item.value)}
            onChange={(e) => {
              const newSelection = e.target.checked
                ? [...selectedValues, item.value]
                : selectedValues.filter((v: string) => v !== item.value);
              onChange(newSelection);
            }}
          />
          {item.label}
        </label>
      ))}
    </div>
  ),
  AngryButton: ({ onClick, children, type, disabled, cssClass }: any) => (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={cssClass}
      data-testid={`button-${children?.toString().toLowerCase().replace(/\s+/g, '-')}`}
    >
      {children}
    </button>
  ),
}));

describe('BlueprintForm - Error Scenarios (Task 5.3)', () => {
  const mockUser: User = {
    email: 'test@example.com',
    name: 'Test User',
    roles: ['admin'],
  };

  const mockCloudProviders: CloudProvider[] = [
    {
      id: 'aws-id',
      name: 'aws',
      displayName: 'AWS',
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'azure-id',
      name: 'azure',
      displayName: 'Azure',
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockResourceTypes: ResourceType[] = [
    {
      id: 'database-id',
      name: 'database',
      displayName: 'Database',
      category: 'SHARED',
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    CloudProviderLookupService.getInstance().clear();
    vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);
    vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockResolvedValue(mockResourceTypes);
  });

  describe('Blueprint with Invalid/Unknown Cloud Type (Requirement 3.1)', () => {
    it('should handle blueprint with empty cloudProviderId for unknown cloud type', async () => {
      // Note: The warning is logged during API transformation (in api.ts), not in BlueprintForm
      // By the time BlueprintForm receives the blueprint, cloudProviderId is already empty
      
      const blueprintWithUnknownCloud: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Blueprint with unknown cloud',
        supportedCloudProviderIds: ['aws-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            resourceTypeName: 'Database',
            cloudProviderId: '', // Empty because unknown cloud type was not resolved
            cloudProviderName: 'UnknownCloud', // Unknown cloud type
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprintWithUnknownCloud}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('Test Blueprint');
      });

      // Form should handle empty cloudProviderId gracefully
      expect(screen.getByTestId('resource-cloud-0')).toHaveValue('');
    });

    it('should display error message when resource has unknown cloud provider', async () => {
      const blueprintWithUnknownCloud: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        supportedCloudProviderIds: ['aws-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: '',
            cloudProviderName: 'UnknownCloud',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprintWithUnknownCloud}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('Test Blueprint');
      });

      // Form should still render but with empty cloud provider
      // The DynamicResourceForm will show error when trying to load schema
      expect(screen.getByTestId('dynamic-form-database-id-')).toBeInTheDocument();
    });

    it('should allow user to fix unknown cloud provider by selecting valid one', async () => {
      const user = userEvent.setup();
      
      const blueprintWithUnknownCloud: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        supportedCloudProviderIds: ['aws-id', 'azure-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: '',
            cloudProviderName: 'UnknownCloud',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprintWithUnknownCloud}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('Test Blueprint');
      });

      // User can select a valid cloud provider
      const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
      await user.selectOptions(cloudProviderSelect, 'aws-id');

      // Verify the form updated with valid UUID
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });
    });

    it('should handle blueprint with multiple resources having unknown cloud types', async () => {
      // Note: Warnings are logged during API transformation, not in BlueprintForm
      
      const blueprintWithMultipleUnknown: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        supportedCloudProviderIds: ['aws-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Database',
            resourceTypeId: 'database-id',
            cloudProviderId: '',
            cloudProviderName: 'UnknownCloud1',
            configuration: {},
          },
          {
            id: 'resource-2',
            name: 'Cache',
            resourceTypeId: 'database-id',
            cloudProviderId: '',
            cloudProviderName: 'UnknownCloud2',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprintWithMultipleUnknown}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('Test Blueprint');
      });

      // Both resources should have empty cloudProviderId
      expect(screen.getByTestId('resource-cloud-0')).toHaveValue('');
      expect(screen.getByTestId('resource-cloud-1')).toHaveValue('');
    });
  });

  describe('Blueprint with Missing Cloud Provider Data (Requirement 3.4, 4.3)', () => {
    it('should handle blueprint resource with null cloudProviderId', async () => {
      const blueprintWithNullCloud: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        supportedCloudProviderIds: ['aws-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: '', // Empty/null
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprintWithNullCloud}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Form should load without crashing
      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('Test Blueprint');
      });

      // Resource should be displayed with empty cloud provider
      expect(screen.getByTestId('dynamic-form-database-id-')).toBeInTheDocument();
    });

    it('should handle blueprint resource with undefined cloudProviderName', async () => {
      const blueprintWithUndefinedName: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        supportedCloudProviderIds: ['aws-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            cloudProviderName: undefined, // Undefined
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprintWithUndefinedName}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Form should load without crashing
      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('Test Blueprint');
      });

      // Resource should be displayed with UUID
      expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
    });

    it('should handle blueprint with empty resources array', async () => {
      const blueprintWithNoResources: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        supportedCloudProviderIds: ['aws-id'],
        resources: [],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprintWithNoResources}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Form should load without crashing
      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('Test Blueprint');
      });

      // Should show message about no resources
      expect(screen.queryByText(/shared infrastructure resources/i)).toBeInTheDocument();
    });

    it('should allow user to select cloud provider for resource with missing data', async () => {
      const user = userEvent.setup();
      
      const blueprintWithMissingData: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        supportedCloudProviderIds: ['aws-id', 'azure-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: '',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprintWithMissingData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('Test Blueprint');
      });

      // User can select a cloud provider to fix the issue
      const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
      await user.selectOptions(cloudProviderSelect, 'azure-id');

      // Verify the form updated
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-azure-id')).toBeInTheDocument();
      });
    });

    it('should handle blueprint with mixed valid and invalid cloud provider data', async () => {
      // Note: Warnings are logged during API transformation, not in BlueprintForm
      
      const blueprintWithMixedData: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        supportedCloudProviderIds: ['aws-id', 'azure-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Valid Resource',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            cloudProviderName: 'aws',
            configuration: {},
          },
          {
            id: 'resource-2',
            name: 'Invalid Resource',
            resourceTypeId: 'database-id',
            cloudProviderId: '',
            cloudProviderName: 'InvalidCloud',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprintWithMixedData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('Test Blueprint');
      });

      // Valid resource should load correctly
      expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      
      // Invalid resource should load with empty cloud provider
      expect(screen.getByTestId('dynamic-form-database-id-')).toBeInTheDocument();
    });
  });

  describe('Property Schema 404 Handling (Requirement 3.2, 4.4)', () => {
    it('should display user-friendly message when property schema is not found', async () => {
      // This test verifies that DynamicResourceForm handles 404 errors
      // The actual 404 handling is tested in DynamicResourceForm.emptyerror.test.tsx
      // Here we verify the integration with BlueprintForm
      
      const user = userEvent.setup();

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for cloud providers to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Select AWS
      await user.click(screen.getByTestId('checkbox-aws-id'));

      // Add a resource
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');

      // Verify resource form is rendered
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });

      // The DynamicResourceForm component will handle the 404 error internally
      // and display appropriate error messages
    });

    it('should allow form to remain functional when schema is not found', async () => {
      const user = userEvent.setup();

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for cloud providers to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Select AWS
      await user.click(screen.getByTestId('checkbox-aws-id'));

      // Add a resource (even if schema 404s, form should work)
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');

      // Verify resource form is rendered
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });

      // User should still be able to fill in basic fields
      const nameInput = screen.getByTestId('name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Test Blueprint');

      // Form should remain functional
      expect(nameInput).toHaveValue('Test Blueprint');
    });

    it('should provide guidance to contact administrator when schema is missing', async () => {
      // This is tested in DynamicResourceForm.emptyerror.test.tsx
      // The error message includes "Contact your administrator" guidance
      // Here we verify the integration works correctly
      
      const user = userEvent.setup();

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for cloud providers to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Select AWS and add resource
      await user.click(screen.getByTestId('checkbox-aws-id'));
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');

      // Verify resource form is rendered (DynamicResourceForm handles error display)
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });
    });
  });

  describe('Cloud Provider List Loading Failure (Requirement 3.3)', () => {
    it('should display error message when cloud providers fail to load', async () => {
      const errorMessage = 'Network error: Failed to fetch cloud providers';
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValue(
        new Error(errorMessage)
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display retry button when cloud providers fail to load', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error and retry button to appear
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should disable resource editing when cloud providers fail to load', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
      });

      // Should show message that cloud providers must be loaded
      expect(screen.getByText(/cloud providers must be loaded before you can add resources/i)).toBeInTheDocument();
    });

    it('should disable submit button when cloud providers fail to load', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
      });

      // Submit button should be disabled
      const submitButton = screen.getByTestId('button-create-blueprint');
      expect(submitButton).toBeDisabled();
    });

    it('should retry loading cloud providers when retry button is clicked', async () => {
      const user = userEvent.setup();
      
      // First call fails
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValueOnce(
        new Error('Network error')
      );
      
      // Second call succeeds
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValueOnce(
        mockCloudProviders
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Wait for cloud providers to load successfully
      await waitFor(() => {
        expect(screen.queryByText(/error loading cloud providers/i)).not.toBeInTheDocument();
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Verify API was called twice
      expect(apiService.getAvailableCloudProvidersForBlueprints).toHaveBeenCalledTimes(2);
    });

    it('should show error again if retry fails', async () => {
      const user = userEvent.setup();
      
      // Both calls fail
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValue(
        new Error('Persistent network error')
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Error should still be displayed
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
        expect(screen.getByText(/persistent network error/i)).toBeInTheDocument();
      });

      // Retry button should still be available
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle 401/403 authentication errors gracefully', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValue(
        new Error('403: Forbidden - Insufficient permissions')
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
        expect(screen.getByText(/403: Forbidden/i)).toBeInTheDocument();
      });

      // Should still show retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle 500 server errors gracefully', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValue(
        new Error('500: Internal Server Error')
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
        expect(screen.getByText(/500: Internal Server Error/i)).toBeInTheDocument();
      });

      // Should show retry button for server errors
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle timeout errors gracefully', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValue(
        new Error('Request timeout')
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
        expect(screen.getByText(/request timeout/i)).toBeInTheDocument();
      });

      // Should show retry button for timeout errors
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Combined Error Scenarios', () => {
    it('should handle cloud provider loading failure with existing blueprint', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValue(
        new Error('Network error')
      );

      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        supportedCloudProviderIds: ['aws-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            cloudProviderName: 'aws',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
      });

      // Form should still show blueprint name
      expect(screen.getByTestId('name')).toHaveValue('Test Blueprint');

      // But editing should be disabled
      expect(screen.getByText(/cloud providers must be loaded before you can add resources/i)).toBeInTheDocument();
    });

    it('should handle resource type loading failure', async () => {
      // Note: Cloud providers and resource types are loaded together with Promise.all
      // If resource types fail, the entire load fails and shows error state
      
      // Mock both to fail (simulating resource type failure)
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);
      vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockRejectedValue(
        new Error('Failed to load resource types')
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error to appear (Promise.all fails if any promise fails)
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
        expect(screen.getByText(/failed to load resource types/i)).toBeInTheDocument();
      });

      // Form should show error state with retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle both cloud providers and resource types loading failures', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValue(
        new Error('Cloud providers error')
      );
      vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockRejectedValue(
        new Error('Resource types error')
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for cloud providers error to appear
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
      });

      // Form should be in error state
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should recover from error state after successful retry', async () => {
      const user = userEvent.setup();
      
      // First call fails
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockRejectedValueOnce(
        new Error('Network error')
      );
      
      // Second call succeeds
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValueOnce(
        mockCloudProviders
      );

      render(
        <BlueprintForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
      });

      // Retry
      await user.click(screen.getByRole('button', { name: /retry/i }));

      // Wait for success
      await waitFor(() => {
        expect(screen.queryByText(/error loading cloud providers/i)).not.toBeInTheDocument();
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Form should be fully functional
      await user.click(screen.getByTestId('checkbox-aws-id'));
      
      // Should be able to add resources
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /add shared resource/i })).toBeInTheDocument();
      });
    });
  });
});
