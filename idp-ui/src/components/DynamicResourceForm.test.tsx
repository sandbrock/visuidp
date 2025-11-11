import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  PropertyInput: ({ property, value, onChange, error }: { 
    property: PropertySchema; 
    value: unknown; 
    onChange: (value: unknown) => void;
    error?: string;
  }) => (
    <div data-testid={`property-${property.propertyName}`}>
      <span>{property.displayName}</span>
      {error && <span data-testid={`error-${property.propertyName}`}>{error}</span>}
      <button 
        data-testid={`change-${property.propertyName}`}
        onClick={() => onChange('new-value')}
      >
        Change
      </button>
    </div>
  ),
}));

describe('DynamicResourceForm - Property Rendering (Task 5.3)', () => {
  it('should render properties sorted by displayOrder', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '3',
        mappingId: 'mapping-3',
        propertyName: 'property3',
        displayName: 'Third Property',
        dataType: 'STRING',
        required: false,
        displayOrder: 3,
      },
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'property1',
        displayName: 'First Property',
        dataType: 'STRING',
        required: false,
        displayOrder: 1,
      },
      {
        id: '2',
        mappingId: 'mapping-2',
        propertyName: 'property2',
        displayName: 'Second Property',
        dataType: 'STRING',
        required: false,
        displayOrder: 2,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('First Property');

    // Verify all properties are rendered
    expect(screen.getByTestId('property-property1')).toBeInTheDocument();
    expect(screen.getByTestId('property-property2')).toBeInTheDocument();
    expect(screen.getByTestId('property-property3')).toBeInTheDocument();

    // Verify order by checking DOM order
    const properties = screen.getAllByTestId(/^property-/);
    expect(properties[0]).toHaveAttribute('data-testid', 'property-property1');
    expect(properties[1]).toHaveAttribute('data-testid', 'property-property2');
    expect(properties[2]).toHaveAttribute('data-testid', 'property-property3');
  });

  it('should handle properties without displayOrder', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'property1',
        displayName: 'Property With Order',
        dataType: 'STRING',
        required: false,
        displayOrder: 1,
      },
      {
        id: '2',
        mappingId: 'mapping-2',
        propertyName: 'property2',
        displayName: 'Property Without Order',
        dataType: 'STRING',
        required: false,
        // No displayOrder
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Property With Order');

    // Property with order should come first
    const properties = screen.getAllByTestId(/^property-/);
    expect(properties[0]).toHaveAttribute('data-testid', 'property-property1');
    expect(properties[1]).toHaveAttribute('data-testid', 'property-property2');
  });

  it('should display empty state when schema has no properties', async () => {
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue([]);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for empty state to appear
    await screen.findByText(/No cloud-specific properties are configured/i);

    // Verify empty state message
    expect(screen.getByText(/No cloud-specific properties are configured/i)).toBeInTheDocument();
    expect(screen.getByText(/Contact your administrator/i)).toBeInTheDocument();
  });

  it('should pass correct props to PropertyInput components', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'testProperty',
        displayName: 'Test Property',
        dataType: 'STRING',
        required: true,
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const values = { testProperty: 'test value' };

    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={values}
        onChange={onChange}
      />
    );

    // Wait for property to render
    await screen.findByText('Test Property');

    // Verify property is rendered
    expect(screen.getByTestId('property-testProperty')).toBeInTheDocument();
  });

  it('should show section header when showLabels is true', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'property1',
        displayName: 'Property 1',
        dataType: 'STRING',
        required: false,
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
        showLabels={true}
      />
    );

    // Wait for schema to load
    await screen.findByText('Property 1');

    // Verify section header is shown
    expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
  });

  it('should hide section header when showLabels is false', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'property1',
        displayName: 'Property 1',
        dataType: 'STRING',
        required: false,
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
        showLabels={false}
      />
    );

    // Wait for schema to load
    await screen.findByText('Property 1');

    // Verify section header is not shown
    expect(screen.queryByText('Cloud-Specific Properties')).not.toBeInTheDocument();
  });
});

