import type { ReactElement, ReactNode } from 'react';
import { cloneElement, isValidElement, useId } from 'react';
import './FormField.css';

type FormFieldChildProps = {
  id?: string;
  'aria-describedby'?: string;
};

export interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactElement<FormFieldChildProps> | ReactNode;
}

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(' ');

export const FormField = ({
  label,
  error,
  hint,
  required = false,
  htmlFor,
  className,
  children,
}: FormFieldProps) => {
  const generatedId = useId();
  const inputId = htmlFor ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const renderChild = () => {
    if (!isValidElement(children)) {
      return children;
    }

    const child = children as ReactElement<FormFieldChildProps>;
    const existingDescribedBy = child.props['aria-describedby'];
    return cloneElement(child, {
      id: child.props.id ?? (!htmlFor ? inputId : undefined),
      'aria-describedby': [existingDescribedBy, describedBy].filter(Boolean).join(' ') || undefined,
    });
  };

  return (
    <div className={joinClasses('form-field', className, error && 'form-field--error')}>
      <label htmlFor={inputId} className="form-field__label">
        {label}
        {required && (
          <span className="form-field__required" aria-label="required">
            *
          </span>
        )}
      </label>

      <div className="form-field__control">{renderChild()}</div>

      {hint && (
        <div id={hintId} className="form-field__hint">
          {hint}
        </div>
      )}

      {error && (
        <div id={errorId} role="alert" className="form-field__error">
          {error}
        </div>
      )}
    </div>
  );
};
