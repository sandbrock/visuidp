import type { ReactNode } from 'react';
import { FeedbackMessage } from './FeedbackMessage';

export interface SuccessMessageProps {
  message: ReactNode;
  className?: string;
  icon?: ReactNode;
  title?: ReactNode;
}

export const SuccessMessage = ({ message, className, icon, title }: SuccessMessageProps) => (
  <FeedbackMessage variant="success" className={className} icon={icon} title={title}>
    {message}
  </FeedbackMessage>
);