describe('DynamicResourceForm - Default Value Application (Task 5.6)', () => {
  it('should apply default values when creating new resources', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'storageClass',
        displayName: 'Storage Class',
        dataType: 'STRING',
        required: true,
        defaultValue: 'STANDARD',
        displayOrder: 1,
      },
      {
        id: '2',
        mappingId: 'mapping-2',
        propertyName: 'versioning',
        displayName: 'Versioning',
        dataType: 'BOOLEAN',
        required: false,
        defaultValue: true,
        displayOrder: 2,
      },
      {
        id: '3',
        mappingId: 'mapping-3',
        propertyName: 'maxSize',
        displayName: 'Max Size',
        dataType: 'NUMBER',
        required: false,
        defaultValue: 100,
        displayOrder: 3,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
        isEditMode={false}
      />
    );

    // Wait for schema to load
    await screen.findByText('Storage Class');

    // Verify onChange was called with default values
    expect(onChange).toHaveBeenCalledWith({
      storageClass: 'STANDARD',
      versioning: true,
      maxSize: 100,
    });
  });

  it('should NOT apply default values when editing existing resources', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'storageClass',
        displayName: 'Storage Class',
        dataType: 'STRING',
        required: true,
        defaultValue: 'STANDARD',
        displayOrder: 1,
      },
      {
        id: '2',
        mappingId: 'mapping-2',
        propertyName: 'versioning',
        displayName: 'Versioning',
        dataType: 'BOOLEAN',
        required: false,
        defaultValue: true,
        displayOrder: 2,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
        isEditMode={true}
      />
    );

    // Wait for schema to load
    await screen.findByText('Storage Class');

    // Verify onChange was NOT called (no defaults applied in edit mode)
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should NOT override existing values with defaults', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'storageClass',
        displayName: 'Storage Class',
        dataType: 'STRING',
        required: true,
        defaultValue: 'STANDARD',
        displayOrder: 1,
      },
      {
        id: '2',
        mappingId: 'mapping-2',
        propertyName: 'versioning',
        displayName: 'Versioning',
        dataType: 'BOOLEAN',
        required: false,
        defaultValue: true,
        displayOrder: 2,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const existingValues = {
      storageClass: 'GLACIER',
      versioning: false,
    };

    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={existingValues}
        onChange={onChange}
        isEditMode={false}
      />
    );

    // Wait for schema to load
    await screen.findByText('Storage Class');

    // Verify onChange was NOT called (existing values should not be overridden)
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should apply defaults only for properties without values', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'storageClass',
        displayName: 'Storage Class',
        dataType: 'STRING',
        required: true,
        defaultValue: 'STANDARD',
        displayOrder: 1,
      },
      {
        id: '2',
        mappingId: 'mapping-2',
        propertyName: 'versioning',
        displayName: 'Versioning',
        dataType: 'BOOLEAN',
        required: false,
        defaultValue: true,
        displayOrder: 2,
      },
      {
        id: '3',
        mappingId: 'mapping-3',
        propertyName: 'maxSize',
        displayName: 'Max Size',
        dataType: 'NUMBER',
        required: false,
        defaultValue: 100,
        displayOrder: 3,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const partialValues = {
      storageClass: 'GLACIER', // Already set
      // versioning and maxSize not set
    };

    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={partialValues}
        onChange={onChange}
        isEditMode={false}
      />
    );

    // Wait for schema to load
    await screen.findByText('Storage Class');

    // Verify onChange was called with defaults only for missing properties
    expect(onChange).toHaveBeenCalledWith({
      storageClass: 'GLACIER', // Existing value preserved
      versioning: true, // Default applied
      maxSize: 100, // Default applied
    });
  });

  it('should handle LIST type default values', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'tier',
        displayName: 'Tier',
        dataType: 'LIST',
        required: true,
        defaultValue: 'Standard',
        validationRules: {
          allowedValues: [
            { value: 'Standard', label: 'Standard' },
            { value: 'Premium', label: 'Premium' },
          ],
        },
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
        isEditMode={false}
      />
    );

    // Wait for schema to load
    await screen.findByText('Tier');

    // Verify onChange was called with LIST default value
    expect(onChange).toHaveBeenCalledWith({
      tier: 'Standard',
    });
  });

  it('should NOT apply defaults when property has null or undefined defaultValue', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'property1',
        displayName: 'Property 1',
        dataType: 'STRING',
        required: false,
        // No defaultValue
        displayOrder: 1,
      },
      {
        id: '2',
        mappingId: 'mapping-2',
        propertyName: 'property2',
        displayName: 'Property 2',
        dataType: 'STRING',
        required: false,
        defaultValue: undefined,
        displayOrder: 2,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
        isEditMode={false}
      />
    );

    // Wait for schema to load
    await screen.findByText('Property 1');

    // Verify onChange was NOT called (no defaults to apply)
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('DynamicResourceForm - Loading State (Task 10.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state while fetching schema', async () => {
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    
    // Create a promise that we control
    let resolveSchema: (value: PropertySchema[]) => void;
    const schemaPromise = new Promise<PropertySchema[]>((resolve) => {
      resolveSchema = resolve;
    });
    
    vi.mocked(propertySchemaService.getSchema).mockReturnValue(schemaPromise);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Verify loading state is displayed
    expect(screen.getByText('Loading properties...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Resolve the promise
    resolveSchema!([]);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument();
    });
  });

  it('should show loading spinner with correct aria attributes', async () => {
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    
    let resolveSchema: (value: PropertySchema[]) => void;
    const schemaPromise = new Promise<PropertySchema[]>((resolve) => {
      resolveSchema = resolve;
    });
    
    vi.mocked(propertySchemaService.getSchema).mockReturnValue(schemaPromise);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    const loadingElement = screen.getByRole('status');
    expect(loadingElement).toHaveAttribute('aria-live', 'polite');

    resolveSchema!([]);
  });
});

