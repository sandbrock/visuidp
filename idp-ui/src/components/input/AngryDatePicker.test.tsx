import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AngryDatePicker } from './AngryDatePicker';

describe('AngryDatePicker', () => {
  it('renders with placeholder', () => {
    const mockOnChange = vi.fn();
    
    render(
      <AngryDatePicker
        id="test-date"
        value=""
        onChange={mockOnChange}
        placeholder="Select Date"
      />
    );

    expect(screen.getByLabelText('Select Date')).toBeInTheDocument();
  });

  it('displays the provided value', () => {
    const mockOnChange = vi.fn();
    
    render(
      <AngryDatePicker
        id="test-date"
        value="2024-01-15"
        onChange={mockOnChange}
        placeholder="Select Date"
      />
    );

    const input = screen.getByLabelText('Select Date') as HTMLInputElement;
    expect(input.value).toBe('2024-01-15');
  });

  it('calls onChange when date is selected', async () => {
    const mockOnChange = vi.fn();
    const user = userEvent.setup();
    
    render(
      <AngryDatePicker
        id="test-date"
        value=""
        onChange={mockOnChange}
        placeholder="Select Date"
      />
    );

    const input = screen.getByLabelText('Select Date');
    await user.type(input, '2024-01-15');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('respects disabled state', () => {
    const mockOnChange = vi.fn();
    
    render(
      <AngryDatePicker
        id="test-date"
        value=""
        onChange={mockOnChange}
        placeholder="Select Date"
        disabled={true}
      />
    );

    const input = screen.getByLabelText('Select Date') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it('applies min and max constraints', () => {
    const mockOnChange = vi.fn();
    
    render(
      <AngryDatePicker
        id="test-date"
        value=""
        onChange={mockOnChange}
        placeholder="Select Date"
        min="2024-01-01"
        max="2024-12-31"
      />
    );

    const input = screen.getByLabelText('Select Date') as HTMLInputElement;
    expect(input.min).toBe('2024-01-01');
    expect(input.max).toBe('2024-12-31');
  });

  it('applies custom className', () => {
    const mockOnChange = vi.fn();
    
    render(
      <AngryDatePicker
        id="test-date"
        value=""
        onChange={mockOnChange}
        placeholder="Select Date"
        className="custom-class"
      />
    );

    const wrapper = screen.getByLabelText('Select Date').closest('.angry-datepicker-wrapper');
    expect(wrapper).toHaveClass('custom-class');
  });

  it('adds has-value class when value is present', () => {
    const mockOnChange = vi.fn();
    
    render(
      <AngryDatePicker
        id="test-date"
        value="2024-01-15"
        onChange={mockOnChange}
        placeholder="Select Date"
      />
    );

    const input = screen.getByLabelText('Select Date');
    expect(input).toHaveClass('has-value');
  });

  it('does not add has-value class when value is empty', () => {
    const mockOnChange = vi.fn();
    
    render(
      <AngryDatePicker
        id="test-date"
        value=""
        onChange={mockOnChange}
        placeholder="Select Date"
      />
    );

    const input = screen.getByLabelText('Select Date');
    expect(input).not.toHaveClass('has-value');
  });
});
