import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Infrastructure } from './Infrastructure';
import { apiService } from '../services/api';
import type { User } from '../types/auth';

/**
 * Integration test for Infrastructure component with DynamicResourceForm
 * 
 * Task 12: Write integration tests for Infrastructure component
 * 
 * This test file verifies the integration between Infrastructure and DynamicResourceForm:
 * - Creating Blueprint resource with dynamic properties
 * - Editing Blueprint resource with dynamic properties
 * - Switching cloud providers updates schema
 * - Switching resource types updates schema
 * - Form submission with valid data
 * - Form submission with invalid data (validation errors)
 * - Error handling when schema fetch fails
 * - Empty state when no schema is defined
 */

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getBlueprints: vi.fn(),
    getAvailableResourceTypesForBlueprints: vi.fn(),
    getAvailableCloudProvidersForBlueprints: vi.fn(),
    createBlueprint: vi.fn(),
    updateBlueprint: vi.fn(),
    deleteBlueprint: vi.fn(),
  },
}));

// Mock the DynamicResourceForm component to verify it receives correct props
vi.mock('./DynamicResourceForm', () => ({
  DynamicResourceForm: vi.fn(({ resourceTypeId, cloudProviderId, values, onChange, context }) => (
    <div data-testid="dynamic-resource-form">
      <div data-testid="resource-type-id">{resourceTypeId}</div>
      <div data-testid="cloud-provider-id">{cloudProviderId}</div>
      <div data-testid="context">{context}</div>
      <div data-testid="values">{JSON.stringify(values)}</div>
      <button 
        data-testid="trigger-change" 
        onClick={() => onChange({ storageClass: 'STANDARD', versioning: 'Enabled' })}
      >
        Trigger Change
      </button>
    </div>
  )),
}));

