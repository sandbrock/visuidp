import { Link } from 'react-router-dom';
import './MenuItem.css';

interface MenuItemProps {
  icon?: string;
  label: string;
  to?: string;  // For navigation items (Link)
  onClick?: () => void;  // For action items (button)
  variant?: 'default' | 'danger';
  ariaLabel?: string;  // Custom aria-label for screen readers
}

export const MenuItem = ({ icon, label, to, onClick, variant = 'default', ariaLabel }: MenuItemProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Support keyboard navigation (Enter and Space)
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const className = `menu-item menu-item-${variant}`;
  const accessibleLabel = ariaLabel || label;

  // Render as Link if 'to' prop is provided
  if (to) {
    return (
      <Link
        to={to}
        className={className}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="menuitem"
        tabIndex={0}
        aria-label={accessibleLabel}
      >
        {icon && <span className="menu-item-icon" aria-hidden="true">{icon}</span>}
        <span className="menu-item-label">{label}</span>
      </Link>
    );
  }

  // Render as button if 'onClick' prop is provided
  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="menuitem"
      tabIndex={0}
      aria-label={accessibleLabel}
    >
      {icon && <span className="menu-item-icon" aria-hidden="true">{icon}</span>}
      <span className="menu-item-label">{label}</span>
    </button>
  );
};
