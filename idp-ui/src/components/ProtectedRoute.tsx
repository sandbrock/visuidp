import { Navigate } from 'react-router-dom';
import type { User } from '../types/auth';
import { isAdmin } from '../types/auth';

interface ProtectedRouteProps {
  user: User;
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ user, children, requireAdmin = false }: ProtectedRouteProps) => {
  if (requireAdmin && !isAdmin(user)) {
    // Redirect non-admin users to home page
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
