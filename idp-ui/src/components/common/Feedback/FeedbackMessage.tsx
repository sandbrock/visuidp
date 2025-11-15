import type { ReactNode } from 'react';
import './Feedback.css';

type FeedbackVariant = 'error' | 'success' | 'info' | 'warning';

type JoinableClass = string | undefined | false;

const joinClasses = (...classes: JoinableClass[]) => classes.filter(Boolean).join(' ');

const DEFAULT_ICONS: Record<FeedbackVariant, ReactNode> = {
  error: '!',
  success: '✓',
  info: 'ℹ',
  warning: '⚠',
};

export interface FeedbackMessageProps {
  variant: FeedbackVariant;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  role?: string;
  title?: ReactNode;
}

export const FeedbackMessage = ({
  variant,
  children,
  className,
  icon,
  role,
  title,
}: FeedbackMessageProps) => (
  <div role={role} className={joinClasses('feedback-message', `feedback-message--${variant}`, className)}>
    <span className="feedback-message__icon" aria-hidden="true">
      {icon ?? DEFAULT_ICONS[variant]}
    </span>
    <div className="feedback-message__content">
      {title && <div className="feedback-message__title">{title}</div>}
      <div className="feedback-message__body">{children}</div>
    </div>
  </div>
);
