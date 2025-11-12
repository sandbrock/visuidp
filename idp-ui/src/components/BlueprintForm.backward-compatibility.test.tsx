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

// Mock DynamicResourceForm
const mockDynamicResourceFormProps: any[] = [];
vi.mock('./DynamicResourceForm', () => ({
  DynamicResourceForm: ({ resourceTypeId, cloudProviderId, onChange, initialValues }: any) => {
    mockDynamicResourceFormProps.push({ resourceTypeId, cloudProviderId, initialValues });
    
    return (
      <div 
        data-testid={`dynamic-form-${resourceTypeId}-${cloudProviderId}`}
        data-resource-type-id={resourceTypeId}
        data-cloud-provider-id={cloudProviderId}
      >
        Dynamic Resource Form
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

describe('BlueprintForm - Backward Compatibility Tests (Task 5.4)', () => {
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

  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    mockDynamicResourceFormProps.length = 0;
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
    
    CloudProviderLookupService.getInstance().clear();
    
    vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);
    vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockResolvedValue(mockResourceTypes);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Requirement 4.1: Support both cloudType string and cloudProviderId UUID', () => {
    it('loads existing blueprint with cloudProviderId UUID correctly', async () => {
      const existingBlueprint: Blueprint = {
        id: 'blueprint-with-uuid',
        name: 'Modern Blueprint',
        description: 'Blueprint with UUID format',
        supportedCloudProviderIds: ['aws-uuid-123'],
        resources: [
          {
            id: 'resource-1',
            name: 'Database Resource',
            resourceTypeId: 'database-uuid-001',
            resourceTypeName: 'Database',
            cloudProviderId: 'aws-uuid-123',
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

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockDynamicResourceFormProps[0].cloudProviderId).toBe('aws-uuid-123');
    });

    it('loads legacy blueprint with cloudType string and resolves to UUID', async () => {
      // Simulate a legacy blueprint that was created before UUID migration
      const legacyBlueprint: Blueprint = {
        id: 'legacy-blueprint',
        name: 'Legacy Blueprint',
        description: 'Old blueprint format',
        supportedCloudProviderIds: ['aws-uuid-123'],
        resources: [
          {
            id: 'resource-1',
            name: 'Legacy Resource',
            resourceTypeId: 'database-uuid-001',
            // Legacy format: cloudProviderId might be empty or cloud type string
            cloudProviderId: 'aws-uuid-123', // Already resolved by API transformation
            cloudProviderName: 'AWS',
            configuration: { size: '50GB' },
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={legacyBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockDynamicResourceFormProps[0].cloudProviderId).toBe('aws-uuid-123');
    });

    it('handles blueprint with mixed cloud provider formats', async () => {
      const mixedBlueprint: Blueprint = {
        id: 'mixed-blueprint',
        name: 'Mixed Format Blueprint',
        description: 'Resources with different formats',
        supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456'],
        resources: [
          {
            id: 'resource-1',
            name: 'Modern Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
            configuration: {},
          },
          {
            id: 'resource-2',
            name: 'Another Resource',
            resourceTypeId: 'storage-uuid-002',
            cloudProviderId: 'azure-uuid-456',
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
          blueprint={mixedBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
        expect(screen.getByTestId('dynamic-form-storage-uuid-002-azure-uuid-456')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockDynamicResourceFormProps).toHaveLength(2);
      expect(mockDynamicResourceFormProps[0].cloudProviderId).toBe('aws-uuid-123');
      expect(mockDynamicResourceFormProps[1].cloudProviderId).toBe('azure-uuid-456');
    });
  });

  describe('Requirement 4.2: Backend API receives expected cloudType format', () => {
    it('sends cloudType string to backend when saving blueprint', async () => {
      const user = userEvent.setup();

      const existingBlueprint: Blueprint = {
        id: 'blueprint-save-test',
        name: 'Save Test Blueprint',
        description: 'Test backend format',
        supportedCloudProviderIds: ['aws-uuid-123'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
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

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('button-update-blueprint');
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiService.updateBlueprint).toHaveBeenCalledWith(
          'blueprint-save-test',
          expect.objectContaining({
            resources: expect.arrayContaining([
              expect.objectContaining({
                cloudProviderId: 'aws-uuid-123',
              }),
            ]),
          }),
          'test@example.com'
        );
      });
    });

    it('maintains cloud type format for various cloud providers', async () => {
      const user = userEvent.setup();

      const multiCloudBlueprint: Blueprint = {
        id: 'multi-cloud-save',
        name: 'Multi-Cloud Blueprint',
        description: 'Test all cloud providers',
        supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456', 'gcp-uuid-789'],
        resources: [
          {
            id: 'resource-1',
            name: 'AWS Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
            configuration: {},
          },
          {
            id: 'resource-2',
            name: 'Azure Resource',
            resourceTypeId: 'storage-uuid-002',
            cloudProviderId: 'azure-uuid-456',
            cloudProviderName: 'Azure',
            configuration: {},
          },
          {
            id: 'resource-3',
            name: 'GCP Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'gcp-uuid-789',
            cloudProviderName: 'GCP',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiService.updateBlueprint).mockResolvedValue({
        ...multiCloudBlueprint,
        updatedAt: '2024-01-02T00:00:00Z',
      });

      render(
        <BlueprintForm
          blueprint={multiCloudBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('button-update-blueprint');
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiService.updateBlueprint).toHaveBeenCalled();
      });

      const callArgs = vi.mocked(apiService.updateBlueprint).mock.calls[0];
      const savedBlueprint = callArgs[1];
      
      expect(savedBlueprint.resources).toHaveLength(3);
      expect(savedBlueprint.resources[0].cloudProviderId).toBe('aws-uuid-123');
      expect(savedBlueprint.resources[1].cloudProviderId).toBe('azure-uuid-456');
      expect(savedBlueprint.resources[2].cloudProviderId).toBe('gcp-uuid-789');
    });
  });

  describe('Requirement 4.3: Handle missing cloud provider data gracefully', () => {
    it('handles blueprint with missing cloudProviderId gracefully', async () => {
      const blueprintWithMissingData: Blueprint = {
        id: 'blueprint-missing-data',
        name: 'Incomplete Blueprint',
        description: 'Missing cloud provider data',
        supportedCloudProviderIds: ['aws-uuid-123'],
        resources: [
          {
            id: 'resource-1',
            name: 'Resource Without Cloud Provider',
            resourceTypeId: 'database-uuid-001',
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

      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
      });

      const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
      expect(cloudProviderSelect).toHaveValue('');
      
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('handles blueprint with undefined cloudProviderName', async () => {
      const blueprintWithUndefinedName: Blueprint = {
        id: 'blueprint-undefined-name',
        name: 'Blueprint Without Name',
        description: 'Missing cloudProviderName',
        supportedCloudProviderIds: ['aws-uuid-123'],
        resources: [
          {
            id: 'resource-1',
            name: 'Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: undefined,
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

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockDynamicResourceFormProps[0].cloudProviderId).toBe('aws-uuid-123');
    });

    it('handles blueprint with empty resources array', async () => {
      const emptyBlueprint: Blueprint = {
        id: 'empty-blueprint',
        name: 'Empty Blueprint',
        description: 'No resources',
        supportedCloudProviderIds: ['aws-uuid-123'],
        resources: [],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={emptyBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('Empty Blueprint');
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockDynamicResourceFormProps).toHaveLength(0);
    });

    it('handles blueprint without resources property', async () => {
      const blueprintWithoutResources: any = {
        id: 'no-resources-blueprint',
        name: 'No Resources Property',
        description: 'Missing resources array',
        supportedCloudProviderIds: ['aws-uuid-123'],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprintWithoutResources}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('No Resources Property');
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 4.4: Display cloud provider names correctly', () => {
    it('displays correct cloud provider names in dropdown', async () => {
      const existingBlueprint: Blueprint = {
        id: 'display-test-blueprint',
        name: 'Display Test',
        description: 'Test cloud provider display',
        supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456', 'gcp-uuid-789'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
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

      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
      });

      const cloudProviderSelect = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      
      expect(cloudProviderSelect.value).toBe('aws-uuid-123');
      
      const options = Array.from(cloudProviderSelect.options);
      const awsOption = options.find(opt => opt.value === 'aws-uuid-123');
      const azureOption = options.find(opt => opt.value === 'azure-uuid-456');
      const gcpOption = options.find(opt => opt.value === 'gcp-uuid-789');
      
      expect(awsOption?.text).toBe('AWS');
      expect(azureOption?.text).toBe('Azure');
      expect(gcpOption?.text).toBe('GCP');
    });

    it('resolves cloud provider names for display from UUIDs', async () => {
      const lookupService = CloudProviderLookupService.getInstance();

      const existingBlueprint: Blueprint = {
        id: 'resolve-display-blueprint',
        name: 'Resolve Display Test',
        description: 'Test name resolution',
        supportedCloudProviderIds: ['aws-uuid-123'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
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

      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-uuid-123')).toBeInTheDocument();
      });

      expect(lookupService.isInitialized()).toBe(true);
      
      const awsProvider = lookupService.getCloudProviderById('aws-uuid-123');
      expect(awsProvider).toBeDefined();
      expect(awsProvider?.displayName).toBe('AWS');
    });

    it('handles various cloud provider name formats', async () => {
      const customCloudProviders: CloudProvider[] = [
        {
          id: 'custom-uuid-1',
          name: 'custom-cloud',
          displayName: 'Custom Cloud Provider',
          enabled: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'custom-uuid-2',
          name: 'on-prem',
          displayName: 'On-Premises',
          enabled: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(customCloudProviders);

      const customBlueprint: Blueprint = {
        id: 'custom-blueprint',
        name: 'Custom Cloud Blueprint',
        description: 'Test custom cloud providers',
        supportedCloudProviderIds: ['custom-uuid-1', 'custom-uuid-2'],
        resources: [
          {
            id: 'resource-1',
            name: 'Custom Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'custom-uuid-1',
            cloudProviderName: 'Custom Cloud Provider',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={customBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
      });

      const cloudProviderSelect = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      expect(cloudProviderSelect.value).toBe('custom-uuid-1');
      
      const options = Array.from(cloudProviderSelect.options);
      const customOption = options.find(opt => opt.value === 'custom-uuid-1');
      const onPremOption = options.find(opt => opt.value === 'custom-uuid-2');
      
      expect(customOption?.text).toBe('Custom Cloud Provider');
      expect(onPremOption?.text).toBe('On-Premises');
    });
  });

  describe('Various cloud provider configurations', () => {
    it('handles single cloud provider configuration', async () => {
      const singleCloudBlueprint: Blueprint = {
        id: 'single-cloud',
        name: 'Single Cloud Blueprint',
        description: 'Only AWS',
        supportedCloudProviderIds: ['aws-uuid-123'],
        resources: [
          {
            id: 'resource-1',
            name: 'AWS Only Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={singleCloudBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      });

      const cloudProviderSelect = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      const options = Array.from(cloudProviderSelect.options).filter(opt => opt.value !== '');
      
      expect(options).toHaveLength(1);
      expect(options[0].value).toBe('aws-uuid-123');
    });

    it('handles multi-cloud configuration with all providers', async () => {
      const allCloudsBlueprint: Blueprint = {
        id: 'all-clouds',
        name: 'All Clouds Blueprint',
        description: 'AWS, Azure, and GCP',
        supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456', 'gcp-uuid-789'],
        resources: [
          {
            id: 'resource-1',
            name: 'Multi-Cloud Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={allCloudsBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      });

      const cloudProviderSelect = screen.getByTestId('resource-cloud-0') as HTMLSelectElement;
      const options = Array.from(cloudProviderSelect.options).filter(opt => opt.value !== '');
      
      expect(options).toHaveLength(3);
      expect(options.map(opt => opt.value)).toEqual(['aws-uuid-123', 'azure-uuid-456', 'gcp-uuid-789']);
    });

    it('handles blueprint with disabled cloud providers', async () => {
      const providersWithDisabled: CloudProvider[] = [
        ...mockCloudProviders,
        {
          id: 'disabled-uuid-999',
          name: 'disabled-cloud',
          displayName: 'Disabled Cloud',
          enabled: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(providersWithDisabled);

      const blueprintWithDisabled: Blueprint = {
        id: 'disabled-cloud-blueprint',
        name: 'Disabled Cloud Test',
        description: 'Test disabled providers',
        supportedCloudProviderIds: ['aws-uuid-123', 'disabled-uuid-999'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprintWithDisabled}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('resource-cloud-0')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('handles blueprint created before cloud provider system existed', async () => {
      const veryOldBlueprint: Blueprint = {
        id: 'very-old-blueprint',
        name: 'Ancient Blueprint',
        description: 'Created before cloud providers',
        supportedCloudProviderIds: [],
        resources: [
          {
            id: 'resource-1',
            name: 'Old Resource',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: '',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2020-01-01T00:00:00Z',
        updatedAt: '2020-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={veryOldBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveValue('Ancient Blueprint');
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Integration with CloudProviderLookupService', () => {
    it('verifies lookup service maintains state across operations', async () => {
      const lookupService = CloudProviderLookupService.getInstance();

      const blueprint: Blueprint = {
        id: 'state-test',
        name: 'State Test Blueprint',
        description: 'Test service state',
        supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456'],
        resources: [
          {
            id: 'resource-1',
            name: 'Resource 1',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
            configuration: {},
          },
        ],
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(
        <BlueprintForm
          blueprint={blueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      });

      expect(lookupService.isInitialized()).toBe(true);
      expect(lookupService.resolveCloudProviderId('aws')).toBe('aws-uuid-123');
      expect(lookupService.resolveCloudProviderId('azure')).toBe('azure-uuid-456');
      expect(lookupService.resolveCloudType('aws-uuid-123')).toBe('aws');
      expect(lookupService.resolveCloudType('azure-uuid-456')).toBe('azure');
    });
  });
});
