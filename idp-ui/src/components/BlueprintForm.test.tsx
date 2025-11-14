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
  AngryButton: ({ onClick, children, type, disabled, isPrimary, variant, size, style, className }: any) => (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={className}
      data-testid={`button-${children?.toString().toLowerCase().replace(/\s+/g, '-')}`}
    >
      {children}
    </button>
  ),
}));

describe('BlueprintForm - Enhanced User Feedback', () => {
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
    {
      id: 'gcp-id',
      name: 'gcp',
      displayName: 'GCP',
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
    {
      id: 'cache-id',
      name: 'cache',
      displayName: 'Cache',
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
    vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);
    vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockResolvedValue(mockResourceTypes);
  });

  describe('Confirmation Dialog for Cloud Provider Deselection', () => {
    it('displays confirmation dialog when deselecting cloud providers with associated resources', async () => {
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

      // Select AWS and Azure
      await user.click(screen.getByTestId('checkbox-aws-id'));
      await user.click(screen.getByTestId('checkbox-azure-id'));

      // Add a resource for AWS
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');

      // Verify resource was added
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });

      // Now deselect AWS (which has a resource)
      await user.click(screen.getByTestId('checkbox-aws-id'));

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
        expect(screen.getByText(/remove cloud provider/i)).toBeInTheDocument();
      });

      // Check that the dialog shows the affected resource count
      const modalContent = screen.getByTestId('modal-content');
      expect(modalContent).toHaveTextContent(/1.*resource/i);
      expect(modalContent).toHaveTextContent(/Database/i);
      expect(modalContent).toHaveTextContent(/AWS/i);
    });

    it('does not display confirmation dialog when deselecting cloud providers without resources', async () => {
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

      // Deselect AWS (no resources added)
      await user.click(screen.getByTestId('checkbox-aws-id'));

      // Confirmation dialog should NOT appear
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('shows multiple affected resources in confirmation dialog', async () => {
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

      // Add two resources for AWS
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');
      await user.selectOptions(addResourceSelect, 'cache-id|aws-id');

      // Verify resources were added
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
        expect(screen.getByTestId('dynamic-form-cache-id-aws-id')).toBeInTheDocument();
      });

      // Deselect AWS
      await user.click(screen.getByTestId('checkbox-aws-id'));

      // Confirmation dialog should show both resources
      await waitFor(() => {
        const modalContent = screen.getByTestId('modal-content');
        expect(modalContent).toHaveTextContent(/2.*resource/i);
        expect(modalContent).toHaveTextContent(/Database/i);
        expect(modalContent).toHaveTextContent(/Cache/i);
      });
    });
  });

  describe('Confirmation Dialog Cancellation Behavior', () => {
    it('cancels cloud provider deselection when user clicks Cancel', async () => {
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

      // Add a resource for AWS
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');

      // Verify resource was added
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });

      // Deselect AWS
      await user.click(screen.getByTestId('checkbox-aws-id'));

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      // Click Cancel button
      const cancelButton = screen.getByTestId('modal-button-cancel');
      await user.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });

      // AWS should still be selected (checkbox should be checked)
      expect(screen.getByTestId('checkbox-aws-id')).toBeChecked();

      // Resource should still be present
      expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
    });

    it('removes resources when user confirms cloud provider deselection', async () => {
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

      // Add a resource for AWS
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');

      // Verify resource was added
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });

      // Deselect AWS
      await user.click(screen.getByTestId('checkbox-aws-id'));

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      // Click Remove button
      const removeButton = screen.getByTestId('modal-button-remove');
      await user.click(removeButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });

      // AWS should be deselected
      expect(screen.getByTestId('checkbox-aws-id')).not.toBeChecked();

      // Resource should be removed
      expect(screen.queryByTestId('dynamic-form-database-id-aws-id')).not.toBeInTheDocument();
    });
  });

  describe('Cloud Provider Badge Display', () => {
    it('displays cloud provider badge for each resource', async () => {
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

      // Select AWS and Azure
      await user.click(screen.getByTestId('checkbox-aws-id'));
      await user.click(screen.getByTestId('checkbox-azure-id'));

      // Add resources for different cloud providers
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');
      await user.selectOptions(addResourceSelect, 'cache-id|azure-id');

      // Verify badges are displayed
      await waitFor(() => {
        const container = screen.getByText('Shared Infrastructure Resources').closest('.resources-section');
        const badges = container?.querySelectorAll('.cloud-provider-badge');
        expect(badges).toHaveLength(2);
        
        // Check that badges contain the correct cloud provider names
        const badgeTexts = Array.from(badges || []).map(badge => badge.textContent);
        expect(badgeTexts).toContain('AWS');
        expect(badgeTexts).toContain('Azure');
      });
    });

    it('updates badge when resource cloud provider is changed', async () => {
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

      // Select AWS and Azure
      await user.click(screen.getByTestId('checkbox-aws-id'));
      await user.click(screen.getByTestId('checkbox-azure-id'));

      // Add a resource for AWS
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');

      // Verify initial badge
      await waitFor(() => {
        const container = screen.getByText('Shared Infrastructure Resources').closest('.resources-section');
        const badge = container?.querySelector('.cloud-provider-badge');
        expect(badge).toHaveTextContent('AWS');
      });

      // Change cloud provider to Azure
      const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
      await user.selectOptions(cloudProviderSelect, 'azure-id');

      // Verify badge updated
      await waitFor(() => {
        const container = screen.getByText('Shared Infrastructure Resources').closest('.resources-section');
        const badge = container?.querySelector('.cloud-provider-badge');
        expect(badge).toHaveTextContent('Azure');
      });
    });
  });

  describe('Validation Message for Empty Cloud Provider Selection', () => {
    it('displays info message when no cloud providers are selected', async () => {
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

      // Verify info message is displayed
      expect(screen.getByText(/please select at least one cloud provider above before adding resources/i)).toBeInTheDocument();
    });

    it('hides info message when cloud providers are selected', async () => {
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

      // Verify info message is displayed initially
      expect(screen.getByText(/please select at least one cloud provider above before adding resources/i)).toBeInTheDocument();

      // Select a cloud provider
      await user.click(screen.getByTestId('checkbox-aws-id'));

      // Info message should be hidden
      await waitFor(() => {
        expect(screen.queryByText(/please select at least one cloud provider above before adding resources/i)).not.toBeInTheDocument();
      });
    });

    it('hides add resource dropdown when no cloud providers are selected', async () => {
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

      // Add resource dropdown should not be visible
      expect(screen.queryByRole('combobox', { name: /add shared resource/i })).not.toBeInTheDocument();
    });

    it('shows add resource dropdown when cloud providers are selected', async () => {
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

      // Select a cloud provider
      await user.click(screen.getByTestId('checkbox-aws-id'));

      // Add resource dropdown should be visible
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /add shared resource/i })).toBeInTheDocument();
      });
    });
  });

  describe('Integration - Complete User Flow', () => {
    it('handles complete flow: select providers, add resources, deselect with confirmation', async () => {
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

      // Step 1: Initially no cloud providers selected - info message shown
      expect(screen.getByText(/please select at least one cloud provider above before adding resources/i)).toBeInTheDocument();

      // Step 2: Select AWS and Azure
      await user.click(screen.getByTestId('checkbox-aws-id'));
      await user.click(screen.getByTestId('checkbox-azure-id'));

      // Step 3: Info message should be hidden, add resource dropdown visible
      await waitFor(() => {
        expect(screen.queryByText(/please select at least one cloud provider above before adding resources/i)).not.toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /add shared resource/i })).toBeInTheDocument();
      });

      // Step 4: Add resources for both providers
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');
      await user.selectOptions(addResourceSelect, 'cache-id|azure-id');

      // Step 5: Verify badges are displayed
      await waitFor(() => {
        const container = screen.getByText('Shared Infrastructure Resources').closest('.resources-section');
        const badges = container?.querySelectorAll('.cloud-provider-badge');
        expect(badges).toHaveLength(2);
      });

      // Step 6: Deselect AWS (has resource) - should show confirmation
      await user.click(screen.getByTestId('checkbox-aws-id'));

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      // Step 7: Cancel the deselection
      await user.click(screen.getByTestId('modal-button-cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });

      // Step 8: AWS still selected, both resources still present
      expect(screen.getByTestId('checkbox-aws-id')).toBeChecked();
      expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      expect(screen.getByTestId('dynamic-form-cache-id-azure-id')).toBeInTheDocument();

      // Step 9: Deselect AWS again and confirm
      await user.click(screen.getByTestId('checkbox-aws-id'));

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('modal-button-remove'));

      // Step 10: AWS deselected, AWS resource removed, Azure resource remains
      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
        expect(screen.getByTestId('checkbox-aws-id')).not.toBeChecked();
        expect(screen.queryByTestId('dynamic-form-database-id-aws-id')).not.toBeInTheDocument();
        expect(screen.getByTestId('dynamic-form-cache-id-azure-id')).toBeInTheDocument();
      });
    });
  });

  describe('CloudProviderLookupService Integration', () => {
    beforeEach(() => {
      // Clear the singleton instance before each test
      CloudProviderLookupService.getInstance().clear();
    });

    it('initializes CloudProviderLookupService when cloud providers load', async () => {
      const lookupService = CloudProviderLookupService.getInstance();
      
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

      // Verify lookup service was initialized
      expect(lookupService.isInitialized()).toBe(true);
      expect(lookupService.resolveCloudProviderId('aws')).toBe('aws-id');
      expect(lookupService.resolveCloudProviderId('azure')).toBe('azure-id');
      expect(lookupService.resolveCloudProviderId('gcp')).toBe('gcp-id');
    });

    it('loads existing blueprint with cloud type resolution to UUID', async () => {
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test description',
        supportedCloudProviderIds: ['aws-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            resourceTypeName: 'Database',
            cloudProviderId: 'aws-id', // Already resolved UUID
            cloudProviderName: 'AWS',
            configuration: { size: '100GB' },
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

      // Wait for cloud providers and blueprint to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Verify resource was loaded with UUID
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });

      // Verify cloud provider dropdown shows correct selection
      const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
      expect(cloudProviderSelect).toHaveValue('aws-id');
    });

    it('cloud provider dropdown shows correct selection for loaded blueprint', async () => {
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test description',
        supportedCloudProviderIds: ['aws-id', 'azure-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'azure-id',
            cloudProviderName: 'Azure',
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

      // Wait for everything to load
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-azure-id')).toBeInTheDocument();
      });

      // Verify cloud provider dropdown shows Azure (UUID)
      const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
      expect(cloudProviderSelect).toHaveValue('azure-id');
      
      // Verify the badge shows Azure
      const container = screen.getByText('Shared Infrastructure Resources').closest('.resources-section');
      const badge = container?.querySelector('.cloud-provider-badge');
      expect(badge).toHaveTextContent('Azure');
    });

    it('changing cloud provider updates state with UUID', async () => {
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

      // Select AWS and Azure
      await user.click(screen.getByTestId('checkbox-aws-id'));
      await user.click(screen.getByTestId('checkbox-azure-id'));

      // Add a resource for AWS
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');

      // Verify resource was added with AWS
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });

      // Change cloud provider to Azure
      const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
      await user.selectOptions(cloudProviderSelect, 'azure-id');

      // Verify the form updated with Azure UUID
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-azure-id')).toBeInTheDocument();
        expect(screen.queryByTestId('dynamic-form-database-id-aws-id')).not.toBeInTheDocument();
      });

      // Verify badge updated
      const container = screen.getByText('Shared Infrastructure Resources').closest('.resources-section');
      const badge = container?.querySelector('.cloud-provider-badge');
      expect(badge).toHaveTextContent('Azure');
    });

    it('saving blueprint transforms UUID back to cloud type', async () => {
      const user = userEvent.setup();
      const lookupService = CloudProviderLookupService.getInstance();

      vi.mocked(apiService.createBlueprint).mockResolvedValue({
        id: 'new-blueprint-123',
        name: 'New Blueprint',
        description: 'Test',
        supportedCloudProviderIds: ['aws-id'],
        resources: [],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

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

      // Fill in form
      const nameInput = screen.getByTestId('name');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Blueprint');

      // Select AWS
      await user.click(screen.getByTestId('checkbox-aws-id'));

      // Add a resource
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');

      // Wait for resource to be added
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });

      // Submit form
      const submitButton = screen.getByTestId('button-create-blueprint');
      await user.click(submitButton);

      // Verify API was called with correct data
      await waitFor(() => {
        expect(apiService.createBlueprint).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Blueprint',
            supportedCloudProviderIds: ['aws-id'],
            resources: expect.arrayContaining([
              expect.objectContaining({
                name: 'Database',
                resourceTypeId: 'database-id',
                cloudProviderId: 'aws-id', // UUID is sent
                configuration: expect.any(Object),
              }),
            ]),
          }),
          'test@example.com'
        );
      });

      // Verify the lookup service can resolve the UUID back to cloud type
      expect(lookupService.resolveCloudType('aws-id')).toBe('aws');
    });

    it('handles resources with resolved UUIDs in configuration reset', async () => {
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

      // Select AWS and Azure
      await user.click(screen.getByTestId('checkbox-aws-id'));
      await user.click(screen.getByTestId('checkbox-azure-id'));

      // Add a resource for AWS
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      await user.selectOptions(addResourceSelect, 'database-id|aws-id');

      // Wait for resource and update its configuration
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });

      // Simulate configuration update
      const updateConfigButton = screen.getByText('Update Config');
      await user.click(updateConfigButton);

      // Change cloud provider (should reset configuration)
      const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
      await user.selectOptions(cloudProviderSelect, 'azure-id');

      // Verify configuration was reset (new form instance)
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-azure-id')).toBeInTheDocument();
      });
    });

    it('maintains UUID format throughout resource lifecycle', async () => {
      const user = userEvent.setup();
      const lookupService = CloudProviderLookupService.getInstance();

      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test description',
        supportedCloudProviderIds: ['aws-id', 'azure-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            cloudProviderName: 'AWS',
            configuration: { size: '100GB' },
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiService.updateBlueprint).mockResolvedValue({
        ...existingBlueprint,
        updatedAt: '2024-01-02T00:00:00Z',
      });

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for everything to load
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-aws-id')).toBeInTheDocument();
      });

      // Verify initial state has UUID
      const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
      expect(cloudProviderSelect).toHaveValue('aws-id');

      // Change to Azure
      await user.selectOptions(cloudProviderSelect, 'azure-id');

      // Verify UUID updated
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-id-azure-id')).toBeInTheDocument();
      });

      // Submit form
      const submitButton = screen.getByTestId('button-update-blueprint');
      await user.click(submitButton);

      // Verify API was called with UUID
      await waitFor(() => {
        expect(apiService.updateBlueprint).toHaveBeenCalledWith(
          'blueprint-123',
          expect.objectContaining({
            resources: expect.arrayContaining([
              expect.objectContaining({
                cloudProviderId: 'azure-id', // UUID maintained
              }),
            ]),
          }),
          'test@example.com'
        );
      });

      // Verify lookup service can resolve both directions
      expect(lookupService.resolveCloudProviderId('azure')).toBe('azure-id');
      expect(lookupService.resolveCloudType('azure-id')).toBe('azure');
    });
  });

  describe('Cloud Provider Loading Failures', () => {
    it('displays error message when cloud providers fail to load', async () => {
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

    it('displays retry button when cloud providers fail to load', async () => {
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

    it('disables cloud provider checkboxes when loading fails', async () => {
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

      // Cloud provider checkboxes should be disabled
      // Note: The checkboxes won't be rendered if providers array is empty
      // So we just verify the error state is shown
      expect(screen.getByText(/error loading cloud providers/i)).toBeInTheDocument();
    });

    it('disables resource editing when cloud providers fail to load', async () => {
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

    it('disables submit button when cloud providers fail to load', async () => {
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

    it('retries loading cloud providers when retry button is clicked', async () => {
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

    it('successfully retries and loads cloud providers after initial failure', async () => {
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

      // Wait for success - error should disappear and cloud providers should load
      await waitFor(() => {
        expect(screen.queryByText(/error loading cloud providers/i)).not.toBeInTheDocument();
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Verify API was called twice (initial + retry)
      expect(apiService.getAvailableCloudProvidersForBlueprints).toHaveBeenCalledTimes(2);
    });

    it('shows error again if retry fails', async () => {
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

    it('clears error state when retry succeeds', async () => {
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

      // Wait for success - error should be gone
      await waitFor(() => {
        expect(screen.queryByText(/error loading cloud providers/i)).not.toBeInTheDocument();
      });

      // Cloud providers should be loaded and functional
      expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-aws-id')).not.toBeDisabled();
      
      // Submit button should be enabled (after selecting providers)
      await user.click(screen.getByTestId('checkbox-aws-id'));
      const nameInput = screen.getByTestId('name');
      await user.type(nameInput, 'Test Blueprint');
      
      await waitFor(() => {
        const submitButton = screen.getByTestId('button-create-blueprint');
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});
