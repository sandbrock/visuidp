import './AngryButton.css';

interface AngryButtonProps {
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler | (() => void);
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  isPrimary?: boolean;
  cssClass?: string;
  iconCss?: string;
  className?: string;
}

export const AngryButton = (props: AngryButtonProps) => {
  const { onClick, type = 'button', children, disabled, isPrimary, cssClass, iconCss, className } = props;
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick && !disabled) {
      onClick(e);
    }
  };

  // Map SyncFusion cssClass values to custom CSS classes
  const mapCssClass = (syncfusionClass?: string): string => {
    if (!syncfusionClass) return '';
    
    const classMap: Record<string, string> = {
      'e-primary': 'btn-primary',
      'e-success': 'btn-success',
      'e-warning': 'btn-warning',
      'e-danger': 'btn-danger',
      'e-info': 'btn-info',
      'e-small': 'btn-small',
      'e-outline': 'btn-outline',
      'e-flat': 'btn-flat',
    };
    
    // Split by space to handle multiple classes
    return syncfusionClass
      .split(' ')
      .map(cls => classMap[cls] || cls)
      .join(' ');
  };

  const buttonClasses = [
    'angry-button',
    isPrimary ? 'btn-primary' : '',
    mapCssClass(cssClass),
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <button 
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {iconCss && <span className={iconCss}></span>}
      {children}
    </button>
  );
};

