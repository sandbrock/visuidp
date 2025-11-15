import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';

const renderField = (props = {}) =>
  render(
    <FormField label="Label" htmlFor="input-id" {...props}>
      <input id="input-id" data-testid="input-under-test" />
    </FormField>
  );

describe('FormField', () => {
  it('renders label and children', () => {
    renderField();

    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByTestId('input-under-test')).toBeInTheDocument();
  });

  it('shows required indicator when required prop is true', () => {
    renderField({ required: true });

    expect(screen.getByLabelText('required')).toHaveTextContent('*');
  });

  it('links label and hint/error via aria-describedby', () => {
    renderField({ hint: 'Helpful context', error: 'Something is wrong' });

    const control = screen.getByTestId('input-under-test');
    expect(screen.getByText('Helpful context')).toBeInTheDocument();
    expect(screen.getByText('Something is wrong')).toBeInTheDocument();
    expect(control.getAttribute('aria-describedby')).toContain('input-id-hint');
    expect(control.getAttribute('aria-describedby')).toContain('input-id-error');
  });

  it('generates ids when htmlFor is omitted', () => {
    render(
      <FormField label="Label" hint="Hint">
        <input data-testid="generated-id-input" />
      </FormField>
    );

    const control = screen.getByTestId('generated-id-input');
    const describedBy = control.getAttribute('aria-describedby');
    expect(describedBy).toMatch(/-hint$/);
  });
});
