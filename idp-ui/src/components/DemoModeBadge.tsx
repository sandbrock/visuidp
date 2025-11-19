import React from 'react';
import { useDemoMode } from '../contexts/DemoModeContext';
import './DemoModeBadge.css';

interface DemoModeBadgeProps {
  className?: string;
}

export const DemoModeBadge: React.FC<DemoModeBadgeProps> = ({ className = '' }) => {
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) {
    return null;
  }

  return (
    <span 
      className={`demo-mode-badge ${className}`}
      role="status"
      aria-label="Demo mode active"
      title="Demo Mode: Changes won't be saved"
    >
      🎭 DEMO
    </span>
  );
};
