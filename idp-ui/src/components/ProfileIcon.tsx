import { forwardRef } from 'react';
import './ProfileIcon.css';

interface ProfileIconProps {
  userEmail: string;
  isOpen: boolean;
  onClick: () => void;
}

/**
 * Extract initials from email address
 * Examples:
 * - john.doe@example.com -> JD
 * - jane@example.com -> JA
 * - user@example.com -> US
 */
export const getInitials = (email: string): string => {
  if (!email) return 'U';
  
  const localPart = email.split('@')[0];
  const parts = localPart.split('.');
  
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  
  return localPart.substring(0, 2).toUpperCase();
};

export const ProfileIcon = forwardRef<HTMLButtonElement, ProfileIconProps>(
  ({ userEmail, isOpen, onClick }, ref) => {
    const initials = getInitials(userEmail);

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    };

    return (
      <button
        ref={ref}
        className={`profile-icon ${isOpen ? 'active' : ''}`}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role="button"
        aria-label="User profile menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        tabIndex={0}
      >
        <span className="profile-initials" aria-hidden="true">{initials}</span>
      </button>
    );
  }
);

ProfileIcon.displayName = 'ProfileIcon';
