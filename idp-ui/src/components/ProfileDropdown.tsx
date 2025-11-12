import { useEffect, useRef } from 'react';
import type { User } from '../types/auth';
import { UserInfo } from './UserInfo';
import { MenuItem } from './MenuItem';
import { logout } from '../auth';
import './ProfileDropdown.css';

interface ProfileDropdownProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileDropdown = ({ user, isOpen, onClose }: ProfileDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle arrow key navigation
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const handleArrowKeys = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      e.preventDefault();

      const menuItems = Array.from(
        dropdownRef.current!.querySelectorAll<HTMLElement>('[role="menuitem"]')
      );

      if (menuItems.length === 0) return;

      const currentIndex = menuItems.findIndex(item => item === document.activeElement);

      let nextIndex: number;
      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
      }

      menuItems[nextIndex].focus();
    };

    document.addEventListener('keydown', handleArrowKeys);

    return () => {
      document.removeEventListener('keydown', handleArrowKeys);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSignOut = () => {
    onClose();
    logout();
  };

  const handleMenuItemClick = () => {
    onClose();
  };

  return (
    <div 
      ref={dropdownRef}
      className="profile-dropdown" 
      role="menu"
      aria-label="User profile menu"
    >
      <div role="group" aria-labelledby="user-info-heading">
        <h2 id="user-info-heading" className="visually-hidden">User Information</h2>
        <UserInfo user={user} />
      </div>
      <div className="dropdown-divider" role="separator" />
      <div role="group" aria-label="Account actions">
        <MenuItem 
          icon="🔑" 
          label="Personal API Keys" 
          to="/api-keys"
          onClick={handleMenuItemClick}
          ariaLabel="Navigate to Personal API Keys page"
        />
      </div>
      <div className="dropdown-divider" role="separator" />
      <div role="group" aria-label="Session actions">
        <MenuItem 
          icon="🚪" 
          label="Sign Out" 
          onClick={handleSignOut}
          variant="danger"
          ariaLabel="Sign out of your account"
        />
      </div>
    </div>
  );
};
