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

describe('DynamicResourceForm - Validation Logic (Task 5.4)', () => {
  it('should validate required fields', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'requiredField',
        displayName: 'Required Field',
        dataType: 'STRING',
        required: true,
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Required Field');

    // Validate all properties
    const errors = ref.current?.validateAll();

    // Should have error for required field
    expect(errors).toBeDefined();
    expect(errors?.requiredField).toBe('Required Field is required');
  });

  it('should validate NUMBER min/max rules', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'numberField',
        displayName: 'Number Field',
        dataType: 'NUMBER',
        required: false,
        validationRules: {
          min: 10,
          max: 100,
        },
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{ numberField: 5 }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Number Field');

    // Validate all properties
    const errors = ref.current?.validateAll();

    // Should have error for value below min
    expect(errors).toBeDefined();
    expect(errors?.numberField).toBe('Number Field must be between 10 and 100');
  });

  it('should validate STRING pattern rules', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'emailField',
        displayName: 'Email Field',
        dataType: 'STRING',
        required: false,
        validationRules: {
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{ emailField: 'invalid-email' }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Email Field');

    // Validate all properties
    const errors = ref.current?.validateAll();

    // Should have error for invalid pattern
    expect(errors).toBeDefined();
    expect(errors?.emailField).toBe('Email Field format is invalid');
  });

  it('should validate LIST allowedValues rules', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'listField',
        displayName: 'List Field',
        dataType: 'LIST',
        required: false,
        validationRules: {
          allowedValues: [
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' },
          ],
        },
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{ listField: 'invalid-option' }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('List Field');

    // Validate all properties
    const errors = ref.current?.validateAll();

    // Should have error for invalid allowed value
    expect(errors).toBeDefined();
    expect(errors?.listField).toBe('List Field must be one of: option1, option2');
  });

  it('should return empty errors for valid values', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'validField',
        displayName: 'Valid Field',
        dataType: 'STRING',
        required: true,
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{ validField: 'valid value' }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Valid Field');

    // Validate all properties
    const errors = ref.current?.validateAll();

    // Should have no errors
    expect(errors).toBeDefined();
    expect(Object.keys(errors || {}).length).toBe(0);
  });

  it('should validate STRING minLength and maxLength rules', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'stringField',
        displayName: 'String Field',
        dataType: 'STRING',
        required: false,
        validationRules: {
          minLength: 5,
          maxLength: 10,
        },
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{ stringField: 'abc' }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('String Field');

    // Validate all properties
    const errors = ref.current?.validateAll();

    // Should have error for value below minLength
    expect(errors).toBeDefined();
    expect(errors?.stringField).toBe('String Field must be at least 5 characters');
  });

  it('should validate multiple properties at once', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'field1',
        displayName: 'Field 1',
        dataType: 'STRING',
        required: true,
        displayOrder: 1,
      },
      {
        id: '2',
        mappingId: 'mapping-2',
        propertyName: 'field2',
        displayName: 'Field 2',
        dataType: 'NUMBER',
        required: false,
        validationRules: {
          min: 10,
        },
        displayOrder: 2,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = createRef<DynamicResourceFormRef>();

    render(
      <DynamicResourceForm
        ref={ref}
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{ field2: 5 }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Field 1');

    // Validate all properties
    const errors = ref.current?.validateAll();

    // Should have errors for both fields
    expect(errors).toBeDefined();
    expect(errors?.field1).toBe('Field 1 is required');
    expect(errors?.field2).toBe('Field 2 must be at least 10');
  });
});
