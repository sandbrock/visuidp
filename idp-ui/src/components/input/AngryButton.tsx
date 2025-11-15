import './AngryButton.css';

export interface AngryButtonProps {
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler | (() => void);
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  isPrimary?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'small' | 'normal';
  style?: 'solid' | 'outline' | 'flat';
  className?: string;
  'data-testid'?: string;
}

export const AngryButton = (props: AngryButtonProps) => {
  const { 
    onClick, 
    type = 'button', 
    children, 
    disabled, 
    isPrimary, 
    variant,
    size,
    style,
    className,
    'data-testid': dataTestId
  } = props;
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick && !disabled) {
      onClick(e);
    }
  };

  // Build class list using semantic props
  const buttonClasses = [
    'angry-button',
    // Handle variant - isPrimary takes precedence for backward compatibility
    isPrimary ? 'btn-primary' : variant ? `btn-${variant}` : '',
    // Handle size
    size === 'small' ? 'btn-small' : '',
    // Handle style
    style === 'outline' ? 'btn-outline' : style === 'flat' ? 'btn-flat' : '',
    // Custom classes
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <button 
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={buttonClasses}
      data-testid={dataTestId}
    >
      {children}
    </button>
  );
};

