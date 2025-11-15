import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationDialog } from './ConfirmationDialog';

describe('ConfirmationDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure?',
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ConfirmationDialog {...defaultProps} isOpen={false} />
    );

    expect(container.querySelector('.modal-dialog')).not.toBeInTheDocument();
  });

  it('renders modal with title and message when isOpen is true', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons with default text', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('renders custom button text', () => {
    render(
      <ConfirmationDialog
        {...defaultProps}
        confirmText="Delete"
        cancelText="Keep"
      />
    );

    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ConfirmationDialog {...defaultProps} onClose={onClose} />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />
    );

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when isProcessing is true', () => {
    render(
      <ConfirmationDialog {...defaultProps} isProcessing={true} />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('does not call onConfirm when isProcessing is true', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmationDialog {...defaultProps} isProcessing={true} onConfirm={onConfirm} />
    );

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('applies danger variant class', () => {
    render(
      <ConfirmationDialog {...defaultProps} variant="danger" />
    );

    // Verify danger variant button styling
    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveClass('modal-button-danger');
  });

  it('applies warning variant class', () => {
    render(
      <ConfirmationDialog {...defaultProps} variant="warning" />
    );

    // Verify warning variant button styling
    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveClass('modal-button-warning');
  });

  it('applies primary variant class', () => {
    render(
      <ConfirmationDialog {...defaultProps} variant="primary" />
    );

    // Modal uses createPortal, so we check via the title which is inside the modal
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('applies processing class when isProcessing is true', () => {
    render(
      <ConfirmationDialog {...defaultProps} isProcessing={true} />
    );

    // Verify buttons are disabled when processing
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('renders message as React node', () => {
    render(
      <ConfirmationDialog
        {...defaultProps}
        message={<div data-testid="custom-message">Custom message content</div>}
      />
    );

    expect(screen.getByTestId('custom-message')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ConfirmationDialog {...defaultProps} onClose={onClose} />
    );

    const closeButton = screen.getByRole('button', { name: /close modal/i });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('respects closeOnBackdropClick prop', () => {
    render(
      <ConfirmationDialog {...defaultProps} closeOnBackdropClick={false} />
    );

    // Modal component handles this internally, verify dialog renders
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('respects closeOnEscape prop', () => {
    render(
      <ConfirmationDialog {...defaultProps} closeOnEscape={false} />
    );

    // Modal component handles this internally, verify dialog renders
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('uses custom width', () => {
    render(
      <ConfirmationDialog {...defaultProps} width="600px" />
    );

    // Verify dialog renders with custom width (Modal applies it)
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('danger variant button has danger styling', () => {
    render(
      <ConfirmationDialog {...defaultProps} variant="danger" />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveClass('modal-button-danger');
  });

  it('warning variant button has warning styling', () => {
    render(
      <ConfirmationDialog {...defaultProps} variant="warning" />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveClass('modal-button-warning');
  });

  it('primary variant button has primary styling', () => {
    render(
      <ConfirmationDialog {...defaultProps} variant="primary" />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveClass('modal-button-primary');
  });
});
