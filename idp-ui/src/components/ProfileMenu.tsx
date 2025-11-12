import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { User } from '../types/auth';
import { ProfileIcon } from './ProfileIcon';
import { ProfileDropdown } from './ProfileDropdown';
import './ProfileMenu.css';

interface ProfileMenuProps {
  user: User;
}

export const ProfileMenu = ({ user }: ProfileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setIsOpen(prev => !prev);
  };

  // Close dropdown and return focus to icon
  const closeDropdown = () => {
    setIsOpen(false);
    // Return focus to the profile icon when dropdown closes
    if (iconRef.current) {
      iconRef.current.focus();
    }
  };

  // Click-outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeDropdown();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  // Route change listener
  useEffect(() => {
    closeDropdown();
  }, [location.pathname]);

  // Focus trap within dropdown when open
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const focusableElements = menuRef.current.querySelectorAll<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    // Focus first menu item when dropdown opens
    const firstMenuItem = menuRef.current.querySelector<HTMLElement>('[role="menuitem"]');
    if (firstMenuItem) {
      firstMenuItem.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen]);

  return (
    <div className="profile-menu" ref={menuRef}>
      <ProfileIcon 
        ref={iconRef}
        userEmail={user.email}
        isOpen={isOpen}
        onClick={toggleDropdown}
      />
      <ProfileDropdown 
        user={user}
        isOpen={isOpen}
        onClose={closeDropdown}
      />
    </div>
  );
};
