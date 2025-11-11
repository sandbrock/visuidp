import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DynamicResourceForm, type DynamicResourceFormRef } from './DynamicResourceForm';
import type { PropertySchema } from '../types/admin';
import { createRef } from 'react';

// Mock the PropertySchemaService
vi.mock('../services/PropertySchemaService', () => ({
  propertySchemaService: {
    getSchema: vi.fn(),
  },
}));

// Mock PropertyInput component
vi.mock('./PropertyInput', () => ({
  PropertyInput: ({ property }: { property: PropertySchema }) => (
    <div data-testid={`property-${property.propertyName}`}>
      {property.displayName}
    </div>
  ),
}));

/**
 * ECS Container Orchestrator Property Validation Tests
 * Task 7: Test property validation rules
 * 
 * Tests validation for all 8 ECS properties:
 * - launchType (LIST with FARGATE, EC2)
 * - taskCpu (LIST with CPU values)
 * - taskMemory (LIST with memory values)
 * - desiredTaskCount (NUMBER 1-100)
 * - enableAutoScaling (BOOLEAN)
 * - minTaskCount (NUMBER 1-100)
 * - maxTaskCount (NUMBER 1-100)
 * - instanceType (LIST with EC2 instance types)
 */
describe('DynamicResourceForm - ECS Property Validation (Task 7)', () => {

  // Helper function to create ECS property schemas
  const createEcsSchema = (): PropertySchema[] => [
    {
      id: '04010000-0000-0000-0000-000000000001',
      mappingId: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',
      propertyName: 'launchType',
      displayName: 'Launch Type',
      dataType: 'LIST',
      required: true,
      defaultValue: 'FARGATE',
      validationRules: {
        allowedValues: [
          { value: 'FARGATE', label: 'Fargate (Serverless)' },
          { value: 'EC2', label: 'EC2 (Managed Instances)' },
        ],
      },
      displayOrder: 10,
    },
    {
      id: '04010000-0000-0000-0000-000000000002',
      mappingId: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',
      propertyName: 'taskCpu',
      displayName: 'Task CPU (CPU Units)',
      dataType: 'LIST',
      required: true,
      defaultValue: '512',
      validationRules: {
        allowedValues: [
          { value: '256', label: '256 (.25 vCPU)' },
          { value: '512', label: '512 (.5 vCPU)' },
          { value: '1024', label: '1024 (1 vCPU)' },
          { value: '2048', label: '2048 (2 vCPU)' },
          { value: '4096', label: '4096 (4 vCPU)' },
        ],
      },
      displayOrder: 20,
    },
    {
      id: '04010000-0000-0000-0000-000000000003',
      mappingId: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',
      propertyName: 'taskMemory',
      displayName: 'Task Memory (MiB)',
      dataType: 'LIST',
      required: true,
      defaultValue: '1024',
      validationRules: {
        allowedValues: [
          { value: '512', label: '512 MiB' },
          { value: '1024', label: '1024 MiB' },
          { value: '2048', label: '2048 MiB' },
          { value: '4096', label: '4096 MiB' },
          { value: '8192', label: '8192 MiB' },
          { value: '16384', label: '16384 MiB' },
          { value: '30720', label: '30720 MiB' },
        ],
      },
      displayOrder: 30,
    },
    {
      id: '04010000-0000-0000-0000-000000000004',
      mappingId: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',
      propertyName: 'desiredTaskCount',
      displayName: 'Desired Task Count',
      dataType: 'NUMBER',
      required: true,
      defaultValue: '2',
      validationRules: {
        min: 1,
        max: 100,
      },
      displayOrder: 40,
    },
    {
      id: '04010000-0000-0000-0000-000000000005',
      mappingId: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',
      propertyName: 'enableAutoScaling',
      displayName: 'Enable Auto Scaling',
      dataType: 'BOOLEAN',
      required: false,
      defaultValue: 'false',
      displayOrder: 50,
    },
    {
      id: '04010000-0000-0000-0000-000000000006',
      mappingId: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',
      propertyName: 'minTaskCount',
      displayName: 'Minimum Task Count',
      dataType: 'NUMBER',
      required: false,
      defaultValue: '1',
      validationRules: {
        min: 1,
        max: 100,
      },
      displayOrder: 60,
    },
    {
      id: '04010000-0000-0000-0000-000000000007',
      mappingId: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',
      propertyName: 'maxTaskCount',
      displayName: 'Maximum Task Count',
      dataType: 'NUMBER',
      required: false,
      defaultValue: '10',
      validationRules: {
        min: 1,
        max: 100,
      },
      displayOrder: 70,
    },
    {
      id: '04010000-0000-0000-0000-000000000008',
      mappingId: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',
      propertyName: 'instanceType',
      displayName: 'EC2 Instance Type',
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
      displayOrder: 80,
    },
  ];

  // Test 1: launchType validation - only FARGATE and EC2 allowed
  it('should validate launchType dropdown shows only FARGATE and EC2', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ launchType: 'INVALID' }}
        onChange={onChange}
      />
    );

    await screen.findByText('Launch Type');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.launchType).toBe('Launch Type must be one of: FARGATE, EC2');
  });

  it('should accept valid launchType values (FARGATE)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ launchType: 'FARGATE' }}
        onChange={onChange}
      />
    );

    await screen.findByText('Launch Type');

    const errors = ref.current?.validateAll();
    expect(errors?.launchType).toBeUndefined();
  });

  it('should accept valid launchType values (EC2)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ launchType: 'EC2' }}
        onChange={onChange}
      />
    );

    await screen.findByText('Launch Type');

    const errors = ref.current?.validateAll();
    expect(errors?.launchType).toBeUndefined();
  });

  // Test 2: taskCpu validation - only valid CPU values allowed
  it('should validate taskCpu dropdown shows only valid CPU values', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ taskCpu: '128' }}
        onChange={onChange}
      />
    );

    await screen.findByText('Task CPU (CPU Units)');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.taskCpu).toBe('Task CPU (CPU Units) must be one of: 256, 512, 1024, 2048, 4096');
  });

  it('should accept all valid taskCpu values', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const validCpuValues = ['256', '512', '1024', '2048', '4096'];

    for (const cpuValue of validCpuValues) {
      const onChange = vi.fn();
      const ref = createRef<DynamicResourceFormRef>();

      const { unmount } = render(
        <DynamicResourceForm
          ref={ref}
          resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
          cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
          values={{ taskCpu: cpuValue }}
          onChange={onChange}
        />
      );

      await screen.findByText('Task CPU (CPU Units)');

      const errors = ref.current?.validateAll();
      expect(errors?.taskCpu).toBeUndefined();

      unmount();
    }
  });

  // Test 3: taskMemory validation - only valid memory values allowed
  it('should validate taskMemory dropdown shows only valid memory values', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ taskMemory: '256' }}
        onChange={onChange}
      />
    );

    await screen.findByText('Task Memory (MiB)');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.taskMemory).toBe('Task Memory (MiB) must be one of: 512, 1024, 2048, 4096, 8192, 16384, 30720');
  });

  it('should accept all valid taskMemory values', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const validMemoryValues = ['512', '1024', '2048', '4096', '8192', '16384', '30720'];

    for (const memoryValue of validMemoryValues) {
      const onChange = vi.fn();
      const ref = createRef<DynamicResourceFormRef>();

      const { unmount } = render(
        <DynamicResourceForm
          ref={ref}
          resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
          cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
          values={{ taskMemory: memoryValue }}
          onChange={onChange}
        />
      );

      await screen.findByText('Task Memory (MiB)');

      const errors = ref.current?.validateAll();
      expect(errors?.taskMemory).toBeUndefined();

      unmount();
    }
  });

  // Test 4: desiredTaskCount validation - accepts 1-100, rejects outside range
  it('should reject desiredTaskCount below minimum (0)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ desiredTaskCount: 0 }}
        onChange={onChange}
      />
    );

    await screen.findByText('Desired Task Count');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.desiredTaskCount).toBe('Desired Task Count must be between 1 and 100');
  });

  it('should reject desiredTaskCount above maximum (101)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ desiredTaskCount: 101 }}
        onChange={onChange}
      />
    );

    await screen.findByText('Desired Task Count');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.desiredTaskCount).toBe('Desired Task Count must be between 1 and 100');
  });

  it('should accept desiredTaskCount at boundaries (1 and 100)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const boundaryValues = [1, 100];

    for (const value of boundaryValues) {
      const onChange = vi.fn();
      const ref = createRef<DynamicResourceFormRef>();

      const { unmount } = render(
        <DynamicResourceForm
          ref={ref}
          resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
          cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
          values={{ desiredTaskCount: value }}
          onChange={onChange}
        />
      );

      await screen.findByText('Desired Task Count');

      const errors = ref.current?.validateAll();
      expect(errors?.desiredTaskCount).toBeUndefined();

      unmount();
    }
  });

  it('should accept desiredTaskCount within range (50)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ desiredTaskCount: 50 }}
        onChange={onChange}
      />
    );

    await screen.findByText('Desired Task Count');

    const errors = ref.current?.validateAll();
    expect(errors?.desiredTaskCount).toBeUndefined();
  });

  // Test 5: minTaskCount validation - accepts 1-100, rejects outside range
  it('should reject minTaskCount below minimum (0)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ minTaskCount: 0 }}
        onChange={onChange}
      />
    );

    await screen.findByText('Minimum Task Count');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.minTaskCount).toBe('Minimum Task Count must be between 1 and 100');
  });

  it('should reject minTaskCount above maximum (101)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ minTaskCount: 101 }}
        onChange={onChange}
      />
    );

    await screen.findByText('Minimum Task Count');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.minTaskCount).toBe('Minimum Task Count must be between 1 and 100');
  });

  it('should accept minTaskCount within range (1, 50, 100)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const validValues = [1, 50, 100];

    for (const value of validValues) {
      const onChange = vi.fn();
      const ref = createRef<DynamicResourceFormRef>();

      const { unmount } = render(
        <DynamicResourceForm
          ref={ref}
          resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
          cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
          values={{ minTaskCount: value }}
          onChange={onChange}
        />
      );

      await screen.findByText('Minimum Task Count');

      const errors = ref.current?.validateAll();
      expect(errors?.minTaskCount).toBeUndefined();

      unmount();
    }
  });

  // Test 6: maxTaskCount validation - accepts 1-100, rejects outside range
  it('should reject maxTaskCount below minimum (0)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ maxTaskCount: 0 }}
        onChange={onChange}
      />
    );

    await screen.findByText('Maximum Task Count');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.maxTaskCount).toBe('Maximum Task Count must be between 1 and 100');
  });

  it('should reject maxTaskCount above maximum (101)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ maxTaskCount: 101 }}
        onChange={onChange}
      />
    );

    await screen.findByText('Maximum Task Count');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.maxTaskCount).toBe('Maximum Task Count must be between 1 and 100');
  });

  it('should accept maxTaskCount within range (1, 50, 100)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const validValues = [1, 50, 100];

    for (const value of validValues) {
      const onChange = vi.fn();
      const ref = createRef<DynamicResourceFormRef>();

      const { unmount } = render(
        <DynamicResourceForm
          ref={ref}
          resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
          cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
          values={{ maxTaskCount: value }}
          onChange={onChange}
        />
      );

      await screen.findByText('Maximum Task Count');

      const errors = ref.current?.validateAll();
      expect(errors?.maxTaskCount).toBeUndefined();

      unmount();
    }
  });

  // Test 7: enableAutoScaling validation - toggles between true/false
  it('should accept enableAutoScaling as true', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ enableAutoScaling: true }}
        onChange={onChange}
      />
    );

    await screen.findByText('Enable Auto Scaling');

    const errors = ref.current?.validateAll();
    expect(errors?.enableAutoScaling).toBeUndefined();
  });

  it('should accept enableAutoScaling as false', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ enableAutoScaling: false }}
        onChange={onChange}
      />
    );

    await screen.findByText('Enable Auto Scaling');

    const errors = ref.current?.validateAll();
    expect(errors?.enableAutoScaling).toBeUndefined();
  });

  it('should not require enableAutoScaling (optional field)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{}}
        onChange={onChange}
      />
    );

    await screen.findByText('Enable Auto Scaling');

    const errors = ref.current?.validateAll();
    expect(errors?.enableAutoScaling).toBeUndefined();
  });

  // Test 8: instanceType validation - only valid EC2 instance types allowed
  it('should validate instanceType dropdown shows only valid EC2 instance types', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{ instanceType: 'invalid.type' }}
        onChange={onChange}
      />
    );

    await screen.findByText('EC2 Instance Type');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.instanceType).toContain('EC2 Instance Type must be one of:');
    expect(errors?.instanceType).toContain('t3.small');
    expect(errors?.instanceType).toContain('c5.2xlarge');
  });

  it('should accept all valid instanceType values', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const validInstanceTypes = [
      't3.small', 't3.medium', 't3.large', 't3.xlarge',
      'm5.large', 'm5.xlarge', 'm5.2xlarge',
      'c5.large', 'c5.xlarge', 'c5.2xlarge'
    ];

    for (const instanceType of validInstanceTypes) {
      const onChange = vi.fn();
      const ref = createRef<DynamicResourceFormRef>();

      const { unmount } = render(
        <DynamicResourceForm
          ref={ref}
          resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
          cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
          values={{ instanceType }}
          onChange={onChange}
        />
      );

      await screen.findByText('EC2 Instance Type');

      const errors = ref.current?.validateAll();
      expect(errors?.instanceType).toBeUndefined();

      unmount();
    }
  });

  it('should not require instanceType (optional field)', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{}}
        onChange={onChange}
      />
    );

    await screen.findByText('EC2 Instance Type');

    const errors = ref.current?.validateAll();
    expect(errors?.instanceType).toBeUndefined();
  });

  // Test 9: Comprehensive validation - all properties together
  it('should validate all ECS properties together', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{
          launchType: 'FARGATE',
          taskCpu: '512',
          taskMemory: '1024',
          desiredTaskCount: 2,
          enableAutoScaling: false,
          minTaskCount: 1,
          maxTaskCount: 10,
          instanceType: 't3.medium',
        }}
        onChange={onChange}
      />
    );

    await screen.findByText('Launch Type');

    const errors = ref.current?.validateAll();
    expect(Object.keys(errors || {}).length).toBe(0);
  });

  it('should detect multiple validation errors', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{
          launchType: 'INVALID',
          taskCpu: '128',
          taskMemory: '256',
          desiredTaskCount: 0,
          minTaskCount: 101,
          maxTaskCount: 0,
          instanceType: 'invalid.type',
        }}
        onChange={onChange}
      />
    );

    await screen.findByText('Launch Type');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.launchType).toBeDefined();
    expect(errors?.taskCpu).toBeDefined();
    expect(errors?.taskMemory).toBeDefined();
    expect(errors?.desiredTaskCount).toBeDefined();
    expect(errors?.minTaskCount).toBeDefined();
    expect(errors?.maxTaskCount).toBeDefined();
    expect(errors?.instanceType).toBeDefined();
  });

  it('should require all required fields', async () => {
    const mockSchema = createEcsSchema();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="a1f4e5c6-7d8b-4a2f-9c01-1234567890a1"
        cloudProviderId="8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01"
        values={{}}
        onChange={onChange}
      />
    );

    await screen.findByText('Launch Type');

    const errors = ref.current?.validateAll();
    expect(errors).toBeDefined();
    expect(errors?.launchType).toBe('Launch Type is required');
    expect(errors?.taskCpu).toBe('Task CPU (CPU Units) is required');
    expect(errors?.taskMemory).toBe('Task Memory (MiB) is required');
    expect(errors?.desiredTaskCount).toBe('Desired Task Count is required');
    // Optional fields should not have errors
    expect(errors?.enableAutoScaling).toBeUndefined();
    expect(errors?.minTaskCount).toBeUndefined();
    expect(errors?.maxTaskCount).toBeUndefined();
    expect(errors?.instanceType).toBeUndefined();
  });
});
