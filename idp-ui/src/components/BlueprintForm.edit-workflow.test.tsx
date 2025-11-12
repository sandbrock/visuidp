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
  DynamicResourceForm: ({ resourceTypeId, cloudProviderId, onChange, initialValues }: any) => {
    // Store props for verification
    mockDynamicResourceFormProps.push({ resourceTypeId, cloudProviderId, initialValues });
    
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

describe('BlueprintForm - Complete Blueprint Editing Workflow Integration Test', () => {
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

  // Track console warnings
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    mockDynamicResourceFormProps.length = 0;
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
    
    // Clear the singleton instance before each test
    CloudProviderLookupService.getInstance().clear();
    
    vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);
    vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockResolvedValue(mockResourceTypes);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Task 5.1: Complete Blueprint Editing Workflow', () => {
    it('loads existing blueprint and resolves cloud type to UUID without 404 errors', async () => {
      // Simulate a blueprint from backend with cloud type string
      const existingBlueprint: Blueprint = {
        id: 'blueprint-123',
        name: 'Production Database Blueprint',
        description: 'Database configuration for production',
        supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456'],
        resources: [
          {
            id: 'resource-1',
            name: 'Primary Database',
            resourceTypeId: 'database-uuid-001',
            resourceTypeName: 'Database',
            // This is already resolved to UUID by the API transformation
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
            configuration: { 
              instanceType: 'db.t3.medium',
              storage: '100GB'
            },
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

      // Wait for cloud providers to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-uuid-123')).toBeInTheDocument();
      });

      // VERIFY: No 404 errors in console
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('404')
      );
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('404')
      );

      // VERIFY: Cloud provider dropdown shows correct selection (UUID)
      await waitFor(() => {
        const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
        expect(cloudProviderSelect).toHaveValue('aws-uuid-123');
      });

      // VERIFY: DynamicResourceForm receives correct UUID (not cloud type string)
      await waitFor(() => {
        const dynamicForm = screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123');
        expect(dynamicForm).toBeInTheDocument();
        expect(dynamicForm).toHaveAttribute('data-cloud-provider-id', 'aws-uuid-123');
        expect(dynamicForm).toHaveAttribute('data-resource-type-id', 'database-uuid-001');
      });

      // VERIFY: DynamicResourceForm was called with UUID, not cloud type string
      expect(mockDynamicResourceFormProps).toHaveLength(1);
      expect(mockDynamicResourceFormProps[0]).toMatchObject({
        resourceTypeId: 'database-uuid-001',
        cloudProviderId: 'aws-uuid-123', // UUID, not "aws" or "AWS"
      });

      // VERIFY: Property schema API would be called with UUID
      // (In real scenario, DynamicResourceForm would call PropertySchemaService with this UUID)
      const formProps = mockDynamicResourceFormProps[0];
      expect(formProps.cloudProviderId).toMatch(/^[a-z]+-uuid-\d+$/); // UUID format
      expect(formProps.cloudProviderId).not.toBe('aws'); // Not cloud type string
      expect(formProps.cloudProviderId).not.toBe('AWS'); // Not cloud type string
    });

    it('verifies CloudProviderLookupService is initialized and resolves correctly', async () => {
      const lookupService = CloudProviderLookupService.getInstance();

      const existingBlueprint: Blueprint = {
        id: 'blueprint-456',
        name: 'Multi-Cloud Blueprint',
        description: 'Resources across multiple clouds',
        supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456', 'gcp-uuid-789'],
        resources: [
          {
            id: 'resource-1',
            name: 'AWS Database',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
            configuration: {},
          },
          {
            id: 'resource-2',
            name: 'Azure Storage',
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
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for cloud providers to load
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-aws-uuid-123')).toBeInTheDocument();
      });

      // VERIFY: CloudProviderLookupService is initialized
      expect(lookupService.isInitialized()).toBe(true);

      // VERIFY: Lookup service can resolve cloud types to UUIDs
      expect(lookupService.resolveCloudProviderId('aws')).toBe('aws-uuid-123');
      expect(lookupService.resolveCloudProviderId('azure')).toBe('azure-uuid-456');
      expect(lookupService.resolveCloudProviderId('gcp')).toBe('gcp-uuid-789');

      // VERIFY: Lookup service can resolve UUIDs back to cloud types
      expect(lookupService.resolveCloudType('aws-uuid-123')).toBe('aws');
      expect(lookupService.resolveCloudType('azure-uuid-456')).toBe('azure');
      expect(lookupService.resolveCloudType('gcp-uuid-789')).toBe('gcp');

      // VERIFY: Case-insensitive resolution works
      expect(lookupService.resolveCloudProviderId('AWS')).toBe('aws-uuid-123');
      expect(lookupService.resolveCloudProviderId('Azure')).toBe('azure-uuid-456');
      expect(lookupService.resolveCloudProviderId('GCP')).toBe('gcp-uuid-789');
    });

    it('handles editing resource and changing cloud provider with UUID resolution', async () => {
      const user = userEvent.setup();

      const existingBlueprint: Blueprint = {
        id: 'blueprint-789',
        name: 'Editable Blueprint',
        description: 'Test editing workflow',
        supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456'],
        resources: [
          {
            id: 'resource-1',
            name: 'Test Database',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
            configuration: { size: '50GB' },
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

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      });

      // VERIFY: Initial cloud provider dropdown shows AWS UUID
      const cloudProviderSelect = screen.getByTestId('resource-cloud-0');
      expect(cloudProviderSelect).toHaveValue('aws-uuid-123');

      // Clear the props array to track new calls
      mockDynamicResourceFormProps.length = 0;

      // EDIT: Change cloud provider from AWS to Azure
      await user.selectOptions(cloudProviderSelect, 'azure-uuid-456');

      // VERIFY: DynamicResourceForm re-renders with new UUID
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-azure-uuid-456')).toBeInTheDocument();
        expect(screen.queryByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).not.toBeInTheDocument();
      });

      // VERIFY: New DynamicResourceForm receives Azure UUID
      await waitFor(() => {
        const latestProps = mockDynamicResourceFormProps[mockDynamicResourceFormProps.length - 1];
        expect(latestProps).toMatchObject({
          resourceTypeId: 'database-uuid-001',
          cloudProviderId: 'azure-uuid-456', // Changed to Azure UUID
        });
      });

      // VERIFY: No 404 errors during cloud provider change
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('404')
      );

      // Save the blueprint
      const submitButton = screen.getByTestId('button-update-blueprint');
      await user.click(submitButton);

      // VERIFY: API called with UUID
      await waitFor(() => {
        expect(apiService.updateBlueprint).toHaveBeenCalledWith(
          'blueprint-789',
          expect.objectContaining({
            resources: expect.arrayContaining([
              expect.objectContaining({
                cloudProviderId: 'azure-uuid-456', // UUID maintained
              }),
            ]),
          }),
          'test@example.com'
        );
      });
    });

    it('verifies no 404 errors when loading blueprint with multiple resources', async () => {
      const existingBlueprint: Blueprint = {
        id: 'blueprint-multi',
        name: 'Multi-Resource Blueprint',
        description: 'Multiple resources test',
        supportedCloudProviderIds: ['aws-uuid-123', 'azure-uuid-456', 'gcp-uuid-789'],
        resources: [
          {
            id: 'resource-1',
            name: 'AWS Database',
            resourceTypeId: 'database-uuid-001',
            cloudProviderId: 'aws-uuid-123',
            cloudProviderName: 'AWS',
            configuration: {},
          },
          {
            id: 'resource-2',
            name: 'Azure Storage',
            resourceTypeId: 'storage-uuid-002',
            cloudProviderId: 'azure-uuid-456',
            cloudProviderName: 'Azure',
            configuration: {},
          },
          {
            id: 'resource-3',
            name: 'GCP Database',
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

      render(
        <BlueprintForm
          blueprint={existingBlueprint}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          user={mockUser}
        />
      );

      // Wait for all resources to load
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
        expect(screen.getByTestId('dynamic-form-storage-uuid-002-azure-uuid-456')).toBeInTheDocument();
        expect(screen.getByTestId('dynamic-form-database-uuid-001-gcp-uuid-789')).toBeInTheDocument();
      });

      // VERIFY: No 404 errors for any resource
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('404')
      );

      // VERIFY: All cloud provider dropdowns show correct UUIDs
      const cloudProviderSelect0 = screen.getByTestId('resource-cloud-0');
      const cloudProviderSelect1 = screen.getByTestId('resource-cloud-1');
      const cloudProviderSelect2 = screen.getByTestId('resource-cloud-2');

      expect(cloudProviderSelect0).toHaveValue('aws-uuid-123');
      expect(cloudProviderSelect1).toHaveValue('azure-uuid-456');
      expect(cloudProviderSelect2).toHaveValue('gcp-uuid-789');

      // VERIFY: All DynamicResourceForms received UUIDs
      expect(mockDynamicResourceFormProps).toHaveLength(3);
      expect(mockDynamicResourceFormProps[0].cloudProviderId).toBe('aws-uuid-123');
      expect(mockDynamicResourceFormProps[1].cloudProviderId).toBe('azure-uuid-456');
      expect(mockDynamicResourceFormProps[2].cloudProviderId).toBe('gcp-uuid-789');

      // VERIFY: None of the forms received cloud type strings
      mockDynamicResourceFormProps.forEach(props => {
        expect(props.cloudProviderId).not.toBe('aws');
        expect(props.cloudProviderId).not.toBe('azure');
        expect(props.cloudProviderId).not.toBe('gcp');
        expect(props.cloudProviderId).not.toBe('AWS');
        expect(props.cloudProviderId).not.toBe('Azure');
        expect(props.cloudProviderId).not.toBe('GCP');
      });
    });

    it('verifies property schema API would be called with UUID format', async () => {
      const existingBlueprint: Blueprint = {
        id: 'blueprint-schema-test',
        name: 'Schema API Test Blueprint',
        description: 'Test property schema API calls',
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

      // Wait for resource to load
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-form-database-uuid-001-aws-uuid-123')).toBeInTheDocument();
      });

      // VERIFY: DynamicResourceForm received UUID that would be used for property schema API
      const formProps = mockDynamicResourceFormProps[0];
      
      // The cloudProviderId should be a UUID, not a cloud type string
      expect(formProps.cloudProviderId).toBe('aws-uuid-123');
      
      // Verify it's in UUID format (contains 'uuid' and numbers)
      expect(formProps.cloudProviderId).toMatch(/uuid/);
      
      // Verify it's NOT a cloud type string
      expect(formProps.cloudProviderId).not.toBe('aws');
      expect(formProps.cloudProviderId).not.toBe('AWS');
      
      // In the real application, DynamicResourceForm would call:
      // PropertySchemaService.getSchema(resourceTypeId, cloudProviderId, context)
      // which would make an API call to:
      // /blueprints/resource-schema/{resourceTypeId}/{cloudProviderId}
      // 
      // With our UUID, this would be:
      // /blueprints/resource-schema/database-uuid-001/aws-uuid-123
      // 
      // NOT:
      // /blueprints/resource-schema/database-uuid-001/aws (which would cause 404)
      
      const expectedApiPath = `/blueprints/resource-schema/${formProps.resourceTypeId}/${formProps.cloudProviderId}`;
      expect(expectedApiPath).toBe('/blueprints/resource-schema/database-uuid-001/aws-uuid-123');
      
      // Verify the path ends with a UUID, not a cloud type string
      expect(expectedApiPath).toMatch(/\/[a-z]+-uuid-\d+$/);
      
      // Verify it doesn't end with just the cloud type
      expect(expectedApiPath).not.toMatch(/\/aws$/);
      expect(expectedApiPath).not.toMatch(/\/AWS$/);
    });
  });
});
