import React, { ReactNode } from 'react';
import { useDemoMode } from '../contexts/DemoModeContext';
import './DemoModeTooltip.css';

interface DemoModeTooltipProps {
  children: ReactNode;
  message?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const DemoModeTooltip: React.FC<DemoModeTooltipProps> = ({ 
  children, 
  message = 'This action is simulated in demo mode',
  position = 'top'
}) => {
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) {
    return <>{children}</>;
  }

  return (
    <div className="demo-mode-tooltip-wrapper">
      {children}
      <div 
        className={`demo-mode-tooltip demo-mode-tooltip-${position}`}
        role="tooltip"
        aria-label={message}
      >
        <span className="demo-mode-tooltip-icon">ℹ️</span>
        {message}
      </div>
    </div>
  );
};
