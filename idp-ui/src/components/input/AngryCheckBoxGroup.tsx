import { AngryCheckBox } from './AngryCheckBox';
import './AngryCheckBoxGroup.css';

interface AngryCheckBoxGroupProps {
  id: string;
  items: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  layout?: 'vertical' | 'horizontal';
}

export const AngryCheckBoxGroup = ({
  id,
  items,
  selectedValues,
  onChange,
  label,
  disabled,
  className,
  layout = 'vertical'
}: AngryCheckBoxGroupProps) => {
  const handleCheckboxChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, value]);
    } else {
      onChange(selectedValues.filter(v => v !== value));
    }
  };

  return (
    <div className={`angry-checkbox-group ${className ?? ''}`.trim()}>
      {label && (
        <div className="angry-checkbox-group-label">{label}</div>
      )}
      <div className={`angry-checkbox-group-items angry-checkbox-group-${layout}`}>
        {items.map((item) => (
          <AngryCheckBox
            key={item.value}
            id={`${id}-${item.value}`}
            checked={selectedValues.includes(item.value)}
            onChange={(checked) => handleCheckboxChange(item.value, checked)}
            label={item.label}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};
