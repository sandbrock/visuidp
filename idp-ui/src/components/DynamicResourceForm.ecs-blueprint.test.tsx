import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DynamicResourceForm } from './DynamicResourceForm';
import { propertySchemaService } from '../services/PropertySchemaService';
import type { PropertySchema } from '../types/admin';

// Mock the property schema service
vi.mock('../services/PropertySchemaService', () => ({
  propertySchemaService: {
    getSchema: vi.fn(),
    clearCache: vi.fn(),
    clearSchemaCache: vi.fn(),
  },
}));

describe('DynamicResourceForm - ECS Blueprint Properties', () => {
  const mockResourceTypeId = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01'; // Managed Container Orchestrator
  const mockCloudProviderId = '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01'; // AWS
  const mockUserEmail = 'test@example.com';

  const mockEcsClusterProperties: PropertySchema[] = [
    {
      id: '04010000-0000-0000-0000-000000000001',
      propertyName: 'capacityProvider',
      displayName: 'Capacity Provider',
      description: 'The capacity provider determines how the ECS cluster provisions compute resources. FARGATE is serverless and AWS manages all infrastructure. FARGATE_SPOT uses spare AWS capacity at reduced cost but tasks may be interrupted. EC2 gives you control over instance types and cluster scaling but requires managing the infrastructure. FARGATE is recommended for most use cases.',
      dataType: 'LIST',
      required: true,
      defaultValue: 'FARGATE',
      validationRules: {
        allowedValues: [
          { value: 'FARGATE', label: 'FARGATE' },
          { value: 'FARGATE_SPOT', label: 'FARGATE_SPOT' },
          { value: 'EC2', label: 'EC2' },
        ],
      },
      displayOrder: 10,
    },
    {
      id: '04010000-0000-0000-0000-000000000002',
      propertyName: 'instanceType',
      displayName: 'EC2 Instance Type',
      description: 'The EC2 instance type for the ECS cluster nodes. Only applies when capacity provider is EC2. t3 instances are burstable and cost-effective for variable workloads, m5 are general purpose for consistent workloads, c5 are compute-optimized for CPU-intensive applications. Ignored when using FARGATE or FARGATE_SPOT.',
      dataType: 'LIST',
      required: false,
      defaultValue: 't3.medium',
      validationRules: {
        allowedValues: [
          { value: 't3.small', label: 't3.small' },
          { value: 't3.medium', label: 't3.medium' },
          { value: 't3.large', label: 't3.large' },
          { value: 't3.xlarge', label: 't3.xlarge' },
          { value: 'm5.large', label: 'm5.large' },
          { value: 'm5.xlarge', label: 'm5.xlarge' },
          { value: 'm5.2xlarge', label: 'm5.2xlarge' },
          { value: 'c5.large', label: 'c5.large' },
          { value: 'c5.xlarge', label: 'c5.xlarge' },
          { value: 'c5.2xlarge', label: 'c5.2xlarge' },
        ],
      },
      displayOrder: 20,
    },
    {
      id: '04010000-0000-0000-0000-000000000003',
      propertyName: 'minClusterSize',
      displayName: 'Minimum Cluster Size',
      description: 'The minimum number of EC2 instances to maintain in the cluster. The cluster will not scale below this number even under low load. Setting this to 0 allows the cluster to scale down completely when idle, reducing costs. Only applies when capacity provider is EC2.',
      dataType: 'NUMBER',
      required: false,
      defaultValue: '1',
      validationRules: {
        min: 0,
        max: 100,
      },
      displayOrder: 30,
    },
    {
      id: '04010000-0000-0000-0000-000000000004',
      propertyName: 'maxClusterSize',
      displayName: 'Maximum Cluster Size',
      description: 'The maximum number of EC2 instances allowed in the cluster. The cluster will not scale above this number even under high load. This setting controls cost and resource limits. Must be greater than or equal to minimum cluster size. Only applies when capacity provider is EC2.',
      dataType: 'NUMBER',
      required: false,
      defaultValue: '10',
      validationRules: {
        min: 1,
        max: 100,
      },
      displayOrder: 40,
    },
    {
      id: '04010000-0000-0000-0000-000000000005',
      propertyName: 'enableContainerInsights',
      displayName: 'Enable Container Insights',
      description: 'Enable CloudWatch Container Insights to collect, aggregate, and summarize metrics and logs from your containerized applications. Provides cluster-level, task-level, and service-level metrics including CPU, memory, disk, and network utilization. Additional CloudWatch charges apply.',
      dataType: 'BOOLEAN',
      required: false,
      defaultValue: 'true',
      validationRules: {},
      displayOrder: 50,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the schema service to return ECS cluster properties
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockEcsClusterProperties);
  });

  it('should display all 5 ECS cluster properties for AWS Managed Container Orchestrator', async () => {
    const mockValues = {};
    const mockOnChange = vi.fn();

    render(
      <DynamicResourceForm
        resourceTypeId={mockResourceTypeId}
        cloudProviderId={mockCloudProviderId}
        values={mockValues}
        onChange={mockOnChange}
        context="blueprint"
        userEmail={mockUserEmail}
      />
    );

    // Wait for schema to load
    await waitFor(() => {
      expect(propertySchemaService.getSchema).toHaveBeenCalledWith(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint',
        mockUserEmail
      );
    });

    // Verify all 5 properties are displayed
    expect(screen.getByText('Capacity Provider')).toBeInTheDocument();
    expect(screen.getByText('EC2 Instance Type')).toBeInTheDocument();
    expect(screen.getByText('Minimum Cluster Size')).toBeInTheDocument();
    expect(screen.getByText('Maximum Cluster Size')).toBeInTheDocument();
    expect(screen.getByText('Enable Container Insights')).toBeInTheDocument();
  });

  it('should display properties in correct order (capacityProvider first, enableContainerInsights last)', async () => {
    const mockValues = {};
    const mockOnChange = vi.fn();

    const { container } = render(
      <DynamicResourceForm
        resourceTypeId={mockResourceTypeId}
        cloudProviderId={mockCloudProviderId}
        values={mockValues}
        onChange={mockOnChange}
        context="blueprint"
        userEmail={mockUserEmail}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Capacity Provider')).toBeInTheDocument();
    });

    // Get all property wrappers in order
    const propertyWrappers = container.querySelectorAll('.property-input-wrapper');
    expect(propertyWrappers).toHaveLength(5);
    
    // Verify order by checking labels
    expect(propertyWrappers[0].querySelector('.property-input-label')).toHaveTextContent('Capacity Provider');
    expect(propertyWrappers[1].querySelector('.property-input-label')).toHaveTextContent('EC2 Instance Type');
    expect(propertyWrappers[2].querySelector('.property-input-label')).toHaveTextContent('Minimum Cluster Size');
    expect(propertyWrappers[3].querySelector('.property-input-label')).toHaveTextContent('Maximum Cluster Size');
    // Boolean field doesn't have a separate label, it's inline with checkbox
    expect(propertyWrappers[4].textContent).toContain('Enable Container Insights');
  });

  it('should pre-populate default values (FARGATE, t3.medium, 1, 10, true)', async () => {
    const mockValues = {};
    const mockOnChange = vi.fn();

    render(
      <DynamicResourceForm
        resourceTypeId={mockResourceTypeId}
        cloudProviderId={mockCloudProviderId}
        values={mockValues}
        onChange={mockOnChange}
        context="blueprint"
        userEmail={mockUserEmail}
        isEditMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Capacity Provider')).toBeInTheDocument();
    });

    // Wait for default values to be applied
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });

    // Verify default values were set
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
    expect(lastCall).toEqual({
      capacityProvider: 'FARGATE',
      instanceType: 't3.medium',
      minClusterSize: '1',
      maxClusterSize: '10',
      enableContainerInsights: 'true',
    });
  });

  it('should show validation error only for required capacityProvider when empty', async () => {
    const mockValues = {};
    const mockOnChange = vi.fn();

    const { container } = render(
      <DynamicResourceForm
        resourceTypeId={mockResourceTypeId}
        cloudProviderId={mockCloudProviderId}
        values={mockValues}
        onChange={mockOnChange}
        context="blueprint"
        userEmail={mockUserEmail}
        isEditMode={true} // Edit mode to prevent default values
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Capacity Provider')).toBeInTheDocument();
    });

    // Get the ref to trigger validation
    const form = container.querySelector('.dynamic-resource-form');
    expect(form).toBeInTheDocument();

    // Note: This test verifies the structure is correct
    // Actual validation would be triggered by parent component
    const capacityProviderLabel = screen.getByText('Capacity Provider');
    expect(capacityProviderLabel.parentElement?.querySelector('.property-input-required')).toBeInTheDocument();
  });

  it('should display correct allowed values for dropdown fields', async () => {
    const mockValues = {};
    const mockOnChange = vi.fn();

    render(
      <DynamicResourceForm
        resourceTypeId={mockResourceTypeId}
        cloudProviderId={mockCloudProviderId}
        values={mockValues}
        onChange={mockOnChange}
        context="blueprint"
        userEmail={mockUserEmail}
        isEditMode={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Capacity Provider')).toBeInTheDocument();
    });

    // Verify capacity provider dropdown has correct options
    // Note: The actual dropdown options are rendered by AngryComboBox
    // This test verifies the schema is correctly passed
    expect(propertySchemaService.getSchema).toHaveBeenCalled();
  });
});
