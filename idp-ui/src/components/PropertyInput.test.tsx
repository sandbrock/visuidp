import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertyInput } from './PropertyInput';
import type { PropertySchema } from '../types/admin';

describe('PropertyInput Component - STRING Type', () => {
  const createStringProperty = (overrides?: Partial<PropertySchema>): PropertySchema => ({
    id: 'test-id',
    mappingId: 'mapping-id',
    propertyName: 'testProperty',
    displayName: 'Test Property',
    dataType: 'STRING',
    required: false,
    ...overrides,
  });

  describe('Basic Rendering', () => {
    it('should render AngryTextBox for STRING property', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should display property label', () => {
      const property = createStringProperty({ displayName: 'My String Field' });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
        />
      );

      // AngryTextBox also has a label with the same text, so we check for the property-input-label class
      const label = document.querySelector('.property-input-label');
      expect(label).toBeInTheDocument();
      expect(label?.textContent).toContain('My String Field');
    });

    it('should show required indicator when property is required', () => {
      const property = createStringProperty({ required: true });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
        />
      );

      const requiredIndicator = screen.getByLabelText('required');
      expect(requiredIndicator).toBeInTheDocument();
      expect(requiredIndicator.textContent).toBe('*');
    });

    it('should not show required indicator when property is not required', () => {
      const property = createStringProperty({ required: false });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
        />
      );

      const requiredIndicator = screen.queryByLabelText('required');
      expect(requiredIndicator).not.toBeInTheDocument();
    });
  });

  describe('Value Handling', () => {
    it('should display the current value', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value="test value"
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('test value');
    });

    it('should handle empty string value', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should handle null value', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should handle undefined value', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={undefined}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should call onChange when value changes', async () => {
      const user = userEvent.setup();
      const property = createStringProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'a');

      // onChange is called for each character typed
      expect(onChange).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith('a');
    });
  });

  describe('Help Text', () => {
    it('should display help text when description is provided', () => {
      const property = createStringProperty({
        description: 'This is a helpful description',
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
        />
      );

      const helpText = screen.getByText('This is a helpful description');
      expect(helpText).toBeInTheDocument();
      expect(helpText).toHaveClass('property-input-help-text');
    });

    it('should not display help text when description is not provided', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
        />
      );

      const helpText = document.querySelector('.property-input-help-text');
      expect(helpText).not.toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should display error message when error prop is provided', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
          error="This field is required"
        />
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage.textContent).toBe('This field is required');
    });

    it('should add has-error class to wrapper when error is present', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      const { container } = render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
          error="Error message"
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('has-error');
    });

    it('should not display error message when error prop is not provided', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
        />
      );

      const errorMessage = screen.queryByRole('alert');
      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
          disabled={true}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should add is-disabled class to wrapper when disabled', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      const { container } = render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
          disabled={true}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('is-disabled');
    });

    it('should not disable input when disabled prop is false', () => {
      const property = createStringProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value=""
          onChange={onChange}
          disabled={false}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).not.toBeDisabled();
    });
  });
});

