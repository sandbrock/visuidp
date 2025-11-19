import React from 'react';
import { useDemoMode } from '../contexts/DemoModeContext';
import './DemoModeBanner.css';

export const DemoModeBanner: React.FC = () => {
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) {
    return null;
  }

  return (
    <div className="demo-mode-banner" role="alert" aria-live="polite">
      <div className="demo-mode-banner-content">
        <span className="demo-mode-icon" aria-hidden="true">🎭</span>
        <div className="demo-mode-text">
          <strong>Demo Mode Active</strong>
          <span className="demo-mode-description">
            You're viewing a demonstration. Changes won't be saved and no infrastructure will be deployed.
          </span>
        </div>
      </div>
    </div>
  );
};