describe('DynamicResourceForm - Error State (Task 10.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display error state when schema fetch fails', async () => {
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockRejectedValue(
      new Error('Failed to load property configuration')
    );

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for error state to appear
    await screen.findByRole('alert');

    // Verify error message is displayed
    expect(screen.getByText('Failed to load property configuration')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should display retry button in error state', async () => {
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockRejectedValue(
      new Error('Network error')
    );

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for error state
    await screen.findByRole('alert');

    // Verify retry button is present
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });
});

describe('DynamicResourceForm - Retry Mechanism (Task 10.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retry fetching schema when retry button is clicked', async () => {
    const user = userEvent.setup();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    
    // First call fails
    vi.mocked(propertySchemaService.getSchema)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([
        {
          id: '1',
          mappingId: 'mapping-1',
          propertyName: 'property1',
          displayName: 'Property 1',
          dataType: 'STRING',
          required: false,
          displayOrder: 1,
        },
      ]);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for error state
    await screen.findByRole('alert');
    expect(screen.getByText('Network error')).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    // Wait for successful load
    await screen.findByText('Property 1');

    // Verify error is gone and property is displayed
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('property-property1')).toBeInTheDocument();
  });

  it('should show loading state during retry', async () => {
    const user = userEvent.setup();
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    
    // First call fails
    vi.mocked(propertySchemaService.getSchema)
      .mockRejectedValueOnce(new Error('Network error'));

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for error state
    await screen.findByRole('alert');

    // Setup second call to be pending
    let resolveSchema: (value: PropertySchema[]) => void;
    const schemaPromise = new Promise<PropertySchema[]>((resolve) => {
      resolveSchema = resolve;
    });
    vi.mocked(propertySchemaService.getSchema).mockReturnValue(schemaPromise);

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    // Verify loading state is shown
    await waitFor(() => {
      expect(screen.getByText('Loading properties...')).toBeInTheDocument();
    });

    // Resolve the promise
    resolveSchema!([]);
  });
});

