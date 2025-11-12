import type { User } from '../types/auth';
import './UserInfo.css';

interface UserInfoProps {
  user: User;
}

export const UserInfo = ({ user }: UserInfoProps) => {
  // Fallback for missing user information
  const displayEmail = user.email || 'user@example.com';
  const displayName = user.name || 'User';

  return (
    <div className="user-info" role="presentation">
      <div className="user-info-email">{displayEmail}</div>
      <div className="user-info-name">{displayName}</div>
    </div>
  );
};
