import React from 'react';
import { AngryButton, type AngryButtonProps } from '../../input/AngryButton';
import './LoadingButton.css';

export interface LoadingButtonProps extends Omit<AngryButtonProps, 'children'> {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  loadingText = 'Loading...',
  disabled,
  className,
  children,
  ...angryButtonProps
}) => {
  const isDisabled = isLoading || disabled;
  const displayText = isLoading ? loadingText : children;

  return (
    <AngryButton
      {...angryButtonProps}
      disabled={isDisabled}
      className={`loading-button ${isLoading ? 'loading-button--loading' : ''} ${className || ''}`}
    >
      {isLoading && <span className="loading-button__spinner" aria-hidden="true" />}
      <span className="loading-button__text">{displayText}</span>
    </AngryButton>
  );
};
