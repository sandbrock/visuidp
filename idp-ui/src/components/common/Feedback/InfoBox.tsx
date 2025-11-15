import type { ReactNode } from 'react';
import { FeedbackMessage } from './FeedbackMessage';

export interface InfoBoxProps {
  children: ReactNode;
  title?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export const InfoBox = ({ children, title, icon, className }: InfoBoxProps) => (
  <FeedbackMessage variant="info" title={title} icon={icon} className={className}>
    {children}
  </FeedbackMessage>
);
