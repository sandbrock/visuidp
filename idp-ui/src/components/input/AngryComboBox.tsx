import { useEffect, useRef, useState } from 'react';
import './AngryComboBox.css';

export interface AngryComboItem {
  text: string;
  value: string;
}

interface AngryComboBoxProps {
  id: string;
  items: AngryComboItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-required'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
}

export const AngryComboBox = ({
  id,
  items,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  'aria-label': ariaLabel,
  'aria-required': ariaRequired,
  'aria-describedby': ariaDescribedby,
}: AngryComboBoxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filteredItems, setFilteredItems] = useState<AngryComboItem[]>(items);
  const [showAllItems, setShowAllItems] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);

  // Update input value when value prop changes
  useEffect(() => {
    const selectedItem = items.find(item => item.value === value);
    setInputValue(selectedItem?.text || '');
  }, [value, items]);

  // Filter items based on input (StartsWith filtering)
  useEffect(() => {
    if (showAllItems || inputValue === '') {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item =>
        item.text.toLowerCase().startsWith(inputValue.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [inputValue, items, showAllItems]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowAllItems(false); // Re-enable filtering when user types
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setShowAllItems(true); // Show all items when focusing
      setIsOpen(true);
    }
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const selectItem = (item: AngryComboItem) => {
    setInputValue(item.text);
    onChange(item.value);
    setIsOpen(false);
    setShowAllItems(false);
    setHighlightedIndex(-1);
  };

  const handleItemClick = (item: AngryComboItem) => {
    selectItem(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (composingRef.current) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < filteredItems.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
          selectItem(filteredItems[highlightedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleClearClick = () => {
    setInputValue('');
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };

  const handleCompositionEnd = () => {
    composingRef.current = false;
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const showClearButton = inputValue && !disabled;

  return (
    <div className={`angry-combobox-wrapper ${className ?? ''}`.trim()} ref={wrapperRef}>
      <div className="angry-combobox-input-group">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="angry-combobox-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-label={ariaLabel}
          aria-required={ariaRequired}
          aria-describedby={ariaDescribedby}
          aria-expanded={isOpen}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined}
        />
        {showClearButton && (
          <button
            type="button"
            className="angry-combobox-clear"
            onClick={handleClearClick}
            tabIndex={-1}
            aria-label="Clear"
          >
            ×
          </button>
        )}
        <button
          type="button"
          className="angry-combobox-arrow"
          onClick={() => {
            if (!disabled) {
              // When clicking arrow, show all items
              if (!isOpen) {
                setShowAllItems(true);
              }
              setIsOpen(!isOpen);
            }
          }}
          tabIndex={-1}
          disabled={disabled}
          aria-label="Toggle dropdown"
        >
          ▼
        </button>
      </div>
      {isOpen && !disabled && (
        <div 
          className="angry-combobox-dropdown" 
          ref={dropdownRef}
          role="listbox"
          id={`${id}-listbox`}
          aria-label="Available options"
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <div
                key={item.value}
                id={`${id}-option-${index}`}
                className={`angry-combobox-item ${
                  highlightedIndex === index ? 'highlighted' : ''
                } ${item.value === value ? 'selected' : ''}`}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={item.value === value}
              >
                {item.text}
              </div>
            ))
          ) : (
            <div className="angry-combobox-no-data" role="status">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
};
