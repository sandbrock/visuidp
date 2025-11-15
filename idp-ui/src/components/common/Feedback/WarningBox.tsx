import type { ReactNode } from 'react';
import { FeedbackMessage } from './FeedbackMessage';

export interface WarningBoxProps {
  children: ReactNode;
  title?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export const WarningBox = ({ children, title, icon, className }: WarningBoxProps) => (
  <FeedbackMessage variant="warning" title={title} icon={icon} className={className}>
    {children}
  </FeedbackMessage>
);
