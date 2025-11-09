interface AngryCheckBoxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string; // display label text to the right
  disabled?: boolean;
  className?: string;
}

export const AngryCheckBox = ({ id, checked, onChange, label, disabled, className }: AngryCheckBoxProps) => {
  return (
    <label className={`angry-checkbox ${className ?? ''}`.trim()}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
};