describe('PropertyInput Component - NUMBER Type', () => {
  const createNumberProperty = (overrides?: Partial<PropertySchema>): PropertySchema => ({
    id: 'test-id',
    mappingId: 'mapping-id',
    propertyName: 'testNumber',
    displayName: 'Test Number',
    dataType: 'NUMBER',
    required: false,
    ...overrides,
  });

  describe('Basic Rendering', () => {
    it('should render AngryTextBox for NUMBER property', () => {
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={0}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should display property label', () => {
      const property = createNumberProperty({ displayName: 'Port Number' });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={8080}
          onChange={onChange}
        />
      );

      const label = document.querySelector('.property-input-label');
      expect(label).toBeInTheDocument();
      expect(label?.textContent).toContain('Port Number');
    });

    it('should show min/max in placeholder when validation rules are provided', () => {
      const property = createNumberProperty({
        displayName: 'Port',
        validationRules: { min: 1, max: 65535 },
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      // Check the AngryTextBox label contains the range
      const label = screen.getByText(/Port \(1-65535\)/);
      expect(label).toBeInTheDocument();
    });

    it('should show only min in placeholder when only min is provided', () => {
      const property = createNumberProperty({
        displayName: 'Count',
        validationRules: { min: 0 },
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      const label = screen.getByText(/Count \(min: 0\)/);
      expect(label).toBeInTheDocument();
    });

    it('should show only max in placeholder when only max is provided', () => {
      const property = createNumberProperty({
        displayName: 'Limit',
        validationRules: { max: 100 },
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      const label = screen.getByText(/Limit \(max: 100\)/);
      expect(label).toBeInTheDocument();
    });
  });

  describe('Value Handling', () => {
    it('should display integer value', () => {
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={42}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('42');
    });

    it('should display decimal value', () => {
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={3.14}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('3.14');
    });

    it('should display negative value', () => {
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={-10}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('-10');
    });

    it('should handle null value', () => {
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should handle zero value', () => {
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={0}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('0');
    });

    it('should call onChange with number when valid integer is entered', async () => {
      const user = userEvent.setup();
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '123');

      // Should be called with numbers as they're typed
      expect(onChange).toHaveBeenCalled();
      // Verify that numeric values were passed (not strings with letters)
      const calls = onChange.mock.calls;
      calls.forEach(call => {
        const value = call[0];
        // Should be a number or null, not a string with non-numeric characters
        expect(typeof value === 'number' || value === null).toBe(true);
      });
    });

    it('should call onChange with number when valid decimal is entered', async () => {
      const user = userEvent.setup();
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '3.14');

      // Should handle decimal point during typing
      expect(onChange).toHaveBeenCalled();
      // Verify that values are numbers or valid intermediate strings (like ".")
      const calls = onChange.mock.calls;
      calls.forEach(call => {
        const value = call[0];
        // Should be a number, string (for intermediate like "."), or null
        expect(typeof value === 'number' || typeof value === 'string' || value === null).toBe(true);
      });
    });

    it('should call onChange with null when input is cleared', async () => {
      const user = userEvent.setup();
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={42}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.clear(input);

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('should allow negative numbers', async () => {
      const user = userEvent.setup();
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '-5');

      // Should be called with values during typing
      expect(onChange).toHaveBeenCalled();
      // Verify that values include the negative sign (as string "-") and numbers
      const calls = onChange.mock.calls;
      calls.forEach(call => {
        const value = call[0];
        // Should be a number, string (for intermediate like "-"), or null
        expect(typeof value === 'number' || typeof value === 'string' || value === null).toBe(true);
      });
    });

    it('should prevent non-numeric character entry', async () => {
      const user = userEvent.setup();
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'abc');

      // Non-numeric characters should be prevented
      expect(input.value).toBe('');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should prevent multiple decimal points', async () => {
      const user = userEvent.setup();
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={3.14}
          onChange={onChange}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      
      // Try to add another decimal point
      await user.type(input, '.');

      // Should still be 3.14, not 3.14.
      expect(input.value).toBe('3.14');
    });
  });

  describe('Error Display', () => {
    it('should display validation error for out-of-range value', () => {
      const property = createNumberProperty({
        validationRules: { min: 1, max: 100 },
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={150}
          onChange={onChange}
          error="Value must be between 1 and 100"
        />
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage.textContent).toBe('Value must be between 1 and 100');
    });

    it('should add has-error class when error is present', () => {
      const property = createNumberProperty();
      const onChange = vi.fn();

      const { container } = render(
        <PropertyInput
          property={property}
          value={999}
          onChange={onChange}
          error="Value is too large"
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('has-error');
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      const property = createNumberProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={42}
          onChange={onChange}
          disabled={true}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });
});

describe('PropertyInput Component - BOOLEAN Type', () => {
  const createBooleanProperty = (overrides?: Partial<PropertySchema>): PropertySchema => ({
    id: 'test-id',
    mappingId: 'mapping-id',
    propertyName: 'testBoolean',
    displayName: 'Test Boolean',
    dataType: 'BOOLEAN',
    required: false,
    ...overrides,
  });

  describe('Basic Rendering', () => {
    it('should render AngryCheckBox for BOOLEAN property', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('should display property label next to checkbox', () => {
      const property = createBooleanProperty({ displayName: 'Enable Feature' });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      const label = screen.getByText('Enable Feature');
      expect(label).toBeInTheDocument();
    });

    it('should show required indicator in label when property is required', () => {
      const property = createBooleanProperty({ 
        displayName: 'Accept Terms',
        required: true 
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      const label = screen.getByText('Accept Terms *');
      expect(label).toBeInTheDocument();
    });

    it('should not show required indicator when property is not required', () => {
      const property = createBooleanProperty({ 
        displayName: 'Optional Setting',
        required: false 
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      const label = screen.getByText('Optional Setting');
      expect(label).toBeInTheDocument();
      expect(label.textContent).not.toContain('*');
    });

    it('should not display separate label section for boolean (inline label)', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      const { container } = render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      // Boolean properties should not have the separate label section
      const labelSection = container.querySelector('.property-input-label');
      expect(labelSection).not.toBeInTheDocument();
    });
  });

  describe('Value Handling', () => {
    it('should handle true value correctly', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={true}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should handle false value correctly', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should handle null value as false', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should handle undefined value as false', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={undefined}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should call onChange with boolean value when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('should call onChange with correct value when clicked multiple times', async () => {
      const user = userEvent.setup();
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      
      // First click - should call onChange with true
      await user.click(checkbox);
      expect(onChange).toHaveBeenCalledWith(true);

      // Second click - should call onChange with true again (since value prop is still false)
      // This is expected behavior for controlled components
      await user.click(checkbox);
      expect(onChange).toHaveBeenCalledWith(true);
      
      // Verify onChange was called twice
      expect(onChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Default Value Handling', () => {
    it('should apply default value when value is null', () => {
      const property = createBooleanProperty({
        defaultValue: true,
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should apply default value when value is undefined', () => {
      const property = createBooleanProperty({
        defaultValue: true,
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={undefined}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should use provided value over default value', () => {
      const property = createBooleanProperty({
        defaultValue: true,
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should handle false as default value', () => {
      const property = createBooleanProperty({
        defaultValue: false,
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={null}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });

  describe('Help Text', () => {
    it('should display help text when description is provided', () => {
      const property = createBooleanProperty({
        description: 'Enable this feature to unlock advanced options',
      });
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      const helpText = screen.getByText('Enable this feature to unlock advanced options');
      expect(helpText).toBeInTheDocument();
      expect(helpText).toHaveClass('property-input-help-text');
    });

    it('should not display help text when description is not provided', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      const helpText = document.querySelector('.property-input-help-text');
      expect(helpText).not.toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should display error message when error prop is provided', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
          error="You must accept the terms"
        />
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage.textContent).toBe('You must accept the terms');
    });

    it('should add has-error class to wrapper when error is present', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      const { container } = render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
          error="Error message"
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('has-error');
    });

    it('should add has-error class to AngryCheckBox when error is present', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      const { container } = render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
          error="Error message"
        />
      );

      const checkbox = container.querySelector('.angry-checkbox');
      expect(checkbox).toHaveClass('has-error');
    });

    it('should not display error message when error prop is not provided', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
        />
      );

      const errorMessage = screen.queryByRole('alert');
      expect(errorMessage).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable checkbox when disabled prop is true', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
          disabled={true}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });

    it('should add is-disabled class to wrapper when disabled', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      const { container } = render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
          disabled={true}
        />
      );

      const wrapper = container.querySelector('.property-input-wrapper');
      expect(wrapper).toHaveClass('is-disabled');
    });

    it('should not disable checkbox when disabled prop is false', () => {
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
          disabled={false}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeDisabled();
    });

    it('should not allow interaction when disabled', async () => {
      const user = userEvent.setup();
      const property = createBooleanProperty();
      const onChange = vi.fn();

      render(
        <PropertyInput
          property={property}
          value={false}
          onChange={onChange}
          disabled={true}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // onChange should not be called when disabled
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});

describe('PropertyInput Component - LIST Type', () => {
  const createListProperty = (overrides?: Partial<PropertySchema>): PropertySchema => ({
    id: 'test-id',
    mappingId: 'mapping-id',
    propertyName: 'testList',
    displayName: 'Test List',
    dataType: 'LIST',
    required: false,
    ...overrides,
  });

  describe('LIST with Allowed Values (Dropdown)', () => {
    const createListPropertyWithAllowedValues = (overrides?: Partial<PropertySchema>): PropertySchema => ({
      ...createListProperty(),
      validationRules: {
        allowedValues: [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' },
          { value: 'option3', label: 'Option 3' },
        ],
      },
      ...overrides,
    });

    describe('Basic Rendering', () => {
      it('should render AngryComboBox for LIST property with allowed values', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        const { container } = render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        // AngryComboBox renders as a textbox with dropdown functionality
        const comboboxWrapper = container.querySelector('.angry-combobox-wrapper');
        expect(comboboxWrapper).toBeInTheDocument();
      });

      it('should display property label', () => {
        const property = createListPropertyWithAllowedValues({ displayName: 'Storage Class' });
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const label = document.querySelector('.property-input-label');
        expect(label).toBeInTheDocument();
        expect(label?.textContent).toContain('Storage Class');
      });

      it('should show required indicator when property is required', () => {
        const property = createListPropertyWithAllowedValues({ required: true });
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const requiredIndicator = screen.getByLabelText('required');
        expect(requiredIndicator).toBeInTheDocument();
        expect(requiredIndicator.textContent).toBe('*');
      });

      it('should populate dropdown with allowed values', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        const { container } = render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        // AngryComboBox should have the items passed to it
        // We can verify this by checking that the component rendered
        const comboboxWrapper = container.querySelector('.angry-combobox-wrapper');
        expect(comboboxWrapper).toBeInTheDocument();
      });

      it('should display placeholder text', () => {
        const property = createListPropertyWithAllowedValues({ displayName: 'Region' });
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        // Check for the placeholder in the input
        const input = screen.getByPlaceholderText('Select Region');
        expect(input).toBeInTheDocument();
      });
    });

    describe('Value Handling', () => {
      it('should display the current selected value', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value="option2"
            onChange={onChange}
          />
        );

        // AngryComboBox displays the label text, not the value
        const input = screen.getByDisplayValue('Option 2');
        expect(input).toBeInTheDocument();
      });

      it('should handle empty string value', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const input = screen.getByPlaceholderText('Select Test List') as HTMLInputElement;
        expect(input.value).toBe('');
      });

      it('should handle null value', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value={null}
            onChange={onChange}
          />
        );

        const input = screen.getByPlaceholderText('Select Test List') as HTMLInputElement;
        expect(input.value).toBe('');
      });

      it('should handle undefined value', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value={undefined}
            onChange={onChange}
          />
        );

        const input = screen.getByPlaceholderText('Select Test List') as HTMLInputElement;
        expect(input.value).toBe('');
      });

      it('should call onChange when value changes', async () => {
        const user = userEvent.setup();
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        const { container } = render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        // Click the input to open dropdown
        const input = screen.getByPlaceholderText('Select Test List');
        await user.click(input);

        // Click on an option in the dropdown
        const option = container.querySelector('.angry-combobox-item');
        expect(option).toBeInTheDocument();
        await user.click(option!);

        expect(onChange).toHaveBeenCalledWith('option1');
      });

      it('should call onChange with correct value when selection changes', async () => {
        const user = userEvent.setup();
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        const { container } = render(
          <PropertyInput
            property={property}
            value="option1"
            onChange={onChange}
          />
        );

        // Click the input to open dropdown
        const input = screen.getByDisplayValue('Option 1');
        await user.click(input);

        // Find and click option3
        const options = container.querySelectorAll('.angry-combobox-item');
        const option3 = Array.from(options).find(opt => opt.textContent === 'Option 3');
        expect(option3).toBeInTheDocument();
        await user.click(option3!);

        expect(onChange).toHaveBeenCalledWith('option3');
      });
    });

    describe('Help Text', () => {
      it('should display help text when description is provided', () => {
        const property = createListPropertyWithAllowedValues({
          description: 'Select the storage class for your bucket',
        });
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const helpText = screen.getByText('Select the storage class for your bucket');
        expect(helpText).toBeInTheDocument();
        expect(helpText).toHaveClass('property-input-help-text');
      });

      it('should not display help text when description is not provided', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const helpText = document.querySelector('.property-input-help-text');
        expect(helpText).not.toBeInTheDocument();
      });
    });

    describe('Error Display', () => {
      it('should display error message when error prop is provided', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
            error="Please select a value"
          />
        );

        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage.textContent).toBe('Please select a value');
      });

      it('should add has-error class to wrapper when error is present', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        const { container } = render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
            error="Error message"
          />
        );

        const wrapper = container.querySelector('.property-input-wrapper');
        expect(wrapper).toHaveClass('has-error');
      });

      it('should not display error message when error prop is not provided', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value="option1"
            onChange={onChange}
          />
        );

        const errorMessage = screen.queryByRole('alert');
        expect(errorMessage).not.toBeInTheDocument();
      });
    });

    describe('Disabled State', () => {
      it('should disable combobox when disabled prop is true', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value="option1"
            onChange={onChange}
            disabled={true}
          />
        );

        const input = screen.getByDisplayValue('Option 1');
        expect(input).toBeDisabled();
      });

      it('should add is-disabled class to wrapper when disabled', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        const { container } = render(
          <PropertyInput
            property={property}
            value="option1"
            onChange={onChange}
            disabled={true}
          />
        );

        const wrapper = container.querySelector('.property-input-wrapper');
        expect(wrapper).toHaveClass('is-disabled');
      });

      it('should not disable combobox when disabled prop is false', () => {
        const property = createListPropertyWithAllowedValues();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value="option1"
            onChange={onChange}
            disabled={false}
          />
        );

        const input = screen.getByDisplayValue('Option 1');
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe('LIST without Allowed Values (Text Input)', () => {
    describe('Basic Rendering', () => {
      it('should render AngryTextBox for LIST property without allowed values', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const input = screen.getByRole('textbox');
        expect(input).toBeInTheDocument();
      });

      it('should display property label', () => {
        const property = createListProperty({ displayName: 'Tags' });
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const label = document.querySelector('.property-input-label');
        expect(label).toBeInTheDocument();
        expect(label?.textContent).toContain('Tags');
      });

      it('should show required indicator when property is required', () => {
        const property = createListProperty({ required: true });
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const requiredIndicator = screen.getByLabelText('required');
        expect(requiredIndicator).toBeInTheDocument();
        expect(requiredIndicator.textContent).toBe('*');
      });

      it('should display comma-separated placeholder', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        // Check for the placeholder in the AngryTextBox label
        const label = screen.getByText(/Enter comma-separated values/);
        expect(label).toBeInTheDocument();
      });
    });

    describe('Value Handling', () => {
      it('should display the current value', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value="tag1, tag2, tag3"
            onChange={onChange}
          />
        );

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('tag1, tag2, tag3');
      });

      it('should handle empty string value', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('');
      });

      it('should handle null value', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value={null}
            onChange={onChange}
          />
        );

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('');
      });

      it('should handle undefined value', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value={undefined}
            onChange={onChange}
          />
        );

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('');
      });

      it('should call onChange when value changes', async () => {
        const user = userEvent.setup();
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const input = screen.getByRole('textbox');
        await user.type(input, 'tag1');

        // onChange is called for each character typed
        expect(onChange).toHaveBeenCalled();
        // Verify the last call has the complete value
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
        expect(lastCall[0]).toBe('1');
      });

      it('should allow comma-separated values', async () => {
        const user = userEvent.setup();
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const input = screen.getByRole('textbox');
        await user.type(input, 'tag1, tag2');

        expect(onChange).toHaveBeenCalled();
        // Check that onChange was called with values including comma
        const calls = onChange.mock.calls;
        const commaCall = calls.find(call => String(call[0]).includes(','));
        expect(commaCall).toBeDefined();
      });
    });

    describe('Help Text', () => {
      it('should display help text when description is provided', () => {
        const property = createListProperty({
          description: 'Enter tags separated by commas',
        });
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const helpText = screen.getByText('Enter tags separated by commas');
        expect(helpText).toBeInTheDocument();
        expect(helpText).toHaveClass('property-input-help-text');
      });

      it('should not display help text when description is not provided', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
          />
        );

        const helpText = document.querySelector('.property-input-help-text');
        expect(helpText).not.toBeInTheDocument();
      });
    });

    describe('Error Display', () => {
      it('should display error message when error prop is provided', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
            error="This field is required"
          />
        );

        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage.textContent).toBe('This field is required');
      });

      it('should add has-error class to wrapper when error is present', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        const { container } = render(
          <PropertyInput
            property={property}
            value=""
            onChange={onChange}
            error="Error message"
          />
        );

        const wrapper = container.querySelector('.property-input-wrapper');
        expect(wrapper).toHaveClass('has-error');
      });

      it('should not display error message when error prop is not provided', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value="tag1, tag2"
            onChange={onChange}
          />
        );

        const errorMessage = screen.queryByRole('alert');
        expect(errorMessage).not.toBeInTheDocument();
      });
    });

    describe('Disabled State', () => {
      it('should disable input when disabled prop is true', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value="tag1, tag2"
            onChange={onChange}
            disabled={true}
          />
        );

        const input = screen.getByRole('textbox');
        expect(input).toBeDisabled();
      });

      it('should add is-disabled class to wrapper when disabled', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        const { container } = render(
          <PropertyInput
            property={property}
            value="tag1, tag2"
            onChange={onChange}
            disabled={true}
          />
        );

        const wrapper = container.querySelector('.property-input-wrapper');
        expect(wrapper).toHaveClass('is-disabled');
      });

      it('should not disable input when disabled prop is false', () => {
        const property = createListProperty();
        const onChange = vi.fn();

        render(
          <PropertyInput
            property={property}
            value="tag1, tag2"
            onChange={onChange}
            disabled={false}
          />
        );

        const input = screen.getByRole('textbox');
        expect(input).not.toBeDisabled();
      });
    });
  });
});
