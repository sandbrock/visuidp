import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Mock DynamicResourceForm - track what props it receives
const mockDynamicResourceFormProps: any[] = [];
vi.mock('./DynamicResourceForm', () => ({
  DynamicResourceForm: ({ resourceTypeId, cloudProviderId, onChange, values }: any) => {
    // Store props for verification
    mockDynamicResourceFormProps.push({ resourceTypeId, cloudProviderId, values });
    
    return (
      <div 
        data-testid={`dynamic-form-${resourceTypeId}-${cloudProviderId}`}
        data-resource-type-id={resourceTypeId}
        data-cloud-provider-id={cloudProviderId}
      >
        Dynamic Resource Form
        <div data-testid="form-props">
          ResourceType: {resourceTypeId}, CloudProvider: {cloudProviderId}
        </div>
        <button onClick={() => onChange({ testConfig: 'value' })}>
          Update Config
        </button>
      </div>
    );
  },
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

describe('BlueprintForm - Task 5.2: Cloud Provider Change Workflow', () => {
  const mockUser: User = {
    email: 'test@example.com',
    name: 'Test User',
    roles: ['admin'],
  };

  const mockCloudProviders: CloudProvider[] = [
    {
      id: 'aws-uuid-123',
      name: 'aws',
      displayName: 'AWS',
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'azure-uuid-456',
      name: 'azure',
      displayName: 'Azure',
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'gcp-uuid-789',
      name: 'gcp',
      displayName: 'GCP',
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockResourceTypes: ResourceType[] = [
    {
      id: 'database-uuid-001',
      name: 'database',
      displayName: 'Database',
      category: 'SHARED',
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'storage-uuid-002',
      name: 'storage',
      displayName: 'Storage',
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
    mockDynamicResourceFormProps.length = 0;
    
    // Clear the singleton instance before each test
    CloudProviderLookupService.getInstance().clear();
    
    vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);
    vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockResolvedValue(mockResourceTypes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('changes cloud provider selection in resource form and verifies UUID is used', async () => {
    const user = userEvent.setup();

    const existingBlueprint: Blueprint = {
      id: 'blueprint-123',
      name: 'Test Blueprint',
      description: 'Test cloud provider change',
      supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456'],
      resources: [
        {
          id: 'resource-1',
          name: 'Test Database',
          resourceTypeId: 'database-uuid-001',
          resourceTypeName: 'Database',
          cloudProviderId: 'aws-uuid-123',
          cloudProviderName: 'AWS',
          configuration: { instanceType: 'db.t3.medium' },
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

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
    });

    // VERIFY: Initial cloud provider dropdown shows AWS UUID
    const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
    expect(cloudProviderSelect).toHaveValue('aws-uuid-123');

    // Clear the props array to track new calls
    mockDynamicResourceFormProps.length = 0;

    // CHANGE: Change cloud provider from AWS to Azure
    await user.selectOptions(cloudProviderSelect, 'azure-uuid-456');

    // VERIFY: Configuration resets correctly (form re-renders with empty config)
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-azure-uuid-456')).toBeInTheDocument();
      expect(screen.queryByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).not.toBeInTheDocument();
    });

    // VERIFY: New cloud provider UUID is used for schema fetch
    await waitFor(() => {
      const latestProps = mockDynamicResourceFormProps[mockDynamicResourceFormProps.length - 1];
      expect(latestProps).toMatchObject({
        resourceTypeId: 'database-uuid-001',
        cloudProviderId: 'azure-uuid-456', // Changed to Azure UUID
      });
      // Configuration should be reset to empty object
      expect(latestProps.values).toEqual({});
    });
  });

  it('saves blueprint with changed cloud provider and verifies changes persist', async () => {
    const user = userEvent.setup();

    const existingBlueprint: Blueprint = {
      id: 'blueprint-456',
      name: 'Persistence Test Blueprint',
      description: 'Test persistence',
      supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456'],
      resources: [
        {
          id: 'resource-1',
          name: 'Test Storage',
          resourceTypeId: 'storage-uuid-002',
          resourceTypeName: 'Storage',
          cloudProviderId: 'aws-uuid-123',
          cloudProviderName: 'AWS',
          configuration: { bucketName: 'test-bucket' },
        },
      ],
    };

    const updatedBlueprint: Blueprint = {
      ...existingBlueprint,
      resources: [
        {
          id: 'resource-1',
          name: 'Test Storage',
          resourceTypeId: 'storage-uuid-002',
          resourceTypeName: 'Storage',
          cloudProviderId: 'azure-uuid-456',
          cloudProviderName: 'Azure',
          configuration: { newConfig: 'azure-value' },
        },
      ],
    };

    vi.mocked(apiService.updateBlueprint).mockResolvedValue(updatedBlueprint);

    render(
      <BlueprintForm
        blueprint={existingBlueprint}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        user={mockUser}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-storage-uuid-002-aws-uuid-123')).toBeInTheDocument();
    });

    // Change cloud provider from AWS to Azure
    const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
    await user.selectOptions(cloudProviderSelect, 'azure-uuid-456');

    // Wait for form to update
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-storage-uuid-002-azure-uuid-456')).toBeInTheDocument();
    });

    // Update configuration (simulate user entering new config)
    const updateConfigButton = screen.getByText('Update Config');
    await user.click(updateConfigButton);

    // Save the blueprint
    const submitButton = screen.getByTestId('button-update-blueprint');
    await user.click(submitButton);

    // VERIFY: API called with updated cloud provider UUID
    await waitFor(() => {
      expect(apiService.updateBlueprint).toHaveBeenCalledWith(
        'blueprint-456',
        expect.objectContaining({
          resources: expect.arrayContaining([
            expect.objectContaining({
              cloudProviderId: 'azure-uuid-456', // Changed to Azure UUID
              resourceTypeId: 'storage-uuid-002',
            }),
          ]),
        }),
        'test@example.com'
      );
    });

    // VERIFY: onSave callback called with updated blueprint
    expect(mockOnSave).toHaveBeenCalledWith(updatedBlueprint);
  });

  it('verifies configuration resets when cloud provider changes', async () => {
    const user = userEvent.setup();

    const existingBlueprint: Blueprint = {
      id: 'blueprint-789',
      name: 'Config Reset Test',
      description: 'Test configuration reset',
      supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456', 'gcp-uuid-789'],
      resources: [
        {
          id: 'resource-1',
          name: 'Test Database',
          resourceTypeId: 'database-uuid-001',
          resourceTypeName: 'Database',
          cloudProviderId: 'aws-uuid-123',
          cloudProviderName: 'AWS',
          configuration: {
            instanceType: 'db.t3.large',
            storage: '500GB',
            multiAZ: true,
            backupRetention: 7,
          },
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

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
    });

    // Verify initial configuration is loaded
    const initialProps = mockDynamicResourceFormProps.find(
      p => p.cloudProviderId === 'aws-uuid-123'
    );
    expect(initialProps?.values).toEqual({
      instanceType: 'db.t3.large',
      storage: '500GB',
      multiAZ: true,
      backupRetention: 7,
    });

    // Clear props array
    mockDynamicResourceFormProps.length = 0;

    // Change cloud provider to GCP
    const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
    await user.selectOptions(cloudProviderSelect, 'gcp-uuid-789');

    // VERIFY: Configuration is reset to empty object
    await waitFor(() => {
      const newProps = mockDynamicResourceFormProps.find(
        p => p.cloudProviderId === 'gcp-uuid-789'
      );
      expect(newProps).toBeDefined();
      expect(newProps?.values).toEqual({});
      expect(newProps?.cloudProviderId).toBe('gcp-uuid-789');
    });

    // VERIFY: Old form is removed, new form is rendered
    expect(screen.queryByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).not.toBeInTheDocument();
    expect(screen.getByTestId('dynamic-form-database-uuid-001-gcp-uuid-789')).toBeInTheDocument();
  });

  it('handles multiple cloud provider changes in sequence', async () => {
    const user = userEvent.setup();

    const existingBlueprint: Blueprint = {
      id: 'blueprint-multi-change',
      name: 'Multiple Changes Test',
      description: 'Test multiple cloud provider changes',
      supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456', 'gcp-uuid-789'],
      resources: [
        {
          id: 'resource-1',
          name: 'Test Resource',
          resourceTypeId: 'database-uuid-001',
          resourceTypeName: 'Database',
          cloudProviderId: 'aws-uuid-123',
          cloudProviderName: 'AWS',
          configuration: { initial: 'config' },
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

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
    });

    const cloudProviderSelect = screen.getByTestId('resource-cloud-0');

    // Change 1: AWS -> Azure
    mockDynamicResourceFormProps.length = 0;
    await user.selectOptions(cloudProviderSelect, 'azure-uuid-456');
    
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-azure-uuid-456')).toBeInTheDocument();
      const props = mockDynamicResourceFormProps[mockDynamicResourceFormProps.length - 1];
      expect(props.cloudProviderId).toBe('azure-uuid-456');
      expect(props.values).toEqual({});
    });

    // Change 2: Azure -> GCP
    mockDynamicResourceFormProps.length = 0;
    await user.selectOptions(cloudProviderSelect, 'gcp-uuid-789');
    
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-gcp-uuid-789')).toBeInTheDocument();
      const props = mockDynamicResourceFormProps[mockDynamicResourceFormProps.length - 1];
      expect(props.cloudProviderId).toBe('gcp-uuid-789');
      expect(props.values).toEqual({});
    });

    // Change 3: GCP -> AWS (back to original)
    mockDynamicResourceFormProps.length = 0;
    await user.selectOptions(cloudProviderSelect, 'aws-uuid-123');
    
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      const props = mockDynamicResourceFormProps[mockDynamicResourceFormProps.length - 1];
      expect(props.cloudProviderId).toBe('aws-uuid-123');
      // Configuration should still be reset (not restored to original)
      expect(props.values).toEqual({});
    });
  });

  it('verifies new cloud provider UUID is used for property schema fetch', async () => {
    const user = userEvent.setup();

    const existingBlueprint: Blueprint = {
      id: 'blueprint-schema-fetch',
      name: 'Schema Fetch Test',
      description: 'Test schema fetch with new UUID',
      supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456'],
      resources: [
        {
          id: 'resource-1',
          name: 'Test Storage',
          resourceTypeId: 'storage-uuid-002',
          resourceTypeName: 'Storage',
          cloudProviderId: 'aws-uuid-123',
          cloudProviderName: 'AWS',
          configuration: {},
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

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-storage-uuid-002-aws-uuid-123')).toBeInTheDocument();
    });

    // Clear props to track new calls
    mockDynamicResourceFormProps.length = 0;

    // Change cloud provider
    const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
    await user.selectOptions(cloudProviderSelect, 'azure-uuid-456');

    // VERIFY: DynamicResourceForm receives the new UUID
    await waitFor(() => {
      const newFormProps = mockDynamicResourceFormProps[mockDynamicResourceFormProps.length - 1];
      
      // Verify UUID format (not cloud type string)
      expect(newFormProps.cloudProviderId).toBe('azure-uuid-456');
      expect(newFormProps.cloudProviderId).toMatch(/uuid/);
      expect(newFormProps.cloudProviderId).not.toBe('azure');
      expect(newFormProps.cloudProviderId).not.toBe('Azure');
      
      // In real application, DynamicResourceForm would call:
      // PropertySchemaService.getSchema(resourceTypeId, cloudProviderId, context)
      // which makes API call to: /blueprints/resource-schema/{typeId}/{cloudProviderId}
      const expectedApiPath = `/blueprints/resource-schema/${newFormProps.resourceTypeId}/${newFormProps.cloudProviderId}`;
      expect(expectedApiPath).toBe('/blueprints/resource-schema/storage-uuid-002/azure-uuid-456');
      
      // Verify path ends with UUID, not cloud type string
      expect(expectedApiPath).toMatch(/\/[a-z]+-uuid-\d+$/);
      expect(expectedApiPath).not.toMatch(/\/azure$/);
    });
  });

  it('handles cloud provider change for multiple resources independently', async () => {
    const user = userEvent.setup();

    const existingBlueprint: Blueprint = {
      id: 'blueprint-multi-resource',
      name: 'Multi Resource Test',
      description: 'Test multiple resources with independent cloud provider changes',
      supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456', 'gcp-uuid-789'],
      resources: [
        {
          id: 'resource-1',
          name: 'Database 1',
          resourceTypeId: 'database-uuid-001',
          resourceTypeName: 'Database',
          cloudProviderId: 'aws-uuid-123',
          cloudProviderName: 'AWS',
          configuration: { db1: 'config' },
        },
        {
          id: 'resource-2',
          name: 'Storage 1',
          resourceTypeId: 'storage-uuid-002',
          resourceTypeName: 'Storage',
          cloudProviderId: 'azure-uuid-456',
          cloudProviderName: 'Azure',
          configuration: { storage1: 'config' },
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

    // Wait for both resources to load
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      expect(screen.getByTestId('dynamic-form-storage-uuid-002-azure-uuid-456')).toBeInTheDocument();
    });

    // Change first resource's cloud provider (AWS -> GCP)
    const cloudProviderSelect0 = screen.getByTestId('resource-cloud-0');
    await user.selectOptions(cloudProviderSelect0, 'gcp-uuid-789');

    // VERIFY: First resource updated, second resource unchanged
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-gcp-uuid-789')).toBeInTheDocument();
      expect(screen.queryByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).not.toBeInTheDocument();
      // Second resource should remain unchanged
      expect(screen.getByTestId('dynamic-form-storage-uuid-002-azure-uuid-456')).toBeInTheDocument();
    });

    // Change second resource's cloud provider (Azure -> AWS)
    const cloudProviderSelect1 = screen.getByTestId('resource-cloud-1');
    await user.selectOptions(cloudProviderSelect1, 'aws-uuid-123');

    // VERIFY: Both resources now have different cloud providers
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-gcp-uuid-789')).toBeInTheDocument();
      expect(screen.getByTestId('dynamic-form-storage-uuid-002-aws-uuid-123')).toBeInTheDocument();
      expect(screen.queryByTestId('dynamic-form-storage-uuid-002-azure-uuid-456')).not.toBeInTheDocument();
    });
  });

  it('persists cloud provider changes after save and reload', async () => {
    const user = userEvent.setup();

    const existingBlueprint: Blueprint = {
      id: 'blueprint-persist',
      name: 'Persistence Test',
      description: 'Test persistence after save',
      supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456'],
      resources: [
        {
          id: 'resource-1',
          name: 'Test Database',
          resourceTypeId: 'database-uuid-001',
          resourceTypeName: 'Database',
          cloudProviderId: 'aws-uuid-123',
          cloudProviderName: 'AWS',
          configuration: { original: 'config' },
        },
      ],
    };

    const savedBlueprint: Blueprint = {
      ...existingBlueprint,
      resources: [
        {
          id: 'resource-1',
          name: 'Test Database',
          resourceTypeId: 'database-uuid-001',
          resourceTypeName: 'Database',
          cloudProviderId: 'azure-uuid-456',
          cloudProviderName: 'Azure',
          configuration: { testConfig: 'value' },
        },
      ],
    };

    vi.mocked(apiService.updateBlueprint).mockResolvedValue(savedBlueprint);

    const { rerender } = render(
      <BlueprintForm
        blueprint={existingBlueprint}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        user={mockUser}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
    });

    // Change cloud provider
    const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
    await user.selectOptions(cloudProviderSelect, 'azure-uuid-456');

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-azure-uuid-456')).toBeInTheDocument();
    });

    // Update config
    const updateConfigButton = screen.getByText('Update Config');
    await user.click(updateConfigButton);

    // Save
    const submitButton = screen.getByTestId('button-update-blueprint');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(savedBlueprint);
    });

    // Simulate reload with saved blueprint
    rerender(
      <BlueprintForm
        blueprint={savedBlueprint}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        user={mockUser}
      />
    );

    // VERIFY: Reloaded blueprint shows Azure cloud provider
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-form-database-uuid-001-azure-uuid-456')).toBeInTheDocument();
      const cloudProviderSelectReloaded = screen.getByTestId('resource-cloud-0');
      expect(cloudProviderSelectReloaded).toHaveValue('azure-uuid-456');
    });
  });
});
