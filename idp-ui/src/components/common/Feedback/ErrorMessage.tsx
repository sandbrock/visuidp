import type { ReactNode } from 'react';
import { FeedbackMessage } from './FeedbackMessage';

export interface ErrorMessageProps {
  message: ReactNode;
  className?: string;
  icon?: ReactNode;
  role?: string;
}

export const ErrorMessage = ({ message, className, icon, role = 'alert' }: ErrorMessageProps) => (
  <FeedbackMessage variant="error" className={className} icon={icon} role={role}>
    {message}
  </FeedbackMessage>
);
