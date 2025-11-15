import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadingButton } from './LoadingButton';

describe('LoadingButton', () => {
  it('renders button with children text', () => {
    render(<LoadingButton isLoading={false}>Click me</LoadingButton>);

    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('shows loading text when isLoading is true', () => {
    render(
      <LoadingButton isLoading={true} loadingText="Please wait...">
        Click me
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toHaveTextContent('Please wait...');
    expect(screen.queryByText('Click me')).not.toBeInTheDocument();
  });

  it('shows default loading text when isLoading is true and loadingText is not provided', () => {
    render(<LoadingButton isLoading={true}>Click me</LoadingButton>);

    expect(screen.getByRole('button')).toHaveTextContent('Loading...');
  });

  it('displays spinner when loading', () => {
    render(<LoadingButton isLoading={true}>Click me</LoadingButton>);

    const spinner = screen.getByRole('button').querySelector('.loading-button__spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not display spinner when not loading', () => {
    render(<LoadingButton isLoading={false}>Click me</LoadingButton>);

    const spinner = screen.getByRole('button').querySelector('.loading-button__spinner');
    expect(spinner).not.toBeInTheDocument();
  });

  it('disables button when isLoading is true', () => {
    render(<LoadingButton isLoading={true}>Click me</LoadingButton>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when disabled prop is true', () => {
    render(
      <LoadingButton isLoading={false} disabled={true}>
        Click me
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when both isLoading and disabled are true', () => {
    render(
      <LoadingButton isLoading={true} disabled={true}>
        Click me
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('enables button when isLoading is false and disabled is false', () => {
    render(
      <LoadingButton isLoading={false} disabled={false}>
        Click me
      </LoadingButton>
    );

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('calls onClick handler when clicked and not loading', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <LoadingButton isLoading={false} onClick={handleClick}>
        Click me
      </LoadingButton>
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick handler when loading', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <LoadingButton isLoading={true} onClick={handleClick}>
        Click me
      </LoadingButton>
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(
      <LoadingButton isLoading={false} className="custom-class">
        Click me
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('applies loading class when loading', () => {
    render(<LoadingButton isLoading={true}>Click me</LoadingButton>);

    expect(screen.getByRole('button')).toHaveClass('loading-button--loading');
  });

  it('forwards AngryButton props correctly', () => {
    render(
      <LoadingButton isLoading={false} isPrimary={true} variant="success" size="small">
        Click me
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-primary');
    expect(button).toHaveClass('btn-small');
  });

  it('supports different button types', () => {
    render(
      <LoadingButton isLoading={false} type="submit">
        Submit
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
