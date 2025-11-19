import type { User } from '../types/auth';
import './Development.css';

interface DevelopmentProps {
  user: User;
}

export const Development = ({ user }: DevelopmentProps) => {
  return (
    <div className="content-container">
      <h2>Dashboard</h2>
      <p>Welcome to the IDP Portal! You are successfully authenticated through Traefik with Azure Entra ID.</p>

      <div className="info-card">
        <h3>Authentication Details</h3>
        <ul>
          <li><strong>Name:</strong> {user.name}</li>
          <li><strong>Email:</strong> {user.email}</li>
          <li><strong>Authentication Method:</strong> Azure Entra ID via Traefik</li>
        </ul>
      </div>

      <div className="info-card">
        <h3>System Information</h3>
        <ul>
          <li><strong>Frontend Port:</strong> 8083 (development)</li>
          <li><strong>Traefik Gateway:</strong> Port 8443</li>
          <li><strong>API Backend:</strong> Port 8082</li>
        </ul>
      </div>
    </div>
  );
};

// Default export for lazy loading
export default Development;
