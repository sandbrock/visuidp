import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorMessage, SuccessMessage, InfoBox, WarningBox } from './';

describe('Feedback components', () => {
  it('renders ErrorMessage with alert role, default icon, and message text', () => {
    render(<ErrorMessage message="Something went wrong" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
    const icon = alert.querySelector('.feedback-message__icon');
    expect(icon).not.toBeNull();
    expect(icon?.textContent).toBe('!');
  });

  it('renders SuccessMessage with default checkmark icon and optional title', () => {
    render(<SuccessMessage title="Success" message="Data saved" />);

    const body = screen.getByText('Data saved');
    const container = body.closest('.feedback-message');
    expect(container).toHaveClass('feedback-message--success');
    expect(container?.querySelector('.feedback-message__title')).toHaveTextContent('Success');
    expect(container?.querySelector('.feedback-message__icon')?.textContent).toBe('✓');
  });

  it('renders InfoBox with title, content, and default icon', () => {
    render(<InfoBox title="Heads up">Remember to copy your key</InfoBox>);

    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Remember to copy your key')).toBeInTheDocument();
    const icon = screen.getByText('ℹ', { selector: '.feedback-message__icon' });
    expect(icon).toBeInTheDocument();
  });

  it('renders WarningBox with custom icon and className', () => {
    render(
      <WarningBox className="custom-warning" icon={<span>⚡</span>} title="Important">
        This is the only time you will see the key.
      </WarningBox>
    );

    const title = screen.getByText('Important');
    const container = title.closest('.feedback-message');
    expect(container).toHaveClass('feedback-message--warning');
    expect(container).toHaveClass('custom-warning');
    expect(screen.getByText('⚡')).toBeInTheDocument();
    expect(screen.getByText('This is the only time you will see the key.')).toBeInTheDocument();
  });
});
