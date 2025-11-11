import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BlueprintForm } from './BlueprintForm';
import { apiService } from '../services/api';
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

describe('BlueprintForm - Cloud Provider Dropdown Filtering on Edit', () => {
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

  describe('Loading Existing Blueprint - Cloud Provider Dropdown Filtering', () => {
    it('loads existing blueprint and verifies cloud provider dropdowns only show selected providers', async () => {
      // Create a blueprint with only AWS and Azure selected
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test Description',
        supportedCloudTypes: ['aws', 'azure'],
        supportedCloudProviderIds: ['aws-id', 'azure-id'], // Only AWS and Azure
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            configuration: { size: 'large' },
          },
          {
            id: 'resource-2',
            name: 'Test Cache',
            resourceTypeId: 'cache-id',
            cloudProviderId: 'azure-id',
            configuration: { memory: '4GB' },
          },
        ],
      };

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for cloud providers to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Wait for resources to render
      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
        expect(screen.getByTestId('resource-cloud-1')).toBeInTheDocument();
      });

      // Check first resource dropdown (should only have AWS and Azure, not GCP)
      const firstDropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      const firstOptions = Array.from(firstDropdown.options).map(opt => opt.value);
      
      expect(firstOptions).toContain('aws-id');
      expect(firstOptions).toContain('azure-id');
      expect(firstOptions).not.toContain('gcp-id');

      // Check second resource dropdown (should only have AWS and Azure, not GCP)
      const secondDropdown = screen.getByTestId('resource-cloud-1') as HTMLSelectElement;
      const secondOptions = Array.from(secondDropdown.options).map(opt => opt.value);
      
      expect(secondOptions).toContain('aws-id');
      expect(secondOptions).toContain('azure-id');
      expect(secondOptions).not.toContain('gcp-id');
    });

    it('verifies changing selectedCloudProviderIds updates all resource dropdowns', async () => {
      const user = userEvent.setup();

      // Create a blueprint with AWS and Azure selected
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test Description',
        supportedCloudTypes: ['aws', 'azure'],
        supportedCloudProviderIds: ['aws-id', 'azure-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            configuration: { size: 'large' },
          },
        ],
      };

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for cloud providers to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Wait for resource to render
      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
      });

      // Verify initial dropdown options (AWS and Azure only)
      let dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      let options = Array.from(dropdown.options).map(opt => opt.value);
      
      expect(options).toContain('aws-id');
      expect(options).toContain('azure-id');
      expect(options).not.toContain('gcp-id');

      // Add GCP to selected cloud providers
      await user.click(screen.getByTestId('checkbox-gcp-id'));

      // Wait for dropdown to update
      await waitFor(() => {
        dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
        options = Array.from(dropdown.options).map(opt => opt.value);
        
        // Now should include GCP
        expect(options).toContain('aws-id');
        expect(options).toContain('azure-id');
        expect(options).toContain('gcp-id');
      });

      // Remove Azure from selected cloud providers
      await user.click(screen.getByTestId('checkbox-azure-id'));

      // Wait for dropdown to update
      await waitFor(() => {
        dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
        options = Array.from(dropdown.options).map(opt => opt.value);
        
        // Now should only have AWS and GCP
        expect(options).toContain('aws-id');
        expect(options).not.toContain('azure-id');
        expect(options).toContain('gcp-id');
      });
    });

    it('verifies resources render after cloud providers are loaded', async () => {
      // This test validates the requirement from task 1 (Fix cloud provider dropdown state initialization race condition)
      // Resources should only render after cloudProvidersLoaded is true
      
      // Create a blueprint with resources
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test Description',
        supportedCloudTypes: ['aws'],
        supportedCloudProviderIds: ['aws-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            configuration: { size: 'large' },
          },
        ],
      };

      // Delay cloud provider loading to test timing
      let resolveCloudProviders: (value: CloudProvider[]) => void;
      const cloudProvidersPromise = new Promise<CloudProvider[]>((resolve) => {
        resolveCloudProviders = resolve;
      });

      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockReturnValue(cloudProvidersPromise);

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Resources should NOT render before cloud providers load
      expect(screen.queryByTestId('resource-cloud-0')).not.toBeInTheDocument();

      // Resolve cloud providers
      resolveCloudProviders!(mockCloudProviders);

      // Resources should now be rendered with proper cloud provider options
      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
        const dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
        const options = Array.from(dropdown.options).map(opt => opt.value);
        expect(options).toContain('aws-id');
      });
    });

    it('verifies resources do not render until selectedCloudProviderIds is initialized in edit mode', async () => {
      // This test validates task 9 - ensuring resources don't render prematurely
      // when editing an existing blueprint
      
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test Description',
        supportedCloudTypes: ['aws'],
        supportedCloudProviderIds: ['aws-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            configuration: { size: 'large' },
          },
        ],
      };

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for cloud providers to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Resources should render with properly filtered dropdowns
      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
      });

      // Verify the dropdown is properly filtered from the start
      const dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      const options = Array.from(dropdown.options).map(opt => opt.value);
      
      // Should only contain AWS (the selected provider), not all providers
      expect(options).toContain('aws-id');
      expect(options).not.toContain('azure-id');
      expect(options).not.toContain('gcp-id');
      
      // Verify the correct number of options (empty option + AWS)
      expect(options.filter(v => v !== '')).toHaveLength(1);
    });

    it('verifies multiple resources all have filtered dropdowns', async () => {
      // Create a blueprint with multiple resources
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test Description',
        supportedCloudTypes: ['aws'],
        supportedCloudProviderIds: ['aws-id'], // Only AWS selected
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            configuration: { size: 'large' },
          },
          {
            id: 'resource-2',
            name: 'Test Cache',
            resourceTypeId: 'cache-id',
            cloudProviderId: 'aws-id',
            configuration: { memory: '4GB' },
          },
        ],
      };

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for cloud providers to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Wait for resources to render
      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
        expect(screen.getByTestId('resource-cloud-1')).toBeInTheDocument();
      });

      // Check both dropdowns only show AWS
      const firstDropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      const firstOptions = Array.from(firstDropdown.options).map(opt => opt.value);
      
      expect(firstOptions).toContain('aws-id');
      expect(firstOptions).not.toContain('azure-id');
      expect(firstOptions).not.toContain('gcp-id');

      const secondDropdown = screen.getByTestId('resource-cloud-1') as HTMLSelectElement;
      const secondOptions = Array.from(secondDropdown.options).map(opt => opt.value);
      
      expect(secondOptions).toContain('aws-id');
      expect(secondOptions).not.toContain('azure-id');
      expect(secondOptions).not.toContain('gcp-id');
    });
  });

  describe('Dynamic Updates - Cloud Provider Selection Changes', () => {
    it('updates all resource dropdowns when adding a new cloud provider', async () => {
      const user = userEvent.setup();

      // Start with only AWS selected
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test Description',
        supportedCloudTypes: ['aws'],
        supportedCloudProviderIds: ['aws-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            configuration: { size: 'large' },
          },
        ],
      };

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for resources to render
      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
      });

      // Verify initial state - only AWS
      let dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      let options = Array.from(dropdown.options).map(opt => opt.value);
      expect(options.filter(v => v !== '')).toHaveLength(1);
      expect(options).toContain('aws-id');

      // Add Azure
      await user.click(screen.getByTestId('checkbox-azure-id'));

      // Verify dropdown now includes Azure
      await waitFor(() => {
        dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
        options = Array.from(dropdown.options).map(opt => opt.value);
        expect(options.filter(v => v !== '')).toHaveLength(2);
        expect(options).toContain('aws-id');
        expect(options).toContain('azure-id');
      });

      // Add GCP
      await user.click(screen.getByTestId('checkbox-gcp-id'));

      // Verify dropdown now includes all three
      await waitFor(() => {
        dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
        options = Array.from(dropdown.options).map(opt => opt.value);
        expect(options.filter(v => v !== '')).toHaveLength(3);
        expect(options).toContain('aws-id');
        expect(options).toContain('azure-id');
        expect(options).toContain('gcp-id');
      });
    });

    it('updates dropdowns when removing cloud provider without resources', async () => {
      const user = userEvent.setup();

      // Start with AWS and Azure selected, but only AWS resource
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test Description',
        supportedCloudTypes: ['aws', 'azure'],
        supportedCloudProviderIds: ['aws-id', 'azure-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            configuration: { size: 'large' },
          },
        ],
      };

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for resources to render
      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
      });

      // Verify initial state - AWS and Azure
      let dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      let options = Array.from(dropdown.options).map(opt => opt.value);
      expect(options).toContain('aws-id');
      expect(options).toContain('azure-id');

      // Remove Azure (no resources use it, so no confirmation dialog)
      await user.click(screen.getByTestId('checkbox-azure-id'));

      // Verify dropdown no longer includes Azure
      await waitFor(() => {
        dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
        options = Array.from(dropdown.options).map(opt => opt.value);
        expect(options).toContain('aws-id');
        expect(options).not.toContain('azure-id');
      });
    });
  });

  describe('Key Prop Updates for Re-rendering', () => {
    it('verifies key prop changes when selectedCloudProviderIds changes', async () => {
      const user = userEvent.setup();

      // Create a blueprint with AWS selected
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test Description',
        supportedCloudTypes: ['aws'],
        supportedCloudProviderIds: ['aws-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            configuration: { size: 'large' },
          },
        ],
      };

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for resources to render
      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
      });

      // Add Azure to selected cloud providers
      await user.click(screen.getByTestId('checkbox-azure-id'));

      // Wait for re-render
      await waitFor(() => {
        const updatedDropdown = screen.getByTestId('resource-cloud-0');
        // The dropdown should have been re-rendered (new instance)
        // We can verify this by checking that the options have changed
        const options = Array.from((updatedDropdown as HTMLSelectElement).options).map(opt => opt.value);
        expect(options).toContain('azure-id');
      });

      // Verify the dropdown now has both AWS and Azure
      const dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      const options = Array.from(dropdown.options).map(opt => opt.value);
      expect(options).toContain('aws-id');
      expect(options).toContain('azure-id');
    });
  });

  describe('Edge Cases and Validation', () => {
    it('handles blueprint with no resources correctly', async () => {
      // Blueprint with selected cloud providers but no resources
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test Description',
        supportedCloudTypes: ['aws', 'azure'],
        supportedCloudProviderIds: ['aws-id', 'azure-id'],
        resources: [],
      };

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for cloud providers to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Verify checkboxes are checked
      expect(screen.getByTestId('checkbox-aws-id')).toBeChecked();
      expect(screen.getByTestId('checkbox-azure-id')).toBeChecked();

      // Verify add resource dropdown is available and filtered
      const addResourceSelect = screen.getByRole('combobox', { name: /add shared resource/i });
      expect(addResourceSelect).toBeInTheDocument();
    });

    it('handles blueprint with empty supportedCloudProviderIds array', async () => {
      // Blueprint with no cloud providers selected
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test Description',
        supportedCloudTypes: [],
        supportedCloudProviderIds: [],
        resources: [],
      };

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for cloud providers to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-id')).toBeInTheDocument();
      });

      // Verify no checkboxes are checked
      expect(screen.getByTestId('checkbox-aws-id')).not.toBeChecked();
      expect(screen.getByTestId('checkbox-azure-id')).not.toBeChecked();
      expect(screen.getByTestId('checkbox-gcp-id')).not.toBeChecked();

      // Verify info message is shown
      expect(screen.getByText(/please select at least one cloud provider above before adding resources/i)).toBeInTheDocument();
    });

    it('correctly filters dropdown when blueprint has all cloud providers selected', async () => {
      // Blueprint with all cloud providers selected
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Test Blueprint',
        description: 'Test Description',
        supportedCloudTypes: ['aws', 'azure', 'gcp'],
        supportedCloudProviderIds: ['aws-id', 'azure-id', 'gcp-id'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-id',
            cloudProviderId: 'aws-id',
            configuration: { size: 'large' },
          },
        ],
      };

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for resources to render
      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
      });

      // Verify dropdown includes all cloud providers
      const dropdown = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      const options = Array.from(dropdown.options).map(opt => opt.value);
      
      expect(options).toContain('aws-id');
      expect(options).toContain('azure-id');
      expect(options).toContain('gcp-id');
      expect(options.filter(v => v !== '')).toHaveLength(3);
    });
  });
});
