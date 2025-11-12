import { Link, useLocation } from 'react-router-dom';
import type { User } from '../types/auth';
import { isAdmin } from '../types/auth';
import { ThemeToggle } from './ThemeToggle';
import { ProfileMenu } from './ProfileMenu';
import './Header.css';

interface HeaderProps {
  user: User;
}

export const Header = ({ user }: HeaderProps) => {
  const location = useLocation();
  const userIsAdmin = isAdmin(user);

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="app-title">
            <Link to="/">VisuIDP</Link>
          </h1>
          <nav className="header-nav">
            <Link
              to="/"
              className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
            >
              Dashboard
            </Link>
            <Link
              to="/infrastructure"
              className={location.pathname === '/infrastructure' ? 'nav-link active' : 'nav-link'}
            >
              Blueprints
            </Link>
            <Link
              to="/development"
              className={location.pathname === '/development' ? 'nav-link active' : 'nav-link'}
            >
              Stacks
            </Link>
            {userIsAdmin && (
              <Link
                to="/admin"
                className={location.pathname.startsWith('/admin') ? 'nav-link active' : 'nav-link'}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="user-info">
          <ThemeToggle />
          <ProfileMenu user={user} />
        </div>
      </div>
    </header>
  );
};
