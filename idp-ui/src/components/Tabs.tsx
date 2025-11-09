import React, { useState } from 'react';
import './Tabs.css';

export interface TabItem {
  label: string;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: number;
  onTabChange?: (index: number) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab = 0,
  onTabChange,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabClick = (index: number) => {
    setActiveTab(index);
    onTabChange?.(index);
  };

  return (
    <div className={`tabs-container ${className}`}>
      <div className="tabs-header" role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={index}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`tabpanel-${index}`}
            id={`tab-${index}`}
            className={`tab-button ${activeTab === index ? 'tab-button-active' : ''}`}
            onClick={() => handleTabClick(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {tabs.map((tab, index) => (
          <div
            key={index}
            role="tabpanel"
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            className={`tab-panel ${activeTab === index ? 'tab-panel-active' : ''}`}
            hidden={activeTab !== index}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};