describe('DynamicResourceForm - Property Value Changes (Task 13.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onChange when property value changes', async () => {
    const user = userEvent.setup();
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'testProperty',
        displayName: 'Test Property',
        dataType: 'STRING',
        required: false,
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for property to render
    await screen.findByText('Test Property');

    // Simulate property change
    const changeButton = screen.getByTestId('change-testProperty');
    await user.click(changeButton);

    // Verify onChange was called with updated values
    expect(onChange).toHaveBeenCalledWith({
      testProperty: 'new-value',
    });
  });

  it('should preserve other property values when one changes', async () => {
    const user = userEvent.setup();
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'property1',
        displayName: 'Property 1',
        dataType: 'STRING',
        required: false,
        displayOrder: 1,
      },
      {
        id: '2',
        mappingId: 'mapping-2',
        propertyName: 'property2',
        displayName: 'Property 2',
        dataType: 'STRING',
        required: false,
        displayOrder: 2,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const initialValues = {
      property1: 'value1',
      property2: 'value2',
    };

    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={initialValues}
        onChange={onChange}
      />
    );

    // Wait for properties to render
    await screen.findByText('Property 1');

    // Change property1
    const changeButton = screen.getByTestId('change-property1');
    await user.click(changeButton);

    // Verify onChange was called with property1 updated and property2 preserved
    expect(onChange).toHaveBeenCalledWith({
      property1: 'new-value',
      property2: 'value2',
    });
  });
});

describe('DynamicResourceForm - Validation (Task 3.1, 3.2, 3.3, 4.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify required field error
    expect(errors).toEqual({
      requiredField: 'Required Field is required',
    });
  });

  it('should not show error for required field with value', async () => {
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
        values={{ requiredField: 'some value' }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Required Field');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify no errors
    expect(errors).toEqual({});
  });
});

