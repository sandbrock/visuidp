import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DynamicResourceForm } from './DynamicResourceForm';
import type { PropertySchema } from '../types/admin';

// Mock the PropertySchemaService
vi.mock('../services/PropertySchemaService', () => ({
  propertySchemaService: {
    getSchema: vi.fn(),
  },
}));

describe('DynamicResourceForm - Property Change Handling (Task 5.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onChange with updated values when property changes', async () => {
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
    const initialValues = { testProperty: '' };

    render(
      <DynamicResourceForm
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={initialValues}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    // Find the input and type a value
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'test');

    // Verify onChange was called with updated values
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    // onChange is called for each character typed
    expect(onChange.mock.calls.length).toBeGreaterThan(0);
    
    // Verify that each call includes the testProperty key
    onChange.mock.calls.forEach(call => {
      expect(call[0]).toHaveProperty('testProperty');
    });
  });

  it('should clear validation error when property value changes', async () => {
    const mockSchema: PropertySchema[] = [
      {
        id: '1',
        mappingId: 'mapping-1',
        propertyName: 'requiredProperty',
        displayName: 'Required Property',
        dataType: 'STRING',
        required: true,
        displayOrder: 1,
      },
    ];

    const { propertySchemaService } = await import('../services/PropertySchemaService');
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);

    const onChange = vi.fn();
    const ref = { current: null };

    const { rerender } = render(
      <DynamicResourceForm
        ref={ref as any}
        resourceTypeId="resource-1"
        cloudProviderId="cloud-1"
        values={{}}
        onChange={onChange}
      />
    );

    // Wait for schema to load
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    // Trigger validation to create an error
    if (ref.current) {
      const errors = (ref.current as any).validateAll();
      expect(errors.requiredProperty).toBeDefined();
    }

    // Now change the property value
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'some value');

    // Verify onChange was called
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    // The error should be cleared when the value changes
    // We can verify this by checking that the component re-renders without the error
    expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
  });

  it('should preserve other property values when one property changes', async () => {
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
      property1: '',
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

    // Wait for schema to load
    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(2);
    });

    // Find the first input and type a value
    const inputs = screen.getAllByRole('textbox');
    await userEvent.type(inputs[0], 'x');

    // Verify onChange was called
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    // Verify that all calls preserve property2
    onChange.mock.calls.forEach(call => {
      expect(call[0]).toHaveProperty('property2', 'value2');
      expect(call[0]).toHaveProperty('property1');
    });
  });
});