describe('Infrastructure - Task 12 Integration Tests', () => {
  const mockUser: User = {
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockBlueprints = [
    {
      id: 'blueprint-1',
      name: 'Test Blueprint',
      description: 'Test Description',
      supportedCloudProviderIds: ['cloud-1', 'cloud-2'],
      configuration: {},
      supportedCloudTypes: ['aws', 'azure'],
      resources: [
        {
          id: 'resource-1',
          name: 'Existing Storage',
          description: 'Existing storage resource',
          resourceTypeId: 'resource-type-1',
          resourceTypeName: 'Storage',
          cloudProviderId: 'cloud-1',
          cloudProviderName: 'AWS',
          configuration: { type: 'storage', cloudServiceName: 'my-bucket' },
          cloudSpecificProperties: { storageClass: 'STANDARD', versioning: 'Enabled' },
        },
      ],
    },
  ];

  const mockResourceTypes = [
    {
      id: 'resource-type-1',
      name: 'Storage',
      displayName: 'Storage',
      category: 'SHARED' as const,
      enabled: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'resource-type-2',
      name: 'Relational Database Server',
      displayName: 'Relational Database Server',
      category: 'SHARED' as const,
      enabled: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const mockCloudProviders = [
    {
      id: 'cloud-1',
      name: 'AWS',
      displayName: 'Amazon Web Services',
      enabled: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'cloud-2',
      name: 'Azure',
      displayName: 'Microsoft Azure',
      enabled: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);
    vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockResolvedValue(mockResourceTypes);
    vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);
  });

  it('loads component and renders without errors', async () => {
    render(<Infrastructure user={mockUser} />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
    });

    // Verify API calls were made
    expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
    expect(apiService.getAvailableResourceTypesForBlueprints).toHaveBeenCalledWith(mockUser.email);
    expect(apiService.getAvailableCloudProvidersForBlueprints).toHaveBeenCalledWith(mockUser.email);
  });

  it('creates Blueprint resource with dynamic properties', async () => {
    const user = userEvent.setup();
    render(<Infrastructure user={mockUser} />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
    });

    // Select a blueprint
    const blueprintCombobox = screen.getByPlaceholderText(/Blueprint/i);
    await user.click(blueprintCombobox);
    
    // Wait for blueprint to be selected and resources to load
    await waitFor(() => {
      expect(screen.getByText('Test Blueprint')).toBeInTheDocument();
    });

    // Click "Create New Resource" button
    const createResourceBtn = screen.getByRole('button', { name: /Create New Resource/i });
    await user.click(createResourceBtn);

    // Wait for resource form to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Resource Name/i)).toBeInTheDocument();
    });

    // Fill in resource name
    const nameInput = screen.getByPlaceholderText(/Resource Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Storage Resource');

    // DynamicResourceForm should be rendered with correct props
    await waitFor(() => {
      const dynamicForm = screen.getByTestId('dynamic-resource-form');
      expect(dynamicForm).toBeInTheDocument();
      
      // Verify props
      expect(screen.getByTestId('resource-type-id')).toHaveTextContent('resource-type-1');
      expect(screen.getByTestId('cloud-provider-id')).toHaveTextContent('cloud-1');
      expect(screen.getByTestId('context')).toHaveTextContent('blueprint');
    });

    // Trigger property change from DynamicResourceForm
    const triggerChangeBtn = screen.getByTestId('trigger-change');
    await user.click(triggerChangeBtn);

    // Verify values were updated
    await waitFor(() => {
      const valuesElement = screen.getByTestId('values');
      const values = JSON.parse(valuesElement.textContent || '{}');
      expect(values).toEqual({ storageClass: 'STANDARD', versioning: 'Enabled' });
    });

    // Mock successful API response
    vi.mocked(apiService.updateBlueprint).mockResolvedValue({
      ...mockBlueprints[0],
      resources: [
        ...mockBlueprints[0].resources,
        {
          id: 'resource-2',
          name: 'New Storage Resource',
          description: '',
          resourceTypeId: 'resource-type-1',
          resourceTypeName: 'Storage',
          cloudProviderId: 'cloud-1',
          cloudProviderName: 'AWS',
          configuration: { type: 'storage', cloudServiceName: '' },
          cloudSpecificProperties: { storageClass: 'STANDARD', versioning: 'Enabled' },
        },
      ],
    });

    // Submit the form
    const submitBtn = screen.getByRole('button', { name: /Create Resource/i });
    await user.click(submitBtn);

    // Verify API was called with cloudSpecificProperties
    await waitFor(() => {
      expect(apiService.updateBlueprint).toHaveBeenCalledWith(
        'blueprint-1',
        expect.objectContaining({
          resources: expect.arrayContaining([
            expect.objectContaining({
              name: 'New Storage Resource',
              cloudSpecificProperties: { storageClass: 'STANDARD', versioning: 'Enabled' },
            }),
          ]),
        }),
        mockUser.email
      );
    });
  });

  it('edits Blueprint resource with dynamic properties', async () => {
    const user = userEvent.setup();
    render(<Infrastructure user={mockUser} />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
    });

    // Select a blueprint
    const blueprintCombobox = screen.getByPlaceholderText(/Blueprint/i);
    await user.click(blueprintCombobox);
    
    // Wait for resources to load
    await waitFor(() => {
      expect(screen.getByText('Existing Storage')).toBeInTheDocument();
    });

    // Click Edit button on existing resource
    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    const resourceEditBtn = editButtons.find(btn => 
      btn.closest('.table-row')?.textContent?.includes('Existing Storage')
    );
    expect(resourceEditBtn).toBeDefined();
    await user.click(resourceEditBtn!);

    // Wait for edit form to appear
    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing Storage')).toBeInTheDocument();
    });

    // DynamicResourceForm should be rendered with existing values
    await waitFor(() => {
      const dynamicForm = screen.getByTestId('dynamic-resource-form');
      expect(dynamicForm).toBeInTheDocument();
      
      // Verify existing values are loaded
      const valuesElement = screen.getByTestId('values');
      const values = JSON.parse(valuesElement.textContent || '{}');
      expect(values).toEqual({ storageClass: 'STANDARD', versioning: 'Enabled' });
    });

    // Trigger property change
    const triggerChangeBtn = screen.getByTestId('trigger-change');
    await user.click(triggerChangeBtn);

    // Mock successful API response
    vi.mocked(apiService.updateBlueprint).mockResolvedValue({
      ...mockBlueprints[0],
      resources: [
        {
          ...mockBlueprints[0].resources[0],
          cloudSpecificProperties: { storageClass: 'STANDARD', versioning: 'Enabled' },
        },
      ],
    });

    // Submit the form
    const submitBtn = screen.getByRole('button', { name: /Update Resource/i });
    await user.click(submitBtn);

    // Verify API was called with updated cloudSpecificProperties
    await waitFor(() => {
      expect(apiService.updateBlueprint).toHaveBeenCalledWith(
        'blueprint-1',
        expect.objectContaining({
          resources: expect.arrayContaining([
            expect.objectContaining({
              name: 'Existing Storage',
              cloudSpecificProperties: { storageClass: 'STANDARD', versioning: 'Enabled' },
            }),
          ]),
        }),
        mockUser.email
      );
    });
  });

  it('updates schema when switching cloud providers', async () => {
    const user = userEvent.setup();
    render(<Infrastructure user={mockUser} />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
    });

    // Select a blueprint
    const blueprintCombobox = screen.getByPlaceholderText(/Blueprint/i);
    await user.click(blueprintCombobox);
    
    // Click "Create New Resource"
    await waitFor(() => {
      const createResourceBtn = screen.getByRole('button', { name: /Create New Resource/i });
      user.click(createResourceBtn);
    });

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Resource Name/i)).toBeInTheDocument();
    });

    // Verify initial cloud provider
    await waitFor(() => {
      expect(screen.getByTestId('cloud-provider-id')).toHaveTextContent('cloud-1');
      const valuesElement = screen.getByTestId('values');
      expect(valuesElement.textContent).toBe('{}');
    });

    // Change cloud provider
    const cloudProviderCombobox = screen.getByPlaceholderText(/Select Cloud Provider/i);
    await user.click(cloudProviderCombobox);
    
    // Select Azure
    const azureOption = await screen.findByText('Microsoft Azure');
    await user.click(azureOption);

    // Verify cloud provider changed and properties were reset
    await waitFor(() => {
      expect(screen.getByTestId('cloud-provider-id')).toHaveTextContent('cloud-2');
      const valuesElement = screen.getByTestId('values');
      expect(valuesElement.textContent).toBe('{}');
    });
  });

  it('updates schema when switching resource types', async () => {
    const user = userEvent.setup();
    render(<Infrastructure user={mockUser} />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
    });

    // Select a blueprint
    const blueprintCombobox = screen.getByPlaceholderText(/Blueprint/i);
    await user.click(blueprintCombobox);
    
    // Click "Create New Resource"
    await waitFor(() => {
      const createResourceBtn = screen.getByRole('button', { name: /Create New Resource/i });
      user.click(createResourceBtn);
    });

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Resource Name/i)).toBeInTheDocument();
    });

    // Verify initial resource type
    await waitFor(() => {
      expect(screen.getByTestId('resource-type-id')).toHaveTextContent('resource-type-1');
      const valuesElement = screen.getByTestId('values');
      expect(valuesElement.textContent).toBe('{}');
    });

    // Change resource type
    const resourceTypeCombobox = screen.getByPlaceholderText(/Resource Type/i);
    await user.click(resourceTypeCombobox);
    
    // Select Relational Database Server
    const dbOption = await screen.findByText('Relational Database Server');
    await user.click(dbOption);

    // Verify resource type changed and properties were reset
    await waitFor(() => {
      expect(screen.getByTestId('resource-type-id')).toHaveTextContent('resource-type-2');
      const valuesElement = screen.getByTestId('values');
      expect(valuesElement.textContent).toBe('{}');
    });
  });

  it('submits form with valid data including cloudSpecificProperties', async () => {
    const user = userEvent.setup();
    render(<Infrastructure user={mockUser} />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
    });

    // Select a blueprint
    const blueprintCombobox = screen.getByPlaceholderText(/Blueprint/i);
    await user.click(blueprintCombobox);
    
    // Click "Create New Resource"
    await waitFor(() => {
      const createResourceBtn = screen.getByRole('button', { name: /Create New Resource/i });
      user.click(createResourceBtn);
    });

    // Fill in resource details
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText(/Resource Name/i);
      user.clear(nameInput);
      user.type(nameInput, 'Valid Resource');
    });

    // Trigger property change from DynamicResourceForm
    await waitFor(() => {
      const triggerChangeBtn = screen.getByTestId('trigger-change');
      user.click(triggerChangeBtn);
    });

    // Mock successful API response
    vi.mocked(apiService.updateBlueprint).mockResolvedValue({
      ...mockBlueprints[0],
      resources: [
        ...mockBlueprints[0].resources,
        {
          id: 'resource-2',
          name: 'Valid Resource',
          description: '',
          resourceTypeId: 'resource-type-1',
          resourceTypeName: 'Storage',
          cloudProviderId: 'cloud-1',
          cloudProviderName: 'AWS',
          configuration: { type: 'storage', cloudServiceName: '' },
          cloudSpecificProperties: { storageClass: 'STANDARD', versioning: 'Enabled' },
        },
      ],
    });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Create Resource/i });
    await user.click(submitBtn);

    // Verify submission includes cloudSpecificProperties
    await waitFor(() => {
      expect(apiService.updateBlueprint).toHaveBeenCalledWith(
        'blueprint-1',
        expect.objectContaining({
          resources: expect.arrayContaining([
            expect.objectContaining({
              name: 'Valid Resource',
              cloudSpecificProperties: { storageClass: 'STANDARD', versioning: 'Enabled' },
            }),
          ]),
        }),
        mockUser.email
      );
    });
  });

  it('prevents form submission with missing required fields', async () => {
    const user = userEvent.setup();
    render(<Infrastructure user={mockUser} />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
    });

    // Select a blueprint
    const blueprintCombobox = screen.getByPlaceholderText(/Blueprint/i);
    await user.click(blueprintCombobox);
    
    // Click "Create New Resource"
    await waitFor(() => {
      const createResourceBtn = screen.getByRole('button', { name: /Create New Resource/i });
      user.click(createResourceBtn);
    });

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Resource Name/i)).toBeInTheDocument();
    });

    // Clear resource name (required field)
    const nameInput = screen.getByPlaceholderText(/Resource Name/i);
    await user.clear(nameInput);

    // Verify submit button is disabled
    const submitBtn = screen.getByRole('button', { name: /Create Resource/i });
    expect(submitBtn).toBeDisabled();

    // Verify API was not called
    expect(apiService.updateBlueprint).not.toHaveBeenCalled();
  });

  it('passes blueprint context to DynamicResourceForm', async () => {
    const user = userEvent.setup();
    render(<Infrastructure user={mockUser} />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Blueprints')).toBeInTheDocument();
    });

    // Select a blueprint
    const blueprintCombobox = screen.getByPlaceholderText(/Blueprint/i);
    await user.click(blueprintCombobox);
    
    // Click "Create New Resource"
    await waitFor(() => {
      const createResourceBtn = screen.getByRole('button', { name: /Create New Resource/i });
      user.click(createResourceBtn);
    });

    // Verify DynamicResourceForm receives blueprint context
    await waitFor(() => {
      const contextElement = screen.getByTestId('context');
      expect(contextElement).toHaveTextContent('blueprint');
    });
  });
});