describe('DynamicResourceForm - Min/Max Validation (Task 4.2, 8.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate NUMBER min value', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'port',
        displayName: 'Port',
        dataType: 'NUMBER',
        required: true,
        validationRules: {
          min: 1,
          max: 65535,
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
        values={{ port: 0 }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Port');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify min value error
    expect(errors).toEqual({
      port: 'Port must be between 1 and 65535',
    });
  });

  it('should validate NUMBER max value', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'port',
        displayName: 'Port',
        dataType: 'NUMBER',
        required: true,
        validationRules: {
          min: 1,
          max: 65535,
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
        values={{ port: 70000 }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Port');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify max value error
    expect(errors).toEqual({
      port: 'Port must be between 1 and 65535',
    });
  });

  it('should pass validation for NUMBER within range', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'port',
        displayName: 'Port',
        dataType: 'NUMBER',
        required: true,
        validationRules: {
          min: 1,
          max: 65535,
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
        values={{ port: 8080 }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Port');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify no errors
    expect(errors).toEqual({});
  });
});

describe('DynamicResourceForm - Pattern Validation (Task 4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate STRING pattern (regex)', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'email',
        displayName: 'Email',
        dataType: 'STRING',
        required: true,
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
        values={{ email: 'invalid-email' }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Email');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify pattern error
    expect(errors).toEqual({
      email: 'Email format is invalid',
    });
  });

  it('should pass validation for STRING matching pattern', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'email',
        displayName: 'Email',
        dataType: 'STRING',
        required: true,
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
        values={{ email: 'user@example.com' }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Email');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify no errors
    expect(errors).toEqual({});
  });

  it('should validate STRING minLength', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'password',
        displayName: 'Password',
        dataType: 'STRING',
        required: true,
        validationRules: {
          minLength: 8,
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
        values={{ password: 'short' }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Password');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify minLength error
    expect(errors).toEqual({
      password: 'Password must be at least 8 characters',
    });
  });

  it('should validate STRING maxLength', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'username',
        displayName: 'Username',
        dataType: 'STRING',
        required: true,
        validationRules: {
          maxLength: 20,
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
        values={{ username: 'this-is-a-very-long-username-that-exceeds-limit' }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Username');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify maxLength error
    expect(errors).toEqual({
      username: 'Username must be at most 20 characters',
    });
  });
});

describe('DynamicResourceForm - LIST Validation (Task 6.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate LIST allowedValues', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'tier',
        displayName: 'Tier',
        dataType: 'LIST',
        required: true,
        validationRules: {
          allowedValues: [
            { value: 'Standard', label: 'Standard' },
            { value: 'Premium', label: 'Premium' },
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
        values={{ tier: 'Invalid' }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Tier');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify allowedValues error
    expect(errors).toEqual({
      tier: 'Tier must be one of: Standard, Premium',
    });
  });

  it('should pass validation for LIST with valid allowedValue', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'tier',
        displayName: 'Tier',
        dataType: 'LIST',
        required: true,
        validationRules: {
          allowedValues: [
            { value: 'Standard', label: 'Standard' },
            { value: 'Premium', label: 'Premium' },
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
        values={{ tier: 'Standard' }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Tier');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify no errors
    expect(errors).toEqual({});
  });
});

describe('DynamicResourceForm - Multiple Properties Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate multiple properties and return all errors', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'name',
        displayName: 'Name',
        dataType: 'STRING',
        required: true,
        displayOrder: 1,
      },
      {
        id: '2',
        mappingId: 'mapping-2',
        propertyName: 'port',
        displayName: 'Port',
        dataType: 'NUMBER',
        required: true,
        validationRules: {
          min: 1,
          max: 65535,
        },
        displayOrder: 2,
      },
      {
        id: '3',
        mappingId: 'mapping-3',
        propertyName: 'email',
        displayName: 'Email',
        dataType: 'STRING',
        required: false,
        validationRules: {
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
        displayOrder: 3,
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
        values={{
          // name is missing (required)
          port: 70000, // out of range
          email: 'invalid-email', // invalid format
        }}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Name');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify all errors are returned
    expect(errors).toEqual({
      name: 'Name is required',
      port: 'Port must be between 1 and 65535',
      email: 'Email format is invalid',
    });
  });

  it('should clear validation error when property value changes', async () => {
    const user = userEvent.setup();
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'name',
        displayName: 'Name',
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
    await screen.findByText('Name');

    // Validate to set error
    ref.current?.validateAll();

    // Set validation errors manually
    ref.current?.setValidationErrors({ name: 'Name is required' });

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByTestId('error-name')).toBeInTheDocument();
    });

    // Change the property value
    const changeButton = screen.getByTestId('change-name');
    await user.click(changeButton);

    // Verify error is cleared
    await waitFor(() => {
      expect(screen.queryByTestId('error-name')).not.toBeInTheDocument();
    });
  });
});

describe('DynamicResourceForm - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle missing resourceTypeId gracefully', () => {
    const onChange = vi.fn();
    
    render(
      <DynamicResourceForm
        resourceTypeId=""
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Should not show loading or error state
    expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    
    // Should render form with empty properties (no schema fetch attempted)
    expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
  });

  it('should handle missing cloudProviderId gracefully', () => {
    const onChange = vi.fn();
    
    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId=""
        values={{}}
        onChange={onChange}
      />
    );

    // Should not show loading or error state
    expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    
    // Should render form with empty properties (no schema fetch attempted)
    expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
  });

  it('should not apply validation to optional empty fields', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'optionalField',
        displayName: 'Optional Field',
        dataType: 'STRING',
        required: false,
        validationRules: {
          minLength: 5,
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
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await screen.findByText('Optional Field');

    // Validate all fields
    const errors = ref.current?.validateAll();

    // Verify no errors for empty optional field
    expect(errors).toEqual({});
  });

  it('should handle empty schema gracefully', async () => {
    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue([]);

    const onChange = vi.fn();

    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for empty state
    await screen.findByText(/No cloud-specific properties are configured/i);

    // Verify empty state message is displayed
    expect(screen.getByText(/No cloud-specific properties are configured/i)).toBeInTheDocument();
    expect(screen.getByText(/Contact your administrator/i)).toBeInTheDocument();
  });
});
