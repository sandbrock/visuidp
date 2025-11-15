import React from 'react';
import './MetadataDisplay.css';

export interface MetadataItem {
  label: string;
  value: React.ReactNode;
}

export interface MetadataDisplayProps {
  items: MetadataItem[];
  className?: string;
}

export const MetadataDisplay: React.FC<MetadataDisplayProps> = ({
  items,
  className,
}) => {
  return (
    <div className={`metadata-display ${className || ''}`}>
      <dl className="metadata-display__list">
        {items.map((item, index) => (
          <div key={index} className="metadata-display__item">
            <dt className="metadata-display__label">{item.label}</dt>
            <dd className="metadata-display__value">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
