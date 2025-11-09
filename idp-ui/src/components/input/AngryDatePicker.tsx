import type { ChangeEvent } from 'react';
import './AngryDatePicker.css';

interface AngryDatePickerProps {
  id: string;
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  min?: string; // Minimum date (YYYY-MM-DD)
  max?: string; // Maximum date (YYYY-MM-DD)
}

export const AngryDatePicker = ({ 
  id, 
  value, 
  onChange, 
  placeholder, 
  disabled, 
  className, 
  min, 
  max 
}: AngryDatePickerProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const hasValue = value && value.length > 0;

  return (
    <div className={`angry-datepicker-wrapper ${className ?? ''}`.trim()}>
      <div className="angry-datepicker-container">
        <input
          id={id}
          type="date"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          min={min}
          max={max}
          className={`angry-datepicker ${hasValue ? 'has-value' : ''}`}
        />
        <label htmlFor={id} className="angry-datepicker-label">
          {placeholder}
        </label>
      </div>
    </div>
  );
};
