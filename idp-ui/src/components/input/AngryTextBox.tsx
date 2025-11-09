import { useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import './AngryTextBox.css';

interface AngryTextBoxProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  type?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentRef?: React.Ref<any>;
}

export const AngryTextBox = ({ 
  id, 
  value, 
  onChange, 
  placeholder, 
  multiline = false, 
  type = 'text', 
  disabled, 
  className, 
  autoFocus, 
  componentRef 
}: AngryTextBoxProps) => {
  const internalRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const textBoxRef = componentRef || internalRef;

  useEffect(() => {
    if (autoFocus && textBoxRef && 'current' in textBoxRef && textBoxRef.current) {
      textBoxRef.current.focus();
    }
  }, [autoFocus, textBoxRef]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (multiline && textBoxRef && 'current' in textBoxRef && textBoxRef.current) {
      const textarea = textBoxRef.current as HTMLTextAreaElement;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, multiline, textBoxRef]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const hasValue = value && value.length > 0;

  if (multiline) {
    return (
      <div className={`angry-textbox-wrapper ${className ?? ''}`.trim()}>
        <div className="angry-textbox-container">
          <textarea
            ref={textBoxRef as React.Ref<HTMLTextAreaElement>}
            id={id}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={`angry-textbox angry-textbox-multiline ${hasValue ? 'has-value' : ''}`}
          />
          <label htmlFor={id} className="angry-textbox-label">
            {placeholder}
          </label>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`angry-textbox-wrapper ${className ?? ''}`.trim()}>
      <div className="angry-textbox-container">
        <input
          ref={textBoxRef as React.Ref<HTMLInputElement>}
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={`angry-textbox ${hasValue ? 'has-value' : ''}`}
        />
        <label htmlFor={id} className="angry-textbox-label">
          {placeholder}
        </label>
      </div>
    </div>
  );
};
